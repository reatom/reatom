import { sortField, sortOrder } from '../model'
import type { SortField, SortOrder } from '../types'
import { SortAscIcon, SortDescIcon } from './Icons'

const SORT_FIELD_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'size', label: 'Size' },
  { value: 'date', label: 'Date' },
  { value: 'type', label: 'Type' },
  { value: 'dimensions', label: 'Dimensions' },
]

const SortFieldButton = ({
  value,
  label,
}: {
  value: SortField
  label: string
}) => (
  <button
    on:click={() => sortField.set(value)}
    attr:data-active={() => sortField() === value}
    css={`
      padding: 5px 10px;
      border: var(--border-width) var(--control-border-style) var(--border);
      border-radius: var(--radius-sm);
      background: var(--input-bg);
      color: var(--text-primary);
      font-size: 12px;
      transition: all 0.15s;
      white-space: nowrap;
      text-transform: var(--control-transform);

      &:hover {
        border-color: var(--accent);
        color: var(--accent);
      }

      &[data-active='true'] {
        background: var(--accent);
        border-color: var(--accent);
        color: var(--accent-contrast);
      }
    `}
  >
    {label}
  </button>
)

export const SortPanel = () => {
  const orderLabel = () => (sortOrder() === 'asc' ? 'Asc' : 'Desc')

  const toggleOrder = () => {
    const next: SortOrder = sortOrder() === 'asc' ? 'desc' : 'asc'
    sortOrder.set(next)
  }

  return (
    <div
      css={`
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
      `}
    >
      {SORT_FIELD_OPTIONS.map((opt) => (
        <SortFieldButton value={opt.value} label={opt.label} />
      ))}
      <button
        on:click={toggleOrder}
        css={`
          padding: 5px 10px;
          border: var(--border-width) var(--control-border-style) var(--accent);
          border-radius: var(--radius-sm);
          background: transparent;
          color: var(--accent);
          font-size: 12px;
          font-weight: 600;
          transition: all 0.15s;
          min-width: 76px;
          text-transform: var(--control-transform);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;

          &:hover {
            background: var(--accent);
            color: var(--accent-contrast);
          }
        `}
      >
        {() => (sortOrder() === 'asc' ? <SortAscIcon /> : <SortDescIcon />)}
        <span>{orderLabel}</span>
      </button>
    </div>
  )
}
