import type { Admin } from '../../index'
import { GraphNodes } from '../components/GraphNodes'
import { colors, flex, flexCol } from '../styles'

export interface CauseGraphScreenProps {
  admin: Admin
}

export const CauseGraphScreen = ({ admin }: CauseGraphScreenProps) => {
  const graph = () => admin.causeGraph.graph()
  const selectedFrameId = () => admin.store.selectedFrameId()

  return (
    <div
      css={`
        ${flex}
        ${flexCol}
        height: 100%;
        padding: 1rem;
        color: ${colors.text};
      `}
    >
      {() => {
        const g = graph()
        const selId = selectedFrameId()
        if (!g && !selId) {
          return (
            <p
              css={`
                color: ${colors.textMuted};
              `}
            >
              Select a frame in the Log view to see its cause graph.
            </p>
          )
        }
        if (!g) {
          return (
            <p
              css={`
                color: ${colors.textMuted};
              `}
            >
              No graph data for selected frame.
            </p>
          )
        }
        return <GraphNodes admin={admin} graph={g} />
      }}
    </div>
  )
}
