import type { Admin } from '../../index'
import type { AdminFrame } from '../../types'
import { card, colors, p, panelTitle } from '../styles'
import { EmptyStateCard } from './EmptyStateCard'
import { FrameDetail } from './FrameDetail'
import { HistoryPanel } from './HistoryPanel'

export interface InspectorPanelProps {
  admin: Admin
  frame: AdminFrame | null
}

export const InspectorPanel = ({ admin, frame }: InspectorPanelProps) => {
  if (!frame) {
    return (
      <EmptyStateCard
        title="Inspect any frame"
        description="Select an item in the activity feed to inspect structured state, causal links, and the recent history for that atom."
      />
    )
  }

  const atomName = admin.store.getAtoms().get(frame.atomId)?.name ?? frame.atomId

  return (
    <div
      data-reatom-name="InspectorPanel"
      css={`
        display: grid;
        gap: 1rem;
        align-content: start;
      `}
    >
      <FrameDetail
        admin={admin}
        frame={frame}
        atomName={atomName}
        onClose={() => admin.store.selectFrame(null)}
      />
      <section
        css={`
          ${card}
          ${p(3)}
          display: grid;
          gap: 0.85rem;
        `}
      >
        <h3
          css={`
            ${panelTitle}
          `}
        >
          Atom timeline
        </h3>
        <p
          css={`
            margin: 0;
            color: ${colors.textMuted};
            font-size: 0.8rem;
            line-height: 1.5;
          `}
        >
          Jump across previous frames for the same atom to understand how its
          state evolved during this debugging session.
        </p>
        <div
          css={`
            display: grid;
            gap: 0.5rem;
          `}
        >
          <HistoryPanel admin={admin} frame={frame} />
        </div>
      </section>
    </div>
  )
}
