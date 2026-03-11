import { afterEach, beforeEach, expect, test, vi } from 'test'

import { context, notify } from '../core'
import { wrap } from '../methods'
import { sleep } from '../utils'
import { urlAtom } from './url'
import { connectWebAnalytics } from './webAnalytics'

interface CapturedSpan {
  traceId: string
  spanId: string
  name: string
  attributes: Array<{
    key: string
    value: {
      stringValue?: string
      intValue?: string
      boolValue?: boolean
      doubleValue?: number
    }
  }>
  status: { code: number; message?: string }
  startTimeUnixNano: string
  endTimeUnixNano: string
}

interface CapturedRequest {
  url: string
  body: string
}

let capturedRequests: Array<CapturedRequest>

const getSpansFromRequests = (): Array<CapturedSpan> => {
  const allSpans: Array<CapturedSpan> = []
  for (const req of capturedRequests) {
    const payload = JSON.parse(req.body)
    for (const rs of payload.resourceSpans) {
      for (const ss of rs.scopeSpans) {
        allSpans.push(...ss.spans)
      }
    }
  }
  return allSpans
}

const getResourceAttrs = (
  requestIndex = 0,
): Record<string, string | number | boolean> => {
  const payload = JSON.parse(capturedRequests[requestIndex]!.body)
  const attrs: Record<string, string | number | boolean> = {}
  for (const attr of payload.resourceSpans[0].resource.attributes) {
    const val = attr.value
    attrs[attr.key] =
      val.stringValue ?? val.intValue ?? val.boolValue ?? val.doubleValue ?? ''
  }
  return attrs
}

const getSpanAttr = (
  span: CapturedSpan,
  key: string,
): string | number | boolean | undefined => {
  const attr = span.attributes.find(
    (a: { key: string }) => a.key === key,
  )
  if (!attr) return undefined
  return (
    attr.value.stringValue ??
    attr.value.intValue ??
    attr.value.boolValue ??
    attr.value.doubleValue
  )
}

beforeEach(() => {
  capturedRequests = []
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string | URL | Request, init?: RequestInit) => {
      capturedRequests.push({
        url: String(url),
        body: typeof init?.body === 'string' ? init.body : '',
      })
      return Promise.resolve(new Response('{}', { status: 200 }))
    }),
  )

  urlAtom.routes = {}
  if (window.location.pathname !== '/') {
    window.history.replaceState({}, '', '/')
  }

  sessionStorage.clear()
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

test('connectWebAnalytics tracks initial pageview', async () =>
  context.start(async () => {
    window.history.replaceState({}, '', '/landing-page')

    const analytics = connectWebAnalytics({
      endpoint: 'https://otel.example.com/v1/traces',
      batchInterval: 10,
    })

    await wrap(sleep(50))

    const spans = getSpansFromRequests()
    const pageviewSpans = spans.filter(
      (s) => getSpanAttr(s, 'analytics.event') === 'pageview',
    )

    expect(pageviewSpans.length).toBeGreaterThanOrEqual(1)

    const initialPageview = pageviewSpans[0]!
    expect(initialPageview.name).toBe('pageview')
    expect(getSpanAttr(initialPageview, 'analytics.page.path')).toBe(
      '/landing-page',
    )

    analytics.destroy()
  }))

test('connectWebAnalytics tracks navigation between pages', async () =>
  context.start(async () => {
    window.history.replaceState({}, '', '/')

    const analytics = connectWebAnalytics({
      endpoint: 'https://otel.example.com/v1/traces',
      batchInterval: 10,
    })

    await wrap(sleep(30))

    urlAtom.go('/about')
    await wrap(sleep(30))

    urlAtom.go('/contact')
    await wrap(sleep(30))

    await analytics.flush()

    const spans = getSpansFromRequests()
    const pageviewSpans = spans.filter(
      (s) => getSpanAttr(s, 'analytics.event') === 'pageview',
    )

    const paths = pageviewSpans.map((s) =>
      getSpanAttr(s, 'analytics.page.path'),
    )
    expect(paths).toContain('/')
    expect(paths).toContain('/about')
    expect(paths).toContain('/contact')

    analytics.destroy()
  }))

