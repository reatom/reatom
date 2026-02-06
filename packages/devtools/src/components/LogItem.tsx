import {
  Atom,
  AtomCache,
  Ctx,
  CtxSpy,
  action,
  atom,
  AtomMut,
  AtomProto,
  isShallowEqual,
  reatomBoolean,
} from '@reatom/framework'
import { h, hf, JSX } from '../jsx'
import { actionsStates, followingsMap, getId } from '../utils'
import { Stack } from './Stack'
import { ObservableHQ } from '../ObservableHQ'
import { Filter, Filters } from '../Graph/reatomFilters'
import { toStringKey } from '@reatom/framework'
import { Lines } from '../Graph/reatomLines'

// separate action for naming purpose, CALL ONLY WITH `clientCtx`
export const update = action((ctx, proto: AtomProto, value: string) => {
  ctx.get((read, actualize) => {
    actualize!(ctx, proto, (patchCtx: Ctx, patch: AtomCache) => {
      patch.state = JSON.parse(value)
    })
  })
}, 'ReatomDevtools.update')

type LogItemProps = {
  id: string
  patch: AtomCache
  style: Atom<JSX.CSSProperties>
  clientCtx: Ctx
  getColor: (patch: AtomCache) => string
  filters: Filters
  lines: Lines
  svgRef: SVGSVGElement
  name: string
}

export const LogItem = ({
  id,
  patch,
  style,
  clientCtx,
  getColor,
  filters,
  lines,
  svgRef,
  name,
}: LogItemProps) => {
  followingsMap.add(patch)
  const { isAction, name: atomName } = patch.proto
  let { state } = patch
  if (isAction) {
    state = actionsStates.get(patch)
    if (state.length === 1) state = state[0]
  }
  const color = getColor(patch)

  const handleChain = (ctx: Ctx) => {
    lines.highlight(ctx, { svg: svgRef, patch })
  }

  const preview = reatomBoolean(false, `${name}._Log.preview`)

  const showStack = reatomBoolean(false, `${name}._Log.showStack`)

  const element = (
    <li
      id={id}
      style={style}
      css={`
        flex-wrap: wrap;
        align-items: center;
        font-size: 14px;
        border-bottom: 1px solid lightgray;
        padding: 5px 0;
        &::marker {
          content: '';
        }
      `}
    >
      <button
        title="Toggle stack trace"
        aria-label="Toggle visibility of atom's stack trace"
        role="switch"
        aria-pressed={showStack}
        on:click={(ctx, e) => {
          e.currentTarget.innerText = showStack.toggle(ctx) ? 'X' : '?'
        }}
        css={`
          border: none;
          background: none;
          margin-left: 10px;
        `}
      >
        ?
      </button>
      <button
        title="Highlight cause lines"
        aria-label="Visualize causal relationships between atoms"
        on:click={handleChain}
        css={`
          border: none;
          background: none;
        `}
      >
        &
      </button>
      <label
        title="Toggle inspector"
        style:color={color}
        css={`
          cursor: pointer;
          margin-right: 10px;
        `}
      >
        <input
          type="checkbox"
          css={`
            position: absolute;
            opacity: 0;
            cursor: pointer;
            height: 0;
            width: 0;
          `}
          model:checked={preview}
          aria-label={`Toggle inspector for ${atomName}`}
        />
        {atomName}
      </label>
      {atom((ctx) => (ctx.spy(showStack) ? <Stack patch={patch} /> : null))}
      {atom((ctx) =>
        ctx.spy(filters.preview) || ctx.spy(preview) ? (
          <ObservableHQ
            snapshot={
              // do not show extra info for "identity" actions
              isAction &&
              state.params.length === 1 &&
              Object.is(state.params[0], state.payload)
                ? state.payload
                : state
            }
            update={
              isAction ? undefined : update.bind(null, clientCtx, patch.proto)
            }
            patch={isAction ? undefined : patch}
          />
        ) : (
          <span />
        ),
      )}
    </li>
  )

  return Object.assign(element, { styleAtom: style })
}
