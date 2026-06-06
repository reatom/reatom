import { computed, reatomBoolean, withLocalStorage } from '@reatom/core'

import { isRawImageFormat } from '../image-engine/types'
import { reatomImage } from '../reatomImage'
import type { ImageFile } from '../types'
import type { GalleryImageModel } from './contracts'
import {
  filterSizeMax,
  filterSizeMin,
  filterTypes,
  includeSubfolders,
  searchQuery,
} from './filters'
import { currentFolder } from './folder'
import { developRawFullSize, ignoreExifOrientation } from './preferences'

function matchesVisibleFilters(imageSource: ImageFile): boolean {
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
    } else if (imageSource.path !== folderPath) {
      return false
    }
  }

  return true
}

export function reatomGalleryImage(imageSource: ImageFile): GalleryImageModel {
  const name = `image#${imageSource.name}`
  const imageModel = reatomImage(imageSource.fileHandle, name, {
    filename: imageSource.name,
    readIgnoreExifOrientation: () => ignoreExifOrientation(),
    readDevelopRaw: () => developRawFullSize(),
  })
  const selected = reatomBoolean(false, `${name}.selected`)
  const favorite = reatomBoolean(false, `${name}.favorite`).extend(
    withLocalStorage(`gallery.favorite.${imageSource.relativePath}`),
  )

  const visible = computed(
    () => matchesVisibleFilters(imageSource),
    `${name}.visible`,
  )

  const width = computed(
    () =>
      imageModel.meta.data()?.width ??
      imageModel.rawDeveloped.data()?.width ??
      imageModel.fullImage.data()?.naturalWidth ??
      0,
    `${name}.width`,
  )

  const height = computed(
    () =>
      imageModel.meta.data()?.height ??
      imageModel.rawDeveloped.data()?.height ??
      imageModel.fullImage.data()?.naturalHeight ??
      0,
    `${name}.height`,
  )

  const displayStage = computed(() => {
    if (imageModel.rawDevelopedImage.data()) return 'developed'
    if (imageModel.rawEmbeddedPreviewImage.data()) return 'embedded'
    return 'thumbnail'
  }, `${name}.display.stage`)

  const displaySource = computed(() => {
    const developedUrl = imageModel.developedImageUrl.data()
    if (developedUrl) return { url: developedUrl, orientationBaked: true }

    const embeddedUrl = imageModel.embeddedPreviewUrl.data()
    if (embeddedUrl) return { url: embeddedUrl, orientationBaked: false }

    return null
  }, `${name}.display.source`)

  const displayElement = computed(
    () =>
      imageModel.rawDevelopedImage.data() ??
      imageModel.rawEmbeddedPreviewImage.data() ??
      null,
    `${name}.display.element`,
  )

  const isRawPipeline = computed(
    () => isRawImageFormat(imageModel.meta.data()?.format),
    `${name}.display.isRawPipeline`,
  )

  const preloadUrl = computed(() => {
    if (isRawPipeline()) {
      return (
        imageModel.embeddedPreviewUrl.data() ??
        imageModel.thumbnail.data()?.url ??
        ''
      )
    }
    return imageModel.fullImageUrl.data() ?? imageModel.thumbnail.data()?.url ?? ''
  }, `${name}.display.preloadUrl`)

  const downloadUrl = computed(() => {
    if (isRawPipeline()) {
      return (
        imageModel.developedImageUrl.data() ??
        imageModel.embeddedPreviewUrl.data() ??
        imageModel.thumbnail.data()?.url ??
        ''
      )
    }
    return imageModel.fullImageUrl.data() ?? imageModel.thumbnail.data()?.url ?? ''
  }, `${name}.display.downloadUrl`)

  const warmDevelopPipeline = () => {
    if (!isRawPipeline()) return
    void imageModel.rawDeveloped()
  }

  return imageModel.extend(() => ({
    id: imageSource.id,
    source: imageSource,
    selected,
    favorite,
    visible,
    width,
    height,
    display: {
      stage: displayStage,
      source: displaySource,
      element: displayElement,
      preloadUrl,
      downloadUrl,
      isRawPipeline,
      warmDevelopPipeline,
    },
  }))
}

export function isGalleryImageModel(
  value: ImageFile | GalleryImageModel,
): value is GalleryImageModel {
  return (
    'id' in value &&
    'source' in value &&
    'selected' in value &&
    'favorite' in value &&
    'visible' in value &&
    'width' in value &&
    'height' in value
  )
}
