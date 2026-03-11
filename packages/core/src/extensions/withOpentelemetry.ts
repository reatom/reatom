import type { Action, Atom, AtomLike, Ext, Frame, GenericAction } from '../core'
import {
  action,
  atom,
  bind,
  isAction,
  isAtom,
  top,
  withActionMiddleware,
  withMiddleware,
} from '../core'
import { variable } from '../methods/variable'
import { wrap } from '../methods/wrap'
import { isAbort, isBrowser, isObject, isRec, noop } from '../utils'

export type OpentelemetryAttribute = boolean | number | string
export type OpentelemetryAttributes = Record<string, OpentelemetryAttribute>
export type OpentelemetrySpanKind =
  | 'client'
  | 'consumer'
  | 'internal'
  | 'producer'
  | 'server'

export type OpentelemetrySpanStatus =
  | { code: 'ok' }
  | { code: 'error'; message?: string }

export interface OpentelemetrySpan {
  attributes?: OpentelemetryAttributes
  endTimeMs: number
  kind?: OpentelemetrySpanKind
  name: string
  parentSpanId?: string
  spanId: string
  startTimeMs: number
  status?: OpentelemetrySpanStatus
  traceId: string
}

export interface OpentelemetryActionEvent {
  endTimeMs: number
  error?: unknown
  params: ReadonlyArray<unknown>
  parentSpanId?: string
  payload?: unknown
  spanId: string
  startTimeMs: number
  target: Action
  traceId: string
  type: 'action'
}

export interface OpentelemetryAtomEvent {
  endTimeMs: number
  error?: unknown
  nextState?: unknown
  params: ReadonlyArray<unknown>
  parentSpanId?: string
  prevState: unknown
  spanId: string
  startTimeMs: number
  target: AtomLike
  traceId: string
  type: 'atom'
}

export type OpentelemetryEvent =
  | OpentelemetryActionEvent
  | OpentelemetryAtomEvent

export interface OpentelemetryTargetOptions {
  getAttributes?: (event: OpentelemetryEvent) => undefined | Record<string, unknown>
  getSpanName?: string | ((event: OpentelemetryEvent) => string)
  getStatus?: (event: OpentelemetryEvent) => undefined | OpentelemetrySpanStatus
  kind?: OpentelemetrySpanKind
  match?: (event: OpentelemetryEvent, frame: Frame) => boolean
}

export interface OpentelemetrySendInput {
  reason: string
  resourceAttributes?: OpentelemetryAttributes
  spans: ReadonlyArray<OpentelemetrySpan>
}

export interface WithOpentelemetryOptions {
  batchDelay?: number
  canFlush?: (
    reason: string,
    spans: ReadonlyArray<OpentelemetrySpan>,
  ) => boolean
  defaultResourceAttributes?:
    | Record<string, unknown>
    | (() => Record<string, unknown>)
  name?: string
  send: (input: OpentelemetrySendInput) => Promise<void> | void
}

export interface WithOpentelemetryFactory {
  <Target extends AtomLike>(options?: OpentelemetryTargetOptions): Ext<Target>
  flush: GenericAction<(reason?: string) => Promise<number>>
  lastError: Atom<Error | undefined>
  lastFlushAt: Atom<number | undefined>
  lastFlushReason: Atom<string | undefined>
  pending: Atom<boolean>
  queue: Atom<Array<OpentelemetrySpan>>
}

export const opentelemetryTraceIdVar = variable<string>('opentelemetry.traceId')
export const opentelemetrySpanIdVar = variable<string>('opentelemetry.spanId')
export const opentelemetryResourceAttributesVar = variable<Record<string, unknown>>(
  'opentelemetry.resourceAttributes',
)

const spanKindMap: Record<OpentelemetrySpanKind, number> = {
  internal: 1,
  server: 2,
  client: 3,
  producer: 4,
  consumer: 5,
}

const normalizeError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(serializeOpentelemetryAttribute(error)))

const isPrivateName = (name: string) =>
  name.startsWith('_') || name.includes('._')

