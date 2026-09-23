import type { Action, AtomLike } from '../core'
import { isAction, ReatomError } from '../core'
import { wrap } from '../methods'
import type { OverloadParameters } from '../utils'
import { isObject, type Unsubscribe } from '../utils'
import { withInitHook } from './withInit'

/**
 * WebMCP tool annotations. Every hint defaults to `false` on the platform side.
 *
 * @see https://webmachinelearning.github.io/webmcp/
 */
export interface MCPToolAnnotations {
  readOnlyHint?: boolean
  untrustedContentHint?: boolean
  consequentialHint?: boolean
  debugging?: boolean
}

/** Options passed by WebMCP as the second argument of a tool `execute` callback. */
export interface MCPToolExecuteOptions {
  /** Aborted when the agent cancels this tool invocation. */
  signal: AbortSignal
}

export interface MCPModelContextTool<
  Input extends object = Record<string, unknown>,
  Payload = unknown,
> {
  name: string
  title?: string
  description: string
  inputSchema?: object
  execute(
    input: Input,
    options: MCPToolExecuteOptions,
  ): Payload | Promise<Payload>
  annotations?: MCPToolAnnotations
}

export interface MCPRegisterToolOptions {
  /**
   * Aborting this signal unregisters the tool. In-flight executions are not
   * cancelled.
   */
  signal?: AbortSignal
  /** Secure origins allowed to discover and call the tool. */
  exposedTo?: string[]
}

/**
 * Structural subset of `document.modelContext` used by `withMCP`.
 *
 * @see https://webmachinelearning.github.io/webmcp/
 */
export interface MCPModelContext {
  registerTool<
    Input extends object = Record<string, unknown>,
    Payload = unknown,
  >(
    tool: MCPModelContextTool<Input, Payload>,
    options?: MCPRegisterToolOptions,
  ): Promise<void>
}

/**
 * Configuration for `withMCP`.
 *
 * `signal` and `exposedTo` are used for atom registration and as defaults for
 * `registerMCP` of actions.
 *
 * @template Target - Atom or action being exposed as a WebMCP tool
 * @template Input - Tool input object expected from an agent
 */
export interface WithMCPOptions<
  Target extends AtomLike,
  Input extends object = Record<string, unknown>,
> extends MCPRegisterToolOptions {
  /**
   * Tool name: 1-128 ASCII letters, digits, `_`, `-` or `.`.
   *
   * Defaults to the target name, so unnamed targets (like `atom#1`) need an
   * explicit name.
   */
  name?: string
  /** Optional human-readable tool label. */
  title?: string
  /**
   * Optional natural language description for agent planning.
   *
   * Defaults to a generated generic description with the target name.
   */
  description?: string
  /**
   * Optional JSON Schema for the tool input.
   *
   * Agents rely on this schema to build valid calls, choose appropriate tools,
   * and reduce malformed arguments. In practice, this is one of the most
   * important fields for predictable tool execution.
   */
  inputSchema?: object
  /** Optional agent hints. Atoms default to `readOnlyHint: true`. */
  annotations?: MCPToolAnnotations
  /**
   * Optional static context override.
   *
   * When omitted, registration uses `document.modelContext`.
   */
  modelContext?: MCPModelContext
  /**
   * Whether to register immediately during extension application.
   *
   * Default is `false`. This option applies to actions.
   */
  autoRegister?: boolean
  /**
   * Optional input-to-target args mapper. Receives the `execute` options with
   * the per-call `signal`.
   *
   * Defaults:
   *
   * - Action: call target with `input` as first argument
   * - Atom: call target with no arguments (read current state)
   */
  params?: (
    input: Input,
    options: MCPToolExecuteOptions,
    target: Target,
  ) => OverloadParameters<Target>
}

/**
 * Register-time options for `registerMCP`. Values override the matching
 * `withMCP` options.
 */
export interface RegisterMCPOptions extends MCPRegisterToolOptions {
  modelContext?: MCPModelContext
}

/**
 * Unsubscribe function returned by `registerMCP`. Calling it aborts the
 * registration signal, which unregisters the tool.
 */
