import { ChoiceButton, IconButton } from '../design-system'
import { sortField, sortOrder, toggleSortOrder } from '../model'
import type { SortField } from '../types'
import { SortAscIcon, SortDescIcon } from './Icons'

const SORT_FIELD_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'size', label: 'Size' },
  { value: 'date', label: 'Date' },
  { value: 'type', label: 'Type' },
  { value: 'dimensions', label: 'Dimensions' },
]

export const SortPanel = () => (
  <div
    css={`
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    `}
  >
    <div
      role="group"
      aria-label="Sort by"
      css={`
        display: flex;
        align-items: center;
        gap: 4px;
        flex-wrap: wrap;
      `}
    >
      {SORT_FIELD_OPTIONS.map((opt) => (
        <ChoiceButton
          label={opt.label}
          selected={() => sortField() === opt.value}
          onClick={() => sortField.set(opt.value)}
        />
      ))}
    </div>
    <IconButton
      label={() =>
        sortOrder() === 'asc' ? 'Sort ascending' : 'Sort descending'
      }
      onClick={toggleSortOrder}
      css="width: 28px; height: 28px;"
    >
      {() => (sortOrder() === 'asc' ? <SortAscIcon /> : <SortDescIcon />)}
    </IconButton>
  </div>
)
