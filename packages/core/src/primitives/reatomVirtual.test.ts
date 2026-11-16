import { describe, expect, subscribe, test } from 'test'

import { atom, computed, notify } from '../core'
import { reatomLinkedList } from './reatomLinkedList'
import { reatomVirtual } from './reatomVirtual'

interface Row {
  id: number
  size?: number
}

const createRows = (count: number): Array<Row> =>
  Array.from({ length: count }, (_, id) => ({ id }))

const setup = (
  count: number,
  options: { viewportSize?: number; overscan?: number } = {},
) => {
  const rows = atom(createRows(count), 'rows')
  const virtual = reatomVirtual(
    rows,
    { itemSize: 10, viewportSize: 30, overscan: 0, ...options },
    'virtual',
  )
  const ids = () => virtual.items().map(({ id }) => id)
  return { rows, virtual, ids }
}

describe('window', () => {
  test('renders the items that intersect the viewport', () => {
    const { virtual, ids } = setup(100)
    expect(ids()).toEqual([0, 1, 2])
    virtual.scrollTo(25)
    expect(ids()).toEqual([2, 3, 4, 5])
    expect(virtual().offset).toBe(2)
    expect(virtual().size).toBe(100)
  })

  test('overscan adds items on both sides', () => {
    const { virtual, ids } = setup(100, { overscan: 2 })
    virtual.scrollTo(50)
    expect(ids()).toEqual([3, 4, 5, 6, 7, 8, 9])
    virtual.scrollTo(0)
    expect(ids()).toEqual([0, 1, 2, 3, 4])
  })

  test('padding and total size stand in for the hidden items', () => {
    const { virtual } = setup(100)
    virtual.scrollTo(25)
    expect(virtual.totalSize()).toBe(1000)
    expect(virtual.padding()).toEqual({ before: 20, after: 940 })
  })

  test('sticky inset is the rendered overflow of the viewport', () => {
    const { virtual } = setup(100, { overscan: 1 })
    expect(virtual.stickyInset()).toBe(-10)
    virtual.scrollTo(50)
    expect(virtual.stickyInset()).toBe(-20)
    const { virtual: short } = setup(2)
    expect(short.stickyInset()).toBe(0)
  })

  test('the viewport size drives the window', () => {
    const { virtual, ids } = setup(100, { viewportSize: 0 })
    expect(ids()).toEqual([])
    virtual.viewportSize.set(20)
    expect(ids()).toEqual([0, 1])
  })

  test('the rendered items notify only when they change', () => {
    const { virtual, rows } = setup(10)
    const track = subscribe(virtual.items)
    rows.set([...rows(), { id: 10 }])
    notify()
    expect(track).toHaveBeenCalledTimes(1)
    virtual.scrollTo(10)
    notify()
    expect(track).toHaveBeenCalledTimes(2)
  })
})

describe('scroll offset', () => {
  test('is clamped to the scrollable range', () => {
    const { virtual, rows, ids } = setup(10)
    virtual.scrollTo(-5)
    expect(virtual.scrollOffset()).toBe(0)
    virtual.scrollTo(Infinity)
    expect(virtual.scrollOffset()).toBe(70)
    expect(ids()).toEqual([7, 8, 9])
    rows.set(rows().slice(0, 5))
    expect(virtual.scrollOffset()).toBe(20)
  })

  test('NaN throws with the field and the name', () => {
    const { virtual } = setup(10)
    expect(() => virtual.scrollTo(NaN)).toThrow(
      'The "offset" of the virtual "virtual" should be a number, received "NaN".',
    )
  })

  test('stickToEnd follows new items until a scroll away', () => {
    const { virtual, rows, ids } = setup(5)
    virtual.stickToEnd.set(true)
    expect(ids()).toEqual([2, 3, 4])
    rows.set([...rows(), { id: 5 }, { id: 6 }])
    expect(ids()).toEqual([4, 5, 6])
    virtual.scrollToIndex(0)
    expect(virtual.stickToEnd()).toBe(false)
    expect(ids()).toEqual([0, 1, 2])
  })

  test('turning stickToEnd off keeps the position', () => {
    const { virtual, rows } = setup(5)
    virtual.stickToEnd.set(true)
    rows.set([...rows(), { id: 5 }])
    expect(virtual.scrollOffset()).toBe(30)
    virtual.stickToEnd.set(false)
    expect(virtual.scrollOffset()).toBe(30)
  })

  test('stickToEnd accepts an external atom', () => {
    const following = atom(true)
    const virtual = reatomVirtual(atom(createRows(10)), {
      itemSize: 10,
      viewportSize: 30,
      stickToEnd: following,
    })
    expect(virtual.stickToEnd).toBe(following)
    expect(virtual.scrollOffset()).toBe(70)
  })
})

