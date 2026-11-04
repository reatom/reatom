import { action, atom, context, notify, urlAtom, wrap } from '@reatom/core'
import { afterEach, expect, test, vi } from 'vitest'

import { browserMetadataOf } from '../browserCapture.ts'
import { reatomGDPR, withGDPR } from '../gdpr/reatomGDPR.ts'
import { reatomTestTelemetry, withWarnSpy } from '../test-helpers.ts'
import { sessionStorageKey, visitorStorageKey } from './identity.ts'
import { withWebAnalytics } from './index.ts'
import {
  createAnalytics,
  readAnalyticsRecords,
  readAnalyticsStats,
} from './test-helpers.ts'

// F-10 / spec 03 test 4 / WA-4 / R11: omitted or false consent stores nothing
// and sends no analytics OTLP. Categories toggle synchronously.

type AnalyticsModel = ReturnType<typeof createAnalytics>
type ManualApiKeys = Extract<keyof AnalyticsModel, 'trackEvent' | 'record'>
type AssertNever<T extends never> = T
type _NoTrackEventOrRecord = AssertNever<ManualApiKeys>

const OPTIONS = {
  name: 'site',
  endpoint: 'https://collector.invalid/otel',
  serviceName: 'site-web',
  skipGlobalExtension: true as const,
}

const cleanups: Array<() => void> = []

afterEach(() => {
  while (cleanups.length) {
    const stop = cleanups.pop()!
    context.start(() => stop())
  }
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
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

const installShopWindow = (options?: { navigationApi?: boolean }) => {
  let href = 'https://shop.test/home'
  const sequence: string[] = []
  const navigationListeners = new Map<string, Set<(event?: Event) => void>>()

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
      sequence.push(href)
    },
    replaceState(_state: unknown, _title: string, url?: string | URL | null) {
      href = new URL(String(url ?? href), href).href
      sequence.push(href)
    },
  }

  const body = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }

  const navigation =
    options?.navigationApi === false
      ? undefined
      : {
          addEventListener: vi.fn(
            (type: string, fn: (event?: Event) => void) => {
              const set = navigationListeners.get(type) ?? new Set()
              set.add(fn)
              navigationListeners.set(type, set)
            },
          ),
          removeEventListener: vi.fn(
            (type: string, fn: (event?: Event) => void) => {
              navigationListeners.get(type)?.delete(fn)
            },
          ),
        }

  const windowStub = {
    location,
    history,
    navigation,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    document: {
      visibilityState: 'visible' as const,
      body,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
  }

  vi.stubGlobal('window', windowStub)
  vi.stubGlobal('document', windowStub.document)
  vi.stubGlobal('location', location)
  vi.stubGlobal('history', history)
  if (navigation) vi.stubGlobal('navigation', navigation)

  return {
    sequence,
    history,
    location,
    navigation,
    body,
    clickSpaLink(path: string) {
      history.pushState({}, '', path)
    },
    fireNavigationChange() {
      navigationListeners.get('currententrychange')?.forEach((fn) => fn())
    },
  }
}

test('spec 03.5: two analytics instances do not share queue, visitor, or session', () => {
  installShopWindow()

  const host = context.start(() =>
    remember(
      createAnalytics({
        ...OPTIONS,
        name: 'host',
        endpoint: 'https://collector.invalid/otel-host',
        serviceName: 'host-web',
      }),
    ),
  )
  const widget = context.start(() =>
    remember(
      createAnalytics({
        ...OPTIONS,
        name: 'widget',
        endpoint: 'https://collector.invalid/otel-widget',
        serviceName: 'widget-web',
      }),
    ),
  )

  expect(host).not.toBe(widget)
  expect(host.otel).not.toBe(widget.otel)
  expect(host.visitor).not.toBe(widget.visitor)
  expect(host.session).not.toBe(widget.session)
  expect(host.otel.otlp.stats).not.toBe(widget.otel.otlp.stats)
  expect(readAnalyticsStats(host.otel)).not.toBe(
    readAnalyticsStats(widget.otel),
  )
})

