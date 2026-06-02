import type { BooleanAtom, Computed } from '@reatom/core'
import {
  action,
  atom,
  computed,
  reatomBoolean,
  reatomEnum,
  reatomLinkedList,
  withAbort,
  withAsync,
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

type LLNodeModel = ImageModel & Record<symbol, ImageModel | null>

function getLLPrev(node: LLNodeModel, llPrev: symbol): ImageModel | null {
  return (node as Record<symbol, ImageModel | null>)[llPrev] ?? null
}

function getLLNext(node: LLNodeModel, llNext: symbol): ImageModel | null {
  return (node as Record<symbol, ImageModel | null>)[llNext] ?? null
}

// Folder state

export const folderTree = atom<FolderNode | null>(null, 'folderTree')
export const currentFolder = atom<FolderNode | null>(null, 'currentFolder')
export const flatImages = atom<ImageFile[]>([], 'flatImages')

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

export const gridGap = reatomEnum(['none', 'small', 'medium', 'large', 'xl'], {
  name: 'gridGap',
  initState: 'medium',
}).extend(withLocalStorage('gallery.gridGap'))

export const thumbnailSize = reatomEnum(['small', 'medium', 'large', 'xl'], {
  name: 'thumbnailSize',
  initState: 'medium',
}).extend(withLocalStorage('gallery.thumbnailSize'))

export const imageFit = reatomEnum(['contain', 'cover', 'fill', 'none'], {
  name: 'imageFit',
  initState: 'cover',
}).extend(withLocalStorage('gallery.imageFit'))

export const aspectRatio = reatomEnum(['fit', 'fill', 'original', 'square'], {
  name: 'aspectRatio',
  initState: 'fill',
}).extend(withLocalStorage('gallery.aspectRatio'))

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

export const theme = reatomEnum(['light', 'dark'], {
  name: 'theme',
  initState: 'dark',
}).extend(withLocalStorage('gallery.theme'))

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
)
// .extend(
//   withConnectHook(() => {
//     effect(() => {
//       const tree = folderTree()
//       if (!tree) {
//         imagesList.batch(() => imagesList.clear())
//         return
//       }

//       const images = flatImages()
//       const field = sortField()
//       const order = sortOrder()
//       const currentMap = peek(imagesList.map)

//       const models = images.map((img) => {
//         const existing = currentMap.get(img.id)
//         return existing ?? createImageModel(img)
//       })

//       const sorted = [...models].sort((a, b) => {
//         let comparison = 0
//         switch (field) {
//           case 'name':
//             comparison = a.name.localeCompare(b.name)
//             break
//           case 'size':
//             comparison = a.source.size - b.source.size
//             break
//           case 'date':
//             comparison = a.source.lastModified - b.source.lastModified
//             break
//           case 'type':
//             comparison = a.source.type.localeCompare(b.source.type)
//             break
//           case 'dimensions':
//             comparison = a.width() * a.height() - b.width() * b.height()
//             break
//         }
//         return order === 'asc' ? comparison : -comparison
//       })

//       const currentArray = peek(imagesList.array)
//       const currentIds = currentArray.map((m) => m.id)

//       const orderMatch =
//         currentIds.length === sorted.length &&
//         currentIds.every((id, i) => id === sorted[i]!.id)

//       if (orderMatch) return

//       imagesList.batch(() => {
//         imagesList.clear()
//         imagesList.createMany(models.map((m) => [m]))
//       })
//     }, 'syncImagesList')
//   }),
// )

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
  const current = lightboxImage()
  if (!current || !current.visible()) return []

  const { LL_PREV, LL_NEXT } = imagesList
  const before: ImageModel[] = []
  let node = getLLPrev(current as LLNodeModel, LL_PREV)
  while (node && before.length < 5) {
    if (node.visible()) before.unshift(node)
    node = getLLPrev(node as LLNodeModel, LL_PREV)
  }

  const after: ImageModel[] = []
  node = getLLNext(current as LLNodeModel, LL_NEXT)
  while (node && after.length < 5) {
    if (node.visible()) after.push(node)
    node = getLLNext(node as LLNodeModel, LL_NEXT)
  }

  return [...before, current, ...after]
}, 'thumbnailWindow')

// Actions

export const openFolder = action(async () => {
  if (!isFileSystemAccessSupported()) return

  let handle: FileSystemDirectoryHandle
  try {
    handle = await wrap(pickDirectory())
  } catch {
    return
  }

  for (const model of imagesList.array()) {
    model.dispose()
  }

  folderTree.set(null)
  currentFolder.set(null)
  flatImages.set([])
  lightboxImage.set(null)

  try {
    const { tree, images } = await wrap(parseDirectoryRecursive(handle))
    folderTree.set(tree)
    flatImages.set(images)
    currentFolder.set(tree)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return
    throw error
  }
}, 'openFolder').extend(withAsync(), withAbort())

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
  lightboxImage.set(model)
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
  const current = lightboxImage()
  if (!current) return

  const { LL_PREV, LL_NEXT } = imagesList
  const getNeighbor =
    direction === 1
      ? (n: LLNodeModel) => getLLNext(n, LL_NEXT)
      : (n: LLNodeModel) => getLLPrev(n, LL_PREV)

  let node = getNeighbor(current as LLNodeModel)
  while (node && !node.visible()) {
    node = getNeighbor(node as LLNodeModel)
  }

  if (!node) {
    const listState = imagesList()
    const start = (
      direction === 1 ? listState.head : listState.tail
    ) as ImageModel | null
    let cursor = start
    while (cursor && cursor !== current) {
      if (cursor.visible()) {
        node = cursor
        break
      }
      cursor = getNeighbor(cursor as LLNodeModel)
    }
    if (node === current) node = null
  }

  if (node) {
    lightboxImage.set(node)
    lightboxZoom.set(1)
  }
}, 'navigateLightbox')
