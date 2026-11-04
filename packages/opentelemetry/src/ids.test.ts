import { afterEach, expect, test, vi } from 'vitest'

import { mintIdentityId } from './ids.ts'

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

afterEach(() => {
  vi.unstubAllGlobals()
})

test('mintIdentityId uses crypto.randomUUID when available', () => {
  vi.stubGlobal('crypto', {
    randomUUID: () => 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  })
  expect(mintIdentityId()).toBe('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee')
})

test('mintIdentityId formats getRandomValues bytes as UUID v4', () => {
  const bytes = Uint8Array.from({ length: 16 }, (_, index) => index)
  vi.stubGlobal('crypto', {
    getRandomValues(target: Uint8Array) {
      target.set(bytes)
      return target
    },
  })
  expect(mintIdentityId()).toBe('00010203-0405-4607-8809-0a0b0c0d0e0f')
  expect(mintIdentityId()).toMatch(UUID_V4)
})
