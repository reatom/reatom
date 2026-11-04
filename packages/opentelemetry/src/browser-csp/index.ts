import type { BooleanAtom, Ext } from '@reatom/core'
import { featureControl } from '../feature.ts'
import { browserCaptureOf } from '../browserCapture.ts'
import type { BrowserTelemetry } from '../captureEngine.ts'
import type { OtlpAttrValue } from '../toOtlpValue.ts'
export interface BrowserCspOptions {
  /** Policy and sample may contain application data; excluded by default. */
  details?: boolean
  maxPerMinute?: number
}
const safeUrl = (value: string) => {
  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return ''
    return `${url.origin}${url.pathname}`.slice(0, 2048)
  } catch {
    return /^(inline|eval|self|none)$/.test(value) ? value : ''
  }
}
export const withBrowserCsp =
  (
    options: BrowserCspOptions = {},
  ): Ext<BrowserTelemetry, { browserCsp: BooleanAtom }> =>
  (otel) => ({
    browserCsp: featureControl(otel, 'browserCsp', () => {
      const capture = browserCaptureOf(otel)!
      if (typeof document === 'undefined') return { dispose() {} }
      let active = true,
        start = Date.now(),
        count = 0
      const listener = (event: SecurityPolicyViolationEvent) => {
        if (
          !active ||
          !capture.enabled('logs') ||
          capture.isTransportUrl(event.blockedURI) ||
          !active
        )
          return
        try {
          const now = Date.now()
          if (now - start >= 60000) {
            start = now
            count = 0
          }
          if (count++ >= (options.maxPerMinute ?? 20)) return
          const attributes: Record<string, OtlpAttrValue> = {}
          for (const key of [
            'blockedURI',
            'documentURI',
            'referrer',
            'sourceFile',
          ] as const)
            attributes[key] = safeUrl(event[key])
          for (const key of [
            'columnNumber',
            'disposition',
            'effectiveDirective',
            'lineNumber',
            'statusCode',
            'violatedDirective',
          ] as const)
            attributes[key] = String(event[key]).slice(0, 256)
          if (options.details)
            for (const key of ['originalPolicy', 'sample'] as const) {
              const value = capture.capture(key, event[key])
              if (!active) return
              if (value !== undefined) attributes[key] = value
            }
          const snapshot = capture.snapshot()
          if (!active || !capture.enabled('logs') || !active) return
          capture.log({
            eventName: 'securitypolicyviolation',
            timeMs: now,
            attributes,
            snapshot,
          })
        } catch {
          /* Optional redaction/metadata callbacks cannot escape native listeners. */
        }
      }
      document.addEventListener('securitypolicyviolation', listener)
      const dispose = capture.attach(() => {
        active = false
        document.removeEventListener('securitypolicyviolation', listener)
      }, 'browser-csp')
      return { dispose }
    }),
  })
