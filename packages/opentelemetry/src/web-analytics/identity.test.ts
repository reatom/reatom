import { atom, context } from '@reatom/core'
import { afterEach, expect, test, vi } from 'vitest'

import { reatomTestTelemetry } from '../test-helpers.ts'
import { browserCaptureOf } from '../browserCapture.ts'
import {} from './connectWebAnalytics.ts'
import {
  campaignFingerprint,
  DEFAULT_ATTRIBUTION_PARAMS,
  DEFAULT_SESSION_TIMEOUT_MS,
  fingerprintFromAttribution,
  readCampaign,
  sessionStorageKey,
  VISITOR_LIFE_MS,
  visitorStorageKey,
} from './identity.ts'
import type { AnalyticsFixtureOptions as WebAnalyticsCreateOptions } from './test-helpers.ts'
import { createAnalytics, readAnalyticsRecords } from './test-helpers.ts'

const OPTIONS = {
  name: 'shop',
  endpoint: null as const,
  serviceName: 'shop-web',
  skipGlobalExtension: true as const,
  useBeacon: false as const,
  batchInterval: 100_000,
  maxBatchSize: 100,
  maxQueueSize: 100,
  consent: true as const,
}

const cleanups: Array<() => void> = []

afterEach(() => {
  while (cleanups.length) {
    const stop = cleanups.pop()!
    context.start(() => stop())
  }
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  Reflect.deleteProperty(
    globalThis,
    Symbol.for('reatom.opentelemetry.analytics.pageViews'),
  )
})

const remember = <T extends { dispose?: { (): void } | (() => void) }>(
  analytics: T,
): T => {
  if (typeof analytics.dispose === 'function') {
    const dispose = analytics.dispose.bind(analytics)
    cleanups.push(() => dispose())
  }
  return analytics
}

const createMemoryStorage = (): Storage => {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    key(index) {
      return [...map.keys()][index] ?? null
    },
    getItem(key) {
      return map.has(key) ? map.get(key)! : null
    },
    setItem(key, value) {
      map.set(String(key), String(value))
    },
    removeItem(key) {
      map.delete(key)
    },
    clear() {
      map.clear()
    },
  }
}

const installClock = (startMs = 1_700_000_000_000) => {
  let nowMs = startMs
  const spy = vi.spyOn(Date, 'now').mockImplementation(() => nowMs)
  cleanups.push(() => spy.mockRestore())
  return {
    now: () => nowMs,
    advance(ms: number) {
      nowMs += ms
    },
  }
}

type ShopWindow = {
  href: string
  referrer: string
  localStorage: Storage
  sessionStorage: Storage
  cookieWrites: string[]
  setHref: (href: string) => void
  fireStorage: (key: string, newValue: string | null) => void
  fireError: (error: Error) => void
}

const installShopWindow = (options?: {
  href?: string
  referrer?: string
  localStorage?: Storage
  sessionStorage?: Storage
}): ShopWindow => {
  let href = options?.href ?? 'https://shop.test/home'
  let referrer = options?.referrer ?? ''
  const localStorage = options?.localStorage ?? createMemoryStorage()
  const sessionStorage = options?.sessionStorage ?? createMemoryStorage()
  const cookieWrites: string[] = []
  const body = new EventTarget()
  const page = Object.assign(new EventTarget(), {
    visibilityState: 'visible' as DocumentVisibilityState,
    hasFocus: () => true,
    body,
    get referrer() {
      return referrer
    },
    get cookie() {
      return ''
    },
    set cookie(value: string) {
      cookieWrites.push(value)
    },
  })

  const location = {
    get href() {
      return href
    },
    get pathname() {
      return new URL(href).pathname
    },
    get origin() {
      return new URL(href).origin
    },
    get search() {
      return new URL(href).search
    },
    get hash() {
      return new URL(href).hash
    },
  }

  const history = {
    pushState(_state: unknown, _title: string, url?: string | URL | null) {
      href = new URL(String(url ?? href), href).href
    },
    replaceState(_state: unknown, _title: string, url?: string | URL | null) {
      href = new URL(String(url ?? href), href).href
    },
  }

  const windowStub = Object.assign(new EventTarget(), {
    location,
    history,
    document: page,
    localStorage,
    sessionStorage,
  })

  vi.stubGlobal('window', windowStub)
  vi.stubGlobal('document', page)
  vi.stubGlobal('location', location)
  vi.stubGlobal('history', history)
  vi.stubGlobal('localStorage', localStorage)
  vi.stubGlobal('sessionStorage', sessionStorage)

  return {
    get href() {
      return href
    },
    get referrer() {
      return referrer
    },
    localStorage,
    sessionStorage,
    cookieWrites,
    setHref(next: string) {
      href = new URL(next, href).href
    },
    fireStorage(key: string, newValue: string | null) {
      windowStub.dispatchEvent(
        Object.assign(new Event('storage'), {
          key,
          newValue,
          storageArea: localStorage,
        }),
      )
    },
    fireError(error: Error) {
      windowStub.dispatchEvent(
        Object.assign(new Event('error'), {
          error,
          message: error.message,
        }),
      )
    },
  }
}

