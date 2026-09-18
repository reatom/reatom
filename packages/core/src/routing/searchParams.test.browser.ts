import { beforeEach, expect, test, vi } from 'test'

import { atom } from '../core/atom'
import { wrap } from '../methods'
import { reatomBoolean } from '../primitives/reatomBoolean'
import { sleep } from '../utils'
import { urlAtom } from '../web/url'
import { searchParamsAtom, withSearchParams } from './searchParams'

beforeEach(() => {
  urlAtom.routes = {}
  if (window.location.pathname !== '/') {
    window.history.replaceState({}, '', '/')
  }
})

test('syncFromSource', async () => {
  history.replaceState({}, '', '/?test1=1')

  const syncMock = urlAtom.sync.set(() => vi.fn())

  expect([...urlAtom().searchParams.keys()]).toEqual(['test1'])
  expect(Object.keys(searchParamsAtom())).toEqual(['test1'])

  expect(syncMock).toHaveBeenCalledTimes(0)

  searchParamsAtom.set('test2', '1')

  expect(syncMock).toHaveBeenCalledTimes(1)
  expect(Object.keys(searchParamsAtom())).toEqual(['test1', 'test2'])
  expect(urlAtom().search).contains('test1=1')

  const url = new URL(urlAtom().href)
  url.searchParams.set('test', '2')
  urlAtom.syncFromSource(url)

  expect(syncMock).toHaveBeenCalledTimes(1)
  expect(urlAtom().search).toContain('test=2')

  searchParamsAtom.set('test', '3')

  await wrap(sleep())

  expect(syncMock).toHaveBeenCalledTimes(2)
  expect(urlAtom().search).toContain('test=3')
})

test('lens path', async () => {
  const testAtom = searchParamsAtom.lens('test', {
    parse: (value = '1') => Number(value),
    path: '/results',
  })

  testAtom.subscribe()

  urlAtom.go('/results?test=2')

  await wrap(sleep())

  expect(testAtom()).toBe(2)

  testAtom.set((state) => state + 1)

  await wrap(sleep())

  expect(urlAtom().search).toBe('?test=3')

  urlAtom.go('/results/some')

  await wrap(sleep())

  expect(testAtom()).toBe(1)

  testAtom.set((state) => state + 1)

  await wrap(sleep())

  expect(testAtom()).toBe(2)
  expect(urlAtom().pathname).toBe('/results/some')

  expect(urlAtom().search).toBe('')

  urlAtom.go('/results')

  await wrap(sleep())

  expect(urlAtom().pathname).toBe('/results')
})

test('lens path wildcard', async () => {
  const testAtom = atom(1).extend(
    withSearchParams('test', {
      parse: (value = '1') => Number(value),
      path: '/results/*',
    }),
  )

  testAtom.subscribe()

  urlAtom.go('/results')

  await wrap(sleep())

  expect(urlAtom().pathname).toBe('/results')

  testAtom.set(2)

  await wrap(sleep())

  expect(urlAtom().search).toBe('?test=2')

  urlAtom.go('/results/some')

  await wrap(sleep())

  expect(urlAtom().pathname).toBe('/results/some')
  expect(urlAtom().search).toBe('?test=2')

  testAtom.set(3)

  await wrap(sleep())

  expect(urlAtom().search).toBe('?test=3')

  urlAtom.go('/some')

  await wrap(sleep())

  expect(testAtom()).toBe(1)
  expect(urlAtom().pathname).toBe('/some')

  urlAtom.go('/results')

  await wrap(sleep())

  expect(urlAtom().pathname).toBe('/results')

  testAtom.set(2)

  await wrap(sleep())

  expect(urlAtom().search).toBe('?test=2')
})

test('search reset', async () => {
  const testAtom = atom<number | undefined>(undefined).extend(
    withSearchParams('test', {
      parse: (value) => (value === undefined ? undefined : Number(value)),
      serialize: (value) =>
        value === undefined ? undefined : value.toString(),
    }),
  )

  testAtom.subscribe()

  urlAtom.go('/results?test=2')

  await wrap(sleep())

  expect(testAtom()).toBe(2)

  testAtom.set(undefined)

  await wrap(sleep())

  expect(urlAtom().search).toBe('')
  expect(urlAtom().pathname).toBe('/results')
})

test('back navigation with omitted false search param', async () => {
  history.replaceState({}, '', '/')

  const open = reatomBoolean(false, 'open').extend(
    withSearchParams('open', {
      parse: (raw) => (raw ? Boolean(Number(raw)) : false),
      serialize: (state) => (state ? '1' : undefined),
    }),
  )

  open.subscribe()

  await wrap(sleep())

  expect(open()).toBe(false)
  expect(urlAtom().search).toBe('')

  open.setTrue()

  await wrap(sleep())

  expect(open()).toBe(true)
  expect(urlAtom().search).toBe('?open=1')

  history.back()

  await wrap(sleep())

  expect(open()).toBe(false)
  expect(urlAtom().search).toBe('')
})

test('inactive subpath should not affect mutated atoms', async () => {
  urlAtom.go('/some?test=10')

  const testAtom = atom(1).extend(
    withSearchParams('test', {
      parse: (value = '1') => Number(value),
      path: '/some',
    }),
  )

  testAtom.subscribe()
  await wrap(sleep())
  expect(testAtom()).toBe(10)

  urlAtom.go('/other?test=2')
  await wrap(sleep())
  expect(testAtom()).toBe(1)
  expect(urlAtom().pathname).toBe('/other')
  expect(urlAtom().search).toBe('?test=2')

  testAtom.set(123)
  await wrap(sleep())
  expect(testAtom()).toBe(123)
  expect(urlAtom().pathname).toBe('/other')
  expect(urlAtom().search).toBe('?test=2')

  urlAtom.go('/other?test=3')
  await wrap(sleep())
  expect(testAtom()).toBe(123)
  expect(urlAtom().pathname).toBe('/other')
  expect(urlAtom().search).toBe('?test=3')
})
