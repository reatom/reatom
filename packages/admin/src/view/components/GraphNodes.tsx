import type { Admin } from '../../index'
import type { CauseGraph } from '../../types'
import {
  buttonGhost,
  colors,
  flex,
  flexCol,
  gap,
  mono,
  panelTitle,
  rounded,
} from '../styles'

export interface GraphNodesProps {
  admin: Admin
  graph: CauseGraph
}

export const GraphNodes = ({ admin, graph }: GraphNodesProps) => {
  const atoms = admin.store.getAtoms()
  const direction = admin.causeGraph.direction
  const path = () => admin.causeGraph.path()

  return (
    <div
      data-reatom-name="GraphNodes"
      css={`
        ${flex}
        ${flexCol}
        ${gap(2)}
        width: 100%;
      `}
    >
      <div
        css={`
          ${flex}
          ${gap(1)}
          align-items: center;
          flex-wrap: wrap;
        `}
      >
        <h3
          css={`
            ${panelTitle}
          `}
        >
          Graph nodes
        </h3>
        {(['ancestors', 'descendants', 'full'] as const).map((d) => (
          <button
            type="button"
            css={`
              ${buttonGhost}
              padding: 0.35rem 0.7rem;
              border-color: ${() =>
                direction() === d ? colors.accent : colors.borderStrong};
              background: ${() =>
                direction() === d ? colors.accentSoft : colors.bgElevated};
              color: ${() =>
                direction() === d ? colors.accent : colors.textMuted};
              font-size: 0.72rem;
              text-transform: capitalize;
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
            <button
              type="button"
              css={buttonGhost}
              on:click={() => {
                admin.store.selectFrame(node.frameId)
                admin.causeGraph.selectedRootId.set(node.frameId)
              }}
              style={{
                marginLeft: `${node.depth * 1.25}rem`,
              }}
            >
              <div
                css={`
                  display: grid;
                  gap: 0.35rem;
                  text-align: left;
                `}
              >
                <div
                  css={`
                    display: flex;
                    justify-content: space-between;
                    gap: 0.5rem;
                    align-items: center;
                    color: ${isRoot ? colors.accent : colors.text};
                  `}
                >
                  <strong>{name}</strong>
                  <span
                    css={`
                      ${rounded}
                      padding: 0.2rem 0.4rem;
                      border: 1px solid ${isRoot
                        ? colors.accent
                        : colors.borderStrong};
                      background: ${isRoot
                        ? colors.accentSoft
                        : colors.bgElevated};
                      color: ${isRoot ? colors.accent : colors.textMuted};
                      font-size: 0.7rem;
                    `}
                  >
                    #{node.frameId}
                  </span>
                </div>
                <div
                  css={`
                    ${mono}
                    color: ${colors.textSubtle};
                    font-size: 0.72rem;
                  `}
                >
                  depth {node.depth}
                  {isRoot ? ' · root' : ''}
                </div>
              </div>
            </button>
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
      {() => {
        const currentPath = path()
        return currentPath && currentPath.length > 0 ? (
          <div
            css={`
              display: grid;
              gap: 0.5rem;
            `}
          >
            <h4
              css={`
                ${panelTitle}
                font-size: 0.85rem;
              `}
            >
              Shortest path
            </h4>
            <div
              css={`
                display: flex;
                flex-wrap: wrap;
                gap: 0.45rem;
              `}
            >
              {currentPath.map((frameId) => (
                <span
                  css={`
                    ${rounded}
                    padding: 0.25rem 0.45rem;
                    border: 1px solid ${colors.borderStrong};
                    background: ${colors.bgElevated};
                    color: ${colors.textMuted};
                    font-size: 0.72rem;
                  `}
                >
                  #{frameId}
                </span>
              ))}
            </div>
          </div>
        ) : null
      }}
    </div>
  )
}
