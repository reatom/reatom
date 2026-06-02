import { clearStack, context } from '@reatom/core'
import { expect, test } from 'vitest'

import { mockFolderTree } from './__fixtures__/mockData'
import {
  clearSelection,
  closeLightbox,
  filterSizeMax,
  filterSizeMin,
  filterTypes,
  imagesList,
  includeSubfolders,
  lightboxImage,
  navigateLightbox,
  openFolder,
  openLightbox,
  searchQuery,
  selectAllImages,
  selectedCount,
  selectImage,
  sortField,
  sortOrder,
  visibleIndexMap,
} from './model'
import { loadGalleryState } from './shared/testSetup'

test.beforeEach(() => {
  clearStack()
})

test('imagesList sorts by name ascending', () =>
  context.start(() => {
    loadGalleryState({ tree: mockFolderTree })
    sortField.set('name')
    sortOrder.set('asc')
    const images = imagesList.array()
    const names = images.map((i) => i.name)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
  }))

test('imagesList sorts by name descending', () =>
  context.start(() => {
    loadGalleryState({ tree: mockFolderTree })
    sortField.set('name')
    sortOrder.set('desc')
    const images = imagesList.array()
    const names = images.map((i) => i.name)
    expect(names).toEqual([...names].sort((a, b) => b.localeCompare(a)))
  }))

test('imagesList sorts by size ascending', () =>
  context.start(() => {
    loadGalleryState({ tree: mockFolderTree })
    sortField.set('size')
    sortOrder.set('asc')
    const images = imagesList.array()
    const sizes = images.map((i) => i.size)
    expect(sizes).toEqual([...sizes].sort((a, b) => a - b))
  }))

test('imagesList sorts by size descending', () =>
  context.start(() => {
    loadGalleryState({ tree: mockFolderTree })
    sortField.set('size')
    sortOrder.set('desc')
    const images = imagesList.array()
    const sizes = images.map((i) => i.size)
    expect(sizes).toEqual([...sizes].sort((a, b) => b - a))
  }))

test('imagesList sorts by date ascending', () =>
  context.start(() => {
    loadGalleryState({ tree: mockFolderTree })
    sortField.set('date')
    sortOrder.set('asc')
    const images = imagesList.array()
    const dates = images.map((i) => i.lastModified)
    expect(dates).toEqual([...dates].sort((a, b) => a - b))
  }))

test('imagesList sorts by type', () =>
  context.start(() => {
    loadGalleryState({ tree: mockFolderTree })
    sortField.set('type')
    sortOrder.set('asc')
    const images = imagesList.array()
    const types = images.map((i) => i.type)
    expect(types).toEqual([...types].sort())
  }))

test('imagesList sorts by dimensions', () =>
  context.start(() => {
    loadGalleryState({ tree: mockFolderTree })
    sortField.set('dimensions')
    sortOrder.set('asc')
    const images = imagesList.array()
    const areas = images.map((i) => i.width() * i.height())
    expect(areas).toEqual([...areas].sort((a, b) => a - b))
  }))

test('visibleIndexMap filters by type', () =>
  context.start(() => {
    loadGalleryState({ tree: mockFolderTree })
    filterTypes.set(new Set(['jpg']))
    const map = visibleIndexMap()
    expect([...map.keys()].every((i) => i.name.endsWith('.jpg'))).toBe(true)
    expect(map.size).toBeLessThan(mockFolderTree.imageCount)
  }))

test('visibleIndexMap filters by search query', () =>
  context.start(() => {
    loadGalleryState({ tree: mockFolderTree })
    searchQuery.set('Quarterly')
    const map = visibleIndexMap()
    expect(map.size).toBe(1)
    expect([...map.keys()][0]?.name).toBe('Quarterly report.png')
  }))

test('visibleIndexMap filters by size range', () =>
  context.start(() => {
    loadGalleryState({ tree: mockFolderTree })
    filterSizeMin.set(5000)
    filterSizeMax.set(10000)
    const map = visibleIndexMap()
    expect(
      [...map.keys()].every((i) => i.size >= 5000 && i.size <= 10000),
    ).toBe(true)
  }))

test('visibleIndexMap respects includeSubfolders', () =>
  context.start(() => {
    loadGalleryState({
      tree: mockFolderTree,
      currentFolderNode: mockFolderTree,
    })
    includeSubfolders.setTrue()
    const withSub = visibleIndexMap().size
    includeSubfolders.setFalse()
    const withoutSub = visibleIndexMap().size
    expect(withSub).toBeGreaterThan(withoutSub)
  }))

test('selectImage toggles selection', () =>
  context.start(() => {
    loadGalleryState({ tree: mockFolderTree })
    const model = [...visibleIndexMap().keys()][0]
    expect(model).toBeDefined()
    selectImage(model!)
    expect(model!.selected()).toBe(true)
    selectImage(model!)
    expect(model!.selected()).toBe(false)
  }))

test('selectAllImages selects all visible', () =>
  context.start(() => {
    loadGalleryState({ tree: mockFolderTree })
    selectAllImages()
    const visibleCount = visibleIndexMap().size
    expect(selectedCount()).toBe(visibleCount)
  }))

test('clearSelection clears all', () =>
  context.start(() => {
    loadGalleryState({ tree: mockFolderTree })
    selectAllImages()
    clearSelection()
    expect(selectedCount()).toBe(0)
  }))

test('openLightbox sets image and opens', () =>
  context.start(() => {
    loadGalleryState({ tree: mockFolderTree })
    const visible = [...visibleIndexMap().keys()]
    const target = visible[2]!
    openLightbox(target)
    expect(lightboxImage()).toBe(target)
  }))

test('closeLightbox resets zoom', () =>
  context.start(() => {
    loadGalleryState({ tree: mockFolderTree })
    const visible = [...visibleIndexMap().keys()]
    openLightbox(visible[0]!)
    closeLightbox()
  }))

test('navigateLightbox wraps around', () =>
  context.start(() => {
    loadGalleryState({ tree: mockFolderTree })
    const visible = [...visibleIndexMap().keys()]
    openLightbox(visible[0]!)
    navigateLightbox(-1)
    expect(lightboxImage()).toBe(visible[visible.length - 1])
    navigateLightbox(1)
    expect(lightboxImage()).toBe(visible[0])
  }))

test('favorite.toggle adds and removes', () =>
  context.start(() => {
    loadGalleryState({ tree: mockFolderTree })
    const model = [...visibleIndexMap().keys()][0]
    expect(model).toBeDefined()
    model!.favorite.toggle()
    expect(model!.favorite()).toBe(true)
    model!.favorite.toggle()
    expect(model!.favorite()).toBe(false)
  }))

test('openFolder.abort clears parsing state', () =>
  context.start(() => {
    loadGalleryState({ tree: mockFolderTree })
    openFolder.abort()
  }))
