import { expect, test } from 'test'
import { action, atom } from '../core'
import { withChangeHook } from '../mixins'
import { wrap } from '.'
import { withAsync } from '../async'
import { sleep } from '../utils'
import { withRollback } from './transaction'

test('optimistic update', async () => {
  type List = Array<{ todo: string; done: boolean }>

  const add = action((todo: string) => {
    list((list) => [...list, { todo, done: false }])
  }, 'add')

  const updateList = action(async () => {
    if (true) throw new Error('test')
    await fetch('...')
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
