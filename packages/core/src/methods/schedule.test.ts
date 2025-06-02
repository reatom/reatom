import { expect, test } from 'test'

import { clearStack, context, notify } from '../core'
import { schedule } from './schedule'

test('no extra tick by schedule', async () => {
  clearStack()

  let isDoneSync = false
  context.start(() => {
    schedule(() => {
      console.log('schedule')
      return 'TEST schedule'
    }).then(() => (isDoneSync = true))
    notify()
  })
  await null
  expect(isDoneSync).toBe(true)

  let isDoneAsync = false
  context.start(() => {
    schedule(async () => {}).then(() => (isDoneAsync = true))
    notify()
  })
  await null
  await null
  expect(isDoneAsync).toBe(true)

  let isDoneAsyncInTr = false
  context.start(() => {
    schedule(async () => {}).then(() => (isDoneAsyncInTr = true))
    notify()
  })

  await null
  await null
  await null

  expect(isDoneAsyncInTr).toBe(true)
})