test('spec 03.9 / F-09: React Router-shaped pushState and link click keep the same URL sequence', () => {
  const control = installShopWindow()
  const withoutAnalytics = (() => {
    control.clickSpaLink('/product/1')
    control.clickSpaLink('/cart')
    return [...control.sequence]
  })()
  vi.unstubAllGlobals()

  const shop = installShopWindow()

  context.start(() => {
    const catchLinksBefore = urlAtom.catchLinks()
    const syncBefore = urlAtom.sync()
    remember(createAnalytics(OPTIONS))
    expect(urlAtom.catchLinks()).toBe(catchLinksBefore)
    expect(urlAtom.sync()).toBe(syncBefore)
    shop.clickSpaLink('/product/1')
    shop.clickSpaLink('/cart')
  })

  expect(shop.sequence).toEqual(withoutAnalytics)
  expect(shop.body.addEventListener).not.toHaveBeenCalledWith(
    'click',
    expect.any(Function),
  )
})

test('spec 03.12 / F-08: createAnalytics without window is a no-op and never throws', async () => {
  const globalObject = globalThis as {
    window?: unknown
    document?: unknown
  }
  const hadWindow = 'window' in globalThis
  const hadDocument = 'document' in globalThis
  const windowRef = globalObject.window
  const documentRef = globalObject.document

  await withWarnSpy((warn) => {
    try {
      delete globalObject.window
      delete globalObject.document
      expect(typeof window).toBe('undefined')
      expect(() => context.start(() => createAnalytics(OPTIONS))).not.toThrow()
    } finally {
      if (hadWindow) globalObject.window = windowRef
      else delete globalObject.window
      if (hadDocument) globalObject.document = documentRef
      else delete globalObject.document
    }
    expect(warn.mock.calls.flat().some((arg) => String(arg).length > 0)).toBe(
      true,
    )
  })
})

test('spec 03.15 / F-09: options-only connect exposes analytics.otel and a purchase shares the page-view traceId', () => {
  installShopWindow()

  context.start(() => {
    const analytics = remember(
      createAnalytics({
        ...OPTIONS,
        name: 'purchase-trace',
        endpoint: null,
        consent: true,
      }),
    )

    expect(analytics.otel).toBeDefined()
    expect(typeof analytics.otel.withOTel).toBe('function')

    const purchase = action(
      (order: { total: number }) => order,
      'app.purchase',
    ).extend(
      analytics.otel.withOTel({
        attributes: ({ payload }) => ({ 'app.order.value': payload.total }),
      }),
    )

    expect(typeof purchase).toBe('function')
    expect(purchase({ total: 42 })).toEqual({ total: 42 })

    const snapshot = [...readAnalyticsRecords(analytics.otel)]
    const views = collectNamed(snapshot, 'app.page_view')
    expect(views).toHaveLength(1)
    expect(typeof views[0]!.traceId).toBe('string')

    const purchaseSpan = spanNamed(snapshot, 'app.purchase')
    expect(purchaseSpan).toBeDefined()
    expect(purchaseSpan!.traceId).toBe(views[0]!.traceId)
  })
})

test('spec 03.16: default navigation is not urlAtom when no Reatom routes exist', async () => {
  const shop = installShopWindow()

  await withWarnSpy((warn) => {
    context.start(() => {
      const catchLinksBefore = urlAtom.catchLinks()
      const syncBefore = urlAtom.sync()
      remember(createAnalytics(OPTIONS))
      expect(urlAtom.catchLinks()).toBe(catchLinksBefore)
      expect(urlAtom.sync()).toBe(syncBefore)
    })

    expect(shop.body.addEventListener).not.toHaveBeenCalledWith(
      'click',
      expect.any(Function),
    )
    expect(Object.keys(urlAtom.routes)).toEqual([])

    const rendered = warn.mock.calls
      .flat()
      .map((arg) => String(arg))
      .join('\n')
    expect(rendered).not.toMatch(/catchLinks/)
    expect(rendered).not.toMatch(/urlAtom\.sync/)
  })
})

test('spec 03.16: explicit urlAtom without catchLinks/sync off warns once in dev', async () => {
  installShopWindow()
  expect(context.start(() => urlAtom.catchLinks())).toBe(true)
  expect(Object.keys(urlAtom.routes)).toEqual([])

  await withWarnSpy((warn) => {
    context.start(() =>
      remember(createAnalytics({ ...OPTIONS, navigation: 'urlAtom' })),
    )

    expect(warn).toHaveBeenCalledTimes(1)
    const rendered = warn.mock.calls
      .flat()
      .map((arg) => String(arg))
      .join('\n')
    expect(rendered).toMatch(/urlAtom/)
    expect(rendered).toMatch(/without routes/)
  })
})

