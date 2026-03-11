import type { Atom, AtomLike, Frame, GenericAction } from '../core'
import { action, addGlobalExtension, atom, computed } from '../core'
import { withConnectHook } from '../extensions'
import {
  createOtlpTraceRequest,
  generateSpanId,
  getOtlpTracesUrl,
  sendOtlpTraces,
  withOpentelemetry,
  type OpentelemetryEvent,
  type OpentelemetrySpan,
  type WithOpentelemetryFactory,
} from '../extensions/withOpentelemetry'
import type { Unsubscribe } from '../utils'
import { isBrowser, isRec, noop } from '../utils'
import { onEvent } from './onEvent'

export type WebAnalyticsNavigationSource = 'load' | 'manual' | 'navigation'
export type WebAnalyticsStatus =
  | 'disabled'
  | 'error'
  | 'idle'
  | 'offline'
  | 'scheduled'
  | 'sending'

export interface WebAnalyticsSession {
  events: number
  landingHref: string
  lastEventAt: number
  pageViews: number
  referrer: string
  sessionId: string
  startedAt: number
}

export interface WebAnalyticsPage {
  hash: string
  href: string
  origin: string
  pageViewId: string
  pathname: string
  referrer: string
  search: string
  source: WebAnalyticsNavigationSource
  timestamp: number
  title: string
}

export interface WebAnalyticsPageView extends WebAnalyticsPage {
  sessionId: string
  type: 'page_view'
}

export interface WebAnalyticsCustomEvent {
  attributes: Record<string, unknown>
  href: string
  name: string
  pageViewId: string
  pathname: string
  sessionId: string
  timestamp: number
  title: string
  type: 'event'
}

export interface WebAnalyticsPageViewInput {
  referrer?: string
  source?: WebAnalyticsNavigationSource
  title?: string
}

export interface WebAnalyticsObserveOptions {
  actions?: boolean
  match?: (name: string, frame: Frame) => boolean
  states?: boolean
}

export interface ConnectWebAnalyticsOptions {
  autoPageViews?: boolean
  batchDelay?: number
  enabled?: boolean
  endpoint: string | URL
  environment?: string
  headers?: HeadersInit
  name?: string
  observe?: WebAnalyticsObserveOptions
  resourceAttributes?:
    | Record<string, unknown>
    | (() => Record<string, unknown>)
  scopeName?: string
  scopeVersion?: string
  sendBeacon?: Navigator['sendBeacon']
  serviceName: string
  serviceVersion?: string
  transport?: typeof globalThis.fetch
}

export interface WebAnalytics {
  connect: GenericAction<() => void>
  connected: Atom<boolean>
  disconnect: GenericAction<() => void>
  enabled: Atom<boolean>
  event: GenericAction<
    (
      name: string,
      attributes?: Record<string, unknown>,
    ) => WebAnalyticsCustomEvent | null
  >
  flush: WithOpentelemetryFactory['flush']
  lastError: WithOpentelemetryFactory['lastError']
  lastFlushAt: WithOpentelemetryFactory['lastFlushAt']
  online: Atom<boolean>
  page: Atom<WebAnalyticsPage>
  pageView: GenericAction<
    (input?: WebAnalyticsPageViewInput) => WebAnalyticsPageView | null
  >
  queue: Atom<Array<OpentelemetrySpan>>
  session: Atom<WebAnalyticsSession>
  status: AtomLike<WebAnalyticsStatus>
  telemetry: WithOpentelemetryFactory
}

const hasHeaders = (headers?: HeadersInit): boolean =>
  headers !== undefined && Array.from(new Headers(headers).keys()).length > 0

const prefixAttributes = (
  prefix: string,
  attributes: Record<string, unknown>,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(attributes)) {
    result[`${prefix}${key}`] = value
  }

  return result
}

const isPageViewPayload = (value: unknown): value is WebAnalyticsPageView =>
  isRec(value) &&
  value.type === 'page_view' &&
  typeof value.sessionId === 'string' &&
  typeof value.pageViewId === 'string' &&
  typeof value.href === 'string'

