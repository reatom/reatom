import { clearStack, context, urlAtom, wrap } from '@reatom/core'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { createMockDirHandle } from '../__fixtures__/fixtureLoader'
import { currentImages, visibleImages } from './collection'
import * as imageEngine from '../image-engine'
import * as imageModels from './image'
import { activeGalleryScope } from './galleryScope'
import { mockFolderTree } from '../__fixtures__/mockData'
import { loadGalleryState } from '../shared/testSetup'
import { listPreviewWidth, viewMode } from './view'
import { includeSubfolders, sortField, searchQuery } from './filters'
import { currentFolder, folderTree, selectedFolderHandle } from './folder'
import {
  openFolder,
  resetOpenedFolder,
  restoreSelectedFolder,
  pendingFolderRestore,
} from './folderOpen'
import {
  bindGalleryRoute,
  discoverFolderChildren,
  galleryRoute,
  galleryLoader,
} from './folderRoute'

function directory(name: string, entries: FileSystemHandle[] = []) {
  return Object.assign(createMockDirHandle(name), {
    values: vi.fn(async function* () {
      yield* entries
    }),
    getDirectoryHandle: vi.fn(async (name: string) => {
      const entry = entries.find(
        (entry) => entry.kind === 'directory' && entry.name === name,
      )
      if (!entry) throw new DOMException('Directory removed', 'NotFoundError')
      return entry as FileSystemDirectoryHandle
    }),
  })
}
function image(name: string) {
  return {
    name,
    kind: 'file',
    getFile: vi.fn(),
  } as unknown as FileSystemFileHandle
}

const frameTimers = new Set<ReturnType<typeof setTimeout>>()
beforeEach(() => {
  clearStack()
  vi.stubGlobal('showDirectoryPicker', vi.fn())
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const timer = setTimeout(() => {
      frameTimers.delete(timer)
      callback(performance.now())
    }, 0)
    frameTimers.add(timer)
    return timer
  })
  vi.stubGlobal('cancelAnimationFrame', clearTimeout)
})
afterEach(() => {
  frameTimers.forEach(clearTimeout)
  frameTimers.clear()
  vi.unstubAllGlobals()
})

function location(search = '') {
  urlAtom.syncFromSource(new URL(`https://example.test/host/gallery/${search}`))
}

test('restore resolves an escaped deep link without scanning sibling images', () =>
  context.start(async () => {
    const target = directory('旅行 #100%', [image('target.jpg')])
    const album = directory('Albums 2026', [image('ancestor.jpg'), target])
    const unrelated = directory('Unrelated', [image('unrelated.jpg')])
    const root = directory('Root', [image('root.jpg'), album, unrelated])
    const path = 'Albums 2026/旅行 #100%'
    location(`?folder=${encodeURIComponent(path)}`)
    selectedFolderHandle.set(root)
    await wrap(restoreSelectedFolder())

    expect(currentFolder()?.path).toBe(path)
    expect(currentImages().map((image) => image.source.relativePath)).toEqual([
      `${path}/target.jpg`,
    ])
    expect(urlAtom().pathname).toBe('/host/gallery/')
    expect(urlAtom().searchParams.get('folder')).toBe(path)
    expect(root.getDirectoryHandle).toHaveBeenCalledWith('Albums 2026')
    expect(album.getDirectoryHandle).toHaveBeenCalledWith('旅行 #100%')
    expect(unrelated.values).not.toHaveBeenCalled()
    expect(folderTree()?.images).toEqual([])
    expect(
      folderTree()?.children.find((child) => child.name === 'Unrelated')
        ?.loaded,
    ).toBe(false)
    resetOpenedFolder()
  }))

