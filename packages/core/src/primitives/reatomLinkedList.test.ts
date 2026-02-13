import { expect, subscribe, test, vi } from 'test'

import { atom, computed, isAtom, isConnected, notify } from '../core'
import { withChangeHook } from '../extensions'
import { deatomize, isCausedBy } from '../methods'
import {
  LL_NEXT,
  LL_PREV,
  reatomLinkedList,
  type LinkedListViewState,
  type LLNode,
} from './reatomLinkedList'

test('should respect initState, create and remove elements properly', () => {
  const list = reatomLinkedList({
    create: (n: number) => atom(n),
    initState: [atom(1), atom(2)],
  })

  const last = list.create(3)
  expect(list.array().map((v) => v())).toEqual([1, 2, 3])
  list.remove(last)
  expect(deatomize(list.array)).toEqual([1, 2])

  list.remove(last)
  expect(deatomize(list.array)).toEqual([1, 2])

  list.remove(list.find((n) => n() === 1)!)
  expect(deatomize(list.array)).toEqual([2])

  list.remove(list.find((n) => n() === 2)!)
  expect(deatomize(list.array)).toEqual([])

  expect(() => {
    list.remove(list.find((n) => n() === 2)!)
  }).toThrow('The passed data is not a linked list node.')
})

test('should swap elements', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  const { array } = list.reatomMap(({ n }) => ({ n }))
  const track = subscribe(computed(() => array().map(({ n }) => n)))
  const one = list.create(1)
  const two = list.create(2)
  const three = list.create(3)
  const four = list.create(4)
  notify()
  expect(track.mock.lastCall?.[0]).toEqual([1, 2, 3, 4])

  list.swap(four, two)
  notify()
  expect(track.mock.lastCall?.[0]).toEqual([1, 4, 3, 2])

  list.swap(two, four)
  notify()
  expect(track.mock.lastCall?.[0]).toEqual([1, 2, 3, 4])

  list.swap(three, four)
  notify()
  expect(track.mock.lastCall?.[0]).toEqual([1, 2, 4, 3])

  list.swap(four, three)
  notify()
  expect(track.mock.lastCall?.[0]).toEqual([1, 2, 3, 4])

  list.remove(two)
  notify()
  expect(track.mock.lastCall?.[0]).toEqual([1, 3, 4])

  list.remove(three)
  notify()
  expect(track.mock.lastCall?.[0]).toEqual([1, 4])

  list.swap(four, one)
  notify()
  expect(track.mock.lastCall?.[0]).toEqual([4, 1])

  list.swap(four, one)
  notify()
  expect(track.mock.lastCall?.[0]).toEqual([1, 4])

  list.remove(one)
  notify()
  expect(track.mock.lastCall?.[0]).toEqual([4])

  list.clear()
  notify()
  expect(deatomize(list.array)).toEqual([])
})

test('should move elements', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  const one = list.create(1)
  // @ts-expect-error
  const two = list.create(2)
  // @ts-expect-error
  const three = list.create(3)
  const four = list.create(4)
  const track = subscribe(list.array)

  expect(track.mock.lastCall?.[0].map(({ n }) => n)).toEqual([1, 2, 3, 4])

  list.move(one, four)
  notify()
  expect(track.mock.lastCall?.[0].map(({ n }) => n)).toEqual([2, 3, 4, 1])
  expect(track).toBeCalledTimes(2)

  list.move(one, four)
  notify()
  expect(track.mock.lastCall?.[0].map(({ n }) => n)).toEqual([2, 3, 4, 1])
  expect(track).toBeCalledTimes(2)

  list.move(one, null)
  notify()
  expect(track.mock.lastCall?.[0].map(({ n }) => n)).toEqual([1, 2, 3, 4])
})

test('should respect node keys even if it is an atom', () => {
  const list = reatomLinkedList({
    create: (id: string) => ({ id: atom(id) }),
    key: 'id',
    initState: [{ id: atom('1') }, { id: atom('2') }],
  })
  const track = subscribe(computed(() => [...list.map().keys()]))

  expect(track.mock.lastCall?.[0]).toEqual(['1', '2'])

  list.map().get('1')?.id.set('0')
  notify()
  expect(track.mock.lastCall?.[0]).toEqual(['0', '2'])
})

