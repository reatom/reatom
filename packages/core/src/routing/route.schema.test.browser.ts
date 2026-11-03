import type { StandardSchemaV1 } from '@standard-schema/spec'
import { beforeEach, describe, expect, test, vi } from 'test'

import { urlAtom } from '../web/url'
import { reatomRoute } from './route'

beforeEach(() => {
  urlAtom.routes = {}
  if (window.location.pathname !== '/' || window.location.search !== '') {
    window.history.replaceState({}, '', '/')
  }
})

/**
 * Mirrors Effect's `Schema.toStandardSchemaV1`: `typeof` is `'function'`, only
 * `~standard` identifies it as a schema. The router must never call it.
 */
const callableSchema = <Input, Output>(
  validate: (value: unknown) => StandardSchemaV1.Result<Output>,
) => {
  const call = vi.fn(() => undefined)
  const schema: StandardSchemaV1<Input, Output> = Object.assign(call, {
    '~standard': { version: 1 as const, vendor: 'test', validate },
  })
  return { schema, call }
}

const issues = [{ message: 'bad' }]

describe('callable Standard Schema', () => {
  test('params: validates and matches', () => {
    const { schema, call } = callableSchema<{ id: string }, { id: string }>(
      (v: any) =>
        typeof v?.id === 'string' && v.id !== 'new' ? { value: v } : { issues },
    )
    const route = reatomRoute({ path: 'items/:id', params: schema })

    urlAtom.go('/items/42')
    expect(route()).toEqual({ id: '42' })

    urlAtom.go('/items/new')
    expect(route()).toBeNull()

    expect(call).not.toHaveBeenCalled()
  })

  test('params: output transform is applied', () => {
    const { schema } = callableSchema<{ id: string }, { id: number }>(
      (v: any) =>
        /^\d+$/.test(v?.id) ? { value: { id: Number(v.id) } } : { issues },
    )
    const route = reatomRoute({ path: 'items/:id', params: schema })

    urlAtom.go('/items/42')
    expect(route()).toEqual({ id: 42 })
  })

  test('params: go() and path() validate and throw on invalid input', () => {
    const { schema, call } = callableSchema<{ id: string }, { id: string }>(
      (v: any) => (v?.id !== 'new' ? { value: v } : { issues }),
    )
    const route = reatomRoute({ path: 'items/:id', params: schema })

    route.go({ id: '7' })
    expect(urlAtom().pathname).toBe('/items/7')
    expect(route()).toEqual({ id: '7' })

    expect(() => route.path({ id: 'new' })).toThrow('Invalid params')
    expect(() => route.go({ id: 'new' })).toThrow('Invalid params')

    route.go({ id: '8' })
    expect(route()).toEqual({ id: '8' })

    expect(call).not.toHaveBeenCalled()
  })

  test('params: does not create cached params', () => {
    const { schema } = callableSchema<{ id: string }, { id: string }>(
      (v: any) => ({ value: v }),
    )
    const route = reatomRoute({ path: 'items/:id', params: schema })

    expect(route.cachedParams).toBeFalsy()
  })

  test('params: nested under a pathful parent keeps parent params', () => {
    const parent = reatomRoute('docs/:docId')
    const { schema } = callableSchema<{ id: string }, { id: string }>(
      (v: any) => (v?.id !== 'new' ? { value: v } : { issues }),
    )
    const child = parent.reatomRoute({ path: 'items/:id', params: schema })

    child.go({ docId: 'd1', id: '42' })
    expect(urlAtom().pathname).toBe('/docs/d1/items/42')
    expect(child()).toEqual({ docId: 'd1', id: '42' })

    urlAtom.go('/docs/d1/items/new')
    expect(parent()).toEqual({ docId: 'd1' })
    expect(child()).toBeNull()
  })

  test('search: validates, matches, and throws in go()', () => {
    const { schema, call } = callableSchema<
      { tab?: string },
      { tab?: 'a' | 'b' }
    >((v: any) =>
      v?.tab === undefined || v.tab === 'a' || v.tab === 'b'
        ? { value: { tab: v.tab } }
        : { issues },
    )
    const route = reatomRoute({ path: 'page', search: schema })

    route.go({ tab: 'a' })
    expect(urlAtom().search).toBe('?tab=a')
    expect(route()).toEqual({ tab: 'a' })

    urlAtom.go('/page?tab=x')
    expect(route()).toBeNull()

    expect(() => route.go({ tab: 'x' } as any)).toThrow('Invalid search')

    expect(call).not.toHaveBeenCalled()
  })

  test('callable schema with decode/encode is used as a codec', () => {
    const decode = vi.fn((input: { id: string }) => ({ id: Number(input.id) }))
    const encode = vi.fn((output: { id: number }) => ({
      id: String(output.id),
    }))
    const { schema, call } = callableSchema<{ id: string }, { id: number }>(
      (v: any) => ({ value: v }),
    )
    const route = reatomRoute({
      path: 'items/:id',
      params: Object.assign(schema, { decode, encode }),
    })

    route.go({ id: 42 })
    expect(encode).toHaveBeenCalledWith({ id: 42 })
    expect(urlAtom().pathname).toBe('/items/42')
    expect(route()).toEqual({ id: 42 })
    expect(decode).toHaveBeenCalledWith({ id: '42' })

    expect(call).not.toHaveBeenCalled()
  })

  test('callable schema codec falls back to validation when encode throws', () => {
    const { schema } = callableSchema<{ id: string }, { id: string }>(
      (v: any) => (v?.id !== 'new' ? { value: v } : { issues }),
    )
    const route = reatomRoute({
      path: 'items/:id',
      params: Object.assign(schema, {
        decode: (input: { id: string }) => input,
        encode: (): { id: string } => {
          throw new Error('one-way')
        },
      }),
    })

    route.go({ id: '7' })
    expect(urlAtom().pathname).toBe('/items/7')
    expect(() => route.go({ id: 'new' })).toThrow('Invalid params')
  })
})

describe('non-schema params forms', () => {
  test('plain callback is called and caches params', () => {
    const callback = vi.fn(({ open }: { open: boolean }) =>
      open ? { open } : null,
    )
    const route = reatomRoute({ params: callback })

    expect(route.cachedParams).toBeTruthy()

    route.go({ open: true })
    expect(route()).toEqual({ open: true })
    expect(callback).toHaveBeenCalled()
    expect(route.cachedParams()).toEqual({ open: true })

    route.go({ open: false })
    expect(route()).toBeNull()
  })

  test('plain codec object decodes and encodes', () => {
    const route = reatomRoute({
      path: 'items/:id',
      params: {
        decode: (input: { id: string }) => ({ id: Number(input.id) }),
        encode: (output: { id: number }) => ({ id: String(output.id) }),
      },
    })

    expect(route.cachedParams).toBeFalsy()

    route.go({ id: 42 })
    expect(urlAtom().pathname).toBe('/items/42')
    expect(route()).toEqual({ id: 42 })
  })
})