test('root and All folders preserve their different recursive scopes', () =>
  context.start(async () => {
    const child = directory('child', [image('child.jpg')])
    const root = directory('Root', [image('root.jpg'), child])
    location()
    includeSubfolders.setFalse()
    const unbind = bindGalleryRoute()
    await wrap(openFolder(root))
    expect(currentImages().map((image) => image.source.name)).toEqual([
      'root.jpg',
    ])
    expect(child.values).not.toHaveBeenCalled()

    galleryRoute.go({ all: '1' })
    await wrap(galleryRoute.loader())
    expect(currentFolder()).toBeNull()
    expect(currentImages().map((image) => image.source.name)).toEqual([
      'root.jpg',
      'child.jpg',
    ])

    const rootScans = root.values.mock.calls.length
    const childScans = child.values.mock.calls.length
    galleryRoute.go({})
    await wrap(galleryRoute.loader())
    expect(currentImages()).toHaveLength(1)
    expect(root.values).toHaveBeenCalledTimes(rootScans)
    expect(child.values).toHaveBeenCalledTimes(childScans)
    includeSubfolders.setTrue()
    await wrap(galleryRoute.loader())
    expect(currentImages()).toHaveLength(2)
    expect(root.values).toHaveBeenCalledTimes(rootScans + 1)
    expect(child.values).toHaveBeenCalledTimes(childScans + 1)
    resetOpenedFolder()
    unbind()
  }))

test('navigation retains cached scopes and same-handle reopen reloads root', () =>
  context.start(async () => {
    const a = directory('a', [image('a.jpg')])
    const b = directory('b', [image('b.jpg')])
    const root = directory('Root', [image('root.jpg'), a, b])
    location()
    const unbind = bindGalleryRoute()
    await wrap(openFolder(root))
    const previous = currentImages().map((image) => vi.spyOn(image, 'dispose'))
    galleryRoute.go({ folder: 'b' })
    await wrap(galleryRoute.loader())
    expect(previous.every((dispose) => dispose.mock.calls.length === 0)).toBe(
      true,
    )
    expect(currentImages().map((image) => image.source.name)).toEqual(['b.jpg'])
    await wrap(openFolder(root))
    expect(currentFolder()?.path).toBe('')
    expect(currentImages()).toHaveLength(3)
    await wrap(openFolder(root))
    expect(currentImages()).toHaveLength(3)
    resetOpenedFolder()
    unbind()
  }))

test('denied restore leaves its deep link intact without directory access', () =>
  context.start(async () => {
    const root = Object.assign(directory('Root'), {
      queryPermission: vi.fn(async () => 'prompt' as const),
    })
    location('?folder=private%2Fphotos')
    selectedFolderHandle.set(root)
    const unbind = bindGalleryRoute()
    await wrap(restoreSelectedFolder())
    expect(pendingFolderRestore()).toBe(root)
    expect(urlAtom().searchParams.get('folder')).toBe('private/photos')
    expect(root.values).not.toHaveBeenCalled()
    expect(root.getDirectoryHandle).not.toHaveBeenCalled()
    resetOpenedFolder()
    unbind()
  }))

test('a missing folder recovers to root and invalid traversal never resolves a directory', () =>
  context.start(async () => {
    const root = directory('Root', [image('root.jpg')])
    location('?folder=removed')
    selectedFolderHandle.set(root)
    const unbind = bindGalleryRoute()
    await wrap(restoreSelectedFolder())
    await wrap(galleryRoute.loader())
    expect(urlAtom().searchParams.has('folder')).toBe(false)
    expect(currentFolder()?.path).toBe('')
    root.getDirectoryHandle.mockClear()
    urlAtom.go('?folder=..%2Fprivate')
    await wrap(galleryRoute.loader())
    expect(currentImages()).toHaveLength(1)
    expect(root.getDirectoryHandle).not.toHaveBeenCalled()
    resetOpenedFolder()
    unbind()
  }))

test('late shell expansion cannot erase a newly scanned selected subtree', () =>
  context.start(async () => {
    const leaf = directory('leaf', [image('leaf.jpg')])
    const child = directory('child', [leaf])
    const root = directory('Root', [child])
    location()
    includeSubfolders.setFalse()
    const unbind = bindGalleryRoute()
    await wrap(openFolder(root))
    const shell = folderTree()!.children[0]!
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    child.values.mockImplementationOnce(async function* () {
      await gate
      yield leaf
    })
    const discovery = discoverFolderChildren(shell).catch(() => null)
    galleryRoute.go({ folder: 'child' })
    includeSubfolders.setTrue()
    await wrap(galleryRoute.loader())
    release()
    await wrap(discovery)
    expect(currentImages().map((image) => image.source.name)).toEqual([
      'leaf.jpg',
    ])
    expect(folderTree()?.children[0]?.children[0]?.images).toHaveLength(0)
    resetOpenedFolder()
    unbind()
  }))

