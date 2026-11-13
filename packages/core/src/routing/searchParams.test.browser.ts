import { beforeEach, expect, test, vi } from 'test'

import { action } from '../core'
import { atom } from '../core/atom'
import { wrap } from '../methods'
import { reatomBoolean } from '../primitives/reatomBoolean'
import { sleep } from '../utils'
import { onEvent } from '../web/onEvent'
import { urlAtom } from '../web/url'
import { reatomRoute } from './route'
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

test('batched atom writes update every search param', async () => {
  history.replaceState({}, '', '/?f=24&n=2.8&tier=classic')

  const focal = atom(50, 'focal').extend(
    withSearchParams('f', {
      parse: (value) => (value === undefined ? 50 : Number(value)),
      serialize: (value) => (value === 50 ? undefined : String(value)),
      replace: true,
    }),
  )
  const fNumber = atom(1.4, 'fNumber').extend(
    withSearchParams('n', {
      parse: (value) => (value === undefined ? 1.4 : Number(value)),
      serialize: (value) => (value === 1.4 ? undefined : String(value)),
      replace: true,
    }),
  )
  const tier = atom('modern', 'tier').extend(
    withSearchParams('tier', {
      parse: (value = 'modern') => value,
      serialize: (value) => (value === 'modern' ? undefined : value),
      replace: true,
    }),
  )

  focal.subscribe()
  fNumber.subscribe()
  tier.subscribe()

  await wrap(sleep())

  expect(focal()).toBe(24)
  expect(fNumber()).toBe(2.8)
  expect(tier()).toBe('classic')

  action(() => {
    focal.set(50)
    fNumber.set(1.4)
    tier.set('modern')
  })()

  await wrap(sleep())

  expect(focal()).toBe(50)
  expect(fNumber()).toBe(1.4)
  expect(tier()).toBe('modern')
  expect(urlAtom().search).toBe('')

  action(() => {
    focal.set(85)
    fNumber.set(1.4)
    tier.set('flagship')
  })()

  await wrap(sleep())

  expect(focal()).toBe(85)
  expect(fNumber()).toBe(1.4)
  expect(tier()).toBe('flagship')
  expect(urlAtom().search).toBe('?f=85&tier=flagship')
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
  // `sync` pushes the history entry in a timeout; going back earlier pops
  // whatever entry came before this test
  await wrap(vi.waitFor(() => expect(location.search).toBe('?open=1')))

  const popstate = onEvent(window, 'popstate')
  history.back()
  await wrap(popstate)

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

test('route scope accounts for the base of an ancestor route', async () => {
  const baseRoute = reatomRoute({ path: 'base/path', layout: true })
  const articlesRoute = baseRoute.reatomRoute('articles')

  const queryAtom = atom('', 'query').extend(
    withSearchParams('q', { route: articlesRoute, replace: true }),
  )
  queryAtom.subscribe()

  urlAtom.go('/base/path/articles?q=init')
  await wrap(sleep())
  expect(queryAtom()).toBe('init')

  queryAtom.set('next')
  await wrap(sleep())
  expect(urlAtom().search).toBe('?q=next')

  // nested routes are matched too
  urlAtom.go('/base/path/articles/123')
  await wrap(sleep())
  expect(urlAtom().search).toBe('?q=next')
  expect(queryAtom()).toBe('next')

  // out of the route scope the param is reset and not synced
  urlAtom.go('/base/path/about')
  await wrap(sleep())
  expect(queryAtom()).toBe('')

  queryAtom.set('other')
  await wrap(sleep())
  expect(queryAtom()).toBe('other')
  expect(urlAtom().search).toBe('')

  // a literal path doesn't know about the base
  const literalAtom = atom('', 'literal').extend(
    withSearchParams('lq', { path: '/articles/*' }),
  )
  literalAtom.subscribe()
  urlAtom.go('/base/path/articles?lq=1')
  await wrap(sleep())
  expect(literalAtom()).toBe('')
})

test('route scope with path params', async () => {
  const userRoute = reatomRoute('users/:userId')

  const tabAtom = atom('info', 'tab').extend(
    withSearchParams('tab', { route: userRoute }),
  )
  tabAtom.subscribe()

  urlAtom.go('/users/1?tab=posts')
  await wrap(sleep())
  expect(tabAtom()).toBe('posts')

  tabAtom.set('likes')
  await wrap(sleep())
  expect(urlAtom().search).toBe('?tab=likes')

  urlAtom.go('/users')
  await wrap(sleep())
  expect(tabAtom()).toBe('info')

  tabAtom.set('likes')
  await wrap(sleep())
  expect(urlAtom().search).toBe('')

  urlAtom.go('/users/2?tab=posts')
  await wrap(sleep())
  expect(tabAtom()).toBe('posts')
})

test('lens with a route', async () => {
  const articlesRoute = reatomRoute('articles')
  const pageAtom = searchParamsAtom.lens('page', {
    parse: (value = '1') => Number(value),
    route: articlesRoute,
  })
  pageAtom.subscribe()

  urlAtom.go('/articles?page=3')
  await wrap(sleep())
  expect(pageAtom()).toBe(3)

  urlAtom.go('/other?page=5')
  await wrap(sleep())
  expect(pageAtom()).toBe(1)
})

test('route and path scopes are mutually exclusive', () => {
  const articlesRoute = reatomRoute('articles')

  expect(() =>
    withSearchParams('q', { route: articlesRoute, path: '/articles' }),
  ).toThrow('mutually exclusive')
})