const decodeOtlpValue = (value: unknown): unknown => {
  if (value === null || typeof value !== 'object') return value
  const rec = value as Record<string, unknown>
  if ('stringValue' in rec) return rec.stringValue
  if ('intValue' in rec) return rec.intValue
  if ('boolValue' in rec) return rec.boolValue
  if ('doubleValue' in rec) return rec.doubleValue
  if ('arrayValue' in rec) {
    const values =
      (rec.arrayValue as { values?: unknown[] } | undefined)?.values ?? []
    return values.map(decodeOtlpValue)
  }
  if ('kvlistValue' in rec) {
    const entries =
      (
        rec.kvlistValue as {
          values?: Array<{ key: string; value: unknown }>
        }
      )?.values ?? []
    return Object.fromEntries(
      entries.map(({ key, value: nested }) => [key, decodeOtlpValue(nested)]),
    )
  }
  return value
}

const attrsOf = (record: object): Record<string, unknown> =>
  'attributes' in record ? (record.attributes as Record<string, unknown>) : {}

const eventNameOf = (record: object): string | undefined => {
  const fromField =
    'eventName' in record && typeof record.eventName === 'string'
      ? record.eventName
      : undefined
  const fromAttr = attrsOf(record)['event.name']
  return fromField ?? (typeof fromAttr === 'string' ? fromAttr : undefined)
}

const collectNamed = (
  records: readonly unknown[],
  eventName: string,
): Array<{ eventName?: string; attributes: Record<string, unknown> }> => {
  const found: Array<{
    eventName?: string
    attributes: Record<string, unknown>
  }> = []
  const visit = (value: unknown) => {
    if (value === null || typeof value !== 'object') return
    if (eventNameOf(value) === eventName) {
      found.push({
        eventName:
          'eventName' in value && typeof value.eventName === 'string'
            ? value.eventName
            : undefined,
        attributes: attrsOf(value),
      })
      return
    }
    if (Array.isArray(value)) {
      for (const item of value) visit(item)
      return
    }
    for (const nested of Object.values(value)) visit(nested)
  }
  for (const record of records) visit(record)
  return found
}

const readRecords = (
  otel: ReturnType<typeof createAnalytics>['otel'],
): readonly unknown[] => [...readAnalyticsRecords(otel)]

const connectShop = (overrides: Partial<WebAnalyticsCreateOptions> = {}) =>
  remember(
    createAnalytics({
      ...OPTIONS,
      ...overrides,
    }),
  )

const identityOf = (analytics: ReturnType<typeof createAnalytics>) => ({
  visitor: analytics.visitor(),
  session: analytics.session(),
  attribution: analytics.attribution(),
})

const parseStored = (
  storage: Storage,
  key: string,
): Record<string, unknown> => {
  const raw = storage.getItem(key)
  expect(raw).toBeTruthy()
  return JSON.parse(raw!) as Record<string, unknown>
}

const storageKeys = (storage: Storage): string[] =>
  Array.from({ length: storage.length }, (_, index) => storage.key(index) ?? '')

test('WA-3 / spec 03.4 / R11: consent omitted writes no visitor or session storage', () => {
  const shop = installShopWindow()
  context.start(() => {
    const analytics = connectShop({
      name: 'consent-omit',
      consent: undefined,
    })
    expect(identityOf(analytics).visitor).toBeUndefined()
    expect(collectNamed(readRecords(analytics.otel), 'app.page_view')).toEqual(
      [],
    )
    expect(collectNamed(readRecords(analytics.otel), 'session.start')).toEqual(
      [],
    )
  })
  expect(storageKeys(shop.localStorage)).toEqual([])
  expect(storageKeys(shop.sessionStorage)).toEqual([])
  expect(shop.cookieWrites).toEqual([])
})

test('WA-3 / spec 03.4 / R11: consent false writes no identity keys and no identifiers', () => {
  const shop = installShopWindow({
    href: 'https://shop.test/home?utm_source=google',
  })
  context.start(() => {
    const analytics = connectShop({
      name: 'consent-false',
      consent: false,
    })
    expect(identityOf(analytics).visitor).toBeUndefined()
    expect(collectNamed(readRecords(analytics.otel), 'app.page_view')).toEqual(
      [],
    )
  })
  expect(storageKeys(shop.localStorage)).toEqual([])
  expect(shop.cookieWrites).toEqual([])
})

