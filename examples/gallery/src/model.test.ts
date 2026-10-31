import { clearStack, context, wrap } from '@reatom/core'
import { expect, test, vi } from 'vitest'

import { createMockDirHandle } from './__fixtures__/fixtureLoader'
import { createMockImage, mockFolderTree } from './__fixtures__/mockData'
import {
  bindLightboxSizedImageWindowSync,
  clearSelection,
  closeLightbox,
  currentFolder,
  currentImages,
  filterSizeMax,
  filterSizeMin,
  filterTypes,
  folderTree,
  galleryContentMode,
  includeSubfolders,
  keepLightboxView,
  lightboxImage,
  lightboxOpen,
  lightboxPanX,
  lightboxPanY,
  lightboxZoom,
  navigateLightbox,
  openFolder,
  openLightbox,
  pendingFolderRestore,
  reatomGalleryImage,
  resetOpenedFolder,
  searchQuery,
  selectAllImages,
  selectedCount,
  selectImage,
  slideshowPlaying,
  sortField,
  sortOrder,
  visibleIndexMap,
  wrapFolderNavigation,
} from './model'
import { lightboxSizedImageWindowIds } from './models/lightboxState'
import { reatomFolderTreeNodeUi } from './models/navigation'
import { loadGalleryState } from './shared/testSetup'
import type { FolderNode, ImageFile } from './types'

function collectTreeImages(
  folder: FolderNode,
  compare: (left: ImageFile, right: ImageFile) => number,
): ImageFile[] {
  return [
    ...folder.images.toSorted(compare),
    ...folder.children.flatMap((child) => collectTreeImages(child, compare)),
  ]
}

test.beforeEach(() => {
  clearStack()
})

test.afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

test('imagesList sorts each folder by name ascending', () =>
  context.start(() => {
    loadGalleryState({ tree: mockFolderTree })
    sortField.set('name')
    sortOrder.set('asc')
    const images = currentImages()
    const names = images.map((i) => i.source.name)
    const expectedNames = collectTreeImages(mockFolderTree, (left, right) =>
      left.name.localeCompare(right.name),
    ).map((image) => image.name)
    expect(names).toEqual(expectedNames)
  }))

test('imagesList sorts each folder by name descending', () =>
  context.start(() => {
    loadGalleryState({ tree: mockFolderTree })
    sortField.set('name')
    sortOrder.set('desc')
    const images = currentImages()
    const names = images.map((i) => i.source.name)
    const expectedNames = collectTreeImages(mockFolderTree, (left, right) =>
      right.name.localeCompare(left.name),
    ).map((image) => image.name)
    expect(names).toEqual(expectedNames)
  }))

test('imagesList sorts each folder by size ascending', () =>
  context.start(() => {
    loadGalleryState({ tree: mockFolderTree })
    sortField.set('size')
    sortOrder.set('asc')
    const images = currentImages()
    const sizes = images.map((i) => i.fileInfo.data()?.size)
    const expectedSizes = collectTreeImages(
      mockFolderTree,
      (left, right) => (left.fileInfo?.size ?? 0) - (right.fileInfo?.size ?? 0),
    ).map((image) => image.fileInfo?.size)
    expect(sizes).toEqual(expectedSizes)
  }))

test('imagesList sorts each folder by size descending', () =>
  context.start(() => {
    loadGalleryState({ tree: mockFolderTree })
    sortField.set('size')
    sortOrder.set('desc')
    const images = currentImages()
    const sizes = images.map((i) => i.fileInfo.data()?.size)
    const expectedSizes = collectTreeImages(
      mockFolderTree,
      (left, right) => (right.fileInfo?.size ?? 0) - (left.fileInfo?.size ?? 0),
    ).map((image) => image.fileInfo?.size)
    expect(sizes).toEqual(expectedSizes)
  }))

