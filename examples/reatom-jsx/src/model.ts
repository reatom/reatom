import type { Atom, LLNode } from '@reatom/core'
import {
  action,
  atom,
  LL_NEXT,
  LL_PREV,
  reatomLinkedList,
  withChangeHook,
} from '@reatom/core'

export type ListElement = LLNode<Atom<string>>

export const list = reatomLinkedList(
  (init: string) => atom(init, `list#${init}`),
  'list',
).extend(
  withChangeHook((state) => {
    let prev = null
    let next = state.head
    let path = ''

    while (next) {
      if (prev !== next[LL_PREV]) {
        throw new Error(`List collision: ${path}`)
      }
      path += `${next.name} - `
      prev = next
      next = next[LL_NEXT]
    }
  }),
)

export const moveDown = action((input: ListElement) => {
  list.move(input, input[LL_NEXT])
}, 'moveDown')
export const moveUp = action((input: ListElement) => {
  let prev = input[LL_PREV]
  if (prev) list.move(prev, input)
}, 'moveUp')

export const count = atom(10, 'count')

export const add = action(() => {
  list.batch(() => {
    let target = count()
    let i = 0
    while (i++ < target) {
      list.create(i.toString())
    }
  })

  count.set(10)
}, 'add')
