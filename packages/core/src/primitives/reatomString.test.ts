import { describe, expect, test } from 'test'

import { reatomString } from './reatomString'

describe('reatomString', () => {
  test('should reset to initial value', () => {
    const a = reatomString(`string`)

    expect(a()).toBe(`string`)

    a.set((s) => `s`)

    expect(a()).toBe(`s`)
    a.reset()
    expect(a()).toBe(`string`)
  })
})
