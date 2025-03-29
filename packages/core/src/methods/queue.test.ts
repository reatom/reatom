import { clearStack, root } from '../core'
import { expect, test } from 'test'
import { notify, schedule } from './queues'

test('no extra tick by schedule', async () => {
  clearStack()

  let isDoneSync = false
  root.start(() => {
    schedule(() => {
      console.log('schedule')
      return 'TEST schedule'
    }).then(() => (isDoneSync = true))
    notify()
  })
  await null
  expect(isDoneSync).toBe(true)

  let isDoneAsync = false
  root.start(() => {
    schedule(async () => {}).then(() => (isDoneAsync = true))
    notify()
  })
  await null
  await null
  expect(isDoneAsync).toBe(true)

  let isDoneAsyncInTr = false
  root.start(() => {
    schedule(async () => {}).then(() => (isDoneAsyncInTr = true))
    notify()
  })

  await null
  await null
  await null

  expect(isDoneAsyncInTr).toBe(true)
})
