/** Private lifecycle support for the package's known, eager atom extensions. */
import {
  bind,
  atom,
  withActions,
  _enqueue,
  top,
  withMiddleware,
  type BooleanAtom,
} from '@reatom/core'
import type { BrowserTelemetry } from './captureEngine.ts'
import { browserCaptureOf } from './browserCapture.ts'
import { internalName } from './internalName.ts'
import { suppressTracing } from './observation.ts'
import { OTEL } from './diag.ts'
export const assertFeature = (otel: BrowserTelemetry, member: string) => {
  if (otel.disposed())
    throw new Error(`${OTEL}${otel.instanceName} is disposed`)
  if (member in otel) throw new Error(`${OTEL}${member} is already installed`)
}
export const featureControl = (
  otel: BrowserTelemetry,
  member: string,
  install: () => { dispose(): void },
): BooleanAtom => {
  assertFeature(otel, member)
  const inOwner = bind(<T>(fn: () => T): T => fn())
  let requested = true
  const control: BooleanAtom = atom(
    () => requested,
    internalName(otel.instanceName, member),
  ).extend(
    withActions((target) => ({
      toggle: () => target.set(!requested),
      setTrue: () => target.set(true) as true,
      setFalse: () => target.set(false) as false,
      reset: () => target.set(true),
    })),
  )
  let terminal = false,
    epoch = 0
  let handle: { dispose(): void } | undefined
  const stop = () => {
    epoch++
    const current = handle
    handle = undefined
    current?.dispose()
  }
  const start = () => {
    const generation = ++epoch
    const next = install()
    if (terminal || !requested || generation !== epoch) {
      next.dispose()
      return
    }
    handle = next
  }
  Object.defineProperty(otel, member, {
    value: control,
    configurable: true,
    writable: true,
    enumerable: true,
  })
  const roots = new WeakMap<object, () => void>()
  const observers = new Set<WeakRef<() => void>>()
  const watch = () => {
    const root = top().root
    if (roots.has(root)) return false
    const writer = bind(() => control.set(requested), root.frame)
    roots.set(root, writer)
    observers.add(new WeakRef(writer))
    return true
  }
  control.extend(
    withMiddleware(() => (next, ...params) => {
      const firstRead = watch()
      if (!params.length) return firstRead ? next(requested) : next()
      const previous = requested
      const update = params[0]
      const value = typeof update === 'function' ? update(previous) : update
      if (terminal && value) throw new Error(`${OTEL}${member} is disposed`)
      const written = next(value)
      requested = value
      if (previous !== value) {
        _enqueue(() => {
          for (const reference of [...observers]) {
            const writer = reference.deref()
            if (writer) writer()
            else observers.delete(reference)
          }
        }, 'hook')
        inOwner(() =>
          suppressTracing(() => {
            if (value) start()
            else stop()
          }),
        )
      }
      return written
    }),
  )
  control.extend(
    withMiddleware(
      () =>
        (next, ...params) => {
          watch()
          const result = next(...params)
          return params.length ? result : requested
        },
      'read',
    ),
  )
  const detach = browserCaptureOf(otel)!.attach(() =>
    inOwner(() => {
      terminal = true
      control.setFalse()
      stop()
    }),
  )
  try {
    inOwner(start)
  } catch (error) {
    detach()
    delete (otel as unknown as Record<string, unknown>)[member]
    throw error
  }
  return control
}

export { preflightConsent, bindConsent } from './browserCapture.ts'
