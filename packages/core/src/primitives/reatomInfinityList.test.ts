import { expect, subscribe, test, vi } from 'test'

import { atom, computed, notify } from '../core'
import { wrap } from '../methods'
import { sleep } from '../utils'
import { reatomLinkedList } from './reatomLinkedList'
import { reatomInfinityList } from './reatomInfinityList'

test('basic viewport state without fetcher', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  list.createMany([[1], [2], [3], [4], [5], [6], [7], [8], [9], [10]])
  notify()

  const inf = reatomInfinityList(list, { limit: 4 })

  expect(inf.items().map(({ n }) => n)).toEqual([1, 2, 3, 4])
  expect(inf.totalSize()).toBe(10)
  expect(inf.topCount()).toBe(0)
  expect(inf.bottomCount()).toBe(6)
  expect(inf.hasMore()).toBe(true)
  expect(inf.isEnd()).toBe(false)
})

test('viewport shifts on offset change', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  list.createMany([[1], [2], [3], [4], [5], [6], [7], [8], [9], [10]])
  notify()

  const inf = reatomInfinityList(list, { limit: 4 })

  inf.offset.set(3)
  expect(inf.items().map(({ n }) => n)).toEqual([4, 5, 6, 7])
  expect(inf.topCount()).toBe(3)
  expect(inf.bottomCount()).toBe(3)

  inf.offset.set(7)
  expect(inf.items().map(({ n }) => n)).toEqual([8, 9, 10])
  expect(inf.topCount()).toBe(7)
  expect(inf.bottomCount()).toBe(0)
})

test('viewport reacts to limit change', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  list.createMany([[1], [2], [3], [4], [5], [6], [7], [8], [9], [10]])
  notify()

  const inf = reatomInfinityList(list, { limit: 3 })

  expect(inf.items().map(({ n }) => n)).toEqual([1, 2, 3])
  expect(inf.bottomCount()).toBe(7)

  inf.limit.set(5)
  expect(inf.items().map(({ n }) => n)).toEqual([1, 2, 3, 4, 5])
  expect(inf.bottomCount()).toBe(5)
})

test('counts update when list is modified externally', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  list.createMany([[1], [2], [3], [4], [5]])
  notify()

  const inf = reatomInfinityList(list, { limit: 3 })

  inf.offset.set(1)
  expect(inf.topCount()).toBe(1)
  expect(inf.bottomCount()).toBe(1)
  expect(inf.totalSize()).toBe(5)

  list.create(6)
  notify()

  expect(inf.totalSize()).toBe(6)
  expect(inf.topCount()).toBe(1)
  expect(inf.bottomCount()).toBe(2)
})

test('isEnd when hasMore is false and viewport at list end', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  list.createMany([[1], [2], [3], [4], [5]])
  notify()

  const inf = reatomInfinityList(list, { limit: 3 })

  inf.hasMore.set(false)
  expect(inf.isEnd()).toBe(false)

  inf.offset.set(2)
  expect(inf.items().map(({ n }) => n)).toEqual([3, 4, 5])
  expect(inf.isEnd()).toBe(true)

  inf.offset.set(0)
  expect(inf.isEnd()).toBe(false)
})

test('empty list state', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  const inf = reatomInfinityList(list, { limit: 10 })

  expect(inf.items()).toEqual([])
  expect(inf.totalSize()).toBe(0)
  expect(inf.topCount()).toBe(0)
  expect(inf.bottomCount()).toBe(0)
  expect(inf.hasMore()).toBe(true)
  expect(inf.isEnd()).toBe(false)
})

test('loadMore fetches and appends items', async () => {
  type Item = { id: number }
  const serverItems: Item[] = Array.from({ length: 50 }, (_, i) => ({
    id: i,
  }))
  const PAGE_SIZE = 10

  const list = reatomLinkedList((item: Item) => item)
  const inf = reatomInfinityList(list, {
    limit: PAGE_SIZE,
    fetcher: async (offset, limit) => {
      const page = serverItems.slice(offset, offset + limit)
      return page.map((item) => [item] as [Item])
    },
  })

  expect(inf.items()).toEqual([])
  expect(inf.isLoading()).toBe(false)

  const loadPromise = inf.loadMore()
  expect(inf.isLoading()).toBe(true)

  await wrap(loadPromise)

  expect(inf.isLoading()).toBe(false)
  expect(inf.totalSize()).toBe(10)
  expect(inf.items().length).toBe(10)
  expect(inf.items()[0]!.id).toBe(0)
  expect(inf.items()[9]!.id).toBe(9)
  expect(inf.hasMore()).toBe(true)
})

