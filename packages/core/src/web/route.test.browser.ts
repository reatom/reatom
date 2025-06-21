import { beforeEach, expect, expectTypeOf, test, vi } from 'test'
import z from 'zod'

import { computed } from '../core'
import { effect, wrap } from '../methods'
import { withChangeHook } from '../mixins'
import { sleep } from '../utils'
import { reatomRoute } from './route'
import { urlAtom } from './url'

beforeEach(() => {
  if (window.location.pathname !== '/') {
    window.history.replaceState({}, '', '/')
  }
})

test('route basic functionality', async () => {
  const rootRoute = reatomRoute('')
  const profilesRoute = reatomRoute('profiles')
  const profileRoute = reatomRoute('profiles/:profileId')
  const postRoute = reatomRoute('posts/:postId?')
  const postCommentsRoute = postRoute.route({
    path: 'comments/:commentId',
    search: z.object({ sort: z.string().optional() }),
  })

  rootRoute.go()
  await wrap(sleep())

  expect(urlAtom().pathname).toBe('/')
  expect(rootRoute()).toEqual({})
  expect(rootRoute.exact()).toBe(true)
  expect(profilesRoute()).toBe(null)
  expect(profilesRoute.exact()).toBe(false)
  expect(profileRoute()).toBe(null)
  expect(profileRoute.exact()).toBe(false)
  expect(postRoute()).toBe(null)
  expect(postRoute.exact()).toBe(false)
  expect(postCommentsRoute()).toBe(null)
  expect(postCommentsRoute.exact()).toBe(false)

  urlAtom.go('/profiles')
  await wrap(sleep())
  expect(urlAtom().pathname).toBe('/profiles')
  expect(rootRoute()).toEqual({})
  expect(rootRoute.exact()).toBe(false)
  expect(profilesRoute()).toEqual({})
  expect(profilesRoute.exact()).toBe(true)
  expect(profileRoute()).toBe(null)
  expect(profileRoute.exact()).toBe(false)
  expect(postRoute()).toBe(null)
  expect(postRoute.exact()).toBe(false)

  profileRoute.go({ profileId: '123' })
  await wrap(sleep())
  expect(urlAtom().pathname).toBe('/profiles/123')
  expect(rootRoute()).toEqual({})
  expect(profilesRoute()).toEqual({})
  expect(profilesRoute.exact()).toBe(false)
  expect(profileRoute()).toEqual({ profileId: '123' })
  expect(profileRoute.exact()).toBe(true)
  expect(postRoute()).toBe(null)
  expect(postRoute.exact()).toBe(false)

  postRoute.go()
  await wrap(sleep())
  expect(urlAtom().pathname).toBe('/posts')
  expect(rootRoute()).toEqual({})
  expect(profilesRoute()).toBe(null)
  expect(profileRoute()).toBe(null)
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
  expect(profilesRoute.path()).toBe('/profiles')
  expect(profileRoute.path({ profileId: 'xyz' })).toBe('/profiles/xyz')
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
  expect(profileRoute()).toBe(null)
  expect(postCommentsRoute()).toBe(null)
})

test('route chainable functionality', async () => {
  const apiRoute = reatomRoute('api')
  const productsRoute = apiRoute.route('products')
  const productDetailsRoute = productsRoute.route(':productId')
  const productSettingsRoute = productDetailsRoute.route('settings')
  const productItemsRoute = productDetailsRoute.route('items/:itemId?')

  urlAtom.go('/')
  await wrap(sleep())
  expect(urlAtom().pathname).toBe('/')
  expect(apiRoute()).toBe(null)
  expect(productsRoute()).toBe(null)
  expect(productDetailsRoute()).toBe(null)
  expect(productSettingsRoute()).toBe(null)
  expect(productItemsRoute()).toBe(null)

  productDetailsRoute.go({ productId: 'abc' })
  await wrap(sleep())
  expect(urlAtom().pathname).toBe('/api/products/abc')
  expect(apiRoute()).toEqual({})
  expect(apiRoute.exact()).toBe(false)
  expect(productsRoute()).toEqual({})
  expect(productsRoute.exact()).toBe(false)
  expect(productDetailsRoute()).toEqual({ productId: 'abc' })
  expect(productDetailsRoute.exact()).toBe(true)
  expect(productSettingsRoute()).toBe(null)
  expect(productItemsRoute()).toEqual(null)

  productSettingsRoute.go({ productId: 'abc' })
  await wrap(sleep())
  expect(urlAtom().pathname).toBe('/api/products/abc/settings')
  expect(apiRoute()).toEqual({})
  expect(productsRoute()).toEqual({})
  expect(productDetailsRoute()).toEqual({ productId: 'abc' })
  expect(productDetailsRoute.exact()).toBe(false)
  expect(productSettingsRoute()).toEqual({ productId: 'abc' })
  expect(productSettingsRoute.exact()).toBe(true)
  expect(productItemsRoute()).toBe(null)

  productItemsRoute.go({ productId: 'abc' })
  await wrap(sleep())
  expect(urlAtom().pathname).toBe('/api/products/abc/items')
  expect(productDetailsRoute()).toEqual({ productId: 'abc' })
  expect(productDetailsRoute.exact()).toBe(false)
  expect(productSettingsRoute()).toBe(null)
  expect(productItemsRoute()).toEqual({ productId: 'abc' })
  expect(productItemsRoute.exact()).toBe(true)

  productItemsRoute.go({ productId: 'abc', itemId: 'p123' })
  await wrap(sleep())
  expect(urlAtom().pathname).toBe('/api/products/abc/items/p123')
  expect(productItemsRoute()).toEqual({ productId: 'abc', itemId: 'p123' })
  expect(productItemsRoute.exact()).toBe(true)

  expect(apiRoute.path()).toBe('/api')
  expect(productsRoute.path()).toBe('/api/products')
  expect(productDetailsRoute.path({ productId: 'xyz' })).toBe(
    '/api/products/xyz',
  )
  expect(productSettingsRoute.path({ productId: 'xyz' })).toBe(
    '/api/products/xyz/settings',
  )
  expect(productItemsRoute.path({ productId: 'xyz' })).toBe(
    '/api/products/xyz/items',
  )
  expect(productItemsRoute.path({ productId: 'xyz', itemId: 'p456' })).toBe(
    '/api/products/xyz/items/p456',
  )
})

