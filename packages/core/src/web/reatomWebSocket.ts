import type { Action, Atom } from '../core'
import { action, atom, computed, named } from '../core'
import { abortVar, wrap } from '../methods'
import { withConnectHook } from '../mixins'
import type { Unsubscribe } from '../utils'
import { onEvent } from './onEvent'

export type WebSocketReadyState = 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED'

export interface WebSocketMessage<T = any> {
  data: T
  timestamp: number
  type: 'message' | 'error'
}

export interface WebSocketAtom<T = any>
  extends Atom<Array<WebSocketMessage<T>>> {
  /** Current connection state */
  readyState: Atom<WebSocketReadyState>
  /** Current WebSocket instance (null if not connected) */
  socket: Atom<WebSocket | null>
  /** Connection URL */
  url: Atom<string>
  /** Connection protocols */
  protocols: Atom<Array<string>>
  /** Auto-reconnect enabled */
  autoReconnect: Atom<boolean>
  /** Reconnect attempts count */
  reconnectAttempts: Atom<number>
  /** Last error */
  error: Atom<Error | null>
  /** Connection established timestamp */
  connectedAt: Atom<number | null>
  /** Connection closed timestamp */
  closedAt: Atom<number | null>
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
  /** Maximum number of messages to keep in history */
  maxMessages?: number
  /** Message parser function */
  messageParser?: (data: any) => any
  /** Debug name for the WebSocket instance */
  name?: string
}

