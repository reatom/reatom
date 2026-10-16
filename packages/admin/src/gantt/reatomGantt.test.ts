import { atom, computed, notify, reatomLinkedList } from '@reatom/core'
import { describe, expect, subscribe, test } from 'test'

import { barGeometry, reatomGantt } from './reatomGantt'

interface Span {
  id: string
  parent?: string
  start: number
  end?: number
}

const span = (
  id: string,
  start: number,
  end?: number,
  parent?: string,
): Span => ({ id, start, end, parent })

const timing = {
  start: (node: Span) => node.start,
  end: (node: Span) => node.end,
  id: (node: Span) => node.id,
  parentId: (node: Span) => node.parent,
}

const setup = (
  initial: Array<Span>,
  {
    rowsPerScreen = 50,
    mode,
  }: { rowsPerScreen?: number; mode?: 'waterfall' | 'log' } = {},
) => {
  const source = atom(initial, 'spans')
  const gantt = reatomGantt(
    source,
    {
      ...timing,
      mode,
      virtual: { itemSize: 1, viewportSize: rowsPerScreen, overscan: 0 },
    },
    'gantt',
  )
  const ids = () => gantt.virtual.items().map(({ id }) => id)
  const rowIds = () => gantt.rows().map(({ id }) => id)
  return { source, gantt, ids, rowIds }
}

const tree = () => [
  span('a', 0, 100),
  span('a1', 10, 40, 'a'),
  span('a1x', 15, 20, 'a1'),
  span('a2', 50, 90, 'a'),
  span('b', 120, 200),
  span('b1', 130, 150, 'b'),
]

describe('row window', () => {
  test('follows the scroll state', () => {
    const { gantt, ids } = setup(
      Array.from({ length: 10 }, (_, index) => span(`r${index}`, index)),
      { mode: 'log', rowsPerScreen: 3 },
    )
    expect(ids()).toEqual(['r0', 'r1', 'r2'])
    gantt.virtual.scrollTo(4)
    expect(ids()).toEqual(['r4', 'r5', 'r6'])
    gantt.virtual.viewportSize.set(2)
    expect(ids()).toEqual(['r4', 'r5'])
    gantt.virtual.scrollTo(9)
    expect(ids()).toEqual(['r8', 'r9'])
  })

  test('padding stands in for the rows outside the window', () => {
    const { gantt } = setup(
      Array.from({ length: 10 }, (_, index) => span(`r${index}`, index)),
      { mode: 'log', rowsPerScreen: 3 },
    )
    gantt.virtual.scrollTo(2)
    expect(gantt.virtual.padding()).toEqual({ before: 2, after: 5 })
    gantt.virtual.scrollTo(8)
    expect(gantt.virtual.padding()).toEqual({ before: 7, after: 0 })
  })

  test('row height comes from the virtual options', () => {
    const source = atom(
      Array.from({ length: 10 }, (_, index) => span(`r${index}`, index)),
    )
    const gantt = reatomGantt(source, {
      ...timing,
      mode: 'log',
      virtual: { itemSize: 26, viewportSize: 52, overscan: 0 },
    })
    gantt.virtual.scrollTo(26 * 3 + 5)
    expect(gantt.virtual.items().map(({ id }) => id)).toEqual([
      'r3',
      'r4',
      'r5',
    ])
    expect(gantt.virtual.padding()).toEqual({ before: 78, after: 104 })
  })

  test('keeps the node objects it received', () => {
    const nodes = tree()
    const { gantt } = setup(nodes, { mode: 'log', rowsPerScreen: 2 })
    const [, second] = gantt.virtual.items()
    gantt.virtual.scrollTo(1)
    expect(gantt.virtual.items()[0]).toBe(second)
    expect(gantt.rows().every((row) => nodes.includes(row))).toBe(true)
  })

  test('follows source mutations', () => {
    const { source, gantt, ids } = setup([span('x', 0), span('y', 1)], {
      mode: 'log',
      rowsPerScreen: 5,
    })
    source.set([...source(), span('z', 2)])
    expect(ids()).toEqual(['x', 'y', 'z'])
    source.set(source().filter(({ id }) => id !== 'x'))
    expect(ids()).toEqual(['y', 'z'])
    expect(gantt.virtual().size).toBe(2)
  })

  test('an append below the fold does not notify the visible rows', () => {
    const { source, gantt } = setup([span('x', 0), span('y', 1)], {
      mode: 'log',
      rowsPerScreen: 2,
    })
    const track = subscribe(gantt.virtual.items)
    source.set([...source(), span('z', 2)])
    notify()
    expect(track).toHaveBeenCalledTimes(1)
  })

  test('empty source', () => {
    const { gantt } = setup([])
    expect(gantt.virtual()).toEqual({ items: [], offset: 0, size: 0 })
    expect(gantt.virtual.padding()).toEqual({ before: 0, after: 0 })
    expect(gantt.range()).toBeNull()
    expect(gantt.visibleTime()).toBeNull()
    expect(gantt.rowIndexAt(10)).toBe(0)
    gantt.moveSelection(1)
    expect(gantt.selected()).toBeNull()
  })

  test('accepts a linked list source', () => {
    const list = reatomLinkedList((id: string, start: number) => ({
      id,
      start,
    }))
    list.createMany([
      ['p', 0],
      ['q', 5],
    ])
    const gantt = reatomGantt(list, {
      start: (node) => node.start,
      mode: 'log',
      virtual: { itemSize: 1, viewportSize: 5 },
    })
    expect(gantt.virtual.items()).toEqual(list.array())
    list.create('r', 7)
    expect(gantt.rows().map(({ id }) => id)).toEqual(['p', 'q', 'r'])
  })

  test('a filtered computed source keeps identity', () => {
    const source = atom(tree())
    const query = atom('')
    const filtered = computed(() =>
      source().filter(({ id }) => id.startsWith(query())),
    )
    const gantt = reatomGantt(filtered, { ...timing, mode: 'log' })
    query.set('a')
    expect(gantt.rows().map(({ id }) => id)).toEqual(['a', 'a1', 'a1x', 'a2'])
    expect(gantt.rows()[0]).toBe(source()[0])
  })
})

