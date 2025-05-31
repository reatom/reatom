import { beforeEach, expect, expectTypeOf, test, vi } from 'test'
import z from 'zod'

import { computed } from '../core'
import { effect, wrap } from '../methods'
import { sleep } from '../utils'
import { route } from './route'
import { urlAtom } from './url'

beforeEach(() => {
  if (window.location.pathname !== '/') {
    window.history.replaceState({}, '', '/')
  }
})

test('route basic functionality', async () => {
  const rootRoute = route('')
  const usersRoute = route('users')
  const userRoute = route('users/:userId')
  const postRoute = route('posts/:postId?')
  const postCommentsRoute = postRoute.route({
    path: 'comments/:commentId',
    search: z.object({ sort: z.string().optional() }),
  })

  rootRoute.go()
  await wrap(sleep())

  expect(urlAtom().pathname).toBe('/')
  expect(rootRoute()).toEqual({})
  expect(rootRoute.exact()).toBe(true)
  expect(usersRoute()).toBe(null)
  expect(usersRoute.exact()).toBe(false)
  expect(userRoute()).toBe(null)
  expect(userRoute.exact()).toBe(false)
  expect(postRoute()).toBe(null)
  expect(postRoute.exact()).toBe(false)
  expect(postCommentsRoute()).toBe(null)
  expect(postCommentsRoute.exact()).toBe(false)

  urlAtom.go('/users')
  await wrap(sleep())
  expect(urlAtom().pathname).toBe('/users')
  expect(rootRoute()).toEqual({})
  expect(rootRoute.exact()).toBe(false)
  expect(usersRoute()).toEqual({})
  expect(usersRoute.exact()).toBe(true)
  expect(userRoute()).toBe(null)
  expect(userRoute.exact()).toBe(false)
  expect(postRoute()).toBe(null)
  expect(postRoute.exact()).toBe(false)

  userRoute.go({ userId: '123' })
  await wrap(sleep())
  expect(urlAtom().pathname).toBe('/users/123')
  expect(rootRoute()).toEqual({})
  expect(usersRoute()).toEqual({})
  expect(usersRoute.exact()).toBe(false)
  expect(userRoute()).toEqual({ userId: '123' })
  expect(userRoute.exact()).toBe(true)
  expect(postRoute()).toBe(null)
  expect(postRoute.exact()).toBe(false)

  postRoute.go()
  await wrap(sleep())
  expect(urlAtom().pathname).toBe('/posts')
  expect(rootRoute()).toEqual({})
  expect(usersRoute()).toBe(null)
  expect(userRoute()).toBe(null)
  expect(postRoute()).toEqual({})
  expect(postRoute.exact()).toBe(true)

  postRoute.go({ postId: 'abc' })
  await wrap(sleep())
  expect(urlAtom().pathname).toBe('/posts/abc')
  expect(postRoute()).toEqual({ postId: 'abc' })
  expect(postRoute.exact()).toBe(true)
  expect(postCommentsRoute()).toBe(null)

  postCommentsRoute.go(
    {
      postId: 'abc',
      commentId: '456',
      sort: 'new',
    },
    true,
  )
  await wrap(sleep())
  expect(urlAtom().pathname).toBe('/posts/abc/comments/456')
  expect(urlAtom().search).toBe('?sort=new')
  expect(postRoute()).toEqual({ postId: 'abc' })
  expect(postRoute.exact()).toBe(false)
  expect(postCommentsRoute()).toEqual({
    postId: 'abc',
    commentId: '456',
    sort: 'new',
  })
  expect(postCommentsRoute.exact()).toBe(true)

  expect(rootRoute.path()).toBe('/')
  expect(usersRoute.path()).toBe('/users')
  expect(userRoute.path({ userId: 'xyz' })).toBe('/users/xyz')
  expect(postRoute.path()).toBe('/posts')
  expect(postRoute.path({ postId: 'def' })).toBe('/posts/def')
  expect(
    postCommentsRoute.path({ postId: '111', commentId: '222', sort: 'new' }),
  ).toBe('/posts/111/comments/222?sort=new')

  rootRoute.go()
  await wrap(sleep())
  expect(urlAtom().pathname).toBe('/')
  expect(rootRoute()).toEqual({})
  expect(rootRoute.exact()).toBe(true)
  expect(userRoute()).toBe(null)
  expect(postCommentsRoute()).toBe(null)
})

