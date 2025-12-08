import { atom, action, Ctx, Action, AtomMut, Atom } from '@reatom/core'
import { onConnect } from '@reatom/hooks'
import { onCtxAbort } from '@reatom/effects'
import { onEvent } from './event'

export type WebSocketReadyState = 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED'

export type WebSocketMessage<T = unknown> = {
  data: T
  timestamp: number
  type: 'message' | 'error'
}

type WebSocketStrategy =
  | { type: 'fixed' }
  | { type: 'exponential'; maxDelayMs?: number }
  | { type: 'exponentialJitter'; maxDelayMs?: number }

export interface WebSocketAtom<T = any> extends AtomMut<Array<WebSocketMessage<T>>> {
  /** Current connection state */
  readyState: AtomMut<WebSocketReadyState>
  /** Current WebSocket instance (null if not connected) */
  socket: AtomMut<WebSocket | null>
  /** Connection URL */
  url: AtomMut<string>
  /** Connection protocols */
  protocols: AtomMut<Array<string>>
  /** Auto-reconnect enabled */
  autoReconnect: AtomMut<boolean>
  /** Reconnect attempts count */
  reconnectAttempts: AtomMut<number>
  /** Last error */
  error: AtomMut<Error | null>
  /** Connection established timestamp */
  connectedAt: AtomMut<number | null>
  /** Connection closed timestamp */
  closedAt: AtomMut<number | null>
  /** Whether currently connected */
  isConnected: Atom<boolean>
  /** Whether currently connecting */
  isConnecting: Atom<boolean>
  /** Latest message */
  latestMessage: Atom<WebSocketMessage<T> | null>

  /** Connect to WebSocket */
  connect: Action<[], Promise<void>>
  /** Disconnect from WebSocket */
  disconnect: Action<[code?: number, reason?: string], void>
  /** Send message */
  send: Action<[data: string | ArrayBuffer | Blob | ArrayBufferView], void>
  /** Send JSON message */
  sendJson: Action<[data: any], void>
  /** Clear message history */
  clearMessages: Action<[], void>
  /** Clear errors */
  clearError: Action<[], void>
  /** Force reconnect */
  reconnect: Action<[], Promise<void>>
}

function getReconnectDelay(
  strategy: WebSocketStrategy,
  reconnectDelay: number,
  reconnectAttemptsCount: number,
): number {
  if (strategy.type === 'exponential') {
    let delay = reconnectDelay * Math.pow(2, reconnectAttemptsCount - 1)

    if (strategy.maxDelayMs && delay > strategy.maxDelayMs) {
      delay = strategy.maxDelayMs
    }
    return delay
  }

  if (strategy.type === 'exponentialJitter') {
    let delay =
      reconnectDelay * Math.pow(2, reconnectAttemptsCount - 1) +
      Math.random() * 100

    if (strategy.maxDelayMs && delay > strategy.maxDelayMs) {
      delay = strategy.maxDelayMs
    }
    return delay
  }

  return reconnectDelay
}

export interface WebSocketOptions {
  /** WebSocket URL */
  url: string
  /** WebSocket protocols */
  protocols?: Array<string>
  /** Auto-reconnect on connection loss */
  autoReconnect?: boolean
  /** Reconnect delay in milliseconds */
  reconnectDelay?: number
  /** Maximum reconnect attempts (0 for infinite) */
  maxReconnectAttempts?: number
  /** Strategy for reconnect delay calculation */
  strategy?: WebSocketStrategy
  /** Maximum number of messages to keep in history */
  maxMessages?: number
  /** Message parser function */
  messageParser?: (data: any) => any
  /** Debug name for the WebSocket instance */
  name?: string
}

