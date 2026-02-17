import type { AtomLike } from '@reatom/core'
import { clearStack, context, top } from '@reatom/core'
import { noop, type Unsubscribe } from '@reatom/core'
import { type Mock, test as viTest, vi } from 'vitest'

clearStack()

export const silentQueuesErrors = () => {
  top().root.pushQueue = function pushQueue(cb, queue) {
    this[queue].push(async () => {
      try {
        await cb()
      } catch {
        // nothing
      }
    })
  }
}

/**
 * Enhanced version of Vitest's test function that automatically wraps test
 * callbacks in Reatom's context to ensure proper atom tracking and execution
 * within Reatom's reactive system.
 *
 * This wrapper preserves all functionality from Vitest while adding
 * Reatom-specific context handling, which prevents "missed context" errors when
 * testing Reatom atoms and actions.
 *
 * @example
 *   import { test, expect } from '@reatom/core/test'
 *   import { atom } from '@reatom/core'
 *
 *   test('atom updates correctly', () => {
 *     const counter = atom(0, 'counter')
 *     counter.set(5)
 *     expect(counter()).toBe(5)
 *   })
 *
 * @param name - The name of the test case
 * @param fn - The test function to execute within Reatom context
 * @returns The result of the Vitest test execution
 */
export const test = ((name: string, fn: () => void | Promise<void>) =>
  viTest(name, () => {
    Reflect.defineProperty(fn, 'name', { value: name })
    return context.start(fn)
  })) as typeof viTest

export { viTest }

/**
 * Creates a mock subscriber for an atom that tracks all atom updates using
 * Vitest's mock functionality.
 *
 * This utility combines Reatom's subscription mechanism with Vitest's mocking
 * capabilities, providing an easy way to verify atom updates during tests. The
 * returned object is both a Vitest mock function (with call tracking) and has
 * an attached unsubscribe method.
 *
 * @example
 *   import { test, expect, subscribe } from '@reatom/core/test'
 *   import { atom } from '@reatom/core'
 *
 *   test('subscribe captures all updates', () => {
 *     const counter = atom(0, 'counter')
 *     const sub = subscribe(counter)
 *
 *     counter.set(1)
 *     counter.set(2)
 *
 *     expect(sub).toHaveBeenCalledTimes(3) // Initial + 2 updates
 *     expect(sub).toHaveBeenLastCalledWith(2)
 *
 *     sub.unsubscribe() // Stop listening to updates
 *   })
 *
 * @param target - The Reatom atom or computed value to subscribe to
 * @param cb - Optional callback function to execute on each atom update
 * @returns A Vitest mock function with unsubscribe method attached
 */
export function subscribe<State, T extends (state: State) => any>(
  target: AtomLike<State>,
  cb: T = noop as T,
): Mock<T> & { unsubscribe: Unsubscribe } {
  const mock = vi.fn(cb)
  const unsubscribe = target.subscribe(
    // @ts-ignore TODO
    mock,
  )
  return Object.assign(mock, { unsubscribe })
}

/**
 * Re-exports from Vitest for convenient testing.
 *
 * These exports provide all standard Vitest testing utilities while ensuring
 * compatibility with Reatom's testing utilities defined in this file.
 */
export {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  expectTypeOf,
  vi,
} from 'vitest'

/**
 * Re-exports all type definitions from Vitest.
 *
 * This ensures that Vitest types are available when importing from
 * '@reatom/core/test'.
 */
export type * from 'vitest'
