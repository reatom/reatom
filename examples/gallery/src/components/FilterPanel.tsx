import { Button, Switch } from '../design-system'
import {
  clearFilters,
  filterSizeMaxKb,
  filterSizeMinKb,
  filterTypes,
  IMAGE_TYPE_OPTIONS,
  includeSubfolders,
  searchQuery,
  setFilterSizeMaxKb,
  setFilterSizeMinKb,
  toggleFilterType,
} from '../model'
import { themeCss } from '../themeCss'
import { fieldCss } from './fieldStyles'
import { Panel } from './Panel'
import { filterPanelOpen } from './panelState'

const TypeCheckbox = ({ ext, label }: { ext: string; label: string }) => (
  <label
    css={`
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 0;
      cursor: pointer;
      font-size: 13px;
      color: var(--text-primary);

      &:hover {
        color: var(--accent);
      }
    `}
  >
    <input
      type="checkbox"
      checked={() => filterTypes().has(ext)}
      on:change={() => toggleFilterType(ext)}
      css={`
        accent-color: var(--accent);
        width: 16px;
        height: 16px;
      `}
    />
    <span>{label}</span>
  </label>
)

export const FilterPanel = () => (
  <Panel
    label="Filters"
    closeLabel="Close filters"
    open={filterPanelOpen}
    onClose={() => filterPanelOpen.set(false)}
    width="300px"
  >
      <div css="margin-bottom: 16px;">
        <input
          type="search"
          placeholder="Search by filename..."
          aria-label="Search by filename"
          model:value={searchQuery}
          css={`
            width: 100%;
            ${fieldCss}
          `}
        />
      </div>

      <h3
        css={`
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-secondary);
          margin-bottom: 8px;
        `}
      >
        File Types
      </h3>
      <div
        css={`
          margin-bottom: 16px;
          ${themeCss(
            'glass',
            `
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 4px 8px;
            `,
          )}
        `}
      >
        {IMAGE_TYPE_OPTIONS.map((option) => (
          <TypeCheckbox ext={option.ext} label={option.label} />
        ))}
      </div>

      <h3
        css={`
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-secondary);
          margin-bottom: 8px;
        `}
      >
        File Size (KB)
      </h3>
      <div css="display: flex; gap: 8px; margin-bottom: 16px;">
        <input
          type="number"
          placeholder="Min"
          aria-label="Minimum file size in KB"
          value={filterSizeMinKb}
          on:input={(event: Event & { currentTarget: HTMLInputElement }) =>
            setFilterSizeMinKb(Number(event.currentTarget.value))
          }
          css={`
            width: 50%;
            ${fieldCss}
          `}
        />
        <input
          type="number"
          placeholder="Max"
          aria-label="Maximum file size in KB"
          value={filterSizeMaxKb}
          on:input={(event: Event & { currentTarget: HTMLInputElement }) => {
            const value = event.currentTarget.value
            if (value === '') {
              setFilterSizeMaxKb(null)
              return
            }
            setFilterSizeMaxKb(Number(value))
          }}
          css={`
            width: 50%;
            ${fieldCss}
          `}
        />
      </div>

      <div css="margin-bottom: 16px;">
        <Switch
          label="Include Subfolders"
          checked={includeSubfolders}
          onToggle={includeSubfolders.toggle}
        />
      </div>

      <Button
        appearance="quiet"
        label="Clear All Filters"
        onClick={clearFilters}
        css="width: 100%;"
      />
  </Panel>
)
