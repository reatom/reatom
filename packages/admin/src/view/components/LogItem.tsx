import type { AdminAtom, AdminFrame } from '../../types'
import {
  colors,
  flex,
  flexCol,
  gap,
  mono,
  px,
  py,
  rounded,
  roundedSm,
  shadowSm,
  transitionBase,
  truncate,
} from '../styles'
import {
  formatTimestamp,
  getCompactFieldPreviews,
  getFramePresentation,
} from './framePresentation'

export interface LogItemProps {
  frame: AdminFrame
  atom: AdminAtom | undefined
  isHighlighted: boolean
  isSelected: boolean
  onSelect: () => void
}

export const LogItem = ({
  frame,
  atom,
  isHighlighted,
  isSelected,
  onSelect,
}: LogItemProps) => {
  const atomName = atom?.name ?? frame.atomId
  const presentation = getFramePresentation(frame, atom)
  const previewFields = getCompactFieldPreviews(presentation, 72)

  return (
    <div
      data-reatom-name="LogItem"
      data-frame-id={frame.id}
      data-frame-kind={presentation.kind}
      role="button"
      tabindex={0}
      css={`
        ${flex}
        ${flexCol}
        ${gap(1)}
        ${px(3)}
        ${py(2)}
        ${rounded}
        ${transitionBase}
        cursor: pointer;
        border: 1px solid
          ${() =>
            isSelected
              ? colors.accent
              : presentation.hasError
                ? 'rgba(243, 139, 168, 0.4)'
                : isHighlighted
                  ? 'rgba(137, 180, 250, 0.3)'
                  : 'rgba(69, 71, 90, 0.72)'};
        background: ${() =>
          isSelected
            ? 'linear-gradient(180deg, rgba(137, 180, 250, 0.22), rgba(137, 180, 250, 0.14))'
            : isHighlighted
              ? 'linear-gradient(180deg, rgba(137, 180, 250, 0.1), rgba(137, 180, 250, 0.04))'
              : presentation.hasError
                ? 'linear-gradient(180deg, rgba(243, 139, 168, 0.1), rgba(243, 139, 168, 0.04))'
                : colors.surface};
        color: ${colors.text};
        box-shadow: ${() => (isSelected ? '0 12px 28px rgba(0, 0, 0, 0.24)' : 'none')};
        &:hover {
          transform: translateY(-1px);
          ${shadowSm}
          border-color: ${presentation.hasError
            ? 'rgba(243, 139, 168, 0.56)'
            : 'rgba(137, 180, 250, 0.42)'};
        }
        &:focus-visible {
          outline: 2px solid ${colors.accent};
          outline-offset: 2px;
        }
      `}
      on:click={onSelect}
      on:keydown={(e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
    >
      <div
        css={`
          ${flex}
          ${gap(2)}
          justify-content: space-between;
          align-items: flex-start;
          min-width: 0;
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
              font-size: 0.58rem;
              font-weight: 700;
            `}
          >
            {presentation.badgeLabel}
          </span>
          <span
            data-slot="name"
            css={`
              min-width: 0;
              font-size: 0.84rem;
              font-weight: 600;
              ${truncate}
            `}
          >
            {atomName}
          </span>
        </div>
        <span
          data-slot="timestamp"
          css={`
            flex-shrink: 0;
            font-size: 0.68rem;
            color: ${colors.textMuted};
            ${mono}
          `}
        >
          {formatTimestamp(frame.timestamp)}
        </span>
      </div>
      <div
        css={`
          ${flex}
          ${gap(1)}
          flex-wrap: wrap;
          min-width: 0;
        `}
      >
        {previewFields.map((field) => (
          <div
            data-log-preview-field={field.name}
            css={`
              ${flex}
              ${gap(1)}
              align-items: center;
              min-width: 0;
              max-width: 100%;
              ${roundedSm}
              ${px(1)}
              ${py(1)}
              background: ${colors.surfaceSoft};
              border: 1px solid rgba(69, 71, 90, 0.72);
            `}
          >
            <span
              data-log-preview-label
              css={`
                flex-shrink: 0;
                color: ${colors.textMuted};
                font-size: 0.62rem;
                text-transform: uppercase;
                letter-spacing: 0.08em;
              `}
            >
              {field.label}
            </span>
            <span
              data-log-preview-value
              css={`
                min-width: 0;
                color: ${colors.text};
                font-size: 0.72rem;
                ${mono}
                ${truncate}
              `}
            >
              {field.valueText}
            </span>
          </div>
        ))}
        {presentation.hasError && (
          <div
            data-log-preview-field="error"
            css={`
              ${flex}
              ${gap(1)}
              align-items: center;
              min-width: 0;
              max-width: 100%;
              ${roundedSm}
              ${px(1)}
              ${py(1)}
              background: ${colors.errorSoft};
              border: 1px solid rgba(243, 139, 168, 0.4);
              color: ${colors.error};
            `}
          >
            <span
              data-log-preview-label
              css={`
                flex-shrink: 0;
                font-size: 0.62rem;
                text-transform: uppercase;
                letter-spacing: 0.08em;
              `}
            >
              Error
            </span>
            <span
              data-log-preview-value
              css={`
                min-width: 0;
                font-size: 0.72rem;
                ${mono}
                ${truncate}
              `}
            >
              {presentation.errorText ?? 'Error'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
