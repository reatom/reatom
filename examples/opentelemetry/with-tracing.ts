import {
  abortVar,
  action,
  atom,
  type AtomLike,
  bind,
  type GenericAction,
  isAbort,
  isAction,
  noop,
  reatomArray,
  sleep,
  top,
  variable,
  withActionMiddleware,
  withMiddleware,
  wrap,
} from '@reatom/core'

import {
  generateSpanId,
  generateTraceId,
  type ResourceAttributes,
  sendTrace,
  type SpanInput,
  type SpanKind,
} from './client'
import { serialize } from './serialize'

export const traceIdVar = variable<string>('tracing.traceId')
const spanIdVar = variable<string>('tracing.spanId')
const resourceAttributesVar = variable<ResourceAttributes>(
  'tracing.resourceAttributes',
)

interface StartTracingOptions {
  traceId?: string
  spanId?: string
  resourceAttributes?: ResourceAttributes
}

// TODO: remove `abortVar.spawn` after reatom update
const startTracingFn: {
  <Params extends any[], Return>(
    cb: (...params: Params) => Return,
    ...params: Params
  ): Return
  <Params extends any[], Return>(
    options: StartTracingOptions,
    cb: (...params: Params) => Return,
    ...params: Params
  ): Return
} = (...params: any[]) => {
  if (typeof params[0] === 'function') {
    const cb = params[0]
    const cbParams = params.slice(1)

    traceIdVar.set(generateTraceId())
    return abortVar.spawn(() => spanIdVar.spawn(() => cb(...cbParams)))
  } else {
    const { traceId, spanId, resourceAttributes } = params[0]
    const cb = params[1]
    const cbParams = params.slice(2)

    traceIdVar.set(traceId ?? generateTraceId())
    if (spanId) spanIdVar.set(spanId)
    if (resourceAttributes) resourceAttributesVar.set(resourceAttributes)

    return abortVar.spawn(() =>
      traceId ? cb(...params) : spanIdVar.spawn(() => cb(...cbParams)),
    )
  }
}

export const startTracing = action(
  startTracingFn,
  '_startTracing',
) as GenericAction<typeof startTracingFn>

export const withStartTracing = withActionMiddleware(
  (target) =>
    (next, ...params) => {
      return startTracing(() => next(...params))
    },
)

export const getCurrentTracing = () => ({
  traceId: traceIdVar.get(),
  spanId: spanIdVar.get(),
})

interface WithTracingOptions {
  kind?: SpanKind
}

interface CreateTracingExtensionOptions {
  defaultExtensionOptions?: WithTracingOptions
  defaultResourceAttributes?: ResourceAttributes | (() => ResourceAttributes)
}