test('loadMore sets hasMore to false on partial page', async () => {
  type Item = { id: number }
  const serverItems: Item[] = Array.from({ length: 5 }, (_, i) => ({
    id: i,
  }))

  const list = reatomLinkedList((item: Item) => item)
  const inf = reatomInfinityList(list, {
    limit: 10,
    fetcher: async (offset, limit) => {
      const page = serverItems.slice(offset, offset + limit)
      return page.map((item) => [item] as [Item])
    },
  })

  await wrap(inf.loadMore())

  expect(inf.totalSize()).toBe(5)
  expect(inf.hasMore()).toBe(false)
})

test('loadMore skips when hasMore is false', async () => {
  const fetcherSpy = vi.fn(async () => [] as Array<[{ id: number }]>)

  const list = reatomLinkedList((item: { id: number }) => item)
  const inf = reatomInfinityList(list, {
    limit: 10,
    fetcher: fetcherSpy,
  })

  inf.hasMore.set(false)
  await wrap(inf.loadMore())

  expect(fetcherSpy).not.toHaveBeenCalled()
})

test('multiple loadMore calls accumulate data', async () => {
  type Item = { id: number }
  const serverItems: Item[] = Array.from({ length: 25 }, (_, i) => ({
    id: i,
  }))

  const list = reatomLinkedList((item: Item) => item)
  const inf = reatomInfinityList(list, {
    limit: 10,
    fetcher: async (offset, limit) => {
      const page = serverItems.slice(offset, offset + limit)
      return page.map((item) => [item] as [Item])
    },
  })

  await wrap(inf.loadMore())
  expect(inf.totalSize()).toBe(10)
  expect(inf.hasMore()).toBe(true)

  await wrap(inf.loadMore())
  expect(inf.totalSize()).toBe(20)
  expect(inf.hasMore()).toBe(true)

  await wrap(inf.loadMore())
  expect(inf.totalSize()).toBe(25)
  expect(inf.hasMore()).toBe(false)
})

test('padding counts for virtual scroll', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  list.createMany(
    Array.from({ length: 100 }, (_, i) => [i + 1] as [number]),
  )
  notify()

  const VIEWPORT_SIZE = 20
  const inf = reatomInfinityList(list, { limit: VIEWPORT_SIZE })

  const ESTIMATED_ITEM_HEIGHT = 50

  inf.offset.set(0)
  const topPaddingAtStart = inf.topCount() * ESTIMATED_ITEM_HEIGHT
  const bottomPaddingAtStart = inf.bottomCount() * ESTIMATED_ITEM_HEIGHT
  expect(topPaddingAtStart).toBe(0)
  expect(bottomPaddingAtStart).toBe(80 * ESTIMATED_ITEM_HEIGHT)

  inf.offset.set(40)
  const topPaddingMiddle = inf.topCount() * ESTIMATED_ITEM_HEIGHT
  const bottomPaddingMiddle = inf.bottomCount() * ESTIMATED_ITEM_HEIGHT
  expect(topPaddingMiddle).toBe(40 * ESTIMATED_ITEM_HEIGHT)
  expect(bottomPaddingMiddle).toBe(40 * ESTIMATED_ITEM_HEIGHT)

  inf.offset.set(80)
  const topPaddingEnd = inf.topCount() * ESTIMATED_ITEM_HEIGHT
  const bottomPaddingEnd = inf.bottomCount() * ESTIMATED_ITEM_HEIGHT
  expect(topPaddingEnd).toBe(80 * ESTIMATED_ITEM_HEIGHT)
  expect(bottomPaddingEnd).toBe(0)
})

