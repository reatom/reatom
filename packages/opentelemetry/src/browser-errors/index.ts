import type { BooleanAtom, Ext } from '@reatom/core'
import { featureControl } from '../feature.ts'
import { browserCaptureOf } from '../browserCapture.ts'
import type { BrowserTelemetry } from '../captureEngine.ts'
import { errorData, exceptionType } from '../errorMetadata.ts'
import type { OtlpAttrValue } from '../toOtlpValue.ts'

export interface BrowserErrorsOptions {
  /** Exception messages/stacks follow the instance capture policy. Default true. */
  details?: boolean
  /** Maximum accepted errors per minute, default 20. */
  maxPerMinute?: number
  /** Deduplicate equal exceptions within this interval, default 1000ms. */
  dedupeMs?: number
  fingerprint?: (error: unknown) => string | undefined
}
import {
  markBrowserErrorReported,
  registerStandaloneBrowserErrors,
} from '../reportedBrowserErrors.ts'

// Chromium exposes stack as an own native accessor; never invoke user getters.
const nativeStackGetter = Object.getOwnPropertyDescriptor(
  new Error(),
  'stack',
)?.get
const browserErrorStack = (error: unknown): unknown => {
  const value = errorData(error, 'stack')
  if (value !== undefined || !(error instanceof Error) || !nativeStackGetter)
    return value
  const descriptor = Object.getOwnPropertyDescriptor(error, 'stack')
  return descriptor?.get === nativeStackGetter
    ? nativeStackGetter.call(error)
    : undefined
}

export const withBrowserErrors =
  (
    options: BrowserErrorsOptions = {},
  ): Ext<BrowserTelemetry, { browserErrors: BooleanAtom }> =>
  (otel) => ({
    browserErrors: featureControl(otel, 'browserErrors', () => {
      const capture = browserCaptureOf(otel)!
      if (typeof window === 'undefined') return { dispose() {} }
      const unregister = registerStandaloneBrowserErrors(otel)
      const recent = new Map<string, number>()
      let active = true,
        start = Date.now(),
        count = 0
      const report = (error: unknown, source: string, fallback?: string) => {
        if (!active || !capture.enabled('logs') || !active) return
        const now = Date.now()
        if (now - start >= 60000) {
          start = now
          count = 0
        }
        if (count >= Math.max(0, options.maxPerMinute ?? 20)) return
        try {
          const message = errorData(error, 'message') ?? fallback ?? error
          if (!active) return
          const stack =
            options.details === false ? undefined : browserErrorStack(error)
          if (!active) return
          const signature = `${exceptionType(error)}:${typeof message === 'string' ? message.slice(0, 2048) : ''}:${typeof stack === 'string' ? stack.slice(0, 4096) : ''}`
          if (
            recent.has(signature) &&
            now - recent.get(signature)! < Math.max(0, options.dedupeMs ?? 1000)
          )
            return
          const attributes: Record<string, OtlpAttrValue> = {
            'exception.type': exceptionType(error),
            'exception.escaped': true,
            'exception.fatal': true,
            'exception.source': source,
          }
          if (options.details !== false) {
            const capturedMessage = capture.capture('message', message)
            if (!active) return
            const capturedStack =
              stack === undefined ? undefined : capture.capture('stack', stack)
            if (!active) return
            if (capturedMessage !== undefined)
              attributes['exception.message'] = capturedMessage
            if (capturedStack !== undefined)
              attributes['exception.stacktrace'] = capturedStack
          }
          const fingerprint = options.fingerprint?.(error)
          if (!active) return
          if (typeof fingerprint === 'string')
            attributes['exception.fingerprint'] = fingerprint.slice(0, 256)
          const snapshot = capture.snapshot()
          if (
            !active ||
            !capture.enabled('logs') ||
            !active ||
            !markBrowserErrorReported(
              otel,
              error,
              now,
              options.dedupeMs ?? 1000,
            )
          )
            return
          if (recent.size >= 100) recent.delete(recent.keys().next().value!)
          recent.set(signature, now)
          count++
          capture.log({
            eventName: 'exception',
            timeMs: now,
            severityNumber: 17,
            attributes,
            snapshot,
          })
        } catch {
          /* Hostile error objects and user callbacks cannot escape listeners. */
        }
      }
      const onError = (event: ErrorEvent) =>
        report(event.error, 'window.error', event.message)
      const onRejection = (event: PromiseRejectionEvent) =>
        report(event.reason, 'unhandledrejection')
      window.addEventListener('error', onError)
      window.addEventListener('unhandledrejection', onRejection)
      const dispose = capture.attach(() => {
        active = false
        unregister()
        window.removeEventListener('error', onError)
        window.removeEventListener('unhandledrejection', onRejection)
        recent.clear()
      }, 'browser-errors')
      return { dispose }
    }),
  })
