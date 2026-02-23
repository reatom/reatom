import type { AssignerExt, AtomLike } from '../core'
import { isAction, isAtom, ReatomError } from '../core'
import { wrap } from '../methods'
import type { OverloadParameters } from '../utils'
import { isObject, noop, type Unsubscribe } from '../utils'

export interface MCPToolAnnotations {
  readOnlyHint?: boolean
}

/**
 * Minimal client object passed by WebMCP to a tool execution callback.
 *
 * @see https://github.com/webmachinelearning/webmcp
 */
export interface MCPModelContextClient {
  requestUserInteraction<Result>(
    callback: () => Result | Promise<Result>,
  ): Promise<Result>
}

export interface MCPModelContextTool<
  Input extends object = Record<string, unknown>,
  Payload = unknown,
> {
  name: string
  description: string
  inputSchema?: object
  execute: (input: Input, client: MCPModelContextClient) => Payload | Promise<Payload>
  annotations?: MCPToolAnnotations
}

export interface MCPModelContextOptions {
  tools?: Array<MCPModelContextTool>
}

export interface MCPModelContext {
  provideContext(options?: MCPModelContextOptions): void
  registerTool(tool: MCPModelContextTool): void
  unregisterTool(name: string): void
}

/**
 * Configuration for `withMCP`.
 *
 * @template Target - Atom or action being exposed as a WebMCP tool
 * @template Input - Tool input object expected from an agent
 */
export interface WithMCPOptions<
  Target extends AtomLike,
  Input extends object = Record<string, unknown>,
> {
  name?: string
  /**
   * Optional natural language description for agent planning.
   *
   * Defaults to a generated value based on the target type:
   *
   * - action: "Run application logic through action ...".
   * - atom: "Read application state through atom ...".
   */
  description?: string
  inputSchema?: object
  annotations?: MCPToolAnnotations
  /**
   * Optional static context override.
   *
   * When omitted, `registerMCP` tries `navigator.modelContext`.
   */
  modelContext?: MCPModelContext
  /**
   * Whether to register immediately during extension application.
   *
   * Default is `false`.
   */
  autoRegister?: boolean
  /**
   * Optional input-to-target args mapper.
   *
   * Defaults:
   *
   * - action: call target with `input` as first argument
   * - atom: call target with no arguments (read current state)
   */
  params?: (
    input: Input,
    client: MCPModelContextClient,
    target: Target,
  ) => OverloadParameters<Target>
}

export interface RegisterMCPOptions {
  modelContext?: MCPModelContext
}

/**
 * Extension methods added by `withMCP`.
 */
export interface MCPExt {
  /**
   * Register a WebMCP tool for this target and return cleanup.
   *
   * Multiple registrations in the same model context are reference-counted and
   * a tool is removed only after the last returned unsubscribe is called.
   */
  registerMCP: (options?: RegisterMCPOptions) => Unsubscribe
}

const isMCPModelContext = (candidate: unknown): candidate is MCPModelContext => {
  if (!isObject(candidate)) return false

  const provideContext = Reflect.get(candidate, 'provideContext')
  const registerTool = Reflect.get(candidate, 'registerTool')
  const unregisterTool = Reflect.get(candidate, 'unregisterTool')

  return (
    typeof provideContext === 'function' &&
    typeof registerTool === 'function' &&
    typeof unregisterTool === 'function'
  )
}

export const getMCPModelContext = (): undefined | MCPModelContext => {
  if (typeof navigator === 'undefined') return undefined

  const candidate = Reflect.get(navigator, 'modelContext')
  return isMCPModelContext(candidate) ? candidate : undefined
}

const ACTION_DESCRIPTION_PREFIX = 'Run application logic through action'
const ATOM_DESCRIPTION_PREFIX = 'Read application state through atom'

const getDefaultDescription = (target: AtomLike): string =>
  isAction(target)
    ? `${ACTION_DESCRIPTION_PREFIX} "${target.name}".`
    : `${ATOM_DESCRIPTION_PREFIX} "${target.name}".`