test('imagesList sorts each folder by date ascending', () =>
  context.start(() => {
    loadGalleryState({ tree: mockFolderTree })
    sortField.set('date')
    sortOrder.set('asc')
    const images = currentImages()
    const dates = images.map((i) => i.fileInfo.data()?.lastModified)
    const expectedDates = collectTreeImages(
      mockFolderTree,
      (left, right) =>
        (left.fileInfo?.lastModified ?? 0) -
        (right.fileInfo?.lastModified ?? 0),
    ).map((image) => image.fileInfo?.lastModified)
    expect(dates).toEqual(expectedDates)
  }))

test('imagesList sorts each folder by type', () =>
  context.start(() => {
    loadGalleryState({ tree: mockFolderTree })
    sortField.set('type')
    sortOrder.set('asc')
    const images = currentImages()
    const types = images.map((i) => i.fileInfo.data()?.type)
    const expectedTypes = collectTreeImages(mockFolderTree, (left, right) =>
      (left.fileInfo?.type ?? '').localeCompare(right.fileInfo?.type ?? ''),
    ).map((image) => image.fileInfo?.type)
    expect(types).toEqual(expectedTypes)
  }))

test('imagesList sorts by dimensions', () =>
  context.start(() => {
    loadGalleryState({ tree: mockFolderTree })
    sortField.set('dimensions')
    sortOrder.set('asc')
    const images = currentImages()
    const areas = images.map((i) => i.width() * i.height())
    expect(areas).toEqual([...areas].sort((a, b) => a - b))
  }))

test('dimension reads do not start full image pipelines', () =>
  context.start(() => {
    const image = reatomGalleryImage(
      createMockImage({ name: 'dimensions.jpg', type: 'image/jpeg' }),
    )
    const rawDevelopPending = image.rawDeveloped.pending()
    const sizedImagePending = image.sizedImage.pending()
    const fullImagePending = image.fullImage.pending()

    image.width()
    image.height()

    expect(image.rawDeveloped.pending()).toBe(rawDevelopPending)
    expect(image.sizedImage.pending()).toBe(sizedImagePending)
    expect(image.fullImage.pending()).toBe(fullImagePending)
  }))

test('visibleIndexMap filters by type', () =>
  context.start(() => {
    loadGalleryState({ tree: mockFolderTree })
    filterTypes.set(new Set(['jpg']))
    const map = visibleIndexMap()
    expect([...map.keys()].every((i) => i.source.name.endsWith('.jpg'))).toBe(
      true,
    )
    expect(map.size).toBeLessThan(mockFolderTree.imageCount)
  }))

test('visibleIndexMap filters by search query', () =>
  context.start(() => {
    loadGalleryState({ tree: mockFolderTree })
    searchQuery.set('Quarterly')
    const map = visibleIndexMap()
    expect(map.size).toBe(1)
    expect([...map.keys()][0]?.source.name).toBe('Quarterly report.png')
  }))

test('visibleIndexMap filters by size range', () =>
  context.start(() => {
    loadGalleryState({ tree: mockFolderTree })
    filterSizeMin.set(5000)
    filterSizeMax.set(10000)
    const map = visibleIndexMap()
    expect(
      [...map.keys()].every((i) => {
        const size = i.fileInfo.data()?.size
        return size !== undefined && size >= 5000 && size <= 10000
      }),
    ).toBe(true)
  }))

test('visibleIndexMap respects includeSubfolders', async () =>
  context.start(async () => {
    loadGalleryState({
      tree: mockFolderTree,
      currentFolderNode: mockFolderTree,
    })
    includeSubfolders.setTrue()
    const withSub = visibleIndexMap().size
    includeSubfolders.setFalse()
    await wrap(Promise.resolve())
    const withoutSub = visibleIndexMap().size
    expect(withSub).toBeGreaterThan(withoutSub)
  }))

test('imagesList is scoped to the selected folder', async () =>
  context.start(async () => {
    loadGalleryState({ tree: mockFolderTree })
    currentFolder.set(mockFolderTree.children[0]!)
    await wrap(Promise.resolve())

    const paths = currentImages().map((image) => image.source.path)

    expect(paths).toEqual(['subfolder', 'subfolder'])
  }))

