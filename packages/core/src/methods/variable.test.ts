import { expect, silentQueuesErrors, test, vi } from 'test'

import { withAsyncData } from '../async'
import { action, atom, computed, withMiddleware } from '../core'
import { wrap } from '../methods'
import { sleep } from '../utils'
import { variable } from './variable'

test('unique scope', async () => {
  const countVar = variable((init: number) => atom(init))
  const init = action(countVar.set.bind(countVar))

  const log = vi.fn()
  init(1).subscribe(log)
  expect(log).toBeCalledWith(1)
  init(2).subscribe(log)
  expect(log).toBeCalledWith(2)
})

test('scope propagation for actions', async () => {
  const countVar = variable((init: number) => atom(init))
  const read = action(() => countVar.get()!())
  const init = action((init: number) => {
    countVar.set(init)

    return read()
  })

  expect(init(1)).toBe(1)
  expect(init(2)).toBe(2)
})

test('scope propagation for atoms', async () => {
  silentQueuesErrors()

  const param = atom(0)
  const paramVar = variable<number>()
  const resource = computed(async () => param()).extend(
    withAsyncData({
      initState: { param: -1, paramVar: -1 },
      mapPayload: (param) => ({
        param,
        paramVar: paramVar.get()!,
      }),
    }),
  )
  const update = action((value: number) => {
    param.set(value)
    paramVar.set(value)
  })

  resource.data.subscribe()

  expect(resource.data()).toEqual({ param: -1, paramVar: -1 })
  await wrap(sleep())
  expect(resource.data().paramVar).toBeUndefined()

  update(1)
  await wrap(sleep())
  expect(resource.data()).toEqual({ param: 1, paramVar: 1 })
})

test('tracer', async () => {
  const traceIdVar = variable<string>('traceIdVar')
  const spanIdVar = variable<string>('spanIdVar')

  const traces = new Array<string>()
  const spans = new Array<string>()

  const withTracing = () =>
    withMiddleware(() => (next, ...params) => {
      try {
        return next(...params)
      } finally {
        const parentSpanId = spanIdVar.get()
        const parentTrace = traceIdVar.get()
        const traceId = parentTrace ?? Math.random().toString(16)
        const spanId = Math.random().toString(16)

        spanIdVar.set(spanId)
        if (!parentSpanId) {
          traceIdVar.set(traceId)
          traces.push(traceId)
        }

        spans.push(spanId)
      }
    })

  const textAtom = atom('', 'textAtom').extend(withTracing())

  const resource = computed(async () => {
    const text = textAtom()
    if (!text) return

    await wrap(sleep())
    return text
  }, 'resource').extend(withAsyncData(), withTracing())

  resource.data.extend(withTracing())

  resource.subscribe()

  expect(traces.length).toBe(1)
  expect(spans.length).toBe(2)

  textAtom.set('hey!')

  await wrap(sleep())

  expect(traces.length).toBe(2)
  expect(spans.length).toBe(5)
})
