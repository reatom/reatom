import type {
  BooleanAtom,
  Computed,
  LL_NEXT,
  LL_PREV,
  LLNode,
} from '@reatom/core'
import {
  action,
  atom,
  computed,
  effect,
  peek,
  reatomBoolean,
  reatomEnum,
  reatomLinkedList,
  withAbort,
  withAsync,
  withChangeHook,
  withConnectHook,
  withIndexedDb,
  withLocalStorage,
  wrap,
} from '@reatom/core'

import {
  isFileSystemAccessSupported,
  parseDirectoryRecursive,
  pickDirectory,
} from './filesystem'
import type { ReatomImage } from './reatomImage'
import { reatomImage } from './reatomImage'
import type { FolderNode, ImageFile } from './types'

export type ImageModel = ReatomImage & {
  id: ImageFile['id']
  source: ImageFile
  selected: BooleanAtom
  favorite: BooleanAtom
  visible: Computed<boolean>
  width: Computed<number>
  height: Computed<number>
}

type LLNodeModel = LLNode<ImageModel>
type DirectoryPermissionMode = 'read' | 'readwrite'
type DirectoryPermissionDescriptor = { mode: DirectoryPermissionMode }
type PermissionedDirectoryHandle = FileSystemDirectoryHandle & {
  queryPermission: (
    descriptor: DirectoryPermissionDescriptor,
  ) => Promise<PermissionState>
  requestPermission: (
    descriptor: DirectoryPermissionDescriptor,
  ) => Promise<PermissionState>
}

function hasDirectoryPermissionsApi(
  handle: FileSystemDirectoryHandle,
): handle is PermissionedDirectoryHandle {
  return (
    'queryPermission' in handle &&
    typeof handle.queryPermission === 'function' &&
    'requestPermission' in handle &&
    typeof handle.requestPermission === 'function'
  )
}

// Folder state

export const folderTree = atom<FolderNode | null>(null, 'folderTree')
export const currentFolder = atom<FolderNode | null>(null, 'currentFolder')
export const flatImages = atom<ImageFile[]>([], 'flatImages')
export const selectedFolderHandle = atom<FileSystemDirectoryHandle | null>(
  null,
  'selectedFolderHandle',
).extend(withIndexedDb('gallery.selectedFolderHandle'))

// Parsing state

export const parsingProgress = atom(
  {
    total: 0,
    current: 0,
  },
  'parsingProgress',
)

// View mode

export const viewMode = reatomEnum(
  ['grid', 'list', 'lightbox', 'slideshow'],
  'viewMode',
)

// Grid settings

export const gridColumns = atom(4, 'gridColumns').extend(
  withLocalStorage('gallery.gridColumns'),
)

export const imageFit = reatomEnum(['contain', 'cover', 'fill', 'none'], {
  name: 'imageFit',
  initState: 'cover',
}).extend(withLocalStorage('gallery.imageFit'))

export const gridGap = reatomEnum(['none', 'small', 'medium', 'large', 'xl'], {
  name: 'gridGap',
  initState: 'medium',
}).extend(
  withLocalStorage('gallery.gridGap'),
  withChangeHook((state) => {
    if (state === 'none') imageFit.setCover()
  }),
)

// Sort

export const sortField = reatomEnum(
  ['name', 'size', 'date', 'type', 'dimensions'],
  'sortField',
)
export const sortOrder = reatomEnum(['asc', 'desc'], 'sortOrder')

// Filter

export const filterTypes = atom(new Set<string>(), 'filterTypes')
export const searchQuery = atom('', 'searchQuery')
export const includeSubfolders = reatomBoolean(true, 'includeSubfolders')
export const filterSizeMin = atom(0, 'filterSizeMin')
export const filterSizeMax = atom(Infinity, 'filterSizeMax')

// Lightbox

export const lightboxOpen = reatomBoolean(false, 'lightboxOpen')
export const lightboxImage = atom<ImageModel | null>(null, 'lightboxImage')
export const lightboxZoom = atom(1, 'lightboxZoom')
export const lightboxPanX = atom(0, 'lightbox.panX')
export const lightboxPanY = atom(0, 'lightbox.panY')

export const resetLightboxPan = () => {
  lightboxPanX.set(0)
  lightboxPanY.set(0)
}

// Slideshow

export const slideshowPlaying = reatomBoolean(false, 'slideshowPlaying')
export const slideshowInterval = atom(3000, 'slideshowInterval').extend(
  withLocalStorage('gallery.slideshowInterval'),
)

// Theme

export const themePack = reatomEnum(
  [
    'blueprint',
    'neon',
    'terminal',
    'paper',
    'polaroid',
    'obsidian',
    'bauhaus',
    'aurora',
    'monochrome',
    'retroOs',
  ],
  {
    name: 'themePack',
    initState: 'aurora',
  },
).extend(withLocalStorage('gallery.themePack'))