export const createTracingExtension = ({
  defaultExtensionOptions,
  defaultResourceAttributes,
}: CreateTracingExtensionOptions = {}) => {
  const spansPool = reatomArray<SpanInput>([], 'tracing._spansPool')
  const processing = atom(false, 'tracing._processing')

  const sendBatchesTraces = action(async () => {
    if (processing()) return

    processing.set(true)
    try {
      await wrap(sleep(3000))

      const spans = spansPool()
      if (spans.length) {
        const resourceAttributes =
          typeof defaultResourceAttributes === 'function'
            ? defaultResourceAttributes()
            : defaultResourceAttributes

        wrap(
          sendTrace({
            spans,
            resourceAttributes: {
              ...resourceAttributes,
              ...resourceAttributesVar.get(),
            },
          }).catch(console.error),
        )
        spansPool.set([])
      }
    } finally {
      processing.set(false)
    }
  })

  const queueSpan = (input: SpanInput) => {
    spansPool.push(input)
    wrap(sendBatchesTraces().catch(noop))
  }

  return function withTracing(options: WithTracingOptions = {}) {
    const { kind } = { ...defaultExtensionOptions, ...options }

    const startTracingInMiddleware = () => {
      const parentTraceId = traceIdVar.get()
      const traceId = parentTraceId ?? generateTraceId()
      const parentSpanId = parentTraceId ? spanIdVar.get() : undefined
      const spanId = generateSpanId()

      return { traceId, parentTraceId, spanId, parentSpanId }
    }

    return (target: AtomLike) => {
      return target.extend(
        isAction(target)
          ? withActionMiddleware(() => (next, ...params) => {
              const startTime = Date.now()
              const { traceId, spanId, parentTraceId, parentSpanId } =
                startTracingInMiddleware()

              try {
                spanIdVar.set(spanId)
                if (!parentTraceId) traceIdVar.set(traceId)

                const state = next(...params)

                if (state instanceof Promise) {
                  state
                    .then(
                      bind((result) => {
                        queueSpan({
                          traceId: traceId,
                          name: target.name,
                          startTimeMs: startTime,
                          endTimeMs: Date.now(),
                          spanId,
                          parentSpanId,
                          kind,
                          attributes: {
                            params: serialize(params),
                            payload: serialize(result),
                          },
                          status: { code: 'ok' },
                        })
                      }),
                    )
                    .catch(
                      bind((error) => {
                        const specialError = isAbort(error)

                        queueSpan({
                          traceId: traceId,
                          name: target.name,
                          startTimeMs: startTime,
                          endTimeMs: Date.now(),
                          spanId,
                          parentSpanId,
                          kind,
                          attributes: {
                            params: serialize(params),
                            payload: serialize(error),
                          },
                          status: specialError
                            ? { code: 'ok' }
                            : { code: 'error', message: serialize(error) },
                        })
                      }),
                    )
                } else {
                  queueSpan({
                    traceId: traceId,
                    name: target.name,
                    startTimeMs: startTime,
                    endTimeMs: Date.now(),
                    spanId,
                    parentSpanId,
                    kind,
                    attributes: {
                      params: serialize(params),
                      payload: serialize(state),
                    },
                    status: { code: 'ok' },
                  })
                }
                return state
              } catch (actionExecutionError) {
                queueSpan({
                  traceId: traceId,
                  name: target.name,
                  startTimeMs: startTime,
                  endTimeMs: Date.now(),
                  spanId,
                  parentSpanId,
                  kind,
                  status: {
                    code: 'error',
                    message: serialize(actionExecutionError),
                  },
                })
                throw actionExecutionError
              }
            })
          : withMiddleware(() => (next, ...params) => {
              const startTime = Date.now()

              try {
                const prevState = top().state
                const nextState = next(...params)
                const { traceId, spanId, parentTraceId, parentSpanId } =
                  startTracingInMiddleware()

                spanIdVar.set(spanId)
                if (!parentTraceId) traceIdVar.set(traceId)

                if (nextState instanceof Promise) {
                  nextState
                    .then(
                      bind((nextState) => {
                        queueSpan({
                          traceId: traceId,
                          name: target.name,
                          startTimeMs: startTime,
                          endTimeMs: Date.now(),
                          spanId,
                          parentSpanId,
                          kind,
                          attributes: {
                            params: serialize(params),
                            payload: serialize(nextState),
                          },
                          status: { code: 'ok' },
                        })
                      }),
                    )
                    .catch(
                      bind((error) => {
                        const specialError =
                          isAbort(error) || error instanceof Promise

                        queueSpan({
                          traceId: traceId,
                          name: target.name,
                          startTimeMs: startTime,
                          endTimeMs: Date.now(),
                          spanId,
                          parentSpanId,
                          kind,
                          attributes: specialError
                            ? {
                                payload: isAbort(error)
                                  ? serialize(error)
                                  : '[Suspension]',
                              }
                            : undefined,
                          status: specialError
                            ? { code: 'ok' }
                            : { code: 'error', message: serialize(error) },
                        })
                      }),
                    )
                } else {
                  queueSpan({
                    traceId: traceId,
                    name: target.name,
                    startTimeMs: startTime,
                    endTimeMs: Date.now(),
                    spanId,
                    parentSpanId,
                    kind,
                    attributes: {
                      prevState: serialize(prevState),
                      nextState: serialize(nextState),
                    },
                    status: { code: 'ok' },
                  })
                }

                return nextState
              } catch (atomChangeError) {
                if (atomChangeError instanceof Promise) throw atomChangeError

                const { traceId, spanId, parentSpanId } =
                  startTracingInMiddleware()

                queueSpan({
                  traceId: traceId,
                  name: target.name,
                  startTimeMs: startTime,
                  endTimeMs: Date.now(),
                  spanId,
                  parentSpanId,
                  kind,
                  status: {
                    code: 'error',
                    message: serialize(atomChangeError),
                  },
                })

                throw atomChangeError
              }
            }),
      )
    }
  }
}
