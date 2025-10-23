import { afterEach, beforeEach } from 'vitest'


// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  url: string
  protocols: string[]
  readyState: number = MockWebSocket.CONNECTING
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  private listeners: Map<string, Set<(event: any) => void>> = new Map()

  constructor(url: string, protocols: string[] = []) {
    this.url = url
    this.protocols = protocols
    
    // Simulate async connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      this.dispatchEvent(new Event('open'))
    }, 10)
  }

  addEventListener(type: string, listener: (event: any) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    this.listeners.get(type)!.add(listener)
  }

  removeEventListener(type: string, listener: (event: any) => void) {
    this.listeners.get(type)?.delete(listener)
  }

  dispatchEvent(event: Event) {
    const listeners = this.listeners.get(event.type)
    if (listeners) {
      listeners.forEach(listener => listener(event))
    }
    
    // Also call direct event handlers
    if (event.type === 'open' && this.onopen) {
      this.onopen(event)
    } else if (event.type === 'message' && this.onmessage) {
      this.onmessage(event as MessageEvent)
    } else if (event.type === 'close' && this.onclose) {
      this.onclose(event as CloseEvent)
    } else if (event.type === 'error' && this.onerror) {
      this.onerror(event)
    }
  }

  send(data: string | ArrayBuffer | Blob | ArrayBufferView) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open')
    }
    // Echo the message back for testing
    setTimeout(() => {
      this.dispatchEvent(new MessageEvent('message', { data }))
    }, 5)
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSING
    setTimeout(() => {
      this.readyState = MockWebSocket.CLOSED
      this.dispatchEvent(new CloseEvent('close', { code, reason }))
    }, 5)
  }

  // Helper methods for testing
  simulateMessage(data: any) {
    this.dispatchEvent(new MessageEvent('message', { data }))
  }

  simulateError() {
    this.dispatchEvent(new Event('error'))
  }

  simulateClose(code?: number, reason?: string) {
    this.close(code, reason)
  }
}

// Replace global WebSocket with mock
const originalWebSocket = globalThis.WebSocket
beforeEach(() => {
  globalThis.WebSocket = MockWebSocket as any
})

afterEach(() => {
  globalThis.WebSocket = originalWebSocket
})

// describe('reatomWebSocket', () => {
//   test('basic API', async () => {
//     const wsAtom = reatomWebSocket('ws://localhost:8080')
    
//     return context.start(async () => {
//       // Initial state
//       expect(wsAtom.readyState()).toBe('CLOSED')
//       expect(wsAtom.isConnected()).toBe(false)
//       expect(wsAtom.isConnecting()).toBe(false)
//       expect(wsAtom.socket()).toBe(null)
//       expect(wsAtom()).toEqual([])
      
//       // Connect
//       await wsAtom.connect()
      
//       expect(wsAtom.readyState()).toBe('OPEN')
//       expect(wsAtom.isConnected()).toBe(true)
//       expect(wsAtom.isConnecting()).toBe(false)
//       expect(wsAtom.socket()).toBeTruthy()
//       expect(wsAtom.connectedAt()).toBeTruthy()
      
//       // Send message
//       wsAtom.send('Hello, WebSocket!')
      
//       // Wait for echo
//       await wrap(sleep(20))
      
//       const messages = wsAtom()
//       expect(messages).toHaveLength(1)
//       expect(messages[0]?.data).toBe('Hello, WebSocket!')
//       expect(messages[0]?.type).toBe('message')
//       expect(messages[0]?.timestamp).toBeTruthy()
      
//       expect(wsAtom.latestMessage()).toBe(messages[0])
      
//       // Disconnect
//       wsAtom.disconnect()
      
//       await wrap(sleep(20))
      
//       expect(wsAtom.readyState()).toBe('CLOSED')
//       expect(wsAtom.isConnected()).toBe(false)
//       expect(wsAtom.socket()).toBe(null)
//       expect(wsAtom.closedAt()).toBeTruthy()
//     })
//   })

//   test('sendJson', async () => {
//     const wsAtom = reatomWebSocket('ws://localhost:8080')
    
//     return context.start(async () => {
//       await wsAtom.connect()
      
