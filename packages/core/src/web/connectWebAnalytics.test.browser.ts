import { beforeEach, expect, test, vi } from 'test'

import { wrap } from '../methods'
import { isRec, sleep } from '../utils'
import { connectWebAnalytics } from './connectWebAnalytics'

const waitForAnalytics = async () => {
  await wrap(sleep())
  await wrap(sleep())
}

const parseRequestBody = async (
  body: BodyInit | null | undefined,
): Promise<unknown> => {
  if (body instanceof Blob) {
    const parsed: unknown = JSON.parse(await body.text())
    return parsed
  }

  const text = typeof body === 'string' ? body : String(body ?? '')
  const parsed: unknown = JSON.parse(text)
  return parsed
}

const getRecord = (value: unknown, message: string): Record<string, unknown> => {
  if (!isRec(value)) {
    throw new Error(message)
  }

  return value
}

const getArray = (value: unknown, message: string): Array<unknown> => {
  if (!Array.isArray(value)) {
    throw new Error(message)
  }

  return value
}

const getFirstSpan = (request: unknown): Record<string, unknown> => {
  const spans = getSpans(request)
  return getRecord(spans[0], 'spans should contain at least one span')
}

const getSpans = (request: unknown): Array<unknown> => {
  const resourceSpans = getArray(
    getRecord(request, 'request should be an object').resourceSpans,
    'resourceSpans should be an array',
  )
  const firstResourceSpan = getRecord(
    resourceSpans[0],
    'resourceSpans should contain a span group',
  )
  const scopeSpans = getArray(
    firstResourceSpan.scopeSpans,
    'scopeSpans should be an array',
  )
  const firstScopeSpan = getRecord(
    scopeSpans[0],
    'scopeSpans should contain a scope group',
  )
  return getArray(firstScopeSpan.spans, 'spans should be an array')
}

const getSpanAttributes = (span: unknown): Record<string, unknown> => {
  const attributes = getArray(
    getRecord(span, 'span should be an object').attributes,
    'span attributes should be an array',
  )
  const result: Record<string, unknown> = {}

  for (const attribute of attributes) {
    const attributeRecord = getRecord(attribute, 'attribute should be an object')
    const valueRecord = getRecord(
      attributeRecord.value,
      'attribute value should be an object',
    )

    if (typeof attributeRecord.key !== 'string') {
      throw new Error('attribute key should be a string')
    }

    if ('stringValue' in valueRecord) {
      result[attributeRecord.key] = valueRecord.stringValue
      continue
    }

    if ('boolValue' in valueRecord) {
      result[attributeRecord.key] = valueRecord.boolValue
      continue
    }

    if ('intValue' in valueRecord) {
      result[attributeRecord.key] = Number(valueRecord.intValue)
      continue
    }

    if ('doubleValue' in valueRecord) {
      result[attributeRecord.key] = valueRecord.doubleValue
    }
  }

  return result
}

beforeEach(() => {
  window.history.replaceState({}, '', '/')
  document.title = 'Home'
})