export interface MCPRegistration extends Unsubscribe {
  /**
   * The `registerTool` promise. Rejects when the platform refuses the tool, for
   * example on a duplicate name or an already aborted signal.
   */
  ready: Promise<void>
}

/** Extension methods added by `withMCP`. */
export interface MCPExt {
  /** Register a WebMCP tool for this target and return cleanup. */
  registerMCP: (options?: RegisterMCPOptions) => MCPRegistration
}

export interface WithMCPExt<Target extends AtomLike = AtomLike> {
  <T extends Target>(target: T): T extends Action ? MCPExt : T
}

const isMCPModelContext = (candidate: unknown): candidate is MCPModelContext =>
  isObject(candidate) && typeof candidate.registerTool === 'function'

export const getMCPModelContext = (): undefined | MCPModelContext => {
  if (typeof document === 'undefined' || !('modelContext' in document)) {
    return undefined
  }

  const candidate = document.modelContext
  return isMCPModelContext(candidate) ? candidate : undefined
}

const TOOL_NAME_PATTERN = /^[A-Za-z0-9_.-]{1,128}$/

const DEFAULT_DESCRIPTION_PREFIX = 'Use this tool to interact with'

const getDefaultDescription = (target: AtomLike): string =>
  `${DEFAULT_DESCRIPTION_PREFIX} "${target.name}".`

const createNoopRegistration = (): MCPRegistration =>
  Object.assign(() => {}, { ready: Promise.resolve() })

/**
 * Extend atoms and actions with WebMCP tool registration.
 *
 * Tools are registered with `document.modelContext.registerTool()` so in-page
 * browser agents can invoke application behavior through typed tools. `signal`
 * and `exposedTo` are passed as registration options. WebMCP has no
 * `unregisterTool`: every registration owns an `AbortSignal`, and aborting it
 * (by calling the returned unsubscribe or aborting your own `signal`) removes
 * the tool. Unregistration does not cancel in-flight executions.
 *
 * - **Actions**: represent executable behavior.
 * - **Atoms**: represent readable application state snapshots, are registered
 *   automatically on first init via `withInitHook` and default to
 *   `readOnlyHint: true`.
 *
 * By default, action tools call the target with `input` as a single argument,
 * while atom tools return current state by calling the target without
 * arguments. Use `params(input, { signal }, target)` to map the tool input and
 * the per-call `execute` signal to target arguments.
 *
 * Annotations (`readOnlyHint`, `untrustedContentHint`, `consequentialHint`,
 * `debugging`) are passed to the platform as agent hints.
 *
 * Registration for actions is intentionally explicit through `registerMCP()` so
 * scope can be controlled by the app:
 *
 * - Runtime: register in a root route/layout
 * - Tests: register at test start and cleanup with returned unsubscribe
 *
 * `registerTool` is async, so the returned unsubscribe also has a `ready`
 * promise that rejects when registration fails.
 *
 * Tool callbacks are wrapped at registration time with Reatom `wrap`, so calls
 * from agents run inside the reactive context captured by the registration
 * scope.
 *
 * @example
 *   // Marketplace: list of goods atom with explicit MCP options.
 *   const goodsAtom = atom(
 *     [
 *       { id: 'sku-1', title: 'Laptop', price: 1200 },
 *       { id: 'sku-2', title: 'Keyboard', price: 120 },
 *     ],
 *     'marketplace.goods',
 *   ).extend(
 *     withMCP({
 *       name: 'list-goods',
 *       description: 'List currently available goods in the marketplace.',
 *       annotations: { readOnlyHint: true },
 *     }),
 *   )
 *   // Registered automatically on first read.
 *   goodsAtom()
 *
 * @example
 *   // Marketplace: search atom without explicit withMCP options.
 *   const searchAtom = atom('', 'marketplace.search').extend(withMCP({}))
 *   // Registered automatically on first read.
 *   searchAtom()
 *
 * @example
 *   // Marketplace: addToCard action with only description and inputSchema.
 *   const cartAtom = atom<Array<{ goodsId: string; quantity: number }>>(
 *     [],
 *     'cart',
 *   )
 *   const addToCard = action(
 *     (input: { goodsId: string; quantity: number }) => {
 *       cartAtom.set((state) => [...state, input])
 *       return { ok: true }
 *     },
 *     'addToCard',
 *   ).extend(
 *     withMCP({
 *       description: 'Add a goods item to the shopping card.',
 *       inputSchema: {
 *         type: 'object',
 *         properties: {
 *           goodsId: { type: 'string' },
 *           quantity: { type: 'number', minimum: 1 },
 *         },
 *         required: ['goodsId', 'quantity'],
 *       },
 *     }),
 *   )
 *
 *   const unregister = addToCard.registerMCP()
 *   await unregister.ready
 *   // Later cleanup:
 *   unregister()
 *
 * @see https://webmachinelearning.github.io/webmcp/
 * @see https://github.com/webmachinelearning/webmcp
 */