//       const testData = { type: 'test', value: 42 }
//       wsAtom.sendJson(testData)
      
//       await wrap(sleep(20))
      
//       const messages = wsAtom()
//       expect(messages).toHaveLength(1)
//       expect(messages[0]?.data).toEqual(testData)
//       expect(messages[0]?.type).toBe('message')
//     })
//   })

//   test('message history management', async () => {
//     const wsAtom = reatomWebSocket({
//       url: 'ws://localhost:8080',
//       maxMessages: 3
//     })
    
//     return context.start(async () => {
//       await wsAtom.connect()
      
//       // Send multiple messages
//       for (let i = 0; i < 5; i++) {
//         wsAtom.send(`Message ${i}`)
//         await wrap(sleep(10))
//       }
      
//       const messages = wsAtom()
//       expect(messages).toHaveLength(3) // Should keep only last 3
//       expect(messages[0]?.data).toBe('Message 2')
//       expect(messages[1]?.data).toBe('Message 3')
//       expect(messages[2]?.data).toBe('Message 4')
      
//       // Clear messages
//       wsAtom.clearMessages()
//       expect(wsAtom()).toEqual([])
//       expect(wsAtom.latestMessage()).toBe(null)
//     })
//   })

//   test('custom message parser', async () => {
//     const wsAtom = reatomWebSocket({
//       url: 'ws://localhost:8080',
//       messageParser: (data) => `Parsed: ${data}`
//     })
    
//     return context.start(async () => {
//       await wsAtom.connect()
      
//       wsAtom.send('raw message')
//       await wrap(sleep(20))
      
//       const messages = wsAtom()
//       expect(messages).toHaveLength(1)
//       expect(messages[0]?.data).toBe('Parsed: raw message')
//     })
//   })

//   test('error handling', async () => {
//     const wsAtom = reatomWebSocket('ws://localhost:8080')
    
//     return context.start(async () => {
//       await wsAtom.connect()
      
//       // Simulate error
//       const mockSocket = wsAtom.socket() as any
//       mockSocket.simulateError()
      
//       await wrap(sleep(20))
      
//       expect(wsAtom.error()).toBeTruthy()
//       expect(wsAtom.error()?.message).toContain('WebSocket error')
      
//       // Clear error
//       wsAtom.clearError()
//       expect(wsAtom.error()).toBe(null)
//     })
//   })

//   test('auto-reconnect', async () => {
//     const wsAtom = reatomWebSocket({
//       url: 'ws://localhost:8080',
//       autoReconnect: true,
//       reconnectDelay: 50,
//       maxReconnectAttempts: 2
//     })
    
//     return context.start(async () => {
//       await wsAtom.connect()
//       expect(wsAtom.isConnected()).toBe(true)
      
//       // Simulate connection loss
//       const mockSocket = wsAtom.socket() as any
//       mockSocket.simulateClose()
      
//       await wrap(sleep(20))
//       expect(wsAtom.isConnected()).toBe(false)
//       expect(wsAtom.reconnectAttempts()).toBe(0)
      
//       // Wait for reconnect attempt
//       await wrap(sleep(100))
      
//       expect(wsAtom.reconnectAttempts()).toBe(1)
//     })
//   })

//   test('manual reconnect', async () => {
//     const wsAtom = reatomWebSocket('ws://localhost:8080')
    
//     return context.start(async () => {
//       await wsAtom.connect()
//       expect(wsAtom.isConnected()).toBe(true)
      
//       wsAtom.disconnect()
//       await wrap(sleep(20))
//       expect(wsAtom.isConnected()).toBe(false)
      
//       // Manual reconnect
//       await wsAtom.reconnect()
//       expect(wsAtom.isConnected()).toBe(true)
//     })
//   })

//   test('connection failure', async () => {
//     // Mock WebSocket that fails to connect
//     class FailingWebSocket extends MockWebSocket {
//       constructor(url: string, protocols: string[] = []) {
//         super(url, protocols)
        
//         setTimeout(() => {
//           this.dispatchEvent(new Event('error'))
//         }, 5)
//       }
//     }
    
//     globalThis.WebSocket = FailingWebSocket as any
    
//     const wsAtom = reatomWebSocket('ws://invalid-url')
    