test('route chainable functionality', async () => {
  const apiRoute = route('api')
  const usersRoute = apiRoute.route('users')
  const userDetailsRoute = usersRoute.route(':userId')
  const userSettingsRoute = userDetailsRoute.route('settings')
  const userPostsRoute = userDetailsRoute.route('posts/:postId?')

  urlAtom.go('/')
  await wrap(sleep())
  expect(urlAtom().pathname).toBe('/')
  expect(apiRoute()).toBe(null)
  expect(usersRoute()).toBe(null)
  expect(userDetailsRoute()).toBe(null)
  expect(userSettingsRoute()).toBe(null)
  expect(userPostsRoute()).toBe(null)

  userDetailsRoute.go({ userId: 'abc' })
  await wrap(sleep())
  expect(urlAtom().pathname).toBe('/api/users/abc')
  expect(apiRoute()).toEqual({})
  expect(apiRoute.exact()).toBe(false)
  expect(usersRoute()).toEqual({})
  expect(usersRoute.exact()).toBe(false)
  expect(userDetailsRoute()).toEqual({ userId: 'abc' })
  expect(userDetailsRoute.exact()).toBe(true)
  expect(userSettingsRoute()).toBe(null)
  expect(userPostsRoute()).toEqual(null)

  userSettingsRoute.go({ userId: 'abc' })
  await wrap(sleep())
  expect(urlAtom().pathname).toBe('/api/users/abc/settings')
  expect(apiRoute()).toEqual({})
  expect(usersRoute()).toEqual({})
  expect(userDetailsRoute()).toEqual({ userId: 'abc' })
  expect(userDetailsRoute.exact()).toBe(false)
  expect(userSettingsRoute()).toEqual({ userId: 'abc' })
  expect(userSettingsRoute.exact()).toBe(true)
  expect(userPostsRoute()).toBe(null)

  userPostsRoute.go({ userId: 'abc' })
  await wrap(sleep())
  expect(urlAtom().pathname).toBe('/api/users/abc/posts')
  expect(userDetailsRoute()).toEqual({ userId: 'abc' })
  expect(userDetailsRoute.exact()).toBe(false)
  expect(userSettingsRoute()).toBe(null)
  expect(userPostsRoute()).toEqual({ userId: 'abc' })
  expect(userPostsRoute.exact()).toBe(true)

  userPostsRoute.go({ userId: 'abc', postId: 'p123' })
  await wrap(sleep())
  expect(urlAtom().pathname).toBe('/api/users/abc/posts/p123')
  expect(userPostsRoute()).toEqual({ userId: 'abc', postId: 'p123' })
  expect(userPostsRoute.exact()).toBe(true)

  expect(apiRoute.path()).toBe('/api')
  expect(usersRoute.path()).toBe('/api/users')
  expect(userDetailsRoute.path({ userId: 'xyz' })).toBe('/api/users/xyz')
  expect(userSettingsRoute.path({ userId: 'xyz' })).toBe(
    '/api/users/xyz/settings',
  )
  expect(userPostsRoute.path({ userId: 'xyz' })).toBe('/api/users/xyz/posts')
  expect(userPostsRoute.path({ userId: 'xyz', postId: 'p456' })).toBe(
    '/api/users/xyz/posts/p456',
  )
})

test('route typed params', () => {
  {
    // @ts-expect-error - test
    const userRoute = route({
      path: 'user/:id',
      params: z.object({ /* mistake -> */ ib: z.number() }),
    })
  }

  const userRoute = route({
    path: 'user/:id',
    params: z.object({ id: z.number() }),
  })

  // @ts-expect-error - test
  expect(() => userRoute.go({ id: '42' })).toThrow()

  expect(userRoute.go({ id: 42 }).pathname).toBe('/user/42')
})

test('route default loader', async () => {
  const goodsRoute = route({
    path: 'goods/:category',
    params: z.object({ category: z.string() }),
    search: z.object({
      sort: z.enum(['asc', 'desc']).optional(),
    }),
  })

  const goods = computed(async () => {
    const params = await wrap(goodsRoute.loader())

    const url = `/api/goods/${params.category}?sort=${params.sort}`
    const resp = await wrap(Promise.resolve({ json: () => [{ id: url }] }))
    return resp.json()
  })

  const track = vi.fn()

  effect(async () => {
    const data = await wrap(goods())
    track(data)
  })

  await wrap(sleep())
  expect(track).toBeCalledTimes(0)

  goodsRoute.go({ category: 'tech' })
  await wrap(sleep())
  expect(track).toBeCalledTimes(1)
  expect(track).toBeCalledWith([{ id: `/api/goods/tech?sort=undefined` }])
})

test('route loader', async () => {
  const goodsRoute = route('goods/:category')
  const goodsBrandRoute = goodsRoute.route({
    path: ':brand',
    search: z.object({
      sort: z.enum(['asc', 'desc']).optional(),
    }),
    async loader(params) {
      expectTypeOf(params).toEqualTypeOf<{
        category: string
        brand: string
        sort?: 'asc' | 'desc' | undefined
      }>()

      expect(params).toEqual({
        category: 'tech',
        brand: 'apple',
        sort: 'asc',
      })

      const url = `/api/goods/${params.category}/${params.brand}?sort=${params.sort}`
      const resp = await wrap(Promise.resolve({ json: () => [{ id: url }] }))
      return resp.json()
    },
  })

  const track = vi.fn()

  effect(async () => {
    const data = await wrap(goodsBrandRoute.loader())
    track(data)
  })

  await wrap(sleep())
  expect(track).toBeCalledTimes(0)

  goodsBrandRoute.go({ category: 'tech', brand: 'apple', sort: 'asc' })
  await wrap(sleep())
  expect(track).toBeCalledTimes(1)
  expect(track).toBeCalledWith([{ id: `/api/goods/tech/apple?sort=asc` }])
})
