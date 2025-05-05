import {
  AtomLike,
  isAtom,
  named,
  ReatomError,
  STACK,
  enqueue,
  createAtom,
  AtomMeta,
} from './'
import type { Fn } from '../utils'

/** Autoclearable array of processed events */
export interface ActionState<Params extends any[] = any[], Payload = any>
  extends Array<{ params: Params; payload: Payload }> {}

/** Logic container with atom features */
export interface Action<Params extends any[] = any[], Payload = any>
  extends AtomLike<ActionState<Params, Payload>, Params, Payload> {}

export type GenericAction<T extends Fn> = T &
  Action<Parameters<T>, ReturnType<T>>

let actionMiddleware = (next: Fn, ...params: any[]) => {
  let frame = STACK[STACK.length - 1]!

  frame.pubs = [STACK[STACK.length - 2]!]

  enqueue(() => (frame.state = []), 'cleanup')

  return (frame.state = [...frame.state, { params, payload: next(...params) }])
}

/**
 * Type guard to check if a value is a Reatom action.
 *
 * This function determines whether the given value is an action by checking
 * if it's an atom with non-reactive behavior (actions are non-reactive atoms).
 *
 * @param target - The value to check
 * @returns `true` if the value is a Reatom action, `false` otherwise
 */
export let isAction = (target: unknown): target is Action =>
  isAtom(target) && !target.__reatom.reactive

/**
 * Creates a logic and side effect container.
 *
 * Actions are used to encapsulate complex logic, perform side effects (like API calls),
 * and orchestrate multiple state updates. Unlike atoms, actions are meant to be called
 * with parameters and can return values.
 *
 * Actions also have atom-like features (subscribe, extend) and track their call history.
 *
 * @template Params - The parameter types the action accepts
 * @template Payload - The return type of the action
 * @param cb - The function containing the action's logic
 * @param name - Optional name for debugging purposes
 * @returns An action instance that can be called with the specified parameters
 *
 * @example
 * ```ts
 * // Create an action that fetches data and updates state
 * const fetchUserData = action(async (userId: string) => {
 *   const response = await wrap(fetch(`/api/users/${userId}`))
 *   const data = await wrap(response.json())
 *
 *   // Update state atoms with the fetched data
 *   userName(data.name)
 *   userEmail(data.email)
 *
 *   return data // Actions can return values
 * }, 'fetchUserData')
 *
 * // Call the action
 * fetchUserData('user123')
 * ```
 */
export let action: {
  <Params extends any[] = any[], Payload = any>(
    cb: (...params: Params) => Payload,
    name?: string,
  ): Action<Params, Payload>
  <T extends Fn>(cb: T, name?: string): GenericAction<T>
} = <Params extends any[] = any[], Payload = any>(
  cb: (...params: Params) => Payload,
  name = named('action'),
): Action<Params, Payload> => {
  if (typeof cb !== 'function') {
    throw new ReatomError('function expected')
  }

  let target = createAtom({ initState: [], computed: cb }, name) as Action

  Object.assign(target.__reatom, {
    reactive: false,
    middlewares: [actionMiddleware],
  } satisfies Partial<AtomMeta>)

  return target.extend(...globalThis.__REATOM) as Action<Params, Payload>
}
