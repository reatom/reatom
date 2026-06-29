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
  name: string
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
          flatEntries.push({ fileHandle, folder: folderNode, name: entry.name })
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

  function createImageEntries(items: FlatEntry[]): ImageFile[] {
    return items.map(({ fileHandle, folder, name }, index) => {
      if (abortVar.require().signal.aborted) throwAbort()

      const image = {
        id: `${folder.path}/${name}#${index}`,
        name,
        path: folder.path,
        relativePath: folder.path ? `${folder.path}/${name}` : name,
        fileHandle,
      } satisfies ImageFile

      folder.images.push(image)
      reportProgress((state) => ({
        ...state,
        current: index + 1,
      }))

      return image
    })
  }

  const images = createImageEntries(flatEntries)

  return { tree: walkRoot, images }
}

export const parseDirectoryRecursive = scanDirectoryRecursive
