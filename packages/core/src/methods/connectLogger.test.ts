import { expect, test, vi } from 'test'

import { sleep, wrap } from '..'
import { atom, computed, EXTENSIONS, notify, withActions } from '../core'
import { connectLogger, log } from './connectLogger'
import { getStackTrace } from './getStackTrace'

test('calc deps graph', async () => {
  // Create atoms for a counter feature
  const counter = atom(0, 'counter').extend(
    withActions((target) => ({
      inc: () => target.set((s) => s + 1),
    })),
  )
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
─effect._subscribe
 └─ effect[#1]
    ├─ counter[#2]
    ├─ doubled[#3]
    │  └─ counter[#2]
    └─ isEven[#4]
       └─ counter[#2]`.slice(1),
  )

  counter.inc()
  await wrap(sleep())

  // prettier-ignore
  expect(stack).toBe(
`
─effect._subscribe
 └─ effect[#5]
    ├─ counter[#6]
    │  └─ counter.inc[#9]
    ├─ doubled[#7]
    │  └─ counter[#6]
    └─ isEven[#8]
       └─ counter[#6]`.slice(1),
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

  a.set(1)
  notify()

  // prettier-ignore
  expect(stack).toBe(
    // there should be NO ` ─ a[#20]` after the second `b[#18]`
    `
─effect._subscribe
 └─ effect[#16]
    └─ d[#17]
       ├─ b[#18]
       │  └─ a[#20]
       └─ c[#19]
          └─ b[#18]`.slice(1),
  )
})

test('connectLogger match', () => {
  const consoleSpy = vi
    .spyOn(console, 'groupCollapsed')
    .mockImplementation(() => {})
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'groupEnd').mockImplementation(() => {})

  connectLogger({
    match: (name) => name === 'allowed',
  })

  const allowed = atom(0, 'allowed')
  const blocked = atom(0, 'blocked')

  // remove the logger middleware to not interact with other tests
  EXTENSIONS.pop()

  allowed.subscribe(() => {})
  blocked.subscribe(() => {})

  allowed.set(1)
  blocked.set(1)
  notify()

  const logs = consoleSpy.mock.calls.map((call) => call[0])
  expect(logs.some((log) => String(log).includes('allowed'))).toBe(true)
  expect(logs.some((log) => String(log).includes('blocked'))).toBe(false)

  vi.restoreAllMocks()
})

test('log.state logs only when data changes', () => {
  vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {})
  vi.spyOn(console, 'groupEnd').mockImplementation(() => {})
  const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

  connectLogger()
  // remove the logger middleware to not interact with other tests
  EXTENSIONS.pop()
  log('test')
  notify()
  consoleSpy.mockClear()

  log.state('testKey', 1)
  notify()
  // one for the timestamp and one for the log
  expect(consoleSpy).toHaveBeenCalledTimes(1)

  log.state('testKey', 1)
  notify()
  expect(consoleSpy).toHaveBeenCalledTimes(1)

  log.state('testKey', 2)
  notify()
  expect(consoleSpy).toHaveBeenCalledTimes(2)

  log.state('testKey', 2)
  notify()
  expect(consoleSpy).toHaveBeenCalledTimes(2)

  log.state('differentKey', { value: 1 })
  notify()
  expect(consoleSpy).toHaveBeenCalledTimes(3)

  vi.restoreAllMocks()
})
