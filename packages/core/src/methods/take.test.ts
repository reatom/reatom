import { expect, test, vi } from 'test'
import { action, atom, computed, notify } from '../core'
import { take } from './take'
import { wrap } from './wrap'
import { identity, noop, sleep } from '../utils'
import { withAsyncData } from '../async'

test('take atom', async () => {
  const at = atom(0)

  setTimeout(wrap(at), 0, 4)
  expect(await take(at)).toBe(4)
})

test('take action', async () => {
  const act = action((v: number) => Promise.resolve(v))

  setTimeout(wrap(act), 0, 4)
  expect(await take(act)).toBe(4)
})

test('take atom error', async () => {
  const at = atom(0)

  setTimeout(
    wrap(() => {
      try {
        at(() => {
          throw 4
        })
      } catch {
        // nothing
      }
    }),
    0,
    4,
  )
  expect(await take(at).catch(identity)).toBe(4)
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

  param(false)
  notify()
  param(true)
  await wrap(sleep())
  param(false)
  await wrap(sleep())
  some(1)
  await wrap(sleep())
  expect(track).toBeCalledTimes(1)
})
