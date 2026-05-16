import {
  getReatomGlobal,
  type ReatomGlobalPackage,
  ReatomError,
} from '@reatom/core'
import {
  __root,
  atom,
  AtomCache,
  Ctx,
  LinkedListAtom,
  reatomLinkedList,
  withAssign,
  Atom,
  action,
  AtomProto,
  reatomBoolean,
  Action,
  toStringKey,
  random,
  BooleanAtom,
  AtomMut,
} from '@reatom/framework'
import { JSX } from '@reatom/jsx'
import {
  actionsStates,
  followingsMap,
  getId,
  historyStates,
  memo,
} from '../utils'
import { reatomFilters, Filter, Filters, FiltersModel } from './reatomFilters'
import { Lines, reatomLines } from './reatomLines'

const REATOM_DEVTOOLS_VERSION = '1000.14.1'

export type GraphLog = {
  id: string
  patch: AtomCache<any>
  style: Atom<JSX.CSSProperties>
  isVisible: Atom<boolean>
}

export type TimestampLog = {
  id: string
  patch: null
  style: null
  isVisible: null
}

export type GraphList = LinkedListAtom<
  [log?: GraphLog],
  GraphLog | TimestampLog,
  'id'
> & {
  snap: Action<[], void>
  el: AtomMut<null | JSX.Element>
}

export type GraphModel = {
  list: GraphList
  filters: FiltersModel
  lines: Lines
  isBottom: BooleanAtom
  redrawLines: Action
}

interface ReatomDevtoolsGraphGlobalState {
  stringStates: WeakMap<AtomCache, string>
}

declare global {
  interface ReatomGlobalPackages {
    '@reatom/devtools/Graph/reatomGraph': ReatomGlobalPackage<ReatomDevtoolsGraphGlobalState>
  }
}

let reatomGlobal = getReatomGlobal()
let reatomDevtoolsGraphPackage =
  reatomGlobal.packages['@reatom/devtools/Graph/reatomGraph']
if (reatomDevtoolsGraphPackage === undefined) {
  reatomDevtoolsGraphPackage = reatomGlobal.packages[
    '@reatom/devtools/Graph/reatomGraph'
  ] = {
    version: REATOM_DEVTOOLS_VERSION,
    state: { stringStates: new WeakMap() },
  }
} else if (reatomDevtoolsGraphPackage.version !== REATOM_DEVTOOLS_VERSION) {
  throw new ReatomError('package duplication')
}
let stringStates = reatomDevtoolsGraphPackage.state.stringStates

const isMatch = (
  get: <T>(target: Atom<T>) => T,
  patch: AtomCache,
  filter: Filter,
): boolean => {
  try {
    const { name: search, isAction } = patch.proto
    let { state } = patch
    if (isAction) {
      state = actionsStates.get(patch)
      if (state.length === 1) state = state[0]
    }

    const filterSearch = get(filter.search)

    if (!get(filter.active) || !filterSearch) return true

    let match = new RegExp(filterSearch, 'i').test(search!)

    if (match) {
      const stateSearchValue = get(filter.stateSearch)
      if (stateSearchValue) {
        let stringState = stringStates.get(patch)
        if (!stringState) {
          stringStates.set(
            patch,
            (stringState = toStringKey(state)
              .replace(/\[reatom .*?\]/g, `\n`)
              .toLowerCase()),
          )
        }
        match = stringState.includes(stateSearchValue)
      }
    }

    const type = get(filter.type)

    return (
      (type === 'filter' && match) ||
      (type === 'highlight' && match) ||
      (type === 'hide' && !match) ||
      (type === 'exclude' && !match)
    )
  } catch (error) {
    console.log(error)
    return false
  }
}

const reatomLog = (
  patch: AtomCache,
  filters: Filters,
  name: string,
): GraphLog => {
  const style = atom(
    memo((ctx) => {
      let background = 'none'
      for (const filter of [filters.search, ...ctx.spy(filters.list.array)]) {
        if (!isMatch((target) => ctx.spy(target), patch, filter)) {
          return { display: 'none', background: 'none' }
        }
        if (ctx.get(filter.type) === 'highlight') {
          background = `${ctx.spy(filter.color)}a0`
        }
      }

      return {
        display: 'flex',
        background,
      }
    }),
    `${name}.style`,
  )

  const isVisible = atom(
    (ctx) => ctx.spy(style).display !== 'none',
    `${name}.isVisible`,
  )

  return {
    id: getId(patch),
    patch,
    style,
    isVisible,
  }
}

