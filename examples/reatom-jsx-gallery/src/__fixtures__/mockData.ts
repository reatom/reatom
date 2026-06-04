import type { FolderNode, ImageFile } from '../types'

const mockSvgColors = [
  '#d94f45',
  '#4f7fa8',
  '#8b5cf6',
  '#16a34a',
  '#f59e0b',
  '#db2777',
] as const

const createMockSvgText = (name: string): string => {
  const colorIndex =
    [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) %
    mockSvgColors.length
  const label = name.slice(0, 1).toUpperCase()

  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
    <rect width="64" height="64" rx="8" fill="${mockSvgColors[colorIndex]}"/>
    <circle cx="32" cy="32" r="20" fill="#fffaf2"/>
    <text x="32" y="39" font-family="Arial, sans-serif" font-size="22" font-weight="700" text-anchor="middle" fill="${mockSvgColors[colorIndex]}">${label}</text>
  </svg>`
}

function createMockFileHandle(name: string): FileSystemFileHandle {
  return {
    kind: 'file',
    name,
    getFile: () =>
      Promise.resolve(
        new File([createMockSvgText(name)], name, {
          type: 'image/svg+xml',
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
