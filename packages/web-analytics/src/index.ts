import { action, atom } from '@reatom/core'
import { reatomOpentelemetry } from '@reatom/opentelemetry'


export interface WebAnalyticsOptions {
  withOTel: ReturnType<typeof reatomOpentelemetry>
  autoPageViews?: boolean
}

const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

export const connectWebAnalytics = (options: WebAnalyticsOptions) => {
  const { withOTel, autoPageViews = false } = options

  const trackEvent = action(
    (name: string, properties?: Record<string, any>) => {
      return { name, properties }
    },
    'webAnalytics.trackEvent',
  ).extend(withOTel({ kind: 'client' }))

  const visibilityAtom = atom(
    typeof document !== 'undefined' ? document.visibilityState : 'visible',
    'webAnalytics.visibility',
  ).extend(withOTel({ kind: 'client' }))

  const urlAtom = atom(
    typeof window !== 'undefined' ? window.location.href : '',
    'webAnalytics.url',
  ).extend(withOTel({ kind: 'client' }))

  const onlineAtom = atom(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
    'webAnalytics.online',
  ).extend(withOTel({ kind: 'client' }))

  const focusAtom = atom(
    typeof document !== 'undefined' ? document.hasFocus() : true,
    'webAnalytics.focus',
  ).extend(withOTel({ kind: 'client' }))

  const visitorAtom = atom((ctx) => {
    let visitorId = ''
    if (typeof window !== 'undefined') {
      visitorId = window.localStorage.getItem('reatom_visitor_id') || ''
      if (!visitorId) {
        visitorId = generateId()
        window.localStorage.setItem('reatom_visitor_id', visitorId)
      }
    }
    return visitorId
  }, 'webAnalytics.visitor').extend(withOTel({ kind: 'client' }))

  const sessionAtom = atom((ctx) => {
    let sessionId = ''
    let count = 0
    if (typeof window !== 'undefined') {
      sessionId = window.sessionStorage.getItem('reatom_session_id') || ''
      count = parseInt(window.sessionStorage.getItem('reatom_session_count') || '0', 10)
      if (!sessionId) {
        sessionId = generateId()
        count += 1
        window.sessionStorage.setItem('reatom_session_id', sessionId)
        window.sessionStorage.setItem('reatom_session_count', count.toString())
      }
    }
    return { id: sessionId, count }
  }, 'webAnalytics.session').extend(withOTel({ kind: 'client' }))

  const getMetadata = () => {
    if (typeof window === 'undefined') return {}
    return {
      url: window.location.href,
      path: window.location.pathname,
      query: window.location.search,
      hash: window.location.hash,
      title: document?.title || '',
      referrer: document?.referrer || '',
      timestamp: Date.now(),
    }
  }

  const metadataAtom = atom(getMetadata(), 'webAnalytics.metadata').extend(withOTel({ kind: 'client' }))

  const getContext = () => {
    if (typeof window === 'undefined') return {}
    return {
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      screenWidth: window.screen?.width,
      screenHeight: window.screen?.height,
    }
  }

  const contextAtom = atom(getContext(), 'webAnalytics.context').extend(withOTel({ kind: 'client' }))

  const getUtm = () => {
    if (typeof window === 'undefined') return {}
    const params = new URLSearchParams(window.location.search)
    return {
      source: params.get('utm_source'),
      medium: params.get('utm_medium'),
      campaign: params.get('utm_campaign'),
      term: params.get('utm_term'),
      content: params.get('utm_content'),
    }
  }

  const utmAtom = atom(getUtm(), 'webAnalytics.utm').extend(withOTel({ kind: 'client' }))

  const pageView = action(
    (ctx) => {
      trackEvent('page_view', {
        ...ctx.get(metadataAtom),
        ...ctx.get(utmAtom),
        visitorId: ctx.get(visitorAtom),
        sessionId: ctx.get(sessionAtom).id,
      })
    },
    'webAnalytics.pageView',
  ).extend(withOTel({ kind: 'client' }))

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      visibilityAtom.set(document.visibilityState)
      if (document.visibilityState === 'hidden') {
        trackEvent('page_hide')
      }
    })
  }

  if (typeof window !== 'undefined') {
    const handleUrlChange = () => {
      const url = window.location.href
      if (urlAtom() !== url) {
        urlAtom.set(url)
        metadataAtom.set(getMetadata())
        utmAtom.set(getUtm())
        if (autoPageViews) {
          pageView()
        }
      }
    }

    window.addEventListener('popstate', handleUrlChange)
    
    // Attempt to handle pushState/replaceState
    const originalPushState = window.history.pushState
    window.history.pushState = function (...args) {
      originalPushState.apply(this, args)
      handleUrlChange()
    }
    
    const originalReplaceState = window.history.replaceState
    window.history.replaceState = function (...args) {
      originalReplaceState.apply(this, args)
      handleUrlChange()
    }

    window.addEventListener('online', () => onlineAtom.set(true))
    window.addEventListener('offline', () => onlineAtom.set(false))
    window.addEventListener('focus', () => focusAtom.set(true))
    window.addEventListener('blur', () => focusAtom.set(false))
    window.addEventListener('resize', () => contextAtom.set(getContext()))
    window.addEventListener('pagehide', () => trackEvent('page_unload'))

    window.addEventListener('error', (event) => {
      trackEvent('unhandled_error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      })
    })

    window.addEventListener('unhandledrejection', (event) => {
      trackEvent('unhandled_rejection', {
        reason: String(event.reason),
      })
    })

    // initial page view if configured
    if (autoPageViews) {
      pageView()
    }
  }

  return {
    trackEvent,
    pageView,
    visibilityAtom,
    urlAtom,
    onlineAtom,
    focusAtom,
    visitorAtom,
    sessionAtom,
    metadataAtom,
    contextAtom,
    utmAtom,
  }
}
