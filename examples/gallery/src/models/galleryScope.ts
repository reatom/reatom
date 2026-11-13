import type { Computed, Unsubscribe } from '@reatom/core'
import {
  action,
  atom,
  computed,
  noop,
  peek,
  withChangeHook,
  withConnectHook,
} from '@reatom/core'
import type { FolderNode } from '../types'
import type { GalleryImageModel } from './contracts'
import { sortField, sortOrder } from './filters'
import { isGalleryImageModel, reatomGalleryImage } from './image'

export type GalleryFolderModel = {
  source: FolderNode
  images: GalleryImageModel[]
  children: GalleryFolderModel[]
  sortedImages: Computed<GalleryImageModel[]>
}
export const galleryRootGeneration = atom(
  () => Symbol('gallery root'),
  'gallery.rootGeneration',
)
export const activeGalleryScope = atom<GalleryFolderScope | null>(
  null,
  'gallery.activeScope',
)
function sortImages(images: GalleryImageModel[]): GalleryImageModel[] {
  const field = sortField()
  const order = sortOrder()

  return [...images].sort((left, right) => {
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
}

/** A route owns these models, independently of sidebar shells and other routes. */
export function reatomGalleryFolderScope(
  key: string,
  recursive: boolean,
  generation: symbol,
) {
  const source = atom<FolderNode | null>(null, `galleryScope.${key}.source`)
  const models = new Map<string, GalleryImageModel>()
  const folders = new Map<string, GalleryFolderModel>()
  const demands = new Map<GalleryImageModel, Unsubscribe>()
  let connected = false
  let enabled = true
  let disposed = false
  function createFolder(folder: FolderNode): GalleryFolderModel {
    const previous = folders.get(folder.path)
    if (previous?.source === folder) return previous
    const images = folder.images.map((file) => {
      let model = models.get(file.id)
      if (!model) {
        model = isGalleryImageModel(file) ? file : reatomGalleryImage(file)
        models.set(file.id, model)
      }
      return model
    })
    const model = {
      source: folder,
      images,
      children: recursive ? folder.children.map(createFolder) : [],
      sortedImages: computed(
        () => sortImages(images),
        `galleryScope.${key}.${folder.path}.sorted`,
      ),
    }
    folders.set(folder.path, model)
    return model
  }
  const modelTree = computed(() => {
    const tree = source()
    return tree ? createFolder(tree) : null
  }, `galleryScope.${key}.tree`)
  function collect(folder: GalleryFolderModel): GalleryImageModel[] {
    return [...folder.sortedImages(), ...folder.children.flatMap(collect)]
  }
  const images = computed(() => {
    const tree = modelTree()
    return tree ? collect(tree) : []
  }, `galleryScope.${key}.images`)
  function release(image: GalleryImageModel) {
    demands.get(image)?.()
    demands.delete(image)
    image.previewLoadPriority.set('off')
  }
  function sync(next: GalleryImageModel[]) {
    if (!connected || !enabled || disposed) return
    const present = new Set(next)
    for (const image of demands.keys()) if (!present.has(image)) release(image)
    for (const image of next) {
      if (demands.has(image)) continue
      image.previewLoadPriority.set('high')
      demands.set(image, image.thumbnail.data.subscribe(noop))
    }
  }
  const visibleImages = computed(
    () => images().filter((image) => image.visible()),
    `galleryScope.${key}.visible`,
  ).extend(
    withChangeHook(sync),
    withConnectHook((target) => {
      connected = true
      sync(peek(target))
      return () => {
        connected = false
        for (const image of [...demands.keys()]) release(image)
      }
    }),
  )
  const deactivate = action(() => {
    if (!enabled) return
    enabled = false
    for (const image of [...demands.keys()]) release(image)
    for (const image of models.values()) {
      image.previewLoadPriority.set('off')
      image.deactivate()
    }
  }, `galleryScope.${key}.deactivate`)
  const activate = action(() => {
    if (disposed || enabled) return
    enabled = true
    for (const image of models.values()) image.activate()
    if (connected) sync(peek(visibleImages))
  }, `galleryScope.${key}.activate`)
  const dispose = action(() => {
    if (disposed) return
    disposed = true
    deactivate()
    for (const image of models.values()) image.dispose()
    models.clear()
    folders.clear()
    source.set(null)
  }, `galleryScope.${key}.dispose`)
  return {
    key,
    recursive,
    generation,
    source,
    modelTree,
    images,
    visibleImages,
    activate,
    deactivate,
    dispose,
  }
}
export type GalleryFolderScope = ReturnType<typeof reatomGalleryFolderScope>