test('should correctly handle batching and cause tracking', () => {
  const callCause = vi.fn(() =>
    isCausedBy(list.create)
      ? 'create'
      : isCausedBy(list.batch)
        ? 'batch'
        : 'unknown',
  )

  const list = reatomLinkedList(() => ({})).extend(withChangeHook(callCause))

  list.create()
  notify()
  expect(callCause).toReturnWith('create')

  list.batch(() => {
    list.create()
    list.create()
  })

  notify()
  expect(callCause).toReturnWith('batch')
})

test('should remove a single node', () => {
  const list = reatomLinkedList((n: number) => ({ n }))

  const node = list.create(1)
  notify()
  expect(list.array()).toEqual([{ n: 1, [LL_PREV]: null, [LL_NEXT]: null }])
  expect(list().size).toBe(1)

  list.remove(node)
  notify()
  expect(list.array()).toEqual([])
  expect(list().size).toBe(0)

  list.remove(node)
  notify()
  expect(list.array()).toEqual([])
  expect(list().size).toBe(0)
})

test('should respect initSnapshot for initializing', () => {
  const list = reatomLinkedList({
    create: (id: string) => ({ id: atom(id) }),
    key: 'id',
    initSnapshot: [['1'], ['2']],
  })
  const track = subscribe(computed(() => [...list.map().keys()]))

  expect(track.mock.lastCall?.[0]).toEqual(['1', '2'])

  list.map().get('1')?.id.set('0')
  notify()
  expect(track.mock.lastCall?.[0]).toEqual(['0', '2'])
})

test('should accept array as initState', () => {
  const list = reatomLinkedList([atom(1), atom(2)])

  expect(list.array().every(isAtom)).toBeTruthy()

  list.create(atom(3))
  notify()
  expect(list.array().every(isAtom)).toBeTruthy()
  expect(list.array().length).toBe(3)
})

test('should accept only initState and key optionally', () => {
  const list = reatomLinkedList({
    initState: [{ id: atom('1') }, { id: atom('2') }],
    key: 'id',
  })

  const keys = computed(() => [...list.map().keys()])
  const track = subscribe(keys)

  expect(track).toBeCalledWith(['1', '2'])
  expect(isConnected(list.map().get('1')!.id)).toBe(true)

  list.map().get('1')!.id.set('0')
  notify()
  expect(deatomize(list)).toStrictEqual([{ id: '0' }, { id: '2' }])
  expect(keys()).toStrictEqual(['0', '2'])
  expect(track).toBeCalledWith(['0', '2'])
})

test('should maintain linked list integrity after moves', () => {
  const validateIntegrity = <
    T extends { [LL_PREV]: unknown; [LL_NEXT]: unknown },
  >(
    head: T | null,
  ) => {
    let prev = null
    let current = head
    while (current) {
      if (current[LL_PREV] !== prev) {
        throw new Error(
          'Linked list integrity violation: incorrect LL_PREV pointer',
        )
      }
      prev = current
      current = current[LL_NEXT] as T | null
    }
  }

  const list = reatomLinkedList((n: number) => ({ n }))

  const one = list.create(1)
  const two = list.create(2)
  const three = list.create(3)
  const four = list.create(4)
  notify()

  validateIntegrity(list().head)
  expect(list.array().map(({ n }) => n)).toEqual([1, 2, 3, 4])

  list.move(one, two)
  notify()
  validateIntegrity(list().head)
  expect(list.array().map(({ n }) => n)).toEqual([2, 1, 3, 4])

  list.move(four, null)
  notify()
  validateIntegrity(list().head)
  expect(list.array().map(({ n }) => n)).toEqual([4, 2, 1, 3])

  list.move(one, three)
  notify()
  validateIntegrity(list().head)
  expect(list.array().map(({ n }) => n)).toEqual([4, 2, 3, 1])

  list.move(four, one)
  notify()
  validateIntegrity(list().head)
  expect(list.array().map(({ n }) => n)).toEqual([2, 3, 1, 4])

  list.move(one, null)
  list.move(two, one)
  list.move(three, two)
  list.move(four, three)
  notify()
  validateIntegrity(list().head)
  expect(list.array().map(({ n }) => n)).toEqual([1, 2, 3, 4])
})