const isCustomEventPayload = (value: unknown): value is WebAnalyticsCustomEvent =>
  isRec(value) &&
  value.type === 'event' &&
  typeof value.name === 'string' &&
  typeof value.pageViewId === 'string' &&
  typeof value.sessionId === 'string' &&
  isRec(value.attributes)

const pageAttributes = (payload: WebAnalyticsPageView): Record<string, unknown> => ({
  'analytics.event.type': payload.type,
  'document.title': payload.title,
  'navigation.source': payload.source,
  'page.referrer': payload.referrer,
  'page.view.id': payload.pageViewId,
  'session.id': payload.sessionId,
  'url.fragment': payload.hash,
  'url.full': payload.href,
  'url.origin': payload.origin,
  'url.path': payload.pathname,
  'url.query': payload.search,
})

const eventAttributes = (
  payload: WebAnalyticsCustomEvent,
): Record<string, unknown> => ({
  'analytics.event.type': payload.type,
  'document.title': payload.title,
  'event.name': payload.name,
  'page.view.id': payload.pageViewId,
  'session.id': payload.sessionId,
  'url.full': payload.href,
  'url.path': payload.pathname,
  ...prefixAttributes('event.attribute.', payload.attributes),
})

const createPageSnapshot = (
  source: WebAnalyticsNavigationSource,
  referrer: string,
  title?: string,
): WebAnalyticsPage => {
  const currentUrl = new URL(window.location.href)

  return {
    hash: currentUrl.hash,
    href: currentUrl.toString(),
    origin: currentUrl.origin,
    pageViewId: generateSpanId(),
    pathname: currentUrl.pathname,
    referrer,
    search: currentUrl.search,
    source,
    timestamp: Date.now(),
    title: title ?? document.title,
  }
}

const createSessionState = (): WebAnalyticsSession => ({
  events: 0,
  landingHref: window.location.href,
  lastEventAt: Date.now(),
  pageViews: 0,
  referrer: document.referrer,
  sessionId: generateSpanId(),
  startedAt: Date.now(),
})

const installHistoryPatch = (eventName: string): Unsubscribe => {
  const pushState: History['pushState'] = window.history.pushState.bind(
    window.history,
  )
  const replaceState: History['replaceState'] = window.history.replaceState.bind(
    window.history,
  )

  const emitNavigation = () => {
    window.dispatchEvent(new Event(eventName))
  }

  window.history.pushState = (...params) => {
    const result = pushState(...params)
    emitNavigation()
    return result
  }

  window.history.replaceState = (...params) => {
    const result = replaceState(...params)
    emitNavigation()
    return result
  }

  return () => {
    window.history.pushState = pushState
    window.history.replaceState = replaceState
  }
}