test('WA-3 / spec 03.4: after consent true the first page view has visitor and session ids', () => {
  const shop = installShopWindow({
    href: 'https://shop.test/home?utm_source=google&utm_campaign=spring',
  })
  context.start(() => {
    const consent = atom(false, 'identityConsent')
    const analytics = connectShop({
      name: 'consent-flip',
      consent,
      autoPageViews: false,
      navigation: 'popstate',
    })
    expect(storageKeys(shop.localStorage)).toEqual([])
    const memorySession = identityOf(analytics).session.id

    consent.set(true)
    analytics.pageView()

    const after = identityOf(analytics)
    const visitorId = after.visitor
    const sessionId = after.session.id
    expect(typeof visitorId).toBe('string')
    expect(typeof sessionId).toBe('string')
    expect(sessionId).not.toBe(memorySession)

    const views = collectNamed(readRecords(analytics.otel), 'app.page_view')
    expect(views).toHaveLength(1)
    expect(views[0]!.attributes['session.id']).toBe(sessionId)
    expect(views[0]!.attributes['app.visitor.id']).toBe(visitorId)
    expect(views[0]!.attributes['app.utm.source']).toBe('google')

    const visitor = parseStored(
      shop.localStorage,
      visitorStorageKey('consent-flip'),
    )
    expect(visitor.id).toBe(visitorId)
    expect(visitor).not.toHaveProperty('user.id')
    expect(JSON.stringify(visitor)).not.toMatch(/user\.id/)
  })
})

test('WA-3 / spec 03.11: persistVisitor false never writes the visitor key', () => {
  const shop = installShopWindow()
  context.start(() => {
    const analytics = connectShop({
      name: 'memory-only',
      persistVisitor: false,
    })
    expect(typeof identityOf(analytics).visitor).toBe('string')
  })
  expect(shop.localStorage.getItem(visitorStorageKey('memory-only'))).toBe(null)
  expect(storageKeys(shop.localStorage)).toContain(
    sessionStorageKey('memory-only'),
  )
  expect(storageKeys(shop.localStorage)).not.toContain(
    visitorStorageKey('memory-only'),
  )
})

test('WA-3 / spec 03.3: idle timeout rotates session and sets session.previous_id', () => {
  const clock = installClock()
  installShopWindow()
  context.start(() => {
    const analytics = connectShop({
      name: 'idle-rotate',
      navigation: 'popstate',
    })
    const firstId = identityOf(analytics).session.id
    expect(typeof firstId).toBe('string')

    clock.advance(DEFAULT_SESSION_TIMEOUT_MS + 1)
    analytics.pageView()

    const afterIdle = identityOf(analytics).session
    const secondId = afterIdle.id
    expect(secondId).toBeTruthy()
    expect(secondId).not.toBe(firstId)
    expect(afterIdle.previousId).toBe(firstId)

    const starts = collectNamed(readRecords(analytics.otel), 'session.start')
    expect(starts.length).toBeGreaterThanOrEqual(2)
    const rotated = starts.at(-1)!
    expect(rotated.attributes['session.previous_id']).toBe(firstId)
    expect(rotated.attributes['session.id']).toBe(secondId)
  })
})

test('WA-3 / spec 03.3: two tabs share a session through localStorage', () => {
  const shared = createMemoryStorage()
  installShopWindow({ localStorage: shared })
  context.start(() => {
    const tabA = connectShop({
      name: 'tab-a',
      storageKey: 'shop',
    })
    const sessionId = identityOf(tabA).session.id
    expect(typeof sessionId).toBe('string')

    const tabB = connectShop({
      name: 'tab-b',
      storageKey: 'shop',
    })
    expect(identityOf(tabB).session.id).toBe(sessionId)
    expect(identityOf(tabB).visitor).toBe(identityOf(tabA).visitor)
  })
})

test('WA-3 / spec 03.3: storage events apply the shared session in the other tab', () => {
  const shared = createMemoryStorage()
  const shop = installShopWindow({ localStorage: shared })
  context.start(() => {
    const tabA = connectShop({
      name: 'live-a',
      storageKey: 'live',
    })
    const original = identityOf(tabA).session.id
    const incoming = {
      id: 'session-from-tab-b',
      startedAt: Date.now(),
      lastActivity: Date.now(),
      previousId: original,
      campaign: '',
      pageViews: 2,
      events: 0,
      engagedMs: 0,
    }
    const raw = JSON.stringify(incoming)
    shared.setItem(sessionStorageKey('live'), raw)
    shop.fireStorage(sessionStorageKey('live'), raw)

    const live = identityOf(tabA).session
    expect(live.id).toBe('session-from-tab-b')
    expect(live.previousId).toBe(original)
  })
})

