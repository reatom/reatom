import { action, atom } from '@reatom/core'
import { reatomOpentelemetry } from '@reatom/opentelemetry'

export interface WebAnalyticsOptions {
  withOTel: ReturnType<typeof reatomOpentelemetry>
}

export const connectWebAnalytics = (options: WebAnalyticsOptions) => {
  const { withOTel } = options

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

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      visibilityAtom.set(document.visibilityState)
    })
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('popstate', () => {
      urlAtom.set(window.location.href)
    })
    window.addEventListener('online', () => onlineAtom.set(true))
    window.addEventListener('offline', () => onlineAtom.set(false))
    window.addEventListener('focus', () => focusAtom.set(true))
    window.addEventListener('blur', () => focusAtom.set(false))

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
  }

  return {
    trackEvent,
    visibilityAtom,
    urlAtom,
    onlineAtom,
    focusAtom,
  }
}
