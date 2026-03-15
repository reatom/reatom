import { urlAtom } from '@reatom/core'

import type { Admin } from '../../index'
import type { AdminFrame } from '../../types'
import {
  card,
  colors,
  flex,
  flexCol,
  gap,
  mono,
  p,
  px,
  py,
  rounded,
  roundedSm,
  shadowSm,
  transitionBase,
} from '../styles'
import {
  formatTimestamp,
  getCompactFieldPreviews,
  getFramePresentation,
} from './framePresentation'

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
  const frames = admin.store.frames()
  const frameIndex = admin.store.frameIndex()
  const atom = atoms.get(frame.atomId)
  const presentation = getFramePresentation(frame, atom)
  const atomFrames = frames.filter((entry) => entry.atomId === frame.atomId)
  const currentAtomFramePosition =
    atomFrames.findIndex((entry) => entry.id === frame.id) + 1
  const atomErrorCount = atomFrames.filter((entry) => entry.error !== null)
    .length
  const firstAtomFrame = atomFrames[0] ?? frame
  const lastAtomFrame = atomFrames[atomFrames.length - 1] ?? frame
  const historyWindowEnd = Math.min(
    atomFrames.length,
    Math.max(currentAtomFramePosition + 5, 12),
  )
  const historyWindowStart = Math.max(0, historyWindowEnd - 12)
  const atomHistory = atomFrames.slice(historyWindowStart, historyWindowEnd)
  const stats = [
    { label: 'Frame kind', value: presentation.badgeLabel },
    { label: 'Frames for atom', value: String(atomFrames.length) },
    { label: 'Errors', value: String(atomErrorCount) },
    {
      label: 'Position',
      value: `${currentAtomFramePosition}/${atomFrames.length}`,
    },
    { label: 'First seen', value: formatTimestamp(firstAtomFrame.timestamp) },
    { label: 'Last seen', value: formatTimestamp(lastAtomFrame.timestamp) },
  ]

  return (
    <div
      data-reatom-name="FrameDetail"
      data-frame-kind={presentation.kind}
      css={`
        ${flex}
        ${flexCol}
        ${gap(2)}
        ${p(3)}
        ${rounded}
        background: linear-gradient(
          180deg,
          ${colors.surfaceElevated},
          rgba(42, 42, 62, 0.96)
        );
        border: 1px solid ${colors.border};
        ${shadowSm}
      `}
    >
      <div
        css={`
          ${flex}
          ${gap(2)}
          justify-content: space-between;
          align-items: center;
        `}
      >
        <div
          css={`
            ${flex}
            ${gap(1)}
            align-items: center;
            min-width: 0;
          `}
        >
          <span
            data-slot="kind"
            css={`
              ${roundedSm}
              ${px(1)}
              ${py(0)}
              flex-shrink: 0;
              background: ${presentation.kind === 'atom'
                ? colors.accentSoft
                : colors.surfaceSoft};
              color: ${presentation.kind === 'atom'
                ? colors.accent
                : colors.textMuted};
              text-transform: uppercase;
              letter-spacing: 0.08em;
              font-size: 0.6rem;
              font-weight: 700;
            `}
          >
            {presentation.badgeLabel}
          </span>
          <h3
            css={`
              margin: 0;
              min-width: 0;
              color: ${colors.text};
              font-size: 1rem;
              ${mono}
            `}
          >
            {atomName}
          </h3>
        </div>
        <button
          type="button"
          css={`
            ${px(2)}
            ${py(1)}
            ${roundedSm}
            ${transitionBase}
            border: 1px solid ${colors.border};
            background: rgba(30, 30, 46, 0.9);
            color: ${colors.text};
            cursor: pointer;
            &:hover {
              border-color: rgba(137, 180, 250, 0.4);
              color: ${colors.accent};
            }
            &:focus-visible {
              outline: 2px solid ${colors.accent};
              outline-offset: 2px;
            }
          `}
          on:click={onClose}
        >
          Close
        </button>
      </div>
      <div
        data-slot="meta"
        css={`
          ${card}
          ${rounded}
          ${px(2)}
          ${py(2)}
          display: grid;
          gap: 0.35rem;
          background: rgba(30, 30, 46, 0.72);
          font-size: 0.72rem;
          color: ${colors.textMuted};
        `}
      >
        <span data-frame-meta="id">Frame #{frame.id}</span>
        <span data-frame-meta="timestamp">
          {new Date(frame.timestamp).toISOString()}
        </span>
      </div>
      {presentation.hasError && presentation.errorText !== null && (
        <div
          data-frame-field="error"
          css={`
            ${card}
            ${rounded}
            ${p(2)}
            display: grid;
            gap: 0.5rem;
            background: ${colors.errorSoft};
            border-color: rgba(243, 139, 168, 0.4);
            color: ${colors.error};
          `}
        >
          <div
            css={`
              font-size: 0.68rem;
              letter-spacing: 0.08em;
              text-transform: uppercase;
              font-weight: 700;
            `}
          >
            Error
          </div>
          <pre
            data-frame-field-value
            css={`
              margin: 0;
              white-space: pre-wrap;
              word-break: break-word;
              font-size: 0.75rem;
              ${mono}
            `}
          >
            {presentation.errorText}
          </pre>
        </div>
      )}
      <div
        css={`
          display: grid;
          gap: 0.75rem;
        `}
      >
        {presentation.fields.map((field) => (
          <section
            data-frame-field={field.name}
            css={`
              ${card}
              ${rounded}
              ${p(2)}
              display: grid;
              gap: 0.5rem;
              background: rgba(30, 30, 46, 0.72);
            `}
          >
            <div
              css={`
                font-size: 0.68rem;
                letter-spacing: 0.08em;
                text-transform: uppercase;
                color: ${colors.textMuted};
                font-weight: 700;
              `}
            >
              {field.label}
            </div>
            <pre
              data-frame-field-value
              css={`
                margin: 0;
                white-space: pre-wrap;
                word-break: break-word;
                font-size: 0.75rem;
                color: ${colors.text};
                ${mono}
              `}
            >
              {field.text}
            </pre>
          </section>
        ))}
      </div>
      <details
        data-frame-section="stats"
        css={`
          ${card}
          ${rounded}
          overflow: hidden;
          background: rgba(30, 30, 46, 0.56);
          summary {
            ${transitionBase}
            list-style: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.75rem;
            padding: 0.9rem 1rem;
            color: ${colors.text};
            font-weight: 600;
          }
          summary::-webkit-details-marker {
            display: none;
          }
          summary::after {
            content: '▾';
            color: ${colors.textMuted};
            transform: rotate(-90deg);
            transition: transform 0.18s ease;
          }
          &[open] summary::after {
            transform: rotate(0deg);
          }
          &[open] summary {
            border-bottom: 1px solid rgba(69, 71, 90, 0.72);
          }
        `}
      >
        <summary>Stats</summary>
        <div
          css={`
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 0.75rem;
            padding: 1rem;
          `}
        >
          {stats.map((item) => (
            <div
              data-frame-stat={item.label}
              css={`
                ${roundedSm}
                ${p(2)}
                background: ${colors.surfaceSoft};
                border: 1px solid rgba(69, 71, 90, 0.72);
                display: grid;
                gap: 0.35rem;
              `}
            >
              <span
                css={`
                  font-size: 0.66rem;
                  text-transform: uppercase;
                  letter-spacing: 0.08em;
                  color: ${colors.textMuted};
                `}
              >
                {item.label}
              </span>
              <span
                css={`
                  font-size: 0.76rem;
                  color: ${colors.text};
                  ${mono}
                `}
              >
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </details>
      <details
        data-frame-section="atom-history"
        css={`
          ${card}
          ${rounded}
          overflow: hidden;
          background: rgba(30, 30, 46, 0.56);
          summary {
            ${transitionBase}
            list-style: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.75rem;
            padding: 0.9rem 1rem;
            color: ${colors.text};
            font-weight: 600;
          }
          summary::-webkit-details-marker {
            display: none;
          }
          summary::after {
            content: '▾';
            color: ${colors.textMuted};
            transform: rotate(-90deg);
            transition: transform 0.18s ease;
          }
          &[open] summary::after {
            transform: rotate(0deg);
          }
          &[open] summary {
            border-bottom: 1px solid rgba(69, 71, 90, 0.72);
          }
        `}
      >
        <summary>Atom history</summary>
        <div
          css={`
            display: grid;
            gap: 0.5rem;
            padding: 1rem;
          `}
        >
          {atomHistory.map((entry) => {
            const entryPresentation = getFramePresentation(
              entry,
              atoms.get(entry.atomId),
            )
            const entryPreviews = getCompactFieldPreviews(entryPresentation, 44)
            const isCurrent = entry.id === frame.id
            return (
              <button
                type="button"
                data-history-frame-id={entry.id}
                css={`
                  ${transitionBase}
                  ${roundedSm}
                  ${p(2)}
                  display: grid;
                  gap: 0.5rem;
                  text-align: left;
                  border: 1px solid
                    ${isCurrent
                      ? colors.accent
                      : entryPresentation.hasError
                        ? 'rgba(243, 139, 168, 0.36)'
                        : 'rgba(69, 71, 90, 0.72)'};
                  background: ${isCurrent
                    ? colors.accentSoft
                    : entryPresentation.hasError
                      ? colors.errorSoft
                      : colors.surfaceSoft};
                  color: ${colors.text};
                  cursor: pointer;
                  &:hover {
                    border-color: rgba(137, 180, 250, 0.44);
                  }
                  &:focus-visible {
                    outline: 2px solid ${colors.accent};
                    outline-offset: 2px;
                  }
                `}
                on:click={() => {
                  admin.store.selectedFrameId.set(entry.id)
                  admin.causeGraph.selectedRootId.set(entry.id)
                }}
              >
                <div
                  css={`
                    ${flex}
                    ${gap(2)}
                    justify-content: space-between;
                    align-items: center;
                  `}
                >
                  <span
                    css={`
                      font-size: 0.72rem;
                      font-weight: 600;
                      ${mono}
                    `}
                  >
                    #{entry.id}
                  </span>
                  <span
                    css={`
                      font-size: 0.68rem;
                      color: ${colors.textMuted};
                      ${mono}
                    `}
                  >
                    {formatTimestamp(entry.timestamp)}
                  </span>
                </div>
                <div
                  css={`
                    ${flex}
                    ${gap(1)}
                    flex-wrap: wrap;
                  `}
                >
                  {entryPreviews.map((preview) => (
                    <span
                      data-history-preview-field={preview.name}
                      css={`
                        ${roundedSm}
                        ${px(1)}
                        ${py(1)}
                        max-width: 100%;
                        background: rgba(30, 30, 46, 0.4);
                        border: 1px solid rgba(69, 71, 90, 0.5);
                        font-size: 0.66rem;
                        color: ${colors.textMuted};
                      `}
                    >
                      {preview.label}:{' '}
                      <span
                        css={`
                          color: ${colors.text};
                          ${mono}
                        `}
                      >
                        {preview.valueText}
                      </span>
                    </span>
                  ))}
                  {entryPresentation.hasError && (
                    <span
                      data-history-preview-field="error"
                      css={`
                        ${roundedSm}
                        ${px(1)}
                        ${py(1)}
                        background: rgba(243, 139, 168, 0.18);
                        border: 1px solid rgba(243, 139, 168, 0.36);
                        font-size: 0.66rem;
                        color: ${colors.error};
                      `}
                    >
                      Error
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </details>
      {frame.pubIds.length > 0 && (
        <div
          css={`
            ${card}
            ${rounded}
            ${p(2)}
            display: grid;
            gap: 0.75rem;
            background: rgba(30, 30, 46, 0.56);
          `}
        >
          <div
            css={`
              color: ${colors.textMuted};
              font-size: 0.68rem;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              font-weight: 700;
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
                    background: rgba(30, 30, 46, 0.9);
                    color: ${colors.accent};
                    cursor: pointer;
                    font-size: 0.75rem;
                    ${roundedSm}
                    ${transitionBase}
                    &:hover {
                      border-color: rgba(137, 180, 250, 0.4);
                      background: ${colors.accentSoft};
                    }
                    &:focus-visible {
                      outline: 2px solid ${colors.accent};
                      outline-offset: 2px;
                    }
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
          ${px(3)}
          ${py(2)}
          ${rounded}
          ${transitionBase}
          border: 1px solid rgba(137, 180, 250, 0.32);
          background: linear-gradient(
            180deg,
            rgba(137, 180, 250, 0.96),
            rgba(116, 199, 236, 0.88)
          );
          color: ${colors.bg};
          cursor: pointer;
          font-weight: 700;
          &:hover {
            transform: translateY(-1px);
            box-shadow: 0 14px 28px rgba(137, 180, 250, 0.28);
          }
          &:focus-visible {
            outline: 2px solid ${colors.accent};
            outline-offset: 2px;
          }
        `}
        on:click={() => urlAtom.go('/graph')}
      >
        Show in Graph
      </button>
    </div>
  )
}