test('WA-3 / spec 03.5: two analytics instances do not share visitor or session storage', () => {
  const shop = installShopWindow()
  context.start(() => {
    const host = connectShop({ name: 'host' })
    const widget = connectShop({ name: 'widget' })
    expect(identityOf(host).visitor).not.toBe(identityOf(widget).visitor)
    expect(identityOf(host).session.id).not.toBe(identityOf(widget).session.id)
  })
  expect(shop.localStorage.getItem(visitorStorageKey('host'))).toBeTruthy()
  expect(shop.localStorage.getItem(visitorStorageKey('widget'))).toBeTruthy()
  expect(shop.localStorage.getItem(visitorStorageKey('host'))).not.toBe(
    shop.localStorage.getItem(visitorStorageKey('widget')),
  )
  expect(shop.localStorage.getItem(sessionStorageKey('host'))).not.toBe(
    shop.localStorage.getItem(sessionStorageKey('widget')),
  )
})

test('WA-3 / R10: inbound UTM rotates the session; in-app UTM does not', () => {
  const clock = installClock()
  const shared = createMemoryStorage()
  const startedAt = clock.now()
  shared.setItem(
    sessionStorageKey('campaign'),
    JSON.stringify({
      id: 'direct-session',
      startedAt,
      lastActivity: startedAt,
      campaign: '',
      pageViews: 1,
      events: 0,
      engagedMs: 0,
    }),
  )
  shared.setItem(
    visitorStorageKey('campaign'),
    JSON.stringify({
      id: 'visitor-1',
      createdAt: startedAt,
      lastSeen: startedAt,
      firstTouch: {},
      lastTouch: {},
    }),
  )

  const shop = installShopWindow({
    href: 'https://shop.test/land?utm_source=google&utm_campaign=spring',
    referrer: 'https://google.com/search',
    localStorage: shared,
  })
  context.start(() => {
    const inbound = connectShop({
      name: 'campaign-b',
      storageKey: 'campaign',
      navigation: 'popstate',
    })
    expect(identityOf(inbound).session.id).not.toBe('direct-session')
    expect(identityOf(inbound).session.previousId).toBe('direct-session')
    expect(identityOf(inbound).attribution.source).toBe('google')
    const inboundId = identityOf(inbound).session.id

    shop.setHref('https://shop.test/home?utm_source=header')
    inbound.pageView()
    expect(identityOf(inbound).session.id).toBe(inboundId)
  })
})

test('WA-3 / R10: rotateAtMidnight default is off across local midnight', () => {
  const startMs = new Date(2026, 2, 10, 23, 50, 0).getTime()
  const clock = installClock(startMs)
  installShopWindow()
  context.start(() => {
    const kept = connectShop({
      name: 'midnight-off',
      navigation: 'popstate',
    })
    const keptId = identityOf(kept).session.id
    clock.advance(30 * 60 * 1000)
    kept.pageView()
    expect(identityOf(kept).session.id).toBe(keptId)
  })
})

test('WA-3 / R10: rotateAtMidnight true rotates with session.previous_id', () => {
  const startMs = new Date(2026, 2, 10, 23, 50, 0).getTime()
  const clock = installClock(startMs)
  installShopWindow()
  context.start(() => {
    const rotated = connectShop({
      name: 'midnight-on',
      rotateAtMidnight: true,
      navigation: 'popstate',
    })
    const before = identityOf(rotated).session.id
    clock.advance(30 * 60 * 1000)
    rotated.pageView()
    const afterMidnight = identityOf(rotated).session
    expect(afterMidnight.id).not.toBe(before)
    expect(afterMidnight.previousId).toBe(before)
  })
})

test('WA-3 / R10: visitor lastSeen slides; createdAt older than 400d rotates the id', () => {
  const clock = installClock()
  const shop = installShopWindow()
  context.start(() => {
    const first = connectShop({
      name: 'visitor-life',
      navigation: 'popstate',
    })
    const visitorId = identityOf(first).visitor
    const createdAt = parseStored(
      shop.localStorage,
      visitorStorageKey('visitor-life'),
    ).createdAt
    expect(createdAt).toBe(clock.now())
    clock.advance(10_000)
    first.pageView()
    expect(identityOf(first).visitor).toBe(visitorId)
    expect(
      parseStored(shop.localStorage, visitorStorageKey('visitor-life'))
        .lastSeen,
    ).toBe(clock.now())

    clock.advance(VISITOR_LIFE_MS + 1)
    first.pageView()
    expect(identityOf(first).visitor).not.toBe(visitorId)
    const rotated = parseStored(
      shop.localStorage,
      visitorStorageKey('visitor-life'),
    )
    expect(rotated.id).toBe(identityOf(first).visitor)
    expect(rotated.createdAt).toBe(clock.now())
  })
})