export const themeMode = reatomEnum(['light', 'dark'], {
  name: 'themeMode',
  initState: 'dark',
}).extend(withLocalStorage('gallery.themeMode'))

// UI preferences

export const showImageNames = reatomBoolean(true, 'showImageNames').extend(
  withLocalStorage('gallery.showImageNames'),
)
export const showFileSizes = reatomBoolean(false, 'showFileSizes').extend(
  withLocalStorage('gallery.showFileSizes'),
)

function createImageModel(imageSource: ImageFile): ImageModel {
  const imageModel = reatomImage(
    imageSource.fileHandle,
    `image#${imageSource.id}`,
  )
  const selected = reatomBoolean(false, `image#${imageSource.id}.selected`)
  const favorite = reatomBoolean(
    false,
    `image#${imageSource.id}.favorite`,
  ).extend(withLocalStorage(`gallery.favorites.${imageSource.id}`))

  const visible = computed(() => {
    const activeFilterTypes = filterTypes()
    const query = searchQuery().toLowerCase()
    const sizeMin = filterSizeMin()
    const sizeMax = filterSizeMax()
    const folder = currentFolder()
    const withSubfolders = includeSubfolders()

    if (activeFilterTypes.size > 0) {
      const dotIndex = imageSource.name.lastIndexOf('.')
      const imageExt =
        dotIndex >= 0 ? imageSource.name.slice(dotIndex + 1).toLowerCase() : ''
      const normalizedExt = imageExt === 'jpeg' ? 'jpg' : imageExt
      if (!activeFilterTypes.has(normalizedExt)) return false
    }

    if (query && !imageSource.name.toLowerCase().includes(query)) return false

    if (imageSource.size < sizeMin || imageSource.size > sizeMax) return false

    if (folder) {
      const folderPath = folder.path
      if (withSubfolders) {
        if (
          folderPath !== '' &&
          imageSource.path !== folderPath &&
          !imageSource.path.startsWith(folderPath + '/')
        ) {
          return false
        }
      } else {
        if (imageSource.path !== folderPath) return false
      }
    }

    return true
  }, `image#${imageSource.id}.visible`)
  const width = computed(
    () => imageModel.meta.data()?.width ?? 0,
    `image#${imageSource.id}.width`,
  )
  const height = computed(
    () => imageModel.meta.data()?.height ?? 0,
    `image#${imageSource.id}.height`,
  )

  return imageModel.extend(() => ({
    id: imageSource.id,
    source: imageSource,
    selected,
    favorite,
    visible,
    width,
    height,
  }))
}

function isImageModel(x: ImageFile | ImageModel): x is ImageModel {
  return (
    'id' in x &&
    'source' in x &&
    'selected' in x &&
    'favorite' in x &&
    'visible' in x &&
    'width' in x &&
    'height' in x
  )
}

export const imagesList = reatomLinkedList<
  [ImageFile | ImageModel],
  ImageModel,
  'id'
>(
  {
    create: (x: ImageFile | ImageModel) =>
      isImageModel(x) ? x : createImageModel(x),
    key: 'id',
  },
  'imagesList',
).extend(
  withConnectHook(() => {
    effect(() => {
      const tree = folderTree()
      if (!tree) {
        imagesList.batch(() => imagesList.clear())
        return
      }

      const images = flatImages()
      const field = sortField()
      const order = sortOrder()
      const currentMap = peek(imagesList.map)

      const models = images.map(
        (img) => currentMap.get(img.id) ?? createImageModel(img),
      )

      const sorted = [...models].sort((a, b) => {
        let comparison = 0
        switch (field) {
          case 'name':
            comparison = a.source.name.localeCompare(b.source.name)
            break
          case 'size':
            comparison = a.source.size - b.source.size
            break
          case 'date':
            comparison = a.source.lastModified - b.source.lastModified
            break
          case 'type':
            comparison = a.source.type.localeCompare(b.source.type)
            break
          case 'dimensions':
            comparison = a.width() * a.height() - b.width() * b.height()
            break
        }
        return order === 'asc' ? comparison : -comparison
      })

      const currentArray = peek(imagesList.array)
      const currentIds = currentArray.map((m) => m.id)

      const orderMatch =
        currentIds.length === sorted.length &&
        currentIds.every((id, i) => id === sorted[i]!.id)

      if (orderMatch) return

      imagesList.batch(() => {
        imagesList.clear()
        imagesList.createMany(sorted.map((model) => [model]))
      })
    }, 'syncImagesList')
  }),
)

const listLLPrev: LL_PREV = imagesList.LL_PREV
const listLLNext: LL_NEXT = imagesList.LL_NEXT

export const visibleIndexMap = computed(() => {
  const map = new Map<ImageModel, number>()
  let idx = 0
  for (const node of imagesList.array()) {
    if (node.visible()) map.set(node, idx++)
  }
  return map
}, 'visibleIndexMap')