export function reatomWebSocket<T = unknown>(options: WebSocketOptions | string) {
  const {
    url,
    protocols = [],
    autoReconnect = true,
    reconnectDelay = 1000,
    strategy = { type: 'fixed' },
    maxReconnectAttempts = 5,
    maxMessages = 100,
    messageParser = (data: unknown) => {
      try {
        return JSON.parse(data as string)
      } catch {
        return data
      }
    },
    name = 'webSocketAtom',
  } = typeof options === 'string' ? { url: options } : options

  // Core state atoms
  const messagesAtom = atom<WebSocketMessage<T>[]>([], `${name}.messages`)
  const readyState = atom<WebSocketReadyState>('CLOSED', `${name}.readyState`)
  const socket = atom<WebSocket | null>(null, `${name}.socket`)
  const urlAtom = atom(url, `${name}.url`)
  const protocolsAtom = atom(protocols, `${name}.protocols`)
  const autoReconnectAtom = atom(autoReconnect, `${name}.autoReconnect`)
  const reconnectAttempts = atom<number>(0, `${name}.reconnectAttempts`)
  const error = atom<Error | null>(null, `${name}.error`)
  const connectedAt = atom<number | null>(null, `${name}.connectedAt`)
  const closedAt = atom<number | null>(null, `${name}.closedAt`)

  // Computed atoms
  const isConnected = atom(
    (ctx) => ctx.spy(readyState) === 'OPEN',
    `${name}.isConnected`,
  )
  const isConnecting = atom(
    (ctx) => ctx.spy(readyState) === 'CONNECTING',
    `${name}.isConnecting`,
  )
  const latestMessage = atom((ctx) => {
    const messages = ctx.spy(messagesAtom)

    return messages.length > 0 ? messages[messages.length - 1] : null
  }, `${name}.latestMessage`)

  // Internal state for reconnection logic
  let reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null
  let reconnectAttemptsCount = 0

  // Helper to add a message with maxMessages limit
  function addMessage(ctx: Ctx, message: WebSocketMessage<T>) {
    const prev = ctx.get(messagesAtom)

    const newMessages = [...prev, message]

    messagesAtom(
      ctx,
      newMessages.length > maxMessages
        ? newMessages.slice(-maxMessages)
        : newMessages,
    )
  }

  // Actions
  const connect = action((ctx) => {
    // Close previous socket if any
    const prevSocket = ctx.get(socket)

    if (prevSocket && prevSocket.readyState !== WebSocket.CLOSED) {
      prevSocket.close()
    }
    // Clear the reconnect timeout before setting a new one
    if (reconnectTimeoutId) {
      clearTimeout(reconnectTimeoutId)
      reconnectTimeoutId = null
    }
    readyState(ctx, 'CONNECTING')
    error(ctx, null)

    const ws = new WebSocket(ctx.get(urlAtom), ctx.get(protocolsAtom))

    socket(ctx, ws)

    onEvent(ctx, ws, 'open', () => {
      readyState(ctx, 'OPEN')
      connectedAt(ctx, Date.now())
      reconnectAttempts(ctx, 0)
      reconnectAttemptsCount = 0
      error(ctx, null)
    })
    onEvent(ctx, ws, 'message', (event) => {
      try {
        const parsedData = messageParser(event.data)

        addMessage(ctx, {
          data: parsedData as T,
          timestamp: Date.now(),
          type: 'message',
        })
      } catch (err) {
        error(ctx, err instanceof Error ? err : new Error(String(err)))
        addMessage(ctx, {
          data: event.data as T,
          timestamp: Date.now(),
          type: 'error',
        })
      }
    })
    onEvent(ctx, ws, 'close', () => {
      readyState(ctx, 'CLOSED')
      closedAt(ctx, Date.now())
      socket(ctx, null)

      if (
        ctx.get(autoReconnectAtom) &&
        (maxReconnectAttempts === 0 ||
          reconnectAttemptsCount < maxReconnectAttempts)
      ) {
        reconnectAttemptsCount++
        reconnectAttempts(ctx, reconnectAttemptsCount)
        if (reconnectTimeoutId) {
          clearTimeout(reconnectTimeoutId)
        }
        const delay = getReconnectDelay(
          strategy,
          reconnectDelay,
          reconnectAttemptsCount,
        )

        reconnectTimeoutId = setTimeout(() => {
          if (ctx.get(autoReconnectAtom)) {
            connect(ctx)
          }
        }, delay)
      }
    })
    onEvent(ctx, ws, 'error', (event) => {
      const err = new Error(`WebSocket error: ${event.type}`)

      error(ctx, err)
      addMessage(ctx, {
        data: err.message as T,
        timestamp: Date.now(),
        type: 'error',
      })
    })
    onCtxAbort(ctx, () => {
      ws.close()
      socket(ctx, null)
      if (reconnectTimeoutId) {
        clearTimeout(reconnectTimeoutId)
        reconnectTimeoutId = null
      }
    })
  }, `${name}.connect`)

  const disconnect = action(
    (ctx: Ctx, ...args: [code?: number, reason?: string]) => {
      const [code, reason] = args
      const ws = ctx.get(socket)

      if (ws && ws.readyState !== WebSocket.CLOSED) {
        ws.close(code, reason)
      }
      socket(ctx, null)
      readyState(ctx, 'CLOSED')
      reconnectAttempts(ctx, 0)
      reconnectAttemptsCount = 0
      if (reconnectTimeoutId) {
        clearTimeout(reconnectTimeoutId)
        reconnectTimeoutId = null
      }
    },
    `${name}.disconnect`,
  )

  const send = action(
    (ctx: Ctx, data: string | ArrayBuffer | Blob | ArrayBufferView) => {
      const ws = ctx.get(socket)

      if (!ws || ws.readyState !== WebSocket.OPEN) {
        throw new Error(
          `WebSocket is not connected (current state: ${ws?.readyState ?? 'null'})`,
        )
      }
      ws.send(data)
    },
    `${name}.send`,
  )

  const sendJson = action((ctx: Ctx, data: unknown) => {
    send(ctx, JSON.stringify(data))
  }, `${name}.sendJson`)

  const clearMessages = action((ctx: Ctx) => {
    messagesAtom(ctx, [])
  }, `${name}.clearMessages`)

  const clearError = action((ctx: Ctx) => {
    error(ctx, null)
  }, `${name}.clearError`)

  const reconnect = action(async (ctx: Ctx) => {
    disconnect(ctx)
    connect(ctx)
  }, `${name}.reconnect`)

  // Auto-connect on atom usage
  onConnect(socket, connect)

  // Return the atom with all properties and actions attached
  return Object.assign(messagesAtom, {
    readyState,
    socket,
    url: urlAtom,
    protocols: protocolsAtom,
    autoReconnect: autoReconnectAtom,
    reconnectAttempts,
    error,
    connectedAt,
    closedAt,
    isConnected,
    isConnecting,
    latestMessage,
    connect,
    disconnect,
    send,
    sendJson,
    clearMessages,
    clearError,
    reconnect,
  })
}
