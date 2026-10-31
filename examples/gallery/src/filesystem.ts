import { abortVar, rAF, take, throwAbort, wrap } from '@reatom/core'

import type { FolderScanResult } from './models/contracts'
import type { FolderNode, ImageFile } from './types'
import { IMAGE_EXTENSIONS } from './types'

const DIRECTORY_SCAN_BUDGET_MS = 16
const DIRECTORY_SCAN_BATCH_IMAGES = 64

export function isFileSystemAccessSupported(): boolean {
  return 'showDirectoryPicker' in globalThis
}

declare function showDirectoryPicker(options?: {
  mode?: string
}): Promise<FileSystemDirectoryHandle>

export async function pickDirectory(): Promise<FileSystemDirectoryHandle> {
  return await wrap(showDirectoryPicker({ mode: 'read' }))
}

function getFileExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf('.')
  if (dotIndex === -1) return ''
  return filename.slice(dotIndex).toLowerCase()
}

function isFileHandle(entry: FileSystemHandle): entry is FileSystemFileHandle {
  return entry.kind === 'file'
}

function isDirectoryHandle(
  entry: FileSystemHandle,
): entry is FileSystemDirectoryHandle {
  return entry.kind === 'directory'
}

export type ScanDirectoryOptions = {
  onBatch?: (result: FolderScanResult) => void
}

export async function scanDirectoryRecursive(
  rootHandle: FileSystemDirectoryHandle,
  options?: ScanDirectoryOptions,
): Promise<FolderScanResult> {
  let batchImages = 0
  let firstImagePublished = false
  let batchStarted = performance.now()
  const dirtyFolders = new Set<FolderNode>()
  const snapshots = new WeakMap<FolderNode, FolderNode>()

  function createFolder(
    handle: FileSystemDirectoryHandle,
    path: string,
  ): FolderNode {
    const folder: FolderNode = {
      name: handle.name,
      path,
      handle,
      images: [],
      children: [],
      imageCount: 0,
    }
    dirtyFolders.add(folder)
    return folder
  }

  // Published arrays must stay immutable; unchanged branches keep their models.
  function snapshot(folder: FolderNode): FolderNode {
    const cached = snapshots.get(folder)
    if (cached && !dirtyFolders.has(folder)) return cached
    const next = {
      ...folder,
      images: [...folder.images],
      children: folder.children.map(snapshot),
    }
    snapshots.set(folder, next)
    dirtyFolders.delete(folder)
    return next
  }

  const root = createFolder(rootHandle, '')

  async function walkTree(
    folderNode: FolderNode,
    ancestors: FolderNode[],
  ): Promise<void> {
    const currentPath = folderNode.path
    const branch = [...ancestors, folderNode]
    const subdirectoryHandles: FileSystemDirectoryHandle[] = []

    const iterator = folderNode.handle.values()
    while (true) {
      if (abortVar.require().signal.aborted) throwAbort()
      const { value: entry, done } = await wrap(iterator.next())
      if (done) break
      if (isFileHandle(entry)) {
        const extension = getFileExtension(entry.name)
        if (IMAGE_EXTENSIONS.includes(extension)) {
          const image: ImageFile = {
            id: `${currentPath}/${entry.name}#${folderNode.images.length}`,
            name: entry.name,
            path: currentPath,
            relativePath: currentPath
              ? `${currentPath}/${entry.name}`
              : entry.name,
            rootName: rootHandle.name,
            fileHandle: entry,
          }
          folderNode.images.push(image)
          batchImages++
          for (const folder of branch) {
            folder.imageCount++
            dirtyFolders.add(folder)
          }
        }
      } else if (isDirectoryHandle(entry)) {
        subdirectoryHandles.push(entry)
      }

      if (
        (!firstImagePublished && root.imageCount > 0) ||
        batchImages >= DIRECTORY_SCAN_BATCH_IMAGES ||
        performance.now() - batchStarted >= DIRECTORY_SCAN_BUDGET_MS
      ) {
        options?.onBatch?.({ tree: snapshot(root) })
        firstImagePublished = root.imageCount > 0
        batchImages = 0
        // Start the first preview immediately and bound downstream model/DOM work
        // even when directory iteration itself is cheap. A single rAF resumes
        // in a pre-paint microtask; the second leaves a frame for layout/paint
        // and concurrent thumbnail work before the next scanning burst.
        await wrap(take(rAF, 'renderBatch'))
        const frame = await wrap(take(rAF, 'resumeScan'))
        batchStarted = frame.timestamp
      }
    }

    for (const subDirHandle of subdirectoryHandles) {
      const childPath = currentPath
        ? `${currentPath}/${subDirHandle.name}`
        : subDirHandle.name
      const childNode = createFolder(subDirHandle, childPath)
      folderNode.children.push(childNode)
      for (const folder of branch) dirtyFolders.add(folder)
      await wrap(walkTree(childNode, branch))
    }
  }

  await wrap(walkTree(root, []))

  return { tree: snapshot(root) }
}
