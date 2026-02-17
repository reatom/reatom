import type { AdminFrame } from '../../types'
import { colors, flex, gap, px, py, truncate } from '../styles'

export interface LogItemProps {
  frame: AdminFrame
  atomName: string
  isHighlighted: boolean
  isSelected: boolean
  onSelect: () => void
}

function formatTs(ts: number): string {
  const d = new Date(ts)
  return d.toTimeString().slice(0, 12)
}

function preview(value: unknown): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  const s = JSON.stringify(value)
  return s.length > 60 ? s.slice(0, 57) + '...' : s
}

export const LogItem = ({
  frame,
  atomName,
  isHighlighted,
  isSelected,
  onSelect,
}: LogItemProps) => {
  const hasError = frame.error !== null
  const content =
    frame.params !== undefined
      ? preview(frame.params)
      : frame.payload !== undefined
        ? preview(frame.payload)
        : preview(frame.state)

  return (
    <div
      data-frame-id={frame.id}
      role="button"
      tabindex={0}
      css={`
        ${flex}
        ${gap(2)}
        ${px(2)}
        ${py(1)}
        border-bottom: 1px solid ${colors.border};
        cursor: pointer;
        background: ${() =>
          isSelected
            ? colors.highlight
            : isHighlighted
              ? 'rgba(137,180,250,0.08)'
              : 'transparent'};
        color: ${hasError ? colors.error : colors.text};
      `}
      on:click={onSelect}
      on:keydown={(e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
    >
      <span
        css={`
          flex-shrink: 0;
          width: 4rem;
          font-size: 0.65rem;
          color: ${colors.textMuted};
        `}
      >
        {formatTs(frame.timestamp)}
      </span>
      <span
        css={`
          flex-shrink: 0;
          width: 8rem;
          ${truncate}
          font-weight: 500;
        `}
      >
        {atomName}
      </span>
      <span
        css={`
          flex: 1;
          min-width: 0;
          ${truncate}
          color: ${colors.textMuted};
        `}
      >
        {content}
      </span>
    </div>
  )
}