/**
 * Extend atoms and actions with WebMCP tool registration.
 *
 * This extension maps Reatom entities to the WebMCP draft shape
 * (`navigator.modelContext.registerTool`) so browser agents can invoke
 * application behavior through typed tools.
 *
 * - **Actions**: represent executable behavior.
 * - **Atoms**: represent readable application state snapshots.
 *
 * By default, action tools call the target with `input` as a single argument,
 * while atom tools return current state by calling the target without
 * arguments.
 *
 * Registration is intentionally explicit through `registerMCP()` so scope can
 * be controlled by the app:
 *
 * - runtime: register in a root route/layout
 * - tests: register at test start and cleanup with returned unsubscribe
 *
 * The tool callback is wrapped at registration time with Reatom `wrap`, so
 * calls from agents run inside the same reactive context captured by that
 * registration scope.
 *
 * @see https://github.com/webmachinelearning/webmcp
 * @see https://modelcontextprotocol.io/specification/latest
 *
 * @example
 *   // Action tool with default input forwarding.
 *   const addTodo = action((input: { text: string }) => {
 *     todosAtom.set((state) => [...state, input.text])
 *     return { ok: true }
 *   }, 'addTodo').extend(
 *     withMCP({
 *       description: 'Create a todo item',
 *       inputSchema: {
 *         type: 'object',
 *         properties: { text: { type: 'string' } },
 *         required: ['text'],
 *       },
 *     }),
 *   )
 *
 *   const unregister = addTodo.registerMCP()
 *   // ...
 *   unregister()
 *
 * @example
 *   // Atom tool exposing current state.
 *   const sessionAtom = atom({ userId: 'u1', role: 'admin' }, 'session').extend(
 *     withMCP({
 *       description: 'Get active session snapshot',
 *       annotations: { readOnlyHint: true },
 *     }),
 *   )
 *
 *   const unregister = sessionAtom.registerMCP()
 *   // Later cleanup:
 *   unregister()
 *
 * @example
 *   // Action tool with custom param mapping.
 *   const add = action((left: number, right: number) => left + right, 'add').extend(
 *     withMCP({
 *       description: 'Add two numbers',
 *       params: ({ left, right }: { left: number; right: number }) => [
 *         left,
 *         right,
 *       ],
 *     }),
 *   )
 */
export const withMCP =
  <Target extends AtomLike, Input extends object = Record<string, unknown>>(
    options: WithMCPOptions<Target, Input>,
  ): AssignerExt<MCPExt, Target> =>
  (target) => {
    if (!isAtom(target)) {
      throw new ReatomError('withMCP can be used only with atoms or actions')
    }

    const {
      name = target.name,
      description,
      inputSchema,
      annotations,
      modelContext,
      autoRegister = false,
      params,
    } = options

    if (description !== undefined && typeof description !== 'string') {
      throw new ReatomError('withMCP: `description` should be a string')
    }

    if (params !== undefined && typeof params !== 'function') {
      throw new ReatomError('withMCP: `params` should be a function')
    }

    const registrations = new Map<MCPModelContext, number>()

    const resolveModelContext = (): undefined | MCPModelContext =>
      modelContext ?? getMCPModelContext()

    const toolDescription = description ?? getDefaultDescription(target)
    const toolName = name

    const registerMCP = (
      registrationOptions: RegisterMCPOptions = {},
    ): Unsubscribe => {
      const registrationModelContext =
        registrationOptions.modelContext ?? resolveModelContext()

      if (registrationModelContext === undefined) return noop

      const currentCount = registrations.get(registrationModelContext) ?? 0

      if (currentCount === 0) {
        const execute = wrap(
          async (input: Input, client: MCPModelContextClient) => {
            if (params) {
              return await target(...params(input, client, target))
            }
            if (isAction(target)) {
              return await target(input)
            }
            return await target()
          },
        )

        registrationModelContext.registerTool({
          name: toolName,
          description: toolDescription,
          inputSchema,
          execute,
          annotations,
        } satisfies MCPModelContextTool<Input, Awaited<ReturnType<Target>>>)
      }

      registrations.set(registrationModelContext, currentCount + 1)

      let isRegistered = true
      return () => {
        if (!isRegistered) return
        isRegistered = false

        const value = registrations.get(registrationModelContext)
        if (value === undefined) return

        if (value <= 1) {
          registrations.delete(registrationModelContext)
          registrationModelContext.unregisterTool(toolName)
          return
        }

        registrations.set(registrationModelContext, value - 1)
      }
    }

    if (autoRegister) {
      registerMCP()
    }

    return {
      registerMCP,
    }
  }