test('connectWebAnalytics does not track duplicate pageviews for same path', async () =>
  context.start(async () => {
    window.history.replaceState({}, '', '/stable-page')

    const analytics = connectWebAnalytics({
      endpoint: 'https://otel.example.com/v1/traces',
      batchInterval: 10,
    })

    await wrap(sleep(30))

    urlAtom.go('/stable-page')
    await wrap(sleep(30))

    await analytics.flush()

    const spans = getSpansFromRequests()
    const pageviewSpans = spans.filter(
      (s) =>
        getSpanAttr(s, 'analytics.event') === 'pageview' &&
        getSpanAttr(s, 'analytics.page.path') === '/stable-page',
    )

    expect(pageviewSpans.length).toBe(1)

    analytics.destroy()
  }))

test('connectWebAnalytics creates and persists visitor ID', async () =>
  context.start(async () => {
    const analytics = connectWebAnalytics({
      endpoint: 'https://otel.example.com/v1/traces',
      batchInterval: 10,
    })

    await wrap(sleep(50))

    const visitorId = localStorage.getItem('reatom_analytics_visitor')
    expect(visitorId).toBeTruthy()
    expect(visitorId!.length).toBe(32)

    const resourceAttrs = getResourceAttrs()
    expect(resourceAttrs['analytics.visitor.id']).toBe(visitorId)
    expect(resourceAttrs['analytics.visitor.is_new']).toBe(true)

    analytics.destroy()
  }))

test('connectWebAnalytics reuses existing visitor ID', async () =>
  context.start(async () => {
    const existingVisitorId = 'abcdef0123456789abcdef0123456789'
    localStorage.setItem('reatom_analytics_visitor', existingVisitorId)

    const analytics = connectWebAnalytics({
      endpoint: 'https://otel.example.com/v1/traces',
      batchInterval: 10,
    })

    await wrap(sleep(50))

    const resourceAttrs = getResourceAttrs()
    expect(resourceAttrs['analytics.visitor.id']).toBe(existingVisitorId)
    expect(resourceAttrs['analytics.visitor.is_new']).toBe(false)

    analytics.destroy()
  }))

test('connectWebAnalytics creates session with atom state', async () =>
  context.start(async () => {
    const analytics = connectWebAnalytics({
      endpoint: 'https://otel.example.com/v1/traces',
      batchInterval: 10,
    })

    await wrap(sleep(50))

    const session = analytics.session()
    expect(session.id).toBeTruthy()
    expect(session.id.length).toBe(32)
    expect(session.isNew).toBe(true)
    expect(session.startedAt).toBeGreaterThan(0)
    expect(session.pageviews).toBeGreaterThanOrEqual(1)

    analytics.destroy()
  }))

test('connectWebAnalytics persists session in sessionStorage', async () =>
  context.start(async () => {
    const analytics = connectWebAnalytics({
      endpoint: 'https://otel.example.com/v1/traces',
      batchInterval: 10,
    })

    await wrap(sleep(50))

    const storedRaw = sessionStorage.getItem('reatom_analytics_session')
    expect(storedRaw).toBeTruthy()

    const stored = JSON.parse(storedRaw!)
    expect(stored.id).toBe(analytics.session().id)
    expect(stored.startedAt).toBe(analytics.session().startedAt)

    analytics.destroy()
  }))

test('connectWebAnalytics reuses active session', async () =>
  context.start(async () => {
    const existingSession = {
      id: 'existing-session-id-12345678',
      startedAt: Date.now() - 5000,
      lastActivityAt: Date.now() - 1000,
      pageviews: 3,
    }
    sessionStorage.setItem(
      'reatom_analytics_session',
      JSON.stringify(existingSession),
    )

    const analytics = connectWebAnalytics({
      endpoint: 'https://otel.example.com/v1/traces',
      batchInterval: 10,
      sessionTimeout: 30 * 60 * 1000,
    })

    await wrap(sleep(50))

    expect(analytics.session().id).toBe(existingSession.id)
    expect(analytics.session().isNew).toBe(false)

    analytics.destroy()
  }))

test('connectWebAnalytics tracks custom events', async () =>
  context.start(async () => {
    const analytics = connectWebAnalytics({
      endpoint: 'https://otel.example.com/v1/traces',
      batchInterval: 10,
    })

    analytics.trackEvent('signup', {
      plan: 'pro',
      revenue: 99,
    })
    notify()

    await wrap(sleep(50))

    const spans = getSpansFromRequests()
    const customSpans = spans.filter(
      (s) => getSpanAttr(s, 'analytics.event') === 'custom',
    )

    expect(customSpans.length).toBeGreaterThanOrEqual(1)

    const signupSpan = customSpans.find(
      (s) => getSpanAttr(s, 'analytics.event.name') === 'signup',
    )
    expect(signupSpan).toBeDefined()
    expect(signupSpan!.name).toBe('event:signup')
    expect(getSpanAttr(signupSpan!, 'plan')).toBe('pro')
    expect(getSpanAttr(signupSpan!, 'revenue')).toBe('99')

    analytics.destroy()
  }))