test('a superseded route scan cannot publish late image batches', () =>
  context.start(async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const a = directory('a', [image('a.jpg')])
    a.values.mockImplementation(async function* () {
      yield image('first.jpg')
      await gate
      yield image('late.jpg')
    })
    const b = directory('b', [image('b.jpg')])
    const root = directory('Root', [a, b])
    location('?folder=a')
    selectedFolderHandle.set(root)
    const unbind = bindGalleryRoute()
    const opening = restoreSelectedFolder().catch(() => null)
    await wrap(vi.waitFor(wrap(() => expect(currentFolder()?.path).toBe('a'))))
    galleryRoute.go({ folder: 'b' })
    await wrap(galleryRoute.loader())
    release()
    await wrap(opening)
    expect(currentFolder()?.path).toBe('b')
    expect(currentImages().map((image) => image.source.name)).toEqual(['b.jpg'])
    galleryRoute.go({ folder: 'a' })
    await wrap(galleryLoader())
    expect(a.values).toHaveBeenCalledTimes(2)
    expect(currentImages().map((image) => image.source.name)).toEqual([
      'first.jpg',
      'late.jpg',
    ])
    resetOpenedFolder()
    unbind()
  }))

test('replacing the authorized root drops old models even for identical file paths', () =>
  context.start(async () => {
    const firstHandle = image('same.jpg')
    const nextHandle = image('same.jpg')
    location()
    const unbind = bindGalleryRoute()
    await wrap(openFolder(directory('Root', [firstHandle])))
    const previous = currentImages()[0]!
    const dispose = vi.spyOn(previous, 'dispose')
    await wrap(openFolder(directory('Root', [nextHandle])))
    const next = currentImages()[0]!
    expect(next.source.id).toBe(previous.source.id)
    expect(next).not.toBe(previous)
    expect(next.source.fileHandle).toBe(nextHandle)
    expect(dispose).toHaveBeenCalledOnce()
    resetOpenedFolder()
    unbind()
  }))

test('independent concurrent shell expansions retain both discovered branches', () =>
  context.start(async () => {
    const aLeaf = directory('a-leaf')
    const bLeaf = directory('b-leaf')
    const a = directory('a', [aLeaf])
    const b = directory('b', [bLeaf])
    const root = directory('Root', [a, b])
    location()
    includeSubfolders.setFalse()
    const unbind = bindGalleryRoute()
    await wrap(openFolder(root))
    const [aShell, bShell] = folderTree()!.children
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    a.values.mockImplementationOnce(async function* () {
      await gate
      yield aLeaf
    })
    const first = discoverFolderChildren(aShell!)
    await wrap(discoverFolderChildren(bShell!))
    expect(folderTree()!.children[0]).toBe(aShell)
    release()
    await wrap(first)
    expect(
      folderTree()!.children.map((child) => child.children[0]?.name),
    ).toEqual(['a-leaf', 'b-leaf'])
    resetOpenedFolder()
    unbind()
  }))

test('progressive selected scan batches retain completed unrelated shell expansion', () =>
  context.start(async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const a = directory('a')
    a.values.mockImplementation(async function* () {
      yield image('first.jpg')
      await gate
      yield image('last.jpg')
    })
    const bLeaf = directory('nested')
    const b = directory('b', [bLeaf])
    const root = directory('Root', [a, b])
    location('?folder=a')
    selectedFolderHandle.set(root)
    const unbind = bindGalleryRoute()
    const opening = restoreSelectedFolder()
    await wrap(vi.waitFor(wrap(() => expect(currentFolder()?.path).toBe('a'))))
    const bShell = folderTree()!.children.find((child) => child.name === 'b')!
    await wrap(discoverFolderChildren(bShell))
    expect(
      folderTree()!.children.find((child) => child.name === 'b')!.children[0]
        ?.name,
    ).toBe('nested')
    release()
    await wrap(opening)
    expect(
      folderTree()!.children.find((child) => child.name === 'b')!.children[0]
        ?.name,
    ).toBe('nested')
    expect(currentImages()).toHaveLength(2)
    resetOpenedFolder()
    unbind()
  }))

