import {
  __root,
  atom,
  AtomCache,
  Ctx,
  LinkedListAtom,
  reatomLinkedList,
  reatomResource,
  withDataAtom,
  Atom,
  parseAtoms,
  action,
  AtomProto,
  reatomBoolean,
  withAssign,
  Action,
  LinkedListDerivedAtom,
  LLNode,
  toStringKey,
} from '@reatom/framework'
import { h, hf, ctx, JSX } from './jsx'
import {
  actionsStates,
  followingsMap,
  getColor,
  getId,
  historyStates,
  memo,
} from './utils'
import { Filter, reatomFilters } from './Graph/reatomFilters'
import { reatomLines } from './Graph/reatomLines'
import { TimeStamp, LogItem, GraphContainer, GraphSVG } from './components'

export type GraphList = LinkedListAtom<
  [patch: AtomCache<any> | null],
  {
    id: string
    patch?: AtomCache<any>
    style?: Atom<JSX.CSSProperties>
  },
  'id'
> & {
  snap: Action<[], void>
  view: LinkedListDerivedAtom<any, LLNode<JSX.Element>>
  el: JSX.Element
}

export type Props = {
  clientCtx: Ctx
  getColor: typeof getColor
  width: Atom<string>
  height: Atom<string>
  initSize: number
}

export const Graph = ({
  clientCtx,
  getColor,
  width,
  height,
  initSize,
}: Props) => {
  const name = '_ReatomDevtools.Graph'

  const isBottom = reatomBoolean(false, `${name}.isBottom`)

  const list: GraphList = reatomLinkedList(
    {
      key: 'id',
      create(
        ctx,
        patch: null | AtomCache,
      ): {
        id: string
        patch?: AtomCache<any>
        style?: Atom<JSX.CSSProperties>
      } {
        if (!patch) return { id: `timestamp-${Date.now() + Math.random()}` }

        const { isAction, name: atomName } = patch.proto
        let { state } = patch
        if (isAction) {
          state = actionsStates.get(patch)
          if (state.length === 1) state = state[0]
        }

        let stringState: string

        const style = atom(
          memo((ctx) => {
            if (!ctx || typeof ctx.spy !== 'function')
              return { display: 'none' }

            const state: JSX.CSSProperties = {
              display: 'flex',
              background: 'none',
            }

            const exclude = ctx.spy(filters.exclude)

            if (
              exclude &&
              exclude !== '' &&
              typeof exclude === 'string' &&
              new RegExp(exclude, 'i').test(atomName!)
            ) {
              state.display = 'none'
              return state
            }

            const applyFilter = ({
              search,
              stateSearch,
              active,
              type,
              color,
            }: Filter) => {
              if (!ctx.spy(active)) return

              const _type = ctx.spy(type)

              try {
                const searchValue = ctx.spy(search)

                const result =
                  !searchValue || new RegExp(searchValue, 'i').test(atomName!)

                const stateSearchValue = ctx.spy(stateSearch)
                if (stateSearchValue) {
                  stringState ??= toStringKey(patch.state)
                    .replace(/\[reatom .*?\]/g, `\n`)
                    .toLowerCase()

                  if (!stringState.includes(stateSearchValue)) {
                    state.display = 'none'
                  }
                }

                if (_type === 'filter' && !result) {
                  state.display = 'none'
                }
                if (_type === 'hide' && result) {
                  state.display = 'none'
                }

                if (_type === 'highlight' && result) {
                  state.background = `${ctx.spy(color)}a0`
                }
              } catch {}
            }

            applyFilter(filters.search)
            if (state.display === 'none') return state

            const filtersList = ctx.spy(filters.list.array) as Filter[]
            for (let i = 0; i < filtersList.length; i++) {
              applyFilter(filtersList[i]!)
              if (state.display === 'none') return state
            }

            return state
          }),
          `${name}._Log.style`,
        )

        return { id: getId(patch), patch, style }
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
              ({ patch, style }) =>
                patch && style && ctx.get(style).display !== 'none',
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

      const view = target.reatomMap((ctx, { id, patch, style }) => {
        if (!patch) {
          const nodesToWatch = atom(new Array<Atom>())
          return <TimeStamp nodesToWatch={nodesToWatch} />
        }

        return (
          <LogItem
            id={id}
            patch={patch}
            style={style!}
            clientCtx={clientCtx}
            getColor={getColor}
            filters={filters}
            lines={lines}
            svgRef={svgRef}
            name={name}
          />
        )
      }, `${name}.view`)

      const el = (
        <ul
          css={`
            padding: 0 10px;
            content-visibility: auto;
          `}
        >
          {view}
        </ul>
      )

      return {
        snap,
        view,
        el,
      }
    }),
  )

  const lines = reatomLines(`${name}.lines`)
  list.clear.onCall(() => {
    followingsMap.clear()
    lines.clear(ctx)
  })

  const redrawLines = action(
    (ctx) => lines.redraw(ctx, svgRef),
    `${name}.redrawLines`,
  )

  const filters = reatomFilters(
    {
      list,
      lines,
      redrawLines,
      initSize,
    },
    `${name}.filters`,
  )

  const listHeight = reatomResource(async (ctx) => {
    ctx.spy(list)
    ctx.spy(width)
    ctx.spy(height)
    parseAtoms(ctx, filters)
    await ctx.schedule(() => new Promise((r) => requestAnimationFrame(r)))
    // TODO: the second one is required in Firefox
    await ctx.schedule(() => new Promise((r) => requestAnimationFrame(r)))
    return `${list.el.getBoundingClientRect().height}px`
  }, `${name}.listHeight`).pipe(withDataAtom('0px')).dataAtom

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

    const isPass = (patch: AtomCache): boolean => {
      if (
        inits.get(patch.proto) === patch ||
        (patch.proto.isAction && !actionsStates.get(patch)?.length)
      ) {
        return false
      }

      const historyState = historyStates.get(patch.proto) ?? []
      const prev = historyState[historyState.indexOf(patch) + 1]
      const exclude = ctx.get(filters.exclude)

      const result =
        prev !== patch &&
        (!prev || !Object.is(patch.state, prev.state)) &&
        (!exclude || !new RegExp(exclude, 'i').test(patch.proto.name!))

      if (result && !isTimeStampWritten) {
        lastTimestamp = Date.now()
        isTimeStampWritten = true
        list.create(ctx, null)
      }

      return result
    }

    // fix the case when "cause" appears in the logs after it patch
    const insert = (patch: AtomCache) => {
      const cause = patch.cause!
      if (insertTargets.has(cause)) {
        if (cause.cause) insert(cause.cause)
        if (isPass(cause)) list.create(ctx, cause)
        insertTargets.delete(cause)
      }
      if (insertTargets.has(patch)) {
        if (isPass(patch)) list.create(ctx, patch)
        insertTargets.delete(patch)
      }
    }
    list.batch(ctx, () => {
      for (const patch of logs) {
        insert(patch)
      }

      requestAnimationFrame(() => {
        if (ctx.get(isBottom)) {
          list.el.parentElement!.scrollTop = list.el.parentElement!.scrollHeight
        }
      })
    })
  })

  const svgRef = (
    <GraphSVG listHeight={listHeight} lines={lines} />
  ) as SVGSVGElement

  return (
    <GraphContainer
      filters={filters}
      isBottom={isBottom}
      svg={svgRef}
      listEl={list.el}
    />
  )
}
