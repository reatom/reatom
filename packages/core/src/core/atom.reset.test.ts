// use `vitest` instead of `test` only in this test file
import { beforeEach, describe, expect, test } from 'vitest'

import { wrap } from '../methods'
import { type AbortError, isAbort, sleep } from '../utils'
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

  test('wrap abort', async () => {
    const wrappedPromise = wrap(sleep(10))

    context.reset()

    const error = await wrappedPromise.catch((e) => e)
    expect(isAbort(error)).toBe(true)
    expect((error as AbortError).message).includes('context reset')
  })
})