test('opening a folder publishes immutable image batches before each frame', () => {
  let now = 0
  const frames: FrameRequestCallback[] = []
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  vi.stubGlobal('showDirectoryPicker', vi.fn())
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.push(callback)
    return frames.length
  })

  function directory(name: string, entries: FileSystemHandle[]) {
    return Object.assign(createMockDirHandle(name), {
      values: async function* () {
        for (const entry of entries) {
          now += 8
          yield entry
        }
      },
    })
  }

  const child = directory(
    'child',
    Array.from(
      { length: 4 },
      (_, index) => createMockImage({ name: `child-${index}.jpg` }).fileHandle,
    ),
  )
  const root = directory('Root', [
    createMockImage({ name: 'root.jpg' }).fileHandle,
    child,
  ])

  return context.start(async () => {
    includeSubfolders.setTrue()
    const scan = openFolder(root)
    await wrap(vi.waitFor(() => expect(frames).toHaveLength(1)))

    const first = folderTree()!
    expect(openFolder.pending()).toBe(1)
    expect(galleryContentMode()).toBe('gallery')
    expect(currentImages().map((image) => image.source.name)).toEqual([
      'root.jpg',
    ])
    expect(first.imageCount).toBe(1)

    frames.shift()!(now)
    await wrap(vi.waitFor(() => expect(frames).toHaveLength(1)))
    expect(folderTree()).toBe(first)
    frames.shift()!(now)
    await wrap(vi.waitFor(wrap(() => expect(folderTree()?.imageCount).toBe(2))))
    const second = folderTree()!
    const secondChild = second.children[0]!
    currentFolder.set(secondChild)
    const selectedImage = currentImages()[0]!
    selectImage(selectedImage)
    const childUi = reatomFolderTreeNodeUi('child')
    childUi.expanded.setTrue()
    expect(currentImages()).toHaveLength(1)

    frames.shift()!(now)
    await wrap(vi.waitFor(() => expect(frames).toHaveLength(1)))
    frames.shift()!(now)
    await wrap(vi.waitFor(wrap(() => expect(folderTree()?.imageCount).toBe(4))))
    expect(openFolder.pending()).toBe(1)
    expect(currentFolder()).toBe(folderTree()!.children[0])
    expect(currentImages()).toHaveLength(3)
    expect(currentImages()[0]).toBe(selectedImage)
    expect(selectedImage.selected()).toBe(true)
    expect(reatomFolderTreeNodeUi('child')).toBe(childUi)
    expect(childUi.expanded()).toBe(true)
    expect(first.children).toEqual([])
    expect(first.imageCount).toBe(1)
    expect(secondChild.images).toHaveLength(1)
    expect(second.imageCount).toBe(2)

    // The final sub-frame remainder is published, preserving the All selection.
    currentFolder.set(null)
    frames.shift()!(now)
    await wrap(vi.waitFor(() => expect(frames).toHaveLength(1)))
    frames.shift()!(now)
    await wrap(scan)
    expect(currentFolder()).toBeNull()
    expect(folderTree()?.imageCount).toBe(5)
    expect(currentImages()).toHaveLength(5)
    expect(openFolder.pending()).toBe(0)
  })
})

test.each(['reset', 'replace'] as const)(
  '%s stops a progressive scan while it waits for a frame',
  (intent) => {
    let now = 0
    const frames: FrameRequestCallback[] = []
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    vi.stubGlobal('showDirectoryPicker', vi.fn())
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.push(callback)
      return frames.length
    })
    const visited = vi.fn()
    const root = Object.assign(createMockDirHandle('Root'), {
      values: async function* () {
        for (let index = 0; index < 3; index++) {
          visited()
          now += 16
          yield createMockImage({ name: `image-${index}.jpg` }).fileHandle
        }
      },
    })

    return context.start(async () => {
      const scan = openFolder(root).catch(() => null)
      await wrap(vi.waitFor(() => expect(frames).toHaveLength(1)))
      expect(currentImages()).toHaveLength(1)

      if (intent === 'reset') {
        resetOpenedFolder()
      } else {
        await wrap(openFolder(createMockDirHandle('Replacement')))
      }
      frames.shift()!(now)
      await wrap(scan)
      expect(visited).toHaveBeenCalledTimes(1)
      expect(folderTree()?.name ?? null).toBe(
        intent === 'reset' ? null : 'Replacement',
      )
      expect(currentImages()).toEqual([])
      expect(galleryContentMode()).toBe(
        intent === 'reset' ? 'empty' : 'gallery',
      )
    })
  },
)

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