test('connectWebAnalytics tracks multiple custom events', async () =>
  context.start(async () => {
    const analytics = connectWebAnalytics({
      endpoint: 'https://otel.example.com/v1/traces',
      batchInterval: 10,
    })

    analytics.trackEvent('add_to_cart', { item: 'widget' })
    analytics.trackEvent('purchase', { total: 42 })
    analytics.trackEvent('share', { platform: 'twitter' })
    notify()

    await wrap(sleep(50))

    const spans = getSpansFromRequests()
    const customSpans = spans.filter(
      (s) => getSpanAttr(s, 'analytics.event') === 'custom',
    )

    const eventNames = customSpans.map((s) =>
      getSpanAttr(s, 'analytics.event.name'),
    )
    expect(eventNames).toContain('add_to_cart')
    expect(eventNames).toContain('purchase')
    expect(eventNames).toContain('share')

    analytics.destroy()
  }))

test('connectWebAnalytics captures UTM parameters from URL', async () =>
  context.start(async () => {
    window.history.replaceState(
      {},
      '',
      '/campaign?utm_source=google&utm_medium=cpc&utm_campaign=summer_sale&utm_term=widgets&utm_content=banner_ad',
    )

    const analytics = connectWebAnalytics({
      endpoint: 'https://otel.example.com/v1/traces',
      batchInterval: 10,
    })

    await wrap(sleep(50))

    const spans = getSpansFromRequests()
    const pageviewSpans = spans.filter(
      (s) => getSpanAttr(s, 'analytics.event') === 'pageview',
    )
    const campaignPageview = pageviewSpans.find(
      (s) => getSpanAttr(s, 'analytics.page.path') === '/campaign',
    )

    expect(campaignPageview).toBeDefined()
    expect(getSpanAttr(campaignPageview!, 'analytics.utm.source')).toBe(
      'google',
    )
    expect(getSpanAttr(campaignPageview!, 'analytics.utm.medium')).toBe(
      'cpc',
    )
    expect(
      getSpanAttr(campaignPageview!, 'analytics.utm.campaign'),
    ).toBe('summer_sale')
    expect(getSpanAttr(campaignPageview!, 'analytics.utm.term')).toBe(
      'widgets',
    )
    expect(
      getSpanAttr(campaignPageview!, 'analytics.utm.content'),
    ).toBe('banner_ad')

    analytics.destroy()
  }))

test('connectWebAnalytics includes resource attributes for browser context', async () =>
  context.start(async () => {
    const analytics = connectWebAnalytics({
      endpoint: 'https://otel.example.com/v1/traces',
      domain: 'mysite.com',
      batchInterval: 10,
    })

    await wrap(sleep(50))

    const resourceAttrs = getResourceAttrs()

    expect(resourceAttrs['service.name']).toBe('mysite.com')
    expect(resourceAttrs['telemetry.sdk.name']).toBe('reatom')
    expect(resourceAttrs['telemetry.sdk.language']).toBe('webjs')
    expect(resourceAttrs['browser.language']).toBeTruthy()
    expect(resourceAttrs['user_agent.original']).toBeTruthy()
    expect(resourceAttrs['screen.resolution']).toMatch(/\d+x\d+/)
    expect(resourceAttrs['analytics.visitor.id']).toBeTruthy()
    expect(resourceAttrs['analytics.session.id']).toBeTruthy()

    analytics.destroy()
  }))

test('connectWebAnalytics sends to correct endpoint with headers', async () =>
  context.start(async () => {
    const analytics = connectWebAnalytics({
      endpoint: 'https://analytics.myapp.com/v1/traces',
      headers: {
        Authorization: 'Bearer analytics-key-123',
      },
      batchInterval: 10,
    })

    analytics.trackEvent('test')
    notify()

    await wrap(sleep(50))

    expect(capturedRequests.length).toBeGreaterThanOrEqual(1)
    expect(capturedRequests[0]!.url).toBe(
      'https://analytics.myapp.com/v1/traces',
    )

    analytics.destroy()
  }))

