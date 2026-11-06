import { action, atom, bind, variable } from '@reatom/core'
import { observe } from '../observation.ts'
import { createChildContext, type SpanContext } from '../traceContext.ts'
import { formatTraceparent } from '../traceparent.ts'
import type { CapturedRecord } from '../records.ts'
import type { DropReason } from '../createBatchQueue.ts'

import {
  attributes,
  ownAttributes,
  type Attributes,
  type PreparedAttributes,
} from './attributes.ts'
export interface TelemetryReservation {
  commit(record: CapturedRecord): void
  cancel?(reason: DropReason): void
  release(): void
}
export interface TelemetrySink {
  reserve(kind: 'span' | 'log'): TelemetryReservation | undefined
  flush?(): Promise<void>
  dispose?(): void
}
export interface TelemetryInput {
  name: string
  resource: Attributes | PreparedAttributes
  sink: TelemetrySink
  maxActive?: number
  scopeVersion?: string
}
/** One explicitly owned capture scope. The instance owns its supplied sink. */
export const reatomTelemetry = (input: TelemetryInput) => {
  const { name, sink, maxActive = 1000 } = input
  if (
    typeof name !== 'string' ||
    !name.trim() ||
    !Number.isSafeInteger(maxActive) ||
    maxActive < 1
  )
    throw new TypeError('name and positive maxActive required')
  if (!sink || typeof sink.reserve !== 'function')
    throw new TypeError('a telemetry sink is required')
  const resourceAttributes = attributes(input.resource)
  const scope = Object.freeze({
    name: '@reatom/opentelemetry',
    version: input.scopeVersion ?? '',
  })
  const traceVar = variable<{ traceId: string; spanId: string }>(
    `otel.${name}.trace`,
  )
  const leases = new Set<(reason?: DropReason) => void>()
  let activeSpans = 0
  let disposed = false
  const state = atom(true, `otel.${name}.enabled`)
  const currentTrace = () => observe(() => traceVar.get())
  const reserve = (kind: 'span' | 'log') => {
    if (disposed || !state() || (kind === 'span' && activeSpans >= maxActive))
      return
    const ticket = observe(() => sink.reserve(kind))
    if (!ticket) return
    if (disposed || !state()) {
      observe(() => ticket.cancel?.(disposed ? 'disposed' : 'consent'))
      observe(() => ticket.release())
      return
    }
    if (kind === 'span') activeSpans++
    let released = false
    const enabled = bind(() => !disposed && state())
    const release = (reason?: DropReason) => {
      if (released) return
      released = true
      leases.delete(release)
      if (kind === 'span') activeSpans--
      try {
        if (reason) observe(() => ticket.cancel?.(reason))
      } finally {
        observe(() => ticket.release())
      }
    }
    leases.add(release)
    return {
      commit(record: CapturedRecord) {
        if (released) return
        try {
          if (enabled()) ticket.commit(record)
          else ticket.cancel?.('consent')
        } finally {
          release()
        }
      },
      enabled,
      cancel: release,
      release,
    }
  }
  const emit = action(
    (ticket: TelemetryReservation, record: CapturedRecord) => {
      observe(() => ticket.commit(Object.freeze(record)))
    },
    `otel.${name}.emit`,
  )
  const startSpan = action(
    (options: {
      name: string
      parent?: { traceId: string; spanId: string }
      attributes?: Attributes | PreparedAttributes
      kind?: 'internal' | 'server' | 'client' | 'producer' | 'consumer'
      startTimeMs?: number
    }) => {
      if (disposed) return
      const ticket = reserve('span')
      if (!ticket) return
      let closed = false
      const cancel = () => {
        if (closed) return
        closed = true
        observe(() => ticket.release())
      }
      try {
        if (
          typeof options.name !== 'string' ||
          !options.name.trim() ||
          options.name.length > 2048
        )
          throw new TypeError('span name required')
        if (
          options.startTimeMs !== undefined &&
          !Number.isFinite(options.startTimeMs)
        )
          throw new TypeError('invalid span time')
        const parent = options.parent ?? currentTrace()
        if (
          parent &&
          (!/^[a-f0-9]{32}$/i.test(parent.traceId) ||
            /^0+$/.test(parent.traceId) ||
            !/^[a-f0-9]{16}$/i.test(parent.spanId) ||
            /^0+$/.test(parent.spanId))
        )
          throw new TypeError('invalid parent')
        const ownedParent =
          parent &&
          Object.freeze({
            traceId: parent.traceId.toLowerCase(),
            spanId: parent.spanId.toLowerCase(),
          })
        const context = createChildContext(ownedParent)
        const clockBase = Date.now(),
          startClock = performance.now()
        const startTimeMs = options.startTimeMs ?? clockBase
        const capturedAttributes = attributes(options.attributes)
        const spanName = options.name,
          kind = options.kind ?? 'internal'
        return Object.freeze({
          context,
          traceparent: formatTraceparent(context, true),
          isRecording: () => !closed && ticket.enabled(),
          run: <T>(fn: () => T) => traceVar.run(context, fn),
          cancel,
          finish: action(
            (
              end: {
                attributes?: Attributes | PreparedAttributes
                error?: boolean
                endTimeMs?: number
              } = {},
            ) => {
              if (closed) return
              try {
                if (!ticket.enabled()) {
                  ticket.cancel('consent')
                  return
                }
                if (
                  end.endTimeMs !== undefined &&
                  !Number.isFinite(end.endTimeMs)
                )
                  throw new TypeError('invalid span time')
                const attrs = end.attributes
                  ? ownAttributes({
                      ...capturedAttributes,
                      ...attributes(end.attributes),
                    })
                  : capturedAttributes
                emit(ticket, {
                  type: 'span',
                  ...context,
                  parentSpanId: ownedParent?.spanId as CapturedRecord['spanId'],
                  name: spanName,
                  kind,
                  startTimeMs,
                  endTimeMs:
                    end.endTimeMs ?? clockBase + performance.now() - startClock,
                  attributes: attrs,
                  resourceAttributes,
                  scope,
                  flags: 1,
                  status: end.error
                    ? Object.freeze({ code: 'error' as const })
                    : undefined,
                  events: Object.freeze([]),
                })
              } catch (error) {
                ticket.cancel(
                  error instanceof RangeError ? 'oversized' : 'observation',
                )
                throw error
              } finally {
                cancel()
              }
            },
            `otel.${name}.finish`,
          ),
        })
      } catch (error) {
        ticket.cancel(error instanceof RangeError ? 'oversized' : 'observation')
        cancel()
        throw error
      }
    },
    `otel.${name}.startSpan`,
  )
  const log = action(
    (eventName: string, input?: Attributes | PreparedAttributes) => {
      const ticket = reserve('log')
      if (!ticket) return
      try {
        if (
          typeof eventName !== 'string' ||
          !eventName.trim() ||
          eventName.length > 2048
        )
          throw new TypeError('event name required')
        const context = currentTrace() ?? createChildContext()
        emit(ticket, {
          type: 'log',
          ...(context as SpanContext),
          eventName,
          timeMs: Date.now(),
          severityNumber: 9,
          attributes: attributes(input),
          resourceAttributes,
          scope,
        })
      } catch (error) {
        ticket.cancel(error instanceof RangeError ? 'oversized' : 'observation')
        throw error
      } finally {
        observe(() => ticket.release())
      }
    },
    `otel.${name}.log`,
  )
  const dispose = action(() => {
    if (disposed) return
    disposed = true
    for (const release of [...leases]) release('disposed')
    observe(() => sink.dispose?.())
  }, `otel.${name}.dispose`)
  return state.extend(() => ({
    traceVar,
    startSpan,
    log,
    dispose,
    flush: action(async () => {
      // No Reatom reads after await. Pending manual spans stay caller-owned.
      await sink.flush?.()
    }, `otel.${name}.flush`),
  }))
}

export type Telemetry = ReturnType<typeof reatomTelemetry>
export type TelemetrySpan = NonNullable<ReturnType<Telemetry['startSpan']>>
