import { h, hf, type JSX } from '../jsx'

type GraphContainerProps = {
  filters: any
  listEl: JSX.Element
  svg: JSX.Element
  isBottom: any
}

export const GraphContainer = ({
  filters,
  listEl,
  svg,
  isBottom,
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
      {filters.element}
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
          isBottom(ctx, isBottomState)
        }}
      >
        {svg}
        {listEl}
      </div>
    </section>
  )
}
