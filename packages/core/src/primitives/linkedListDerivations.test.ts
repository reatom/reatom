import { describe, expect, subscribe, test, vi } from 'test'

import type { Atom } from '../core'
import { atom, computed, context, notify } from '../core'
import { deatomize } from '../methods'
import {
  changesSince,
  reatomLinkedList,
  reatomView,
  reatomVirtual,
  toArray,
} from './index'

const ids = (rows: { id: number }[]) => rows.map((row) => row.id)

describe('linked list derivations', () => {
  test('positional runs are copied, validated and preserve identity', () => {
    const list = reatomLinkedList((id: number) => ({ id }), 'runs')
    const [a, b, c, d] = list.createMany([[1], [2], [3], [4]])
    const run = [{ id: 5 }, { id: 6 }]
    const inserted = list.insertMany(run, a!)
    run.reverse()
    expect(ids(list.array())).toEqual([1, 5, 6, 2, 3, 4])
    expect(list().changes[0]).toMatchObject({ kind: 'insert', nodes: inserted })
    list.moveMany([b!, c!], null)
    expect(ids(list.array())).toEqual([2, 3, 1, 5, 6, 4])
    expect(list.array()[0]).toBe(b)
    expect(() => list.moveMany([b!, d!], a!)).toThrow('contiguous')
    expect(() => list.moveMany([b!, c!], c!)).toThrow('Invalid')
    expect(() => list.insertMany([a!], null)).toThrow('already')
    expect(ids(list.array())).toEqual([2, 3, 1, 5, 6, 4])
  })

  test('failed nested batch restores every touched link and version', () => {
    const list = reatomLinkedList((id: number) => ({ id }), 'atomic')
    const [a, b, c] = list.createMany([[1], [2], [3]])
    const before = list()
    expect(() =>
      list.batch(() => {
        list.move(c!, null)
        list.remove(a!)
        list.insertMany([{ id: 4 }], b!)
        throw new Error('cancel')
      }),
    ).toThrow('cancel')
    expect(list()).toBe(before)
    expect(ids(toArray(list()))).toEqual([1, 2, 3])
    expect(a![list.LL_PREV]).toBeNull()
    expect(c![list.LL_NEXT]).toBeNull()
    list.create(5)
    expect(ids(list.array())).toEqual([1, 2, 3, 5])
  })

  test('filter edits keep state mapped before the filter and remap after it', () => {
    const list = reatomLinkedList((id: number) => ({ id }), 'source')
    list.createMany([[1], [2], [3]])
    const minimum = atom(0, 'minimum')
    // Per-row state is mapped before the filter: hiding a row keeps it.
    const allocate = vi.fn((row: { id: number }) => ({
      id: row.id,
      open: atom(false, `row#${row.id}.open`),
    }))
    const state = list.reatomMap(allocate, 'state')
    const visible = state.reatomFilter(
      computed(() => {
        const min = minimum()
        return (row: { id: number }) => row.id >= min
      }, 'predicate'),
      'visible',
    )
    // A map after the filter makes a new model when a row is shown again.
    const render = vi.fn((row: { id: number; open: Atom<boolean> }) => ({
      row,
    }))
    const rendered = visible.reatomMap(render, 'rendered')
    const final = rendered.reatomFilter((view) => view.row.id % 2 === 1, 'odd')
    const keep = subscribe(final.array)
    const first = final.array()[0]!
    first.row.open.set(true)
    minimum.set(2)
    notify()
    expect(final.array().map((view) => view.row.id)).toEqual([3])
    minimum.set(0)
    notify()
    expect(final.array()[0]).not.toBe(first)
    expect(final.array()[0]!.row).toBe(first.row)
    expect(first.row.open()).toBe(true)
    expect(allocate).toHaveBeenCalledTimes(3)
    expect(render).toHaveBeenCalledTimes(4)
    expect(visible.has(state.array()[0]!)).toBe(true)
    keep.unsubscribe()
  })

  test('a failed map update keeps the models of its members', () => {
    const source = reatomLinkedList((id: number) => ({ id }))
    const [one] = source.createMany([[1], [2]])
    let isBroken = false
    const mapped = source.reatomMap((row) => {
      if (isBroken && row.id === 3) throw new Error('broken')
      return { id: row.id }
    })
    const models = mapped.array()
    isBroken = true
    source.batch(() => {
      source.clear()
      source.insertMany([one!], null)
      source.create(3)
    })
    expect(() => mapped()).toThrow('broken')
    isBroken = false
    source.batch(() => {
      source.clear()
      source.insertMany([one!], null)
      source.create(3)
    })
    // The failed update put back the model it had dropped with the clear, so
    // the map, which never applied a clear, reconciles and keeps it.
    expect(mapped.array().map(({ id }) => id)).toEqual([1, 3])
    expect(mapped.array()[0]).toBe(models[0])
  })

  test('lazy map reconciles skipped versions without reallocating survivors', () => {
    const list = reatomLinkedList((id: number) => ({ id }), 'lazy')
    const [a, b] = list.createMany([[1], [2]])
    const create = vi.fn((row: { id: number }) => ({ id: row.id }))
    const mapped = list.reatomMap(create, 'lazy.map')
    const original = mapped.array()
    list.remove(a!)
    list.create(3)
    list.move(b!, null)
    expect(ids(mapped.array())).toEqual([2, 3])
    expect(mapped.array()[0]).toBe(original[1])
    expect(create).toHaveBeenCalledTimes(3)
  })

  test('pure reduction replays a commit and rebuilds after missed versions', () => {
    const list = reatomLinkedList((id: number) => ({ id }), 'reduce')
    const total = (rows: readonly { id: number }[]) =>
      rows.reduce((n, row) => n + row.id, 0)
    const apply = vi.fn((sum: number, change: any) => {
      if (change.kind === 'insert') return sum + total(change.nodes)
      if (change.kind === 'remove') return sum - total(change.nodes)
      return sum
    })
    const rebuild = vi.fn(
      (_previous: number | undefined, state: ReturnType<typeof list>) =>
        toArray(state).reduce((n, row) => n + row.id, 0),
    )
    const sum = list.reatomReduce({ init: () => 0, apply, rebuild }, 'sum')
    const watch = subscribe(sum)
    list.create(2)
    notify()
    const old = sum()
    list.create(3)
    notify()
    expect(sum().state).toBe(5)
    expect(old.state).toBe(2)
    expect(apply).toHaveBeenCalledTimes(2)
    watch.unsubscribe()
    list.create(4)
    list.create(5)
    expect(sum().state).toBe(14)
    expect(rebuild).toHaveBeenCalledTimes(2)
  })

  test('comparison survives inserts, exhausted gaps and moves', () => {
    const list = reatomLinkedList((id: number) => ({ id }), 'order')
    const [a, b] = list.createMany([[1], [2]])
    expect(list.compare(a!, b!)).toBe(-1)
    for (let i = 3; i < 70; i++) {
      const [node] = list.insertMany([{ id: i }], a!)
      expect(list.compare(a!, node!)).toBe(-1)
      expect(list.compare(node!, b!)).toBe(-1)
    }
    list.move(b!, null)
    expect(list.compare(a!, b!)).toBe(1)
    list.remove(b!)
    expect(() => list.compare(b!, a!)).toThrow('present')
  })

  test('comparison handles runs larger than the function argument limit', () => {
    const list = reatomLinkedList((id: number) => ({ id }), 'largeRun')
    const a = list.create(0),
      b = list.create(1)
    expect(list.compare(a, b)).toBe(-1)
    const nodes = Array.from({ length: 140_000 }, (_, index) => ({
      id: index + 2,
    }))
    const inserted = list.insertMany(nodes, b)
    expect(list.compare(a, inserted.at(-1)!)).toBe(-1)
    expect(list.compare(inserted[0]!, inserted.at(-1)!)).toBe(-1)
  })

  test('comparison agrees with the index through random multi-change commits', () => {
    const list = reatomLinkedList((id: number) => ({ id }), 'orderOracle')
    type Node = ReturnType<typeof list.create>
    let next = 0,
      seed = 2024
    const random = (max: number) =>
      (seed = (seed * 1664525 + 1013904223) >>> 0) % max
    // `find` walks the in-progress order inside a batch.
    const current = () => {
      const nodes: Node[] = []
      list.find((node) => (nodes.push(node), false))
      return nodes
    }
    list.createMany(Array.from({ length: 6 }, () => [next++]))
    for (let commit = 0; commit < 200; commit++) {
      list.batch(() => {
        for (let step = random(3); step >= 0; step--) {
          const nodes = current()
          const pick = () => nodes[random(nodes.length)]!
          const operation = nodes.length < 3 ? 0 : random(6)
          if (operation === 0) list.create(next++)
          else if (operation === 1)
            list.insertMany([{ id: next++ }, { id: next++ }], pick())
          else if (operation === 2) list.swap(pick(), pick())
          else if (operation === 3) {
            const node = pick(),
              after = pick()
            list.move(node, after === node ? null : after)
          } else if (operation === 4) list.remove(pick())
          else {
            const from = random(nodes.length - 1)
            list.moveMany(nodes.slice(from, from + 2), null)
          }
        }
      })
      const nodes = list.array()
      expect(nodes).toEqual(current())
      for (let i = 1; i < nodes.length; i++) {
        expect(list.compare(nodes[i - 1]!, nodes[i]!)).toBe(-1)
        expect(list.compare(nodes[i]!, nodes[0]!)).toBe(1)
      }
    }
  })

  test('removeMany counts a repeated node once and a failed batch leaves its created node unlinked', () => {
    const list = reatomLinkedList((id: number) => ({ id }))
    const [a, b, c] = list.createMany([[1], [2], [3]])
    expect(list.removeMany([a!, a!, b!])).toBe(2)
    expect(list().size).toBe(1)
    expect(ids(list.array())).toEqual([3])

    let created: { id: number } | undefined
    expect(() =>
      list.batch(() => {
        created = list.create(4)
        list.remove(c!)
        throw new Error('cancel')
      }),
    ).toThrow('cancel')
    expect(ids(list.array())).toEqual([3])
    expect(created![list.LL_NEXT]).toBeNull()
    expect(list.insertMany([created!], c!)).toEqual([created])
    expect(ids(list.array())).toEqual([3, 4])
  })

  test('a failed batch of random operations restores the links', () => {
    let seed = 7
    const random = (max: number) => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return (seed >>> 12) % max
    }
    const list = reatomLinkedList((id: number) => ({ id }), 'undo')
    const visible = list.reatomFilter((node) => node.id % 3 !== 0)
    list.createMany(Array.from({ length: 12 }, (_, id) => [id]))
    let nextId = 12

    for (let round = 0; round < 60; round++) {
      const before = list.array()
      const beforeVisible = visible.array()
      expect(() =>
        list.batch(() => {
          // The batch is not committed yet, so the test follows its order.
          let nodes = before.slice()
          for (let step = 0; step < 6; step++) {
            const pick = () => nodes[random(nodes.length)]!
            const kind = nodes.length < 3 ? 0 : random(8)
            if (kind === 0) {
              nodes.push(...list.createMany([[nextId++], [nextId++]]))
            } else if (kind === 1) {
              const after = pick()
              const [node] = list.insertMany([{ id: nextId++ }], after)
              nodes.splice(nodes.indexOf(after) + 1, 0, node!)
            } else if (kind === 2 || kind === 3) {
              const removed = kind === 2 ? [pick()] : [pick(), pick()]
              list.removeMany(removed)
              nodes = nodes.filter((node) => !removed.includes(node))
            } else if (kind === 4) {
              const a = pick()
              const b = pick()
              list.swap(a, b)
              const indexA = nodes.indexOf(a)
              nodes[nodes.indexOf(b)] = a
              nodes[indexA] = b
            } else if (kind === 5) {
              const node = pick()
              list.move(node, null)
              nodes = [node, ...nodes.filter((other) => other !== node)]
            } else if (kind === 6) {
              list.moveMany(nodes.slice(0, 2), nodes.at(-1)!)
              nodes = [...nodes.slice(2), ...nodes.slice(0, 2)]
            } else {
              list.clear()
              nodes = []
            }
          }
          throw new Error('cancel')
        }),
      ).toThrow('cancel')

      const after = list.array()
      expect(after).toEqual(before)
      // The links agree with the order in both directions.
      const state = list()
      expect(state.head).toBe(after[0] ?? null)
      expect(state.tail).toBe(after.at(-1) ?? null)
      after.forEach((node, index) => {
        expect(node[list.LL_PREV]).toBe(after[index - 1] ?? null)
        expect(node[list.LL_NEXT]).toBe(after[index + 1] ?? null)
      })
      expect(visible.array()).toEqual(beforeVisible)

      // Commit something, so every round starts from another order.
      list.swap(after[random(after.length)]!, after[random(after.length)]!)
      list.create(nextId++)
      expect(ids(visible.array())).toEqual(
        ids(list.array()).filter((id) => id % 3 !== 0),
      )
    }
  })

  test('a copy of a mapped node gets its own model', () => {
    const list = reatomLinkedList((row: { id: number }) => row, 'copies')
    const models = list.reatomMap((row) => ({ row }))
    const first = list.create({ id: 1 })
    expect(models.array().map(({ row }) => row)).toEqual([first])
    // The copy carries the hidden fields of the original, its model too.
    const copy = list.create({ ...first, id: 2 })
    expect(copy).not.toBe(first)
    expect(ids(list.array())).toEqual([1, 2])
    expect(models.array().map(({ row }) => row)).toEqual([first, copy])
    const [firstModel, copyModel] = models.array()
    list.remove(first)
    list.insertMany([first], copy)
    expect(models.array()).toEqual([copyModel, firstModel])
  })

  test('shared node objects across contexts are rejected before relinking', () => {
    const node = { id: 1 }
    const list = reatomLinkedList([node], 'scoped')
    expect(list().size).toBe(1)
    expect(() => context.start(() => list())).toThrow('shared across contexts')
    expect(list().head).toBe(node)
  })

  test('chained window rejects recomputation inside an in-progress batch', () => {
    const list = reatomLinkedList((id: number) => ({ id }), 'batchGuard')
    const mapped = list
      .reatomFilter(() => true)
      .reatomMap((row) => ({ id: row.id }))
    const view = reatomView(mapped, { offset: atom(0), limit: atom(10) })
    expect(() =>
      list.batch(() => {
        list.create(1)
        view()
      }),
    ).toThrow('batch')
    expect(list().size).toBe(0)
  })

  test('window lens edits preserve the batching guard through cached derivations', () => {
    const source = reatomLinkedList((id: number) => ({ id }))
    source.createMany([[1], [2], [3]])
    const rows = source
      .reatomFilter(() => true)
      .reatomMap((row) => ({ id: row.id }))
    const offset = atom(0)
    const view = reatomView(rows, { offset, limit: atom(2) })
    expect(ids([...view().items])).toEqual([1, 2])
    expect(() =>
      source.batch(() => {
        source.create(4)
        offset.set(1)
        view()
      }),
    ).toThrow('batch')
    expect(ids(source.array())).toEqual([1, 2, 3])
    source.create(5)
    expect(ids([...view().items])).toEqual([2, 3])
  })

  test('mixed positional commits replay their own old order through hidden anchors', () => {
    const source = reatomLinkedList((id: number) => ({ id }), 'mixed')
    const [a, hidden, b, c] = source.createMany([[1], [2], [3], [5]])
    const predicate = vi.fn((row: { id: number }) => row.id % 2 === 1)
    const visible = source.reatomFilter(predicate)
    const mapped = visible.reatomMap((row) => ({ id: row.id }))
    const watch = subscribe(mapped.array)
    predicate.mockClear()
    source.batch(() => {
      source.insertMany([{ id: 7 }, { id: 8 }, { id: 9 }], hidden!)
      source.remove(hidden!)
      source.moveMany([b!, c!], a!)
      source.swap(a!, c!)
    })
    notify()
    expect(ids(mapped.array())).toEqual(
      ids(source.array()).filter((id) => id % 2 === 1),
    )
    expect(predicate).toHaveBeenCalledTimes(3)
    watch.unsubscribe()
  })

  test('random mixed commits agree with an independent array projection', () => {
    const source = reatomLinkedList((id: number) => ({ id }), 'oracle')
    let next = 0,
      seed = 12345
    const random = (max: number) =>
      (seed = (seed * 1664525 + 1013904223) >>> 0) % max
    const visible = source.reatomFilter((row) => row.id % 3 !== 0)
    const mapped = visible.reatomMap((row) => ({ id: row.id }))
    const watch = subscribe(mapped.array)
    let reference: ReturnType<typeof source.array> = []
    for (let commit = 0; commit < 150; commit++) {
      source.batch(() => {
        for (let step = 0; step < 4; step++) {
          const operation = random(5)
          if (!reference.length || operation === 0) {
            const at = random(reference.length + 1)
            const nodes = source.insertMany(
              [{ id: next++ }, { id: next++ }],
              reference[at - 1] ?? null,
            )
            reference.splice(at, 0, ...nodes)
          } else if (operation === 1) {
            const at = random(reference.length)
            source.remove(reference[at]!)
            reference.splice(at, 1)
          } else if (operation === 2) {
            const a = random(reference.length),
              b = random(reference.length)
            source.swap(reference[a]!, reference[b]!)
            ;[reference[a], reference[b]] = [reference[b]!, reference[a]!]
          } else if (operation === 3) {
            const from = random(reference.length)
            const nodes = reference.splice(
              from,
              Math.min(2, reference.length - from),
            )
            const at = random(reference.length + 1)
            source.moveMany(nodes, reference[at - 1] ?? null)
            reference.splice(at, 0, ...nodes)
          } else {
            const created = source.create(next++)
            reference.push(created)
          }
        }
      })
      notify()
      expect(source.array()).toEqual(reference)
      expect(ids(mapped.array())).toEqual(
        ids(reference).filter((id) => id % 3 !== 0),
      )
      let previous = null
      for (const node of visible.array()) {
        expect(node[visible.LL_PREV]).toBe(previous)
        expect(visible.has(node)).toBe(true)
        if (previous) expect(visible.compare(previous, node)).toBe(-1)
        previous = node
      }
    }
    watch.unsubscribe()
  })

  test('predicate changes emit membership transitions without moving survivors', () => {
    const source = reatomLinkedList((id: number) => ({ id }), 'membership')
    source.createMany([[1], [2], [3], [4], [5]])
    const mode = atom(0)
    const visible = source.reatomFilter(
      computed(() => {
        const value = mode()
        return (row: { id: number }) => value === 0 || row.id % 2 === 1
      }),
    )
    const watch = subscribe(visible)
    mode.set(1)
    expect(visible().changes.map((change) => change.kind)).toEqual(['remove'])
    mode.set(0)
    expect(visible().changes.map((change) => change.kind)).toEqual([
      'insert',
      'insert',
    ])
    watch.unsubscribe()
  })

  test('a replayed clear resets allocation and a replacement rebuilds', () => {
    const source = reatomLinkedList((id: number) => ({ id }), 'epochs')
    const visible = source.reatomFilter(() => true)
    const allocate = vi.fn((row: { id: number }) => ({ id: row.id }))
    const mapped = visible.reatomMap(allocate)
    const reduced = mapped.reatomReduce({
      init: () => 0,
      apply: (sum, change) =>
        change.kind === 'insert'
          ? change.nodes.reduce((sum, row) => sum + row.id, sum)
          : change.kind === 'remove'
            ? change.nodes.reduce((sum, row) => sum - row.id, sum)
            : change.kind === 'clear'
              ? 0
              : sum,
      rebuild: (_previous, state) =>
        toArray(state).reduce((sum, row) => sum + row.id, 0),
    })
    const first = source.create(1)
    const original = mapped.array()[0]
    expect(reduced().state).toBe(1)
    source.clear()
    expect(reduced().state).toBe(0)
    source.insertMany([first], null)
    expect(mapped.array()[0]).not.toBe(original)
    expect(reduced().state).toBe(1)
    expect(allocate).toHaveBeenCalledTimes(2)
    source.set(source.initiateFromState([{ id: 2 }]))
    expect(ids(mapped.array())).toEqual([2])
    expect(reduced().state).toBe(2)
    source.set(source.initiateFromState([{ id: 3 }]))
    expect(ids(mapped.array())).toEqual([3])
    expect(reduced().state).toBe(3)
  })

  test('failed factory and independent nested list commits leave valid links', () => {
    let fail = false
    const source = reatomLinkedList((id: number) => {
      if (fail && id === 3) throw new Error('factory')
      return { id }
    })
    const other = reatomLinkedList((id: number) => ({ id }))
    source.create(1)
    const before = source()
    fail = true
    expect(() => source.createMany([[2], [3]])).toThrow('factory')
    expect(source()).toBe(before)
    expect(ids(source.array())).toEqual([1])
    expect(() =>
      source.batch(() => {
        try {
          source.createMany([[2], [3]])
        } catch {
          /* the joined batch must still abort */
        }
        source.create(4)
      }),
    ).toThrow('factory')
    expect(source()).toBe(before)
    expect(ids(source.array())).toEqual([1])
    expect(() =>
      source.batch(() => {
        source.create(4)
        other.createMany([[5], [6]])
        throw new Error('outer')
      }),
    ).toThrow('outer')
    expect(ids(source.array())).toEqual([1])
    expect(ids(other.array())).toEqual([5, 6])
  })

  test('foreign context membership is false and fresh nodes remain independent', () => {
    const source = reatomLinkedList((id: number) => ({ id }))
    const [a, b] = source.createMany([[1], [2]])
    const visible = source.reatomFilter(() => true)
    visible()
    context.start(() => {
      const [c, d] = source.createMany([[3], [4]])
      expect(source.has(a!)).toBe(false)
      expect(visible.has(b!)).toBe(false)
      expect(source.compare(c!, d!)).toBe(-1)
      expect(() => source.move(a!, null)).toThrow()
    })
    expect(ids(source.array())).toEqual([1, 2])
    expect(source.compare(a!, b!)).toBe(-1)
  })

  test('failed derivations restore output links and recover on the next source change', () => {
    const source = reatomLinkedList((id: number) => ({ id }))
    source.create(1)
    let fail = false
    const mapped = source.reatomMap((row) => {
      if (fail && row.id === 3) throw new Error('mapper')
      return { id: row.id }
    })
    const before = mapped()
    source.createMany([[2], [3]])
    fail = true
    expect(() => mapped()).toThrow('mapper')
    expect(ids(toArray(before))).toEqual([1])
    fail = false
    source.create(4)
    expect(ids(mapped.array())).toEqual([1, 2, 3, 4])
  })

  test('derived sources are readonly and work with readonly consumers', () => {
    const source = reatomLinkedList((id: number) => ({ id }))
    const visible = source.reatomFilter(() => true)
    const mapped = visible.reatomMap((row) => ({ value: atom(row.id) }))
    source.create(1)
    expect(deatomize(mapped)).toEqual([{ value: 1 }])
    reatomVirtual(visible, { itemSize: 26 })
  })

  test('positional edits use the correct window fallback and clamp after clear', () => {
    const source = reatomLinkedList((id: number) => ({ id }))
    source.createMany(Array.from({ length: 40 }, (_, id) => [id]))
    const offset = atom(17)
    const view = reatomView(source, { offset, limit: atom(5) })
    const check = () =>
      expect(view().items).toEqual(source.array().slice(offset(), offset() + 5))
    check()
    source.insertMany([{ id: 40 }, { id: 41 }], null)
    check()
    const run = source.array().slice(15, 19)
    source.moveMany(run, null)
    check()
    source.swap(source.array()[0]!, source.array()[30]!)
    check()
    source.clear()
    expect(view()).toEqual({ items: [], offset: 0, size: 0 })
  })

  test('failed predicate rebuild restores its shadow order before recovery', () => {
    const source = reatomLinkedList((id: number) => ({ id }))
    source.createMany([[1], [2], [3]])
    const mode = atom(0)
    const visible = source.reatomFilter(
      computed(() => {
        const value = mode()
        return (row: { id: number }) => {
          if (value === 1 && row.id === 2) throw new Error('predicate')
          return value === 0 || row.id !== 2
        }
      }),
    )
    const before = visible()
    mode.set(1)
    expect(() => visible()).toThrow('predicate')
    expect(ids(toArray(before))).toEqual([1, 2, 3])
    mode.set(2)
    expect(ids(visible.array())).toEqual([1, 3])
    source.insertMany([{ id: 4 }], source.array()[1]!)
    expect(ids(visible.array())).toEqual([1, 4, 3])
  })

  test('reducer callbacks are untracked, context-local and recover without mutating old results', () => {
    const source = reatomLinkedList({
      create: (id: number) => ({ id }),
      initSnapshot: [[1]],
    })
    const incidental = atom(0)
    const init = vi.fn(() => ({ sum: 0 }))
    let fail = false
    const reduced = source.reatomReduce({
      init,
      apply: (previous, change) => {
        incidental()
        if (fail) throw new Error('reducer')
        return {
          sum:
            previous.sum + (change.kind === 'insert' ? change.nodes[0]!.id : 0),
        }
      },
      rebuild: (_, state) => ({
        sum: toArray(state).reduce((sum, row) => sum + row.id, 0),
      }),
    })
    const first = reduced()
    incidental.set(1)
    expect(reduced()).toBe(first)
    source.create(2)
    expect(reduced().state.sum).toBe(3)
    expect(first.state.sum).toBe(1)
    const good = reduced()
    source.create(3)
    fail = true
    expect(() => reduced()).toThrow('reducer')
    expect(good.state.sum).toBe(3)
    source.create(4)
    fail = false
    expect(reduced().state.sum).toBe(10)
    context.start(() => {
      expect(reduced().state.sum).toBe(1)
      expect(reduced().state).not.toBe(first.state)
    })
    expect(init).toHaveBeenCalledTimes(2)
  })

  test('a clear drops cached models even when the origin returns in the same commit', () => {
    const source = reatomLinkedList((id: number) => ({ id }))
    const [one] = source.createMany([[1], [2]])
    const onClear = vi.fn((state: { size: number }) => state.size)
    const mapped = source.reatomMap((row) => ({ id: row.id }), { onClear })
    const before = mapped.array()
    source.batch(() => {
      source.clear()
      source.insertMany([one!], null)
    })
    expect(mapped().changes.map(({ kind }) => kind)).toEqual([
      'clear',
      'insert',
    ])
    expect(onClear).toHaveBeenCalledTimes(1)
    expect(onClear).toHaveReturnedWith(2)
    expect(ids(mapped.array())).toEqual([1])
    expect(mapped.array()[0]).not.toBe(before[0])
  })

  test('a missed clear reconciles the membership and keeps returning models', () => {
    const source = reatomLinkedList((id: number) => ({ id }))
    const [one, two] = source.createMany([[1], [2]])
    const onClear = vi.fn(),
      onRemove = vi.fn()
    const mapped = source.reatomMap((row) => ({ id: row.id }), {
      onClear,
      onRemove,
    })
    const [first] = mapped.array()
    source.clear()
    source.insertMany([one!], null)
    expect(mapped.array()).toEqual([first])
    expect(onClear).not.toHaveBeenCalled()
    expect(onRemove).toHaveBeenCalledTimes(1)
    expect(onRemove.mock.lastCall?.[1]).toBe(two)
  })

  test('a derived list that did not change keeps its state', () => {
    const source = reatomLinkedList((id: number) => ({ id }))
    source.create(2)
    const even = source.reatomFilter((row) => row.id % 2 === 0)
    const mapped = even.reatomMap((row) => ({ id: row.id }))
    const view = reatomView(mapped, { offset: atom(0), limit: atom(5) })
    const sum = even.reatomReduce({
      init: () => 0,
      apply: (sum, change) =>
        change.kind === 'insert'
          ? change.nodes.reduce((sum, row) => sum + row.id, sum)
          : sum,
      rebuild: (_, state) => toArray(state).reduce((n, row) => n + row.id, 0),
    })
    const track = subscribe(view)
    const before = { even: even(), mapped: mapped(), sum: sum() }
    source.createMany([[1], [3]])
    notify()
    expect(even()).toBe(before.even)
    expect(mapped()).toBe(before.mapped)
    expect(sum()).toBe(before.sum)
    expect(track).toHaveBeenCalledTimes(1)
    // The kept state is still the base of the next change.
    source.create(4)
    expect(changesSince(before.even.version, even())).toEqual([
      { kind: 'insert', nodes: [source.array()[3]], after: source.array()[0] },
    ])
    expect(changesSince(before.mapped.version, mapped())).toHaveLength(1)
    expect(sum().state).toBe(6)
    track.unsubscribe()
  })

  test('changesSince tells the next commit from a skipped or replaced one', () => {
    const list = reatomLinkedList((id: number) => ({ id }))
    const first = list()
    expect(changesSince(first.version, first)).toEqual([])
    expect(changesSince(undefined, first)).toBeNull()
    const [a] = list.createMany([[1]])
    const second = list()
    expect(changesSince(first.version, second)).toEqual([
      { kind: 'insert', nodes: [a], after: null },
    ])
    list.create(2)
    expect(changesSince(first.version, list())).toBeNull()
    list.set(list.initiateFromState([{ id: 3 }]))
    expect(changesSince(second.version, list())).toBeNull()
  })

  test('initiateFromState rejects members of the current list', () => {
    const list = reatomLinkedList((id: number) => ({ id }))
    const [a, b, c] = list.createMany([[1], [2], [3]])
    for (const node of [a!, b!, c!])
      expect(() => list.initiateFromState([node])).toThrow('already')
    list.remove(a!)
    expect(ids(toArray(list.initiateFromState([a!])))).toEqual([1])
    expect(ids(list.array())).toEqual([2, 3])
    list.batch(() => {
      const d = list.create(4)
      expect(() => list.initiateFromState([d])).toThrow('already')
    })
    expect(ids(list.array())).toEqual([2, 3, 4])
  })

  test('mapping hooks describe membership and a returning origin gets a new model', () => {
    const source = reatomLinkedList((id: number) => ({ id }))
    const [one, two] = source.createMany([[1], [2]])
    const onCreate = vi.fn(),
      onRemove = vi.fn(),
      onClear = vi.fn()
    const mapped = source.reatomMap((row) => ({ id: row.id }), {
      onCreate,
      onRemove,
      onClear,
    })
    const first = mapped.array()[0]!
    source.remove(one!)
    mapped()
    source.insertMany([one!], two!)
    expect(mapped.array()[1]).not.toBe(first)
    expect(mapped.array()[1]!.id).toBe(1)
    expect(onCreate).toHaveBeenCalledTimes(3)
    expect(onRemove).toHaveBeenCalledTimes(1)
    expect(onRemove).toHaveBeenCalledWith(first, one)
    // The origin no longer holds the dropped model.
    const fields = Object.getOwnPropertySymbols(one!).map(
      (key) => (one as Record<symbol, unknown>)[key],
    )
    expect(fields).not.toContain(first)
    expect(onClear).not.toHaveBeenCalled()

    // Within one commit a remove and an insert keep the model, like a move.
    const kept = mapped.array()[1]!
    source.batch(() => {
      source.remove(one!)
      source.insertMany([one!], null)
    })
    expect(mapped.array()[0]).toBe(kept)
    source.create(3)
    source.create(4)
    mapped()
    expect(onClear).not.toHaveBeenCalled()
    source.clear()
    mapped()
    expect(onClear).toHaveBeenCalledTimes(1)
  })
})