test('expanding known deep-link ancestors preserves selected images without relisting', () =>
  context.start(async () => {
    const target = directory('target', [image('target.jpg')])
    const album = directory('album', [target])
    const root = directory('Root', [album])
    location('?folder=album%2Ftarget')
    selectedFolderHandle.set(root)
    const unbind = bindGalleryRoute()
    await wrap(restoreSelectedFolder())
    const selected = currentImages()[0]!
    const tree = folderTree()!
    const albumShell = tree.children[0]!
    expect(tree.childrenLoaded).toBe(true)
    expect(albumShell.childrenLoaded).toBe(true)
    root.values.mockClear()
    album.values.mockClear()
    await wrap(discoverFolderChildren(tree))
    await wrap(discoverFolderChildren(albumShell))
    expect(root.values).not.toHaveBeenCalled()
    expect(album.values).not.toHaveBeenCalled()
    expect(folderTree()).toBe(tree)
    expect(currentImages()).toEqual([selected])
    expect(currentFolder()?.path).toBe('album/target')
    resetOpenedFolder()
    unbind()
  }))

test('A to B to A reuses live scope models and completed thumbnails without IO', () =>
  context.start(async () => {
    viewMode.setList()
    const meta = vi
      .spyOn(imageEngine, 'parseImagePreviewMeta')
      .mockResolvedValue({
        width: 100,
        height: 100,
        format: 'jpeg',
        isProgressive: false,
        hasExifThumbnail: false,
      })
    const thumbnail = vi
      .spyOn(imageEngine, 'loadThumbnailWithMeta')
      .mockResolvedValue({
        url: 'blob:cache-test',
        width: 100,
        height: 100,
        source: 'generated',
      })
    const aFile = image('a.jpg')
    const bFile = image('b.jpg')
    const aBlob = new File(['a'], 'a.jpg')
    vi.mocked(aFile.getFile).mockResolvedValue(aBlob)
    vi.mocked(bFile.getFile).mockResolvedValue(new File(['b'], 'b.jpg'))
    const a = directory('a', [aFile])
    const b = directory('b', [bFile])
    const root = directory('Root', [a, b])
    location('?folder=a')
    selectedFolderHandle.set(root)
    const unbind = bindGalleryRoute()
    const stopDemand = visibleImages.subscribe(() => {})
    await wrap(restoreSelectedFolder())
    await wrap(currentImages()[0]!.thumbnail())
    const original = currentImages()[0]!
    const artifact = original.thumbnail.data()
    const aReads = vi.mocked(aFile.getFile).mock.calls.length
    const aParses = meta.mock.calls.filter(([blob]) => blob === aBlob).length
    const aDecodes = thumbnail.mock.calls.filter(
      ([blob]) => blob === aBlob,
    ).length
    const disposeOriginal = vi.spyOn(original, 'dispose')
    galleryRoute.go({ folder: 'b' })
    await wrap(galleryLoader())
    const bModel = currentImages()[0]!
    const disposeB = vi.spyOn(bModel, 'dispose')
    const stopOldPending = original.thumbnail.pending.subscribe(() => {})
    sortField.set('size')
    searchQuery.set('b')
    listPreviewWidth.set(150)
    await wrap(new Promise((resolve) => setTimeout(resolve, 20)))
    expect(aFile.getFile).toHaveBeenCalledTimes(aReads)
    expect(meta.mock.calls.filter(([blob]) => blob === aBlob)).toHaveLength(
      aParses,
    )
    expect(
      thumbnail.mock.calls.filter(([blob]) => blob === aBlob),
    ).toHaveLength(aDecodes)
    sortField.set('name')
    searchQuery.set('')
    listPreviewWidth.set(82)
    stopOldPending()
    const counts = [
      root.values.mock.calls.length,
      root.getDirectoryHandle.mock.calls.length,
      a.values.mock.calls.length,
    ]
    galleryRoute.go({ folder: 'a' })
    await wrap(galleryLoader())
    expect([
      root.values.mock.calls.length,
      root.getDirectoryHandle.mock.calls.length,
      a.values.mock.calls.length,
    ]).toEqual(counts)
    expect(currentFolder()?.path).toBe('a')
    expect(currentImages().map((image) => image.source.name)).toEqual(['a.jpg'])
    expect(currentImages()[0]).toBe(original)
    await wrap(original.thumbnail())
    expect(original.thumbnail.data()).toBe(artifact)
    expect(aFile.getFile).toHaveBeenCalledTimes(aReads)
    expect(meta.mock.calls.filter(([blob]) => blob === aBlob)).toHaveLength(
      aParses,
    )
    expect(
      thumbnail.mock.calls.filter(([blob]) => blob === aBlob),
    ).toHaveLength(aDecodes)
    expect(disposeOriginal).not.toHaveBeenCalled()
    expect(disposeB).not.toHaveBeenCalled()
    const bScans = b.values.mock.calls.length
    const rootScans = root.values.mock.calls.length
    const lookups = root.getDirectoryHandle.mock.calls.length
    galleryRoute.go({ folder: 'b' })
    await wrap(galleryLoader())
    expect(b.values).toHaveBeenCalledTimes(bScans)
    expect(root.values).toHaveBeenCalledTimes(rootScans)
    expect(root.getDirectoryHandle).toHaveBeenCalledTimes(lookups)
    expect(currentImages().map((image) => image.source.name)).toEqual(['b.jpg'])
    const active = currentImages()[0]!
    const disposeActive = vi.spyOn(active, 'dispose')
    await wrap(galleryLoader.retry())
    expect(currentImages()[0]).toBe(active)
    expect(disposeActive).not.toHaveBeenCalled()
    expect(b.values.mock.calls.length).toBe(bScans)
    resetOpenedFolder()
    await wrap(galleryLoader())
    expect(galleryLoader.cacheAtom().size).toBe(0)
    stopDemand()
    meta.mockRestore()
    thumbnail.mockRestore()
    unbind()
  }))

