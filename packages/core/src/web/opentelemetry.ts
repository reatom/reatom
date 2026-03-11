import type { AtomLike } from '../core'
import {
  bind,
  isAction,
  isAtom,
  top,
  withActionMiddleware,
  withMiddleware,
} from '../core'
import { variable } from '../methods'
import { isAbort, isObject } from '../utils'
import { isSkip } from '../methods/getStackTrace'

export type OtlpAttrPrimitive = string | number | boolean

export type SpanKind = 'internal' | 'server' | 'client'

export interface SpanStatus {
  code: 'ok' | 'error'
  message?: string
}

export interface SpanData {
  traceId: string
  spanId: string
  parentSpanId?: string
  name: string
  kind?: SpanKind
  startTimeMs: number
  endTimeMs: number
  attributes?: Record<string, OtlpAttrPrimitive>
  status?: SpanStatus
}

export interface ConnectOpentelemetryOptions {
  endpoint: string
  headers?: Record<string, string>
  resourceAttributes?:
    | Record<string, OtlpAttrPrimitive>
    | (() => Record<string, OtlpAttrPrimitive>)
  batchInterval?: number
  maxBatchSize?: number
  scopeName?: string
}

export interface OpentelemetryClient {
  sendSpan(span: SpanData): void
  flush(): Promise<void>
  destroy(): void
  withOpentelemetry: <T extends AtomLike>(target: T) => T
}

interface OtlpAttributeValue {
  stringValue?: string
  intValue?: string
  doubleValue?: number
  boolValue?: boolean
}

interface OtlpAttribute {
  key: string
  value: OtlpAttributeValue
}

const SPAN_KIND_INTERNAL = 1
const SPAN_KIND_SERVER = 2
const SPAN_KIND_CLIENT = 3
const SPAN_KIND_MAP: Record<SpanKind, number> = {
  internal: SPAN_KIND_INTERNAL,
  server: SPAN_KIND_SERVER,
  client: SPAN_KIND_CLIENT,
}

const STATUS_OK = 1
const STATUS_ERROR = 2

const hexFromBytes = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')

export const generateTraceId = (): string =>
  hexFromBytes(crypto.getRandomValues(new Uint8Array(16)))

export const generateSpanId = (): string =>
  hexFromBytes(crypto.getRandomValues(new Uint8Array(8)))

const msToNano = (ms: number): string => String(BigInt(ms) * 1_000_000n)

const toOtlpValue = (v: OtlpAttrPrimitive): OtlpAttributeValue => {
  if (typeof v === 'boolean') return { boolValue: v }
  if (typeof v === 'number') {
    return Number.isInteger(v)
      ? { intValue: String(v) }
      : { doubleValue: v }
  }
  return { stringValue: String(v) }
}

const toOtlpAttributes = (
  rec: Record<string, OtlpAttrPrimitive>,
): Array<OtlpAttribute> =>
  Object.entries(rec).map(([key, value]) => ({
    key,
    value: toOtlpValue(value),
  }))

const buildOtlpTracePayload = (
  spans: Array<SpanData>,
  resourceAttributes: Record<string, OtlpAttrPrimitive>,
  scopeName: string,
) => ({
  resourceSpans: [
    {
      resource: { attributes: toOtlpAttributes(resourceAttributes) },
      scopeSpans: [
        {
          scope: { name: scopeName },
          spans: spans.map((span) => ({
            traceId: span.traceId,
            spanId: span.spanId,
            parentSpanId: span.parentSpanId ?? '',
            name: span.name,
            kind: span.kind
              ? SPAN_KIND_MAP[span.kind]
              : SPAN_KIND_INTERNAL,
            startTimeUnixNano: msToNano(span.startTimeMs),
            endTimeUnixNano: msToNano(span.endTimeMs),
            attributes: span.attributes
              ? toOtlpAttributes(span.attributes)
              : [],
            status: span.status
              ? span.status.code === 'ok'
                ? { code: STATUS_OK }
                : { code: STATUS_ERROR, message: span.status.message }
              : undefined,
          })),
        },
      ],
    },
  ],
})