test('WA-3: session.start carries first and last touch; page_view keeps last touch', () => {
  installShopWindow({
    href: 'https://shop.test/home?utm_source=google&utm_medium=cpc&gclid=abc',
    referrer: 'https://google.com/',
  })
  context.start(() => {
    const analytics = connectShop({ name: 'touch' })
    const starts = collectNamed(readRecords(analytics.otel), 'session.start')
    expect(starts).toHaveLength(1)
    expect(starts[0]!.attributes['app.attribution.first.source']).toBe('google')
    expect(starts[0]!.attributes['app.attribution.last.source']).toBe('google')
    expect(starts[0]!.attributes['app.attribution.last.gclid']).toBe('abc')

    const views = collectNamed(readRecords(analytics.otel), 'app.page_view')
    expect(views).toHaveLength(1)
    expect(views[0]!.attributes['app.utm.source']).toBe('google')
    expect(views[0]!.attributes['app.click_id.gclid']).toBe('abc')
    const ids = identityOf(analytics)
    expect(views[0]!.attributes['session.id']).toBe(ids.session.id)
    expect(views[0]!.attributes['app.visitor.id']).toBe(ids.visitor)
  })
})

test('WA-3 / R10: analytics does not persist user.id and does not write cookies', () => {
  const shop = installShopWindow()
  context.start(() => {
    const analytics = connectShop({ name: 'user-link' })
    const visitorId = identityOf(analytics).visitor
    analytics.pageView()
    expect(identityOf(analytics).visitor).toBe(visitorId)
  })
  expect(shop.cookieWrites).toEqual([])
  for (const key of storageKeys(shop.localStorage)) {
    expect(key.toLowerCase()).not.toMatch(/cookie/)
    expect(shop.localStorage.getItem(key)).not.toMatch(/user\.id/)
  }
})

test('WA-3 / spec 03.5: createAnalytics(otel) storageKey defaults to instance name, not instance', () => {
  const shop = installShopWindow()
  context.start(() => {
    const tracerInput = {
      endpoint: null as const,
      skipGlobalExtension: true as const,
      useBeacon: false as const,
      batchInterval: 100_000,
      maxBatchSize: 100,
      maxQueueSize: 100,
    }
    const hostOtel = reatomTestTelemetry({
      ...tracerInput,
      name: 'host',
      serviceName: 'host-web',
    })
    const widgetOtel = reatomTestTelemetry({
      ...tracerInput,
      name: 'widget',
      serviceName: 'widget-web',
    })
    cleanups.push(
      () => hostOtel.dispose(),
      () => widgetOtel.dispose(),
    )
    expect(hostOtel.instanceName).toBe('host')
    expect(widgetOtel.instanceName).toBe('widget')

    const host = remember(createAnalytics(hostOtel, { consent: true }))
    const widget = remember(createAnalytics(widgetOtel, { consent: true }))
    expect(identityOf(host).visitor).not.toBe(identityOf(widget).visitor)
    expect(identityOf(host).session.id).not.toBe(identityOf(widget).session.id)
  })
  expect(shop.localStorage.getItem(visitorStorageKey('host'))).toBeTruthy()
  expect(shop.localStorage.getItem(visitorStorageKey('widget'))).toBeTruthy()
  expect(shop.localStorage.getItem(visitorStorageKey('instance'))).toBe(null)
  expect(storageKeys(shop.localStorage)).not.toContain('instance.visitor')
  expect(storageKeys(shop.localStorage)).not.toContain('instance.session')
})

test('WA-3 / R10: last touch updates on a second inbound campaign; first touch stays', () => {
  const startedAt = Date.now()
  const shared = createMemoryStorage()
  shared.setItem(
    visitorStorageKey('second-touch'),
    JSON.stringify({
      id: 'visitor-keep',
      createdAt: startedAt,
      lastSeen: startedAt,
      firstTouch: { source: 'google', campaign: 'spring' },
      lastTouch: { source: 'google', campaign: 'spring' },
    }),
  )
  shared.setItem(
    sessionStorageKey('second-touch'),
    JSON.stringify({
      id: 'session-google',
      startedAt,
      lastActivity: startedAt,
      campaign: 'utm_source=google&utm_campaign=spring',
      pageViews: 1,
      events: 0,
      engagedMs: 0,
    }),
  )
  installShopWindow({
    href: 'https://shop.test/land?utm_source=facebook&utm_campaign=summer',
    referrer: 'https://facebook.com/',
    localStorage: shared,
  })
  context.start(() => {
    const analytics = connectShop({
      name: 'second-touch-b',
      storageKey: 'second-touch',
    })
    expect(identityOf(analytics).visitor).toBe('visitor-keep')
    expect(identityOf(analytics).attribution.source).toBe('facebook')
    expect(identityOf(analytics).session.id).not.toBe('session-google')
    const visitor = parseStored(shared, visitorStorageKey('second-touch'))
    expect(visitor.firstTouch).toEqual({
      source: 'google',
      campaign: 'spring',
    })
    expect(visitor.lastTouch).toEqual({
      source: 'facebook',
      campaign: 'summer',
    })
  })
})