test('should maintain linked list integrity after swaps', () => {
  const validateIntegrity = <
    T extends { [LL_PREV]: unknown; [LL_NEXT]: unknown },
  >(
    head: T | null,
  ) => {
    let prev = null
    let current = head
    while (current) {
      if (current[LL_PREV] !== prev) {
        throw new Error(
          'Linked list integrity violation: incorrect LL_PREV pointer',
        )
      }
      prev = current
      current = current[LL_NEXT] as T | null
    }
  }

  const list = reatomLinkedList((n: number) => ({ n }))

  const one = list.create(1)
  const two = list.create(2)
  const three = list.create(3)
  const four = list.create(4)
  notify()

  validateIntegrity(list().head)
  expect(list.array().map(({ n }) => n)).toEqual([1, 2, 3, 4])

  list.swap(one, two)
  notify()
  validateIntegrity(list().head)
  expect(list.array().map(({ n }) => n)).toEqual([2, 1, 3, 4])

  list.swap(one, two)
  notify()
  validateIntegrity(list().head)
  expect(list.array().map(({ n }) => n)).toEqual([1, 2, 3, 4])

  list.swap(one, three)
  notify()
  validateIntegrity(list().head)
  expect(list.array().map(({ n }) => n)).toEqual([3, 2, 1, 4])

  list.swap(one, four)
  notify()
  validateIntegrity(list().head)
  expect(list.array().map(({ n }) => n)).toEqual([3, 2, 4, 1])

  list.swap(three, one)
  notify()
  validateIntegrity(list().head)
  expect(list.array().map(({ n }) => n)).toEqual([1, 2, 4, 3])

  list.swap(four, two)
  notify()
  validateIntegrity(list().head)
  expect(list.array().map(({ n }) => n)).toEqual([1, 4, 2, 3])
})

test('should create many items at once', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  const track = subscribe(list.array)

  const nodes = list.createMany([[1], [2], [3], [4]])
  notify()

  expect(nodes.length).toBe(4)
  expect(track.mock.lastCall?.[0].map(({ n }) => n)).toEqual([1, 2, 3, 4])
  expect(list().size).toBe(4)
  expect(list().changes.length).toBe(1)
  expect(list().changes[0]!.kind).toBe('createMany')
  const change = list().changes[0] as {
    kind: 'createMany'
    nodes: typeof nodes
  }
  expect(change.nodes).toEqual(nodes)
})

test('should remove many items at once', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  const track = subscribe(list.array)

  const nodes = list.createMany([[1], [2], [3], [4]])
  notify()
  expect(track.mock.lastCall?.[0].map(({ n }) => n)).toEqual([1, 2, 3, 4])

  const removedCount = list.removeMany([nodes[1]!, nodes[3]!])
  notify()

  expect(removedCount).toBe(2)
  expect(track.mock.lastCall?.[0].map(({ n }) => n)).toEqual([1, 3])
  expect(list().size).toBe(2)
  expect(list().changes.length).toBe(1)
  expect(list().changes[0]!.kind).toBe('removeMany')
  const change = list().changes[0] as {
    kind: 'removeMany'
    nodes: typeof nodes
  }
  expect(change.nodes).toEqual([nodes[1], nodes[3]])
})

test('should handle removeMany with already removed nodes', () => {
  const list = reatomLinkedList((n: number) => ({ n }))

  const nodes = list.createMany([[1], [2], [3]])
  notify()

  list.remove(nodes[1]!)
  notify()

  const removedCount = list.removeMany([nodes[0]!, nodes[1]!, nodes[2]!])
  notify()

  expect(removedCount).toBe(2)
  expect(list.array().map(({ n }) => n)).toEqual([])
  expect(list().size).toBe(0)
})

test('should track createMany and removeMany with reatomMap', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  const mapped = list.reatomMap(({ n }) => ({ doubled: n * 2 }))
  const track = subscribe(
    computed(() => mapped.array().map(({ doubled }) => doubled)),
  )

  list.createMany([[1], [2], [3]])
  notify()
  expect(track.mock.lastCall?.[0]).toEqual([2, 4, 6])
  expect(mapped().changes.length).toBe(1)
  expect(mapped().changes[0]!.kind).toBe('createMany')

  const nodes = list.array()
  list.removeMany([nodes[0]!, nodes[2]!])
  notify()
  expect(track.mock.lastCall?.[0]).toEqual([4])
  expect(mapped().changes.length).toBe(1)
  expect(mapped().changes[0]!.kind).toBe('removeMany')
})