const serializeValue = (value: unknown, depth = 0): unknown => {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'

  switch (typeof value) {
    case 'boolean':
    case 'number':
    case 'string':
      return value
    case 'bigint':
      return value.toString()
    case 'function':
      return `[Function ${value.name || 'anonymous'}]`
    case 'symbol':
      return `[Symbol ${value.description || ''}]`
  }

  if (isAction(value)) return `[Action ${value.name}]`
  if (isAtom(value)) return `[Atom ${value.name}]`
  if (value instanceof Promise) return '[Promise]'
  if (isAbort(value)) return `[AbortError ${value.message}]`
  if (value instanceof Error) return `[Error ${value.message}]`
  if (value instanceof Date) return value.toISOString()
  if (value instanceof RegExp) return value.toString()
  if (value instanceof URL) return value.toString()

  if (ArrayBuffer.isView(value)) {
    return `[${value.constructor.name} ${value.byteLength}]`
  }

  if (value instanceof ArrayBuffer) {
    return `[ArrayBuffer ${value.byteLength}]`
  }

  if (value instanceof Map) {
    if (depth >= 2) return '[Map]'

    const serializedMap: Record<string, unknown> = {}
    for (const [key, item] of value.entries()) {
      serializedMap[String(key)] = serializeValue(item, depth + 1)
    }

    return serializedMap
  }

  if (value instanceof Set) {
    if (depth >= 2) return '[Set]'

    return Array.from(value.values(), (item) => serializeValue(item, depth + 1))
  }

  if (Array.isArray(value)) {
    if (depth >= 2) return '[Array]'

    return value.map((item) => serializeValue(item, depth + 1))
  }

  if (!isObject(value)) return String(value)
  if (depth >= 2) return '[Object]'
  if (!isRec(value)) return String(value)

  const serializedObject: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value)) {
    serializedObject[key] = serializeValue(item, depth + 1)
  }

  return serializedObject
}

export const serializeOpentelemetryAttribute = (
  value: unknown,
): OpentelemetryAttribute => {
  const serialized = serializeValue(value)

  return typeof serialized === 'string' ||
    typeof serialized === 'number' ||
    typeof serialized === 'boolean'
    ? serialized
    : JSON.stringify(serialized)
}

export const serializeOpentelemetryAttributes = (
  attributes?: Record<string, unknown>,
): undefined | OpentelemetryAttributes => {
  if (!attributes) return undefined

  const serializedAttributes: OpentelemetryAttributes = {}
  let hasAttributes = false

  for (const [key, value] of Object.entries(attributes)) {
    if (value === undefined) continue

    serializedAttributes[key] = serializeOpentelemetryAttribute(value)
    hasAttributes = true
  }

  return hasAttributes ? serializedAttributes : undefined
}

const hexFromBytes = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')

export const generateTraceId = (): string =>
  hexFromBytes(globalThis.crypto.getRandomValues(new Uint8Array(16)))

export const generateSpanId = (): string =>
  hexFromBytes(globalThis.crypto.getRandomValues(new Uint8Array(8)))

const msToNano = (value: number): string => String(BigInt(value) * 1_000_000n)

const toOtlpValue = (value: OpentelemetryAttribute) => {
  if (typeof value === 'boolean') {
    return { boolValue: value }
  }

  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? { intValue: String(value) }
      : { doubleValue: value }
  }

  return { stringValue: value }
}

const toOtlpAttributes = (attributes: OpentelemetryAttributes) =>
  Object.entries(attributes).map(([key, value]) => ({
    key,
    value: toOtlpValue(value),
  }))

export interface CreateOtlpTraceRequestOptions {
  resourceAttributes?: OpentelemetryAttributes
  scopeName?: string
  scopeVersion?: string
  spans: ReadonlyArray<OpentelemetrySpan>
}

export const createOtlpTraceRequest = ({
  resourceAttributes,
  scopeName = '@reatom/core',
  scopeVersion,
  spans,
}: CreateOtlpTraceRequestOptions) => ({
  resourceSpans: [
    {
      resource: {
        attributes: toOtlpAttributes(resourceAttributes ?? {}),
      },
      scopeSpans: [
        {
          scope: {
            name: scopeName,
            ...(scopeVersion ? { version: scopeVersion } : {}),
          },
          spans: spans.map((span) => ({
            traceId: span.traceId,
            spanId: span.spanId,
            parentSpanId: span.parentSpanId ?? '',
            name: span.name,
            kind: span.kind ? spanKindMap[span.kind] : spanKindMap.internal,
            startTimeUnixNano: msToNano(span.startTimeMs),
            endTimeUnixNano: msToNano(span.endTimeMs),
            attributes: span.attributes
              ? toOtlpAttributes(span.attributes)
              : [],
            status:
              span.status?.code === 'error'
                ? { code: 2, message: span.status.message }
                : span.status?.code === 'ok'
                  ? { code: 1 }
                  : undefined,
          })),
        },
      ],
    },
  ],
})

