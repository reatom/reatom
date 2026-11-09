import { internalsOf } from '../instanceInternals.ts'
import { assertFeature, featureControl } from '../feature.ts'
import { resolveSampling, sampleSessionRatio } from '../sampling.ts'
import {
  effectiveConsentOf,
  setBrowserMetadata,
  setBrowserSessionSampling,
} from '../browserCapture.ts'
import {
  abortVar,
  action,
  atom,
  computed,
  type BooleanAtom,
  type Computed,
  type Ext,
  onEvent,
  urlAtom,
  visibilityAtom,
  wrap,
  type Action,
  type Atom,
} from '@reatom/core'

import { internalName } from '../internalName.ts'
import { EMAIL_SCRUB } from '../scrubEmail.ts'
import { isDevelopment } from '../devWarnings.ts'
import { OTEL } from '../diag.ts'
import { exceptionType } from '../errorMetadata.ts'
import {
  markBrowserErrorReported,
  hasStandaloneBrowserErrors,
} from '../reportedBrowserErrors.ts'
import { type BrowserTelemetry } from '../captureEngine.ts'
import type { SpanContext } from '../traceContext.ts'
import type { OtlpAttrValue } from '../toOtlpValue.ts'
import {
  attributionPairAttributes,
  campaignFingerprint,
  DEFAULT_ATTRIBUTION_PARAMS,
  DEFAULT_SESSION_TIMEOUT_MS,
  deletePrefixedKeys,
  fingerprintFromAttribution,
  hasAttributionValues,
  hasRecordedPageView,
  hasWindow,
  isSameOriginReferrer,
  isStoredSession,
  isStoredVisitor,
  lastTouchPageAttributes,
  mintIdentityId,
  pruneRateWindow,
  readCampaign,
  readDocumentHasFocus,
  readStorageJson,
  rememberRecordedPageView,
  resolveConsentSource,
  sessionStorageKey,
  shouldExpireVisitor,
  shouldRotateCampaign,
  shouldRotateIdle,
  shouldRotateMidnight,
  type Attribution,
  type StoredSession,
  type StoredVisitor,
  visitorStorageKey,
  webStorage,
  writeStorageJson,
} from './identity.ts'

export type { Attribution }

export type NavigationSource = 'urlAtom' | 'navigation-api' | 'popstate'

export type AnalyticsSession = {
  id?: string
  start?: number
  previousId?: string
}

export type AnalyticsPage = {
  path?: string
  url?: string
  name?: string
}

type BooleanReader = {
  (): boolean
}

type ConsentSnapshotReader = {
  ():
    | {
        submitted?: boolean
        categories?: { analytics?: boolean }
      }
    | null
    | undefined
}

type AnalyticsConsentCategories = {
  analytics: BooleanReader
}

type AnalyticsConsentForm = {
  fields: { analytics: BooleanReader }
  snapshot: ConsentSnapshotReader
}

export interface WebAnalyticsOptions {
  /**
   * Analytics send and identity storage stay off when this is omitted, false,
   * or an analytics category that is not true. A `reatomGDPR` form grants only
   * from its submitted snapshot, not live checkboxes. `diagnostics` is not a
   * back door.
   */
  consent?:
    boolean | BooleanReader | AnalyticsConsentCategories | AnalyticsConsentForm
  autoPageViews?: boolean
  errors?: boolean
  persistVisitor?: boolean
  /** Persist session identity and sampling decision. Default true. */
  persistSession?: boolean
  captureQuery?: boolean
  captureErrorDetails?: boolean
  navigation?: NavigationSource
  storageKey?: string
  sessionTimeout?: number
  /** Absolute session lifetime in milliseconds. Default four hours. */
  sessionMaxLifetime?: number
  perTab?: boolean
  rotateAtMidnight?: boolean
  attributionParams?: string[]
  /** Analytics exception ratio (`analytics.sampling.errors`). Default 1. */
  errorSampling?: number
  /**
   * Per-signature error cap and per-name event cap, each per page per minute.
   * Defaults 10 and 60. `0` means no client cap.
   */
  rateLimit?: {
    errorsPerMin?: number
    eventsPerMin?: number
    byName?: Record<string, number>
  }
}

type ReadonlyChild<T> = Computed<T>

