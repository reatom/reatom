import { action, atom, computed } from '@reatom/core'

import { currentImages } from './collection'
import { tablePreviewWidth } from './view'

export const hiddenExifColumns = atom(
  new Set<string>(),
  'imageTable.hiddenExifColumns',
)

export const exifColumnNames = computed((previous: string[] = []) => {
  const columnNames = new Set<string>()

  for (const image of currentImages()) {
    if (!image.visible()) continue

    const exif = image.meta.data()?.exif
    if (!exif) continue

    for (const columnName of Object.keys(exif)) {
      columnNames.add(columnName)
    }
  }

  const next = [...columnNames].sort((left, right) => left.localeCompare(right))
  return next.length === previous.length &&
    next.every((name, index) => name === previous[index])
    ? previous
    : next
}, 'imageTable.exifColumnNames')

export const visibleExifColumnNames = computed((previous: string[] = []) => {
  const hiddenColumns = hiddenExifColumns()
  const next = exifColumnNames().filter(
    (columnName) => !hiddenColumns.has(columnName),
  )
  return next.length === previous.length &&
    next.every((name, index) => name === previous[index])
    ? previous
    : next
}, 'imageTable.visibleExifColumnNames')

export const showAllExifColumns = action(() => {
  hiddenExifColumns.set(new Set<string>())
}, 'imageTable.showAllExifColumns')

export const hideAllExifColumns = action(() => {
  hiddenExifColumns.set(new Set(exifColumnNames()))
}, 'imageTable.hideAllExifColumns')

export const toggleExifColumn = action((columnName: string) => {
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

const staticTableColumnsWidth = 68 + 260 + 90 + 120 + 126 + 94 + 116 + 82 + 20

export const tableMinWidth = computed(
  () =>
    staticTableColumnsWidth +
    tablePreviewWidth() +
    visibleExifColumnNames().length * 160,
  'imageTable.minWidth',
)
