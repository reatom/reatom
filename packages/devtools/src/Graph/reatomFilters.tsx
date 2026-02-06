import {
  parseAtoms,
  assign,
  Action,
  reatomBoolean,
  BooleanAtom,
} from '@reatom/framework'
import { h, hf, JSX, css } from '../jsx'
import { reatomZod, ZodAtomization } from '@reatom/npm-zod'
import { z } from 'zod'

import { Lines } from './reatomLines'
import { FiltersComponent } from './components'
import { GraphModel } from './reatomGraph'

export const Filter = z.object({
  search: z.string(),
  stateSearch: z.string(),
  exclude: z.string(),
  type: z.enum(['filter', 'hide', 'exclude', 'highlight']),
  color: z.string(),
  active: z.boolean(),
})
export type Filter = ZodAtomization<typeof Filter>
export type FilterJSON = z.infer<typeof Filter>

export const Filters = z.object({
  search: Filter,
  preview: z.boolean(),
  time: z.boolean(),
  folded: z.boolean(),
  size: z.number(),
  list: z.array(Filter),
})
export type Filters = ZodAtomization<typeof Filters>
export type FiltersJSON = z.infer<typeof Filters>

export type FiltersModel = Filters & {
  recording: BooleanAtom
  trackSize: Action
  element: JSX.Element
}

const DEFAULT_COLOR = '#BABACF'

const HIGHLIGHT_COLOR = '#e82020'

const initState: FiltersJSON = {
  search: {
    search: '',
    stateSearch: '',
    exclude: '',
    type: 'filter',
    color: HIGHLIGHT_COLOR,
    active: true,
  },
  preview: true,
  time: true,
  folded: true,
  size: 1000,
  list: [
    {
      search: `(^_)|(\._)`,
      stateSearch: '',
      exclude: '',
      type: 'hide',
      color: DEFAULT_COLOR,
      active: true,
    },
  ],
}
const version = 'v27'

export const reatomFilters = (
  {
    list,
    lines,
    redrawLines,
    initSize,
  }: {
    list: GraphModel['list']
    lines: Lines
    redrawLines: GraphModel['redrawLines']
    initSize: number
  },
  name: string,
): FiltersModel => {
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
