import { expect, test } from 'test'

import { action, atom } from '../core'
import { wrap } from '../methods'
import { sleep } from '../utils'
import {
  createOtlpTraceRequest,
  withOpentelemetry,
  type OpentelemetrySpan,
} from './withOpentelemetry'

const waitForFlush = async () => {
  await wrap(sleep())
  await wrap(sleep())
}

test('withOpentelemetry keeps action and atom spans in one trace', async () => {
  const batches: Array<ReadonlyArray<OpentelemetrySpan>> = []
  const telemetry = withOpentelemetry({
    batchDelay: 0,
    send: ({ spans }) => {
      batches.push(spans)
    },
  })

  const count = atom(0, 'analytics.count').extend(telemetry())
  const increment = action((value: number) => {
    count.set(value)
    return count()
  }, 'analytics.increment').extend(telemetry())

  increment(2)
  await waitForFlush()

  const spans = batches.flat()
  const incrementSpan = spans.find((span) => span.name === 'analytics.increment')
  const countSpan = spans.find((span) => span.name === 'analytics.count')

  expect(spans).toHaveLength(2)
  expect(incrementSpan?.traceId).toBe(countSpan?.traceId)
  expect(countSpan?.parentSpanId).toBe(incrementSpan?.spanId)
  expect(incrementSpan?.attributes?.payload).toBe(2)
  expect(countSpan?.attributes?.prevState).toBe(0)
  expect(countSpan?.attributes?.nextState).toBe(2)
})

test('withOpentelemetry supports custom span metadata and OTLP encoding', async () => {
  const batches: Array<ReadonlyArray<OpentelemetrySpan>> = []
  const telemetry = withOpentelemetry({
    batchDelay: 0,
    send: ({ spans }) => {
      batches.push(spans)
    },
  })

  const submit = action((ok: boolean) => {
    if (!ok) {
      throw new Error('boom')
    }

    return { ok }
  }, 'analytics.submit').extend(
    telemetry({
      getAttributes: (event) =>
        event.type === 'action'
          ? {
              outcome: event.error === undefined ? 'ok' : 'error',
            }
          : undefined,
      getSpanName: 'web.event',
      kind: 'client',
    }),
  )

  expect(() => submit(false)).toThrow('boom')
  await waitForFlush()

  const [span] = batches.flat()
  const request = createOtlpTraceRequest({
    resourceAttributes: { 'service.name': 'site' },
    scopeName: '@reatom/test',
    spans: batches.flat(),
  })
  const encodedSpan =
    request.resourceSpans[0]?.scopeSpans[0]?.spans[0]

  expect(span?.name).toBe('web.event')
  expect(span?.kind).toBe('client')
  expect(span?.attributes?.outcome).toBe('error')
  expect(span?.status).toEqual({ code: 'error', message: '[Error boom]' })
  expect(encodedSpan?.kind).toBe(3)
  expect(encodedSpan?.status).toEqual({ code: 2, message: '[Error boom]' })
})

test('withOpentelemetry flushes only spans queued after pending sends', async () => {
  const batches: Array<ReadonlyArray<OpentelemetrySpan>> = []
  const resolvers: Array<() => void> = []
  const telemetry = withOpentelemetry({
    batchDelay: 0,
    send: ({ spans }) =>
      new Promise<void>((resolve) => {
        batches.push(spans)
        resolvers.push(resolve)
      }),
  })

  const event = action((name: string) => name, 'analytics.event').extend(
    telemetry(),
  )

  event('one')
  await wrap(sleep())

  event('two')
  await wrap(sleep())

  expect(batches).toHaveLength(1)
  expect(batches[0]?.[0]?.attributes?.payload).toBe('one')

  resolvers[0]?.()
  await waitForFlush()

  expect(batches).toHaveLength(2)
  expect(batches[1]?.[0]?.attributes?.payload).toBe('two')
})