describe('scrollToIndex', () => {
  test('aligns like scrollIntoView', () => {
    const { virtual } = setup(100)
    virtual.scrollToIndex(10)
    expect(virtual.scrollOffset()).toBe(100)
    virtual.scrollToIndex(20, 'end')
    expect(virtual.scrollOffset()).toBe(180)
    virtual.scrollToIndex(50, 'center')
    expect(virtual.scrollOffset()).toBe(490)
  })

  test('nearest scrolls the least distance and keeps a visible item', () => {
    const { virtual } = setup(100)
    virtual.scrollTo(100)
    virtual.scrollToIndex(11, 'nearest')
    expect(virtual.scrollOffset()).toBe(100)
    virtual.scrollToIndex(15, 'nearest')
    expect(virtual.scrollOffset()).toBe(130)
    virtual.scrollToIndex(2, 'nearest')
    expect(virtual.scrollOffset()).toBe(20)
  })

  test('clamps the index and the target', () => {
    const { virtual } = setup(10)
    virtual.scrollToIndex(99)
    expect(virtual.scrollOffset()).toBe(70)
    const { virtual: empty } = setup(0)
    empty.scrollToIndex(3)
    expect(empty.scrollOffset()).toBe(0)
  })
})

describe('sizes', () => {
  test('a uniform number atom updates extents, padding and index alignment', () => {
    const rowHeight = atom(26, 'reactiveSize.rowHeight')
    const virtual = reatomVirtual(atom(createRows(10)), {
      itemSize: rowHeight,
      viewportSize: 52,
      overscan: 0,
    })
    expect(virtual.totalSize()).toBe(260)
    expect(virtual.items().map(({ id }) => id)).toEqual([0, 1])
    expect(virtual.padding()).toEqual({ before: 0, after: 208 })
    rowHeight.set(36)
    expect(virtual.totalSize()).toBe(360)
    expect(virtual.padding()).toEqual({ before: 0, after: 288 })
    virtual.scrollToIndex(4)
    expect(virtual.scrollOffset()).toBe(144)
    expect(virtual.items().map(({ id }) => id)).toEqual([4, 5])
    expect(virtual.padding()).toEqual({ before: 144, after: 144 })
  })

  test('reactive uniform geometry never scans source item slots on append', () => {
    let itemReads = 0
    const observe = (items: Row[]) =>
      new Proxy(items, {
        get(target, key, receiver) {
          if (typeof key === 'string' && /^\d+$/.test(key)) itemReads++
          return Reflect.get(target, key, receiver)
        },
      })
    const initial = createRows(10_000),
      rows = atom(observe(initial), 'arithmetic.rows'),
      rowHeight = atom(26, 'arithmetic.rowHeight')
    const virtual = reatomVirtual(rows, {
      itemSize: rowHeight,
      viewportSize: 100,
    })
    const watch = subscribe(virtual.totalSize)
    expect(virtual.totalSize()).toBe(260_000)
    rowHeight.set(36)
    notify()
    expect(virtual.totalSize()).toBe(360_000)
    rows.set(observe([...initial, { id: 10_000 }]))
    notify()
    expect(virtual.totalSize()).toBe(360_036)
    virtual.scrollToIndex(9000)
    expect(virtual.scrollOffset()).toBe(324_000)
    expect(itemReads).toBe(0)
    watch.unsubscribe()
  })

  test('zero-argument ordinary callbacks remain per-item estimates', () => {
    const rows = atom(createRows(3)),
      rowHeight = atom(26)
    let estimates = 0
    const itemSize = () => {
      estimates++
      return rowHeight()
    }
    expect(itemSize.length).toBe(0)
    const virtual = reatomVirtual(rows, { itemSize })
    expect(virtual.totalSize()).toBe(78)
    expect(estimates).toBe(3)
    rowHeight.set(36)
    expect(virtual.totalSize()).toBe(108)
    expect(estimates).toBe(6)
    rows.set([...rows(), { id: 3 }])
    expect(virtual.totalSize()).toBe(144)
    expect(estimates).toBe(10)
  })

  test('reactive uniform sizes validate lazily and recover after invalid values', () => {
    const rowHeight = atom(0, 'invalid.rowHeight')
    const virtual = reatomVirtual(
      atom(createRows(1)),
      { itemSize: rowHeight },
      'reactive',
    )
    for (const invalid of [0, -1, Infinity, NaN]) {
      rowHeight.set(invalid)
      expect(() => virtual.totalSize()).toThrow(
        `The "itemSize" of the virtual "reactive" should be a positive number, received "${invalid}".`,
      )
    }
    rowHeight.set(26)
    expect(virtual.totalSize()).toBe(26)
  })

  test('uniform size edits preserve measured overrides and update unmeasured defaults', () => {
    const rows = atom(createRows(3)),
      rowHeight = atom(26),
      virtual = reatomVirtual(rows, { itemSize: rowHeight })
    virtual.measure(rows()[0]!, 26) // Exact estimates are not explicit overrides.
    rowHeight.set(36)
    expect(virtual.totalSize()).toBe(108)
    virtual.measure(rows()[0]!, 40)
    expect(virtual.totalSize()).toBe(112)
    rowHeight.set(26)
    expect(virtual.totalSize()).toBe(92)
    rowHeight.set(36)
    expect(virtual.totalSize()).toBe(112)
    virtual.measure(rows()[0]!, 36)
    expect(virtual.totalSize()).toBe(108)
  })

  test('an itemSize function estimates every item', () => {
    const sizes = [10, 20, 30, 40, 50]
    const rows = atom(sizes.map((size, id): Row => ({ id, size })))
    const virtual = reatomVirtual(rows, {
      itemSize: (row) => row.size!,
      viewportSize: 25,
      overscan: 0,
    })
    expect(virtual.totalSize()).toBe(150)
    virtual.scrollTo(15)
    expect(virtual.items().map(({ id }) => id)).toEqual([1, 2])
    expect(virtual.padding()).toEqual({ before: 10, after: 90 })
    virtual.scrollToIndex(3)
    expect(virtual.scrollOffset()).toBe(60)
  })

  test('measure corrects the estimate by item identity', () => {
    const { virtual, rows } = setup(10)
    const [first] = rows()
    virtual.measure(first!, 10)
    expect(virtual.totalSize()).toBe(100)
    virtual.measure(first!, 25)
    expect(virtual.totalSize()).toBe(115)
    rows.set([...rows()].reverse())
    expect(virtual.padding().after).toBe(115 - 30)
  })

  test('a size change above the viewport keeps the visible items in place', () => {
    const { virtual, rows, ids } = setup(100, { overscan: 3 })
    virtual.scrollTo(50)
    const visible = ids().slice(3)
    virtual.measure(rows()[2]!, 30)
    expect(virtual.scrollOffset()).toBe(70)
    virtual.measure(rows()[6]!, 30)
    expect(virtual.scrollOffset()).toBe(70)
    expect(ids().slice(3, 6)).toEqual(visible.slice(0, 3))
  })

  test('a measurement outside the rendered window anchors too', () => {
    const { virtual, rows, ids } = setup(100)
    virtual.scrollTo(500)
    const visible = ids()
    virtual.measure(rows()[2]!, 30)
    expect(virtual.scrollOffset()).toBe(520)
    expect(ids()).toEqual(visible)
    virtual.measure(rows()[2]!, 4)
    expect(virtual.scrollOffset()).toBe(494)
    expect(ids()).toEqual(visible)
  })

  test('measurements of one update rebuild the layout once', () => {
    const rows = atom(createRows(5))
    let estimates = 0
    const virtual = reatomVirtual(rows, {
      itemSize: () => {
        estimates++
        return 10
      },
    })
    expect(virtual.totalSize()).toBe(50)
    expect(estimates).toBe(5)
    for (const row of rows().slice(0, 3)) virtual.measure(row, 20)
    expect(virtual.totalSize()).toBe(80)
    // One estimate per measurement and one rebuild for the two unmeasured rows.
    expect(estimates).toBe(5 + 3 + 2)
  })

  test('a pure estimate is asked once while an item keeps its index', () => {
    const estimated: number[] = []
    const itemSize = (row: Row) => {
      estimated.push(row.id)
      return 10
    }
    const rows = atom(createRows(6))
    const virtual = reatomVirtual(rows, { itemSize, viewportSize: 30 })
    expect(virtual.totalSize()).toBe(60)
    estimated.length = 0

    rows.set([...rows(), { id: 6 }])
    expect(virtual.totalSize()).toBe(70)
    expect(estimated).toEqual([6])

    // A rendered item is patched in place: only `measure` asks for it.
    virtual.measure(rows()[1]!, 25)
    expect(virtual.totalSize()).toBe(85)
    expect(estimated).toEqual([6, 1])

    // An edit keeps the sizes before it.
    rows.set([...rows().slice(0, 5), { id: 7 }, ...rows().slice(5)])
    expect(virtual.totalSize()).toBe(95)
    expect(estimated).toEqual([6, 1, 7, 5, 6])

    const list = reatomLinkedList((id: number) => ({ id }), 'estimated')
    const [first] = list.createMany([[0], [1], [2]])
    const listVirtual = reatomVirtual(list, { itemSize, viewportSize: 30 })
    expect(listVirtual.totalSize()).toBe(30)
    estimated.length = 0
    list.create(3)
    expect(listVirtual.totalSize()).toBe(40)
    expect(estimated).toEqual([3])
    list.move(first!, list().tail)
    expect(listVirtual.totalSize()).toBe(40)
    expect(estimated).toEqual([3, 1, 2, 3, 0])
  })

  test('a measurement anchors through an append of the same update', () => {
    const { virtual, rows } = setup(100)
    virtual.scrollTo(500)

    rows.set([...rows(), { id: 100 }])
    virtual.measure(rows()[2]!, 30)
    expect(virtual.scrollOffset()).toBe(520)

    virtual.measure(rows()[3]!, 30)
    rows.set([...rows(), { id: 101 }])
    expect(virtual.scrollOffset()).toBe(540)

    // Other items before the first visible one are not a size change.
    virtual.measure(rows()[4]!, 30)
    rows.set(rows().slice(1))
    expect(virtual.scrollOffset()).toBe(540)

    const list = reatomLinkedList((id: number) => ({ id }), 'anchored')
    const nodes = list.createMany(createRows(100).map(({ id }) => [id]))
    const listVirtual = reatomVirtual(list, { itemSize: 10, viewportSize: 30 })
    listVirtual.scrollTo(500)
    expect(listVirtual.scrollOffset()).toBe(500)
    listVirtual.measure(nodes[2]!, 30)
    list.create(100)
    expect(listVirtual.scrollOffset()).toBe(520)
    list.create(101)
    listVirtual.measure(nodes[3]!, 30)
    expect(listVirtual.scrollOffset()).toBe(540)
  })

  test('a repeated item is patched where it is rendered', () => {
    const repeated: Row = { id: 0 }
    const rows = atom([repeated, ...createRows(20).slice(1), repeated])
    const virtual = reatomVirtual(rows, {
      itemSize: () => 10,
      viewportSize: 30,
      overscan: 0,
    })
    expect(virtual.totalSize()).toBe(210)
    virtual.measure(repeated, 25)
    virtual.scrollToIndex(20)
    expect(virtual.items().at(-1)).toBe(repeated)
    // The size is known already, but not at this index of the layout.
    virtual.measure(repeated, 25)
    expect(virtual.totalSize()).toBe(240)
    expect(virtual.padding().after).toBe(0)
  })

  test('the patched layout is the same as a rebuilt one', () => {
    let seed = 3
    const random = (max: number) => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return (seed >>> 12) % max
    }
    const itemSize = (row: Row) => 10.1 + (row.id % 4)

    for (const kind of ['array', 'list'] as const) {
      let nextId = 0
      const createRow = (): Row => ({ id: nextId++ })
      const rows = atom(Array.from({ length: 40 }, createRow), `${kind}.rows`)
      const list = reatomLinkedList(rows().slice(), `${kind}.list`)
      const source = kind === 'array' ? rows : list
      const items = (): Row[] => (kind === 'array' ? rows() : list.array())
      const options = { itemSize, viewportSize: 55, overscan: 1 }
      const virtual = reatomVirtual(source as typeof rows, options)
      const measured = new Map<Row, number>()

      for (let step = 0; step < 300; step++) {
        const current = items()
        const pick = () => current[random(current.length)]!
        const operation = random(10)
        if (operation < 3) {
          const row = createRow()
          if (kind === 'array') rows.set([...current, row])
          else list.create(row)
        } else if (operation === 3 && current.length > 5) {
          const index = random(current.length)
          if (kind === 'array') rows.set(current.toSpliced(index, 1))
          else list.remove(pick() as never)
        } else if (operation === 4) {
          const index = random(current.length)
          if (kind === 'array') {
            rows.set(current.toSpliced(index, 0, createRow()))
          } else list.insertMany([createRow()], pick() as never)
        } else if (operation < 8) {
          // Mostly rendered rows, like a ResizeObserver, sometimes any row.
          const rendered = virtual.items()
          const batch = 1 + random(3)
          for (let i = 0; i < batch; i++) {
            const row =
              rendered.length && random(4)
                ? rendered[random(rendered.length)]!
                : pick()
            const size = 5.3 + random(30)
            measured.set(row, size)
            virtual.measure(row, size)
          }
        } else {
          virtual.scrollTo(random(Math.ceil(virtual.totalSize()) + 20))
        }
        // Not every step is read, so the changes of a few of them meet.
        if (random(3) === 0) continue

        const rebuilt = reatomVirtual(source as typeof rows, options)
        for (const [row, size] of measured) rebuilt.measure(row, size)
        rebuilt.scrollTo(virtual.scrollOffset())
        expect(virtual.totalSize()).toBe(
          items().reduce(
            (total, row) => total + (measured.get(row) ?? itemSize(row)),
            0,
          ),
        )
        expect(virtual()).toEqual(rebuilt())
        expect(virtual.padding()).toEqual(rebuilt.padding())
        expect(virtual.stickyInset()).toBe(rebuilt.stickyInset())
      }
    }
  })

  test('invalid sizes throw', () => {
    expect(() => reatomVirtual(atom([]), { itemSize: 0 }, 'zero')).toThrow(
      'The "itemSize" of the virtual "zero" should be a positive number, received "0".',
    )
    const { virtual, rows } = setup(3)
    expect(() => virtual.measure(rows()[0]!, -1)).toThrow(
      'The measured size in the virtual "virtual"',
    )
    const broken = reatomVirtual(
      atom([{ id: 0 }]),
      { itemSize: () => NaN },
      'broken',
    )
    expect(() => broken.totalSize()).toThrow(
      'The size of the item 0 in the virtual "broken"',
    )
  })
})

