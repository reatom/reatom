import { abortVar, throwAbort, wrap } from '@reatom/core'

import type { ParsingProgressSnapshot } from './models/contracts'
import type { FolderNode, ImageFile } from './types'
import { IMAGE_EXTENSIONS } from './types'

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

type FlatEntry = {
  fileHandle: FileSystemFileHandle
  folder: FolderNode
}

export type ScanDirectoryOptions = {
  onProgress?: (snapshot: ParsingProgressSnapshot) => void
}

export async function scanDirectoryRecursive(
  rootHandle: FileSystemDirectoryHandle,
  options?: ScanDirectoryOptions,
): Promise<{ tree: FolderNode; images: ImageFile[] }> {
  let progress: ParsingProgressSnapshot = { total: 0, current: 0 }

  const reportProgress = (
    next:
      | ParsingProgressSnapshot
      | ((state: ParsingProgressSnapshot) => ParsingProgressSnapshot),
  ) => {
    progress = typeof next === 'function' ? next(progress) : next
    options?.onProgress?.(progress)
  }

  reportProgress({ total: 0, current: 0 })
  abortVar.subscribe(() => reportProgress({ total: 0, current: 0 }))

  const flatEntries: FlatEntry[] = []

  async function walkTree(
    dirHandle: FileSystemDirectoryHandle,
    currentPath: string,
  ): Promise<FolderNode> {
    const folderNode: FolderNode = {
      name: dirHandle.name,
      path: currentPath,
      handle: dirHandle,
      images: [],
      children: [],
      imageCount: 0,
    }
    let imageCount = 0
    const subdirectoryHandles: FileSystemDirectoryHandle[] = []

    const iterator = dirHandle.values()
    while (true) {
      if (abortVar.require().signal.aborted) throwAbort()
      const { value: entry, done } = await wrap(iterator.next())
      if (done) break
      if (entry.kind === 'file') {
        const extension = getFileExtension(entry.name)
        if (IMAGE_EXTENSIONS.includes(extension)) {
          const fileHandle = entry as FileSystemFileHandle
          imageCount++
          flatEntries.push({ fileHandle, folder: folderNode })
        }
      } else if (entry.kind === 'directory') {
        subdirectoryHandles.push(entry as FileSystemDirectoryHandle)
      }
    }

    for (const subDirHandle of subdirectoryHandles) {
      const childPath = currentPath
        ? `${currentPath}/${subDirHandle.name}`
        : subDirHandle.name
      const childNode = await wrap(walkTree(subDirHandle, childPath))
      folderNode.children.push(childNode)
      imageCount += childNode.imageCount
    }

    folderNode.imageCount = imageCount

    reportProgress((state) => ({
      ...state,
      total: Math.max(state.total, imageCount),
    }))

    return folderNode
  }

  const walkRoot = await wrap(walkTree(rootHandle, ''))

  const CONCURRENCY = 20

  async function processWithPool(items: FlatEntry[]): Promise<ImageFile[]> {
    const imageEntries = new Array<ImageFile>(items.length)
    let nextIndex = 0
    let processed = 0

    async function runNext(): Promise<void> {
      while (nextIndex < items.length) {
        if (abortVar.require().signal.aborted) throwAbort()
        const idx = nextIndex++
        const { fileHandle, folder } = items[idx]!
        const file = await wrap(fileHandle.getFile())
        imageEntries[idx] = {
          id: crypto.randomUUID(),
          name: file.name,
          path: folder.path,
          relativePath: folder.path ? `${folder.path}/${file.name}` : file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
          fileHandle,
        } satisfies ImageFile

        processed++
        reportProgress((state) => ({
          ...state,
          current: processed,
        }))
      }
    }

    await wrap(
      Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, items.length) }, () =>
          runNext(),
        ),
      ),
    )

    for (let index = 0; index < items.length; index++) {
      const { folder } = items[index]!
      folder.images.push(imageEntries[index]!)
    }
    return imageEntries
  }

  const images = await wrap(processWithPool(flatEntries))

  return { tree: walkRoot, images }
}

export const parseDirectoryRecursive = scanDirectoryRecursive
