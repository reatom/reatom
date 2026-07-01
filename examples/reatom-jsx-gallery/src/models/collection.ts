import type { LL_NEXT, LL_PREV, LLNode } from '@reatom/core'
import {
  action,
  computed,
  effect,
  peek,
  reatomLinkedList,
  withConnectHook,
} from '@reatom/core'

import { shutdownRawDevelopPool } from '../image-engine/formats/rawDevelop'
import { shutdownRawPreviewScanPool } from '../image-engine/formats/rawPreviewScanPool'
import type { ImageFile } from '../types'
import type { GalleryImageModel } from './contracts'
import { sortField, sortOrder } from './filters'
import { flatImages, folderTree } from './folder'
import { isGalleryImageModel, reatomGalleryImage } from './image'

type LLNodeModel = LLNode<GalleryImageModel>

export const imagesList = reatomLinkedList<
  [ImageFile | GalleryImageModel],
  GalleryImageModel,
  'id'
>(
  {
    create: (item: ImageFile | GalleryImageModel) =>
      isGalleryImageModel(item) ? item : reatomGalleryImage(item),
    key: 'id',
  },
  'imagesList',
).extend(withConnectHook(() => bindImagesListSync()))

export function bindImagesListSync(): () => void {
  const syncEffect = effect(() => {
    syncImagesList()
  }, 'syncImagesList')

  const unsubscribeFolderTree = folderTree.subscribe(() => syncImagesList())
  const unsubscribeFlatImages = flatImages.subscribe(() => syncImagesList())
  const unsubscribeSortField = sortField.subscribe(() => syncImagesList())
  const unsubscribeSortOrder = sortOrder.subscribe(() => syncImagesList())

  return () => {
    syncEffect.unsubscribe()
    unsubscribeFolderTree()
    unsubscribeFlatImages()
    unsubscribeSortField()
    unsubscribeSortOrder()
  }
}

export const refreshImagesList = action(
  () => syncImagesList(),
  'imagesList.refresh',
)

function syncImagesList() {
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
    (image) => currentMap.get(image.id) ?? reatomGalleryImage(image),
  )

  const sorted = [...models].sort((left, right) => {
    let comparison = 0
    switch (field) {
      case 'name':
        comparison = left.source.name.localeCompare(right.source.name)
        break
      case 'size':
        comparison =
          (left.fileInfo.data()?.size ?? 0) - (right.fileInfo.data()?.size ?? 0)
        break
      case 'date':
        comparison =
          (left.fileInfo.data()?.lastModified ?? 0) -
          (right.fileInfo.data()?.lastModified ?? 0)
        break
      case 'type':
        comparison = (left.fileInfo.data()?.type ?? '').localeCompare(
          right.fileInfo.data()?.type ?? '',
        )
        break
      case 'dimensions':
        comparison =
          left.width() * left.height() - right.width() * right.height()
        break
    }
    return order === 'asc' ? comparison : -comparison
  })

  const currentArray = peek(imagesList.array)
  const currentIds = currentArray.map((model) => model.id)

  const orderMatch =
    currentIds.length === sorted.length &&
    currentIds.every((id, index) => id === sorted[index]!.id)

  if (orderMatch) return

  imagesList.batch(() => {
    imagesList.clear()
    imagesList.createMany(sorted.map((model) => [model]))
  })
}

export const resetGallerySession = action(() => {
  shutdownRawPreviewScanPool()
  shutdownRawDevelopPool()
  imagesList.batch(() => imagesList.clear())
}, 'collection.resetGallerySession')

export const visibleImages = computed(
  () => imagesList.array().filter((node) => node.visible()),
  'visibleImages',
)

export const visibleIndexMap = computed(() => {
  const map = new Map<GalleryImageModel, number>()
  for (const [index, node] of visibleImages().entries()) {
    map.set(node, index)
  }
  return map
}, 'visibleIndexMap')

export const selectedImages = computed(
  () => imagesList.array().filter((node) => node.selected()),
  'selectedImages',
)

export const primarySelectedImage = computed(
  () => selectedImages()[0] ?? null,
  'primarySelectedImage',
)

export const selectedCount = computed(() => {
  let count = 0
  for (const node of imagesList.array()) {
    if (node.selected()) count++
  }
  return count
}, 'selectedCount')

export const favoriteImages = computed(() => {
  return imagesList
    .array()
    .filter((model) => model.favorite())
    .map((model) => model.source)
}, 'favoriteImages')

export const favoritesCount = computed(
  () => imagesList.array().filter((model) => model.favorite()).length,
  'favoritesCount',
)

export const selectImage = action((model: GalleryImageModel) => {
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

const listLLPrev: LL_PREV = imagesList.LL_PREV
const listLLNext: LL_NEXT = imagesList.LL_NEXT

export const findVisibleNeighbor = (
  source: LLNodeModel,
  direction: 1 | -1,
  wrapNavigation: boolean,
) => {
  const getNeighbor =
    direction === 1
      ? (node: LLNodeModel) => node[listLLNext] ?? null
      : (node: LLNodeModel) => node[listLLPrev] ?? null

  let node = getNeighbor(source)
  while (node && !node.visible()) {
    node = getNeighbor(node)
  }

  if (!node && wrapNavigation) {
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