test('WA-3 / R10: perTab true writes session to sessionStorage, not localStorage', () => {
  const shop = installShopWindow()
  context.start(() => {
    const analytics = connectShop({
      name: 'tab-session',
      perTab: true,
    })
    expect(typeof identityOf(analytics).session.id).toBe('string')
  })
  expect(
    shop.sessionStorage.getItem(sessionStorageKey('tab-session')),
  ).toBeTruthy()
  expect(shop.localStorage.getItem(sessionStorageKey('tab-session'))).toBe(null)
  expect(
    shop.localStorage.getItem(visitorStorageKey('tab-session')),
  ).toBeTruthy()
})

test('WA-3 / R10: utm_term or utm_content alone does not rotate; empty UTM does not rotate', () => {
  const clock = installClock()
  const startedAt = clock.now()
  const shared = createMemoryStorage()
  shared.setItem(
    visitorStorageKey('no-rotate'),
    JSON.stringify({
      id: 'visitor-1',
      createdAt: startedAt,
      lastSeen: startedAt,
      firstTouch: { source: 'google' },
      lastTouch: { source: 'google' },
    }),
  )
  shared.setItem(
    sessionStorageKey('no-rotate'),
    JSON.stringify({
      id: 'keep-session',
      startedAt,
      lastActivity: startedAt,
      campaign: 'utm_source=google',
      pageViews: 1,
      events: 0,
      engagedMs: 0,
    }),
  )
  const shop = installShopWindow({
    href: 'https://shop.test/home?utm_term=running&utm_content=hero',
    referrer: 'https://google.com/',
    localStorage: shared,
  })
  context.start(() => {
    const termOnly = connectShop({
      name: 'no-rotate-term',
      storageKey: 'no-rotate',
      navigation: 'popstate',
    })
    expect(identityOf(termOnly).session.id).toBe('keep-session')
    expect(identityOf(termOnly).attribution.source).toBe('google')
    expect(identityOf(termOnly).attribution.term).toBe('running')
    const termViews = collectNamed(readRecords(termOnly.otel), 'app.page_view')
    expect(termViews[0]!.attributes['app.utm.term']).toBe('running')
    expect(termViews[0]!.attributes['app.utm.content']).toBe('hero')
    termOnly.dispose()

    shop.setHref('https://shop.test/home')
    const direct = connectShop({
      name: 'no-rotate-direct',
      storageKey: 'no-rotate',
      navigation: 'popstate',
    })
    expect(identityOf(direct).session.id).toBe('keep-session')
  })
})

test('WA-3 / R10: custom sessionTimeout rotates after that idle, not the 30 min default', () => {
  const clock = installClock()
  installShopWindow()
  context.start(() => {
    const analytics = connectShop({
      name: 'custom-timeout',
      sessionTimeout: 5_000,
      navigation: 'popstate',
    })
    const firstId = identityOf(analytics).session.id
    clock.advance(4_999)
    analytics.pageView()
    expect(identityOf(analytics).session.id).toBe(firstId)
    clock.advance(5_001)
    analytics.pageView()
    const rotated = identityOf(analytics).session
    expect(rotated.id).not.toBe(firstId)
    expect(rotated.previousId).toBe(firstId)
  })
})

