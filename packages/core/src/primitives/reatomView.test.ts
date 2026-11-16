import { describe, expect, subscribe, test } from 'test'

import { atom, computed, notify } from '../core'
import type { LLNode } from './reatomLinkedList'
import { reatomLinkedList } from './reatomLinkedList'
import { reatomView } from './reatomView'

const setup = (values: Array<number>, offsetInit = 0, limitInit = 3) => {
  const list = reatomLinkedList((n: number) => ({ n }), 'list')
  list.createMany(values.map((n) => [n]))
  const offset = atom(offsetInit, 'offset')
  const limit = atom(limitInit, 'limit')
  const view = reatomView(list, { offset, limit }, 'view')
  const numbers = () => view().items.map(({ n }) => n)
  return { list, offset, limit, view, numbers }
}

describe('windowing', () => {
  test('returns the window, the clamped offset and the source size', () => {
    const { view, numbers } = setup([1, 2, 3, 4, 5], 1, 2)
    expect(numbers()).toEqual([2, 3])
    expect(view().offset).toBe(1)
    expect(view().size).toBe(5)
  })

  test('follows the lens atoms', () => {
    const { offset, limit, numbers } = setup([1, 2, 3, 4, 5], 0, 2)
    expect(numbers()).toEqual([1, 2])
    offset.set(2)
    expect(numbers()).toEqual([3, 4])
    limit.set(3)
    expect(numbers()).toEqual([3, 4, 5])
    offset.set(4)
    expect(numbers()).toEqual([5])
  })

  test('accepts computed lens fields', () => {
    const list = reatomLinkedList((n: number) => ({ n }))
    list.createMany([[1], [2], [3], [4], [5], [6], [7]])
    const page = atom(0)
    const pageSize = 3
    const view = reatomView(list, {
      offset: computed(() => page() * pageSize),
      limit: computed(() => pageSize),
    })
    const pages: Array<Array<number>> = []
    for (let index = 0; index < 4; index++) {
      page.set(index)
      pages.push(view().items.map(({ n }) => n))
    }
    expect(pages).toEqual([[1, 2, 3], [4, 5, 6], [7], []])
    expect(view().offset).toBe(7)
  })

  test('keeps node identity while the window slides', () => {
    const { view, offset } = setup([1, 2, 3, 4, 5], 0, 3)
    const [, second, third] = view().items
    offset.set(1)
    expect(view().items[0]).toBe(second)
    expect(view().items[1]).toBe(third)
  })
})

describe('edges', () => {
  test('empty source', () => {
    const { view } = setup([], 0, 5)
    expect(view()).toEqual({ items: [], offset: 0, size: 0 })
  })

  test('offset past the end clamps to size', () => {
    const { view } = setup([1, 2, 3], 10, 5)
    expect(view()).toEqual({ items: [], offset: 3, size: 3 })
  })

  test('negative values clamp to zero', () => {
    const { view, numbers, limit } = setup([1, 2, 3], -5, 2)
    expect(numbers()).toEqual([1, 2])
    expect(view().offset).toBe(0)
    limit.set(-1)
    expect(numbers()).toEqual([])
  })

  test('zero limit gives an empty window at the offset', () => {
    const { view } = setup([1, 2, 3], 1, 0)
    expect(view()).toEqual({ items: [], offset: 1, size: 3 })
  })

  test('limit larger than the rest and Infinity take the tail', () => {
    const { numbers, limit } = setup([1, 2, 3], 1, 100)
    expect(numbers()).toEqual([2, 3])
    limit.set(Infinity)
    expect(numbers()).toEqual([2, 3])
  })

  test('fractional values are floored', () => {
    const { view, numbers } = setup([1, 2, 3, 4, 5], 1.5, 2.5)
    expect(numbers()).toEqual([2, 3])
    expect(view().offset).toBe(1)
  })

  test('Infinity offset clamps to size', () => {
    const { view } = setup([1, 2], Infinity, 2)
    expect(view()).toEqual({ items: [], offset: 2, size: 2 })
  })

  test('NaN throws with the field and the view name', () => {
    const { offset, limit, view } = setup([1, 2], NaN, 2)
    expect(() => view()).toThrow(
      'The "offset" of the view "view" should be a number, received "NaN".',
    )
    offset.set(0)
    limit.set(NaN)
    expect(() => view()).toThrow('The "limit" of the view "view"')
    limit.set(1)
    expect(view().items.length).toBe(1)
  })
})