describe('log mode', () => {
  test('orders rows by start and reuses an already sorted source', () => {
    const sorted = [span('x', 0), span('y', 1)]
    const { gantt: sortedGantt } = setup(sorted, { mode: 'log' })
    expect(sortedGantt.rows()).toBe(sorted)

    const { rowIds } = setup(
      [span('late', 9), span('early', 1), span('mid', 5)],
      {
        mode: 'log',
      },
    )
    expect(rowIds()).toEqual(['early', 'mid', 'late'])
  })

  test('keeps the source order for equal starts', () => {
    const { rowIds } = setup(
      [span('b', 5), span('a', 1), span('c', 5), span('d', 5)],
      { mode: 'log' },
    )
    expect(rowIds()).toEqual(['a', 'b', 'c', 'd'])
  })
})

describe('waterfall mode', () => {
  test('starts collapsed with root rows ordered by start', () => {
    const nodes = tree().reverse()
    const { gantt, rowIds } = setup(nodes)
    expect(gantt.mode()).toBe('waterfall')
    expect(rowIds()).toEqual(['a', 'b'])
    expect(gantt.children(nodes.find(({ id }) => id === 'a')!).length).toBe(2)
  })

  test('expand, collapse and toggle change the row sequence', () => {
    const nodes = tree()
    const [a, a1, , , b] = nodes
    const { gantt, rowIds } = setup(nodes)

    gantt.expand(a!)
    expect(rowIds()).toEqual(['a', 'a1', 'a2', 'b'])
    expect(gantt.depth(a1!)).toBe(1)
    expect(gantt.isExpanded(a!)).toBe(true)

    gantt.toggle(a1!)
    expect(rowIds()).toEqual(['a', 'a1', 'a1x', 'a2', 'b'])
    expect(gantt.depth(nodes[2]!)).toBe(2)

    gantt.collapse(a!)
    expect(rowIds()).toEqual(['a', 'b'])

    gantt.expand(a!)
    expect(rowIds()).toEqual(['a', 'a1', 'a1x', 'a2', 'b'])

    gantt.toggle(b!)
    expect(rowIds()).toEqual(['a', 'a1', 'a1x', 'a2', 'b', 'b1'])
  })

  test('expandAll and collapseAll', () => {
    const { gantt, rowIds } = setup(tree())
    gantt.expandAll()
    expect(rowIds()).toEqual(['a', 'a1', 'a1x', 'a2', 'b', 'b1'])
    gantt.collapseAll()
    expect(rowIds()).toEqual(['a', 'b'])
  })

  test('the window slides over the expanded rows', () => {
    const { gantt, ids } = setup(tree(), { rowsPerScreen: 2 })
    gantt.expandAll()
    gantt.virtual.scrollTo(2)
    expect(ids()).toEqual(['a1x', 'a2'])
    expect(gantt.virtual.padding()).toEqual({ before: 2, after: 2 })
  })

  test('a child whose parent is missing becomes a root', () => {
    const { rowIds } = setup([span('orphan', 5, 6, 'gone'), span('root', 1)])
    expect(rowIds()).toEqual(['root', 'orphan'])
  })

  test('a child arriving later joins its expanded parent', () => {
    const nodes = [span('a', 0, 100)]
    const { source, gantt, rowIds } = setup(nodes)
    gantt.expand(nodes[0]!)
    source.set([...source(), span('a1', 10, 20, 'a')])
    expect(rowIds()).toEqual(['a', 'a1'])
  })

  test('without id accessors every node is a root', () => {
    const source = atom([span('b', 2), span('a', 1, 3, 'b')])
    const gantt = reatomGantt(source, { start: (node) => node.start })
    expect(gantt.rows().map(({ id }) => id)).toEqual(['a', 'b'])
  })

  test('switching mode keeps the expand set', () => {
    const nodes = tree()
    const { gantt, rowIds } = setup(nodes)
    gantt.expand(nodes[0]!)
    gantt.mode.set('log')
    expect(rowIds()).toEqual(['a', 'a1', 'a1x', 'a2', 'b', 'b1'])
    expect(gantt.depth(nodes[1]!)).toBe(0)
    gantt.mode.set('waterfall')
    expect(rowIds()).toEqual(['a', 'a1', 'a2', 'b'])
  })
})

