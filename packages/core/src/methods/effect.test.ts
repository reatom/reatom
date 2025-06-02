import { expect, test, vi } from 'test'

import { atom } from '../core'
import { withAbort } from '../mixins'
import { sleep } from '../utils'
import { abortVar } from './abort'
import { effect } from './effect'
import { wrap } from './wrap'

test('different types of abort', async () => {
  // TODO
  return
  abortVar.set('test')

  const a = atom(0)
  let e1Log = vi.fn()
  const e1 = effect(() => {
    a()
    e1Log('rerun')
    abortVar.subscribeAbort(e1Log)
  })
  let e2Log = vi.fn()
  const e2 = effect(() => {
    a()
    e2Log('rerun')
    abortVar.subscribeAbort(e2Log)
    abortVar.subscribeAbort(() => console.log('abort'))
  }).extend(withAbort())

  expect(e1Log).toBeCalledTimes(1)
  expect(e2Log).toBeCalledTimes(1)

  a.set((s) => s + 1)
  await wrap(sleep())
  expect(e1Log).toBeCalledTimes(2)
  expect(e2Log).toBeCalledTimes(3)
})
