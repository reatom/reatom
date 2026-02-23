import { expect, test, vi } from 'test'

import { action, atom } from '../core'
import type {
  MCPModelContext,
  MCPModelContextClient,
  MCPModelContextTool,
} from './withMCP'
import { withMCP } from './withMCP'

const client: MCPModelContextClient = {
  requestUserInteraction: async (callback) => await callback(),
}

const createModelContext = () => {
  const tools = new Map<string, MCPModelContextTool>()

  const modelContext: MCPModelContext = {
    provideContext(options = {}) {
      tools.clear()
      for (const tool of options.tools ?? []) {
        tools.set(tool.name, tool)
      }
    },
    registerTool(tool) {
      if (tools.has(tool.name)) {
        throw new Error(`Tool "${tool.name}" is already registered`)
      }
      tools.set(tool.name, tool)
    },
    unregisterTool(name) {
      tools.delete(name)
    },
  }

  return {
    modelContext,
    tools,
    registerToolSpy: vi.spyOn(modelContext, 'registerTool'),
    unregisterToolSpy: vi.spyOn(modelContext, 'unregisterTool'),
  }
}

test('withMCP registers tool and bridges execution to action', async () => {
  const { modelContext, tools, registerToolSpy, unregisterToolSpy } =
    createModelContext()

  const add = action((left: number, right: number) => left + right, 'add').extend(
    withMCP({
      description: 'Add two numbers',
      inputSchema: {
        type: 'object',
        properties: {
          left: { type: 'number' },
          right: { type: 'number' },
        },
        required: ['left', 'right'],
      },
      modelContext,
      params: ({ left, right }: { left: number; right: number }) => [
        left,
        right,
      ],
    }),
  )

  expect(add.registerMCPTool()).toBe(true)
  expect(add.registerMCPTool()).toBe(false)
  expect(add.isMCPToolRegistered()).toBe(true)
  expect(registerToolSpy).toBeCalledTimes(1)
  expect(tools.get('add')).toBe(add.mcpTool)

  const payload = await add.mcpTool.execute({ left: 2, right: 3 }, client)
  expect(payload).toBe(5)

  expect(add.unregisterMCPTool()).toBe(true)
  expect(add.unregisterMCPTool()).toBe(false)
  expect(add.isMCPToolRegistered()).toBe(false)
  expect(unregisterToolSpy).toBeCalledTimes(1)
  expect(unregisterToolSpy).toBeCalledWith('add')
})

test('withMCP can auto-register tool on extension setup', () => {
  const { modelContext, registerToolSpy } = createModelContext()

  const ping = action(() => 'pong', 'ping').extend(
    withMCP({
      description: 'Returns pong',
      autoRegister: true,
      modelContext,
      params: () => [],
    }),
  )

  expect(registerToolSpy).toBeCalledTimes(1)
  expect(ping.isMCPToolRegistered()).toBe(true)
})

test('withMCP registration returns false without modelContext', () => {
  const ping = action(() => 'pong', 'ping').extend(
    withMCP({
      description: 'Returns pong',
      params: () => [],
    }),
  )

  expect(ping.registerMCPTool()).toBe(false)
  expect(ping.unregisterMCPTool()).toBe(false)
  expect(ping.isMCPToolRegistered()).toBe(false)
})

test('withMCP throws when applied to atom', () => {
  const count = atom(0, 'count')

  expect(() =>
    // @ts-expect-error withMCP should be applied only to actions
    count.extend(
      withMCP({
        description: 'invalid',
        params: () => [],
      }),
    ),
  ).toThrow('withMCP can be used only with actions')
})
