// use `vitest` instead of `test` only in this test file
import { beforeEach, describe, expect, test } from 'vitest'

import { atom, context } from './atom'

beforeEach(context.reset)

const counter = atom(0)

describe('context.reset', () => {
  test('first', () => {
    expect(counter()).toBe(0)

    counter.set(1)
    expect(counter()).toBe(1)
  })

  test('second', () => {
    expect(counter()).toBe(0)

    counter.set(1)
    expect(counter()).toBe(1)
  })
})
