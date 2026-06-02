import type { Atom, LLNode } from '@reatom/core'
import { action, atom, reatomLinkedList } from '@reatom/core'

export type ListElement = LLNode<Atom<string>>

export const list = reatomLinkedList(
  (init: string) => atom(init, `list#${init}`),
  'list',
)

export const moveDown = action((input: ListElement) => {
  const next = (input as unknown as Record<symbol, ListElement | null>)[
    list.LL_NEXT
  ]
  list.move(input, next)
}, 'moveDown')
export const moveUp = action((input: ListElement) => {
  const prev = (input as unknown as Record<symbol, ListElement | null>)[
    list.LL_PREV
  ]
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
