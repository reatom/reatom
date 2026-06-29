import type { FolderNode, ImageFile, ImageFileInfo } from '../types'
import { buildFixtureFolderTree, createMockDirHandle } from './fixtureLoader'

function createMockFileHandle(fileInfo: ImageFileInfo): FileSystemFileHandle {
  return {
    kind: 'file',
    name: fileInfo.name,
    getFile: () =>
      Promise.resolve(
        new File([new Uint8Array(fileInfo.size)], fileInfo.name, {
          type: fileInfo.type,
          lastModified: fileInfo.lastModified,
        }),
      ),
    isSameEntry: () => Promise.resolve(false),
  } as unknown as FileSystemFileHandle
}

type MockImageOverrides = Partial<ImageFile> & Partial<ImageFileInfo>

export function createMockImage(overrides: MockImageOverrides = {}): ImageFile {
  const id = overrides.id ?? crypto.randomUUID()
  const name = overrides.name ?? 'image.png'
  const path = overrides.path ?? ''
  const fileInfo = overrides.fileInfo ?? {
    name,
    size: overrides.size ?? 1024,
    type: overrides.type ?? 'image/png',
    lastModified: overrides.lastModified ?? Date.now(),
  }

  return {
    id,
    name,
    path,
    relativePath: path ? `${path}/${name}` : name,
    fileInfo,
    fileHandle: overrides.fileHandle ?? createMockFileHandle(fileInfo),
  }
}

export const mockImages: ImageFile[] = [
  createMockImage({
    id: 'img-1',
    name: 'photo1.jpg',
    path: '',
    size: 2048,
    lastModified: 1700000000000,
    type: 'image/jpeg',
  }),
  createMockImage({
    id: 'img-2',
    name: 'photo2.png',
    path: '',
    size: 4096,
    lastModified: 1700001000000,
    type: 'image/png',
  }),
  createMockImage({
    id: 'img-3',
    name: 'landscape.gif',
    path: 'subfolder',
    size: 8192,
    lastModified: 1700002000000,
    type: 'image/gif',
  }),
  createMockImage({
    id: 'img-4',
    name: 'portrait.webp',
    path: 'subfolder',
    size: 1024,
    lastModified: 1700003000000,
    type: 'image/webp',
  }),
  createMockImage({
    id: 'img-5',
    name: 'Quarterly report.png',
    path: '',
    size: 15360,
    lastModified: 1700004000000,
    type: 'image/png',
  }),
  createMockImage({
    id: 'img-6',
    name: 'Hiring plan.jpg',
    path: '',
    size: 5120,
    lastModified: 1700005000000,
    type: 'image/jpeg',
  }),
]

export const mockFolderTree: FolderNode = {
  name: 'Gallery',
  path: '',
  handle: createMockDirHandle('Gallery'),
  images: [mockImages[0], mockImages[1], mockImages[4], mockImages[5]],
  children: [
    {
      name: 'subfolder',
      path: 'subfolder',
      handle: createMockDirHandle('subfolder'),
      images: [mockImages[2], mockImages[3]],
      children: [],
      imageCount: 2,
    },
  ],
  imageCount: 6,
}

export const mockEmptyFolder: FolderNode = {
  name: 'EmptyFolder',
  path: '',
  handle: createMockDirHandle('EmptyFolder'),
  images: [],
  children: [],
  imageCount: 0,
}

export const fixtureFolderTree = buildFixtureFolderTree('tier-a')
