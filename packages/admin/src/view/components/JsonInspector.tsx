import { formatJson } from '../format'
import { colors, mono, rounded, roundedSm } from '../styles'

export interface JsonInspectorProps {
  value: unknown
  emptyLabel?: string
}

function renderPrimitive(value: unknown): string {
  if (value === undefined) return 'undefined'
  if (value === null) return 'null'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'symbol') return value.toString()
  if (typeof value === 'function') {
    return value.name ? `[Function ${value.name}]` : '[Function anonymous]'
  }
  if (value instanceof Error) return formatJson(value)
  if (value instanceof URL) return value.href
  return formatJson(value)
}

function renderNode(label: string, value: unknown, depth: number): Element {
  if (Array.isArray(value)) {
    return (
      <details open={depth < 1}>
        <summary
          css={`
            cursor: pointer;
            color: ${colors.text};
          `}
        >
          <span
            css={`
              color: ${colors.textMuted};
            `}
          >
            {label}
          </span>{' '}
          <span
            css={`
              color: ${colors.textSubtle};
            `}
          >
            [{value.length}]
          </span>
        </summary>
        <div
          css={`
            margin-top: 0.4rem;
            margin-left: 0.9rem;
            display: grid;
            gap: 0.35rem;
          `}
        >
          {value.map((entry, index) => renderNode(String(index), entry, depth + 1))}
        </div>
      </details>
    )
  }

  if (value && typeof value === 'object') {
    return (
      <details open={depth < 1}>
        <summary
          css={`
            cursor: pointer;
            color: ${colors.text};
          `}
        >
          <span
            css={`
              color: ${colors.textMuted};
            `}
          >
            {label}
          </span>{' '}
          <span
            css={`
              color: ${colors.textSubtle};
            `}
          >
            {'{…}'}
          </span>
        </summary>
        <div
          css={`
            margin-top: 0.4rem;
            margin-left: 0.9rem;
            display: grid;
            gap: 0.35rem;
          `}
        >
          {Object.entries(value).map(([entryLabel, entryValue]) =>
            renderNode(entryLabel, entryValue, depth + 1),
          )}
        </div>
      </details>
    )
  }

  return (
    <div
      css={`
        display: grid;
        grid-template-columns: minmax(6rem, 9rem) minmax(0, 1fr);
        gap: 0.5rem;
        align-items: start;
      `}
    >
      <span
        css={`
          color: ${colors.textMuted};
        `}
      >
        {label}
      </span>
      <span
        css={`
          ${mono}
          ${roundedSm}
          padding: 0.3rem 0.45rem;
          background: ${colors.bgElevated};
          border: 1px solid ${colors.border};
          color: ${colors.text};
          white-space: pre-wrap;
          word-break: break-word;
        `}
      >
        {renderPrimitive(value)}
      </span>
    </div>
  )
}

export const JsonInspector = ({
  value,
  emptyLabel = 'No structured data',
}: JsonInspectorProps) => {
  if (value === undefined) {
    return (
      <div
        css={`
          ${rounded}
          border: 1px dashed ${colors.borderStrong};
          padding: 0.75rem;
          color: ${colors.textSubtle};
        `}
      >
        {emptyLabel}
      </div>
    )
  }

  return (
    <div
      css={`
        display: grid;
        gap: 0.45rem;
      `}
    >
      {renderNode('value', value, 0)}
    </div>
  )
}
