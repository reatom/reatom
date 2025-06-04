import { createTestCtx } from '@reatom/testing'
import { expect, test } from 'vitest'

test('stub', () => {
  const ctx = createTestCtx()

  expect(false).toEqual('No tests!')
})
