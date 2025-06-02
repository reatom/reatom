import type { Frame } from '../core'
import { action, context, named, ReatomError, top } from '../core'
import type { Fn } from '../utils'
import { assert, identity } from '../utils'

/**
 * Interface for context variables in Reatom
 *
 * Variables maintain values within the context of a computation tree,
 * allowing for context-aware state similar to React's Context API but
 * with more granular control and integration with Reatom's reactive system.
 *
 * @template Params - Types of parameters accepted by the setter function
 * @template Payload - Type of the stored value
 */
export interface Variable<Params extends any[] = any[], Payload = any> {
  /**
   * Gets the current value of the variable
   *
   * @param {Frame} [frame] - Optional frame to check (defaults to current top frame)
   * @returns {Payload} The current value
   * @throws {Error} If the variable is not found in the frame tree
   */
  get(frame?: Frame): Payload

  /**
   * Sets a new value for the variable
   *
   * @param {...Params} params - Parameters passed to the setter function
   * @returns {Payload} The new value
   */
  set(...params: Params): Payload

  /**
   * Checks if the variable exists in the current stack
   *
   * @param {Frame} [frame] - Optional frame to check (defaults to current top frame)
   * @returns {boolean} True if the variable exists in the context
   */
  has(frame?: Frame): boolean

  /**
   * Traverses the frame tree to find and map the variable value.
   *
   * @template T - Return type of the callback
   * @param {(value: undefined | Payload) => undefined | T} [cb] - Optional transformation callback
   * @param {Frame} [frame] - Optional frame to check (defaults to current top frame)
   * @returns {undefined | T} The transformed value or undefined if not found
   */
  find<T = Payload>(
    cb?: (value: undefined | Payload) => undefined | T,
    frame?: Frame,
  ): undefined | T

  /**
   * Runs a function with new variable value
   *
   * @template T - Return type of the function
   * @param {Payload} value - The temporary value to set
   * @param {() => T} fn - Function to execute with the temporary value
   * @returns {T} The result of the function
   */
  run<T>(value: Payload, fn: () => T): T
}

/**
 * Creates a new context variable with getter and setter functionality
 *
 * This implementation provides a similar capability to the proposed TC39 AsyncContextVariable,
 * allowing you to maintain values that are specific to a particular execution context.
 * Variables created with this function can be accessed and modified within their frame context.
 *
 * @see {@link https://github.com/tc39/proposal-async-context?tab=readme-ov-file#asynccontextvariable}
 *
 * @template T - The type of the simple variable (when used with just a name)
 * @template Params - Types of parameters for the setter function
 * @template Payload - The type of the stored value
 *
 * @example
 * ```ts
 * // Simple variable with string values
 * const currentUser = variable<string>('currentUser');
 *
 * // Set the value
 * currentUser.set('Alice');
 *
 * // Get the value
 * console.log(currentUser.get()); // 'Alice'
 *
 * // Run code with a different value
 * currentUser.run('Bob', () => {
 *   console.log(currentUser.get()); // 'Bob'
 * });
 *
 * // Advanced variable with custom setter logic
 * const userRole = variable((role: string, permissions: string[]) => {
 *   return { role, permissions };
 * }, 'userRole');
 *
 * userRole.set('admin', ['read', 'write', 'delete']);
 * ```
 */
export let variable: {
  <T>(name?: string): Variable<[T], T>

  <Params extends any[], Payload>(
    set: (...params: Params) => Payload,
    name?: string,
  ): Variable<Params, Payload>
} = (...options: [string?] | [Fn, string?]) => {
  if (typeof options[0] !== 'function') {
    // @ts-expect-error
    options.unshift(identity)
  }
  let [set, name = named('var')] = options as [Fn, string?]

  let key = {}

  let find = <T>(
    cb: (payload: undefined | unknown) => undefined | T = (payload) =>
      payload as undefined | T,
    frame = top(),
    meta = frame.root.variables,
  ): undefined | T => {
    let result = cb(meta.get(frame)?.get(key))
    if (result !== undefined) return result

    for (let i = 0; i < frame.pubs.length; i++) {
      let pub = frame.pubs[i]
      if (pub !== null && pub!.atom !== context) {
        let result = find(cb, pub, meta)
        if (result !== undefined) return result
      }
    }

    return undefined
  }

  let write = (value: any, frame = top()) => {
    if (value === undefined) {
      throw new ReatomError('Variable value cannot be undefined')
    }
    let recs = frame.root.variables.get(frame)
    if (!recs) frame.root.variables.set(frame, (recs = new WeakMap()))
    recs.set(key, value)
  }

  let run = action((value, cb: Fn) => {
    write(value)

    return cb()
  }, name)

  return {
    get(frame?: Frame) {
      let value = find(identity, frame)

      assert(value !== undefined, 'Variable not found')

      return value
    },
    set(...params: [any, ...any[]]) {
      let value = set(...params)

      write(value)

      return value
    },
    has(frame?: Frame) {
      return find(identity, frame) !== undefined
    },
    find,
    run,
  }
}
