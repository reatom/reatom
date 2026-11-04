import type { BooleanAtom, Ext } from '@reatom/core'
import { assertFeature, featureControl } from '../feature.ts'
import type { BrowserTelemetry } from '../captureEngine.ts'
import { browserCaptureOf, type BrowserCapture } from '../browserCapture.ts'
import { markBrowserErrorReported } from '../reportedBrowserErrors.ts'
import { isObserving, observe } from '../observation.ts'
export type ConsoleLevel = 'debug' | 'info' | 'log' | 'warn' | 'error'
export type BrowserConsoleOptions = {
  levels?: readonly ConsoleLevel[]
  errorsAsExceptions?: boolean
}
type Subscriber = {
  capture: BrowserCapture
  levels: readonly ConsoleLevel[]
  active: boolean
  errorsAsExceptions: boolean
  otel: BrowserTelemetry
}
type Patch = { subscribers: Set<Subscriber>; restore: () => void }
const key = Symbol.for('@reatom/opentelemetry/browser-console')
const installBrowserConsole = (
  otel: BrowserTelemetry,
  options: BrowserConsoleOptions = {},
) => {
  const capture = browserCaptureOf(otel)
  if (!capture || typeof window === 'undefined') return { dispose() {} }
  const host = globalThis as typeof globalThis & { [key]?: Patch }
  let patch = host[key]
  if (!patch) {
    const subscribers = new Set<Subscriber>()
    const restores: Array<() => void> = []
    for (const level of ['debug', 'info', 'log', 'warn', 'error'] as const) {
      const native = console[level]
      const wrapper = function (this: Console, ...args: unknown[]) {
        const result = Reflect.apply(native, this, args)
        if (!isObserving())
          observe(() => {
            for (const sub of [...subscribers]) {
              const sink = sub.capture
              if (
                !sub.active ||
                !sink?.enabled('logs') ||
                !sub.levels.includes(level) ||
                !sub.active
              )
                continue
              try {
                const value = {
                  capture: (key: string, value: unknown) => {
                    if (!sub.active)
                      throw new Error('Browser console capture stopped')
                    const result = sink.capture(key, value)
                    if (!sub.active)
                      throw new Error('Browser console capture stopped')
                    return result
                  },
                }
                const errors = args.filter(
                  (arg): arg is Error => arg instanceof Error,
                )
                const attributes: Record<
                  string,
                  Exclude<ReturnType<typeof value.capture>, undefined>
                > = { 'console.level': level }
                if (errors[0] && value.capture('enabled', true) !== undefined) {
                  attributes['exception.type'] = value.capture(
                    'name',
                    errors[0].name,
                  )!
                  attributes['exception.message'] = value.capture(
                    'message',
                    errors[0].message,
                  )!
                  attributes['exception.stacktrace'] = value.capture(
                    'stack',
                    errors[0].stack,
                  )!
                }
                const body = value.capture('arguments', args)
                const snapshot = sink.snapshot()
                if (!sub.active || !sink.enabled('logs') || !sub.active)
                  continue
                const exception = level === 'error' && sub.errorsAsExceptions
                if (exception && !markBrowserErrorReported(sub.otel, errors[0]))
                  continue
                if (exception) {
                  attributes['exception.type'] ??= 'Error'
                  if (!errors.length && body !== undefined)
                    attributes['exception.message'] = body
                  attributes['exception.fatal'] = false
                  attributes['exception.source'] = 'console'
                }
                sink.log({
                  eventName: exception ? 'exception' : 'reatom.console',
                  timeMs: Date.now(),
                  severityNumber:
                    level === 'error'
                      ? 17
                      : level === 'warn'
                        ? 13
                        : level === 'debug'
                          ? 5
                          : 9,
                  body,
                  attributes,
                  snapshot,
                })
              } catch {}
            }
          })
        return result
      }
      console[level] = wrapper
      restores.push(() => {
        if (console[level] === wrapper) console[level] = native
      })
    }
    patch = host[key] = {
      subscribers,
      restore() {
        for (const restore of restores) restore()
        if (host[key] === this) delete host[key]
      },
    }
  }
  const subscriber = {
    active: true,
    errorsAsExceptions: options.errorsAsExceptions ?? false,
    otel,
    capture,
    levels: options.levels ?? (['warn', 'error'] as const),
  }
  patch.subscribers.add(subscriber)
  let disposed = false
  const dispose = () => {
    if (disposed) return
    disposed = true
    subscriber.active = false
    patch.subscribers.delete(subscriber)
    if (!patch.subscribers.size) patch.restore()
  }
  const detach = capture.attach(dispose, 'browser-console')
  return {
    dispose() {
      dispose()
      detach()
    },
  }
}

/** Eager optional capture controlled by its assigned requested-enable atom. */
export const withBrowserConsoleMonkeypatch =
  (
    options: BrowserConsoleOptions = {},
  ): Ext<BrowserTelemetry, { browserConsole: BooleanAtom }> =>
  (otel) => {
    assertFeature(otel, 'browserConsole')
    return {
      browserConsole: featureControl(otel, 'browserConsole', () =>
        installBrowserConsole(otel, options),
      ),
    }
  }