test('connectWebAnalytics tracks load, navigation, and custom events', async () => {
  const requests: Array<{
    body: BodyInit | null | undefined
    keepalive: boolean | undefined
    url: string
  }> = []
  const transport: typeof globalThis.fetch = async (input, init) => {
    requests.push({
      body: init?.body,
      keepalive: init?.keepalive,
      url: String(input),
    })

    return new Response(null, { status: 204 })
  }
  const analytics = connectWebAnalytics({
    batchDelay: 0,
    endpoint: '/ingest',
    serviceName: 'docs',
    transport,
  })
  const landingHref = window.location.href

  await wrap(waitForAnalytics())
  expect(requests).toHaveLength(1)
  expect(requests[0]?.url.endsWith('/ingest/v1/traces')).toBe(true)

  const loadSpan = getFirstSpan(await wrap(parseRequestBody(requests[0]?.body)))
  const loadAttributes = getSpanAttributes(loadSpan)

  expect(loadSpan.name).toBe('web.page_view')
  expect(loadAttributes['analytics.event.type']).toBe('page_view')
  expect(loadAttributes['navigation.source']).toBe('load')
  expect(loadAttributes['url.full']).toBe(landingHref)

  document.title = 'Docs API'
  window.history.pushState({}, '', '/docs?tab=api')
  await wrap(waitForAnalytics())

  expect(requests).toHaveLength(2)

  const navigationSpan = getFirstSpan(
    await wrap(parseRequestBody(requests[1]?.body)),
  )
  const navigationAttributes = getSpanAttributes(navigationSpan)

  expect(navigationAttributes['url.path']).toBe('/docs')
  expect(navigationAttributes['url.query']).toBe('?tab=api')
  expect(navigationAttributes['page.referrer']).toBe(landingHref)
  expect(navigationAttributes['document.title']).toBe('Docs API')

  analytics.event('Signup', { plan: 'pro', seats: 3 })
  await wrap(waitForAnalytics())

  expect(requests).toHaveLength(3)

  const eventSpan = getFirstSpan(await wrap(parseRequestBody(requests[2]?.body)))
  const customEventAttributes = getSpanAttributes(eventSpan)

  expect(eventSpan.name).toBe('web.event')
  expect(customEventAttributes['event.name']).toBe('Signup')
  expect(customEventAttributes['event.attribute.plan']).toBe('pro')
  expect(customEventAttributes['event.attribute.seats']).toBe(3)
  expect(analytics.session().pageViews).toBe(2)
  expect(analytics.session().events).toBe(1)

  analytics.disconnect()
  await wrap(sleep())
})

test('connectWebAnalytics keeps spans queued offline and flushes on reconnect', async () => {
  const requests: Array<BodyInit | null | undefined> = []
  const transport: typeof globalThis.fetch = async (_input, init) => {
    requests.push(init?.body)
    return new Response(null, { status: 204 })
  }
  const analytics = connectWebAnalytics({
    autoPageViews: false,
    batchDelay: 0,
    endpoint: '/ingest',
    serviceName: 'docs',
    transport,
  })

  await wrap(waitForAnalytics())

  window.dispatchEvent(new Event('offline'))
  await wrap(waitForAnalytics())

  analytics.event('Queued', { source: 'offline' })
  await wrap(waitForAnalytics())

  expect(requests).toHaveLength(0)
  expect(analytics.queue().length).toBe(1)
  expect(analytics.status()).toBe('offline')

  window.dispatchEvent(new Event('online'))
  await wrap(waitForAnalytics())

  expect(requests).toHaveLength(1)
  expect(analytics.queue().length).toBe(0)

  const reconnectSpan = getFirstSpan(await wrap(parseRequestBody(requests[0])))
  const reconnectAttributes = getSpanAttributes(reconnectSpan)

  expect(reconnectAttributes['event.name']).toBe('Queued')
  expect(analytics.status()).toBe('idle')

  analytics.disconnect()
  await wrap(sleep())
})

test('connectWebAnalytics uses sendBeacon for pagehide flushes', async () => {
  const requests: Array<BodyInit | null | undefined> = []
  const beacon = vi.fn(() => true)
  const transport: typeof globalThis.fetch = async (_input, init) => {
    requests.push(init?.body)
    return new Response(null, { status: 204 })
  }
  const analytics = connectWebAnalytics({
    autoPageViews: false,
    batchDelay: 10_000,
    endpoint: '/ingest',
    sendBeacon: beacon,
    serviceName: 'docs',
    transport,
  })

  await wrap(waitForAnalytics())

  analytics.event('Leave', { reason: 'pagehide' })
  expect(analytics.queue().length).toBe(1)

  window.dispatchEvent(new Event('pagehide'))
  await wrap(waitForAnalytics())

  expect(beacon).toHaveBeenCalledTimes(1)
  expect(requests).toHaveLength(0)

  const beaconBody = beacon.mock.calls[0]?.[1]
  const hiddenSpan = getFirstSpan(await wrap(parseRequestBody(beaconBody)))
  const hiddenAttributes = getSpanAttributes(hiddenSpan)

  expect(hiddenAttributes['event.name']).toBe('Leave')
  expect(hiddenAttributes['event.attribute.reason']).toBe('pagehide')
  expect(analytics.queue().length).toBe(0)

  analytics.disconnect()
  await wrap(sleep())
})
