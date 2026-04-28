import type { Frame, GAction } from '../core'
import { action, context, named, ReatomError, top } from '../core'
import type { Fn } from '../utils'
import { identity } from '../utils'

type NonUndefined = NonNullable<unknown> | null

export interface AsyncVariableOptions<
  T extends NonUndefined,
  Params extends any[] = any[],
> {
  name?: string
  defaultValue?: T
  create?: (...params: Params) => T
}

/**
 * Interface for context variables in Reatom
 *
 * Variables maintain values within the context of a computation tree, allowing
 * for context-aware state similar to React's Context API but with more granular
 * control and integration with Reatom's reactive system.
 *
 * @template T - Type of the stored value
 * @see {@link https://github.com/tc39/proposal-async-context?tab=readme-ov-file#asynccontextvariable}
 */
export class Variable<T extends NonUndefined, Params extends any[] = any[]> {
  protected _findReactiveStartIndex = 0

  protected create: (...params: Params) => T

  readonly name: `var#${string}`

  constructor(options?: AsyncVariableOptions<T, Params>) {
    this.name = options?.name ? `var#${options.name}` : named('var')

    this.create = options?.create ?? (identity as Fn)

    this.run = action((value: T, fn: Fn, ...args: any[]) => {
      if (value === undefined) {
        throw new ReatomError('Variable value cannot be undefined')
      }

      top()[this.name] = value

      return fn(...args)
    }, `${this.name}.run`)

    this.createAndRun = action((fn: Fn, ...args: any[]) => {
      top()[this.name] = this.create(...([] as unknown as Params))

      return fn(...args)
    }, `${this.name}.createAndRun`) as typeof this.createAndRun

    this.spawn = action(
      (cb: Fn, ...params: any[]): ReturnType<Fn> => cb(...params),
      `${this.name}.spawn`,
    )
  }

  /**
   * Gets the frame value of the variable. Traverse the whole stack to find it.
   *
   * @param {Frame} [frame] - Optional frame to check (defaults to current top
   *   frame)
   * @returns {T} The current value
   * @throws {Error} If the variable is not found in the frame tree
   */
  get(frame?: Frame): undefined | T {
    return this.find(identity, frame)
  }

  /**
   * Gets the value of the variable and throws an error if it is not found in
   * the frame stack.
   *
   * This method is a stricter version of `get()` that ensures the variable has
   * been set to a value. Use this when you expect the variable to always be
   * defined and want to fail fast if it is not.
   *
   * @param {Frame} [frame] - Optional frame to check (defaults to current top
   *   frame)
   * @returns {T} The current value (guaranteed to be defined)
   * @throws {ReatomError} If the variable is not set (undefined)
   */
  require(frame?: Frame): T {
    let value = this.find(identity, frame)
    if (value === undefined) {
      throw new ReatomError('Variable is not set')
    }
    return value
  }

  /**
   * Executes a callback function with the variable set to a specific value
   * within that execution context
   *
   * This method creates a new frame in the context tree where the variable is
   * bound to the provided value. The callback function runs within this frame,
   * allowing any code inside (and its descendants) to access this value via
   * `get()`.
   *
   * @example
   *   const userVar = variable<string>('user')
   *
   *   userVar.run('Alice', () => {
   *     console.log(userVar.get()) // 'Alice'
   *   })
   *
   *   // Passing parameters to callback
   *   const result = userVar.run('Bob', (x, y) => x + y, 2, 3)
   *   console.log(result) // 5
   *
   * @template Params - Types of parameters passed to the callback
   * @template Payload - Return type of the callback
   * @param {T} value - The value to set for this variable during callback
   *   execution. Cannot be undefined.
   * @param {(...params: Params) => Payload} cb - The callback function to
   *   execute with the variable set
   * @param {...Params} params - Additional parameters to pass to the callback
   * @returns {Payload} The return value of the callback
   * @throws {ReatomError} If value is undefined
   */
  run: GAction<
    <Params extends any[], Payload>(
      value: T,
      cb: (...params: Params) => Payload,
      ...params: Params
    ) => Payload
  >