export interface SendOtlpTraceOptions extends CreateOtlpTraceRequestOptions {
  endpoint: string | URL
  headers?: HeadersInit
  keepalive?: boolean
  signal?: AbortSignal
  transport?: typeof globalThis.fetch
}

export const getOtlpTracesUrl = (endpoint: string | URL): string => {
  const base =
    endpoint instanceof URL
      ? new URL(endpoint.toString())
      : new URL(endpoint, isBrowser() ? window.location.href : 'http://localhost/')

  if (!base.pathname.endsWith('/v1/traces')) {
    base.pathname = `${base.pathname.replace(/\/$/, '')}/v1/traces`
  }

  return base.toString()
}

export const sendOtlpTraces = async ({
  endpoint,
  headers,
  keepalive,
  resourceAttributes,
  scopeName,
  scopeVersion,
  signal,
  spans,
  transport = globalThis.fetch,
}: SendOtlpTraceOptions): Promise<void> => {
  const response = await transport(getOtlpTracesUrl(endpoint), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(
      createOtlpTraceRequest({
        spans,
        resourceAttributes,
        scopeName,
        scopeVersion,
      }),
    ),
    keepalive,
    signal,
  })

  if (response.ok) return

  let message = `OTLP ingest failed (${response.status})`

  try {
    const responseText = await response.text()
    if (responseText) {
      message += `: ${responseText}`
    }
  } catch {
    // ignore text parsing errors
  }

  throw new Error(message)
}

const defaultAttributes = (
  event: OpentelemetryEvent,
): undefined | Record<string, unknown> => {
  if (event.type === 'action') {
    return event.error === undefined
      ? {
          params: event.params,
          payload: event.payload,
        }
      : {
          params: event.params,
          error: event.error,
        }
  }

  return event.error === undefined
    ? {
        params: event.params,
        prevState: event.prevState,
        nextState: event.nextState,
      }
    : {
        params: event.params,
        prevState: event.prevState,
        error: event.error,
      }
}

const defaultStatus = (event: OpentelemetryEvent): OpentelemetrySpanStatus =>
  event.error === undefined || isAbort(event.error)
    ? { code: 'ok' }
    : { code: 'error', message: String(serializeOpentelemetryAttribute(event.error)) }

