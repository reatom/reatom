import { test, expect, vi } from 'test'
import { atom } from '../core/atom'
import { searchParamsAtom, urlAtom, withSearchParamsPersist } from './url'
import { sleep } from '../utils'
import { wrap } from '../methods'

test('syncFromSource', async () => {
  const syncMock = urlAtom.sync(() => vi.fn())

  expect(urlAtom().search).toBe('')

  expect(syncMock).toHaveBeenCalledTimes(0)

  searchParamsAtom.set('test', '1')

  expect(syncMock).toHaveBeenCalledTimes(1)
  expect(urlAtom().search).toBe('?test=1')

  const url = new URL(urlAtom().href)
  url.searchParams.set('test', '2')
  urlAtom.syncFromSource(url)

  expect(syncMock).toHaveBeenCalledTimes(1)
  expect(urlAtom().search).toBe('?test=2')

  searchParamsAtom.set('test', '3')

  await wrap(sleep())

  expect(syncMock).toHaveBeenCalledTimes(2)
  expect(urlAtom().search).toBe('?test=3')
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

  testAtom((state) => state + 1)

  await wrap(sleep())

  expect(urlAtom().search).toBe('?test=3')

  urlAtom.go('/results/some')

  await wrap(sleep())

  expect(testAtom()).toBe(1)

  testAtom((state) => state + 1)

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
    withSearchParamsPersist('test', {
      parse: (value = '1') => Number(value),
      path: '/results/*',
    }),
  )

  testAtom.subscribe()

  urlAtom.go('/results')

  await wrap(sleep())

  expect(urlAtom().pathname).toBe('/results')

  testAtom(2)

  await wrap(sleep())

  expect(urlAtom().search).toBe('?test=2')

  urlAtom.go('/results/some')

  await wrap(sleep())

  expect(urlAtom().pathname).toBe('/results/some')
  expect(urlAtom().search).toBe('?test=2')

  testAtom(3)

  await wrap(sleep())

  expect(urlAtom().search).toBe('?test=3')

  urlAtom.go('/some')

  await wrap(sleep())

  expect(testAtom()).toBe(1)
  expect(urlAtom().pathname).toBe('/some')

  urlAtom.go('/results')

  await wrap(sleep())

  expect(urlAtom().pathname).toBe('/results')

  testAtom(2)

  await wrap(sleep())

  expect(urlAtom().search).toBe('?test=2')
})

test('search reset', async () => {
  const testAtom = atom<number | undefined>(undefined).extend(
    withSearchParamsPersist('test', {
      parse: (value) => (value === undefined ? undefined : Number(value)),
      serialize: (value) =>
        value === undefined ? undefined : value.toString(),
    }),
  )

  testAtom.subscribe()

  urlAtom.go('/results?test=2')

  await wrap(sleep())

  expect(testAtom()).toBe(2)

  testAtom(undefined)

  await wrap(sleep())

  expect(urlAtom().search).toBe('')
  expect(urlAtom().pathname).toBe('/results')
})

test('inactive subpath should not affect mutated atoms', async () => {
  urlAtom.go('/some?test=10')

  const testAtom = atom(1).extend(
    withSearchParamsPersist('test', {
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

  testAtom(123)
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

test('urlAtom.route', async () => {
  // Define routes
  const rootRoute = urlAtom.route('/')
  const usersRoute = urlAtom.route('/users')
  const userRoute = urlAtom.route('/users/:userId')
  const postRoute = urlAtom.route('/posts/:postId?')
  const postCommentsRoute = urlAtom.route('/posts/:postId/comments/:commentId')

  // Ensure starting at root
  rootRoute.go()
  await wrap(sleep())
  // Initial state check (assuming initial URL is '/')
  expect(urlAtom().pathname).toBe('/') // Check pathname after navigation
  expect(rootRoute()).toEqual({})
  expect(rootRoute.exact()).toBe(true)
  expect(usersRoute()).toBe(null)
  expect(usersRoute.exact()).toBe(false)
  expect(userRoute()).toBe(null)
  expect(userRoute.exact()).toBe(false)
  expect(postRoute()).toBe(null) // Optional param doesn't match root
  expect(postRoute.exact()).toBe(false)
  expect(postCommentsRoute()).toBe(null)
  expect(postCommentsRoute.exact()).toBe(false)

  // Navigate to /users
  urlAtom.go('/users')
  await wrap(sleep())
  expect(urlAtom().pathname).toBe('/users')
  expect(rootRoute()).toBe(null) // Root no longer matches
  expect(rootRoute.exact()).toBe(false)
  expect(usersRoute()).toEqual({}) // Static match
  expect(usersRoute.exact()).toBe(true)
  expect(userRoute()).toBe(null)
  expect(userRoute.exact()).toBe(false)
  expect(postRoute()).toBe(null)
  expect(postRoute.exact()).toBe(false)

  // Navigate to /users/123
  userRoute.go({ userId: '123' })
  await wrap(sleep())
  expect(urlAtom().pathname).toBe('/users/123')
  expect(rootRoute()).toBe(null)
  expect(usersRoute()).toBe(null) // /users is not an exact match anymore
  expect(usersRoute.exact()).toBe(false)
  expect(userRoute()).toEqual({ userId: '123' }) // Param match
  expect(userRoute.exact()).toBe(true)
  expect(postRoute()).toBe(null)
  expect(postRoute.exact()).toBe(false)

  // Navigate to /posts
  postRoute.go({}) // Pass empty object for optional params
  await wrap(sleep())
  expect(urlAtom().pathname).toBe('/posts')
  expect(rootRoute()).toBe(null)
  expect(usersRoute()).toBe(null)
  expect(userRoute()).toBe(null)
  expect(postRoute()).toEqual({}) // Optional param not present, empty object
  expect(postRoute.exact()).toBe(true)

  // Navigate to /posts/abc
  postRoute.go({ postId: 'abc' })
  await wrap(sleep())
  expect(urlAtom().pathname).toBe('/posts/abc')
  expect(postRoute()).toEqual({ postId: 'abc' }) // Optional param present
  expect(postRoute.exact()).toBe(true)
  expect(postCommentsRoute()).toBe(null) // Doesn't match comments route yet

  // Navigate to /posts/abc/comments/456
  postCommentsRoute.go(
    { postId: 'abc', commentId: '456' },
    { sort: 'new' },
    true,
  )
  await wrap(sleep())
  expect(urlAtom().pathname).toBe('/posts/abc/comments/456')
  expect(urlAtom().search).toBe('?sort=new')
  expect(postRoute()).toEqual({ postId: 'abc' }) // Matches parent partially
  expect(postRoute.exact()).toBe(false) // Not an exact match
  expect(postCommentsRoute()).toEqual({ postId: 'abc', commentId: '456' })
  expect(postCommentsRoute.exact()).toBe(true)

  // Test path generation
  expect(rootRoute.path()).toBe('/')
  expect(usersRoute.path()).toBe('/users')
  expect(userRoute.path({ userId: 'xyz' })).toBe('/users/xyz')
  expect(postRoute.path({})).toBe('/posts') // Optional param omitted
  expect(postRoute.path({ postId: 'def' })).toBe('/posts/def') // Optional param included
  expect(postCommentsRoute.path({ postId: '111', commentId: '222' })).toBe(
    '/posts/111/comments/222',
  )

  // Test navigation back to root
  rootRoute.go()
  await wrap(sleep())
  expect(urlAtom().pathname).toBe('/')
  expect(rootRoute()).toEqual({})
  expect(rootRoute.exact()).toBe(true)
  expect(userRoute()).toBe(null)
  expect(postCommentsRoute()).toBe(null)
})