describe('time axis', () => {
  test('range spans every node, instants use their start', () => {
    const { gantt, source } = setup([span('a', 10, 50), span('b', 30)])
    expect(gantt.range()).toEqual({ start: 10, end: 50 })
    source.set([...source(), span('c', 70)])
    expect(gantt.range()).toEqual({ start: 10, end: 70 })
  })

  test('visible time fits the range until a window is set', () => {
    const { gantt, source } = setup([span('a', 0, 100)])
    expect(gantt.visibleTime()).toEqual({ start: 0, end: 100 })
    gantt.zoom(2)
    expect(gantt.visibleTime()).toEqual({ start: 25, end: 75 })
    gantt.pan(-25)
    expect(gantt.visibleTime()).toEqual({ start: 0, end: 50 })
    source.set([...source(), span('b', 400)])
    expect(gantt.visibleTime()).toEqual({ start: 0, end: 50 })
    gantt.fit()
    expect(gantt.visibleTime()).toEqual({ start: 0, end: 400 })
  })

  test('zoom keeps the anchor time in place', () => {
    const { gantt } = setup([span('a', 0, 100)])
    gantt.zoom(4, 20)
    expect(gantt.visibleTime()).toEqual({ start: 15, end: 40 })
    gantt.zoom(0.25, 20)
    expect(gantt.visibleTime()).toEqual({ start: 0, end: 100 })
  })

  test('bar geometry is relative to the visible time', () => {
    const nodes = [span('a', 0, 100), span('b', 25, 75), span('c', 50)]
    const { gantt } = setup(nodes)
    expect(gantt.bar(nodes[1]!)).toEqual({ left: 0.25, width: 0.5 })
    expect(gantt.bar(nodes[2]!)).toEqual({ left: 0.5, width: 0 })
    gantt.timeWindow.set({ start: 50, end: 100 })
    expect(gantt.bar(nodes[1]!)).toEqual({ left: -0.5, width: 1 })
  })

  test('barGeometry handles a zero-length window', () => {
    expect(barGeometry(5, 5, { start: 5, end: 5 })).toEqual({
      left: 0,
      width: 0,
    })
    expect(barGeometry(5, undefined, { start: 0, end: 10 })).toEqual({
      left: 0.5,
      width: 0,
    })
  })

  test('rowIndexAt maps a time to the first row starting at or after it', () => {
    const { gantt } = setup(
      [span('r0', 0), span('r1', 10), span('r2', 20), span('r3', 30)],
      { mode: 'log' },
    )
    expect(gantt.rowIndexAt(-5)).toBe(0)
    expect(gantt.rowIndexAt(10)).toBe(1)
    expect(gantt.rowIndexAt(11)).toBe(2)
    expect(gantt.rowIndexAt(99)).toBe(4)
  })

  test('rowIndexAt in waterfall searches the root rows', () => {
    const { gantt } = setup(tree())
    gantt.expandAll()
    expect(gantt.rowIndexAt(5)).toBe(4)
    expect(gantt.rowIndexAt(0)).toBe(0)
  })

  test('scrollToTime moves the window', () => {
    const { gantt, ids } = setup(
      Array.from({ length: 10 }, (_, index) => span(`r${index}`, index * 10)),
      { mode: 'log', rowsPerScreen: 2 },
    )
    gantt.scrollToTime(35)
    expect(ids()).toEqual(['r4', 'r5'])
    gantt.scrollToTime(1000)
    expect(ids()).toEqual(['r8', 'r9'])
  })
})