test('WA-3 / R10: attributionParams override persists a custom param on first/last touch', () => {
  const params = [...DEFAULT_ATTRIBUTION_PARAMS, 'ref']
  const url = new URL('https://shop.test/home?ref=partner&utm_source=google')
  const touch = readCampaign(url, params)
  expect(touch.ref).toBe('partner')
  expect(touch.source).toBe('google')
  expect(fingerprintFromAttribution(touch, params)).toBe(
    campaignFingerprint(url, params),
  )
  expect(fingerprintFromAttribution(touch, params)).toContain('ref=partner')

  const shop = installShopWindow({
    href: url.href,
    referrer: 'https://news.example/',
  })
  context.start(() => {
    const analytics = connectShop({
      name: 'custom-param',
      attributionParams: params,
    })
    expect(identityOf(analytics).attribution.ref).toBe('partner')
    const starts = collectNamed(readRecords(analytics.otel), 'session.start')
    expect(starts).toHaveLength(1)
    expect(starts[0]!.attributes['app.attribution.first.ref']).toBe('partner')
    expect(starts[0]!.attributes['app.attribution.last.ref']).toBe('partner')
    const views = collectNamed(readRecords(analytics.otel), 'app.page_view')
    expect(views[0]!.attributes['app.utm.ref']).toBe('partner')
    expect(views[0]!.attributes['app.utm.source']).toBe('google')
    const visitor = parseStored(
      shop.localStorage,
      visitorStorageKey('custom-param'),
    )
    expect(visitor.firstTouch).toMatchObject({
      ref: 'partner',
      source: 'google',
    })
    expect(visitor.lastTouch).toMatchObject({
      ref: 'partner',
      source: 'google',
    })
  })
})

test('WA-3: after consent, exception logs use stored session not the RAM id', () => {
  const shop = installShopWindow()
  context.start(() => {
    const consent = atom(false, 'exceptionConsent')
    const analytics = connectShop({
      name: 'exception-sync',
      consent,
      autoPageViews: false,
      navigation: 'popstate',
    })
    const memorySession = identityOf(analytics).session.id
    expect(typeof memorySession).toBe('string')
    expect(identityOf(analytics).visitor).toBeUndefined()

    consent.set(true)
    shop.fireError(new TypeError('boom'))

    const after = identityOf(analytics)
    expect(after.session.id).not.toBe(memorySession)
    expect(typeof after.visitor).toBe('string')
    const exceptions = collectNamed(readRecords(analytics.otel), 'exception')
    expect(exceptions).toHaveLength(1)
    expect(exceptions[0]!.attributes['session.id']).toBe(after.session.id)
    expect(exceptions[0]!.attributes['app.visitor.id']).toBe(after.visitor)
    expect(exceptions[0]!.attributes['session.id']).not.toBe(memorySession)
  })
})

test('WA-3: crypto.randomUUID fallback is UUID v4', () => {
  const bytes = new Uint8Array(16)
  bytes.forEach((_, index) => {
    bytes[index] = index
  })
  const realCrypto = globalThis.crypto
  vi.stubGlobal('crypto', {
    getRandomValues(target: Uint8Array) {
      if (target.length === 16) {
        target.set(bytes)
        return target
      }
      return realCrypto.getRandomValues(target)
    },
  })
  installShopWindow()
  context.start(() => {
    const analytics = connectShop({ name: 'hex-id' })
    expect(identityOf(analytics).visitor).toBe(
      '00010203-0405-4607-8809-0a0b0c0d0e0f',
    )
  })
})

test('explicit session rotation ignores a delayed invalid response for an older session', () => {
  installShopWindow()
  const fixture = remember(
    createAnalytics({ ...OPTIONS, autoPageViews: false }),
  )
  fixture.pageView()
  const first = fixture.session().id!
  fixture.analytics.rotateSession(first)
  const second = fixture.session().id!
  expect(second).not.toBe(first)
  expect(fixture.session().previousId).toBe(first)
  fixture.analytics.rotateSession(first)
  expect(fixture.session().id).toBe(second)
  fixture.analytics.setView('checkout')
  expect(fixture.page().name).toBe('checkout')
})

test('absolute lifetime rotates an active session even before the idle timeout', () => {
  installShopWindow()
  const clock = installClock()
  const fixture = remember(
    createAnalytics({
      ...OPTIONS,
      autoPageViews: false,
      sessionMaxLifetime: 100,
    }),
  )
  fixture.pageView()
  const first = fixture.session().id
  clock.advance(100)
  fixture.pageView()
  expect(fixture.session().id).not.toBe(first)
})

test('persisted session keeps its delivery sampling decision when configuration changes', () => {
  const browser = installShopWindow()
  const first = remember(
    createAnalytics({
      ...OPTIONS,
      autoPageViews: false,
      sampling: { by: 'session', ratio: 0 },
    }),
  )
  first.pageView()
  const id = first.session().id
  expect(
    JSON.parse(browser.localStorage.getItem(sessionStorageKey('shop'))!)
      .sampled,
  ).toBe(false)
  first.dispose()
  const second = remember(
    createAnalytics({
      ...OPTIONS,
      name: 'shop-resume',
      storageKey: 'shop',
      autoPageViews: false,
      sampling: { by: 'session', ratio: 1 },
    }),
  )
  second.pageView()
  expect(second.session().id).toBe(id)
  expect(
    JSON.parse(browser.localStorage.getItem(sessionStorageKey('shop'))!)
      .sampled,
  ).toBe(false)
})

