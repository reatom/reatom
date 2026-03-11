import type { Atom, Action } from '../core'
import { action, atom } from '../core'
import { effect } from '../methods'
import type { Unsubscribe } from '../utils'
import {
  type OtlpAttrPrimitive,
  type SpanData,
  connectOpentelemetry,
  generateTraceId,
  generateSpanId,
} from './opentelemetry'
import { urlAtom } from './url'

export interface WebAnalyticsSession {
  id: string
  isNew: boolean
  startedAt: number
  pageviews: number
}

export interface WebAnalyticsOptions {
  endpoint: string
  headers?: Record<string, string>
  domain?: string
  hashMode?: boolean
  batchInterval?: number
  sessionTimeout?: number
}

export interface WebAnalytics {
  session: Atom<WebAnalyticsSession>
  trackEvent: Action<
    [name: string, props?: Record<string, OtlpAttrPrimitive>],
    void
  >
  flush(): Promise<void>
  destroy(): void
}

const SESSION_STORAGE_KEY = 'reatom_analytics_session'
const VISITOR_STORAGE_KEY = 'reatom_analytics_visitor'
const DEFAULT_SESSION_TIMEOUT_MS = 30 * 60 * 1000

interface StoredSessionData {
  id: string
  startedAt: number
  lastActivityAt: number
  pageviews: number
}

const parseStoredSession = (raw: string): StoredSessionData | null => {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null

    const { id, startedAt, lastActivityAt, pageviews } = parsed as {
      id: unknown
      startedAt: unknown
      lastActivityAt: unknown
      pageviews: unknown
    }

    const hasValidShape =
      typeof id === 'string' &&
      typeof startedAt === 'number' &&
      typeof lastActivityAt === 'number' &&
      typeof pageviews === 'number'

    if (!hasValidShape) return null

    return { id, startedAt, lastActivityAt, pageviews }
  } catch {
    return null
  }
}

const getOrCreateVisitorId = (): { id: string; isNew: boolean } => {
  try {
    const existingId = localStorage.getItem(VISITOR_STORAGE_KEY)
    if (existingId && existingId.length > 0) {
      return { id: existingId, isNew: false }
    }
  } catch {
    // localStorage not available
  }
  const newId = generateTraceId()
  try {
    localStorage.setItem(VISITOR_STORAGE_KEY, newId)
  } catch {
    // localStorage not available
  }
  return { id: newId, isNew: true }
}

const getOrCreateSession = (
  timeoutMs: number,
): {
  id: string
  isNew: boolean
  startedAt: number
  pageviews: number
} => {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (raw) {
      const stored = parseStoredSession(raw)
      if (stored) {
        const elapsed = Date.now() - stored.lastActivityAt
        if (elapsed < timeoutMs) {
          return {
            id: stored.id,
            isNew: false,
            startedAt: stored.startedAt,
            pageviews: stored.pageviews,
          }
        }
      }
    }
  } catch {
    // sessionStorage not available
  }

  const newSession = {
    id: generateSpanId() + generateSpanId(),
    isNew: true,
    startedAt: Date.now(),
    pageviews: 0,
  }
  return newSession
}

const persistSession = (session: StoredSessionData): void => {
  try {
    sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify(session),
    )
  } catch {
    // sessionStorage not available
  }
}

const extractUtmParams = (
  searchParams: URLSearchParams,
): Record<string, string> => {
  const utmKeys = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
  ] as const
  const result: Record<string, string> = {}
  for (const key of utmKeys) {
    const value = searchParams.get(key)
    if (value) {
      const attrKey = 'analytics.' + key.replace('_', '.')
      result[attrKey] = value
    }
  }
  return result
}

const extractReferrerDomain = (referrer: string): string => {
  if (!referrer) return ''
  try {
    return new URL(referrer).hostname
  } catch {
    return ''
  }
}

