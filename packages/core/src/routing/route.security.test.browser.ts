import { beforeEach, expect, expectTypeOf, test } from 'test'
import z from 'zod'

import { wrap } from '../methods'
import { sleep } from '../utils'
import { urlAtom } from '../web/url'
import { reatomRoute } from './route'

beforeEach(() => {
  urlAtom.routes = {}
  if (window.location.pathname !== '/') {
    window.history.replaceState({}, '', '/')
  }
})

test('params collision', async () => {
  const strictRoute = reatomRoute({
    path: 'strictRoute/:id',
  })

  const liberalRoute = reatomRoute({
    path: 'liberalRoute/:id',
    search: z.record(z.string(), z.string()),
  })

  const expectedId = '42'
  const maliciousId = 'lol'

  urlAtom.go(`/strictRoute/${expectedId}?id=${maliciousId}`)

  expect(strictRoute()).toEqual({ id: expectedId })

  urlAtom.go(`/liberalRoute/${expectedId}?id=${maliciousId}`)

  expect(() => liberalRoute()).toThrow('Params collision')
})

test('go.relative first parameter omits parent path keys', () => {
  const orgRoute = reatomRoute('org/:orgId')
  const memberRoute = orgRoute.reatomRoute('member/:memberId')

  expectTypeOf(memberRoute.go.relative)
    .parameter(0)
    .not.toMatchObjectType<{ orgId: string }>()
})

test('go.relative strips parent keys from runtime argument', async () => {
  const orgRoute = reatomRoute('org/:orgId')
  const teamRoute = orgRoute.reatomRoute('team/:teamId')
  const memberRoute = orgRoute.reatomRoute('member/:memberId')

  teamRoute.go({ orgId: 'o1', teamId: 't9' })
  await wrap(sleep())

  memberRoute.go.relative({
    memberId: 'm3',
    // @ts-expect-error
    orgId: 'evil',
  })
  await wrap(sleep())

  expect(urlAtom().pathname).toBe('/org/o1/member/m3')
})

test('callback params cache should not override updated path params', async () => {
  const projectRoute = reatomRoute('projects/:projectId')
  const projectTabRoute = projectRoute.reatomRoute({
    params: (params: { projectId: string; tab?: string }) =>
      params.tab ? params : null,
  })

  projectTabRoute.go({ projectId: '123', tab: 'summary' })
  await wrap(sleep())

  expect(projectTabRoute()).toEqual({ projectId: '123', tab: 'summary' })

  urlAtom.go('/projects/456')
  await wrap(sleep())

  expect(projectRoute()).toEqual({ projectId: '456' })
  expect(projectTabRoute()).toEqual({ projectId: '456', tab: 'summary' })
})

test('path params should roundtrip URL-reserved characters', async () => {
  const fileRoute = reatomRoute('files/:fileId')
  const fileId = 'folder/a b'

  fileRoute.go({ fileId })
  await wrap(sleep())

  expect(urlAtom().pathname).toBe('/files/folder%2Fa%20b')
  expect(fileRoute()).toEqual({ fileId })
  expect(fileRoute.exact()).toBe(true)
})