test('volatile sessions never read or write session storage and still expire and rotate', () => {
  const browser = installShopWindow()
  const clock = installClock()
  const localRead = vi.spyOn(browser.localStorage, 'getItem')
  const localWrite = vi.spyOn(browser.localStorage, 'setItem')
  const sessionRead = vi.spyOn(browser.sessionStorage, 'getItem')
  const sessionWrite = vi.spyOn(browser.sessionStorage, 'setItem')
  const fixture = remember(
    createAnalytics({
      ...OPTIONS,
      autoPageViews: false,
      persistSession: false,
      persistVisitor: true,
      sessionMaxLifetime: 100,
      sampling: { by: 'session', ratio: 0 },
    }),
  )
  fixture.pageView()
  const first = fixture.session().id!
  clock.advance(100)
  fixture.pageView()
  const second = fixture.session().id!
  expect(second).not.toBe(first)
  fixture.analytics.rotateSession(second)
  const third = fixture.session().id
  expect(third).not.toBe(second)
  const remote = {
    id: 'other-tab',
    startedAt: clock.now(),
    lastActivity: clock.now(),
    sampled: true,
  }
  browser.fireStorage(sessionStorageKey('shop'), JSON.stringify(remote))
  expect(fixture.session().id).toBe(third)
  expect(
    localRead.mock.calls.some(([key]) => key === sessionStorageKey('shop')),
  ).toBe(false)
  expect(
    localWrite.mock.calls.some(([key]) => key === sessionStorageKey('shop')),
  ).toBe(false)
  expect(sessionRead).not.toHaveBeenCalled()
  expect(sessionWrite).not.toHaveBeenCalled()
  expect(
    localWrite.mock.calls.some(([key]) => key === visitorStorageKey('shop')),
  ).toBe(true)
})

test('default absolute session lifetime is four hours', () => {
  installShopWindow()
  const clock = installClock()
  const fixture = remember(
    createAnalytics({
      ...OPTIONS,
      autoPageViews: false,
      sessionTimeout: 24 * 60 * 60 * 1000,
    }),
  )
  fixture.pageView()
  const first = fixture.session().id
  clock.advance(4 * 60 * 60 * 1000 - 1)
  fixture.pageView()
  expect(fixture.session().id).toBe(first)
  clock.advance(1)
  fixture.pageView()
  expect(fixture.session().id).not.toBe(first)
})

test('setView captures native transitions, ignores noops, bounds names and survives navigation', () => {
  const browser = installShopWindow()
  const fixture = remember(
    createAnalytics({ ...OPTIONS, autoPageViews: false }),
  )
  const capture = browserCaptureOf(fixture.otel)!
  fixture.analytics.setView('home')
  expect(capture.snapshot().attributes['view.name']).toBe('home')
  fixture.analytics.setView('home')
  fixture.analytics.setView('checkout')
  browser.setHref('https://shop.test/checkout')
  fixture.pageView()
  expect(fixture.page().name).toBe('checkout')
  const snapshot = capture.snapshot()
  fixture.analytics.setView()
  expect(snapshot.attributes['view.name']).toBe('checkout')
  expect(capture.snapshot().attributes['view.name']).toBeUndefined()
  const changes = collectNamed(readRecords(fixture.otel), 'app.view_change')
  expect(
    changes.map(({ attributes }) => [attributes.fromView, attributes.toView]),
  ).toEqual([
    ['', 'home'],
    ['home', 'checkout'],
    ['checkout', ''],
  ])
  expect(changes[0]!.attributes['view.name']).toBe('home')
  expect(changes[1]!.attributes['view.name']).toBe('checkout')
  expect(changes[2]!.attributes['view.name']).toBeUndefined()
  fixture.analytics.setView('x'.repeat(300))
  expect(fixture.page().name).toHaveLength(256)
})

test('setView respects feature disposal and consent without losing a local view snapshot', () => {
  installShopWindow()
  const consent = atom(false, 'view.consent')
  const fixture = remember(
    createAnalytics({ ...OPTIONS, autoPageViews: false, consent }),
  )
  fixture.analytics.setView('private')
  expect(fixture.page().name).toBe('private')
  expect(
    collectNamed(readRecords(fixture.otel), 'app.view_change'),
  ).toHaveLength(0)
  consent.set(true)
  fixture.analytics.setView('public')
  expect(
    collectNamed(readRecords(fixture.otel), 'app.view_change'),
  ).toHaveLength(1)
  fixture.analytics.setFalse()
  fixture.analytics.setView('disabled')
  expect(fixture.page().name).toBe('public')
  fixture.dispose()
  fixture.analytics.setView('disposed')
  expect(fixture.page().name).toBe('public')
})