test('sized image window sync restarts after lightbox remount', async () => {
  await context.start(async () => {
    loadGalleryState({ tree: mockFolderTree })
    const visible = [...visibleIndexMap().keys()]

    openLightbox(visible[0]!)
    const stopFirstSync = bindLightboxSizedImageWindowSync()
    await wrap(Promise.resolve())
    expect(lightboxSizedImageWindowIds().has(visible[0]!.id)).toBe(true)
    stopFirstSync()

    closeLightbox()
    const lastVisible = visible.at(-1)!
    openLightbox(lastVisible)
    const stopSecondSync = bindLightboxSizedImageWindowSync()
    await wrap(Promise.resolve())
    expect(lightboxSizedImageWindowIds().has(lastVisible.id)).toBe(true)
    stopSecondSync()
  })
})

test('closeLightbox resets preview state', () =>
  context.start(() => {
    loadGalleryState({ tree: mockFolderTree })
    const visible = [...visibleIndexMap().keys()]
    openLightbox(visible[0]!)
    lightboxZoom.set(4)
    lightboxPanX.set(16)
    lightboxPanY.set(-12)
    slideshowPlaying.setTrue()
    closeLightbox()
    expect(lightboxOpen()).toBe(false)
    expect(slideshowPlaying()).toBe(false)
    expect(lightboxZoom()).toBe(1)
    expect(lightboxPanX()).toBe(0)
    expect(lightboxPanY()).toBe(0)
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

test('navigateLightbox stops at folder ends when wrap is disabled', () =>
  context.start(() => {
    loadGalleryState({ tree: mockFolderTree })
    wrapFolderNavigation.setFalse()
    const visible = [...visibleIndexMap().keys()]
    openLightbox(visible[0]!)
    navigateLightbox(-1)
    expect(lightboxImage()).toBe(visible[0])
  }))

test('navigateLightbox skips filtered images', () =>
  context.start(() => {
    loadGalleryState({ tree: mockFolderTree })
    searchQuery.set('photo')
    const visible = [...visibleIndexMap().keys()]
    openLightbox(visible[0]!)
    navigateLightbox(1)
    expect(lightboxImage()).toBe(visible[1])
    expect(lightboxImage()?.source.name).toBe('photo2.png')
  }))

test('navigateLightbox keeps zoom and pan when keep view is enabled', () =>
  context.start(() => {
    loadGalleryState({ tree: mockFolderTree })
    keepLightboxView.setTrue()
    const visible = [...visibleIndexMap().keys()]
    openLightbox(visible[0]!)
    lightboxZoom.set(3)
    lightboxPanX.set(24)
    lightboxPanY.set(-8)
    navigateLightbox(1)
    expect(lightboxImage()).toBe(visible[1])
    expect(lightboxZoom()).toBe(3)
    expect(lightboxPanX()).toBe(24)
    expect(lightboxPanY()).toBe(-8)
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

test('resetOpenedFolder unloads the gallery', () =>
  context.start(() => {
    loadGalleryState({ tree: mockFolderTree })
    pendingFolderRestore.set(createMockDirHandle('pending'))
    const firstImage = [...visibleIndexMap().keys()][0]
    expect(firstImage).toBeDefined()
    openLightbox(firstImage!)
    expect(lightboxOpen()).toBe(true)
    expect(galleryContentMode()).toBe('gallery')

    resetOpenedFolder()

    expect(folderTree()).toBeNull()
    expect(currentFolder()).toBeNull()
    expect(pendingFolderRestore()).toBeNull()
    expect(lightboxOpen()).toBe(false)
    expect(lightboxImage()).toBeNull()
    expect(galleryContentMode()).toBe('empty')
    expect(visibleIndexMap().size).toBe(0)
  }))