test('near-real infinite scroll model with async fetching', async () => {
  type Item = { id: number; text: string }
  const SERVER_TOTAL = 73
  const serverItems: Item[] = Array.from({ length: SERVER_TOTAL }, (_, i) => ({
    id: i,
    text: `Item ${i}`,
  }))
  const PAGE_SIZE = 20

  const list = reatomLinkedList((item: Item) => item)
  const inf = reatomInfinityList(list, {
    limit: PAGE_SIZE,
    fetcher: async (offset, limit) => {
      await sleep(5)
      const page = serverItems.slice(offset, offset + limit)
      return page.map((item) => [item] as [Item])
    },
  })

  const itemsTrack = subscribe(inf.items)
  const loadingTrack = subscribe(
    computed(() => inf.isLoading()),
  )

  expect(inf.items()).toEqual([])
  expect(inf.totalSize()).toBe(0)
  expect(inf.hasMore()).toBe(true)
  expect(inf.isLoading()).toBe(false)

  // --- Page 1 ---
  const p1 = inf.loadMore()
  expect(inf.isLoading()).toBe(true)
  await wrap(p1)

  expect(inf.isLoading()).toBe(false)
  expect(inf.totalSize()).toBe(20)
  expect(inf.items().length).toBe(20)
  expect(inf.topCount()).toBe(0)
  expect(inf.bottomCount()).toBe(0)

  // --- User scrolls to item 10 ---
  inf.offset.set(10)
  expect(inf.topCount()).toBe(10)
  expect(inf.items().length).toBe(10)
  expect(inf.bottomCount()).toBe(0)

  // --- Near bottom, trigger page 2 ---
  await wrap(inf.loadMore())
  expect(inf.totalSize()).toBe(40)
  expect(inf.items().length).toBe(20)
  expect(inf.topCount()).toBe(10)
  expect(inf.bottomCount()).toBe(10)

  // --- Keep scrolling + loading ---
  inf.offset.set(30)
  await wrap(inf.loadMore())
  expect(inf.totalSize()).toBe(60)
  expect(inf.topCount()).toBe(30)
  expect(inf.bottomCount()).toBe(10)

  // --- Load remaining data ---
  await wrap(inf.loadMore())
  expect(inf.totalSize()).toBe(73)
  expect(inf.hasMore()).toBe(false)

  // --- Scroll to the very end ---
  inf.offset.set(53)
  expect(inf.items().length).toBe(20)
  expect(inf.items()[0]!.id).toBe(53)
  expect(inf.items()[19]!.id).toBe(72)
  expect(inf.topCount()).toBe(53)
  expect(inf.bottomCount()).toBe(0)
  expect(inf.isEnd()).toBe(true)

  // --- Scroll back to top ---
  inf.offset.set(0)
  expect(inf.items()[0]!.id).toBe(0)
  expect(inf.topCount()).toBe(0)
  expect(inf.bottomCount()).toBe(53)
  expect(inf.isEnd()).toBe(false)
})

test('fetcher error is captured via AsyncExt', async () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  const inf = reatomInfinityList(list, {
    limit: 10,
    fetcher: async () => {
      throw new Error('Network failure')
    },
  })

  await wrap(inf.loadMore().catch(() => {}))

  expect(inf.loadMore.error()).instanceOf(Error)
  expect(inf.loadMore.error()?.message).toBe('Network failure')
  expect(inf.isLoading()).toBe(false)
  expect(inf.totalSize()).toBe(0)
  expect(inf.hasMore()).toBe(true)
})

test('items computed only notifies on actual item changes', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  list.createMany([[1], [2], [3], [4], [5]])
  notify()

  const inf = reatomInfinityList(list, { limit: 3 })
  const track = subscribe(inf.items)

  expect(track).toBeCalledTimes(1)

  list.create(6)
  notify()

  expect(track).toBeCalledTimes(1)

  inf.offset.set(1)
  notify()

  expect(track).toBeCalledTimes(2)
  expect(track.mock.lastCall?.[0].map(({ n }) => n)).toEqual([2, 3, 4])
})

test('list clear resets infinite list state', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  list.createMany([[1], [2], [3], [4], [5]])
  notify()

  const inf = reatomInfinityList(list, { limit: 3 })

  inf.offset.set(2)
  expect(inf.topCount()).toBe(2)
  expect(inf.items().length).toBe(3)

  list.clear()
  notify()

  expect(inf.totalSize()).toBe(0)
  expect(inf.items()).toEqual([])
  expect(inf.topCount()).toBe(0)
  expect(inf.bottomCount()).toBe(0)
})

test('default limit is 20', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  const inf = reatomInfinityList(list)

  expect(inf.limit()).toBe(20)
})

test('view atom is accessible for advanced use', () => {
  const list = reatomLinkedList((n: number) => ({ n }))
  list.createMany([[1], [2], [3]])
  notify()

  const inf = reatomInfinityList(list, { limit: 2 })

  const viewState = inf.view()
  expect(viewState.items.map(({ n }) => n)).toEqual([1, 2])
  expect(viewState.totalSize).toBe(3)
  expect(viewState.offset).toBe(0)
  expect(viewState.limit).toBe(2)
})
