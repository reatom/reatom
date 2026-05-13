import { expect, test, vi } from 'test'

import { withAsyncData } from '../async'
import { action, type Atom, atom, computed, notify } from '../core'
import { withAbort, withSuspenseInit } from '../extensions'
import { identity, noop, sleep, throwAbort } from '../utils'
import { take } from './take'
import { wrap } from './wrap'

test('take atom', async () => {
  const at = atom(0)

  setTimeout(wrap(at.set), 0, 4)
  expect(await take(at)).toBe(4)
})

test('take action', async () => {
  const act = action((v: number) => Promise.resolve(v))

  setTimeout(wrap(act), 0, 4)
  expect(await take(act)).toBe(4)
})

test('take atom error', async () => {
  const at = atom(0)

  // NO await
  sleep().then(
    wrap(() => {
      try {
        at.set(() => {
          throw 4
        })
      } catch {
        // nothing
      }
    }),
  )

  expect(await take(at).catch(identity)).toBe(4)
})

test('should skip abort', async () => {
  const name = 'skipAbort'
  const param = atom(0, `${name}.param`)
  const data = computed(async () => {
    const result = param()
    await wrap(sleep())
    return result
  }, `${name}.data`).extend(withAbort())
  data.subscribe()

  const TARGET = 3

  let i = TARGET
  while (i--) {
    queueMicrotask(
      wrap(() => {
        param.set((state) => state + 1)
      }),
    )
  }

  expect(await take(data)).toBe(TARGET)
})

test('take concurrency', async () => {
  const name = 'takeConcurrency'
  const param = atom(true, `${name}.param`)
  const some = action(identity, `${name}.some`)
  const track = vi.fn()
  const data = computed(async () => {
    if (param()) take(some).then(track).catch(noop)
    await wrap(sleep(10))
  }, `${name}.data`).extend(withAsyncData())

  data.subscribe()

  some(1)
  await wrap(sleep())
  expect(track).toBeCalledTimes(1)
  expect(track).toBeCalledWith(1)

  param.set(false)
  notify()
  param.set(true)
  await wrap(sleep())
  param.set(false)
  await wrap(sleep())
  some(1)
  await wrap(sleep())
  expect(track).toBeCalledTimes(1)
})

test('take filter', async () => {
  const name = 'skipAbort'
  const param = atom(0, `${name}.param`)
  const data = computed(async () => {
    return param()
  }, `${name}.data`)
  data.subscribe()

  let i = 5
  while (i--) {
    sleep().then(
      wrap(() => {
        param.set((state) => state + 1)
      }),
    )
  }

  const three = await wrap(
    take(data, (value) => (value === 3 ? value : throwAbort())),
  )
  expect(three).toBe(3)

  const paramState = param()
  expect(take(param, (value) => value)).toBe(paramState)
})

test('take suspense', async () => {
  const resource = atom(async () => 1, 'takeSuspense.resource').extend(
    withSuspenseInit(),
  )

  expect(await wrap(take(resource))).toBe(1)
})

test('take with selector', async () => {
  const atomized = atom<{ nested: Atom<number | undefined> }>()

  setTimeout(wrap(() => atomized.set({ nested: atom(1) })))
  expect(await wrap(take(() => atomized()?.nested()))).toBe(1)

  setTimeout(wrap(() => atomized()?.nested?.set(undefined)))
  expect(await wrap(take(() => atomized()?.nested()))).toBe(undefined)

  setTimeout(wrap(() => atomized()?.nested?.set(5)))
  setTimeout(wrap(() => atomized()?.nested?.set(4)))

  expect(
    await wrap(
      take(
        () => atomized()?.nested(),
        (state) => (state === 4 ? 4 : throwAbort()),
      ),
    ),
  ).toBe(4)
})
