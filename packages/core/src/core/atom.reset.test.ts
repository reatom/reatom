// use `vitest` instead of `test` only in this test file
import { beforeEach, describe, expect, test } from 'vitest'

import { wrap } from '../methods'
import { type AbortError, isAbort, sleep } from '../utils'
import { atom, clearStack, context } from './atom'

clearStack()

const root = context.start()

beforeEach(() => {
  root.run(context.reset)
})

const counter = atom(0)

describe('context.reset', () => {
  test('first', () =>
    root.run(() => {
      expect(counter()).toBe(0)

      counter.set(1)
      expect(counter()).toBe(1)
    }))

  test('second', () =>
    root.run(() => {
      expect(counter()).toBe(0)

      counter.set(1)
      expect(counter()).toBe(1)
    }))

  test('wrap abort', async () =>
    root.run(async () => {
      const wrappedPromise = wrap(sleep(10))

      context.reset()

      const error = await wrappedPromise.catch((e) => e)
      expect(isAbort(error)).toBe(true)
      expect((error as AbortError).message).includes('context reset')
    }))
})
