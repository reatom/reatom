import {
  atom,
  bind,
  top,
  EXTENSIONS,
  isAction,
  isSkip,
  removeItem,
  withActionMiddleware,
  withCallHook,
  type Action,
} from '@reatom/core'
import { isInternalUnit } from '../internalName.ts'
import { isObserving, observe } from '../observation.ts'
import { copyOwnPromiseProperties } from '../copyOwnPromiseProperties.ts'
import type { Telemetry } from '../kernel/reatomTelemetry.ts'
import {
  attributes,
  ownAttributes,
  type PreparedAttributes,
} from '../kernel/attributes.ts'

/**
 * Capture is explicit, runs only after admission, and must return an owned
 * snapshot.
 */
export type ActionCapture = (
  key: 'params' | 'payload' | 'error',
  value: unknown,
  targetName: string,
) => PreparedAttributes

type Settings = { capture?: ActionCapture; enabled?: () => boolean }
const installed = new WeakMap<Action, WeakMap<Telemetry, Settings>>()

/**
 * Action spans share the manual span lifecycle. Use reatomOpentelemetry for
 * reactive causal graphs.
 */
const actionSpans =
  (otel: Telemetry, capture?: ActionCapture, enabled?: () => boolean) =>
  <Target extends Action>(target: Target): Target => {
    let owners = installed.get(target)
    if (!owners) installed.set(target, (owners = new WeakMap()))
    const previous = owners.get(otel)
    if (previous) {
      Object.assign(previous, { capture, enabled })
      return target
    }
    const settings = { capture, enabled }
    owners.set(otel, settings)
    target.extend(
      withActionMiddleware(() => (next, ...params) => {
        const { capture, enabled } = settings
        if (isObserving() || (enabled && observe(enabled) !== true))
          return next(...params)
        const span = observe(() => otel.startSpan({ name: target.name }))
        if (!span) return next(...params)
        const captureValue = bind(
          (key: Parameters<ActionCapture>[0], value: unknown) =>
            observe(() => {
              if (
                !span.isRecording() ||
                !capture ||
                (enabled && observe(enabled) !== true)
              )
                return
              return attributes(capture(key, value, target.name))
            }),
        )
        const before = captureValue('params', params)
        const complete = (value: unknown, error: boolean) =>
          observe(() => {
            if (!span.isRecording()) {
              span.cancel()
              return
            }
            const after = captureValue(error ? 'error' : 'payload', value)
            span.finish({
              error,
              attributes:
                before && after
                  ? ownAttributes({ ...before, ...after })
                  : (before ?? after),
            })
          })
        let result: unknown
        try {
          result = span.run(() => next(...params))
        } catch (error) {
          complete(error, true)
          throw error
        }
        if (result instanceof Promise) {
          let resolve!: (value: unknown) => void
          let reject!: (error: unknown) => void
          const followed = new Promise((yes, no) => {
            resolve = yes
            reject = no
          })
          const attached = observe(() => {
            const chained = result.then(
              (value) => {
                try {
                  complete(value, false)
                } finally {
                  resolve(value)
                }
              },
              (error) => {
                try {
                  complete(error, true)
                } finally {
                  reject(error)
                }
              },
            )
            chained.catch(() => {})
            return true
          })
          if (attached) {
            observe(() => copyOwnPromiseProperties(result, followed))
            return followed
          }
          // A hostile .then can attach handlers and then throw. Its late result
          // must neither inspect user values nor create an unhandled rejection.
          span.cancel()
          followed.catch(() => {})
          return result
        }
        complete(result, false)
        return result
      }),
    )
    return target
  }

export const withActionSpans = (otel: Telemetry, capture?: ActionCapture) =>
  actionSpans(otel, capture)

/**
 * Automatically instrument future public actions until this telemetry scope is
 * disposed.
 */
export const withActionTracing =
  (capture?: ActionCapture) => (otel: Telemetry) => {
    if ('actions' in otel)
      throw new Error('Action tracing is already installed')
    const root = top().root
    const enabled = atom(true, `${otel.name}.actions`)
    const extension: (typeof EXTENSIONS)[number] = (target) => {
      if (
        top().root === root &&
        !isObserving() &&
        isAction(target) &&
        !isSkip(target) &&
        !isInternalUnit(target)
      ) {
        actionSpans(
          otel,
          capture,
          () => top().root === root && enabled(),
        )(target)
      }
      return target
    }
    EXTENSIONS.push(extension)
    const stop = () => {
      enabled.set(false)
      removeItem(EXTENSIONS, extension)
    }
    otel.dispose.extend(withCallHook(stop))
    return { actions: enabled }
  }