test('spec 03.16: navigation-api sees foreign pushState and does not call setupUrlAtomNavigation', () => {
  const shop = installShopWindow()

  context.start(() => {
    const catchLinksBefore = urlAtom.catchLinks()
    const syncBefore = urlAtom.sync()
    remember(createAnalytics({ ...OPTIONS, navigation: 'navigation-api' }))
    expect(urlAtom.catchLinks()).toBe(catchLinksBefore)
    expect(urlAtom.catchLinks()).toBe(true)
    expect(urlAtom.sync()).toBe(syncBefore)
  })

  expect(shop.navigation?.addEventListener).toHaveBeenCalledWith(
    'currententrychange',
    expect.any(Function),
  )
  expect(shop.body.addEventListener).not.toHaveBeenCalledWith(
    'click',
    expect.any(Function),
  )

  shop.clickSpaLink('/foreign')
  shop.fireNavigationChange()
  expect(shop.sequence).toEqual(['https://shop.test/foreign'])
})

test('spec 03.16: popstate source exposes pageView', () => {
  installShopWindow({ navigationApi: false })

  const analytics = context.start(() =>
    remember(createAnalytics({ ...OPTIONS, navigation: 'popstate' })),
  )

  expect(typeof analytics.pageView).toBe('function')
  expect(() => context.start(() => analytics.pageView())).not.toThrow()
})

test('F-08: double createAnalytics on one instance errors with a clear message', () => {
  installShopWindow()

  const analytics = context.start(() => remember(createAnalytics(OPTIONS)))

  expect(() =>
    context.start(() => createAnalytics(analytics.otel)),
  ).toThrowError(/analytics/i)
})

test('F-09: trackEvent and record are not on the analytics model', () => {
  installShopWindow()

  const analytics = context.start(() => remember(createAnalytics(OPTIONS)))

  // @ts-expect-error no trackEvent — manual facts use traced actions (R21, spec 03 А9)
  const trackEvent = analytics.trackEvent
  // @ts-expect-error no record — there is no record(eventName) API
  const record = analytics.record

  expect(trackEvent).toBeUndefined()
  expect(record).toBeUndefined()
})

const ANALYTICS_EVENTS = [
  'app.page_view',
  'session.start',
  'app.page.engagement',
  'exception',
  'exception.suppressed',
] as const

const CONSENT_OPTIONS = {
  name: 'consent-site',
  endpoint: null as const,
  serviceName: 'consent-web',
  skipGlobalExtension: true as const,
  navigation: 'popstate' as const,
  useBeacon: false as const,
  batchInterval: 100_000,
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
    advance(ms: number) {
      nowMs += ms
    },
  }
}

type ConsentPage = {
  hide: () => void
  localStorage: Storage
}

