import { clearStack, context } from '@reatom/core'
import { expect, test, vi } from 'vitest'

import { createMockImage, mockFolderTree } from '../__fixtures__/mockData'
import { loadGalleryState } from '../shared/testSetup'
import {
  clearSelection,
  currentImages,
  selectAllImages,
  selectedCount,
  selectedImages,
} from './collection'
import { searchQuery } from './filters'
import { reatomGalleryImage } from './image'
import { handleKeyboardShortcut } from './keyboardShortcuts'
import { themePack } from './preferences'
import { gridColumns } from './view'
import { decreaseGridColumns, increaseGridColumns } from './view'

vi.hoisted(() => {
  if (typeof globalThis.HTMLElement === 'undefined') {
    Object.defineProperty(globalThis, 'HTMLElement', {
      configurable: true,
      value: class HTMLElement {},
    })
  }
})

test.beforeEach(() => clearStack())

function keyEvent(init: Partial<KeyboardEvent>) {
  return {
    target: {},
    preventDefault: vi.fn(),
    ...init,
  } as unknown as KeyboardEvent
}

test('selection only counts images that pass the current filters', () =>
  context.start(() => {
    loadGalleryState({ tree: mockFolderTree })
    selectAllImages()
    const allVisibleCount = selectedCount()
    expect(allVisibleCount).toBeGreaterThan(1)

    searchQuery.set('Quarterly')

    expect(selectedCount()).toBe(1)
    expect(selectedImages().map((image) => image.source.name)).toEqual([
      'Quarterly report.png',
    ])

    clearSelection()
    searchQuery.set('')
    expect(selectedCount()).toBe(0)
  }))

test('F favorites every selected image instead of inverting a mixed selection', () =>
  context.start(() => {
    loadGalleryState({ tree: mockFolderTree })
    const [first, second] = currentImages()
    first!.selected.set(true)
    second!.selected.set(true)
    first!.favorite.set(true)
    second!.favorite.set(false)

    handleKeyboardShortcut(keyEvent({ key: 'f' }))
    expect(first!.favorite()).toBe(true)
    expect(second!.favorite()).toBe(true)

    handleKeyboardShortcut(keyEvent({ key: 'f' }))
    expect(first!.favorite()).toBe(false)
    expect(second!.favorite()).toBe(false)
  }))

test('shortcuts with command modifiers are left to the browser', () =>
  context.start(() => {
    loadGalleryState({ tree: mockFolderTree })
    const [first] = currentImages()
    first!.selected.set(true)
    first!.favorite.set(false)
    themePack.setPaper()
    gridColumns.set(4)

    const modifiedKeys = [
      keyEvent({ key: 'f', metaKey: true }),
      keyEvent({ key: 'p', ctrlKey: true }),
      keyEvent({ key: 'g', metaKey: true }),
      keyEvent({ key: '=', ctrlKey: true }),
      keyEvent({ key: '-', metaKey: true }),
    ]
    for (const event of modifiedKeys) handleKeyboardShortcut(event)

    expect(first!.favorite()).toBe(false)
    expect(themePack()).toBe('paper')
    expect(gridColumns()).toBe(4)
    for (const event of modifiedKeys) {
      expect(event.preventDefault).not.toHaveBeenCalled()
    }
  }))

test('grid column steps never wrap around to the automatic layout', () =>
  context.start(() => {
    gridColumns.set(1)
    decreaseGridColumns()
    expect(gridColumns()).toBe(1)

    gridColumns.set(0)
    decreaseGridColumns()
    expect(gridColumns()).toBeGreaterThanOrEqual(1)

    gridColumns.set(0)
    increaseGridColumns()
    expect(gridColumns()).toBeGreaterThan(1)
  }))

test('favorites are scoped to the opened root folder', () =>
  context.start(() => {
    const inFirstRoot = reatomGalleryImage({
      ...createMockImage({ name: 'IMG_0001.jpg' }),
      rootName: 'trip-2019',
    })
    inFirstRoot.favorite.setTrue()

    const inSecondRoot = reatomGalleryImage({
      ...createMockImage({ name: 'IMG_0001.jpg' }),
      rootName: 'trip-2024',
    })

    expect(inSecondRoot.favorite()).toBe(false)
    expect(
      reatomGalleryImage({
        ...createMockImage({ name: 'IMG_0001.jpg' }),
        rootName: 'trip-2019',
      }).favorite(),
    ).toBe(true)
  }))