export function withMCP<
  Target extends AtomLike = AtomLike,
  Input extends object = Record<string, unknown>,
>(options: WithMCPOptions<Target, Input>): WithMCPExt<Target> {
  return (<T extends Target>(target: T) => {
    const {
      name = target.name,
      title,
      description,
      inputSchema,
      annotations,
      modelContext,
      signal,
      exposedTo,
      autoRegister = false,
      params,
    } = options

    if (!TOOL_NAME_PATTERN.test(name)) {
      throw new ReatomError(
        `withMCP: invalid tool name "${name}", expected 1-128 ASCII letters, digits, "_", "-" or "." (set the \`name\` option)`,
      )
    }

    if (
      description !== undefined &&
      (typeof description !== 'string' || description === '')
    ) {
      throw new ReatomError(
        'withMCP: `description` should be a non-empty string',
      )
    }

    if (params !== undefined && typeof params !== 'function') {
      throw new ReatomError('withMCP: `params` should be a function')
    }

    const resolveModelContext = (): undefined | MCPModelContext =>
      modelContext ?? getMCPModelContext()

    const toolDescription = description ?? getDefaultDescription(target)
    const toolAnnotations = isAction(target)
      ? annotations
      : { ...annotations, readOnlyHint: annotations?.readOnlyHint ?? true }

    const registerTool = (
      registrationModelContext: MCPModelContext,
      registrationSignal: undefined | AbortSignal,
      registrationExposedTo: undefined | string[],
    ): MCPRegistration => {
      const controller = new AbortController()

      const execute = wrap(
        (input: Input, executeOptions: MCPToolExecuteOptions) => {
          if (params) {
            return target(...params(input, executeOptions, target))
          }
          if (isAction(target)) {
            return target(input)
          }
          return target()
        },
      )

      const ready = registrationModelContext.registerTool(
        {
          name,
          title,
          description: toolDescription,
          inputSchema,
          execute,
          annotations: toolAnnotations,
        } satisfies MCPModelContextTool<Input, Awaited<ReturnType<Target>>>,
        {
          signal: registrationSignal
            ? AbortSignal.any([registrationSignal, controller.signal])
            : controller.signal,
          exposedTo: registrationExposedTo,
        },
      )

      return Object.assign(() => controller.abort(), { ready })
    }

    if (isAction(target)) {
      const registerMCP = (
        registrationOptions: RegisterMCPOptions = {},
      ): MCPRegistration => {
        const registrationModelContext =
          registrationOptions.modelContext ?? resolveModelContext()

        if (registrationModelContext === undefined) {
          return createNoopRegistration()
        }

        return registerTool(
          registrationModelContext,
          registrationOptions.signal ?? signal,
          registrationOptions.exposedTo ?? exposedTo,
        )
      }

      if (autoRegister) {
        registerMCP()
      }

      return {
        registerMCP,
      } as T extends Action ? MCPExt : T
    }

    target.extend(
      withInitHook(() => {
        const registrationModelContext = resolveModelContext()
        if (registrationModelContext === undefined) return
        registerTool(registrationModelContext, signal, exposedTo)
      }),
    )

    return target as T extends Action ? MCPExt : T
  }) as WithMCPExt<Target>
}
