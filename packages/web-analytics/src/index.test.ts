import { test, expect, vi, beforeEach } from 'vitest'

import { connectWebAnalytics } from './index'

const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn()
}

const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn()
}

beforeEach(() => {
  vi.clearAllMocks()
  
  global.document = {
    title: 'Test Title',
    referrer: 'https://example.com',
    visibilityState: 'visible',
    hasFocus: () => true,
    addEventListener: vi.fn(),
  } as any

  global.window = {
    location: {
      href: 'https://example.com/page?utm_source=test',
      pathname: '/page',
      search: '?utm_source=test',
      hash: '',
    },
    localStorage: localStorageMock,
    sessionStorage: sessionStorageMock,
    addEventListener: vi.fn(),
    innerWidth: 1024,
    innerHeight: 768,
    screen: {
      width: 1920,
      height: 1080,
    },
    history: {
      pushState: vi.fn(),
      replaceState: vi.fn()
    }
  } as any

  Object.defineProperty(global, 'navigator', {
    value: { onLine: true },
    writable: true,
    configurable: true
  })

  localStorageMock.getItem.mockImplementation((key) => {
    if (key === 'reatom_visitor_id') return 'mock-visitor-123'
    return null
  })

  sessionStorageMock.getItem.mockImplementation((key) => {
    if (key === 'reatom_session_id') return 'mock-session-456'
    if (key === 'reatom_session_count') return '1'
    return null
  })
})

test('connectWebAnalytics initializes correctly', () => {
  const withOTelMock = vi.fn((opts) => (target: any) => target)

  const analytics = connectWebAnalytics({ withOTel: withOTelMock as any })

  expect(analytics.trackEvent).toBeDefined()
  expect(analytics.urlAtom).toBeDefined()
  expect(analytics.visibilityAtom).toBeDefined()
  expect(analytics.onlineAtom).toBeDefined()
  expect(analytics.focusAtom).toBeDefined()
  expect(analytics.visitorAtom).toBeDefined()
  expect(analytics.sessionAtom).toBeDefined()
  expect(analytics.metadataAtom).toBeDefined()
  expect(analytics.contextAtom).toBeDefined()
  expect(analytics.utmAtom).toBeDefined()
  expect(analytics.pageView).toBeDefined()

  expect(withOTelMock).toHaveBeenCalledWith({ kind: 'client' })
})

test('visitorAtom and sessionAtom fetch values from storage', () => {
  const withOTelMock = vi.fn((opts) => (target: any) => target)
  const analytics = connectWebAnalytics({ withOTel: withOTelMock as any })

  const visitor = analytics.visitorAtom()
  expect(visitor).toBe('mock-visitor-123')

  const session = analytics.sessionAtom()
  expect(session.id).toBe('mock-session-456')
  expect(session.count).toBe(1)
})
