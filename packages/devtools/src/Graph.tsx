import {
  __root,
  atom,
  Ctx,
  reatomResource,
  withDataAtom,
  Atom,
  parseAtoms,
} from '@reatom/framework'
import { h, hf, ctx, JSX } from './jsx'
import { getColor } from './utils'
import { TimeStamp, LogItem, GraphContainer, GraphSVG } from './components'
import { reatomGraph } from './Graph/reatomGraph'

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

  const graph = reatomGraph({
    ctx,
    clientCtx,
  })
  graph.list.onChange((ctx) => {
    requestAnimationFrame(() => {
      if (ctx.get(graph.isBottom)) {
        el.parentElement!.scrollTop = el.parentElement!.scrollHeight
      }
    })
  })

  const view = graph.list.reatomMap((ctx, { id, patch, style }) => {
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
        filters={graph.filters}
        lines={graph.lines}
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
  graph.list.el(ctx, el)

  const listHeight = reatomResource(async (ctx) => {
    ctx.spy(graph.list)
    ctx.spy(width)
    ctx.spy(height)
    parseAtoms(ctx, graph.filters)
    await ctx.schedule(() => new Promise((r) => requestAnimationFrame(r)))
    // TODO: the second one is required in Firefox
    await ctx.schedule(() => new Promise((r) => requestAnimationFrame(r)))
    return `${el.getBoundingClientRect().height}px`
  }, `${name}.listHeight`).pipe(withDataAtom('0px')).dataAtom

  const svgRef = (
    <GraphSVG listHeight={listHeight} lines={graph.lines} />
  ) as SVGSVGElement

  return <GraphContainer graph={graph} svg={svgRef} />
}