export const connectWebAnalytics = ({
  autoPageViews = true,
  batchDelay = 1000,
  enabled: initialEnabled = true,
  endpoint,
  environment,
  headers,
  name = 'webAnalytics',
  observe,
  resourceAttributes,
  scopeName = '@reatom/web-analytics',
  scopeVersion,
  sendBeacon,
  serviceName,
  serviceVersion,
  transport,
}: ConnectWebAnalyticsOptions): WebAnalytics => {
  if (!isBrowser()) {
    throw new Error('connectWebAnalytics requires a browser environment')
  }

  const navigationEventName = `${name}:navigation`
  const connected = atom(false, `${name}.connected`)
  const enabled = atom(initialEnabled, `${name}.enabled`)
  const online = atom(navigator.onLine, `${name}.online`)
  const session = atom(createSessionState(), `${name}.session`)
  const page = atom(
    createPageSnapshot('load', document.referrer),
    `${name}.page`,
  )

  const resolveResourceAttributes = () => {
    const dynamicResourceAttributes =
      typeof resourceAttributes === 'function'
        ? resourceAttributes()
        : resourceAttributes

    return {
      'browser.language': navigator.language,
      'deployment.environment': environment,
      'screen.height': window.screen?.height,
      'screen.width': window.screen?.width,
      'service.name': serviceName,
      'service.version': serviceVersion,
      'url.origin': window.location.origin,
      'user_agent.original': navigator.userAgent,
      ...dynamicResourceAttributes,
    }
  }

  const supportsBeacon = !hasHeaders(headers)
  const deliveredSpanIds = new Set<string>()
  const inFlightSpanIds = new Set<string>()
  const rememberDeliveredSpan = (spanId: string) => {
    deliveredSpanIds.add(spanId)

    while (deliveredSpanIds.size > 5000) {
      const oldestSpanId = deliveredSpanIds.values().next().value

      if (oldestSpanId === undefined) {
        break
      }

      deliveredSpanIds.delete(oldestSpanId)
    }
  }
  const telemetry = withOpentelemetry({
    batchDelay,
    canFlush: () => online(),
    defaultResourceAttributes: resolveResourceAttributes,
    name: `${name}.telemetry`,
    send: async ({ reason, resourceAttributes, spans }) => {
      const pendingSpans = spans.filter(
        (span) =>
          !deliveredSpanIds.has(span.spanId) &&
          !inFlightSpanIds.has(span.spanId),
      )

      if (pendingSpans.length === 0) return

      for (const span of pendingSpans) {
        inFlightSpanIds.add(span.spanId)
      }

      try {
        const useBeacon =
          supportsBeacon &&
          (reason === 'pagehide' || reason === 'visibilitychange')

        if (useBeacon) {
          const beaconTransport =
            sendBeacon ?? navigator.sendBeacon?.bind(navigator)

          if (beaconTransport) {
            const requestBody = JSON.stringify(
              createOtlpTraceRequest({
                resourceAttributes,
                scopeName,
                scopeVersion,
                spans: pendingSpans,
              }),
            )

            if (
              beaconTransport(
                getOtlpTracesUrl(endpoint),
                new Blob([requestBody], { type: 'application/json' }),
              )
            ) {
              for (const span of pendingSpans) {
                rememberDeliveredSpan(span.spanId)
              }

              return
            }
          }
        }

        await sendOtlpTraces({
          endpoint,
          headers,
          keepalive: useBeacon,
          resourceAttributes,
          scopeName,
          scopeVersion,
          spans: pendingSpans,
          transport,
        })

        for (const span of pendingSpans) {
          rememberDeliveredSpan(span.spanId)
        }
      } finally {
        for (const span of pendingSpans) {
          inFlightSpanIds.delete(span.spanId)
        }
      }
    },
  })

  const analyticsEnabled = () => connected() && enabled()

  const pageView = action(
    (input: WebAnalyticsPageViewInput = {}) => {
      if (!analyticsEnabled()) return null

      const currentSession = session()
      const nextPage = createPageSnapshot(
        input.source ?? 'manual',
        input.referrer ?? page().referrer,
        input.title,
      )
      const nextSession = {
        ...currentSession,
        lastEventAt: nextPage.timestamp,
        pageViews: currentSession.pageViews + 1,
      }

      page.set(nextPage)
      session.set(nextSession)

      return {
        ...nextPage,
        sessionId: nextSession.sessionId,
        type: 'page_view' as const,
      }
    },
    `${name}.pageView`,
  ).extend(
    telemetry({
      getAttributes: (event: OpentelemetryEvent) =>
        event.type === 'action' && isPageViewPayload(event.payload)
          ? pageAttributes(event.payload)
          : undefined,
      getSpanName: 'web.page_view',
      kind: 'client',
      match: () => analyticsEnabled(),
    }),
  )

  const event = action(
    (eventName: string, attributes: Record<string, unknown> = {}) => {
      if (!analyticsEnabled()) return null

      const currentSession = session()
      const currentPage = page()
      const timestamp = Date.now()
      const nextSession = {
        ...currentSession,
        events: currentSession.events + 1,
        lastEventAt: timestamp,
      }

      session.set(nextSession)

      return {
        attributes,
        href: currentPage.href,
        name: eventName,
        pageViewId: currentPage.pageViewId,
        pathname: currentPage.pathname,
        sessionId: nextSession.sessionId,
        timestamp,
        title: currentPage.title,
        type: 'event' as const,
      }
    },
    `${name}.event`,
  ).extend(
    telemetry({
      getAttributes: (payloadEvent: OpentelemetryEvent) =>
        payloadEvent.type === 'action' && isCustomEventPayload(payloadEvent.payload)
          ? eventAttributes(payloadEvent.payload)
          : undefined,
      getSpanName: 'web.event',
      kind: 'client',
      match: () => analyticsEnabled(),
    }),
  )

  const status = computed<WebAnalyticsStatus>(() => {
    const isOnline = online()

    if (!enabled()) return 'disabled'
    if (!isOnline && telemetry.queue().length > 0) return 'offline'
    if (telemetry.pending()) return 'sending'
    if (telemetry.lastError()) return 'error'
    if (telemetry.queue().length > 0) return 'scheduled'
    return 'idle'
  }, `${name}.status`)

  const trackCurrentPageView = (source: WebAnalyticsNavigationSource) => {
    const currentPage = page()

    if (source !== 'load' && window.location.href === currentPage.href) {
      return
    }

    pageView({
      referrer: source === 'navigation' ? currentPage.href : document.referrer,
      source,
    })
  }

  const lifecycle = atom(0, `${name}._lifecycle`).extend(
    withConnectHook(() => {
      connected.set(true)

      const restoreHistory = installHistoryPatch(navigationEventName)
      const unsubscribes: Array<Unsubscribe> = [
        onEvent(window, navigationEventName, () => {
          trackCurrentPageView('navigation')
        }),
        onEvent(window, 'popstate', () => {
          trackCurrentPageView('navigation')
        }),
        onEvent(window, 'hashchange', () => {
          trackCurrentPageView('navigation')
        }),
        onEvent(window, 'online', () => {
          online.set(true)
          void telemetry.flush('online').catch(noop)
        }),
        onEvent(window, 'offline', () => {
          online.set(false)
        }),
        onEvent(window, 'pagehide', () => {
          void telemetry.flush('pagehide').catch(noop)
        }),
        onEvent(document, 'visibilitychange', () => {
          if (document.visibilityState === 'hidden') {
            void telemetry.flush('visibilitychange').catch(noop)
          }
        }),
      ]

      if (autoPageViews) {
        trackCurrentPageView('load')
      }

      return () => {
        for (const unsubscribe of unsubscribes) {
          unsubscribe()
        }

        restoreHistory()
        connected.set(false)

        void telemetry.flush('disconnect').catch(noop)
      }
    }),
  )

  let unsubscribeLifecycle: Unsubscribe | undefined

  const connect = action(() => {
    if (unsubscribeLifecycle !== undefined) return
    unsubscribeLifecycle = lifecycle.subscribe()
  }, `${name}.connect`)

  const disconnect = action(() => {
    unsubscribeLifecycle?.()
    unsubscribeLifecycle = undefined
  }, `${name}.disconnect`)

  connect()

  if (observe) {
    const observeActions = observe.actions ?? true
    const observeStates = observe.states ?? false

    if (observeActions || observeStates) {
      addGlobalExtension(
        telemetry({
          kind: 'internal',
          match: (payloadEvent, frame) => {
            if (!analyticsEnabled()) return false
            if (payloadEvent.type === 'action' && !observeActions) return false
            if (payloadEvent.type === 'atom' && !observeStates) return false
            return observe.match?.(payloadEvent.target.name, frame) ?? true
          },
        }),
      )
    }
  }

  return {
    connect,
    connected,
    disconnect,
    enabled,
    event,
    flush: telemetry.flush,
    lastError: telemetry.lastError,
    lastFlushAt: telemetry.lastFlushAt,
    online,
    page,
    pageView,
    queue: telemetry.queue,
    session,
    status,
    telemetry,
  }
}
