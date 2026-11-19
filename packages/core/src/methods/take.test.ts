import { catalog, expect, test, vi } from 'test'

import { withAsyncData } from '../async'
import { action, type Atom, atom, computed, notify } from '../core'
import { withAbort, withSuspenseInit } from '../extensions'
import { identity, isAbort, noop, sleep, throwAbort } from '../utils'
import { take } from './take'
import { wrap } from './wrap'

test('take atom', async () => {
  setTimeout(wrap(catalog.page.set), 0, 4)
  expect(await take(catalog.page)).toBe(4)
})

test('take action', async () => {
  const item = { id: 1, title: 'Beta!' }

  setTimeout(wrap(catalog.save), 0, item)
  expect(await take(catalog.save)).toBe(item)
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
  const delayedPage = computed(async () => {
    const page = catalog.page()
    await wrap(sleep())
    return page
  }, 'skipAbort.delayedPage').extend(withAbort())
  delayedPage.subscribe()

  const TARGET = 3

  let i = TARGET
  while (i--) {
    queueMicrotask(
      wrap(() => {
        catalog.page.next()
      }),
    )
  }

  expect(await take(delayedPage)).toBe(TARGET)
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
  const asyncPage = computed(async () => catalog.page(), 'takeFilter.asyncPage')
  asyncPage.subscribe()

  let i = 5
  while (i--) {
    sleep().then(
      wrap(() => {
        catalog.page.next()
      }),
    )
  }

  const three = await wrap(
    take(asyncPage, (value) => (value === 3 ? value : throwAbort())),
  )
  expect(three).toBe(3)

  const pageState = catalog.page()
  expect(take(catalog.page, (value) => value)).toBe(pageState)
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

test('take in an aborted frame rejects with the abort without an unhandled rejection', async () => {
  const name = 'takeAbortedFrame'
  const flag = atom(false, `${name}.flag`)
  const run = action(async () => {
    run.abort('aborted before take')
    await wrap(take(flag))
  }, `${name}.run`).extend(withAbort())

  const rejections: unknown[] = []
  const listener = (reason: unknown) => rejections.push(reason)
  process.on('unhandledRejection', listener)

  try {
    let caught: unknown
    try {
      await wrap(run())
    } catch (error) {
      caught = error
    }
    expect(isAbort(caught)).toBe(true)

    await new Promise((resolve) => setTimeout(resolve))
    expect(rejections).toEqual([])
  } finally {
    process.off('unhandledRejection', listener)
  }
})
