export type ImageFile = {
  id: string
  name: string
  path: string
  relativePath: string
  size: number
  type: string
  lastModified: number
  fileHandle: FileSystemFileHandle
}

export type FolderNode = {
  name: string
  path: string
  handle: FileSystemDirectoryHandle
  images: ImageFile[]
  children: FolderNode[]
  imageCount: number
}

export type ViewMode = 'grid' | 'list' | 'lightbox' | 'slideshow'
export type SortField = 'name' | 'size' | 'date' | 'type' | 'dimensions'
export type SortOrder = 'asc' | 'desc'
export type ImageFit = 'contain' | 'cover' | 'fill' | 'none'
export type GridGap = 'none' | 'small' | 'medium' | 'large' | 'xl'
export type ThemeMode = 'light' | 'dark'
export type ThemePack =
  | 'blueprint'
  | 'neon'
  | 'terminal'
  | 'paper'
  | 'polaroid'
  | 'obsidian'
  | 'bauhaus'
  | 'aurora'
  | 'monochrome'
  | 'retroOs'

export const IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.svg',
  '.avif',
  '.bmp',
]
export const GRID_GAP_VALUES: Record<GridGap, number> = {
  none: 0,
  small: 4,
  medium: 8,
  large: 16,
  xl: 24,
}