test('reatomView: should select a range with static options', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  list.createMany([[1], [2], [3], [4], [5]])
  notify()

  const view = list.reatomView({ offset: 1, limit: 3 })
  const track = subscribe(view.array)

  expect(view().nodes.map(({ n }) => n)).toEqual([2, 3, 4])
  expect(view().offset).toBe(1)
  expect(view().limit).toBe(3)
  expect(view().size).toBe(5)
  expect(track.mock.lastCall?.[0].map(({ n }) => n)).toEqual([2, 3, 4])
})

test('reatomView: should select from the beginning', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  list.createMany([[10], [20], [30], [40]])
  notify()

  const view = list.reatomView({ offset: 0, limit: 2 })

  expect(view().nodes.map(({ n }) => n)).toEqual([10, 20])
  expect(view().offset).toBe(0)
  expect(view().limit).toBe(2)
  expect(view().size).toBe(4)
})

test('reatomView: should select from the end', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  list.createMany([[1], [2], [3], [4], [5]])
  notify()

  const view = list.reatomView({ offset: 3, limit: 10 })

  expect(view().nodes.map(({ n }) => n)).toEqual([4, 5])
  expect(view().offset).toBe(3)
  expect(view().limit).toBe(2)
  expect(view().size).toBe(5)
})

test('reatomView: should handle empty list', () => {
  const list = reatomLinkedList((n: number) => ({ n }))

  const view = list.reatomView({ offset: 0, limit: 10 })

  expect(view().nodes).toEqual([])
  expect(view().offset).toBe(0)
  expect(view().limit).toBe(0)
  expect(view().size).toBe(0)
})

test('reatomView: should clamp offset beyond list size', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  list.createMany([[1], [2], [3]])
  notify()

  const view = list.reatomView({ offset: 100, limit: 5 })

  expect(view().nodes).toEqual([])
  expect(view().offset).toBe(3)
  expect(view().limit).toBe(0)
  expect(view().size).toBe(3)
})

test('reatomView: should handle zero limit', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  list.createMany([[1], [2], [3]])
  notify()

  const view = list.reatomView({ offset: 1, limit: 0 })

  expect(view().nodes).toEqual([])
  expect(view().offset).toBe(1)
  expect(view().limit).toBe(0)
  expect(view().size).toBe(3)
})

test('reatomView: should react to reactive offset and limit', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  list.createMany([[1], [2], [3], [4], [5], [6], [7], [8]])
  notify()

  const offset = atom(0)
  const limit = atom(3)
  const view = list.reatomView(() => ({
    offset: offset(),
    limit: limit(),
  }))
  const track = subscribe(view.array)

  expect(track.mock.lastCall?.[0].map(({ n }) => n)).toEqual([1, 2, 3])

  offset.set(2)
  notify()
  expect(track.mock.lastCall?.[0].map(({ n }) => n)).toEqual([3, 4, 5])

  offset.set(5)
  notify()
  expect(track.mock.lastCall?.[0].map(({ n }) => n)).toEqual([6, 7, 8])

  limit.set(1)
  notify()
  expect(track.mock.lastCall?.[0].map(({ n }) => n)).toEqual([6])

  offset.set(0)
  limit.set(8)
  notify()
  expect(track.mock.lastCall?.[0].map(({ n }) => n)).toEqual([
    1, 2, 3, 4, 5, 6, 7, 8,
  ])
})

test('reatomView: should update when items are added to the list', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  list.createMany([[1], [2], [3]])
  notify()

  const view = list.reatomView({ offset: 0, limit: 5 })
  const track = subscribe(view.array)

  expect(track.mock.lastCall?.[0].map(({ n }) => n)).toEqual([1, 2, 3])
  expect(view().size).toBe(3)

  list.create(4)
  notify()
  expect(track.mock.lastCall?.[0].map(({ n }) => n)).toEqual([1, 2, 3, 4])
  expect(view().size).toBe(4)

  list.create(5)
  notify()
  expect(track.mock.lastCall?.[0].map(({ n }) => n)).toEqual([1, 2, 3, 4, 5])
  expect(view().size).toBe(5)

  list.create(6)
  notify()
  expect(track.mock.lastCall?.[0].map(({ n }) => n)).toEqual([1, 2, 3, 4, 5])
  expect(view().size).toBe(6)
  expect(view().limit).toBe(5)
})