test('explicit same-handle reopen invalidates cached directory contents', () =>
  context.start(async () => {
    const entries: FileSystemHandle[] = [image('first.jpg')]
    const root = directory('Root', entries)
    location()
    const unbind = bindGalleryRoute()
    await wrap(openFolder(root))
    entries.push(image('added.jpg'))
    await wrap(galleryLoader.retry())
    expect(currentImages()).toHaveLength(1)
    await wrap(openFolder(root))
    expect(currentImages().map((image) => image.source.name)).toEqual([
      'added.jpg',
      'first.jpg',
    ])
    resetOpenedFolder()
    unbind()
  }))

test('preloaded selection creates models only for its selected subtree', () =>
  context.start(() => {
    const create = vi.spyOn(imageModels, 'reatomGalleryImage')
    loadGalleryState({
      tree: mockFolderTree,
      currentFolderNode: mockFolderTree.children[0],
    })
    expect(currentImages()).toHaveLength(2)
    expect(create).toHaveBeenCalledTimes(2)
    function empty(tree: NonNullable<ReturnType<typeof folderTree>>): boolean {
      return tree.images.length === 0 && tree.children.every(empty)
    }
    expect(empty(folderTree()!)).toBe(true)
    resetOpenedFolder()
    create.mockRestore()
  }))

test('length eviction disposes inactive scopes once and pins an evicted active scope until leaving', () =>
  context.start(async () => {
    const children = Array.from({ length: 7 }, (_, i) =>
      directory(String(i), [image(`${i}.jpg`)]),
    )
    const root = directory('Root', children)
    location('?folder=0')
    selectedFolderHandle.set(root)
    const unbind = bindGalleryRoute()
    await wrap(restoreSelectedFolder())
    const first = currentImages()[0]!
    const disposeFirst = vi.spyOn(first, 'dispose')
    for (let i = 1; i <= 5; i++) {
      galleryRoute.go({ folder: String(i) })
      await wrap(galleryLoader())
      currentImages()
    }
    expect(galleryLoader.cacheAtom().size).toBe(5)
    expect(disposeFirst).toHaveBeenCalledOnce()
    const active = currentImages()[0]!
    const disposeActive = vi.spyOn(active, 'dispose')
    const activeScope = activeGalleryScope()!
    galleryLoader.cacheAtom.clear()
    expect(currentImages()[0]).toBe(active)
    expect(disposeActive).not.toHaveBeenCalled()
    galleryRoute.go({ folder: '6' })
    await wrap(galleryLoader())
    expect(activeGalleryScope()).not.toBe(activeScope)
    expect(disposeActive).toHaveBeenCalledOnce()
    resetOpenedFolder()
    expect(disposeFirst).toHaveBeenCalledOnce()
    expect(disposeActive).toHaveBeenCalledOnce()
    unbind()
  }))

