import { beforeEach, describe, expect, expectTypeOf, test } from 'test'
import z from 'zod'

import { urlAtom } from '../web/url'
import { reatomRoute } from './route'

beforeEach(() => {
  urlAtom.routes = {}
  if (window.location.pathname !== '/') {
    window.history.replaceState({}, '', '/')
  }
})

describe('codecs', () => {
  type PayloadData = { userId: number; role: string }

  test('params: base64-encoded JSON in path', () => {
    const route = reatomRoute({
      path: 'data/:payload',
      params: {
        decode: (input) => ({
          payload: JSON.parse(atob(input.payload)) as PayloadData,
        }),
        encode: (output) => ({
          payload: btoa(JSON.stringify(output.payload)),
        }),
      },
    })

    const data: PayloadData = { userId: 42, role: 'admin' }
    route.go({ payload: data })
    expect(route()).toEqual({ payload: data })
    expect(route.path({ payload: data })).toBe(
      `/data/${encodeURIComponent(btoa(JSON.stringify(data)))}`,
    )
  })

  test('search: base64-encoded JSON in search params', () => {
    type Filter = { status: string; tags: string[] }

    const route = reatomRoute({
      path: 'page',
      search: {
        decode: (input: { filter?: string }): { filter: Filter | null } => ({
          filter: input.filter ? JSON.parse(atob(input.filter)) : null,
        }),
        encode: (output) => ({
          filter: output.filter
            ? btoa(JSON.stringify(output.filter))
            : undefined,
        }),
      },
    })

    const filter: Filter = { status: 'active', tags: ['a', 'b'] }
    route.go({ filter })
    expect(route()).toEqual({ filter })
  })

  test('params with zod codec', () => {
    const stringToNumber = z.codec(
      z.string().regex(z.regexes.number),
      z.number(),
      {
        decode: (str) => Number.parseFloat(str),
        encode: (num) => num.toString(),
      },
    )

    const route = reatomRoute({
      path: 'items/:id',
      params: z.object({ id: stringToNumber }),
    })

    route.go({ id: 42 })
    expect(route()).toEqual({ id: 42 })
    expect(urlAtom().pathname).toBe('/items/42')

    urlAtom.go('/items/43')
    expect(route()).toEqual({ id: 43 })
  })

  test('params with zod stringbool codec', () => {
    const route = reatomRoute({
      path: 'feature/:enabled',
      params: z.object({ enabled: z.stringbool() }),
    })

    route.go({ enabled: true })
    expect(route()).toEqual({ enabled: true })
    expect(urlAtom().pathname).toBe('/feature/true')

    urlAtom.go('/feature/false')
    expect(route()).toEqual({ enabled: false })

    urlAtom.go('/feature/0')
    expect(route()).toEqual({ enabled: false })

    urlAtom.go('/feature/invalid')
    expect(route()).toBeNull()
  })

  test('search with zod codec', () => {
    const route = reatomRoute({
      path: 'list',
      search: z.codec(
        z.object({ page: z.string().optional() }),
        z.object({ page: z.number().optional() }),
        {
          decode: (input) => ({
            page: input.page ? Number(input.page) : undefined,
          }),
          encode: (output) => ({
            page: output.page != null ? String(output.page) : undefined,
          }),
        },
      ),
    })

    route.go({ page: 3 })
    expect(route()).toEqual({ page: 3 })
    expect(urlAtom().search).toBe('?page=3')
  })

  test('decode error causes unmatch', () => {
    const route = reatomRoute({
      path: 'data/:payload',
      params: {
        decode: (input: { payload: string }): { payload: PayloadData } => ({
          payload: JSON.parse(atob(input.payload)),
        }),
        encode: (output: { payload: PayloadData }): { payload: string } => ({
          payload: btoa(JSON.stringify(output.payload)),
        }),
      },
    })

    window.history.replaceState({}, '', '/data/not-valid-base64!!!')
    expect(route()).toBeNull()
  })

  test('encode error throws in go', () => {
    const route = reatomRoute({
      path: 'data/:payload',
      params: {
        decode: (input: { payload: string }): { payload: string } => ({
          payload: JSON.parse(atob(input.payload)),
        }),
        encode: (): { payload: string } => {
          throw new Error('encode failed')
        },
      },
    })

    expect(() => route.go({ payload: 'x' })).toThrow('encode failed')
  })

  test('go() accepts Output types for params codec', () => {
    const route = reatomRoute({
      path: 'items/:id',
      params: {
        decode: (input: { id: string }) => ({ id: Number(input.id) }),
        encode: (output: { id: number }) => ({ id: String(output.id) }),
      },
    })

    expectTypeOf(route.go).parameter(0).toMatchObjectType<{ id: number }>()
    expectTypeOf(route()).toEqualTypeOf<{ id: number } | null>()
  })

  test('go() accepts Output types for search codec', () => {
    const route = reatomRoute({
      path: 'list',
      search: {
        decode: (input: { page?: string }) => ({
          page: input.page ? Number(input.page) : 1,
        }),
        encode: (output: { page: number }) => ({
          page: String(output.page),
        }),
      },
    })

    expectTypeOf(route.go).parameter(0).toMatchObjectType<{ page: number }>()
  })

  test('go() accepts Output types for both params and search codecs', () => {
    const route = reatomRoute({
      path: 'items/:id',
      params: {
        decode: (input: { id: string }) => ({ id: Number(input.id) }),
        encode: (output: { id: number }) => ({ id: String(output.id) }),
      },
      search: {
        decode: (input: { page?: string }) => ({
          page: input.page ? Number(input.page) : 1,
        }),
        encode: (output: { page: number }) => ({
          page: String(output.page),
        }),
      },
    })

    expectTypeOf(route.go)
      .parameter(0)
      .toMatchObjectType<{ id: number; page: number }>()
    expectTypeOf(route()).toEqualTypeOf<{ id: number; page: number } | null>()
  })

  test('child route uses parent params codec when encoding path', () => {
    const wrapRoute = reatomRoute({
      path: 'wrap/:token',
      params: {
        decode: (input: { token: string }) => ({ token: (input.token) === 'seven' ? 7 : NaN }),
        encode: (output: { token: number }) => ({ token: output.token === 7 ? 'seven' : '' }),
      },
    })
    const childRoute = wrapRoute.reatomRoute('item/:itemId')

    childRoute.go({ token: 7, itemId: 'x' })
    expect(urlAtom().pathname).toBe('/wrap/seven/item/x')
  })
})
