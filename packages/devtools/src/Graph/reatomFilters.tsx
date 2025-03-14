import {
  parseAtoms,
  assign,
  LinkedListAtom,
  Action,
  atom,
  action,
  reatomBoolean,
} from '@reatom/framework'
import { h, hf, JSX, css } from '../jsx'
import { reatomZod, ZodAtomization } from '@reatom/npm-zod'
import { z } from 'zod'

import { Lines } from './reatomLines'
import { FiltersComponent } from './components'
import { GraphList } from '../Graph'

export const Filter = z.object({
  search: z.string(),
  stateSearch: z.string(),
  type: z.enum(['filter', 'hide', 'highlight']),
  color: z.string(),
  active: z.boolean(),
})
export type Filter = ZodAtomization<typeof Filter>
export type FilterJSON = z.infer<typeof Filter>

export const Filters = z.object({
  search: Filter,
  exclude: z.string(),
  preview: z.boolean(),
  time: z.boolean(),
  folded: z.boolean(),
  size: z.number(),
  list: z.array(Filter),
})
export type Filters = ZodAtomization<typeof Filters>
export type FiltersJSON = z.infer<typeof Filters>

const DEFAULT_COLOR = '#BABACF'

const HIGHLIGHT_COLOR = '#e82020'

const initState: FiltersJSON = {
  search: {
    search: '',
    stateSearch: '',
    type: 'filter',
    color: HIGHLIGHT_COLOR,
    active: true,
  },
  preview: true,
  time: true,
  folded: true,
  exclude: '',
  size: 1000,
  list: [
    {
      search: `(^_)|(\._)`,
      stateSearch: '',
      type: 'hide',
      color: DEFAULT_COLOR,
      active: true,
    },
  ],
}
const version = 'v26'

export const reatomFilters = (
  {
    list,
    lines,
    redrawLines,
    initSize,
  }: {
    list: GraphList
    lines: Lines
    redrawLines: Action<[], void>
    initSize: number
  },
  name: string,
) => {
  const KEY = name + version

  try {
    const snapshotString = localStorage.getItem(KEY)
    const snapshotObject = snapshotString && JSON.parse(snapshotString)
    var snapshot: undefined | FiltersJSON = Filters.parse(
      snapshotObject || { ...initState, size: initSize },
    )
  } catch {
    snapshot = { ...initState, size: initSize }
  }

  const filters = reatomZod(Filters, {
    initState: snapshot,
    sync: (ctx) => {
      redrawLines(ctx)
      ctx.schedule(() => {
        localStorage.setItem(KEY, JSON.stringify(parseAtoms(ctx, filters)))
      })
    },
    name: `${name}.filters`,
  })

  const recording = reatomBoolean(true, `${name}.recording`)

  const trackSize = action((ctx) => {
    const target = ctx.get(filters.size)
    let { size } = ctx.get(list)

    if (size <= target) return

    const scrollEl = list.el.parentElement!
    const removedCount = size - target
    let scrollTop = scrollEl.scrollTop
    for (let i = 0; i < removedCount; i++) {
      const child = list.el.children[i] as HTMLElement
      scrollTop -= child.offsetHeight
    }

    list.batch(ctx, () => {
      while (size > target) {
        const { head } = ctx.get(list)
        if (!head) return
        list.remove(ctx, head)
        size--
      }
    })

    ctx.schedule(() => {
      scrollEl.scrollTop = scrollTop
    })
  }, `${name}.trackSize`)

  list.onChange(trackSize)
  filters.size.onChange(trackSize)

  return assign(filters, {
    recording,
    element: (
      <FiltersComponent
        name={`${name}.FiltersComponent`}
        filters={filters}
        lines={lines}
        list={list}
        recording={recording}
        HIGHLIGHT_COLOR={HIGHLIGHT_COLOR}
      />
    ),
  })
}