test('route typed params', () => {
  {
    // @ts-expect-error - test
    const catalogRoute = reatomRoute({
      path: 'catalog/:id',
      params: z.object({ /* mistake -> */ ib: z.number() }),
    })
  }

  const catalogRoute = reatomRoute({
    path: 'catalog/:id',
    params: z.object({ id: z.number() }),
  })

  // @ts-expect-error - test
  expect(() => catalogRoute.go({ id: '42' })).toThrow()

  expect(catalogRoute.go({ id: 42 }).pathname).toBe('/catalog/42')
})

test('route default loader', async () => {
  const goodsRoute = reatomRoute({
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
  const goodsRoute = reatomRoute('goods/:category')
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

  expect(() =>
    // @ts-expect-error - test
    goodsBrandRoute.go({ category: 'tech', brand: 'apple', sort: 'asd' }),
  ).toThrow()
})

test('route loader lazyness (abortable)', async () => {
  let runs = 0
  let ticks = 0

  const lazyRoute = reatomRoute({
    path: 'lazy',
    async loader() {
      runs++
      effect(async () => {
        while (true) {
          ticks++
          await wrap(sleep())
        }
      })
    },
  })

  let calls = 0
  lazyRoute.loader.extend(withChangeHook(() => calls++))

  lazyRoute.go()

  await wrap(Promise.resolve())

  expect(calls).toBe(1)
  expect(runs).toBe(1)
  expect(ticks).toBe(1)

  await wrap(sleep())
  expect(calls).toBe(1)
  expect(runs).toBe(1)
  expect(ticks).toBe(2)

  await wrap(sleep())
  expect(calls).toBe(1)
  expect(runs).toBe(1)
  expect(ticks).toBe(3)

  urlAtom.go('/lazy/123')
  await wrap(sleep())
  expect(calls).toBe(1)
  expect(runs).toBe(1)
  expect(ticks).toBe(4)

  expect(lazyRoute()).toEqual({})
  urlAtom.go('/')
  await wrap(sleep())
  await wrap(sleep())
  await wrap(sleep())
  expect(calls).toBe(2)
  expect(runs).toBe(1)
  expect(ticks).toBe(4)
  expect(lazyRoute()).toBe(null)
})

test('params types transform', async () => {
  const issueRoute = reatomRoute({
    path: 'issue/:issueId',
    params: z.object({
      issueId: z.string().regex(/^\d+$/).transform(Number),
    }),
    async loader(params) {
      return {
        issueId: params.issueId,
      }
    },
  })

  issueRoute.go({ issueId: '123' })

  expect(await wrap(issueRoute.loader())).toEqual({ issueId: 123 })
})

test('search params memo', async () => {
  let route1Track = vi.fn()
  const route1 = reatomRoute('test').extend(withChangeHook(route1Track))
  const route2 = reatomRoute({
    path: 'test',
    search: z.object({
      q: z.string().optional(),
    }),
  })

  route1.go()

  expect(route1()).toEqual({})
  await wrap(sleep()) // wait the hook
  expect(route1Track).toBeCalledTimes(1)
  expect(route2()).toEqual({})

  route2.go({ q: '123' })
  expect(route1()).toEqual({})
  await wrap(sleep()) // wait the hook
  expect(route1Track).toBeCalledTimes(1)
  expect(route2()).toEqual({ q: '123' })
})