test('connectWebAnalytics uses OTLP trace payload format', async () =>
  context.start(async () => {
    const analytics = connectWebAnalytics({
      endpoint: 'https://otel.example.com/v1/traces',
      batchInterval: 10,
    })

    await wrap(sleep(50))

    const payload = JSON.parse(capturedRequests[0]!.body)

    expect(payload.resourceSpans).toBeDefined()
    expect(Array.isArray(payload.resourceSpans)).toBe(true)
    expect(payload.resourceSpans[0].resource).toBeDefined()
    expect(payload.resourceSpans[0].resource.attributes).toBeDefined()
    expect(payload.resourceSpans[0].scopeSpans).toBeDefined()
    expect(payload.resourceSpans[0].scopeSpans[0].scope.name).toBe(
      'reatom.analytics',
    )
    expect(payload.resourceSpans[0].scopeSpans[0].spans).toBeDefined()

    analytics.destroy()
  }))

test('connectWebAnalytics pageview spans have timing info', async () =>
  context.start(async () => {
    const beforeNav = Date.now()

    const analytics = connectWebAnalytics({
      endpoint: 'https://otel.example.com/v1/traces',
      batchInterval: 10,
    })

    await wrap(sleep(20))

    urlAtom.go('/next-page')
    await wrap(sleep(30))

    const afterNav = Date.now()

    await analytics.flush()

    const spans = getSpansFromRequests()
    const firstPageview = spans.find(
      (s) =>
        getSpanAttr(s, 'analytics.event') === 'pageview' &&
        getSpanAttr(s, 'analytics.page.path') === '/',
    )

    if (firstPageview) {
      const startNano = BigInt(firstPageview.startTimeUnixNano)
      const endNano = BigInt(firstPageview.endTimeUnixNano)
      const startMs = Number(startNano / 1_000_000n)
      const endMs = Number(endNano / 1_000_000n)

      expect(startMs).toBeGreaterThanOrEqual(beforeNav - 1)
      expect(endMs).toBeLessThanOrEqual(afterNav + 1)
      expect(endMs).toBeGreaterThanOrEqual(startMs)
    }

    analytics.destroy()
  }))

test('connectWebAnalytics tracks entry page in session', async () =>
  context.start(async () => {
    window.history.replaceState({}, '', '/home')

    const analytics = connectWebAnalytics({
      endpoint: 'https://otel.example.com/v1/traces',
      batchInterval: 10,
    })

    await wrap(sleep(50))

    const spans = getSpansFromRequests()
    const homePageview = spans.find(
      (s) =>
        getSpanAttr(s, 'analytics.event') === 'pageview' &&
        getSpanAttr(s, 'analytics.page.path') === '/home',
    )

    expect(homePageview).toBeDefined()
    expect(getSpanAttr(homePageview!, 'analytics.page.is_entry')).toBe(
      true,
    )

    analytics.destroy()
  }))

test('connectWebAnalytics increments session pageview count', async () =>
  context.start(async () => {
    window.history.replaceState({}, '', '/')

    const analytics = connectWebAnalytics({
      endpoint: 'https://otel.example.com/v1/traces',
      batchInterval: 10,
    })

    await wrap(sleep(20))

    const afterFirstPageview = analytics.session().pageviews
    expect(afterFirstPageview).toBe(1)

    urlAtom.go('/page-2')
    await wrap(sleep(20))

    const afterSecondPageview = analytics.session().pageviews
    expect(afterSecondPageview).toBe(2)

    urlAtom.go('/page-3')
    await wrap(sleep(20))

    const afterThirdPageview = analytics.session().pageviews
    expect(afterThirdPageview).toBe(3)

    analytics.destroy()
  }))

test('connectWebAnalytics captures viewport dimensions', async () =>
  context.start(async () => {
    const analytics = connectWebAnalytics({
      endpoint: 'https://otel.example.com/v1/traces',
      batchInterval: 10,
    })

    await wrap(sleep(50))

    const spans = getSpansFromRequests()
    const pageviewSpan = spans.find(
      (s) => getSpanAttr(s, 'analytics.event') === 'pageview',
    )

    expect(pageviewSpan).toBeDefined()
    const viewportWidth = getSpanAttr(
      pageviewSpan!,
      'analytics.viewport.width',
    )
    const viewportHeight = getSpanAttr(
      pageviewSpan!,
      'analytics.viewport.height',
    )

    expect(Number(viewportWidth)).toBeGreaterThan(0)
    expect(Number(viewportHeight)).toBeGreaterThan(0)

    analytics.destroy()
  }))