const installConsentPage = (): ConsentPage => {
  let href = 'https://shop.test/home?utm_source=google'
  const localStorage = createMemoryStorage()
  const sessionStorage = createMemoryStorage()
  const body = new EventTarget()
  const page = Object.assign(new EventTarget(), {
    visibilityState: 'visible' as DocumentVisibilityState,
    hasFocus: () => true,
    body,
    referrer: '',
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

  const windowStub = Object.assign(new EventTarget(), {
    location,
    history: {
      pushState(_state: unknown, _title: string, url?: string | URL | null) {
        href = new URL(String(url ?? href), href).href
      },
      replaceState(_state: unknown, _title: string, url?: string | URL | null) {
        href = new URL(String(url ?? href), href).href
      },
    },
    document: page,
    localStorage,
    sessionStorage,
  })

  vi.stubGlobal('window', windowStub)
  vi.stubGlobal('document', page)
  vi.stubGlobal('location', location)
  vi.stubGlobal('localStorage', localStorage)
  vi.stubGlobal('sessionStorage', sessionStorage)

  return {
    localStorage,
    hide() {
      page.visibilityState = 'hidden'
      page.dispatchEvent(new Event('visibilitychange'))
    },
  }
}

const attributesOf = (record: object): Record<string, unknown> =>
  'attributes' in record ? (record.attributes as Record<string, unknown>) : {}

const eventNameOf = (record: object): string | undefined => {
  if ('eventName' in record && typeof record.eventName === 'string') {
    return record.eventName
  }
  const name = attributesOf(record)['event.name']
  return typeof name === 'string' ? name : undefined
}

const collectNamed = (
  records: readonly unknown[],
  eventName: string,
): Array<{
  eventName?: string
  attributes: Record<string, unknown>
  traceId?: string
}> => {
  const found: Array<{
    eventName?: string
    attributes: Record<string, unknown>
    traceId?: string
  }> = []
  const visit = (value: unknown) => {
    if (value === null || typeof value !== 'object') return
    if (eventNameOf(value) === eventName) {
      found.push({
        eventName:
          'eventName' in value && typeof value.eventName === 'string'
            ? value.eventName
            : undefined,
        attributes: attributesOf(value),
        traceId:
          'traceId' in value && typeof value.traceId === 'string'
            ? value.traceId
            : undefined,
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

const spanNamed = (
  records: readonly unknown[],
  name: string,
):
  | {
      name: string
      traceId?: string
      attributes?: Record<string, unknown>
    }
  | undefined => {
  let found:
    | {
        name: string
        traceId?: string
        attributes?: Record<string, unknown>
      }
    | undefined
  const visit = (value: unknown) => {
    if (found || value === null || typeof value !== 'object') return
    const recordName = 'name' in value ? value.name : undefined
    const spanId = 'spanId' in value ? value.spanId : undefined
    if (
      typeof recordName === 'string' &&
      recordName === name &&
      typeof spanId === 'string'
    ) {
      found = {
        name: recordName,
        traceId:
          'traceId' in value && typeof value.traceId === 'string'
            ? value.traceId
            : undefined,
        attributes: attributesOf(value),
      }
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

const analyticsRecordsOf = (
  otel: ReturnType<typeof createAnalytics>['otel'],
) => {
  const snapshot = [...readAnalyticsRecords(otel)]
  return ANALYTICS_EVENTS.flatMap((eventName) =>
    collectNamed(snapshot, eventName),
  )
}

const asNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

const storageKeys = (storage: Storage) => {
  const keys: string[] = []
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index)
    if (typeof key === 'string') keys.push(key)
  }
  return keys
}

const identityStorageKeys = (storage: Storage) =>
  storageKeys(storage).filter(
    (key) => key.endsWith('.visitor') || key.endsWith('.session'),
  )

test('WA-4 / R11: consent atom false then true emits the first identified page view with RAM engagement', () => {
  const clock = installClock()
  installConsentPage()
  const fetchMock = vi.fn<typeof fetch>(
    async () => new Response('{}', { status: 200 }),
  )

  context.start(() => {
    const consent = atom(false, 'wa4.consent')
    const analytics = remember(
      createAnalytics({
        ...CONSENT_OPTIONS,
        name: 'wa4-atom-flip',
        endpoint: 'https://collector.test',
        keepRecords: true,
        fetch: fetchMock,
        consent,
      }),
    )
    const memorySession = analytics.session().id
    expect(typeof memorySession).toBe('string')
    expect(analytics.visitor()).toBeUndefined()
    expect(analyticsRecordsOf(analytics.otel)).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()

    clock.advance(1_200)
    consent.set(true)
    notify()

    const visitorId = analytics.visitor()
    const sessionId = analytics.session().id
    expect(typeof visitorId).toBe('string')
    expect(typeof sessionId).toBe('string')
    expect(sessionId).not.toBe(memorySession)

    const views = collectNamed(
      [...readAnalyticsRecords(analytics.otel)],
      'app.page_view',
    )
    expect(views).toHaveLength(1)
    expect(views[0]!.attributes['app.visitor.id']).toBe(visitorId)
    expect(views[0]!.attributes['session.id']).toBe(sessionId)
    expect(views[0]!.attributes['session.id']).not.toBe(memorySession)
    expect(views[0]!.attributes['app.analytics.consent']).toBe('granted')

    const engagement = collectNamed(
      [...readAnalyticsRecords(analytics.otel)],
      'app.page.engagement',
    )
    const engagementOnView = asNumber(
      views[0]!.attributes['app.engagement.visible_ms'],
    )
    const visibleMs =
      engagementOnView ??
      asNumber(engagement[0]?.attributes['app.engagement.visible_ms'])
    const activeMs =
      asNumber(views[0]!.attributes['app.engagement.active_ms']) ??
      asNumber(engagement[0]?.attributes['app.engagement.active_ms'])
    expect(visibleMs).toBeGreaterThanOrEqual(1_200)
    expect(activeMs).toBeGreaterThanOrEqual(1_200)
    expect(analyticsRecordsOf(analytics.otel).length).toBeGreaterThan(0)
  })
})

test('WA-4: reatomGDPR analytics submit grants identifiers on the first page view', async () => {
  const page = installConsentPage()

  await context.start(async () => {
    const consent = reatomGDPR({
      name: `wa4-gdpr-${Math.random().toString(16).slice(2)}`,
      persist: false,
      categories: { diagnostics: false, analytics: false, marketing: false },
    })
    const analytics = remember(
      createAnalytics({
        ...CONSENT_OPTIONS,
        name: 'wa4-gdpr-submit',
        consent,
      }),
    )
    const memorySession = analytics.session().id
    expect(analyticsRecordsOf(analytics.otel)).toEqual([])
    expect(analytics.visitor()).toBeUndefined()

    consent.fields.analytics.change(true)
    notify()
    expect(analyticsRecordsOf(analytics.otel)).toEqual([])
    expect(analytics.visitor()).toBeUndefined()
    expect(identityStorageKeys(page.localStorage)).toEqual([])
    expect(
      page.localStorage.getItem(visitorStorageKey('wa4-gdpr-submit')),
    ).toBe(null)
    expect(
      page.localStorage.getItem(sessionStorageKey('wa4-gdpr-submit')),
    ).toBe(null)

    await wrap(consent.submit())
    notify()

    const views = collectNamed(
      [...readAnalyticsRecords(analytics.otel)],
      'app.page_view',
    )
    expect(views).toHaveLength(1)
    expect(typeof analytics.visitor()).toBe('string')
    expect(views[0]!.attributes['app.visitor.id']).toBe(analytics.visitor())
    expect(views[0]!.attributes['session.id']).toBe(analytics.session().id)
    expect(views[0]!.attributes['session.id']).not.toBe(memorySession)
    expect(views[0]!.attributes['app.analytics.consent']).toBe('analytics')
  })
})

test('WA-4 / R11: diagnostics-only true sends no page view and no visitor id', async () => {
  installConsentPage()

  await context.start(async () => {
    const consent = reatomGDPR({
      name: `wa4-diag-${Math.random().toString(16).slice(2)}`,
      persist: false,
      categories: { diagnostics: true, analytics: false, marketing: false },
    })
    await wrap(consent.submit())
    const analytics = remember(
      createAnalytics({
        ...CONSENT_OPTIONS,
        name: 'wa4-diagnostics-only',
        consent,
      }),
    )
    notify()
    expect(
      collectNamed([...readAnalyticsRecords(analytics.otel)], 'app.page_view'),
    ).toEqual([])
    expect(analytics.visitor()).toBeUndefined()
    expect(
      analyticsRecordsOf(analytics.otel).some(
        (record) => record.attributes['app.visitor.id'] != null,
      ),
    ).toBe(false)
  })
})

test('WA-4 / R11: navigation without consent drops RAM engagement so grant is only the current page', () => {
  const clock = installClock()
  installConsentPage()

  context.start(() => {
    const consent = atom(false, 'wa4.nav-drop')
    const analytics = remember(
      createAnalytics({
        ...CONSENT_OPTIONS,
        name: 'wa4-nav-drop',
        consent,
      }),
    )
    clock.advance(1_000)
    analytics.pageView()
    clock.advance(250)
    consent.set(true)
    notify()

    const views = collectNamed(
      [...readAnalyticsRecords(analytics.otel)],
      'app.page_view',
    )
    expect(views).toHaveLength(1)
    const engagement = collectNamed(
      [...readAnalyticsRecords(analytics.otel)],
      'app.page.engagement',
    )
    const visibleMs =
      asNumber(views[0]!.attributes['app.engagement.visible_ms']) ??
      asNumber(engagement[0]?.attributes['app.engagement.visible_ms'])
    const activeMs =
      asNumber(views[0]!.attributes['app.engagement.active_ms']) ??
      asNumber(engagement[0]?.attributes['app.engagement.active_ms'])
    expect(visibleMs).toBe(250)
    expect(activeMs).toBe(250)
  })
})

test('WA-4: re-grant after withdraw does not flush withdrawn-period engagement', () => {
  const clock = installClock()
  const page = installConsentPage()

  context.start(() => {
    const consent = atom(true, 'wa4.regrant')
    const analytics = remember(
      createAnalytics({
        ...CONSENT_OPTIONS,
        name: 'wa4-regrant',
        consent,
      }),
    )
    expect(
      collectNamed([...readAnalyticsRecords(analytics.otel)], 'app.page_view'),
    ).toHaveLength(1)

    clock.advance(100)
    consent.set(false)
    notify()
    clock.advance(5_000)
    consent.set(true)
    notify()
    clock.advance(200)
    page.hide()
    notify()

    const engagement = collectNamed(
      [...readAnalyticsRecords(analytics.otel)],
      'app.page.engagement',
    )
    expect(engagement).toHaveLength(1)
    expect(
      asNumber(engagement[0]!.attributes['app.engagement.visible_ms']),
    ).toBe(200)
  })
})

test('WA-4: withdrawing analytics stops further pageView and hide OTLP', () => {
  const page = installConsentPage()

  context.start(() => {
    const consent = atom(true, 'wa4.withdraw')
    const analytics = remember(
      createAnalytics({
        ...CONSENT_OPTIONS,
        name: 'wa4-withdraw',
        consent,
      }),
    )
    const before = analyticsRecordsOf(analytics.otel)
    expect(
      collectNamed([...readAnalyticsRecords(analytics.otel)], 'app.page_view'),
    ).toHaveLength(1)

    consent.set(false)
    notify()
    analytics.pageView()
    page.hide()
    notify()

    expect(analyticsRecordsOf(analytics.otel)).toEqual(before)
  })
})

test('F-10: reatomGDPR withdraw stops pageView OTLP and new events lack visitor id', async () => {
  const page = installConsentPage()

  await context.start(async () => {
    const consent = reatomGDPR({
      name: `f10-gdpr-withdraw-${Math.random().toString(16).slice(2)}`,
      persist: false,
      categories: { diagnostics: false, analytics: false, marketing: false },
    })
    const analytics = remember(
      createAnalytics({
        ...CONSENT_OPTIONS,
        name: 'f10-gdpr-withdraw',
        consent,
      }),
    )

    consent.fields.analytics.change(true)
    notify()
    expect(analyticsRecordsOf(analytics.otel)).toEqual([])
    await wrap(consent.submit())
    notify()

    const viewsAfterGrant = collectNamed(
      [...readAnalyticsRecords(analytics.otel)],
      'app.page_view',
    )
    expect(viewsAfterGrant).toHaveLength(1)
    const visitorId = analytics.visitor()
    expect(typeof visitorId).toBe('string')
    expect(viewsAfterGrant[0]!.attributes['app.visitor.id']).toBe(visitorId)

    consent.fields.analytics.change(false)
    await wrap(consent.submit())
    notify()
    const withdrawnAnalytics = consent.snapshot()?.categories.analytics
    expect(withdrawnAnalytics).toBe(false)

    const afterWithdraw = analyticsRecordsOf(analytics.otel)
    analytics.pageView()
    page.hide()
    notify()
    expect(analyticsRecordsOf(analytics.otel)).toEqual(afterWithdraw)

    const viewsAfterWithdraw = collectNamed(
      [...readAnalyticsRecords(analytics.otel)],
      'app.page_view',
    )
    expect(viewsAfterWithdraw).toHaveLength(1)

    consent.fields.analytics.change(true)
    await wrap(consent.submit())
    notify()
    analytics.pageView()
    notify()
    const viewsAfterRestore = collectNamed(
      [...readAnalyticsRecords(analytics.otel)],
      'app.page_view',
    )
    expect(viewsAfterRestore).toHaveLength(2)
    expect(viewsAfterRestore[1]!.attributes['app.visitor.id']).toBe(
      analytics.visitor(),
    )
    expect(viewsAfterRestore[1]!.attributes['app.analytics.consent']).toBe(
      'analytics',
    )
  })
})

test('WA-4: diagnostics category object is not a back door for analytics identifiers', () => {
  installConsentPage()

  context.start(() => {
    const categories = {
      analytics: atom(false, 'wa4.cat.analytics'),
      diagnostics: atom(true, 'wa4.cat.diagnostics'),
    }
    const analytics = remember(
      createAnalytics({
        ...CONSENT_OPTIONS,
        name: 'wa4-category-object',
        consent: categories,
      }),
    )
    notify()
    expect(
      collectNamed([...readAnalyticsRecords(analytics.otel)], 'app.page_view'),
    ).toEqual([])
    expect(analytics.visitor()).toBeUndefined()
  })
})

test('native extension starts eagerly, exposes stable readonly children, and toggles listeners', () => {
  installShopWindow()
  context.start(() => {
    const fixture = remember(
      createAnalytics({
        ...OPTIONS,
        endpoint: null,
        consent: true,
        navigation: 'popstate',
      }),
    )
    const { analytics, otel } = fixture
    expect(analytics()).toBe(true)
    expect(analytics).not.toHaveProperty('otel')
    expect(analytics).not.toHaveProperty('dispose')
    const page = analytics.page
    const session = analytics.session
    expect(
      collectNamed([...readAnalyticsRecords(otel)], 'app.page_view'),
    ).toHaveLength(1)
    analytics.setFalse()
    expect(analytics()).toBe(false)
    const before = [...readAnalyticsRecords(otel)]
    analytics.pageView()
    expect([...readAnalyticsRecords(otel)]).toEqual(before)
    analytics.setTrue()
    expect(analytics.page).toBe(page)
    expect(analytics.session).toBe(session)
    expect(typeof session().id).toBe('string')
    analytics.pageView()
    expect(
      collectNamed([...readAnalyticsRecords(otel)], 'app.page_view'),
    ).toHaveLength(2)
    otel.dispose()
    expect(analytics()).toBe(false)
    expect(() => analytics.setTrue()).toThrow(/disposed/)
  })
})

test('default submitted GDPR drives eager analytics; draft grant emits no first pageview', async () => {
  installShopWindow()
  await context.start(async () => {
    const otel = reatomTestTelemetry({
      ...OPTIONS,
      name: 'gdpr-analytics-native',
      endpoint: null,
    }).extend(
      withGDPR({ persist: false }),
      withWebAnalytics({ navigation: 'popstate' }),
    )
    cleanups.push(() => otel.dispose())
    expect(
      collectNamed([...readAnalyticsRecords(otel)], 'app.page_view'),
    ).toHaveLength(0)
    otel.gdpr.fields.analytics.change(true)
    expect(
      collectNamed([...readAnalyticsRecords(otel)], 'app.page_view'),
    ).toHaveLength(0)
    await wrap(otel.gdpr.submit())
    expect(
      collectNamed([...readAnalyticsRecords(otel)], 'app.page_view'),
    ).toHaveLength(1)
    otel.gdpr.fields.analytics.change(false)
    await wrap(otel.gdpr.submit())
    otel.analytics.pageView()
    expect(
      collectNamed([...readAnalyticsRecords(otel)], 'app.page_view'),
    ).toHaveLength(1)
  })
})

test('owning app records subscriber receives eager analytics captures', () => {
  installShopWindow()
  context.start(() => {
    const otel = reatomTestTelemetry({
      ...OPTIONS,
      name: 'analytics-subscriber',
      endpoint: null,
    }).extend(withWebAnalytics({ consent: true, navigation: 'popstate' }))
    cleanups.push(() => otel.dispose())
    let observed: readonly unknown[] = []
    const stop = otel.records.subscribe((records) => {
      observed = records
    })
    otel.analytics.pageView()
    notify()
    expect(collectNamed(observed, 'app.page_view')).toHaveLength(2)
    stop()
  })
})

test('reentrant analytics enable keeps only the winning installer and cleans its listeners', () => {
  const shop = installShopWindow()
  context.start(() => {
    const otel = reatomTestTelemetry({
      ...OPTIONS,
      name: 'analytics-reentrant',
      endpoint: null,
    })
    let first = true
    const extended = otel.extend(
      withWebAnalytics({
        navigation: 'navigation-api',
        consent: () => {
          if (first) {
            first = false
            const control = (
              otel as unknown as {
                analytics: { setFalse(): void; setTrue(): void }
              }
            ).analytics
            control.setFalse()
            control.setTrue()
          }
          return true
        },
      }),
    )
    cleanups.push(() => otel.dispose())
    const pageViews = () =>
      collectNamed([...otel.records()], 'app.page_view').length
    otel.clearRecords()
    extended.analytics.pageView()
    expect(pageViews()).toBe(1)
    expect(browserMetadataOf(otel)['session.id']).toBe(
      extended.analytics.session().id,
    )
    expect(browserMetadataOf(otel)['page.url']).toBe('https://shop.test/home')
    shop.history.pushState({}, '', '/next')
    shop.fireNavigationChange()
    expect(pageViews()).toBe(2)
    extended.analytics.setFalse()
    shop.history.pushState({}, '', '/off')
    shop.fireNavigationChange()
    extended.analytics.pageView()
    expect(pageViews()).toBe(2)
    extended.analytics.setTrue()
    otel.clearRecords()
    shop.history.pushState({}, '', '/resumed')
    shop.fireNavigationChange()
    expect(pageViews()).toBe(1)
    otel.dispose()
    const count = pageViews()
    shop.history.pushState({}, '', '/disposed')
    shop.fireNavigationChange()
    expect(pageViews()).toBe(count)
    expect(shop.navigation!.removeEventListener.mock.calls.length).toBe(
      shop.navigation!.addEventListener.mock.calls.length,
    )
  })
})

test.each([2, 3, 4, 5, 6, 7])(
  'analytics setup failure at consent read %i releases resources and permits retry',
  (failAt) => {
    class TrackedTarget extends EventTarget {
      listeners = new Map<string, Set<EventListenerOrEventListenerObject>>()
      override addEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject | null,
        options?: AddEventListenerOptions | boolean,
      ) {
        if (listener) {
          const listeners = this.listeners.get(type) ?? new Set()
          listeners.add(listener)
          this.listeners.set(type, listeners)
        }
        super.addEventListener(type, listener, options)
      }
      override removeEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject | null,
        options?: EventListenerOptions | boolean,
      ) {
        if (listener) this.listeners.get(type)?.delete(listener)
        super.removeEventListener(type, listener, options)
      }
      count() {
        return [...this.listeners.values()].reduce(
          (count, listeners) => count + listeners.size,
          0,
        )
      }
    }
    const document = Object.assign(new TrackedTarget(), {
      visibilityState: 'visible',
      referrer: '',
      hasFocus: () => true,
      body: new TrackedTarget(),
    })
    const window = Object.assign(new TrackedTarget(), {
      document,
      location: new URL('https://rollback.test/home'),
    })
    vi.stubGlobal('window', window)
    vi.stubGlobal('document', document)
    vi.stubGlobal('location', window.location)
    context.start(() => {
      const otel = reatomTestTelemetry({
        ...OPTIONS,
        name: `analytics-rollback-${failAt}`,
        endpoint: null,
      })
      cleanups.push(() => otel.dispose())
      const windowBaseline = window.count()
      const documentBaseline = document.count()
      let reads = 0
      const failure = new Error('consent setup failed')
      expect(() =>
        otel.extend(
          withWebAnalytics({
            navigation: 'popstate',
            consent: () => {
              if (++reads === failAt) throw failure
              return true
            },
          }),
        ),
      ).toThrow(failure)
      expect('analytics' in otel).toBe(false)
      expect(browserMetadataOf(otel)).toEqual({})
      expect(window.count()).toBe(windowBaseline)
      expect(document.count()).toBe(documentBaseline)
      const count = otel.records().length
      window.location.pathname = '/failed'
      window.dispatchEvent(new Event('popstate'))
      window.dispatchEvent(new Event('error'))
      expect(otel.records()).toHaveLength(count)
      const retried = otel.extend(
        withWebAnalytics({ navigation: 'popstate', consent: true }),
      )
      otel.clearRecords()
      window.location.pathname = '/retry'
      window.dispatchEvent(new Event('popstate'))
      expect(collectNamed([...otel.records()], 'app.page_view')).toHaveLength(1)
      expect(browserMetadataOf(otel)['session.id']).toBe(
        retried.analytics.session().id,
      )
      otel.dispose()
      expect(window.count()).toBe(0)
      expect(document.count()).toBe(0)
      expect(browserMetadataOf(otel)).toEqual({})
    })
  },
)
