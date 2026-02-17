import { expect, test } from 'test'

import { ADMIN_FRAME } from '../root'
import { createSessionManager } from './index'

test('auto-start creates session on init', () => {
  const session = ADMIN_FRAME.run(() => createSessionManager(() => ({})))
  const current = ADMIN_FRAME.run(() => session.current())
  expect(current.id).toBeDefined()
  expect(current.startedAt).toBeGreaterThan(0)
  expect(current.metadata).toEqual({})
})

test('start creates new session', () => {
  const session = ADMIN_FRAME.run(() => createSessionManager(() => ({})))
  const first = ADMIN_FRAME.run(() => session.current())
  ADMIN_FRAME.run(() => session.start())
  const second = ADMIN_FRAME.run(() => session.current())
  expect(second.id).not.toBe(first.id)
  expect(second.startedAt).toBeGreaterThanOrEqual(first.startedAt)
})

test('id computed returns current session id', () => {
  const session = ADMIN_FRAME.run(() => createSessionManager(() => ({})))
  const currentId = ADMIN_FRAME.run(() => session.id())
  const current = ADMIN_FRAME.run(() => session.current())
  expect(currentId).toBe(current.id)
})

test('metadata from getMetadata', () => {
  const session = ADMIN_FRAME.run(() =>
    createSessionManager(() => ({ userId: 'u1', env: 'test' })),
  )
  const current = ADMIN_FRAME.run(() => session.current())
  expect(current.metadata).toEqual({ userId: 'u1', env: 'test' })
})