test('reatomView: should update when items are removed from view', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  const nodes = list.createMany([[1], [2], [3], [4], [5]])
  notify()

  const view = list.reatomView({ offset: 1, limit: 3 })
  const track = subscribe(view.array)

  expect(track.mock.lastCall?.[0].map(({ n }) => n)).toEqual([2, 3, 4])

  list.remove(nodes[2]!)
  notify()
  expect(track.mock.lastCall?.[0].map(({ n }) => n)).toEqual([2, 4, 5])
  expect(view().size).toBe(4)
})

test('reatomView: should update when items are removed before view', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  const nodes = list.createMany([[1], [2], [3], [4], [5]])
  notify()

  const view = list.reatomView({ offset: 2, limit: 2 })
  const track = subscribe(view.array)

  expect(track.mock.lastCall?.[0].map(({ n }) => n)).toEqual([3, 4])

  list.remove(nodes[0]!)
  notify()
  // list is now [2,3,4,5], offset=2 yields [4,5]
  expect(track.mock.lastCall?.[0].map(({ n }) => n)).toEqual([4, 5])
  expect(view().size).toBe(4)
})

test('reatomView: should handle swap within view', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  const nodes = list.createMany([[1], [2], [3], [4], [5]])
  notify()

  const view = list.reatomView({ offset: 1, limit: 3 })
  const track = subscribe(view.array)

  expect(track.mock.lastCall?.[0].map(({ n }) => n)).toEqual([2, 3, 4])

  list.swap(nodes[1]!, nodes[3]!)
  notify()
  expect(track.mock.lastCall?.[0].map(({ n }) => n)).toEqual([4, 3, 2])
})

test('reatomView: should handle move operations', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  const nodes = list.createMany([[1], [2], [3], [4], [5]])
  notify()

  const view = list.reatomView({ offset: 0, limit: 3 })
  const track = subscribe(view.array)

  expect(track.mock.lastCall?.[0].map(({ n }) => n)).toEqual([1, 2, 3])

  list.move(nodes[4]!, null)
  notify()
  expect(track.mock.lastCall?.[0].map(({ n }) => n)).toEqual([5, 1, 2])
})

test('reatomView: should handle clear', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  list.createMany([[1], [2], [3]])
  notify()

  const view = list.reatomView({ offset: 0, limit: 10 })
  const track = subscribe(view.array)

  expect(track.mock.lastCall?.[0].map(({ n }) => n)).toEqual([1, 2, 3])

  list.clear()
  notify()
  expect(track.mock.lastCall?.[0]).toEqual([])
  expect(view().size).toBe(0)
})

test('reatomView: should memoize when nothing changes', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  list.createMany([[1], [2], [3], [4], [5]])
  notify()

  const view = list.reatomView({ offset: 1, limit: 2 })
  const track = subscribe(view)

  const firstState = view()

  notify()

  const secondState = view()
  expect(firstState).toBe(secondState)
  expect(track).toBeCalledTimes(1)
})

test('reatomView: should preserve nodes array reference when only size changes', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  list.createMany([[1], [2], [3]])
  notify()

  const view = list.reatomView({ offset: 0, limit: 2 })
  const arrayTrack = subscribe(view.array)
  notify()

  const nodesBeforeAdd = view().nodes

  list.create(99)
  notify()

  const nodesAfterAdd = view().nodes
  expect(nodesBeforeAdd).toBe(nodesAfterAdd)
  expect(view().size).toBe(4)
  expect(arrayTrack).toBeCalledTimes(1)
})

test('reatomView: should support multiple views on the same list', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  list.createMany([[1], [2], [3], [4], [5], [6]])
  notify()

  const viewA = list.reatomView({ offset: 0, limit: 3 })
  const viewB = list.reatomView({ offset: 3, limit: 3 })

  expect(viewA().nodes.map(({ n }) => n)).toEqual([1, 2, 3])
  expect(viewB().nodes.map(({ n }) => n)).toEqual([4, 5, 6])
})