const getPagePath = (url: URL, hashMode: boolean): string =>
  hashMode ? url.hash.replace(/^#/, '') || '/' : url.pathname

export const connectWebAnalytics = (
  options: WebAnalyticsOptions,
): WebAnalytics => {
  const siteDomain =
    options.domain ??
    (typeof window !== 'undefined' ? window.location.hostname : 'unknown')
  const hashMode = options.hashMode ?? false
  const sessionTimeoutMs =
    options.sessionTimeout ?? DEFAULT_SESSION_TIMEOUT_MS

  const visitor = getOrCreateVisitorId()
  const initialSession = getOrCreateSession(sessionTimeoutMs)

  const initialReferrer =
    typeof document !== 'undefined' ? document.referrer : ''
  const referrerDomain = extractReferrerDomain(initialReferrer)

  const screenResolution =
    typeof screen !== 'undefined'
      ? `${screen.width}x${screen.height}`
      : 'unknown'
  const browserLanguage =
    typeof navigator !== 'undefined' ? navigator.language : 'unknown'
  const userAgent =
    typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'

  const sessionAtom = atom<WebAnalyticsSession>(
    {
      id: initialSession.id,
      isNew: initialSession.isNew,
      startedAt: initialSession.startedAt,
      pageviews: initialSession.pageviews,
    },
    'analytics.session',
  )

  const otlp = connectOpentelemetry({
    endpoint: options.endpoint,
    headers: options.headers,
    resourceAttributes: () => ({
      'service.name': siteDomain,
      'telemetry.sdk.name': 'reatom',
      'telemetry.sdk.language': 'webjs',
      'browser.language': browserLanguage,
      'user_agent.original': userAgent,
      'screen.resolution': screenResolution,
      'analytics.visitor.id': visitor.id,
      'analytics.visitor.is_new': visitor.isNew,
      'analytics.session.id': sessionAtom().id,
      'analytics.session.is_new': sessionAtom().isNew,
    }),
    batchInterval: options.batchInterval,
    scopeName: 'reatom.analytics',
  })

  const refreshSession = (): WebAnalyticsSession => {
    const current = sessionAtom()
    const elapsed = Date.now() - current.startedAt
    const isTimedOut =
      elapsed >= sessionTimeoutMs && current.pageviews > 0

    if (isTimedOut) {
      const newSession: WebAnalyticsSession = {
        id: generateSpanId() + generateSpanId(),
        isNew: true,
        startedAt: Date.now(),
        pageviews: 0,
      }
      sessionAtom.set(newSession)
      persistSession({
        id: newSession.id,
        startedAt: newSession.startedAt,
        lastActivityAt: Date.now(),
        pageviews: 0,
      })
      return newSession
    }

    const updatedSession: WebAnalyticsSession = {
      ...current,
      pageviews: current.pageviews + 1,
    }
    sessionAtom.set(updatedSession)
    persistSession({
      id: updatedSession.id,
      startedAt: updatedSession.startedAt,
      lastActivityAt: Date.now(),
      pageviews: updatedSession.pageviews,
    })
    return updatedSession
  }

  let pendingPageviewSpan: SpanData | null = null

  const finalizeCurrentPageview = (): void => {
    if (pendingPageviewSpan) {
      pendingPageviewSpan.endTimeMs = Date.now()
      otlp.sendSpan(pendingPageviewSpan)
      pendingPageviewSpan = null
    }
  }

  const trackPageview = (url: URL): void => {
    finalizeCurrentPageview()

    const session = refreshSession()
    const pagePath = getPagePath(url, hashMode)
    const isEntryPage = session.pageviews <= 1

    const searchParams = new URLSearchParams(url.search)
    const utmAttributes = extractUtmParams(searchParams)

    const viewportWidth =
      typeof window !== 'undefined' ? window.innerWidth : 0
    const viewportHeight =
      typeof window !== 'undefined' ? window.innerHeight : 0

    const spanAttributes: Record<string, OtlpAttrPrimitive> = {
      'analytics.event': 'pageview',
      'analytics.page.url': url.href,
      'analytics.page.path': pagePath,
      'analytics.page.title':
        typeof document !== 'undefined' ? document.title : '',
      'analytics.page.is_entry': isEntryPage,
      'analytics.viewport.width': viewportWidth,
      'analytics.viewport.height': viewportHeight,
      ...utmAttributes,
    }

    if (referrerDomain && referrerDomain !== siteDomain) {
      spanAttributes['analytics.page.referrer'] = referrerDomain
      spanAttributes['analytics.page.referrer.url'] = initialReferrer
    }

    if (url.search) {
      spanAttributes['analytics.page.query'] = url.search
    }

    pendingPageviewSpan = {
      traceId: generateTraceId(),
      spanId: generateSpanId(),
      name: 'pageview',
      kind: 'client',
      startTimeMs: Date.now(),
      endTimeMs: Date.now(),
      attributes: spanAttributes,
      status: { code: 'ok' },
    }
  }

  const trackEventAction = action(
    (
      eventName: string,
      props?: Record<string, OtlpAttrPrimitive>,
    ): void => {
      refreshSession()

      const eventAttributes: Record<string, OtlpAttrPrimitive> = {
        'analytics.event': 'custom',
        'analytics.event.name': eventName,
        'analytics.page.url':
          typeof window !== 'undefined'
            ? window.location.href
            : 'unknown',
        'analytics.page.path':
          typeof window !== 'undefined'
            ? getPagePath(new URL(window.location.href), hashMode)
            : 'unknown',
        ...props,
      }

      otlp.sendSpan({
        traceId: generateTraceId(),
        spanId: generateSpanId(),
        name: `event:${eventName}`,
        kind: 'client',
        startTimeMs: Date.now(),
        endTimeMs: Date.now(),
        attributes: eventAttributes,
        status: { code: 'ok' },
      })
    },
    'analytics.trackEvent',
  )

  let previousPagePath = ''
  const unsubscribers: Array<Unsubscribe> = []

  const pageviewTracker = effect(() => {
    const url = urlAtom()
    if (!url) return

    const currentPath =
      getPagePath(url, hashMode) + (hashMode ? '' : url.search)
    if (currentPath === previousPagePath) return

    previousPagePath = currentPath
    trackPageview(url)
  }, 'analytics._pageviewTracker')

  unsubscribers.push(pageviewTracker.unsubscribe)

  if (typeof document !== 'undefined') {
    const visibilityHandler = (): void => {
      if (document.visibilityState === 'hidden') {
        finalizeCurrentPageview()
      }
    }
    document.addEventListener('visibilitychange', visibilityHandler)
    unsubscribers.push(() =>
      document.removeEventListener(
        'visibilitychange',
        visibilityHandler,
      ),
    )
  }

  const destroyAnalytics = (): void => {
    finalizeCurrentPageview()
    for (const unsub of unsubscribers) unsub()
    unsubscribers.length = 0
    otlp.destroy()
  }

  return {
    session: sessionAtom,
    trackEvent: trackEventAction,
    flush: () => {
      finalizeCurrentPageview()
      return otlp.flush()
    },
    destroy: destroyAnalytics,
  }
}
