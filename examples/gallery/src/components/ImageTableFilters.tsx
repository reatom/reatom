import { Button } from '../design-system'
import {
  exifColumnNames,
  hiddenExifColumns,
  hideAllExifColumns,
  showAllExifColumns,
  toggleExifColumn,
  visibleExifColumnNames,
} from '../model'

export const ImageTableFilters = () => (
  <div
    css={`
      display: grid;
      flex-shrink: 0;
      gap: 10px;
      padding: 12px;
      border-bottom: var(--border-width) var(--border-style) var(--card-border);
      background: var(--surface-glass);
    `}
  >
    <div css="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
      <span css="font-size: 13px; font-weight: 700; color: var(--text-primary);">
        EXIF columns
      </span>
      <Button
        appearance="quiet"
        size="sm"
        label="Show all"
        onClick={showAllExifColumns}
      />
      <Button
        appearance="quiet"
        size="sm"
        label="Hide all"
        onClick={hideAllExifColumns}
      />
      <span css="font-size: 12px; color: var(--text-muted);">
        {() =>
          `${visibleExifColumnNames().length} of ${exifColumnNames().length} shown`
        }
      </span>
    </div>

    <div
      css={`
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        max-height: 116px;
        overflow-x: hidden;
        overflow-y: auto;
      `}
    >
      {() => {
        const columnNames = exifColumnNames()
        if (columnNames.length === 0) {
          return (
            <span css="font-size: 12px; color: var(--text-muted);">
              No EXIF columns found yet
            </span>
          )
        }

        return columnNames.map((columnName) => (
          <label
            css={`
              display: inline-flex;
              align-items: center;
              gap: 6px;
              padding: 5px 8px;
              border: var(--border-width) var(--control-border-style)
                var(--input-border);
              border-radius: var(--radius-round);
              background: var(--input-bg);
              color: var(--text-secondary);
              font-size: 12px;
              cursor: pointer;
              max-width: 100%;
              overflow: hidden;
              white-space: nowrap;
            `}
          >
            <input
              type="checkbox"
              checked={() => !hiddenExifColumns().has(columnName)}
              on:change={() => toggleExifColumn(columnName)}
            />
            <span css="min-width: 0; overflow: hidden; text-overflow: ellipsis;">
              {columnName}
            </span>
          </label>
        ))
      }}
    </div>
  </div>
)
