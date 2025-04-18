import { test as viTest, vi, type Mock } from 'vitest'
import { clearStack, context, AtomLike } from './core'
import { noop, type Unsubscribe } from './utils'

clearStack()

// TODO decorate chainable methods too
export const test = Object.assign(
  (name: string, fn: () => void | Promise<void>) =>
    viTest(name, () => {
      Reflect.defineProperty(fn, 'name', { value: name })
      return context.start(fn)
    }),
  viTest,
) as typeof viTest

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

export {
  expect,
  vi,
  describe,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  expectTypeOf,
} from 'vitest'

export type * from 'vitest'
