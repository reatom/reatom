import { expect, subscribe, test, vi } from 'test'

import { atom, computed, isAtom, isConnected, notify } from '../core'
import { withChangeHook } from '../extensions'
import { deatomize, isCausedBy } from '../methods'
import {
  LL_NEXT,
  LL_PREV,
  reatomLinkedList,
  type LinkedListViewAtom,
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

test('reatomView should return items for a basic view window', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  list.createMany([[1], [2], [3], [4], [5]])
  notify()

  const view = list.reatomView(() => ({ offset: 0, limit: 3 }))

  expect(view().items.map(({ n }) => n)).toEqual([1, 2, 3])
  expect(view().totalSize).toBe(5)
  expect(view().offset).toBe(0)
  expect(view().limit).toBe(3)
})

test('reatomView should react to changes in lens atoms', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  list.createMany([[1], [2], [3], [4], [5]])
  notify()

  const offset = atom(0)
  const limit = atom(2)
  const view = list.reatomView(() => ({ offset: offset(), limit: limit() }))

  expect(view().items.map(({ n }) => n)).toEqual([1, 2])

  offset.set(2)
  expect(view().items.map(({ n }) => n)).toEqual([3, 4])

  limit.set(3)
  expect(view().items.map(({ n }) => n)).toEqual([3, 4, 5])

  offset.set(4)
  expect(view().items.map(({ n }) => n)).toEqual([5])
})

test('reatomView should update when list items are added', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  const view = list.reatomView(() => ({ offset: 0, limit: 3 }))

  expect(view().items).toEqual([])
  expect(view().totalSize).toBe(0)

  list.createMany([[1], [2]])
  notify()

  expect(view().items.map(({ n }) => n)).toEqual([1, 2])
  expect(view().totalSize).toBe(2)

  list.create(3)
  notify()

  expect(view().items.map(({ n }) => n)).toEqual([1, 2, 3])
  expect(view().totalSize).toBe(3)

  list.create(4)
  notify()

  expect(view().items.map(({ n }) => n)).toEqual([1, 2, 3])
  expect(view().totalSize).toBe(4)
})

test('reatomView should update when list items are removed', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  list.createMany([[1], [2], [3], [4], [5]])
  notify()

  const view = list.reatomView(() => ({ offset: 1, limit: 2 }))

  expect(view().items.map(({ n }) => n)).toEqual([2, 3])

  list.remove(list.array()[0]!)
  notify()

  expect(view().items.map(({ n }) => n)).toEqual([3, 4])
  expect(view().totalSize).toBe(4)
})

test('reatomView should memoize items array when content is unchanged', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  list.createMany([[1], [2], [3]])
  notify()

  const view = list.reatomView(() => ({ offset: 0, limit: 2 }))
  const firstItems = view().items

  list.create(4)
  notify()

  expect(view().items).toBe(firstItems)
  expect(view().totalSize).toBe(4)
})

test('reatomView items computed should not notify when items are unchanged', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  list.createMany([[1], [2], [3]])
  notify()

  const view = list.reatomView(() => ({ offset: 0, limit: 2 }))
  const track = subscribe(view.items)

  expect(track).toBeCalledTimes(1)
  expect(track.mock.lastCall?.[0].map(({ n }) => n)).toEqual([1, 2])

  list.create(4)
  notify()

  expect(track).toBeCalledTimes(1)
})

test('reatomView should handle offset beyond list size', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  list.createMany([[1], [2], [3]])
  notify()

  const view = list.reatomView(() => ({ offset: 10, limit: 5 }))

  expect(view().items).toEqual([])
  expect(view().totalSize).toBe(3)
  expect(view().offset).toBe(3)
})

test('reatomView should handle empty list', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  const view = list.reatomView(() => ({ offset: 0, limit: 5 }))

  expect(view().items).toEqual([])
  expect(view().totalSize).toBe(0)
  expect(view().offset).toBe(0)
  expect(view().limit).toBe(5)
})

test('reatomView should handle list clear', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  list.createMany([[1], [2], [3], [4], [5]])
  notify()

  const view = list.reatomView(() => ({ offset: 0, limit: 3 }))

  expect(view().items.map(({ n }) => n)).toEqual([1, 2, 3])

  list.clear()
  notify()

  expect(view().items).toEqual([])
  expect(view().totalSize).toBe(0)
})

