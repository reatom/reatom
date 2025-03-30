import { expect, test, vi } from 'test'
import { _read, action, atom } from '../core'
import { withOnCall } from '../mixins'
import { wrap } from '../methods'
import { withAsync, withAsyncData } from './withAsync'

test('withAsync for action', async () => {
  const name = 'actionAsync'
  let fetchTrack = vi.fn()
  let fulfilLTrack = vi.fn()
  let settleTrack = vi.fn()
  const fetch = action(async (param: number) => param, `${name}.fetch`).mix(
    withAsync(),
    withOnCall((payload, params) => fetchTrack({ payload, params })),
  )
  fetch.onFulfill.mix(withOnCall((call) => fulfilLTrack(call)))
  fetch.onSettle.mix(withOnCall((call) => settleTrack(call)))

  const promise = fetch(1)
  await wrap(promise)

  expect(fetchTrack).toBeCalledTimes(1)
  expect(fetchTrack).toBeCalledWith({ payload: promise, params: [1] })
  expect(fulfilLTrack).toBeCalledTimes(1)
  expect(fulfilLTrack).toBeCalledWith({ payload: 1, params: [1] })
  expect(settleTrack).toBeCalledTimes(1)
  expect(settleTrack).toBeCalledWith({ payload: 1, params: [1] })
})

test('withAsync for atom', async () => {
  const name = 'atomAsync'
  const params = atom(0, `${name}.params`)
  const data = atom(async () => params(), `${name}.data`).mix(withAsync())

  expect(data.pending()).toBe(1)
  expect(data.ready()).toBe(false)
  expect(_read(data.pending)?.state).toBe(1)
  expect(data.pending()).toBe(1)
  // the async target should run by a computed
  expect(_read(data)?.state).instanceOf(Promise)

  expect(await wrap(data())).toBe(0)
  expect(data.pending()).toBe(0)
  expect(data.ready()).toBe(true)
})

test('withAsyncData for action', async () => {
  const name = 'actionAsyncData'
  const fetch = action(async (param: number) => param + 1, `${name}.fetch`).mix(
    withAsyncData(),
  )
  const onFulfill = vi.fn()
  fetch.onFulfill.mix(withOnCall((call) => onFulfill(call)))

  expect(fetch.data()).toBeUndefined()
  expect(fetch.ready()).toBe(true)

  const promise = fetch(1)
  expect(fetch.pending()).toBe(1)
  expect(fetch.ready()).toBe(false)

  await wrap(promise)
  expect(fetch.pending()).toBe(0)
  expect(fetch.ready()).toBe(true)
  expect(fetch.data()).toBe(2)
  expect(onFulfill).toBeCalledTimes(1)
  expect(onFulfill).toBeCalledWith({ payload: 2, params: [1] })
})

// test('withAsyncData - basic async atom', async () => {
//   const name = 'asyncDataAtom'
//   const params = atom(42, `${name}.params`)
//   const data = atom(async () => params(), `${name}.data`).mix(withAsyncData())

//   expect(data.data()).toBeUndefined()
//   expect(data.ready()).toBe(false)

//   expect(await wrap(data())).toBe(42)
//   expect(data.data()).toBe(42)
//   expect(data.ready()).toBe(true)
// })

// test('withAsyncData - with initial state (same type)', async () => {
//   const name = 'asyncDataInitial'
//   const fetch = action(async (param: number) => param * 2, `${name}.fetch`).mix(
//     withAsyncData(100),
//   )

//   expect(fetch.data()).toBe(100)

//   const promise = fetch(50)
//   await wrap(promise)
//   expect(fetch.data()).toBe(100)
// })

// test('withAsyncData - with initial state (different type)', async () => {
//   const name = 'asyncDataDiffType'
//   const fetch = action(
//     async (param: string) => param.length,
//     `${name}.fetch`,
//   ).mix(withAsyncData('initial'))

//   expect(fetch.data()).toBe('initial')

//   const promise = fetch('test string')
//   await wrap(promise)
//   expect(fetch.data()).toBe(11)
// })

// test('withAsyncData - with custom mapping function', async () => {
//   const name = 'asyncDataMapping'
//   const fetch = action(async (param: number) => param, `${name}.fetch`).mix(
//     withAsyncData(0, (payload, params, state) => state + payload),
//   )

//   expect(fetch.data()).toBe(0)

//   await wrap(fetch(5))
//   expect(fetch.data()).toBe(5)

//   await wrap(fetch(10))
//   expect(fetch.data()).toBe(15)
// })