describe('selection', () => {
  test('moving the selection away from the end stops following', () => {
    const nodes = Array.from({ length: 6 }, (_, index) =>
      span(`r${index}`, index),
    )
    const following = atom(true)
    const gantt = reatomGantt(atom(nodes), {
      ...timing,
      mode: 'log',
      virtual: { itemSize: 1, viewportSize: 2, stickToEnd: following },
    })
    expect(gantt.virtual.scrollOffset()).toBe(4)
    gantt.moveSelection(1)
    expect(gantt.selected()).toBe(nodes[0])
    expect(following()).toBe(false)
    expect(gantt.virtual.scrollOffset()).toBe(0)
  })

  test('select and moveSelection keep the selected row on screen', () => {
    const nodes = Array.from({ length: 6 }, (_, index) =>
      span(`r${index}`, index),
    )
    const { gantt, ids } = setup(nodes, { mode: 'log', rowsPerScreen: 2 })

    gantt.moveSelection(1)
    expect(gantt.selected()).toBe(nodes[0])

    gantt.moveSelection(2)
    expect(gantt.selected()).toBe(nodes[2])
    expect(ids()).toEqual(['r1', 'r2'])

    gantt.moveSelection(-10)
    expect(gantt.selected()).toBe(nodes[0])
    expect(ids()).toEqual(['r0', 'r1'])

    gantt.select(nodes[5]!)
    gantt.scrollToRow(nodes[5]!)
    expect(ids()).toEqual(['r4', 'r5'])

    gantt.select(null)
    gantt.moveSelection(-1)
    expect(gantt.selected()).toBe(nodes[5])
  })

  test('selection survives a filter change by identity', () => {
    const nodes = tree()
    const source = atom(nodes)
    const gantt = reatomGantt(source, { ...timing, mode: 'log' })
    gantt.select(nodes[4]!)
    source.set(nodes.slice(3))
    expect(gantt.selected()).toBe(nodes[4])
    gantt.moveSelection(1)
    expect(gantt.selected()).toBe(nodes[5])
  })
})

