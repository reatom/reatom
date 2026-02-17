import type { Admin } from '../../index'
import type { CauseGraph } from '../../types'
import { colors, flex, flexCol, gap, rounded } from '../styles'

export interface GraphNodesProps {
  admin: Admin
  graph: CauseGraph
}

export const GraphNodes = ({ admin, graph }: GraphNodesProps) => {
  const atoms = admin.store.getAtoms()
  const direction = admin.causeGraph.direction

  return (
    <div
      css={`
        ${flex}
        ${flexCol}
        ${gap(2)}
        width: 100%;
      `}
    >
      <div
        css={`
          ${flex} ${gap(1)};
        `}
      >
        {(['ancestors', 'descendants', 'full'] as const).map((d) => (
          <button
            type="button"
            css={`
              padding: 0.25rem 0.5rem;
              border: 1px solid ${colors.border};
              background: ${() =>
                direction() === d ? colors.accent : colors.bg};
              color: ${colors.text};
              cursor: pointer;
              font-size: 0.75rem;
              ${rounded}
            `}
            on:click={() => direction.set(d)}
          >
            {d}
          </button>
        ))}
      </div>
      <div
        css={`
          ${flex}
          ${flexCol}
          ${gap(1)}
          font-family: monospace;
          font-size: 0.8rem;
        `}
      >
        {graph.nodes.map((node) => {
          const atom = atoms.get(node.atomId)
          const name = atom?.name ?? node.atomId
          const isRoot = node.frameId === graph.rootFrameId
          return (
            <div
              css={`
                padding: 0.25rem 0.5rem;
                background: ${isRoot ? colors.highlight : colors.surface};
                border: 1px solid ${colors.border};
                ${rounded}
                margin-left: ${node.depth * 1.5}rem;
              `}
            >
              {name} #{node.frameId}
              {isRoot && ' (root)'}
            </div>
          )
        })}
      </div>
      {graph.edges.length > 0 && (
        <div
          css={`
            font-size: 0.65rem;
            color: ${colors.textMuted};
          `}
        >
          {graph.edges.length} edge(s)
        </div>
      )}
    </div>
  )
}
