import { atom, computed, isAtom } from '../core'
import { describe, test, expect, subscribe, vi } from 'test'
import { LL_NEXT, LL_PREV, reatomLinkedList } from './reatomLinkedList'
import { parseAtoms } from './parseAtoms'
import { withChangeHook } from '../mixins'
import { isCausedBy, notify } from '../methods'

test('should respect initState, create and remove elements properly', () => {
  const list = reatomLinkedList({
    create: (n: number) => atom(n),
    initState: [atom(1), atom(2)],
  })

  const last = list.create(3)
  expect(list.array().map((v) => v())).toEqual([1, 2, 3])
  list.remove(last)
  expect(parseAtoms(list.array)).toEqual([1, 2])

  list.remove(last)
  expect(parseAtoms(list.array)).toEqual([1, 2])

  list.remove(list.find((n) => n() === 1)!)
  expect(parseAtoms(list.array)).toEqual([2])

  list.remove(list.find((n) => n() === 2)!)
  expect(parseAtoms(list.array)).toEqual([])

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
  expect(parseAtoms(list.array)).toEqual([])
})

test('should move elements', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  const one = list.create(1)
  const two = list.create(2)
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

  list.map().get('1')?.id('0')
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

  const list = reatomLinkedList(() => ({})).mix(withChangeHook(callCause))

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

  list.map().get('1')?.id('0')
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

  const track = subscribe(atom(() => [...list.map().keys()]))

  expect(track.mock.lastCall?.[0]).toStrictEqual(['1', '2'])

  list.map().get('1')?.id('0')
  notify()
  expect(track.mock.lastCall?.[0]).toStrictEqual(['0', '2'])
})