test('resetting one simultaneous Reatom context leaves the other warm scope intact', async () => {
  const first = context.start()
  const second = context.start()
  let other!: ReturnType<typeof currentImages>[number]
  let disposeOther!: ReturnType<typeof vi.spyOn>
  first.run(() => loadGalleryState({ tree: mockFolderTree }))
  second.run(() => {
    loadGalleryState({ tree: mockFolderTree })
    other = currentImages()[0]!
    disposeOther = vi.spyOn(other, 'dispose')
  })
  first.run(resetOpenedFolder)
  second.run(() => {
    expect(currentImages()[0]).toBe(other)
    expect(disposeOther).not.toHaveBeenCalled()
    resetOpenedFolder()
  })
  await Promise.resolve()
  await Promise.resolve()
  second.run(() => expect(disposeOther).toHaveBeenCalledOnce())
})

test('five-minute expiry disposes inactive scopes while the active scope stays pinned', async () => {
  vi.useFakeTimers()
  try {
    await context.start(async () => {
      const a = directory('a')
      const b = directory('b')
      const root = directory('Root', [a, b])
      location('?folder=a')
      selectedFolderHandle.set(root)
      const unbind = bindGalleryRoute()
      await wrap(restoreSelectedFolder())
      const aScope = activeGalleryScope()!
      const disposeA = vi.spyOn(aScope, 'dispose')
      galleryRoute.go({ folder: 'b' })
      await wrap(galleryLoader())
      const bScope = activeGalleryScope()!
      const disposeB = vi.spyOn(bScope, 'dispose')
      await wrap(vi.advanceTimersByTimeAsync(300_001))
      expect(galleryLoader.cacheAtom().size).toBe(0)
      expect(disposeA).toHaveBeenCalledOnce()
      expect(activeGalleryScope()).toBe(bScope)
      expect(disposeB).not.toHaveBeenCalled()
      galleryRoute.go({ folder: 'a' })
      await wrap(galleryLoader())
      expect(activeGalleryScope()).not.toBe(aScope)
      expect(disposeB).toHaveBeenCalledOnce()
      resetOpenedFolder()
      expect(disposeA).toHaveBeenCalledOnce()
      expect(disposeB).toHaveBeenCalledOnce()
      unbind()
    })
  } finally {
    vi.useRealTimers()
  }
})

test('an old pending observer cannot restart inactive scope IO and the cached model resumes on return', () =>
  context.start(async () => {
    viewMode.setList()
    const aBlob = new File(['a'], 'a.jpg')
    const bBlob = new File(['b'], 'b.jpg')
    const aFile = image('a.jpg')
    const bFile = image('b.jpg')
    vi.mocked(aFile.getFile).mockResolvedValue(aBlob)
    vi.mocked(bFile.getFile).mockResolvedValue(bBlob)
    const meta = vi
      .spyOn(imageEngine, 'parseImagePreviewMeta')
      .mockResolvedValue({
        width: 100,
        height: 100,
        format: 'jpeg',
        isProgressive: false,
        hasExifThumbnail: false,
      })
    let release!: (value: imageEngine.ThumbnailResult) => void
    let first = true
    const thumbnail = vi
      .spyOn(imageEngine, 'loadThumbnailWithMeta')
      .mockImplementation(async (blob) => {
        if (blob === aBlob && first) {
          first = false
          return new Promise((resolve) => {
            release = resolve
          })
        }
        return {
          url: blob === aBlob ? 'blob:a-resumed' : 'blob:b',
          width: 100,
          height: 100,
          source: 'generated',
        }
      })
    const root = directory('Root', [
      directory('a', [aFile]),
      directory('b', [bFile]),
    ])
    location('?folder=a')
    selectedFolderHandle.set(root)
    const unbind = bindGalleryRoute()
    const stopDemand = visibleImages.subscribe(() => {})
    await wrap(restoreSelectedFolder())
    const aModel = currentImages()[0]!
    const stopOldObserver = aModel.thumbnail.pending.subscribe(() => {})
    await wrap(vi.waitFor(() => expect(release).toBeTypeOf('function')))
    galleryRoute.go({ folder: 'b' })
    await wrap(galleryLoader())
    sortField.set('size')
    searchQuery.set('b')
    listPreviewWidth.set(150)
    await wrap(new Promise((resolve) => setTimeout(resolve, 20)))
    expect(aFile.getFile).toHaveBeenCalledOnce()
    expect(
      thumbnail.mock.calls.filter(([blob]) => blob === aBlob),
    ).toHaveLength(1)
    release({
      url: 'blob:a-cancelled',
      width: 100,
      height: 100,
      source: 'generated',
    })
    sortField.set('name')
    searchQuery.set('')
    listPreviewWidth.set(82)
    galleryRoute.go({ folder: 'a' })
    await wrap(galleryLoader())
    expect(currentImages()[0]).toBe(aModel)
    await wrap(aModel.thumbnail())
    expect(aModel.thumbnail.data()?.url).toBe('blob:a-resumed')
    expect(aFile.getFile).toHaveBeenCalledOnce()
    expect(
      thumbnail.mock.calls.filter(([blob]) => blob === aBlob),
    ).toHaveLength(2)
    stopOldObserver()
    stopDemand()
    resetOpenedFolder()
    unbind()
    meta.mockRestore()
    thumbnail.mockRestore()
  }))

