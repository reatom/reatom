import type { Action, AssignerExt } from '../core'
import { isAction, ReatomError } from '../core'
import type { OverloadParameters } from '../utils'
import { isObject } from '../utils'

export interface MCPToolAnnotations {
  readOnlyHint?: boolean
}

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

export interface WithMCPOptions<
  Target extends Action,
  Input extends object = Record<string, unknown>,
> {
  name?: string
  description: string
  inputSchema?: object
  annotations?: MCPToolAnnotations
  modelContext?: MCPModelContext
  autoRegister?: boolean
  params: (
    input: Input,
    client: MCPModelContextClient,
    target: Target,
  ) => OverloadParameters<Target>
}

export interface MCPExt<
  Input extends object = Record<string, unknown>,
  Payload = unknown,
> {
  mcpTool: MCPModelContextTool<Input, Payload>
  registerMCPTool: () => boolean
  unregisterMCPTool: () => boolean
  isMCPToolRegistered: () => boolean
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

export const withMCP =
  <Target extends Action, Input extends object = Record<string, unknown>>(
    options: WithMCPOptions<Target, Input>,
  ): AssignerExt<MCPExt<Input, Awaited<ReturnType<Target>>>, Target> =>
  (target) => {
    if (!isAction(target)) {
      throw new ReatomError('withMCP can be used only with actions')
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

    if (typeof description !== 'string') {
      throw new ReatomError('withMCP: `description` should be a string')
    }

    if (typeof params !== 'function') {
      throw new ReatomError('withMCP: `params` should be a function')
    }

    let activeModelContext: undefined | MCPModelContext

    const resolveModelContext = (): undefined | MCPModelContext =>
      modelContext ?? getMCPModelContext()

    const mcpTool: MCPModelContextTool<
      Input,
      Awaited<ReturnType<Target>>
    > = {
      name,
      description,
      inputSchema,
      execute: async (input, client) => {
        const callParams = params(input, client, target)
        return await target(...callParams)
      },
      annotations,
    }

    const registerMCPTool = (): boolean => {
      if (activeModelContext !== undefined) return false

      const nextModelContext = resolveModelContext()
      if (nextModelContext === undefined) return false

      nextModelContext.registerTool(mcpTool)
      activeModelContext = nextModelContext
      return true
    }

    const unregisterMCPTool = (): boolean => {
      if (activeModelContext === undefined) return false

      activeModelContext.unregisterTool(mcpTool.name)
      activeModelContext = undefined
      return true
    }

    if (autoRegister) {
      registerMCPTool()
    }

    return {
      mcpTool,
      registerMCPTool,
      unregisterMCPTool,
      isMCPToolRegistered: () => activeModelContext !== undefined,
    }
  }
