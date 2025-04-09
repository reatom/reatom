import { expect, test } from 'test'

import { atom, computed, root } from '../core/atom'
import { wrap } from './wrap'
import { sleep } from '../utils'
import { getStackTrace } from '../connectLogger'

test('async frame stack', async () => {
  const name = 'asyncStack'
  const getTrace = () =>
    getStackTrace('', ' ')
      .replaceAll(`${name}.`, '')
      .replace(/ \[\#\d\]/g, '')

  const a0 = atom(0, `${name}.a0`)
  const a1 = computed(() => {
    return a0() + 1
  }, `${name}.a1`)
  const a2 = computed(() => a1() + 1, `${name}.a2`)

  const logs: Array<string> = []

  await wrap(
    new Promise<void>((resolve, reject) => {
      computed(async () => {
        try {
          const v = a2()

          await wrap(sleep())

          if (v < 5) a0(v)
          else resolve()
        } catch (error) {
          reject(error)
        }
      }, `${name}.loop`).subscribe()

      computed(() => {
        try {
          logs.push(a0() + getTrace())
        } catch (error) {
          reject(error)
        }
      }, `${name}.log`).subscribe()
    }),
  )

  expect(logs).toEqual([
    '0 <-- a0',
    '2 <-- a0 <-- loop <-- a2 <-- a1 <-- a0',
    '4 <-- a0 <-- loop <-- a2 <-- a1 <-- a0 <-- loop <-- a2 <-- a1 <-- a0',
  ])

  expect(root().pubs).toEqual([null])
  expect(root().subs.length).toBe(0)
})
