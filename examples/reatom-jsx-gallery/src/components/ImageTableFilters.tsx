import { action, atom, computed } from '@reatom/core'

import { imagesList } from '../model'

const hiddenExifColumns = atom(
  new Set<string>(),
  'imageTable.hiddenExifColumns',
)

export const exifColumnNames = computed(() => {
  const columnNames = new Set<string>()

  for (const image of imagesList.array()) {
    if (!image.visible()) continue

    const exif = image.meta.data()?.exif
    if (!exif) continue

    for (const columnName of Object.keys(exif)) {
      columnNames.add(columnName)
    }
  }

  return [...columnNames].sort((a, b) => a.localeCompare(b))
}, 'imageTable.exifColumnNames')

export const visibleExifColumnNames = computed(() => {
  const hiddenColumns = hiddenExifColumns()
  return exifColumnNames().filter(
    (columnName) => !hiddenColumns.has(columnName),
  )
}, 'imageTable.visibleExifColumnNames')

const showAllExifColumns = action(() => {
  hiddenExifColumns.set(new Set<string>())
}, 'imageTable.showAllExifColumns')

const hideAllExifColumns = action(() => {
  hiddenExifColumns.set(new Set(exifColumnNames()))
}, 'imageTable.hideAllExifColumns')

const toggleExifColumn = action((columnName: string) => {
  hiddenExifColumns.set((hiddenColumns) => {
    const nextHiddenColumns = new Set(hiddenColumns)

    if (nextHiddenColumns.has(columnName)) {
      nextHiddenColumns.delete(columnName)
    } else {
      nextHiddenColumns.add(columnName)
    }

    return nextHiddenColumns
  })
}, 'imageTable.toggleExifColumn')

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
      <button
        type="button"
        on:click={showAllExifColumns}
        css="padding: 5px 9px; border-radius: var(--radius-sm); border: var(--border-width) var(--control-border-style) var(--input-border); background: var(--input-bg); color: var(--text-primary); cursor: pointer;"
      >
        Show all
      </button>
      <button
        type="button"
        on:click={hideAllExifColumns}
        css="padding: 5px 9px; border-radius: var(--radius-sm); border: var(--border-width) var(--control-border-style) var(--input-border); background: var(--input-bg); color: var(--text-primary); cursor: pointer;"
      >
        Hide all
      </button>
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

        const hiddenColumns = hiddenExifColumns()
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
              checked={!hiddenColumns.has(columnName)}
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