describe('sources', () => {
  test('a linked list feed that follows its tail', () => {
    const list = reatomLinkedList((id: number) => ({ id }), 'feed')
    list.createMany([[0], [1], [2], [3]])
    const virtual = reatomVirtual(list, {
      itemSize: 10,
      viewportSize: 20,
      overscan: 0,
      stickToEnd: atom(true),
    })
    expect(virtual.items().map(({ id }) => id)).toEqual([2, 3])
    list.createMany([[4], [5]])
    expect(virtual.items().map(({ id }) => id)).toEqual([4, 5])
    expect(virtual.items()[0]).toBe(list.find(({ id }) => id === 4))
  })

  test('a linked list read inside its batch throws', () => {
    const list = reatomLinkedList((id: number) => ({ id }))
    const virtual = reatomVirtual(list, { itemSize: 10 }, 'batched')
    list.batch(() => {
      list.create(1)
      expect(() => virtual.totalSize()).toThrow(
        `Can't compute the virtual "batched" inside the batching of its linked list.`,
      )
    })
  })

  test('default name derives from the source', () => {
    const virtual = reatomVirtual(
      computed(() => [1], 'numbers'),
      {
        itemSize: 1,
      },
    )
    expect(virtual.name).toMatch(/^numbers\.virtual#\d+$/)
  })
})

describe('reatomMap', () => {
  test('keeps the rendered node of an item while it stays in the window', () => {
    const { virtual } = setup(100)
    let renders = 0
    const rendered = virtual.reatomMap((row) => {
      renders++
      return { label: `#${row.id}` }
    })
    const labels = () => rendered.array().map(({ label }) => label)

    const unsubscribe = rendered.subscribe()
    notify()
    expect(labels()).toEqual(['#0', '#1', '#2'])
    const second = rendered.array()[1]

    virtual.scrollTo(10)
    notify()
    expect(labels()).toEqual(['#1', '#2', '#3'])
    expect(rendered.array()[0]).toBe(second)
    expect(renders).toBe(4)

    virtual.scrollTo(500)
    notify()
    expect(labels()).toEqual(['#50', '#51', '#52'])

    unsubscribe()
    notify()
    expect(rendered().size).toBe(0)
  })
})

describe('bindScroller acknowledgements', () => {
  const setupBinding = (following: boolean | 'default' = true) => {
    let frameId = 0
    const frames = new Map<number, FrameRequestCallback>()
    let readViewport = () => {}
    const mocks = {
      requestAnimationFrame: (callback: FrameRequestCallback) => {
        frames.set(++frameId, callback)
        return frameId
      },
      cancelAnimationFrame: (id: number) => {
        frames.delete(id)
      },
      ResizeObserver: class {
        constructor(callback: () => void) {
          readViewport = callback
        }
        observe() {}
        disconnect() {}
      },
    }
    const originals = Object.keys(mocks).map(
      (key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const,
    )
    for (const [key] of originals)
      Object.defineProperty(globalThis, key, {
        configurable: true,
        writable: true,
        value: mocks[key as keyof typeof mocks],
      })

    const rows = atom(createRows(100), 'binding.rows')
    const virtual = reatomVirtual(
      rows,
      {
        itemSize: 20,
        overscan: 0,
        stickToEnd:
          following === 'default'
            ? undefined
            : atom(following, 'binding.following'),
      },
      'binding.virtual',
    )
    const scroller = Object.assign(new EventTarget(), {
      style: { overflowAnchor: 'auto' },
      clientHeight: 100,
      scrollHeight: 2000,
      scrollTop: 0,
      scrollLeft: 0,
    })
    let position = 0
    const clamp = (value: number) =>
      Math.max(
        0,
        Math.min(value, scroller.scrollHeight - scroller.clientHeight),
      )
    Object.defineProperty(scroller, 'scrollTop', {
      get: () => (position = clamp(position)),
      set: (value: number) => {
        position = clamp(value)
      },
    })
    const unbind = virtual.bindScroller(scroller as unknown as HTMLElement)
    return {
      rows,
      virtual,
      scroller,
      resize: () => readViewport(),
      scroll: () => scroller.dispatchEvent(new Event('scroll')),
      frame: () => {
        notify()
        const callbacks = [...frames.values()]
        frames.clear()
        for (const callback of callbacks) callback(0)
        notify()
      },
      dispose: () => {
        unbind()
        for (const [key, descriptor] of originals) {
          if (descriptor) Object.defineProperty(globalThis, key, descriptor)
          else Reflect.deleteProperty(globalThis, key)
        }
      },
    }
  }

  test('a delayed own-scroll event after geometry growth does not disable following', () => {
    const binding = setupBinding()
    const { rows, virtual, scroller, frame, scroll, dispose } = binding
    try {
      frame()
      expect(scroller.scrollTop).toBe(1900)
      rows.set([...rows(), { id: 100 }])
      scroller.scrollHeight = 2020
      notify()
      scroll() // Native acknowledgement of our previous 1900px write.
      expect(virtual.stickToEnd()).toBe(true)
      expect(virtual.scrollOffset()).toBe(1920)
      frame()
      expect(scroller.scrollTop).toBe(1920)
    } finally {
      dispose()
    }
  })

  test('a real user scroll wins over a pending follow alignment', () => {
    const { rows, virtual, scroller, frame, scroll, dispose } = setupBinding()
    try {
      frame()
      rows.set([...rows(), { id: 100 }])
      scroller.scrollHeight = 2020
      notify()
      scroller.scrollTop = 1800
      scroll()
      expect(virtual.stickToEnd()).toBe(false)
      expect(virtual.scrollOffset()).toBe(1800)
      frame()
      expect(scroller.scrollTop).toBe(1800)
    } finally {
      dispose()
    }
  })

  test('a native return to the bottom resumes following and pins later appends', () => {
    const { rows, virtual, scroller, frame, scroll, dispose } = setupBinding()
    try {
      frame()
      scroller.scrollTop = 1200
      scroll()
      expect(virtual.stickToEnd()).toBe(false)
      frame()
      scroller.scrollTop = 1900
      scroll()
      expect(virtual.stickToEnd()).toBe(true)
      rows.set([...rows(), { id: 100 }])
      scroller.scrollHeight = 2020
      frame()
      expect(virtual.scrollOffset()).toBe(1920)
      expect(scroller.scrollTop).toBe(1920)
    } finally {
      dispose()
    }
  })

  test('default lists remain paused after native bottom scrolling and append', () => {
    const { rows, virtual, scroller, frame, scroll, dispose } =
      setupBinding('default')
    try {
      frame()
      scroller.scrollTop = 1900
      scroll()
      expect(virtual.stickToEnd()).toBe(false)
      rows.set([...rows(), { id: 100 }])
      scroller.scrollHeight = 2020
      frame()
      expect(virtual.scrollOffset()).toBe(1900)
      expect(scroller.scrollTop).toBe(1900)
      virtual.stickToEnd.set(true)
      frame()
      expect(scroller.scrollTop).toBe(1920)
    } finally {
      dispose()
    }
  })

  test('native bottom detection uses the same one-pixel tolerance in both directions', () => {
    const { virtual, scroller, frame, scroll, dispose } = setupBinding(false)
    try {
      frame()
      scroller.scrollTop = 1898.9
      scroll()
      expect(virtual.stickToEnd()).toBe(false)
      scroller.scrollTop = 1899
      scroll()
      expect(virtual.stickToEnd()).toBe(true)
      frame()
      scroller.scrollTop = 1898.9
      scroll()
      expect(virtual.stickToEnd()).toBe(false)
    } finally {
      dispose()
    }
  })

  test('model navigation to the tail and horizontal events do not enable following', () => {
    const { rows, virtual, scroller, frame, scroll, dispose } =
      setupBinding(false)
    try {
      frame()
      virtual.scrollToIndex(99)
      scroller.scrollLeft = 40
      scroll() // No vertical movement; keep the pending model scroll.
      expect(virtual.scrollOffset()).toBe(1900)
      expect(virtual.stickToEnd()).toBe(false)
      frame()
      scroll() // Acknowledge the model's write to the tail.
      expect(virtual.stickToEnd()).toBe(false)
      scroller.scrollLeft = 80
      scroll()
      expect(virtual.stickToEnd()).toBe(false)
      rows.set([...rows(), { id: 100 }])
      scroller.scrollHeight = 2020
      frame()
      expect(scroller.scrollTop).toBe(1900)
      expect(virtual.stickToEnd()).toBe(false)
    } finally {
      dispose()
    }
  })

  test('an unchanged event does not overwrite a pending programmatic scroll', () => {
    const { virtual, scroller, frame, scroll, dispose } = setupBinding(false)
    try {
      frame()
      virtual.scrollTo(600)
      scroll()
      expect(virtual.scrollOffset()).toBe(600)
      frame()
      expect(scroller.scrollTop).toBe(600)
    } finally {
      dispose()
    }
  })

  test('resize and native clamping preserve following and paused positions', () => {
    const { rows, virtual, scroller, frame, scroll, resize, dispose } =
      setupBinding()
    try {
      frame()
      scroller.clientHeight = 200
      resize()
      scroll()
      frame()
      expect(virtual.stickToEnd()).toBe(true)
      expect(scroller.scrollTop).toBe(1800)

      scroller.clientHeight = 100
      resize()
      scroll()
      frame()
      expect(virtual.stickToEnd()).toBe(true)
      expect(scroller.scrollTop).toBe(1900)

      virtual.scrollToIndex(45)
      frame()
      expect(virtual.stickToEnd()).toBe(false)
      expect(scroller.scrollTop).toBe(900)
      rows.set(rows().slice(0, 20))
      scroller.scrollHeight = 400
      scroll()
      frame()
      expect(virtual.scrollOffset()).toBe(300)
      rows.set(createRows(100))
      scroller.scrollHeight = 2000
      frame()
      expect(scroller.scrollTop).toBe(300)
      expect(virtual.stickToEnd()).toBe(false)
    } finally {
      dispose()
    }
  })
})
