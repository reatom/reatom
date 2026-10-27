import { clearStack, context, sleep, wrap } from '@reatom/core'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { createMockDirHandle } from '../__fixtures__/fixtureLoader'
import { mockFolderTree } from '../__fixtures__/mockData'
import { loadGalleryState } from '../shared/testSetup'
import type { FolderNode } from '../types'
import { currentImages } from './collection'
import { currentFolder, folderTree, selectedFolderHandle } from './folder'
import {
  openFolder,
  pickAndOpenFolder,
  restoreSelectedFolder,
  requestFolderRestore,
  pendingFolderRestore,
  resetOpenedFolder,
} from './folderOpen'
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

for (const permissionFlow of ['restore', 'request'] as const) {
  test(`an explicit open supersedes a pending ${permissionFlow} permission check`, () =>
    context.start(async () => {
      let finishPermission!: (permission: PermissionState) => void
      const permission = new Promise<PermissionState>((resolve) => {
        finishPermission = resolve
      })
      const old = createMockDirHandle('old')
      old.queryPermission = () => permission
      old.requestPermission = () => permission
      selectedFolderHandle.set(old)
      pendingFolderRestore.set(old)
      filesystem.scanDirectoryRecursive.mockImplementation(
        slowScan(mockFolderTree, 5),
      )

      const restore = (
        permissionFlow === 'restore'
          ? restoreSelectedFolder()
          : requestFolderRestore()
      ).catch(() => null)
      const next = createMockDirHandle('new')
      await wrap(openFolder(next))
      finishPermission('granted')
      await wrap(restore)
      await wrap(sleep(10))

      expect(selectedFolderHandle()).toBe(next)
      expect(pendingFolderRestore()).toBeNull()
      expect(filesystem.scanDirectoryRecursive).toHaveBeenCalledTimes(1)
    }))
}

test('reset cancels a pending picker before it can publish a folder', () =>
  context.start(async () => {
    let finishPicker!: (handle: FileSystemDirectoryHandle) => void
    filesystem.pickDirectory.mockReturnValue(
      new Promise<FileSystemDirectoryHandle>((resolve) => {
        finishPicker = resolve
      }),
    )
    const pick = pickAndOpenFolder().catch(() => null)
    resetOpenedFolder()
    finishPicker(createMockDirHandle('late'))
    await wrap(pick)
    await wrap(sleep(5))

    expect(folderTree()).toBeNull()
    expect(filesystem.scanDirectoryRecursive).not.toHaveBeenCalled()
  }))

test('picker scans expose parsing status and the existing cancel action', () =>
  context.start(async () => {
    filesystem.pickDirectory.mockResolvedValue(createMockDirHandle('picked'))
    filesystem.scanDirectoryRecursive.mockImplementation(
      slowScan(mockFolderTree, 50),
    )
    const pick = pickAndOpenFolder().catch(() => null)
    await wrap(sleep(5))
    expect(galleryContentMode()).toBe('parsing')
    expect(openFolder.pending()).toBe(1)
    openFolder.abort()
    await wrap(pick)
    expect(folderTree()).toBeNull()
    expect(galleryContentMode()).toBe('empty')
  }))

test('cancelling a second picker keeps the first picker accepted scan alive', () =>
  context.start(async () => {
    filesystem.scanDirectoryRecursive.mockImplementation(
      slowScan(mockFolderTree, 30),
    )
    filesystem.pickDirectory
      .mockResolvedValueOnce(createMockDirHandle('first'))
      .mockRejectedValueOnce(new DOMException('cancelled', 'AbortError'))
    const first = pickAndOpenFolder().catch(() => null)
    await wrap(sleep(5))
    await wrap(pickAndOpenFolder())
    await wrap(first)
    await wrap(sleep(40))
    expect(folderTree()).toBe(mockFolderTree)
  }))