export interface WebAnalytics extends BooleanAtom {
  visitor: ReadonlyChild<string | undefined>
  session: ReadonlyChild<AnalyticsSession>
  page: ReadonlyChild<AnalyticsPage>
  attribution: ReadonlyChild<Attribution>
  focus: ReadonlyChild<boolean>
  pageView: Action<[attributes?: Record<string, OtlpAttrValue>], void>
  setView: Action<[name?: string], void>
  rotateSession: Action<[expectedId?: string], void>
}

const toPublicSession = (session: StoredSession): AnalyticsSession => ({
  id: session.id,
  start: session.startedAt,
  previousId: session.previousId,
})

type AnalyticsState = {
  visitorStateAtom: Atom<StoredVisitor | undefined>
  sessionStateAtom: Atom<StoredSession | undefined>
  memorySessionAtom: Atom<AnalyticsSession>
  pageAtom: Atom<AnalyticsPage>
  focusAtom: Atom<boolean>
}

export const withWebAnalytics =
  (
    options: WebAnalyticsOptions = {},
  ): Ext<BrowserTelemetry, { analytics: WebAnalytics }> =>
  (otel) => {
    assertFeature(otel, 'analytics')
    const prefix = internalName(otel.instanceName, 'analytics')
    const state: AnalyticsState = {
      visitorStateAtom: atom<StoredVisitor | undefined>(
        undefined,
        `${prefix}.visitorStored`,
      ),
      sessionStateAtom: atom<StoredSession | undefined>(
        undefined,
        `${prefix}.sessionStored`,
      ),
      memorySessionAtom: atom<AnalyticsSession>({}, `${prefix}.sessionMemory`),
      pageAtom: atom<AnalyticsPage>({}, `${prefix}.pageState`),
      focusAtom: atom(false, `${prefix}.focusState`),
    }
    let active: ReturnType<typeof installWebAnalytics> | undefined
    let installGeneration = 0
    const control = featureControl(otel, 'analytics', () => {
      const generation = ++installGeneration
      const installed = installWebAnalytics(otel, options, state)
      if (generation === installGeneration) active = installed
      return {
        dispose() {
          installed.dispose()
          if (active === installed) active = undefined
        },
      }
    })
    return {
      analytics: Object.assign(control, {
        visitor: computed(
          () => state.visitorStateAtom()?.id,
          `${prefix}.visitor`,
        ),
        session: computed(() => {
          const stored = state.sessionStateAtom()
          return stored ? toPublicSession(stored) : state.memorySessionAtom()
        }, `${prefix}.session`),
        page: computed(() => state.pageAtom(), `${prefix}.page`),
        attribution: computed(
          () => state.visitorStateAtom()?.lastTouch ?? {},
          `${prefix}.attribution`,
        ),
        focus: computed(() => state.focusAtom(), `${prefix}.focus`),
        setView: action(
          (name?: string) => active?.setView(name),
          `${prefix}.setView`,
        ),
        rotateSession: action(
          (expectedId?: string) => active?.rotateSession(expectedId),
          `${prefix}.rotateSession`,
        ),
        pageView: action(
          (attributes?: Record<string, OtlpAttrValue>) =>
            active?.pageView(attributes),
          `${prefix}.pageView`,
        ),
      }),
    }
  }

const readNavigationTarget = (): EventTarget | undefined => {
  if (!hasWindow()) return undefined
  const navigation = (
    window as Window & { navigation?: { addEventListener?: unknown } }
  ).navigation
  if (navigation && typeof navigation.addEventListener === 'function') {
    return navigation as EventTarget
  }
  return undefined
}

const ACTIVE_IDLE_MS = 5_000
const ENGAGEMENT_EVENT = 'app.page.engagement'
const VISIBLE_MS_ATTR = 'app.engagement.visible_ms'
const ACTIVE_MS_ATTR = 'app.engagement.active_ms'
const INPUT_EVENT_TYPES = [
  'pointerdown',
  'keydown',
  'scroll',
  'touchstart',
] as const
const DEFAULT_ERRORS_PER_MIN = 10
const DEFAULT_EVENTS_PER_MIN = 60
const EXCEPTION_EVENT = 'exception'
const EXCEPTION_SUPPRESSED_EVENT = 'exception.suppressed'
const PHONE_SCRUB =
  /(?<![\dA-Fa-f])(?:\+|00)?(?:\d[\s().\-]?){10,15}\d(?![\dA-Fa-f])/g

const scrubAnalyticsText = (value: string) =>
  value.replace(EMAIL_SCRUB, '[email]').replace(PHONE_SCRUB, '[phone]')

