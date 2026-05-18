import type { AtomLike, GenericExt } from '@reatom/core'
import {
  bind,
  isAbort,
  STACK,
  top,
  withActionMiddleware,
  withMiddleware,
} from '@reatom/core'

import type { SpanInput, SpanKind } from './buildSpan.ts'
import type { SpanEventInput } from './buildSpanEvent.ts'
import type { SpanId } from './generateSpanId.ts'
import { generateSpanId } from './generateSpanId.ts'
import type { TraceId } from './generateTraceId.ts'
import { generateTraceId } from './generateTraceId.ts'
import { serialize } from './serialize.ts'
import { spanIdVar } from './spanIdVar.ts'
import { traceIdVar } from './traceIdVar.ts'
import type { OtlpAttrValue } from './toOtlpValue.ts'

export interface WithOTelOptions {
  kind?: SpanKind
}

export interface CreateWithOTelInput {
  /** Receives a fully-formed SpanInput when an instrumented atom/action finishes. */
  queueSpan: (span: SpanInput) => void
}

interface SpanContext {
  traceId: TraceId
  parentTraceId: TraceId | undefined
  spanId: SpanId
  parentSpanId: SpanId | undefined
}

// Read trace context from the caller frame on the JS stack — top()'s
// pubs[0] is null on atom-set / computed-read paths when OTel runs (the
// caller link is wired later by computedMiddleware on the write branch
// only, or by cacheMiddleware on read AFTER next()). Action middleware
// hand-rolls pubs[0] before OTel runs, which is why action -> action
// inheritance worked under the old top()-based read.
const enterSpan = (): SpanContext => {
  const callerFrame = STACK[STACK.length - 2]
  const parentTraceId = callerFrame ? traceIdVar.get(callerFrame) : undefined
  const traceId = parentTraceId ?? generateTraceId()
  const parentSpanId =
    parentTraceId && callerFrame ? spanIdVar.get(callerFrame) : undefined
  const spanId = generateSpanId()
  return { traceId, parentTraceId, spanId, parentSpanId }
}

// Reatom abort and thrown-Promise (suspension) are control flow, not errors:
// they get an ok-status span with a payload note instead of an error span.
const isControlFlow = (error: unknown): boolean =>
  isAbort(error) || error instanceof Promise

const controlFlowAttributes = (
  error: unknown,
): Record<string, string> | undefined => {
  if (isAbort(error)) return { payload: serialize(error) }
  if (error instanceof Promise) return { payload: '[Suspension]' }
  return undefined
}

// Per OTel semantic conventions for exceptions: an error span carries a span
// event named "exception" with exception.type / .message / .stacktrace /
// .escaped. Auto-instrumentation always rethrows, so `escaped` is always true.
// https://opentelemetry.io/docs/specs/semconv/exceptions/exception-spans/
const exceptionEvent = (error: unknown, timeMs: number): SpanEventInput => {
  const isErr = error instanceof Error
  const attributes: Record<string, OtlpAttrValue> = {
    'exception.type': isErr ? error.constructor.name : 'Error',
    'exception.message': isErr ? error.message : serialize(error),
    'exception.escaped': true,
  }
  if (isErr && error.stack) attributes['exception.stacktrace'] = error.stack
  return { name: 'exception', timeMs, attributes }
}

// Must match the function name in `@reatom/core`'s `core/action.ts`.
// `isAction` consults the `reactive` flag, which `action()` flips only
// AFTER `createAtom` runs `EXTENSIONS` — so during auto-instrumentation
// the structural middlewares array is the only reliable signal.
const ACTION_MIDDLEWARE_NAME = 'actionMiddleware'
const hasActionMiddleware = (target: AtomLike): boolean =>
  target.__reatom.middlewares.some((m) => m.name === ACTION_MIDDLEWARE_NAME)

/**
 * Idempotent: applying twice to the same target merges options (later
 * override wins) but installs the middleware only once, so a global
 * `addGlobalExtension(withOTel())` plus a local `withOTel({ kind })`
 * override doesn't double-emit.
 */