export const reatomWebSocket = <T = any>(
  options: WebSocketOptions | string,
): WebSocketAtom<T> => {
  const {
    url,
    protocols = [],
    autoReconnect = true,
    reconnectDelay = 1000,
    maxReconnectAttempts = 5,
    maxMessages = 100,
    messageParser = (data: any) => {
      try {
        return JSON.parse(data)
      } catch {
        return data
      }
    },
    name = named('webSocketAtom'),
  } = typeof options === 'string' ? { url: options } : options

  // Core state atoms
  const messagesAtom = atom<Array<WebSocketMessage<T>>>([], `${name}.messages`)
  const readyState = atom<WebSocketReadyState>('CLOSED', `${name}.readyState`)
  const socket = atom<WebSocket | null>(null, `${name}.socket`)
  const urlAtom = atom(url, `${name}.url`)
  const protocolsAtom = atom(protocols, `${name}.protocols`)
  const autoReconnectAtom = atom(autoReconnect, `${name}.autoReconnect`)
  const reconnectAttempts = atom(0, `${name}.reconnectAttempts`)
  const error = atom<Error | null>(null, `${name}.error`)
  const connectedAt = atom<number | null>(null, `${name}.connectedAt`)
  const closedAt = atom<number | null>(null, `${name}.closedAt`)

  // Computed atoms
  const isConnected = computed(
    () => readyState() === 'OPEN',
    `${name}.isConnected`,
  )

  const isConnecting = computed(
    () => readyState() === 'CONNECTING',
    `${name}.isConnecting`,
  )

  const latestMessage = computed(() => {
    const messages = messagesAtom()
    return messages.length > 0 ? messages[messages.length - 1] : null
  }, `${name}.latestMessage`)

  // Internal state
  let reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null
  let reconnectAttemptsCount = 0

  // Helper function to add message to history
  const addMessage = (message: WebSocketMessage<T>) => {
    messagesAtom.set((prev) => {
      const newMessages = [...prev, message]
      return newMessages.length > maxMessages
        ? newMessages.slice(-maxMessages)
        : newMessages
    })
  }

  // Helper function to update ready state
  const updateReadyState = (ws: WebSocket | null) => {
    if (!ws) {
      readyState.set('CLOSED')
      return
    }

    switch (ws.readyState) {
      case WebSocket.CONNECTING:
        readyState.set('CONNECTING')
        break
      case WebSocket.OPEN:
        readyState.set('OPEN')
        break
      case WebSocket.CLOSING:
        readyState.set('CLOSING')
        break
      case WebSocket.CLOSED:
        readyState.set('CLOSED')
        break
    }
  }

  // Helper function to setup WebSocket event listeners
  const setupSocketListeners = (ws: WebSocket): Unsubscribe => {
    const unsubscribes: Unsubscribe[] = []

    // Connection opened
    unsubscribes.push(
      onEvent(ws, 'open', () => {
        updateReadyState(ws)
        connectedAt.set(Date.now())
        reconnectAttemptsCount = 0
        reconnectAttempts.set(0)
        error.set(null)
      }),
    )

    // Message received
    unsubscribes.push(
      onEvent(ws, 'message', (event) => {
        try {
          const parsedData = messageParser(event.data)
          addMessage({
            data: parsedData,
            timestamp: Date.now(),
            type: 'message',
          })
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err : new Error(String(err))
          error.set(errorMessage)
          addMessage({
            data: event.data,
            timestamp: Date.now(),
            type: 'error',
          })
        }
      }),
    )

    // Connection closed
    unsubscribes.push(
      onEvent(ws, 'close', () => {
        updateReadyState(ws)
        closedAt.set(Date.now())
        socket.set(null)

        // Auto-reconnect logic
        if (autoReconnectAtom() && !abortVar.find()) {
          if (
            maxReconnectAttempts === 0 ||
            reconnectAttemptsCount < maxReconnectAttempts
          ) {
            reconnectAttemptsCount++
            reconnectAttempts.set(reconnectAttemptsCount)

            if (reconnectTimeoutId) {
              clearTimeout(reconnectTimeoutId)
            }

            reconnectTimeoutId = setTimeout(() => {
              if (autoReconnectAtom() && !abortVar.find()) {
                connect()
              }
            }, reconnectDelay)
          }
        }
      }),
    )

    // Connection error
    unsubscribes.push(
      onEvent(ws, 'error', (event) => {
        const err = new Error(`WebSocket error: ${event.type}`)
        error.set(err)
        addMessage({
          data: err.message as T,
          timestamp: Date.now(),
          type: 'error',
        })
      }),
    )

    return () => {
      unsubscribes.forEach((unsub) => unsub())
    }
  }

  // Actions
  const connect = action(async () => {
    // Close existing connection
    const existingSocket = socket()
    if (existingSocket && existingSocket.readyState !== WebSocket.CLOSED) {
      existingSocket.close()
    }

    // Clear reconnect timeout
    if (reconnectTimeoutId) {
      clearTimeout(reconnectTimeoutId)
      reconnectTimeoutId = null
    }

    try {
      const ws = new WebSocket(urlAtom(), protocolsAtom())
      socket.set(ws)
      updateReadyState(ws)

      // Setup event listeners
      const unsubscribe = setupSocketListeners(ws)

      // Clean up on abort
      abortVar.subscribe(() => {
        unsubscribe()
        if (ws.readyState !== WebSocket.CLOSED) {
          ws.close()
        }
      })

      // Wait for connection to open or fail
      await wrap(
        new Promise<void>((resolve, reject) => {
          const handleOpen = () => {
            ws.removeEventListener('open', handleOpen)
            ws.removeEventListener('error', handleError)
            resolve()
          }

          const handleError = (event: Event) => {
            ws.removeEventListener('open', handleOpen)
            ws.removeEventListener('error', handleError)
            reject(new Error(`Failed to connect to WebSocket: ${event.type}`))
          }

          ws.addEventListener('open', handleOpen)
          ws.addEventListener('error', handleError)
        }),
      )
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      error.set(errorObj)
      readyState.set('CLOSED')
      socket.set(null)
      throw errorObj
    }
  }, `${name}.connect`)

  const disconnect = action((code?: number, reason?: string) => {
    const ws = socket()
    if (ws && ws.readyState !== WebSocket.CLOSED) {
      ws.close(code, reason)
    }

    // Clear reconnect timeout
    if (reconnectTimeoutId) {
      clearTimeout(reconnectTimeoutId)
      reconnectTimeoutId = null
    }

    // Reset reconnect attempts
    reconnectAttemptsCount = 0
    reconnectAttempts.set(0)
  }, `${name}.disconnect`)

  const send = action((data: string | ArrayBuffer | Blob | ArrayBufferView) => {
    const ws = socket()
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected')
    }
    ws.send(data)
  }, `${name}.send`)

  const sendJson = action((data: any) => {
    send(JSON.stringify(data))
  }, `${name}.sendJson`)

  const clearMessages = action(() => {
    messagesAtom.set([])
  }, `${name}.clearMessages`)

  const clearError = action(() => {
    error.set(null)
  }, `${name}.clearError`)

  const reconnectAction = action(async () => {
    disconnect()
    await connect()
  }, `${name}.reconnect`)

  // Create the main atom that extends the messages atom
  const webSocketAtom = Object.assign(messagesAtom, {
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
    reconnect: reconnectAction,
  }) as WebSocketAtom<T>

  // Add connection hook for cleanup
  webSocketAtom.extend(
    withConnectHook(() => {
      return () => {
        disconnect()
        if (reconnectTimeoutId) {
          clearTimeout(reconnectTimeoutId)
          reconnectTimeoutId = null
        }
      }
    }),
  )

  return webSocketAtom
}