export const withOpentelemetry = ({
  batchDelay = 3000,
  canFlush,
  defaultResourceAttributes,
  name = 'opentelemetry',
  send,
}: WithOpentelemetryOptions): WithOpentelemetryFactory => {
  const queue = atom<Array<OpentelemetrySpan>>([], `${name}._queue`)
  const pending = atom(false, `${name}._pending`)
  const timer = atom<ReturnType<typeof globalThis.setTimeout> | undefined>(
    undefined,
    `${name}._timer`,
  )
  const lastError = atom<Error | undefined>(undefined, `${name}.lastError`)
  const lastFlushAt = atom<number | undefined>(undefined, `${name}.lastFlushAt`)
  const lastFlushReason = atom<string | undefined>(
    undefined,
    `${name}.lastFlushReason`,
  )
  const instrumentedTargets = new WeakSet<AtomLike>()
  let queuedSpans: Array<OpentelemetrySpan> = []
  let pendingRequest = false
  let timerId: ReturnType<typeof globalThis.setTimeout> | undefined
  const deliveredSpanIds = new Set<string>()

  const rememberDeliveredSpan = (spanId: string) => {
    deliveredSpanIds.add(spanId)

    while (deliveredSpanIds.size > 5000) {
      const oldestSpanId = deliveredSpanIds.values().next().value

      if (oldestSpanId === undefined) {
        break
      }

      deliveredSpanIds.delete(oldestSpanId)
    }
  }

  const resolveResourceAttributes = (): undefined | OpentelemetryAttributes => {
    const scopedResourceAttributes = opentelemetryResourceAttributesVar.get()
    const baseResourceAttributes =
      typeof defaultResourceAttributes === 'function'
        ? defaultResourceAttributes()
        : defaultResourceAttributes

    return serializeOpentelemetryAttributes({
      ...baseResourceAttributes,
      ...scopedResourceAttributes,
    })
  }

  const scheduleFlush = action(
    (reason = 'timer') => {
      if (timerId !== undefined) return

      const runFlush = wrap(() => {
        timerId = undefined
        timer.set(undefined)
        void flush(reason).catch(noop)
      })

      timerId = globalThis.setTimeout(runFlush, batchDelay)
      timer.set(timerId)
    },
    `${name}._scheduleFlush`,
  )

  const flush = action(
    (reason = 'manual') => {
      if (timerId !== undefined) {
        globalThis.clearTimeout(timerId)
        timerId = undefined
        timer.set(undefined)
      }

      const spans = queuedSpans.filter(
        (span) => !deliveredSpanIds.has(span.spanId),
      )
      if (spans.length !== queuedSpans.length) {
        queuedSpans = spans
        queue.set([...queuedSpans])
      }

      if (spans.length === 0 || pendingRequest) return Promise.resolve(0)
      if (canFlush && !canFlush(reason, spans)) return Promise.resolve(0)

      pendingRequest = true
      queuedSpans = []
      pending.set(true)
      queue.set([])

      return Promise.resolve(
        send({
          reason,
          spans,
          resourceAttributes: resolveResourceAttributes(),
        }),
      )
        .then(
          bind(() => {
            for (const span of spans) {
              rememberDeliveredSpan(span.spanId)
            }

            lastError.set(undefined)
            lastFlushAt.set(Date.now())
            lastFlushReason.set(reason)

            return spans.length
          }),
        )
        .catch(
          bind((error: unknown) => {
            const normalizedError = normalizeError(error)

            queuedSpans = [...spans, ...queuedSpans]
            queue.set([...queuedSpans])
            lastError.set(normalizedError)

            throw normalizedError
          }),
        )
        .finally(
          bind(() => {
            pendingRequest = false
            pending.set(false)

            if (queuedSpans.length > 0 && timerId === undefined) {
              scheduleFlush('timer')
            }
          }),
        )
    },
    `${name}.flush`,
  )

  const queueSpan = (span: OpentelemetrySpan) => {
    queuedSpans = [...queuedSpans, span]
    queue.set([...queuedSpans])
    scheduleFlush('timer')
  }

  const createSpanContext = () => {
    const traceId = opentelemetryTraceIdVar.get() ?? generateTraceId()

    return {
      traceId,
      spanId: generateSpanId(),
      parentSpanId: opentelemetrySpanIdVar.get(),
    }
  }

  const emitSpan = (
    event: OpentelemetryEvent,
    options: OpentelemetryTargetOptions,
  ) => {
    const frame = top()

    if (options.match && !options.match(event, frame)) {
      return
    }

    const attributes = serializeOpentelemetryAttributes(
      options.getAttributes?.(event) ?? defaultAttributes(event),
    )

    const status = options.getStatus?.(event) ?? defaultStatus(event)
    const name =
      typeof options.getSpanName === 'function'
        ? options.getSpanName(event)
        : options.getSpanName ?? event.target.name

    queueSpan({
      attributes,
      endTimeMs: event.endTimeMs,
      kind: options.kind,
      name,
      parentSpanId: event.parentSpanId,
      spanId: event.spanId,
      startTimeMs: event.startTimeMs,
      status,
      traceId: event.traceId,
    })
  }

  function createExtension<Target extends AtomLike>(
    targetOptions: OpentelemetryTargetOptions = {},
  ): Ext<Target> {
    return (target) => {
      if (instrumentedTargets.has(target) || isPrivateName(target.name)) {
        return target
      }

      instrumentedTargets.add(target)

      if (isAction(target)) {
        return target.extend(
          withActionMiddleware(() => {
            return (next, ...params) => {
              const startTimeMs = Date.now()
              const spanContext = createSpanContext()

              opentelemetrySpanIdVar.set(spanContext.spanId)
              if (opentelemetryTraceIdVar.get() === undefined) {
                opentelemetryTraceIdVar.set(spanContext.traceId)
              }

              try {
                const result = next(...params)

                if (result instanceof Promise) {
                  result
                    .then(
                      bind((payload: unknown) => {
                        emitSpan(
                          {
                            endTimeMs: Date.now(),
                            params,
                            parentSpanId: spanContext.parentSpanId,
                            payload,
                            spanId: spanContext.spanId,
                            startTimeMs,
                            target,
                            traceId: spanContext.traceId,
                            type: 'action',
                          },
                          targetOptions,
                        )
                      }),
                    )
                    .catch(
                      bind((error: unknown) => {
                        emitSpan(
                          {
                            endTimeMs: Date.now(),
                            error,
                            params,
                            parentSpanId: spanContext.parentSpanId,
                            spanId: spanContext.spanId,
                            startTimeMs,
                            target,
                            traceId: spanContext.traceId,
                            type: 'action',
                          },
                          targetOptions,
                        )
                      }),
                    )
                } else {
                  emitSpan(
                    {
                      endTimeMs: Date.now(),
                      params,
                      parentSpanId: spanContext.parentSpanId,
                      payload: result,
                      spanId: spanContext.spanId,
                      startTimeMs,
                      target,
                      traceId: spanContext.traceId,
                      type: 'action',
                    },
                    targetOptions,
                  )
                }

                return result
              } catch (error) {
                emitSpan(
                  {
                    endTimeMs: Date.now(),
                    error,
                    params,
                    parentSpanId: spanContext.parentSpanId,
                    spanId: spanContext.spanId,
                    startTimeMs,
                    target,
                    traceId: spanContext.traceId,
                    type: 'action',
                  },
                  targetOptions,
                )

                throw error
              }
            }
          }),
        )
      }

      return target.extend(
        withMiddleware(() => {
          return (next, ...params) => {
            const prevState = top().state
            const startTimeMs = Date.now()

            try {
              const result = next(...params)
              const spanContext = createSpanContext()

              if (result instanceof Promise) {
                result
                  .then(
                    bind((nextState: unknown) => {
                      if (Object.is(prevState, nextState)) return

                      emitSpan(
                        {
                          endTimeMs: Date.now(),
                          nextState,
                          params,
                          parentSpanId: spanContext.parentSpanId,
                          prevState,
                          spanId: spanContext.spanId,
                          startTimeMs,
                          target,
                          traceId: spanContext.traceId,
                          type: 'atom',
                        },
                        targetOptions,
                      )
                    }),
                  )
                  .catch(
                    bind((error: unknown) => {
                      if (error instanceof Promise) return

                      emitSpan(
                        {
                          endTimeMs: Date.now(),
                          error,
                          params,
                          parentSpanId: spanContext.parentSpanId,
                          prevState,
                          spanId: spanContext.spanId,
                          startTimeMs,
                          target,
                          traceId: spanContext.traceId,
                          type: 'atom',
                        },
                        targetOptions,
                      )
                    }),
                  )
              } else if (!Object.is(prevState, result)) {
                emitSpan(
                  {
                    endTimeMs: Date.now(),
                    nextState: result,
                    params,
                    parentSpanId: spanContext.parentSpanId,
                    prevState,
                    spanId: spanContext.spanId,
                    startTimeMs,
                    target,
                    traceId: spanContext.traceId,
                    type: 'atom',
                  },
                  targetOptions,
                )
              }

              return result
            } catch (error) {
              if (error instanceof Promise) {
                throw error
              }

              const spanContext = createSpanContext()

              emitSpan(
                {
                  endTimeMs: Date.now(),
                  error,
                  params,
                  parentSpanId: spanContext.parentSpanId,
                  prevState,
                  spanId: spanContext.spanId,
                  startTimeMs,
                  target,
                  traceId: spanContext.traceId,
                  type: 'atom',
                },
                targetOptions,
              )

              throw error
            }
          }
        }),
      )
    }
  }

  const api = Object.assign(createExtension, {
    flush,
    lastError,
    lastFlushAt,
    lastFlushReason,
    pending,
    queue,
  }) satisfies WithOpentelemetryFactory

  return api
}
