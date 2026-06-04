import type { FolderNode, ImageFile } from '../types'

const mockPngBytes = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
  0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x60, 0x00, 0x00, 0x00,
  0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc, 0x33, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
])

function createMockFileHandle(name: string): FileSystemFileHandle {
  return {
    kind: 'file',
    name,
    getFile: () =>
      Promise.resolve(
        new File([mockPngBytes], name, {
          type: 'image/png',
          lastModified: Date.now(),
        }),
      ),
    isSameEntry: () => Promise.resolve(false),
  } as FileSystemFileHandle
}

function createMockDirHandle(name: string): FileSystemDirectoryHandle {
  return {
    kind: 'directory',
    name,
    getDirectoryHandle: () => Promise.reject(new Error('Not implemented')),
    getFileHandle: () => Promise.reject(new Error('Not implemented')),
    removeEntry: () => Promise.reject(new Error('Not implemented')),
    resolve: () => Promise.reject(new Error('Not implemented')),
    keys: () => [][Symbol.asyncIterator](),
    values: () => [][Symbol.asyncIterator](),
    entries: () => [][Symbol.asyncIterator](),
    isSameEntry: () => Promise.resolve(false),
  } as FileSystemDirectoryHandle
}

export function createMockImage(overrides: Partial<ImageFile> = {}): ImageFile {
  const id = overrides.id ?? crypto.randomUUID()
  const name = overrides.name ?? 'image.png'
  const path = overrides.path ?? ''
  return {
    id,
    name,
    path,
    relativePath: path ? `${path}/${name}` : name,
    size: overrides.size ?? 1024,
    type: overrides.type ?? 'image/png',
    lastModified: overrides.lastModified ?? Date.now(),
    fileHandle: overrides.fileHandle ?? createMockFileHandle(name),
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