const firstStackFrame = (stack: string | undefined): string => {
  if (!stack) return ''
  for (const line of stack.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('at ') && !trimmed.includes('@')) continue
    const named = /^at\s+(\S+)\s+\((.+):(\d+):\d+\)$/.exec(trimmed)
    if (named) return `${named[2]}:${named[3]}:${named[1]}`
    const bare = /^at\s+(.+):(\d+):\d+$/.exec(trimmed)
    if (bare) return `${bare[1]}:${bare[2]}:`
    const gecko = /^(.*)@(.+):(\d+):\d+$/.exec(trimmed)
    if (gecko) return `${gecko[2]}:${gecko[3]}:${gecko[1]}`
  }
  return ''
}

const errorFromWindowEvent = (event: Event, type: string): unknown => {
  if (type === 'unhandledrejection') {
    return (event as PromiseRejectionEvent).reason
  }
  const errorEvent = event as ErrorEvent
  if ('error' in errorEvent && errorEvent.error != null) return errorEvent.error
  if (typeof errorEvent.message === 'string') {
    return new Error(errorEvent.message)
  }
  return undefined
}

type TracePair = { traceId: string; spanId: string }

type SignatureWindow = {
  type: string
  sentAt: number[]
  sent: number
  dropped: number
}

const readPage = (): AnalyticsPage => {
  if (!hasWindow()) return {}
  const href = window.location.href
  const url = new URL(href)
  return {
    path: url.pathname,
    url: `${url.origin}${url.pathname}`,
  }
}

const readPageViewAttributes = (
  captureQuery: boolean,
  params: readonly string[],
): Record<string, OtlpAttrValue> => {
  if (!hasWindow()) return {}
  const url = new URL(window.location.href)
  return {
    'url.path': url.pathname,
    'url.full': captureQuery ? url.href : `${url.origin}${url.pathname}`,
    ...lastTouchPageAttributes(readCampaign(url, params)),
  }
}