  /**
   * Runs a callback with an auto-created variable value. Only available when
   * the variable's create function requires no parameters.
   *
   * @example
   *   const loggerVar = variable(() => console, 'logger')
   *
   *   loggerVar.createAndRun(() => {
   *     loggerVar.get()?.log('Hello!') // uses auto-created console
   *   })
   */
  createAndRun: GAction<
    <Params extends any[], Payload>(
      cb: (...params: Params) => Payload,
      ...params: Params
    ) => Payload
  > &
    ([] extends Params ? {} : never)

  /**
   * This utility allow you to start a function which will NOT follow the async
   * context of this variable.
   *
   * @example
   *   // If you want to start a fetch when the atom gets a subscription,
   *   // but don't want to abort the fetch when the subscription is lost to save the data anyway.
   *   const some = atom('...').extend(
   *     withConnectHook((target) => {
   *       abortVar.spawn(async () => {
   *         // here `wrap` doesn't follow the connection abort
   *         const data = await wrap(api.getSome())
   *         some(data)
   *       })
   *     }),
   *   )
   */
  spawn: GAction<
    <Params extends any[], Payload>(
      cb: (...params: Params) => Payload,
      ...params: Params
    ) => Payload
  >

  /**
   * Gets the variable value from the first frame only, without traversing the
   * whole frame tree
   *
   * Unlike `get()` which searches through parent frames, this method only
   * checks the top frame. Returns undefined if the variable is not set in the
   * frame.
   *
   * @returns {undefined | T} The value in the frame, or undefined if not set
   */
  first(frame = top()): undefined | T {
    return frame[this.name] as undefined | T
  }

  /**
   * Checks if the variable exists in the passed frame stack
   *
   * @param {Frame} [frame] - Optional frame to check (defaults to current top
   *   frame)
   * @returns {boolean} True if the variable exists in the context
   */
  has(frame?: Frame): boolean {
    return this.find(undefined, frame) !== undefined
  }

  /**
   * Traverses the frame tree to find and map the variable value.
   *
   * @template Result - Return type of the callback
   * @param {(value: undefined | T) => undefined | Result} [cb] - Optional
   *   transformation callback
   * @param {Frame} [frame] - Optional frame to check (defaults to current top
   *   frame)
   * @returns {undefined | Result} The transformed value or undefined if not
   *   found
   */
  find<Result = T>(
    cb: (payload: undefined | T) => undefined | Result = (payload) =>
      payload as undefined | Result,
    frame = top(),
  ): undefined | Result {
    let result = cb(frame[this.name] as undefined | T)
    if (result !== undefined || frame.atom === this.spawn) return result

    for (
      let i = frame.atom.__reatom.reactive ? this._findReactiveStartIndex : 0;
      i < frame.pubs.length;
      i++
    ) {
      let pub = frame.pubs[i]
      if (pub !== null && pub!.atom !== context) {
        let result = this.find(cb, pub)
        if (result !== undefined) return result
      }
    }

    return undefined
  }

  /**
   * Sets a new variable value for CURRENT frame. Be aware that it is mostly for
   * internal use!
   *
   * @param {...Params} params - Parameters passed to the setter function
   * @returns {T} The new value
   */
  set(...params: Params): T {
    return (top()[this.name] = this.create(...params))
  }
}