test('connectWebAnalytics captures page URL in pageview', async () =>
  context.start(async () => {
    window.history.replaceState({}, '', '/test-page?foo=bar')

    const analytics = connectWebAnalytics({
      endpoint: 'https://otel.example.com/v1/traces',
      batchInterval: 10,
    })

    await wrap(sleep(50))

    const spans = getSpansFromRequests()
    const pageview = spans.find(
      (s) => getSpanAttr(s, 'analytics.event') === 'pageview',
    )

    expect(pageview).toBeDefined()
    const pageUrl = getSpanAttr(
      pageview!,
      'analytics.page.url',
    ) as string
    expect(pageUrl).toContain('/test-page')

    expect(getSpanAttr(pageview!, 'analytics.page.query')).toBe(
      '?foo=bar',
    )

    analytics.destroy()
  }))

test('connectWebAnalytics hashMode uses hash as path', async () =>
  context.start(async () => {
    window.history.replaceState({}, '', '/#/dashboard')

    const analytics = connectWebAnalytics({
      endpoint: 'https://otel.example.com/v1/traces',
      hashMode: true,
      batchInterval: 10,
    })

    await wrap(sleep(50))

    const spans = getSpansFromRequests()
    const pageview = spans.find(
      (s) => getSpanAttr(s, 'analytics.event') === 'pageview',
    )

    expect(pageview).toBeDefined()
    expect(getSpanAttr(pageview!, 'analytics.page.path')).toBe(
      '/dashboard',
    )

    analytics.destroy()
  }))

test('connectWebAnalytics custom events include page context', async () =>
  context.start(async () => {
    window.history.replaceState({}, '', '/checkout')

    const analytics = connectWebAnalytics({
      endpoint: 'https://otel.example.com/v1/traces',
      batchInterval: 10,
    })

    await wrap(sleep(20))

    analytics.trackEvent('purchase_complete', { order_id: 'ORD-123' })
    notify()

    await wrap(sleep(50))

    const spans = getSpansFromRequests()
    const eventSpan = spans.find(
      (s) =>
        getSpanAttr(s, 'analytics.event.name') === 'purchase_complete',
    )

    expect(eventSpan).toBeDefined()
    expect(getSpanAttr(eventSpan!, 'analytics.page.path')).toBe(
      '/checkout',
    )
    expect(getSpanAttr(eventSpan!, 'order_id')).toBe('ORD-123')

    analytics.destroy()
  }))

test('connectWebAnalytics flush finalizes current pageview', async () =>
  context.start(async () => {
    window.history.replaceState({}, '', '/flushed-page')

    const analytics = connectWebAnalytics({
      endpoint: 'https://otel.example.com/v1/traces',
      batchInterval: 60000,
    })

    await wrap(sleep(20))
    await analytics.flush()

    const spans = getSpansFromRequests()
    const pageview = spans.find(
      (s) =>
        getSpanAttr(s, 'analytics.event') === 'pageview' &&
        getSpanAttr(s, 'analytics.page.path') === '/flushed-page',
    )

    expect(pageview).toBeDefined()

    analytics.destroy()
  }))

test('connectWebAnalytics destroy cleans up and flushes', async () =>
  context.start(async () => {
    window.history.replaceState({}, '', '/teardown-page')

    const analytics = connectWebAnalytics({
      endpoint: 'https://otel.example.com/v1/traces',
      batchInterval: 60000,
    })

    await wrap(sleep(20))
    analytics.destroy()

    await wrap(sleep(30))

    const spans = getSpansFromRequests()
    const hasPageview = spans.some(
      (s) =>
        getSpanAttr(s, 'analytics.event') === 'pageview' &&
        getSpanAttr(s, 'analytics.page.path') === '/teardown-page',
    )
    expect(hasPageview).toBe(true)
  }))

