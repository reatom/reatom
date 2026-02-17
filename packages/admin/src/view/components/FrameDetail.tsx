import { urlAtom } from '@reatom/core'

import type { Admin } from '../../index'
import type { AdminFrame } from '../../types'
import { colors, flex, flexCol, gap, p, rounded } from '../styles'

export interface FrameDetailProps {
  admin: Admin
  frame: AdminFrame
  atomName: string
  onClose: () => void
}

export const FrameDetail = ({
  admin,
  frame,
  atomName,
  onClose,
}: FrameDetailProps) => {
  const atoms = admin.store.getAtoms()
  const frameIndex = admin.store.frameIndex()

  return (
    <div
      css={`
        ${flex}
        ${flexCol}
        ${gap(2)}
        ${p(2)}
        background: ${colors.surface};
        border: 1px solid ${colors.border};
        ${rounded}
      `}
    >
      <div
        css={`
          ${flex} ${gap(2)};
          justify-content: space-between;
          align-items: center;
        `}
      >
        <h3
          css={`
            margin: 0;
            color: ${colors.text};
          `}
        >
          {atomName}
        </h3>
        <button
          type="button"
          css={`
            padding: 0.25rem 0.5rem;
            border: 1px solid ${colors.border};
            background: ${colors.bg};
            color: ${colors.text};
            cursor: pointer;
            ${rounded}
          `}
          on:click={onClose}
        >
          Close
        </button>
      </div>
      <div
        css={`
          font-size: 0.75rem;
          color: ${colors.textMuted};
        `}
      >
        ID: {frame.id} | {new Date(frame.timestamp).toISOString()}
      </div>
      {frame.error !== null && (
        <div
          css={`
            color: ${colors.error};
            font-family: monospace;
            white-space: pre-wrap;
          `}
        >
          {String(frame.error)}
        </div>
      )}
      <div
        css={`
          font-family: monospace;
          font-size: 0.75rem;
          white-space: pre-wrap;
          word-break: break-all;
        `}
      >
        {JSON.stringify(
          { state: frame.state, params: frame.params, payload: frame.payload },
          null,
          2,
        )}
      </div>
      {frame.pubIds.length > 0 && (
        <div>
          <div
            css={`
              color: ${colors.textMuted};
              font-size: 0.75rem;
              margin-bottom: 0.25rem;
            `}
          >
            Cause chain:
          </div>
          <div
            css={`
              ${flex} ${gap(1)};
              flex-wrap: wrap;
            `}
          >
            {frame.pubIds.map((pubId) => {
              const pubFrame = frameIndex.get(pubId)
              const pubName = pubFrame
                ? (atoms.get(pubFrame.atomId)?.name ?? pubFrame.atomId)
                : `#${pubId}`
              return (
                <button
                  type="button"
                  css={`
                    padding: 0.25rem 0.5rem;
                    border: 1px solid ${colors.border};
                    background: ${colors.bg};
                    color: ${colors.accent};
                    cursor: pointer;
                    font-size: 0.75rem;
                    ${rounded}
                  `}
                  on:click={() => {
                    if (pubFrame) {
                      admin.store.selectedFrameId.set(pubId)
                      admin.causeGraph.selectedRootId.set(pubId)
                    }
                  }}
                >
                  {pubName}
                </button>
              )
            })}
          </div>
        </div>
      )}
      <button
        type="button"
        css={`
          padding: 0.5rem 1rem;
          border: 1px solid ${colors.border};
          background: ${colors.accent};
          color: ${colors.bg};
          cursor: pointer;
          ${rounded}
        `}
        on:click={() => urlAtom.go('/graph')}
      >
        Show in Graph
      </button>
    </div>
  )
}
