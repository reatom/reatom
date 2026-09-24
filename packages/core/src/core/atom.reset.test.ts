// use `vitest` instead of `test` only in this test file
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { withConnectHook } from '../extensions'
import { wrap } from '../methods'
import { type AbortError, isAbort, sleep } from '../utils'
import { atom, clearStack, computed, context } from './atom'

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

describe('unsubscribe after context.reset', () => {
  test('atom missing in the new store', () =>
    root.run(() => {
      const a = atom(0, 'a')
      const staleUnsubscribe = a.subscribe()

      context.reset()

      expect(() => staleUnsubscribe()).not.toThrow()
    }))

  test('fresh subscription of the same atom stays linked', () =>
    root.run(async () => {
      const a = atom(0, 'a')
      const doubled = computed(() => a() * 2, 'doubled')
      const staleUnsubscribe = doubled.subscribe()

      context.reset()

      const fresh = vi.fn()
      doubled.subscribe(fresh)
      expect(fresh).toHaveBeenLastCalledWith(0)

      staleUnsubscribe()

      a.set(1)
      await wrap(sleep())
      expect(fresh).toHaveBeenLastCalledWith(2)

      a.set(2)
      await wrap(sleep())
      expect(fresh).toHaveBeenLastCalledWith(4)
    }))

  test('fresh connection of the same atom is not aborted', () =>
    root.run(async () => {
      let connections = 0
      const disconnect = vi.fn()
      const a = atom(0, 'a').extend(
        withConnectHook(() => {
          const id = ++connections
          return () => disconnect(id)
        }),
      )
      const staleUnsubscribe = a.subscribe()
      await wrap(sleep())
      expect(connections).toBe(1)

      context.reset()

      a.subscribe()
      await wrap(sleep())
      expect(connections).toBe(2)

      staleUnsubscribe()
      await wrap(sleep())
      expect(disconnect).not.toBeCalledWith(2)
    }))
})