export const reatomGraph = ({
  ctx,
  clientCtx,
}: {
  ctx: Ctx
  clientCtx: Ctx
}): GraphModel => {
  const name = '_ReatomDevtools.Graph'

  const isBottom = reatomBoolean(false, `${name}.isBottom`)

  const trackSize = action((ctx) => {
    const target = ctx.get(filters.size)
    let { size } = ctx.get(list)

    if (size <= target) return

    const scrollEl = ctx.get(list.el)!.parentElement!
    const removedCount = size - target
    let scrollTop = scrollEl.scrollTop
    for (let i = 0; i < removedCount; i++) {
      const child = ctx.get(list.el)!.children[i] as HTMLElement
      scrollTop -= child.offsetHeight
    }

    while (size > target) {
      const { head } = ctx.get(list)
      if (!head) return
      list.remove(ctx, head)
      size--
    }

    ctx.schedule(() => {
      scrollEl.scrollTop = scrollTop
    })
  }, `${name}.trackSize`)

  const list: GraphList = reatomLinkedList(
    {
      key: 'id',
      create(ctx, log?: GraphLog) {
        if (!log)
          return {
            id: `timestamp-${Date.now()}#${random()}`,
            patch: null,
            style: null,
            isVisible: null,
          }
        return log
      },
    },
    `${name}.list`,
  ).pipe(
    withAssign((target, name) => {
      const snapshot = action<Array<any>>('snapshot')
      const snap = action((ctx) => {
        snapshot(
          clientCtx,
          ctx
            .get(list.array)
            .filter(
              ({ patch, isVisible }) =>
                patch && isVisible && ctx.get(isVisible),
            )
            .map(({ patch }) => {
              if (!patch) return null
              const {
                proto: { name, isAction },
                state,
              } = patch

              if (isAction) {
                const calls = actionsStates.get(patch)!

                if (calls.length === 0) {
                  return { name }
                }

                if (calls.length === 1) {
                  const { payload, params } = calls[0]
                  return params.length === 1 && params[0] === payload
                    ? { name, payload }
                    : { name, payload, params }
                }

                return { name, calls }
              }

              return {
                name,
                state,
              }
            }),
        )
      }, `${name}.snap`)

      return {
        snap,
        el: atom<null | JSX.Element>(null, `${name}.el`),
      }
    }),
  )

  const lines = reatomLines(`${name}.lines`)
  list.clear.onCall(() => {
    followingsMap.clear()
    lines.clear(ctx)
  })

  const redrawLines = action(
    (ctx) => lines.redraw(ctx, null as any), // SVG reference would be passed in actual implementation
    `${name}.redrawLines`,
  )

  const filters = reatomFilters(
    {
      list,
      lines,
      redrawLines,
      initSize: 1000, // Default size
    },
    `${name}.filters`,
  )
  filters.size.onChange((ctx) => {
    list.batch(ctx, () => {
      trackSize(ctx)
    })
  })

  let lastTimestamp = 0

  const read = clientCtx.get((read) => read)
  clientCtx.subscribe(async (logs) => {
    // sort causes and insert only from this transaction
    const insertTargets = new Set<AtomCache>()
    const inits = new Map<AtomProto, AtomCache>()
    for (let i = 0; i < logs.length; i++) {
      const patch = logs[i]!

      insertTargets.add(patch)

      if (patch.proto.isAction) actionsStates.set(patch, patch.state.slice(0))
      else historyStates.add(patch)

      if (!read(patch.proto) && !inits.has(patch.proto)) {
        inits.set(patch.proto, patch)
      }
    }

    await null

    if (!ctx.get(filters.recording)) return

    let isTimeStampWritten =
      !ctx.get(filters.time) || lastTimestamp === Date.now()

    const create = (patch: AtomCache) => {
      if (
        inits.get(patch.proto) === patch ||
        (patch.proto.isAction && !actionsStates.get(patch)?.length)
      ) {
        return false
      }

      const historyState = historyStates.get(patch.proto) ?? []
      const prev = historyState[historyState.indexOf(patch) + 1]

      if (prev !== patch && (!prev || !Object.is(patch.state, prev.state))) {
        for (const filter of [filters.search, ...ctx.get(filters.list.array)]) {
          if (
            ctx.get(filter.type) === 'exclude' &&
            !isMatch((target) => ctx.get(target), patch, filter)
          ) {
            return
          }
        }

        if (!isTimeStampWritten) {
          lastTimestamp = Date.now()
          isTimeStampWritten = true
          list.create(ctx)
        }

        list.create(ctx, reatomLog(patch, filters, name))
      }
    }

    // fix the case when "cause" appears in the logs after it patch
    const insert = (patch: AtomCache) => {
      const cause = patch.cause!
      if (insertTargets.has(cause)) {
        if (cause.cause) insert(cause.cause)
        create(cause)
        insertTargets.delete(cause)
      }
      if (insertTargets.has(patch)) {
        create(patch)
        insertTargets.delete(patch)
      }
    }
    list.batch(ctx, () => {
      for (const patch of logs) {
        insert(patch)
      }
      trackSize(ctx)
    })
  })

  return {
    list,
    filters,
    lines,
    isBottom,
    redrawLines,
  }
}