const serializeValue = (value: unknown, depth = 0): unknown => {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (typeof value === 'bigint') return String(value)
  if (typeof value === 'symbol')
    return `[Symbol ${value.description ?? 'unknown'}]`
  if (typeof value === 'function') {
    const functionName =
      'name' in value && typeof value.name === 'string'
        ? value.name
        : 'anonymous'
    return `[Function ${functionName}]`
  }

  if (isAction(value)) return `[Action ${value.name}]`
  if (isAtom(value)) return `[Atom ${value.name}]`

  if (value instanceof Promise) return '[Promise]'
  if (isAbort(value)) return `[AbortError ${value.message}]`
  if (value instanceof Error) {
    const causeMessage =
      isObject(value.cause) && 'message' in value.cause
        ? ` -> ${value.cause.message}`
        : ''
    return `[Error ${value.message}${causeMessage}]`
  }
  if (value instanceof Date) return value.toISOString()
  if (value instanceof RegExp) return value.toString()
  if (value instanceof WeakMap) return '[WeakMap]'
  if (value instanceof WeakSet) return '[WeakSet]'
  if (value instanceof WeakRef) return '[WeakRef]'

  if (ArrayBuffer.isView(value))
    return `[${value.constructor.name} ${value.byteLength}]`
  if (value instanceof ArrayBuffer)
    return `[ArrayBuffer ${value.byteLength}]`

  if (value instanceof Map) {
    if (depth >= 2) return '[Map]'
    const obj: Record<string, unknown> = {}
    for (const [k, v] of value)
      obj[String(k)] = serializeValue(v, depth + 1)
    return obj
  }
  if (value instanceof Set) {
    if (depth >= 2) return '[Set]'
    return Array.from(value, (v) => serializeValue(v, depth + 1))
  }
  if (Array.isArray(value)) {
    if (depth >= 2) return '[Array]'
    return value.map((v) => serializeValue(v, depth + 1))
  }

  if (depth >= 2) return '[Object]'
  const obj: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(
    value as Record<string, unknown>,
  ))
    obj[key] = serializeValue(val, depth + 1)
  return obj
}

export const serializeForOtlp = (value: unknown): string => {
  const result = serializeValue(value)
  return typeof result === 'string' ? result : JSON.stringify(result)
}

export const traceIdVar = variable<string>('opentelemetry.traceId')
export const spanIdVar = variable<string>('opentelemetry.spanId')

const resolveResourceAttributes = (
  option:
    | Record<string, OtlpAttrPrimitive>
    | (() => Record<string, OtlpAttrPrimitive>)
    | undefined,
): Record<string, OtlpAttrPrimitive> =>
  typeof option === 'function' ? option() : option ?? {}

