import { expect, test } from 'test'

import { withAsync } from '../async'
import { action, atom } from '../core'
import { withChangeHook } from '../mixins'
import { sleep } from '../utils'
import { wrap } from '.'
import { withRollback } from './transaction'

test('optimistic update', async () => {
  type List = Array<{ todo: string; done: boolean }>

  const add = action((todo: string) => {
    list.set((list) => [...list, { todo, done: false }])
  }, 'add')

  const updateList = action(async () => {
    // await fetch('...')
    throw new Error('test')
  }, 'updateList').extend(
    withAsync(),
    // handle errors for actions and call `rollback()`
    withRollback(),
  )

  const list = atom<List>([], 'list').extend(
    withChangeHook(updateList),
    // schedule state restoration for `rollback()` call
    withRollback(),
  )

  add('test')
  expect(list()).toEqual([{ todo: 'test', done: false }])
  await wrap(sleep())
  expect(list()).toEqual([])
})