export const createWithOTel = ({ queueSpan }: CreateWithOTelInput) => {
  const optionsByTarget = new WeakMap<AtomLike, WithOTelOptions>()
  const installed = new WeakSet<AtomLike>()

  return (options: WithOTelOptions = {}): GenericExt<AtomLike> => {
    return ((target: AtomLike): AtomLike => {
      let opts = optionsByTarget.get(target)
      if (opts) Object.assign(opts, options)
      else optionsByTarget.set(target, (opts = { ...options }))

      if (installed.has(target)) return target

      const isAction = hasActionMiddleware(target)

      // Reatom calls EXTENSIONS twice for actions: once inside `createAtom`
      // while `reactive` is still true, and once at the tail of `action()`
      // after the flip. Defer the install on the first invocation so
      // `withActionMiddleware`'s `isAction` check passes the second time.
      if (isAction && target.__reatom.reactive) return target

      installed.add(target)

      // Per OTel API spec, STATUS_CODE_OK SHOULD only be set by the
      // application — instrumentation leaves success spans unset so a user's
      // explicit `setStatus(OK)` retains its signal. Errors and explicit
      // failures emit `error`; AbortError/Suspension are control flow and
      // route through `emitErr`'s `cf` branch (status unset, payload note).
      const startMiddleware = () => {
        // Anchor wall clock once and measure duration via a monotonic source
        // so NTP steps cannot produce negative endTime - startTime.
        const startTimeMs = Date.now()
        const startPerfMs = performance.now()
        const ctx = enterSpan()

        spanIdVar.set(ctx.spanId)
        if (!ctx.parentTraceId) traceIdVar.set(ctx.traceId)

        // Derived from the same monotonic anchor as endTimeMs so an event
        // timestamp can never sit outside [startTimeMs, endTimeMs] — which a
        // raw Date.now() would do under an NTP step.
        const nowMs = () => startTimeMs + (performance.now() - startPerfMs)

        const queueWith = (
          attributes: SpanInput['attributes'],
          status?: SpanInput['status'],
          events?: SpanInput['events'],
        ) =>
          queueSpan({
            traceId: ctx.traceId,
            spanId: ctx.spanId,
            parentSpanId: ctx.parentSpanId,
            name: target.name,
            kind: opts.kind,
            startTimeMs,
            endTimeMs: nowMs(),
            attributes,
            status,
            events,
          })

        const queueErr = (error: unknown) =>
          queueWith(
            undefined,
            { code: 'error', message: serialize(error) },
            [exceptionEvent(error, nowMs())],
          )

        const emitErr = (error: unknown) => {
          if (isControlFlow(error)) {
            queueWith(controlFlowAttributes(error))
            return
          }
          queueErr(error)
        }

        return { queueWith, queueErr, emitErr }
      }

      if (isAction) {
        return target.extend(
          withActionMiddleware(() => (next, ...params) => {
            const { queueWith, emitErr } = startMiddleware()

            try {
              const result = next(...params)
              const okAttrs = (payload: unknown) => ({
                params: serialize(params),
                payload: serialize(payload),
              })

              if (result instanceof Promise) {
                result
                  .then(
                    bind((payload: unknown) => queueWith(okAttrs(payload))),
                    bind((error: unknown) => emitErr(error)),
                  )
                  // OTel mandate: never escalate. Swallow if a sink throws.
                  .catch(() => {})
              } else {
                queueWith(okAttrs(result))
              }

              return result
            } catch (error) {
              emitErr(error)
              throw error
            }
          }),
        )
      }

      return target.extend(
        withMiddleware(() => (next, ...params) => {
          // Set context before next() so synchronous child instrumentation
          // (cause atoms, child actions) parents to this span instead of
          // opening a fresh root trace.
          const { queueWith, queueErr, emitErr } = startMiddleware()

          try {
            const prevState = top().state
            const nextState = next(...params)
            const okAttrs = (resolvedState: unknown) => ({
              prevState: serialize(prevState),
              nextState: serialize(resolvedState),
            })

            if (nextState instanceof Promise) {
              nextState
                .then(
                  bind((resolvedState: unknown) =>
                    queueWith(okAttrs(resolvedState)),
                  ),
                  bind((error: unknown) => emitErr(error)),
                )
                .catch(() => {})
            } else {
              queueWith(okAttrs(nextState))
            }

            return nextState
          } catch (atomChangeError) {
            // Suspension is Reatom control flow; rethrow without emitting.
            if (atomChangeError instanceof Promise) throw atomChangeError
            // Sync throw out of an atom set is always a real error: an
            // AbortError here did not come from an awaited abort, so bypass
            // emitErr's control-flow check.
            queueErr(atomChangeError)
            throw atomChangeError
          }
        }),
      )
    }) as GenericExt<AtomLike>
  }
}