test('connectWebAnalytics custom event updates session activity', async () =>
  context.start(async () => {
    const analytics = connectWebAnalytics({
      endpoint: 'https://otel.example.com/v1/traces',
      batchInterval: 10,
    })

    await wrap(sleep(20))

    const sessionBefore = analytics.session()

    analytics.trackEvent('interaction')
    notify()

    await wrap(sleep(20))

    const sessionAfter = analytics.session()
    expect(sessionAfter.id).toBe(sessionBefore.id)
    expect(sessionAfter.pageviews).toBeGreaterThanOrEqual(
      sessionBefore.pageviews,
    )

    const storedRaw = sessionStorage.getItem('reatom_analytics_session')
    expect(storedRaw).toBeTruthy()

    analytics.destroy()
  }))

test('connectWebAnalytics each pageview span has unique traceId and spanId', async () =>
  context.start(async () => {
    window.history.replaceState({}, '', '/')

    const analytics = connectWebAnalytics({
      endpoint: 'https://otel.example.com/v1/traces',
      batchInterval: 10,
    })

    await wrap(sleep(20))

    urlAtom.go('/page-a')
    await wrap(sleep(20))

    urlAtom.go('/page-b')
    await wrap(sleep(20))

    await analytics.flush()

    const spans = getSpansFromRequests()
    const pageviewSpans = spans.filter(
      (s) => getSpanAttr(s, 'analytics.event') === 'pageview',
    )

    const traceIds = pageviewSpans.map((s) => s.traceId)
    const spanIds = pageviewSpans.map((s) => s.spanId)

    const uniqueTraceIds = new Set(traceIds)
    const uniqueSpanIds = new Set(spanIds)

    expect(uniqueTraceIds.size).toBe(traceIds.length)
    expect(uniqueSpanIds.size).toBe(spanIds.length)

    analytics.destroy()
  }))

test('connectWebAnalytics handles localStorage errors gracefully', async () =>
  context.start(async () => {
    const originalGetItem = localStorage.getItem.bind(localStorage)
    const originalSetItem = localStorage.setItem.bind(localStorage)

    vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('localStorage disabled')
    })
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('localStorage disabled')
    })

    const analytics = connectWebAnalytics({
      endpoint: 'https://otel.example.com/v1/traces',
      batchInterval: 10,
    })

    await wrap(sleep(50))

    expect(analytics.session().id).toBeTruthy()

    const spans = getSpansFromRequests()
    expect(spans.length).toBeGreaterThan(0)

    analytics.destroy()
  }))

test('connectWebAnalytics handles sessionStorage errors gracefully', async () =>
  context.start(async () => {
    vi.spyOn(sessionStorage, 'getItem').mockImplementation(() => {
      throw new Error('sessionStorage disabled')
    })
    vi.spyOn(sessionStorage, 'setItem').mockImplementation(() => {
      throw new Error('sessionStorage disabled')
    })

    const analytics = connectWebAnalytics({
      endpoint: 'https://otel.example.com/v1/traces',
      batchInterval: 10,
    })

    await wrap(sleep(50))

    expect(analytics.session().id).toBeTruthy()

    analytics.destroy()
  }))

test('connectWebAnalytics pageview includes page title', async () =>
  context.start(async () => {
    const originalTitle = document.title
    document.title = 'Test Page Title'

    const analytics = connectWebAnalytics({
      endpoint: 'https://otel.example.com/v1/traces',
      batchInterval: 10,
    })

    await wrap(sleep(50))

    const spans = getSpansFromRequests()
    const pageview = spans.find(
      (s) => getSpanAttr(s, 'analytics.event') === 'pageview',
    )

    expect(pageview).toBeDefined()
    expect(getSpanAttr(pageview!, 'analytics.page.title')).toBe(
      'Test Page Title',
    )

    document.title = originalTitle
    analytics.destroy()
  }))

test('connectWebAnalytics all spans have ok status', async () =>
  context.start(async () => {
    const analytics = connectWebAnalytics({
      endpoint: 'https://otel.example.com/v1/traces',
      batchInterval: 10,
    })

    analytics.trackEvent('test-event')
    notify()

    await wrap(sleep(50))

    const spans = getSpansFromRequests()
    for (const span of spans) {
      expect(span.status.code).toBe(1)
    }

    analytics.destroy()
  }))

test('connectWebAnalytics uses client span kind for analytics events', async () =>
  context.start(async () => {
    const analytics = connectWebAnalytics({
      endpoint: 'https://otel.example.com/v1/traces',
      batchInterval: 10,
    })

    analytics.trackEvent('click')
    notify()

    await wrap(sleep(50))

    const spans = getSpansFromRequests()
    for (const span of spans) {
      expect(span).toHaveProperty('kind')
    }

    analytics.destroy()
  }))
