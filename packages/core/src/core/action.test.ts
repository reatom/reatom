import { expect, subscribe, test } from 'test'

import { getStackTrace } from '../methods'
import type { Frame } from './'
import { _read, action, atom, computed, notify, withMiddleware } from './'

test('action', () => {
  const name = 'action'
  const testAction = action((...params: any[]) => params, `${name}.testAction`)
  expect(testAction(1, 2, 3)).toEqual([1, 2, 3])
})

test('action cause stack', () => {
  const name = 'actionCauseStack'
  const getTrace = (frame?: Frame) =>
    getStackTrace(frame)
      .replaceAll(`${name}.`, '')
      .replace(/\[#\d*\]/g, '')
  const a1 = atom(0, `${name}.a1`)
  const a2 = computed(() => a1(), `${name}.a2`)
  const act = action((number: number) => {
    return a1.set(number)
  }, `${name}.act`)

  let logData
  const log = computed(() => {
    a2()
    logData = getTrace()
  }, 'log')
  log.subscribe()

  expect(logData).toBe('─log\n └─ a2\n    └─ a1')

  act(1)
  notify()

  expect(logData).toBe('─log\n └─ a2\n    └─ a1\n       └─ act')
  expect(getTrace(_read(log)!).replaceAll('\n', ' ')).toBe(
    '─log  └─ a2     └─ a1        └─ act',
  )
})

test('actionState', () => {
  const name = 'actionState'
  const act = action((a: number, b: number) => a + b, `${name}.act`)

  act(0, 1)
  act(1, 2)
  expect(_read(act)!.state).toEqual([
    { params: [0, 1], payload: 1 },
    { params: [1, 2], payload: 3 },
  ])

  notify()
  expect(_read(act)!.state).toEqual([])
})

test('no args', () => {
  const name = 'noArgs'
  let i = 0
  const act = action(() => ++i, `${name}.act`)

  act()
  act()
  expect(_read(act)!.state).toEqual([
    { params: [], payload: 1 },
    { params: [], payload: 2 },
  ])
})

test('subscribe', () => {
  const act = action((n = 0) => n, 'act')

  const sub = subscribe(act)
  expect(sub).toHaveBeenCalledTimes(0)

  act()
  notify()
  expect(sub).toHaveBeenCalledTimes(1)
  expect(sub).toHaveBeenCalledWith(0, [])

  act(1)
  notify()
  expect(sub).toHaveBeenCalledTimes(2)
  expect(sub).toHaveBeenCalledWith(1, [1])
})

action(() => 123).extend(
  withMiddleware(
    () =>
      (next, ...params) =>
        next(...params),
  ),
)