describe('keys and order', () => {
  const byId = {
    ...timing,
    key: (node: Span) => node.id,
  }
  const byLabel = (left: Span, right: Span) =>
    left.id < right.id ? -1 : left.id > right.id ? 1 : 0

  test('expansion survives a source rebuilt from new objects with the same keys', () => {
    const source = atom([span('a', 0, 100), span('a1', 10, 40, 'a')])
    const gantt = reatomGantt(source, byId)
    gantt.expand(source()[0]!)
    const rebuilt = [
      span('a', 0, 100),
      span('a1', 10, 40, 'a'),
      span('a2', 50, 90, 'a'),
    ]
    source.set(rebuilt)
    expect(gantt.isExpanded(rebuilt[0]!)).toBe(true)
    expect([...gantt.expanded()]).toEqual(['a'])
    expect(gantt.rows().map(({ id }) => id)).toEqual(['a', 'a1', 'a2'])
  })

  test('selected.set routes to select and a missing key can return', () => {
    const source = atom([span('a', 0), span('b', 1)])
    const gantt = reatomGantt(source, { ...byId, mode: 'log' })
    gantt.selected.set(source()[1]!)
    expect(gantt.selected()?.id).toBe('b')
    gantt.selected.set(() => source()[0]!)
    source.set([span('b', 1)])
    expect(gantt.selected()).toBeNull()
    const restored = [span('a', 0), span('b', 1)]
    source.set(restored)
    expect(gantt.selected()).toBe(restored[0])
  })

  test('selected resolves to the rebuilt node and is null once the key disappears', () => {
    const source = atom([span('a', 0), span('b', 1)])
    const gantt = reatomGantt(source, { ...byId, mode: 'log' })
    gantt.select(source()[0]!)
    const rebuilt = [span('a', 0), span('b', 1)]
    source.set(rebuilt)
    expect(gantt.selected()).toBe(rebuilt[0])
    source.set([span('b', 1)])
    expect(gantt.selected()).toBeNull()
  })

  test('moveSelection after a rebuild uses the resolved node', () => {
    const source = atom([span('a', 0), span('b', 1), span('c', 2)])
    const gantt = reatomGantt(source, { ...byId, mode: 'log' })
    gantt.select(source()[0]!)
    const rebuilt = [span('a', 0), span('b', 1), span('c', 2)]
    source.set(rebuilt)
    gantt.moveSelection(1)
    expect(gantt.selected()).toBe(rebuilt[1])
  })

  test('expandAll stores keys', () => {
    const gantt = reatomGantt(atom(tree()), byId)
    gantt.expandAll()
    expect(gantt.expanded()).toEqual(new Set(['a', 'a1', 'b']))
  })

  test('order sorts roots and siblings in waterfall while log stays in start order', () => {
    const nodes = [
      span('b', 0, 10),
      span('a', 5, 20),
      span('a2', 6, 8, 'a'),
      span('a1', 7, 9, 'a'),
    ]
    const gantt = reatomGantt(atom(nodes), { ...timing, order: byLabel })
    expect(gantt.rows().map(({ id }) => id)).toEqual(['a', 'b'])
    gantt.expandAll()
    expect(gantt.rows().map(({ id }) => id)).toEqual(['a', 'a1', 'a2', 'b'])
    gantt.mode.set('log')
    expect(gantt.rows().map(({ id }) => id)).toEqual(['b', 'a', 'a2', 'a1'])
  })

  test('rowIndexAt with order follows the root row order', () => {
    const nodes = [span('late', 100, 110), span('early', 0, 10)]
    const gantt = reatomGantt(atom(nodes), {
      ...timing,
      order: (left, right) =>
        left.id < right.id ? 1 : left.id > right.id ? -1 : 0,
    })
    expect(gantt.rows().map(({ id }) => id)).toEqual(['late', 'early'])
    expect(gantt.rowIndexAt(50)).toBe(0)
    expect(gantt.rowIndexAt(200)).toBe(2)
  })
})