describe('list changes', () => {
  test('create and createMany', () => {
    const { list, view, numbers } = setup([], 0, 3)
    list.createMany([[1], [2]])
    expect(numbers()).toEqual([1, 2])
    list.create(3)
    expect(numbers()).toEqual([1, 2, 3])
    list.create(4)
    expect(numbers()).toEqual([1, 2, 3])
    expect(view().size).toBe(4)
  })

  test('remove and removeMany', () => {
    const { list, view, numbers } = setup([1, 2, 3, 4, 5], 1, 3)
    expect(numbers()).toEqual([2, 3, 4])
    list.remove(list.find(({ n }) => n === 1)!)
    expect(numbers()).toEqual([3, 4, 5])
    list.removeMany([
      list.find(({ n }) => n === 3)!,
      list.find(({ n }) => n === 5)!,
    ])
    expect(numbers()).toEqual([4])
    expect(view().size).toBe(2)
  })

  test('swap and move inside the window', () => {
    const { list, numbers } = setup([1, 2, 3], 0, 3)
    const [one, , three] = list.array()
    list.swap(one!, three!)
    expect(numbers()).toEqual([3, 2, 1])
    list.move(three!, one!)
    expect(numbers()).toEqual([2, 1, 3])
  })

  test('a mid-list window stays correct through appends and other edits', () => {
    const { list, offset, numbers } = setup(
      Array.from({ length: 20 }, (_, index) => index),
      8,
      3,
    )
    expect(numbers()).toEqual([8, 9, 10])
    list.create(20)
    list.createMany([[21], [22]])
    expect(numbers()).toEqual([8, 9, 10])
    offset.set(9)
    list.create(23)
    expect(numbers()).toEqual([9, 10, 11])
    list.remove(list.find(({ n }) => n === 0)!)
    expect(numbers()).toEqual([10, 11, 12])
    list.create(24)
    list.create(25)
    expect(numbers()).toEqual([10, 11, 12])
  })

  test('a replaced list does not continue from the old window start', () => {
    const list = reatomLinkedList((n: number) => ({ n }))
    const fill = (from: number) =>
      list.set(
        list.initiateFromState(
          Array.from({ length: 20 }, (_, index) => ({ n: from + index })),
        ),
      )
    fill(0)
    const view = reatomView(list, { offset: atom(10), limit: atom(3) })
    expect(view().items.map(({ n }) => n)).toEqual([10, 11, 12])

    // The versions restart, so the append looks like the next commit.
    fill(100)
    list.create(999)
    expect(view().items.map(({ n }) => n)).toEqual([110, 111, 112])
  })

  test('swap outside the window keeps the whole state', () => {
    const { list, view } = setup([1, 2, 3, 4, 5], 0, 2)
    const before = view()
    const [, , three, , five] = list.array()
    list.swap(three!, five!)
    expect(view()).toBe(before)
  })

  test('clear', () => {
    const { list, view } = setup([1, 2, 3], 1, 3)
    list.clear()
    expect(view()).toEqual({ items: [], offset: 0, size: 0 })
    list.create(9)
    expect(view().items.map(({ n }) => n)).toEqual([])
    expect(view().size).toBe(1)
  })

  test('matches a reference slice through random edits and scrolls', () => {
    const { list, offset, limit, view } = setup([], 0, 4)
    let seed = 7
    const random = (max: number) => {
      seed = (seed * 16807) % 2147483647
      return seed % max
    }
    for (let step = 0; step < 600; step++) {
      const nodes = list.array()
      const operation = random(7)
      if (operation === 0 || nodes.length < 3) list.create(step)
      else if (operation === 1) list.remove(nodes[random(nodes.length)]!)
      else if (operation === 2)
        list.swap(nodes[random(nodes.length)]!, nodes[random(nodes.length)]!)
      else if (operation === 3) {
        const node = nodes[random(nodes.length)]!
        const after = nodes[random(nodes.length)]!
        list.move(node, node === after ? null : after)
      } else if (operation === 4) offset.set(random(nodes.length + 2))
      else if (operation === 5) offset.set(offset() + random(3) - 1)
      else limit.set(random(6))

      const expectedOffset = Math.min(Math.max(offset(), 0), list().size)
      expect(view().items).toEqual(
        list.array().slice(expectedOffset, expectedOffset + limit()),
      )
      expect(view().offset).toBe(expectedOffset)
    }
  })
})

