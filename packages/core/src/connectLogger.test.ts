import { expect, test } from 'test'
import { atom, computed } from './core'
import { getStackTrace } from './connectLogger'
import { sleep, wrap } from '.'

test('log deps graph', async () => {
  // Create atoms for a counter feature
  const counter = atom(0, 'counter').actions((target) => ({
    inc: () => target((s) => s + 1),
  }))
  const doubled = computed(() => counter() * 2, 'doubled')
  const isEven = computed(() => counter() % 2 === 0, 'isEven')

  let log = ''
  computed(() => {
    return `Count: ${counter()}, Doubled: ${doubled()}, Is Even: ${isEven()}`
  }, 'effect').subscribe(() => {
    log = getStackTrace()
  })

  // prettier-ignore
  expect(log).toBe(
`
─ effect._subscribe ─ effect[#1] ┬─ counter[#2]
                                 │
                                 ├─ doubled[#3] ─ counter[#2]
                                 │
                                 └─ isEven[#4] ─ counter[#2]
`.slice(1),
  )

  counter.inc()
  await wrap(sleep())
  // prettier-ignore
  expect(log).toBe(
`
─ effect._subscribe ─ effect[#5] ┬─ counter[#6] ─ counter.inc[#7]
                                 │
                                 ├─ doubled[#8] ─ counter[#6] ─ counter.inc[#7]
                                 │
                                 └─ isEven[#9] ─ counter[#6] ─ counter.inc[#7]
`.slice(1),
  )
})
