import { expect, expectTypeOf, test } from 'test'

import { atom, computed, context, top } from '../core'
import { sleep } from '../utils'
import { getStackTrace } from './'
import { wrap } from './wrap'

test('async frame stack', async () => {
  const name = 'asyncStack'
  const getTrace = () =>
    getStackTrace()
      .replaceAll(`${name}.`, '')
      .replace(/\[#\d*\]/g, '')

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

          if (v < 5) a0.set(v)
          else resolve()
        } catch (error) {
          reject(error)
        }
      }, `${name}.loop`).subscribe()

      computed(() => {
        try {
          logs.push(a0() + ' ' + getTrace())
        } catch (error) {
          reject(error)
        }
      }, `${name}.log`).subscribe()
    }),
  )

  expect(logs).toEqual([
    `
0 ─log
 └─ a0`.trim(),
    `
2 ─log
 └─ a0
    └─ loop
       └─ a2
          └─ a1
             └─ a0`.trim(),
    `
4 ─log
 └─ a0
    └─ loop
       └─ a2
          └─ a1
             └─ a0
                └─ loop
                   └─ a2
                      └─ a1
                         └─ a0`.trim(),
  ])

  expect(context().pubs).toEqual([null])
  expect(context().subs.length).toBe(0)
})

test('extra .then levels from compiled async/await do not break context', async () => {
  const a = atom(0, 'extraThen.a')

  await new Promise<void>((done, fail) => {
    computed(async () => {
      try {
        const val = a()

        // simulate compiled async/await: wrap resolves, but the continuation
        // goes through extra .then() levels before reaching user code
        await Promise.resolve(wrap(sleep()))
          .then(() => {
            // extra .then level (compiled artifact)
            return undefined
          })
          .then(() => {
            // another extra .then level (compiled artifact)
            return undefined
          })
          .then(() => {
            // user code that needs the async context
            top() // should NOT throw "missing async stack"
            a.set(val + 1)
          })

        if (a() >= 2) done()
      } catch (error) {
        fail(error)
      }
    }, 'extraThen.loop').subscribe()
  })

  expect(a()).toBe(2)
})

test('types', () => {
  let onEvent = (cb?: (name: string) => void) => cb

  onEvent(
    wrap((value) => {
      expectTypeOf(value).toBeString()
    }),
  )

  let cbWithGeneric = <T extends string | number>(value: T): T => value
  let wrapWithGeneric = wrap(cbWithGeneric)

  let genericParams: Parameters<typeof wrapWithGeneric>

  expectTypeOf(genericParams!).toEqualTypeOf<[string | number]>()
})