test('reatomView should reflect swap within view window', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  list.createMany([[1], [2], [3], [4], [5]])
  notify()

  const view = list.reatomView(() => ({ offset: 0, limit: 3 }))
  const nodes = list.array()

  list.swap(nodes[0]!, nodes[2]!)
  notify()

  expect(view().items.map(({ n }) => n)).toEqual([3, 2, 1])
})

test('reatomView should reflect move within view window', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  list.createMany([[1], [2], [3], [4], [5]])
  notify()

  const view = list.reatomView(() => ({ offset: 0, limit: 3 }))
  const nodes = list.array()

  list.move(nodes[0]!, nodes[2]!)
  notify()

  expect(view().items.map(({ n }) => n)).toEqual([2, 3, 1])
})

test('reatomView should clamp negative offset to 0', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  list.createMany([[1], [2], [3]])
  notify()

  const view = list.reatomView(() => ({ offset: -5, limit: 2 }))

  expect(view().items.map(({ n }) => n)).toEqual([1, 2])
  expect(view().offset).toBe(0)
})

test('reatomView should handle zero limit', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  list.createMany([[1], [2], [3]])
  notify()

  const view = list.reatomView(() => ({ offset: 0, limit: 0 }))

  expect(view().items).toEqual([])
  expect(view().totalSize).toBe(3)
  expect(view().limit).toBe(0)
})

test('reatomView should return full state memoization when nothing changes', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  list.createMany([[1], [2], [3]])
  notify()

  const view = list.reatomView(() => ({ offset: 0, limit: 2 }))

  const state1 = view()
  const state2 = view()

  expect(state1).toBe(state2)
})

test('reatomView should work with removeMany', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  const nodes = list.createMany([[1], [2], [3], [4], [5]])
  notify()

  const view = list.reatomView(() => ({ offset: 1, limit: 3 }))

  expect(view().items.map(({ n }) => n)).toEqual([2, 3, 4])

  list.removeMany([nodes[1]!, nodes[3]!])
  notify()

  expect(view().items.map(({ n }) => n)).toEqual([3, 5])
  expect(view().totalSize).toBe(3)
})

test('reatomView should work with a sliding window pattern', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  list.createMany([[1], [2], [3], [4], [5], [6], [7], [8], [9], [10]])
  notify()

  const pageSize = 3
  const page = atom(0)
  const view = list.reatomView(() => ({
    offset: page() * pageSize,
    limit: pageSize,
  }))

  expect(view().items.map(({ n }) => n)).toEqual([1, 2, 3])
  expect(view().totalSize).toBe(10)

  page.set(1)
  expect(view().items.map(({ n }) => n)).toEqual([4, 5, 6])

  page.set(2)
  expect(view().items.map(({ n }) => n)).toEqual([7, 8, 9])

  page.set(3)
  expect(view().items.map(({ n }) => n)).toEqual([10])

  page.set(4)
  expect(view().items).toEqual([])
  expect(view().offset).toBe(10)
})

test('reatomView items computed should notify only when items change', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  list.createMany([[1], [2], [3], [4], [5]])
  notify()

  const view = list.reatomView(() => ({ offset: 0, limit: 2 }))
  const track = subscribe(view.items)

  expect(track).toBeCalledTimes(1)
  expect(track.mock.lastCall?.[0].map(({ n }) => n)).toEqual([1, 2])

  list.create(6)
  notify()
  expect(track).toBeCalledTimes(1)

  list.remove(list.array()[0]!)
  notify()
  expect(track).toBeCalledTimes(2)
  expect(track.mock.lastCall?.[0].map(({ n }) => n)).toEqual([2, 3])
})

test('reatomView should handle limit larger than list', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  list.createMany([[1], [2]])
  notify()

  const view = list.reatomView(() => ({ offset: 0, limit: 100 }))

  expect(view().items.map(({ n }) => n)).toEqual([1, 2])
  expect(view().totalSize).toBe(2)
  expect(view().limit).toBe(100)
})
