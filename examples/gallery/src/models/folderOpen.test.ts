import { clearStack, context, sleep, wrap } from '@reatom/core'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { createMockDirHandle } from '../__fixtures__/fixtureLoader'
import { mockFolderTree } from '../__fixtures__/mockData'
import { loadGalleryState } from '../shared/testSetup'
import type { FolderNode } from '../types'
import { currentImages } from './collection'
import { currentFolder, folderTree } from './folder'
import { openFolder, pickAndOpenFolder } from './folderOpen'
import { galleryContentMode } from './lifecycle'

const filesystem = vi.hoisted(() => ({
  pickDirectory: vi.fn(),
  scanDirectoryRecursive: vi.fn(),
}))

vi.mock('../filesystem', () => ({
  isFileSystemAccessSupported: () => true,
  pickDirectory: filesystem.pickDirectory,
  scanDirectoryRecursive: filesystem.scanDirectoryRecursive,
}))

beforeEach(() => {
  clearStack()
})

afterEach(() => {
  vi.clearAllMocks()
})

function slowScan(tree: FolderNode, delayMs: number) {
  return async () => {
    await wrap(sleep(delayMs))
    return { tree }
  }
}

test('cancelling the folder picker keeps a running scan alive', () =>
  context.start(async () => {
    filesystem.scanDirectoryRecursive.mockImplementation(
      slowScan(mockFolderTree, 30),
    )
    filesystem.pickDirectory.mockRejectedValue(
      new DOMException('cancelled', 'AbortError'),
    )

    const scan = openFolder(createMockDirHandle('scanned'))
    await wrap(sleep(5))
    await wrap(pickAndOpenFolder())
    await wrap(scan)

    expect(folderTree()).toBe(mockFolderTree)
  }))

test('opening a folder clears the previous gallery while scanning', () =>
  context.start(async () => {
    loadGalleryState({ tree: mockFolderTree })
    expect(galleryContentMode()).toBe('gallery')
    expect(currentImages().length).toBeGreaterThan(0)

    filesystem.scanDirectoryRecursive.mockImplementation(
      slowScan(mockFolderTree, 20),
    )

    const scan = openFolder(createMockDirHandle('next'))

    expect(folderTree()).toBeNull()
    expect(currentFolder()).toBeNull()
    expect(galleryContentMode()).toBe('parsing')
    expect(currentImages()).toEqual([])

    await wrap(scan)
    expect(galleryContentMode()).toBe('gallery')
  }))

test('aborting a scan leaves no stale gallery with disposed images', () =>
  context.start(async () => {
    loadGalleryState({ tree: mockFolderTree })
    filesystem.scanDirectoryRecursive.mockImplementation(
      slowScan(mockFolderTree, 50),
    )

    const scan = openFolder(createMockDirHandle('next')).catch(() => null)
    openFolder.abort('user cancelled')
    await wrap(scan)

    expect(folderTree()).toBeNull()
    expect(galleryContentMode()).toBe('empty')
  }))
