import { focusVisible, scrollable, truncate } from './mixins'
import { size, soft, tokens, type } from './tokens'

export interface DataGridColumn<T> {
  id: string
  header: string
  /**
   * Full phrase when `header` is abbreviated. Shown as the column tooltip so a
   * short label still says what the numbers mean.
   */
  title?: string
  width?: string
  render: (row: T) => Element
}

export interface DataGridProps<T> {
  columns: Array<DataGridColumn<T>>
  rows: () => Array<T>
  getRowId: (row: T) => string
  selectedId: () => string | null
  onSelect: (row: T) => void
  empty: Element
  ariaLabel: string
  rowTestAttr?: (row: T) => Record<string, string>
}

export const DataGrid = <T,>({
  columns,
  rows,
  getRowId,
  selectedId,
  onSelect,
  empty,
  ariaLabel,
  rowTestAttr,
}: DataGridProps<T>) => {
  const selectByOffset = (offset: number) => {
    const currentRows = rows()
    if (currentRows.length === 0) return
    const currentId = selectedId()
    const currentIndex = currentRows.findIndex(
      (row) => getRowId(row) === currentId,
    )
    const nextIndex =
      currentIndex < 0
        ? offset > 0
          ? 0
          : currentRows.length - 1
        : Math.max(0, Math.min(currentRows.length - 1, currentIndex + offset))
    const nextRow = currentRows[nextIndex]
    if (nextRow) onSelect(nextRow)
  }

  return (
    <div
      role="grid"
      aria-label={ariaLabel}
      css={`
        display: grid;
        grid-template-rows: ${size.gridHeader} minmax(0, 1fr);
        min-height: 0;
        min-width: 0;
        background: ${tokens.canvas};
      `}
      on:keydown={(event: KeyboardEvent) => {
        if (
          event.key === 'ArrowDown' ||
          event.key === 'j' ||
          event.key === 'J'
        ) {
          event.preventDefault()
          selectByOffset(1)
          return
        }
        if (event.key === 'ArrowUp' || event.key === 'k' || event.key === 'K') {
          event.preventDefault()
          selectByOffset(-1)
          return
        }
        if (event.key === 'Home') {
          event.preventDefault()
          const first = rows()[0]
          if (first) onSelect(first)
          return
        }
        if (event.key === 'End') {
          event.preventDefault()
          const last = rows().at(-1)
          if (last) onSelect(last)
        }
      }}
    >
      <div
        role="row"
        css={`
          display: grid;
          grid-template-columns: ${columns
            .map((column) => column.width ?? 'minmax(0, 1fr)')
            .join(' ')};
          align-items: center;
          height: ${size.gridHeader};
          padding-inline: var(--admin-space-8);
          border-bottom: 1px solid ${tokens.border1};
          background: ${tokens.surface1};
          ${type.meta}
          color: ${tokens.text3};
        `}
      >
        {columns.map((column) => (
          <div
            role="columnheader"
            title={column.title}
            css={`
              min-width: 0;
              white-space: nowrap;
            `}
          >
            {column.header}
          </div>
        ))}
      </div>
      {() => {
        const currentRows = rows()
        if (currentRows.length === 0) return empty
        return (
          <div
            role="rowgroup"
            css={`
              ${scrollable}
            `}
          >
            {currentRows.map((row) => {
              const rowId = getRowId(row)
              const extraAttrs = rowTestAttr?.(row) ?? {}
              return (
                <button
                  $spread={extraAttrs}
                  type="button"
                  role="row"
                  tabindex={0}
                  aria-selected={() => selectedId() === rowId}
                  data-row-id={rowId}
                  css={`
                    appearance: none;
                    background: ${tokens.canvas};
                    border: 0;
                    width: 100%;
                    text-align: left;
                    display: grid;
                    grid-template-columns: ${columns
                      .map((column) => column.width ?? 'minmax(0, 1fr)')
                      .join(' ')};
                    align-items: center;
                    min-height: ${size.gridRow};
                    padding-inline: var(--admin-space-8);
                    border-bottom: 1px solid ${tokens.border1};
                    color: ${tokens.text1};
                    ${type.data}
                    ${focusVisible}
                    cursor: pointer;
                    &:hover {
                      background: ${soft(tokens.surface3, 80)};
                    }
                    &[aria-selected='true'] {
                      background: color-mix(
                        in oklch,
                        ${tokens.accent} 24%,
                        ${tokens.canvas}
                      );
                    }
                  `}
                  on:click={() => onSelect(row)}
                  on:keydown={(event: KeyboardEvent) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onSelect(row)
                    }
                  }}
                >
                  {columns.map((column) => (
                    <div
                      role="gridcell"
                      css={`
                        min-width: 0;
                        ${truncate}
                      `}
                    >
                      {column.render(row)}
                    </div>
                  ))}
                </button>
              )
            })}
          </div>
        )
      }}
    </div>
  )
}