export const selectedCount = computed(() => {
  let count = 0
  for (const node of imagesList.array()) {
    if (node.selected()) count++
  }
  return count
}, 'selectedCount')

export const lightboxCounter = computed(() => {
  const img = lightboxImage()
  if (!img) return ''
  const map = visibleIndexMap()
  const pos = map.get(img) ?? -1
  return pos >= 0 ? `${pos + 1} / ${map.size}` : ''
}, 'lightboxCounter')

export const thumbnailWindow = computed(() => {
  const current = lightboxImage() as LLNodeModel
  if (!current || !current.visible()) return []

  const before: ImageModel[] = []
  let node = current[listLLPrev] ?? null
  while (node && before.length < 5) {
    if (node.visible()) before.unshift(node)
    node = node[listLLPrev] ?? null
  }

  const after: ImageModel[] = []
  node = current[listLLNext] ?? null
  while (node && after.length < 5) {
    if (node.visible()) after.push(node)
    node = node[listLLNext] ?? null
  }

  return [...before, current, ...after]
}, 'thumbnailWindow')

const resetGallery = () => {
  for (const model of imagesList.array()) {
    model.dispose()
  }

  folderTree.set(null)
  currentFolder.set(null)
  flatImages.set([])
  lightboxImage.set(null)
}

const parseFolder = async (handle: FileSystemDirectoryHandle) => {
  resetGallery()

  const { tree, images } = await wrap(parseDirectoryRecursive(handle))
  folderTree.set(tree)
  flatImages.set(images)
  currentFolder.set(tree)
}

const ensureDirectoryPermission = async (
  handle: FileSystemDirectoryHandle,
  mode: DirectoryPermissionMode = 'read',
): Promise<boolean> => {
  if (!hasDirectoryPermissionsApi(handle)) return true

  const permissionDescriptor = { mode }

  const currentPermission = await wrap(
    handle.queryPermission(permissionDescriptor),
  )
  if (currentPermission === 'granted') return true

  const requestedPermission = await wrap(
    handle.requestPermission(permissionDescriptor),
  )
  return requestedPermission === 'granted'
}

// Actions

export const openFolder = action(
  async (sourceHandle?: FileSystemDirectoryHandle) => {
    if (!isFileSystemAccessSupported()) return

    let handle: FileSystemDirectoryHandle
    if (sourceHandle) {
      handle = sourceHandle
    } else {
      try {
        handle = await wrap(pickDirectory())
      } catch {
        return
      }
    }

    selectedFolderHandle.set(handle)

    try {
      await parseFolder(handle)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      throw error
    }
  },
  'openFolder',
).extend(withAsync(), withAbort())

export const restoreSelectedFolder = action(async () => {
  if (!isFileSystemAccessSupported()) return

  const handle = selectedFolderHandle()
  if (handle === null) return

  const hasPermission = await ensureDirectoryPermission(handle)
  if (!hasPermission) return

  await wrap(openFolder(handle))
}, 'restoreSelectedFolder').extend(withAsync(), withAbort())

export const selectImage = action((model: ImageModel) => {
  model.selected.set(!model.selected())
}, 'selectImage')

export const selectAllImages = action(() => {
  const map = visibleIndexMap()
  for (const model of map.keys()) {
    model.selected.set(true)
  }
}, 'selectAllImages')

export const clearSelection = action(() => {
  for (const node of imagesList.array()) {
    node.selected.set(false)
  }
}, 'clearSelection')

export const openLightbox = action((model: ImageModel) => {
  lightboxImage.set(() => model)
  lightboxZoom.set(1)
  resetLightboxPan()
  lightboxOpen.setTrue()
  viewMode.setLightbox()
}, 'openLightbox')

export const closeLightbox = action(() => {
  lightboxOpen.setFalse()
  lightboxZoom.set(1)
  viewMode.setGrid()
}, 'closeLightbox')

export const navigateLightbox = action((direction: 1 | -1) => {
  const currentImage = lightboxImage()
  if (!currentImage) return
  const current = imagesList.find((node) => node.id === currentImage.id)
  if (!current) return

  const getNeighbor =
    direction === 1
      ? (n: LLNodeModel) => n[listLLNext] ?? null
      : (n: LLNodeModel) => n[listLLPrev] ?? null

  const findVisibleNeighbor = (source: LLNodeModel) => {
    let node = getNeighbor(source)
    while (node && !node.visible()) {
      node = getNeighbor(node)
    }

    if (!node) {
      const listState = imagesList()
      const start = direction === 1 ? listState.head : listState.tail
      let cursor = start
      while (cursor && cursor !== source) {
        if (cursor.visible()) {
          node = cursor
          break
        }
        cursor = getNeighbor(cursor)
      }
      if (node === source) node = null
    }

    return node
  }

  const node = findVisibleNeighbor(current)
  if (node) {
    lightboxImage.set(() => node)
    lightboxZoom.set(1)
    findVisibleNeighbor(node)?.fullImage.data()
  }
}, 'navigateLightbox')