export const connectOpentelemetry = (
  options: ConnectOpentelemetryOptions,
): OpentelemetryClient => {
  const endpoint = options.endpoint
  const requestHeaders = options.headers ?? {}
  const resourceAttributesOption = options.resourceAttributes
  const batchInterval = options.batchInterval ?? 5000
  const maxBatchSize = options.maxBatchSize ?? 100
  const scopeName = options.scopeName ?? 'reatom'

  let spanBuffer: Array<SpanData> = []
  let flushTimerId: ReturnType<typeof globalThis.setTimeout> | null =
    null
  let isDestroyed = false

  const sendBatch = (spansToSend: Array<SpanData>): Promise<void> => {
    if (spansToSend.length === 0) return Promise.resolve()

    const resolvedResourceAttrs =
      resolveResourceAttributes(resourceAttributesOption)
    const payload = buildOtlpTracePayload(
      spansToSend,
      resolvedResourceAttrs,
      scopeName,
    )
    const body = JSON.stringify(payload)

    const isPageHidden =
      typeof document !== 'undefined' &&
      document.visibilityState === 'hidden'
    const hasSendBeacon =
      typeof navigator !== 'undefined' &&
      typeof navigator.sendBeacon === 'function'

    if (isPageHidden && hasSendBeacon) {
      const blob = new Blob([body], { type: 'application/json' })
      navigator.sendBeacon(endpoint, blob)
      return Promise.resolve()
    }

    return fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...requestHeaders,
      },
      body,
      keepalive: true,
    }).then(() => undefined)
  }

  const flush = (): Promise<void> => {
    if (flushTimerId !== null) {
      clearTimeout(flushTimerId)
      flushTimerId = null
    }
    const currentSpans = spanBuffer
    spanBuffer = []
    return sendBatch(currentSpans).catch(() => {
      spanBuffer.unshift(...currentSpans)
    })
  }

  const scheduleFlush = (): void => {
    if (flushTimerId !== null || isDestroyed) return
    flushTimerId = globalThis.setTimeout(() => {
      flushTimerId = null
      flush()
    }, batchInterval)
  }

  const sendSpan = (span: SpanData): void => {
    if (isDestroyed) return
    spanBuffer.push(span)
    if (spanBuffer.length >= maxBatchSize) {
      flush()
    } else {
      scheduleFlush()
    }
  }

  const destroy = (): void => {
    isDestroyed = true
    if (flushTimerId !== null) {
      clearTimeout(flushTimerId)
      flushTimerId = null
    }
    flush()
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush()
    })
  }

  const withOpentelemetry = <T extends AtomLike>(target: T): T => {
    if (isSkip(target)) return target

    if (isAction(target)) {
      return target.extend(
        withActionMiddleware(() => (next, ...params) => {
          const startTime = Date.now()
          const parentTraceId = traceIdVar.get()
          const traceId = parentTraceId ?? generateTraceId()
          const parentSpanId = parentTraceId
            ? spanIdVar.get()
            : undefined
          const currentSpanId = generateSpanId()

          spanIdVar.set(currentSpanId)
          if (!parentTraceId) traceIdVar.set(traceId)

          try {
            const state = next(...params)

            if (state instanceof Promise) {
              state
                .then(
                  bind((result: unknown) => {
                    sendSpan({
                      traceId,
                      spanId: currentSpanId,
                      parentSpanId,
                      name: target.name,
                      startTimeMs: startTime,
                      endTimeMs: Date.now(),
                      kind: 'internal',
                      attributes: {
                        'reatom.type': 'action',
                        'reatom.params': serializeForOtlp(params),
                        'reatom.payload': serializeForOtlp(result),
                      },
                      status: { code: 'ok' },
                    })
                  }),
                )
                .catch(
                  bind((error: unknown) => {
                    const isAbortError = isAbort(error)
                    sendSpan({
                      traceId,
                      spanId: currentSpanId,
                      parentSpanId,
                      name: target.name,
                      startTimeMs: startTime,
                      endTimeMs: Date.now(),
                      kind: 'internal',
                      attributes: {
                        'reatom.type': 'action',
                        'reatom.params': serializeForOtlp(params),
                        'reatom.error': serializeForOtlp(error),
                      },
                      status: isAbortError
                        ? { code: 'ok' }
                        : {
                            code: 'error',
                            message: serializeForOtlp(error),
                          },
                    })
                  }),
                )
            } else {
              sendSpan({
                traceId,
                spanId: currentSpanId,
                parentSpanId,
                name: target.name,
                startTimeMs: startTime,
                endTimeMs: Date.now(),
                kind: 'internal',
                attributes: {
                  'reatom.type': 'action',
                  'reatom.params': serializeForOtlp(params),
                  'reatom.payload': serializeForOtlp(state),
                },
                status: { code: 'ok' },
              })
            }

            return state
          } catch (executionError) {
            sendSpan({
              traceId,
              spanId: currentSpanId,
              parentSpanId,
              name: target.name,
              startTimeMs: startTime,
              endTimeMs: Date.now(),
              kind: 'internal',
              attributes: {
                'reatom.type': 'action',
                'reatom.params': serializeForOtlp(params),
              },
              status: {
                code: 'error',
                message: serializeForOtlp(executionError),
              },
            })
            throw executionError
          }
        }),
      )
    }

    return target.extend(
      withMiddleware(() => (next, ...params) => {
        const startTime = Date.now()

        try {
          const prevState = top().state
          const nextState = next(...params)

          if (!Object.is(prevState, nextState)) {
            const parentTraceId = traceIdVar.get()
            const traceId = parentTraceId ?? generateTraceId()
            const parentSpanId = parentTraceId
              ? spanIdVar.get()
              : undefined
            const currentSpanId = generateSpanId()

            spanIdVar.set(currentSpanId)
            if (!parentTraceId) traceIdVar.set(traceId)

            sendSpan({
              traceId,
              spanId: currentSpanId,
              parentSpanId,
              name: target.name,
              startTimeMs: startTime,
              endTimeMs: Date.now(),
              kind: 'internal',
              attributes: {
                'reatom.type': 'atom',
                'reatom.prevState': serializeForOtlp(prevState),
                'reatom.nextState': serializeForOtlp(nextState),
              },
              status: { code: 'ok' },
            })
          }

          return nextState
        } catch (changeError) {
          if (changeError instanceof Promise) throw changeError

          const traceId = generateTraceId()
          const currentSpanId = generateSpanId()

          sendSpan({
            traceId,
            spanId: currentSpanId,
            name: target.name,
            startTimeMs: startTime,
            endTimeMs: Date.now(),
            kind: 'internal',
            status: {
              code: 'error',
              message: serializeForOtlp(changeError),
            },
          })

          throw changeError
        }
      }),
    )
  }

  return { sendSpan, flush, destroy, withOpentelemetry }
}