const installWebAnalytics = (
  otel: BrowserTelemetry,
  options: WebAnalyticsOptions,
  {
    visitorStateAtom,
    sessionStateAtom,
    memorySessionAtom,
    pageAtom,
    focusAtom,
  }: AnalyticsState,
) => {
  const instanceName = otel.instanceName
  const prefix = internalName(otel.instanceName, 'analytics')
  const stops: Array<() => void> = []
  let analyticsDisposed = false
  let analyticsAbort: AbortController | undefined
  let openedPageViews = 0
  let consentedPageViews = 0
  let consentListenersReady = false
  let analyticsPageContext: TracePair | undefined
  const engagement = {
    runningSinceMs: undefined as number | undefined,
    lastInputAtMs: Date.now(),
    accumulatedVisibleMs: 0,
    accumulatedActiveMs: 0,
  }
  const errorWindows = new Map<string, SignatureWindow>()
  const eventWindows = new Map<string, number[]>()
  const errorsPerMin = options.rateLimit?.errorsPerMin ?? DEFAULT_ERRORS_PER_MIN
  const eventsPerMin = options.rateLimit?.eventsPerMin ?? DEFAULT_EVENTS_PER_MIN
  const eventsByName = options.rateLimit?.byName ?? {}
  const errorSampleRatio = options.errorSampling ?? 1
  const internals = internalsOf(otel)
  const recordedExceptions = internals?.recordedExceptions
  const storageKeyName = options.storageKey ?? instanceName
  const persistVisitor = options.persistVisitor !== false
  const persistSession = options.persistSession !== false
  const sessionTimeout = options.sessionTimeout ?? DEFAULT_SESSION_TIMEOUT_MS
  const sessionMaxLifetime = options.sessionMaxLifetime ?? 4 * 60 * 60 * 1000
  const perTab = options.perTab === true
  const rotateAtMidnight = options.rotateAtMidnight === true
  const attributionParams = options.attributionParams ?? [
    ...DEFAULT_ATTRIBUTION_PARAMS,
  ]
  const visitorKey = visitorStorageKey(storageKeyName)
  const sessionKey = sessionStorageKey(storageKeyName)
  let documentInbound = true
  let identityStorageListening = false
  const cleanup = () => {
    if (analyticsDisposed) return
    analyticsDisposed = true
    try {
      analyticsAbort?.abort()
    } catch {
      /* Aborting an install scope can throw the abort reason. */
    } finally {
      analyticsAbort = undefined
      while (stops.length) {
        try {
          stops.pop()!()
        } catch {
          /* Finish releasing the remaining owned resources. */
        }
      }
      if (internals) {
        internals.rateLimitDrops.count = 0
        internals.invalidateStats()
      }
    }
  }
  try {
    const resolvedConsent = resolveConsentSource(
      options.consent ??
        computed(() => {
          otel()
          return effectiveConsentOf(otel)?.analytics === true
        }, `${prefix}.consent.allowed`),
      `${prefix}.consent.allowed`,
    )
    const consentSource =
      options.consent === undefined
        ? {
            ...resolvedConsent,
            allowed: () => effectiveConsentOf(otel)?.analytics === true,
          }
        : resolvedConsent
    const startedWithoutAnalyticsConsent = !consentSource.allowed()
    stops.push(
      setBrowserMetadata(otel, () => {
        if (!consentSource.allowed()) return {}
        const attrs: Record<string, OtlpAttrValue> = {}
        const id = sessionStateAtom()?.id ?? memorySessionAtom().id
        if (id) attrs['session.id'] = id
        const view = pageAtom().name
        if (view !== undefined) attrs['view.name'] = view
        if (typeof location !== 'undefined') {
          attrs['url.full'] = location.origin + location.pathname
          attrs['url.path'] = location.pathname
          attrs['page.url'] = location.origin + location.pathname
          attrs['page.path'] = location.pathname
        }
        return attrs
      }),
    )

    stops.push(
      setBrowserSessionSampling(otel, () => {
        if (!consentSource.allowed()) return
        const session = sessionStateAtom()
        if (session && typeof session.sampled === 'boolean')
          return { id: session.id, sampled: session.sampled }
        return undefined
      }),
    )

    const pageKey = () => pageAtom().path ?? ''

    const identityAttributes = (): Record<string, OtlpAttrValue> => {
      const attributes: Record<string, OtlpAttrValue> = {}
      const sessionId = sessionStateAtom()?.id ?? memorySessionAtom().id
      const visitorId = visitorStateAtom()?.id
      if (typeof sessionId === 'string') attributes['session.id'] = sessionId
      if (typeof visitorId === 'string')
        attributes['app.visitor.id'] = visitorId
      return attributes
    }

    const attachIdentityStorage = () => {
      if (identityStorageListening || !hasWindow()) return
      identityStorageListening = true
      stops.push(
        onEvent(window, 'storage', (event: Event) => {
          if (!consentSource.allowed()) return
          const storageEvent = event as StorageEvent
          let parsed: unknown
          try {
            parsed = storageEvent.newValue
              ? JSON.parse(storageEvent.newValue)
              : undefined
          } catch {
            return
          }
          if (storageEvent.key === sessionKey && persistSession && !perTab) {
            if (!isStoredSession(parsed)) return
            sessionStateAtom.set(parsed)
          }
          if (storageEvent.key === visitorKey && persistVisitor) {
            if (!isStoredVisitor(parsed)) return
            visitorStateAtom.set(parsed)
          }
        }),
      )
    }

    const consentedAnalyticsAttributes = (
      attributes: Record<string, OtlpAttrValue>,
    ): Record<string, OtlpAttrValue> | undefined => {
      if (!consentSource.allowed()) return
      return {
        ...identityAttributes(),
        ...attributes,
        'app.analytics.consent': consentSource.stamp,
      }
    }

    const logOnPageTrace = (
      eventName: string,
      attributes: Record<string, OtlpAttrValue>,
    ) => {
      const consented = consentedAnalyticsAttributes(attributes)
      if (!consented) return
      const emit = () => otel.log(eventName, consented)
      if (!internals?.currentTrace() && analyticsPageContext) {
        internals
          ? internals.runInTrace(analyticsPageContext as SpanContext, emit)
          : emit()
        return
      }
      emit()
    }

    const logAnalytics = (
      eventName: string,
      attributes: Record<string, OtlpAttrValue>,
    ) => {
      const consented = consentedAnalyticsAttributes(attributes)
      if (!consented) return
      const limit =
        eventName in eventsByName ? eventsByName[eventName]! : eventsPerMin
      if (limit !== 0) {
        const now = Date.now()
        const key = `${pageKey()}\0${eventName}`
        const sentAt = eventWindows.get(key) ?? []
        pruneRateWindow(sentAt, now)
        if (sentAt.length >= limit) {
          if (internals) {
            internals.rateLimitDrops.count++
            internals.invalidateStats()
          }
          eventWindows.set(key, sentAt)
          return
        }
        sentAt.push(now)
        eventWindows.set(key, sentAt)
      }
      otel.log(eventName, consented)
    }

    const mintSession = (
      now: number,
      campaign: string,
      previousId?: string,
    ): StoredSession => {
      const id = mintIdentityId()
      return {
        id,
        sampled: sampleSessionRatio(id, resolveSampling(otel().sampling).ratio),
        startedAt: now,
        lastActivity: now,
        previousId,
        campaign,
        pageViews: 0,
        events: 0,
        engagedMs: 0,
      }
    }

    const syncIdentity = action(
      (input: { inbound: boolean; pageView?: boolean }) => {
        if (!consentSource.allowed()) return
        const now = Date.now()
        const href =
          hasWindow() && typeof window.location?.href === 'string'
            ? window.location.href
            : ''
        const url = href ? new URL(href) : undefined
        const nextFingerprint = url
          ? campaignFingerprint(url, attributionParams)
          : ''
        const nextCampaign = url ? readCampaign(url, attributionParams) : {}
        const referrer =
          typeof document !== 'undefined' ? document.referrer || '' : ''
        const origin = hasWindow() ? window.location.origin : ''
        const inbound = input.inbound && !isSameOriginReferrer(referrer, origin)

        let visitorState = visitorStateAtom()
        if (persistVisitor && !visitorState) {
          const storedVisitor = readStorageJson<unknown>(
            webStorage('local'),
            visitorKey,
          )
          if (isStoredVisitor(storedVisitor)) visitorState = storedVisitor
        }
        if (visitorState && shouldExpireVisitor(visitorState.createdAt, now)) {
          visitorState = undefined
        }
        if (!visitorState) {
          visitorState = {
            id: mintIdentityId(),
            createdAt: now,
            lastSeen: now,
            firstTouch: nextCampaign,
            lastTouch: nextCampaign,
          }
        } else {
          let lastTouch = visitorState.lastTouch
          const lastFingerprint = fingerprintFromAttribution(
            lastTouch,
            attributionParams,
          )
          if (shouldRotateCampaign(inbound, lastFingerprint, nextFingerprint)) {
            lastTouch = nextCampaign
          } else if (inbound && hasAttributionValues(nextCampaign)) {
            lastTouch = {
              ...lastTouch,
              ...nextCampaign,
            }
          }
          visitorState = {
            ...visitorState,
            lastSeen: now,
            lastTouch,
          }
        }

        let sessionState = sessionStateAtom()
        if (!sessionState && persistSession) {
          const storedSession = readStorageJson<unknown>(
            webStorage(perTab ? 'session' : 'local'),
            sessionKey,
          )
          if (isStoredSession(storedSession)) sessionState = storedSession
        }

        let sessionIsNew = false
        if (!sessionState) {
          sessionState = mintSession(now, nextFingerprint)
          sessionIsNew = true
        } else if (
          shouldRotateIdle(sessionState.lastActivity, now, sessionTimeout) ||
          now - sessionState.startedAt >= sessionMaxLifetime ||
          shouldRotateMidnight(sessionState.startedAt, now, rotateAtMidnight) ||
          shouldRotateCampaign(inbound, sessionState.campaign, nextFingerprint)
        ) {
          sessionState = mintSession(now, nextFingerprint, sessionState.id)
          sessionIsNew = true
        } else {
          sessionState = {
            ...sessionState,
            lastActivity: now,
            pageViews: input.pageView
              ? sessionState.pageViews + 1
              : sessionState.pageViews,
          }
        }

        if (input.pageView && sessionIsNew) {
          sessionState = {
            ...sessionState,
            pageViews: sessionState.pageViews + 1,
          }
        }

        if (typeof sessionState.sampled !== 'boolean') {
          sessionState = {
            ...sessionState,
            sampled: sampleSessionRatio(
              sessionState.id,
              resolveSampling(otel().sampling).ratio,
            ),
          }
        }
        visitorStateAtom.set(visitorState)
        sessionStateAtom.set(sessionState)
        if (consentSource.allowed()) {
          if (persistVisitor && visitorState) {
            writeStorageJson(webStorage('local'), visitorKey, visitorState)
          }
          if (sessionState && persistSession) {
            writeStorageJson(
              webStorage(perTab ? 'session' : 'local'),
              sessionKey,
              sessionState,
            )
          }
        }
        if (sessionIsNew && visitorState) {
          const attributes: Record<string, OtlpAttrValue> = {
            ...attributionPairAttributes(
              visitorState.firstTouch,
              visitorState.lastTouch,
            ),
          }
          if (sessionState.previousId) {
            attributes['session.previous_id'] = sessionState.previousId
          }
          logAnalytics('session.start', attributes)
        }
      },
      `${prefix}.syncIdentity`,
    )

    const flushExceptionSummaries = () => {
      if (!consentSource.allowed()) return
      syncIdentity({ inbound: false })
      const prefix = `${pageKey()}\0`
      for (const [key, bucket] of errorWindows) {
        if (!key.startsWith(prefix) || bucket.dropped === 0) continue
        logOnPageTrace(EXCEPTION_SUPPRESSED_EVENT, {
          'exception.type': bucket.type,
          'app.exception.count': bucket.dropped + bucket.sent,
        })
        bucket.dropped = 0
        bucket.sent = 0
      }
    }

    const captureWindowException = (error: unknown) => {
      if (hasStandaloneBrowserErrors(otel)) return
      if (
        typeof error === 'object' &&
        error !== null &&
        recordedExceptions?.has(error)
      ) {
        return
      }
      if (!consentSource.allowed()) return
      syncIdentity({ inbound: documentInbound })
      if (errorSampleRatio < 1 && Math.random() >= errorSampleRatio) return

      const type = exceptionType(error)
      const includeDetails = options.captureErrorDetails === true
      const errorObject = error instanceof Error ? error : undefined
      const scrubbedMessage =
        includeDetails && typeof errorObject?.message === 'string'
          ? scrubAnalyticsText(errorObject.message)
          : ''
      const originalStack =
        includeDetails && typeof errorObject?.stack === 'string'
          ? errorObject.stack
          : undefined
      const frame = includeDetails ? firstStackFrame(originalStack) : ''
      const signature = `${type}\0${scrubbedMessage}\0${frame}`
      const now = Date.now()
      const key = `${pageKey()}\0${signature}`
      const bucket = errorWindows.get(key) ?? {
        type,
        sentAt: [],
        sent: 0,
        dropped: 0,
      }
      pruneRateWindow(bucket.sentAt, now)
      if (errorsPerMin !== 0 && bucket.sentAt.length >= errorsPerMin) {
        bucket.dropped++
        if (internals) {
          internals.rateLimitDrops.count++
          internals.invalidateStats()
        }
        errorWindows.set(key, bucket)
        return
      }
      if (!markBrowserErrorReported(otel, error, now)) return
      bucket.sentAt.push(now)
      bucket.sent++
      errorWindows.set(key, bucket)

      const attributes: Record<string, OtlpAttrValue> = {
        'exception.type': type,
      }
      if (includeDetails) {
        if (scrubbedMessage) attributes['exception.message'] = scrubbedMessage
        if (originalStack) {
          attributes['exception.stacktrace'] = scrubAnalyticsText(originalStack)
        }
      }
      logOnPageTrace(EXCEPTION_EVENT, attributes)
    }

    const emitConsentedPageView = (
      attributes?: Record<string, OtlpAttrValue>,
    ) => {
      if (!consentSource.allowed()) return
      const page = pageAtom()
      rememberRecordedPageView(instanceName, page.path ?? '')
      syncIdentity({ inbound: documentInbound, pageView: true })
      documentInbound = false
      if (!internals?.currentTrace() && !otel.pageTrace()) {
        const path = page.path ?? '/'
        otel.traceVar.set(otel.createTrace({ name: `page_view ${path}` }))
      }
      analyticsPageContext = internals?.currentTrace() ?? otel.pageTrace()
      const isFirstConsentedView = consentedPageViews === 0
      logAnalytics('app.page_view', {
        ...lastTouchPageAttributes(visitorStateAtom()?.lastTouch),
        ...readPageViewAttributes(
          options.captureQuery === true,
          attributionParams,
        ),
        ...attributes,
      })
      consentedPageViews++
      if (isFirstConsentedView && startedWithoutAnalyticsConsent) {
        flushPageEngagement('consent')
      }
    }

    const pageView = action((attributes?: Record<string, OtlpAttrValue>) => {
      if (analyticsDisposed) return
      const currentPath = readPage().path ?? ''
      if (
        openedPageViews === 0 &&
        hasRecordedPageView(instanceName, currentPath)
      ) {
        pageAtom.set({ ...readPage(), name: pageAtom().name })
        openedPageViews++
        consentedPageViews++
        analyticsPageContext = internals?.currentTrace() ?? otel.pageTrace()
        return
      }
      if (openedPageViews > 0) {
        const previousPage = pageKey()
        flushPageEngagement('navigation')
        flushExceptionSummaries()
        if (previousPage !== currentPath) {
          const prefix = `${previousPage}\0`
          deletePrefixedKeys(errorWindows, prefix)
          deletePrefixedKeys(eventWindows, prefix)
        }
      }
      openedPageViews++
      pageAtom.set({ ...readPage(), name: pageAtom().name })
      emitConsentedPageView(attributes)
    }, `${prefix}.pageView`)

    const dispose = action(cleanup, `${prefix}.dispose`)

    const rotateSession = action((expectedId?: string) => {
      if (analyticsDisposed || !consentSource.allowed()) return
      const previous = sessionStateAtom()
      if (expectedId !== undefined && previous?.id !== expectedId) return
      const next = mintSession(
        Date.now(),
        previous?.campaign ?? '',
        previous?.id,
      )
      sessionStateAtom.set(next)
      if (persistSession)
        writeStorageJson(
          webStorage(perTab ? 'session' : 'local'),
          sessionKey,
          next,
        )
      analyticsPageContext = undefined
      logAnalytics(
        'session.start',
        previous ? { 'session.previous_id': previous.id } : {},
      )
    }, `${prefix}.rotateSession`)

    const setView = action((name?: string) => {
      if (analyticsDisposed) return
      const next = name?.slice(0, 256) || undefined
      const previous = pageAtom().name
      if (previous === next) return
      pageAtom.set((page) => ({ ...page, name: next }))
      if (!consentSource.allowed()) return
      syncIdentity({ inbound: false })
      logAnalytics('app.view_change', {
        fromView: previous ?? '',
        toView: next ?? '',
      })
    }, `${prefix}.setView`)

    const model = { pageView, rotateSession, setView, dispose }

    if (!hasWindow()) {
      if (isDevelopment()) {
        console.warn(OTEL + 'no window')
      }
      return model
    }

    if (
      !consentSource.allowed() &&
      !sessionStateAtom()?.id &&
      !memorySessionAtom().id
    ) {
      memorySessionAtom.set({
        id: mintIdentityId(),
        start: Date.now(),
      })
    }

    const navigation =
      options.navigation ??
      (Object.keys(urlAtom.routes).length > 0
        ? 'urlAtom'
        : readNavigationTarget()
          ? 'navigation-api'
          : 'popstate')
    if (
      navigation === 'urlAtom' &&
      urlAtom.catchLinks() &&
      Object.keys(urlAtom.routes).length === 0 &&
      isDevelopment()
    ) {
      console.warn(OTEL + 'urlAtom navigation without routes')
    }

    const addElapsedEngagement = (now = Date.now()) => {
      if (engagement.runningSinceMs === undefined) return
      const elapsedMs = Math.max(0, now - engagement.runningSinceMs)
      engagement.accumulatedVisibleMs += elapsedMs
      const activeWindowEndMs = engagement.lastInputAtMs + ACTIVE_IDLE_MS
      const overlapStartMs = Math.max(
        engagement.runningSinceMs,
        engagement.lastInputAtMs,
      )
      const overlapEndMs = Math.min(now, activeWindowEndMs)
      const overlapMs = overlapEndMs - overlapStartMs
      if (overlapMs > 0) engagement.accumulatedActiveMs += overlapMs
      engagement.runningSinceMs = undefined
    }

    const startEngagementClock = (now = Date.now()) => {
      if (engagement.runningSinceMs !== undefined) return
      if (document.visibilityState !== 'visible' || !readDocumentHasFocus()) {
        return
      }
      engagement.runningSinceMs = now
    }

    const resetRamEngagement = (restartClock: boolean) => {
      addElapsedEngagement()
      engagement.accumulatedVisibleMs = 0
      engagement.accumulatedActiveMs = 0
      if (restartClock) startEngagementClock()
    }

    const flushPageEngagement = (reason: 'hide' | 'navigation' | 'consent') => {
      addElapsedEngagement()
      if (!consentSource.allowed()) {
        if (reason === 'navigation') resetRamEngagement(true)
        return
      }
      const visibleMs = engagement.accumulatedVisibleMs
      const activeMs = engagement.accumulatedActiveMs
      engagement.accumulatedVisibleMs = 0
      engagement.accumulatedActiveMs = 0
      if (reason === 'navigation' || reason === 'consent') {
        startEngagementClock()
      }
      if (visibleMs === 0 && activeMs === 0) return
      syncIdentity({ inbound: false })
      logAnalytics(ENGAGEMENT_EVENT, {
        [VISIBLE_MS_ATTR]: visibleMs,
        [ACTIVE_MS_ATTR]: activeMs,
      })
    }

    analyticsAbort = abortVar.createAndRun(() => {
      analyticsAbort = abortVar.require()

      focusAtom.set(readDocumentHasFocus())
      startEngagementClock()

      if (consentSource.allowed()) attachIdentityStorage()
      const consentAtom = consentSource.atom
      if (consentAtom) {
        stops.push(
          consentAtom.subscribe((allowed: boolean) => {
            if (!allowed) {
              if (consentListenersReady) resetRamEngagement(true)
              return
            }
            attachIdentityStorage()
            if (!consentListenersReady) return
            if (openedPageViews > 0 && consentedPageViews === 0) {
              emitConsentedPageView()
              return
            }
            resetRamEngagement(true)
            if (consentedPageViews === 0) {
              syncIdentity({ inbound: documentInbound })
            }
          }),
        )
      }

      stops.push(visibilityAtom.subscribe())
      stops.push(
        onEvent(document, 'visibilitychange', () => {
          if (document.visibilityState === 'hidden') {
            flushPageEngagement('hide')
            flushExceptionSummaries()
            return
          }
          if (consentSource.allowed()) syncIdentity({ inbound: false })
          addElapsedEngagement()
          startEngagementClock()
        }),
      )

      stops.push(
        onEvent(window, 'focus', () => {
          addElapsedEngagement()
          if (consentSource.allowed()) syncIdentity({ inbound: false })
          engagement.lastInputAtMs = Date.now()
          focusAtom.set(true)
          startEngagementClock()
        }),
      )
      stops.push(
        onEvent(window, 'blur', () => {
          addElapsedEngagement()
          focusAtom.set(false)
        }),
      )

      const markEngagementInput = () => {
        if (consentSource.allowed()) syncIdentity({ inbound: false })
        addElapsedEngagement()
        engagement.lastInputAtMs = Date.now()
        startEngagementClock()
      }
      for (const type of INPUT_EVENT_TYPES) {
        stops.push(
          onEvent(window, type, markEngagementInput, {
            capture: true,
            passive: true,
          }),
        )
      }

      if (navigation === 'urlAtom') {
        stops.push(urlAtom.subscribe(() => pageView()))
      } else if (navigation === 'navigation-api') {
        const navigationTarget = readNavigationTarget()
        if (navigationTarget) {
          const onCurrentEntryChange = wrap(() => {
            pageView()
          })
          navigationTarget.addEventListener(
            'currententrychange',
            onCurrentEntryChange,
          )
          stops.push(() => {
            navigationTarget.removeEventListener(
              'currententrychange',
              onCurrentEntryChange,
            )
          })
        }
      } else {
        const onPopState = wrap(() => {
          pageView()
        })
        window.addEventListener('popstate', onPopState)
        stops.push(() => {
          window.removeEventListener('popstate', onPopState)
        })
      }

      if (options.errors !== false) {
        const onWindowError = wrap((event: Event) => {
          captureWindowException(errorFromWindowEvent(event, 'error'))
        })
        const onUnhandledRejection = wrap((event: Event) => {
          captureWindowException(
            errorFromWindowEvent(event, 'unhandledrejection'),
          )
        })
        stops.push(onEvent(window, 'error', onWindowError))
        stops.push(onEvent(window, 'unhandledrejection', onUnhandledRejection))
      }

      stops.push(
        onEvent(window, 'pagehide', () => flushExceptionSummaries(), {
          capture: true,
        }),
      )

      if (options.autoPageViews !== false && openedPageViews === 0) pageView()
      consentListenersReady = true

      return abortVar.require()
    })

    return model
  } catch (error) {
    try {
      cleanup()
    } catch {
      /* Preserve the original setup failure. */
    }
    throw error
  }
}