describe('memoization', () => {
  test('reuses the items array on an append below the window', () => {
    const { list, view } = setup([1, 2, 3], 0, 2)
    const { items } = view()
    list.create(4)
    expect(view().items).toBe(items)
    expect(view().size).toBe(4)
  })

  test('view.items notifies only when the window nodes change', () => {
    const { list, view, offset } = setup([1, 2, 3], 0, 2)
    const track = subscribe(view.items)
    expect(track).toHaveBeenCalledTimes(1)

    list.create(4)
    notify()
    expect(track).toHaveBeenCalledTimes(1)

    offset.set(1)
    notify()
    expect(track).toHaveBeenCalledTimes(2)
    expect(
      (track.mock.lastCall?.[0] as Array<{ n: number }>).map(({ n }) => n),
    ).toEqual([2, 3])
  })

  test('repeated reads return the same state', () => {
    const { view } = setup([1, 2, 3], 0, 2)
    expect(view()).toBe(view())
  })
})

describe('batching', () => {
  test('a read inside the batch returns the committed window', () => {
    const { list, offset, view, numbers } = setup([1, 2, 3], 0, 2)
    const committed = view()

    list.batch(() => {
      list.create(0)
      list.move(
        list.find(({ n }) => n === 0)!,
        null,
      )
      offset.set(1)
      expect(view()).toBe(committed)
    })

    expect(numbers()).toEqual([1, 2])
    expect(view().size).toBe(4)
  })

  const setupFirstReadInsideBatch = () => {
    const list = reatomLinkedList((n: number) => ({ n }))
    list.createMany([[1], [2], [3]])
    const view = reatomView(list, { offset: atom(0), limit: atom(2) }, 'lazy')

    list.batch(() => {
      list.remove(list.find(({ n }) => n === 1)!)
      expect(() => view()).toThrow(
        `Can't compute the view "lazy" inside the batching of its linked list.`,
      )
    })

    return { list, view }
  }

  test('a first read inside the batch throws instead of caching a torn window', () => {
    const { list, view } = setupFirstReadInsideBatch()
    list.create(4)
    expect(view().items.map(({ n }) => n)).toEqual([2, 3])
  })

  // A computed that reads an atom during that atom's own update keeps the
  // error until the next change of the atom, `reatomMap` behaves the same.
  test.fails('recovers right after the batch that threw', () => {
    const { view } = setupFirstReadInsideBatch()
    expect(view().items.map(({ n }) => n)).toEqual([2, 3])
  })

  test('the window settles after the batch', () => {
    const { list, view, numbers } = setup([1, 2, 3], 0, 3)
    const track = subscribe(view.items)
    list.batch(() => {
      list.clear()
      list.createMany([[7], [8]])
    })
    notify()
    expect(numbers()).toEqual([7, 8])
    expect(track).toHaveBeenCalledTimes(2)
  })
})

describe('sources', () => {
  test('a reatomMap derived list keeps derived node identity', () => {
    const list = reatomLinkedList((n: number) => ({ n }))
    list.createMany([[1], [2], [3], [4]])
    const rows = list.reatomMap(({ n }) => ({ label: `#${n}` }))
    const offset = atom(0)
    const view = reatomView(rows, { offset, limit: atom(2) })
    const [, second] = view().items
    offset.set(1)
    expect(view().items[0]).toBe(second)
    expect(view().items.map(({ label }) => label)).toEqual(['#2', '#3'])

    list.remove(list.array()[0]!)
    expect(view().items.map(({ label }) => label)).toEqual(['#3', '#4'])
  })

  test('an array atom source', () => {
    const rows = atom([{ id: 'a' }, { id: 'b' }, { id: 'c' }])
    const offset = atom(1)
    const view = reatomView(rows, { offset, limit: atom(5) })
    expect(view().items.map(({ id }) => id)).toEqual(['b', 'c'])
    expect(view().size).toBe(3)

    const { items } = view()
    rows.set([...rows(), { id: 'd' }].slice(0, 3))
    expect(view().items).toBe(items)

    offset.set(2.9)
    expect(view().items.map(({ id }) => id)).toEqual(['c'])
  })

  test('a computed array source over linked list nodes', () => {
    const list = reatomLinkedList((n: number) => ({ n }))
    list.createMany([[1], [2], [3], [4], [5], [6]])
    const odd = computed(() => list.array().filter(({ n }) => n % 2 === 1))
    const view = reatomView(odd, { offset: atom(1), limit: atom(2) })
    const items: ReadonlyArray<LLNode<{ n: number }>> = view().items
    expect(items.map(({ n }) => n)).toEqual([3, 5])
    expect(items[0]).toBe(list.find(({ n }) => n === 3))
  })

  test('default name derives from the source', () => {
    const list = reatomLinkedList((n: number) => ({ n }), 'records')
    const view = reatomView(list, { offset: atom(0), limit: atom(1) })
    expect(view.name).toMatch(/^records\.view#\d+$/)
    expect(view.items.name).toBe(`${view.name}.items`)
  })
})