test('reatomView: should work with anchor optimization for scrolling', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  const items = Array.from({ length: 100 }, (_, i) => [i + 1] as [number])
  list.createMany(items)
  notify()

  const offset = atom(0)
  const view = list.reatomView(() => ({ offset: offset(), limit: 10 }))
  const track = subscribe(view.array)

  expect(track.mock.lastCall?.[0].map(({ n }) => n)).toEqual([
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  ])

  offset.set(5)
  notify()
  expect(track.mock.lastCall?.[0].map(({ n }) => n)).toEqual([
    6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
  ])

  offset.set(3)
  notify()
  expect(track.mock.lastCall?.[0].map(({ n }) => n)).toEqual([
    4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
  ])

  offset.set(90)
  notify()
  expect(track.mock.lastCall?.[0].map(({ n }) => n)).toEqual([
    91, 92, 93, 94, 95, 96, 97, 98, 99, 100,
  ])

  offset.set(95)
  notify()
  expect(track.mock.lastCall?.[0].map(({ n }) => n)).toEqual([
    96, 97, 98, 99, 100,
  ])
  expect(view().limit).toBe(5)
})

test('reatomView: should handle createMany and removeMany correctly', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  list.createMany([[1], [2], [3]])
  notify()

  const view = list.reatomView({ offset: 0, limit: 5 })
  const track = subscribe(view.array)

  expect(track.mock.lastCall?.[0].map(({ n }) => n)).toEqual([1, 2, 3])

  list.createMany([[4], [5], [6], [7]])
  notify()
  expect(track.mock.lastCall?.[0].map(({ n }) => n)).toEqual([1, 2, 3, 4, 5])
  expect(view().size).toBe(7)

  const nodes = list.array()
  list.removeMany([nodes[1]!, nodes[3]!])
  notify()
  expect(track.mock.lastCall?.[0].map(({ n }) => n)).toEqual([1, 3, 5, 6, 7])
  expect(view().size).toBe(5)
})

test('reatomView: should traverse from tail for large offsets', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  const items = Array.from({ length: 20 }, (_, i) => [i + 1] as [number])
  list.createMany(items)
  notify()

  const view = list.reatomView({ offset: 17, limit: 3 })

  expect(view().nodes.map(({ n }) => n)).toEqual([18, 19, 20])
  expect(view().offset).toBe(17)
  expect(view().limit).toBe(3)
})

test('reatomView: should work with initState', () => {
  const list = reatomLinkedList({
    create: (n: number) => ({ n }),
    initState: [{ n: 10 }, { n: 20 }, { n: 30 }, { n: 40 }],
  })

  const view = list.reatomView({ offset: 1, limit: 2 })

  expect(view().nodes.map(({ n }) => n)).toEqual([20, 30])
  expect(view().size).toBe(4)
})

test('reatomView: should invalidate anchor after list mutation and recover', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  list.createMany([[1], [2], [3], [4], [5], [6], [7], [8], [9], [10]])
  notify()

  const offset = atom(3)
  const view = list.reatomView(() => ({ offset: offset(), limit: 3 }))
  const track = subscribe(view.array)

  expect(track.mock.lastCall?.[0].map(({ n }) => n)).toEqual([4, 5, 6])

  offset.set(5)
  notify()
  expect(track.mock.lastCall?.[0].map(({ n }) => n)).toEqual([6, 7, 8])

  list.create(11)
  notify()
  expect(track.mock.lastCall?.[0].map(({ n }) => n)).toEqual([6, 7, 8])
  expect(view().size).toBe(11)

  offset.set(6)
  notify()
  expect(track.mock.lastCall?.[0].map(({ n }) => n)).toEqual([7, 8, 9])
})

test('reatomView: should work with negative-clamped offset', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  list.createMany([[1], [2], [3]])
  notify()

  const view = list.reatomView({ offset: -5, limit: 2 })

  expect(view().nodes.map(({ n }) => n)).toEqual([1, 2])
  expect(view().offset).toBe(0)
})
