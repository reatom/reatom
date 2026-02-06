import { GraphModel } from '../Graph/reatomGraph'
import { h, hf, type JSX } from '../jsx'

type GraphContainerProps = {
  graph: GraphModel
  svg: JSX.Element
}

export const GraphContainer = ({
  graph,
  svg,
}: GraphContainerProps) => {
  return (
    <section
      css={`
        height: 100%;
        max-height: 100%;
        display: flex;
        flex-direction: column;
        font-family: monospace;
        position: relative;
        padding-left: var(--lines);
      `}
    >
      {graph.filters.element}
      <div
        css={`
          overflow: auto;
          position: relative;
          margin-top: 2px;
        `}
        on:scroll={(ctx, e) => {
          const isBottomState =
            e.currentTarget.scrollHeight - e.currentTarget.scrollTop <
            e.currentTarget.clientHeight + 50
            graph.isBottom(ctx, isBottomState)
        }}
      >
        {svg}
        {graph.list.el}  
      </div>
    </section>
  )
}
