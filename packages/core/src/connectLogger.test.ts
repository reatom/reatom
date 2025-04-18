import { expect, test } from 'test'
import { atom, computed, notify } from './core'
import { getStackTrace } from './connectLogger'
import { sleep, wrap } from '.'

test('calc deps graph', async () => {
  // Create atoms for a counter feature
  const counter = atom(0, 'counter').actions((target) => ({
    inc: () => target((s) => s + 1),
  }))
  const doubled = computed(() => counter() * 2, 'doubled')
  const isEven = computed(() => counter() % 2 === 0, 'isEven')

  let stack = ''
  computed(() => {
    return `Count: ${counter()}, Doubled: ${doubled()}, Is Even: ${isEven()}`
  }, 'effect').subscribe(() => {
    stack = getStackTrace()
  })

  // prettier-ignore
  expect(stack).toBe(
`
─ effect._subscribe ─ effect[#1] ┬─ counter[#2]
                                 │
                                 ├─ doubled[#3] ─ counter[#2]
                                 │
                                 └─ isEven[#4] ─ counter[#2]`.slice(1),
  )

  counter.inc()
  await wrap(sleep())
  // prettier-ignore
  expect(stack).toBe(
`
─ effect._subscribe ─ effect[#5] ┬─ counter[#6] ─ counter.inc[#9]
                                 │
                                 ├─ doubled[#7] ─ counter[#6]
                                 │
                                 └─ isEven[#8] ─ counter[#6]`.slice(1),
  )
})

test('BFS log simplification', () => {
  const a = atom(0, 'a')
  const b = computed(() => a(), 'b')
  const c = computed(() => b(), 'c')
  const d = computed(() => b() + c(), 'd')

  let stack = ''
  computed(() => {
    return d()
  }, 'effect').subscribe(() => {
    stack = getStackTrace()
  })

  a(1)
  notify()

  expect(stack).toBe(
    // there should be NO ` ─ a[#20]` after the second `b[#18]`
    `
─ effect._subscribe ─ effect[#16] ─ d[#17] ┬─ b[#18] ─ a[#20]
                                           │
                                           └─ c[#19] ─ b[#18]`.slice(1),
  )
})
