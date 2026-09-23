import { expect, test, vi } from 'test'

import { action, atom, ReatomError } from '../core'
import { wrap } from '../methods'
import type {
  MCPModelContext,
  MCPModelContextTool,
  MCPToolExecuteOptions,
} from './withMCP'
import { withMCP } from './withMCP'

const createExecuteOptions = (): MCPToolExecuteOptions => ({
  signal: new AbortController().signal,
})

const createModelContext = () => {
  const tools = new Map<string, MCPModelContextTool<object>>()

  const modelContext: MCPModelContext = {
    async registerTool(tool, { signal } = {}) {
      signal?.throwIfAborted()
      if (tools.has(tool.name)) {
        throw new Error(`Tool "${tool.name}" is already registered`)
      }
      tools.set(tool.name, tool)
      signal?.addEventListener('abort', () => tools.delete(tool.name), {
        once: true,
      })
    },
  }

  return {
    modelContext,
    tools,
    registerToolSpy: vi.spyOn(modelContext, 'registerTool'),
  }
}

test('withMCP registers tool and bridges execution to action', async () => {
  const { modelContext, tools, registerToolSpy } = createModelContext()

  const add = action(
    (left: number, right: number) => left + right,
    'add',
  ).extend(
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

  const registration = add.registerMCP()
  await registration.ready
  expect(registerToolSpy).toBeCalledTimes(1)
  const tool = tools.get('add')
  expect(tool).toBeTruthy()

  const payload = await tool!.execute(
    { left: 2, right: 3 },
    createExecuteOptions(),
  )
  expect(payload).toBe(5)

  const registrationSignal = registerToolSpy.mock.calls[0]?.[1]?.signal
  expect(registrationSignal?.aborted).toBe(false)

  registration()
  expect(registrationSignal?.aborted).toBe(true)
  expect(tools.has('add')).toBe(false)
})

test('withMCP duplicate registration rejects ready', async () => {
  const { modelContext, tools, registerToolSpy } = createModelContext()

  const ping = action(() => 'pong', 'ping').extend(
    withMCP({
      modelContext,
    }),
  )

  const first = ping.registerMCP()
  await wrap(first.ready)

  const second = ping.registerMCP()
  await expect(second.ready).rejects.toThrow(
    'Tool "ping" is already registered',
  )
  expect(registerToolSpy).toBeCalledTimes(2)

  second()
  expect(tools.has('ping')).toBe(true)

  first()
  expect(tools.has('ping')).toBe(false)
})

test('withMCP can auto-register tool on extension setup', () => {
  const { modelContext, registerToolSpy } = createModelContext()

  const ping = action(() => 'pong', 'ping').extend(
    withMCP({
      autoRegister: true,
      modelContext,
    }),
  )

  expect(registerToolSpy).toBeCalledTimes(1)
  expect(typeof ping.registerMCP).toBe('function')
})

test('withMCP registration without modelContext returns noop unsubscribe', async () => {
  const ping = action(() => 'pong', 'ping').extend(withMCP({}))

  const registration = ping.registerMCP()
  await expect(registration.ready).resolves.toBeUndefined()
  expect(registration()).toBeUndefined()
})

test('withMCP default action params forward input as first argument', async () => {
  const { modelContext, tools } = createModelContext()

  const echo = action((input: { text: string }) => input.text, 'echo').extend(
    withMCP({ modelContext }),
  )

  const registration = echo.registerMCP()
  const tool = tools.get('echo')
  expect(tool).toBeTruthy()
  const result = await tool!.execute({ text: 'hello' }, createExecuteOptions())

  expect(result).toBe('hello')
  registration()
})

test('withMCP params receives execute options signal', async () => {
  const { modelContext, tools } = createModelContext()
  let receivedSignal: undefined | AbortSignal

  const echo = action((text: string) => text, 'echo').extend(
    withMCP({
      modelContext,
      params: (input: { text: string }, { signal }) => {
        receivedSignal = signal
        return [input.text]
      },
    }),
  )

  const registration = echo.registerMCP()
  const executeOptions = createExecuteOptions()
  const result = await tools
    .get('echo')!
    .execute({ text: 'hi' }, executeOptions)

  expect(result).toBe('hi')
  expect(receivedSignal).toBe(executeOptions.signal)
  registration()
})

test('withMCP supports atoms as state-reading tools', async () => {
  const { modelContext, tools, registerToolSpy } = createModelContext()

  const user = atom({ id: 'u1', role: 'admin' }, 'user').extend(
    withMCP({ modelContext }),
  )

  expect('registerMCP' in user).toBe(false)
  user()
  await Promise.resolve()

  expect(registerToolSpy).toBeCalledTimes(1)
  const tool = tools.get('user')
  expect(tool).toBeTruthy()
  expect(tool!.annotations?.readOnlyHint).toBe(true)
  const state = await tool!.execute({}, createExecuteOptions())

  expect(state).toEqual({ id: 'u1', role: 'admin' })
})

test('withMCP merges annotations over the atom readOnlyHint default', async () => {
  const { modelContext, tools } = createModelContext()

  const hintedAtom = atom(1, 'hintedAtom').extend(
    withMCP({ modelContext, annotations: { untrustedContentHint: true } }),
  )
  const writableAtom = atom(2, 'writableAtom').extend(
    withMCP({ modelContext, annotations: { readOnlyHint: false } }),
  )
  const doSome = action(() => 'ok', 'doSome').extend(withMCP({ modelContext }))

  hintedAtom()
  writableAtom()
  const registration = doSome.registerMCP()
  await Promise.resolve()

  expect(tools.get('hintedAtom')?.annotations).toEqual({
    readOnlyHint: true,
    untrustedContentHint: true,
  })
  expect(tools.get('writableAtom')?.annotations?.readOnlyHint).toBe(false)
  expect(tools.get('doSome')?.annotations).toBeUndefined()

  registration()
})

test('withMCP description has meaningful defaults for actions and atoms', async () => {
  const { modelContext, tools } = createModelContext()

  const doSome = action(() => 'ok', 'doSome').extend(withMCP({ modelContext }))
  const stateAtom = atom({ ok: true }, 'stateAtom').extend(
    withMCP({ modelContext }),
  )

  const registration = doSome.registerMCP()
  stateAtom()
  await Promise.resolve()

  const actionToolDescription = tools.get('doSome')?.description
  const atomToolDescription = tools.get('stateAtom')?.description

  expect(actionToolDescription).toBe('Use this tool to interact with "doSome".')
  expect(atomToolDescription).toBe(
    'Use this tool to interact with "stateAtom".',
  )

  registration()
})

test('withMCP allows register-time modelContext override', async () => {
  const { modelContext, tools } = createModelContext()

  const ping = action(() => 'pong', 'ping').extend(withMCP({}))

  const registration = ping.registerMCP({ modelContext })
  await registration.ready
  const tool = tools.get('ping')

  expect(tool).toBeTruthy()
  expect(await tool!.execute({}, createExecuteOptions())).toBe('pong')

  registration()
})

test('withMCP combines caller signal and prefers register-time options', async () => {
  const { modelContext, tools, registerToolSpy } = createModelContext()

  const ping = action(() => 'pong', 'ping').extend(
    withMCP({ modelContext, exposedTo: ['https://default.example'] }),
  )

  const controller = new AbortController()
  const registration = ping.registerMCP({
    signal: controller.signal,
    exposedTo: ['https://agent.example'],
  })
  await wrap(registration.ready)

  const registerOptions = registerToolSpy.mock.calls[0]?.[1]
  expect(registerOptions?.exposedTo).toEqual(['https://agent.example'])

  controller.abort()
  expect(registerOptions?.signal?.aborted).toBe(true)
  expect(tools.has('ping')).toBe(false)

  const next = ping.registerMCP()
  await next.ready
  expect(registerToolSpy.mock.calls[1]?.[1]?.exposedTo).toEqual([
    'https://default.example',
  ])
  next()
})

test('withMCP rejects ready with the reason of an aborted signal', async () => {
  const { modelContext, tools } = createModelContext()

  const ping = action(() => 'pong', 'ping').extend(withMCP({ modelContext }))

  const reason = new Error('stop')
  const registration = ping.registerMCP({ signal: AbortSignal.abort(reason) })

  await expect(registration.ready).rejects.toBe(reason)
  expect(tools.has('ping')).toBe(false)
})

test('withMCP atom registration uses static signal and exposedTo', async () => {
  const { modelContext, tools, registerToolSpy } = createModelContext()
  const controller = new AbortController()

  const counter = atom(0, 'counter').extend(
    withMCP({
      modelContext,
      signal: controller.signal,
      exposedTo: ['https://agent.example'],
    }),
  )

  counter()
  await Promise.resolve()

  expect(registerToolSpy.mock.calls[0]?.[1]?.exposedTo).toEqual([
    'https://agent.example',
  ])
  expect(tools.has('counter')).toBe(true)

  controller.abort()
  expect(tools.has('counter')).toBe(false)
})

test('withMCP unregistration does not cancel in-flight execution', async () => {
  const { modelContext, tools } = createModelContext()
  const { promise, resolve } = Promise.withResolvers<string>()

  const load = action(() => promise, 'load').extend(withMCP({ modelContext }))

  const registration = load.registerMCP()
  await registration.ready

  const pending = tools.get('load')!.execute({}, createExecuteOptions())
  registration()
  expect(tools.has('load')).toBe(false)

  resolve('done')
  expect(await pending).toBe('done')
})

test('withMCP throws ReatomError for invalid tool names on extension', () => {
  const { modelContext, registerToolSpy } = createModelContext()

  expect(() =>
    action(() => 'ok', 'bad name').extend(withMCP({ modelContext })),
  ).toThrow(ReatomError)
  expect(() => atom(0).extend(withMCP({ modelContext }))).toThrow(
    'invalid tool name',
  )
  expect(() =>
    action(() => 'ok', 'ok').extend(
      withMCP({ name: 'x'.repeat(129), modelContext }),
    ),
  ).toThrow(ReatomError)
  expect(() =>
    action(() => 'ok', 'ok').extend(withMCP({ name: '', modelContext })),
  ).toThrow(ReatomError)

  expect(registerToolSpy).toBeCalledTimes(0)
})