/**
 * Creates a new context variable with getter and setter functionality
 *
 * This implementation provides a similar capability to the proposed TC39
 * AsyncContextVariable, allowing you to maintain values that are specific to a
 * particular execution context. Variables created with this function can be
 * accessed and modified within their frame context.
 *
 * Also, it can be used as IoC/DI container replacement:
 *
 * | IoC/DI Concept  | Variable Equivalent             |
 * | --------------- | ------------------------------- |
 * | Token/Key       | `variable<T>('name')`           |
 * | Provider        | `.run(impl, fn)` / `.set(impl)` |
 * | Inject/Resolve  | `.require()` or `.get()`        |
 * | Container scope | Execution context (frame stack) |
 *
 * @example
 *   // Simple variable with string values
 *   const currentUser = variable<string>('currentUser')
 *
 *   // Set the value
 *   currentUser.set('Alice')
 *
 *   // Get the value
 *   console.log(currentUser.get()) // 'Alice'
 *
 *   // Run code with a different value
 *   currentUser.run('Bob', () => {
 *     console.log(currentUser.get()) // 'Bob'
 *   })
 *
 *   // Advanced variable with custom setter logic
 *   const userRole = variable((role: string, permissions: string[]) => {
 *     return { role, permissions }
 *   }, 'userRole')
 *
 *   userRole.set('admin', ['read', 'write', 'delete'])
 *
 * @example
 *   // Using variable as IoC/DI container replacement
 *   // Step 1: Define service interface (DI contract)
 *   interface Logger {
 *     log: (message: string) => void
 *   }
 *
 *   // Step 2: Create a variable as DI token/key
 *   const loggerVar = variable<Logger>('logger')
 *
 *   // Step 3: Inject dependency in atoms/actions via `require()`
 *   const fetchData = action(async (url: string) => {
 *     const logger = loggerVar.require()
 *     logger.log(`Fetching ${url}`)
 *     const response = await wrap(fetch(url))
 *     logger.log(`Fetched ${url}`)
 *     return response.json()
 *   }, 'fetchData')
 *
 *   // Step 4: Provide implementation at application entry point
 *   loggerVar.run(console, () => {
 *     fetchData('/api/users') // uses console as logger
 *   })
 *
 *   // In tests, createAndRun a mock implementation
 *   const mockLogger = { log: vi.fn() }
 *   loggerVar.run(mockLogger, () => {
 *     fetchData('/api/users') // uses mock logger
 *   })
 *
 * @example
 *   // Variable with creation function for lazy initialization
 *   // Useful when the dependency needs configuration or is expensive to create
 *   const dbVar = variable(
 *     (connectionString: string) => new Database(connectionString),
 *     'db',
 *   )
 *
 *   // Inside a main process function, use `.set()` instead of `.run()`
 *   // This is handy when you control the whole feature lifecycle
 *   const initApp = action(async () => {
 *     // `.set()` creates and binds the value to the current frame
 *     const db = dbVar.set(process.env.DATABASE_URL)
 *
 *     // All subsequent calls in this frame can access the db
 *     await loadUsers() // uses dbVar.require() internally
 *     await loadPosts() // uses dbVar.require() internally
 *   }, 'initApp')
 *
 *   const loadUsers = action(async () => {
 *     const db = dbVar.require()
 *     return db.query('SELECT * FROM users')
 *   }, 'loadUsers')
 *
 * @template T - The type of the simple variable (when used with just a name)
 * @template Params - Types of parameters for the setter function
 * @template Payload - The type of the stored value
 * @see {@link https://github.com/tc39/proposal-async-context?tab=readme-ov-file#asynccontextvariable}
 */
// @ts-expect-error TODO
export let variable: {
  <T extends NonUndefined>(name?: string): Variable<T, [T]>

  <Params extends any[], Payload extends NonUndefined>(
    set: (...params: Params) => Payload,
    name?: string,
  ): Variable<Payload, Params>
} = (...options: [string?] | [Fn, string?]) => {
  if (typeof options[0] !== 'function') {
    // @ts-expect-error
    options.unshift(identity)
  }
  let [create, name] = options as [Fn, string?]

  // TODO: Add more reserved names?
  if (name === 'abort') {
    throw new ReatomError('This name is reserved for internal abort variable')
  }

  return new Variable({ create, name })
}