//     return context.start(async () => {
//       await expect(wsAtom.connect()).rejects.toThrow('Failed to connect to WebSocket')
      
//       expect(wsAtom.readyState()).toBe('CLOSED')
//       expect(wsAtom.isConnected()).toBe(false)
//       expect(wsAtom.error()).toBeTruthy()
//     })
//   })

//   test('send without connection throws error', async () => {
//     const wsAtom = reatomWebSocket('ws://localhost:8080')
    
//     return context.start(async () => {
//       expect(() => wsAtom.send('test')).toThrow('WebSocket is not connected')
//       expect(() => wsAtom.sendJson({ test: true })).toThrow('WebSocket is not connected')
//     })
//   })

//   test('protocols configuration', async () => {
//     const protocols = ['protocol1', 'protocol2']
//     const wsAtom = reatomWebSocket({
//       url: 'ws://localhost:8080',
//       protocols
//     })
    
//     return context.start(async () => {
//       expect(wsAtom.protocols()).toEqual(protocols)
      
//       await wsAtom.connect()
      
//       const socket = wsAtom.socket() as any
//       expect(socket.protocols).toEqual(protocols)
//     })
//   })

//   test('URL configuration', async () => {
//     const wsAtom = reatomWebSocket('ws://localhost:8080')
    
//     return context.start(async () => {
//       expect(wsAtom.url()).toBe('ws://localhost:8080')
      
//       // Change URL
//       wsAtom.url.set('ws://localhost:9090')
//       expect(wsAtom.url()).toBe('ws://localhost:9090')
//     })
//   })

//   test('auto-reconnect configuration', async () => {
//     const wsAtom = reatomWebSocket({
//       url: 'ws://localhost:8080',
//       autoReconnect: false
//     })
    
//     return context.start(async () => {
//       expect(wsAtom.autoReconnect()).toBe(false)
      
//       // Enable auto-reconnect
//       wsAtom.autoReconnect.set(true)
//       expect(wsAtom.autoReconnect()).toBe(true)
//     })
//   })

//   test('connection lifecycle timestamps', async () => {
//     const wsAtom = reatomWebSocket('ws://localhost:8080')
    
//     return context.start(async () => {
//       expect(wsAtom.connectedAt()).toBe(null)
//       expect(wsAtom.closedAt()).toBe(null)
      
//       const beforeConnect = Date.now()
//       await wsAtom.connect()
//       const afterConnect = Date.now()
      
//       const connectedAt = wsAtom.connectedAt()
//       expect(connectedAt).toBeTruthy()
//       if (connectedAt) {
//         expect(connectedAt).toBeGreaterThanOrEqual(beforeConnect)
//         expect(connectedAt).toBeLessThanOrEqual(afterConnect)
//       }
      
//       const beforeDisconnect = Date.now()
//       wsAtom.disconnect()
//       await wrap(sleep(20))
//       const afterDisconnect = Date.now()
      
//       const closedAt = wsAtom.closedAt()
//       expect(closedAt).toBeTruthy()
//       if (closedAt) {
//         expect(closedAt).toBeGreaterThanOrEqual(beforeDisconnect)
//         expect(closedAt).toBeLessThanOrEqual(afterDisconnect)
//       }
//     })
//   })

//   test('message parsing error handling', async () => {
//     const wsAtom = reatomWebSocket({
//       url: 'ws://localhost:8080',
//       messageParser: (data) => {
//         if (data === 'invalid') {
//           throw new Error('Parse error')
//         }
//         return JSON.parse(data)
//       }
//     })
    
//     return context.start(async () => {
//       await wsAtom.connect()
      
//       // Send invalid message
//       const mockSocket = wsAtom.socket() as any
//       mockSocket.simulateMessage('invalid')
      
//       await wrap(sleep(20))
      
//       expect(wsAtom.error()).toBeTruthy()
//       expect(wsAtom.error()?.message).toBe('Parse error')
      
//       const messages = wsAtom()
//       expect(messages).toHaveLength(1)
//       expect(messages[0]?.type).toBe('error')
//       expect(messages[0]?.data).toBe('invalid')
//     })
//   })
// }) 