test('scanning a child preserves already known direct image counts on its ancestors', () =>
  context.start(async () => {
    const child = directory('child', [
      image('a.jpg'),
      image('b.jpg'),
      image('c.jpg'),
    ])
    const root = directory('Root', [
      image('root-a.jpg'),
      image('root-b.jpg'),
      child,
    ])
    location()
    includeSubfolders.setTrue()
    const unbind = bindGalleryRoute()
    await wrap(openFolder(root))
    expect(folderTree()?.imageCount).toBe(5)
    expect(folderTree()?.children[0]?.imageCount).toBe(3)
    galleryRoute.go({ folder: 'child' })
    await wrap(galleryLoader())
    expect(currentImages()).toHaveLength(3)
    expect(folderTree()?.imageCount).toBe(5)
    expect(folderTree()?.children[0]?.imageCount).toBe(3)
    expect(folderTree()?.images).toEqual([])
    resetOpenedFolder()
    unbind()
  }))

test('shallow root scans preserve known deep directory metadata without importing descendant image models', () =>
  context.start(async () => {
    const target = directory('target', [image('target.jpg')])
    const album = directory('album', [target])
    const root = directory('Root', [image('root.jpg'), album])
    location('?folder=album%2Ftarget')
    includeSubfolders.setFalse()
    selectedFolderHandle.set(root)
    const unbind = bindGalleryRoute()
    await wrap(restoreSelectedFolder())
    const original = currentImages()[0]!
    expect(folderTree()?.children[0]?.children[0]?.imageCount).toBe(1)
    galleryRoute.go({})
    await wrap(galleryLoader())
    expect(currentImages().map((image) => image.source.name)).toEqual([
      'root.jpg',
    ])
    expect(folderTree()?.imageCount).toBe(2)
    expect(folderTree()?.children[0]?.childrenLoaded).toBe(true)
    expect(folderTree()?.children[0]?.children[0]?.imageCount).toBe(1)
    expect(folderTree()?.children[0]?.children[0]?.images).toEqual([])
    const calls = [
      root.values.mock.calls.length,
      album.values.mock.calls.length,
      target.values.mock.calls.length,
    ]
    galleryRoute.go({ folder: 'album/target' })
    await wrap(galleryLoader())
    expect(currentImages()).toEqual([original])
    expect([
      root.values.mock.calls.length,
      album.values.mock.calls.length,
      target.values.mock.calls.length,
    ]).toEqual(calls)
    resetOpenedFolder()
    unbind()
  }))

test('a completed shallow directory listing removes previously known directories that disappeared', () =>
  context.start(async () => {
    const target = directory('target', [image('target.jpg')])
    const album = directory('album', [target])
    const entries: FileSystemHandle[] = [album]
    const root = directory('Root', entries)
    location('?folder=album%2Ftarget')
    includeSubfolders.setFalse()
    selectedFolderHandle.set(root)
    const unbind = bindGalleryRoute()
    await wrap(restoreSelectedFolder())
    expect(folderTree()?.children).toHaveLength(1)
    entries.length = 0
    galleryRoute.go({})
    await wrap(galleryLoader())
    expect(folderTree()?.childrenLoaded).toBe(true)
    expect(folderTree()?.children).toEqual([])
    expect(folderTree()?.imageCount).toBe(0)
    resetOpenedFolder()
    unbind()
  }))
