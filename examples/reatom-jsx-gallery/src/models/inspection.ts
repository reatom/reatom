import { computed } from '@reatom/core'

import {
  buildCameraHudRows,
  formatExifDisplayValue,
  isPinnedExifDetailTag,
} from '../image-engine/exifDisplay'
import { EXIF_TAGS_WITH_CUSTOM_FORMAT } from '../image-engine/formats/exif'
import { primarySelectedImage, selectedCount } from './collection'
import type { GalleryImageModel } from './contracts'
import { lightboxImage, lightboxOpen } from './lightbox'
import { imageInfoPanelOpen, settingsPanelOpen } from './panels'

export const inspectedImage = computed((): GalleryImageModel | null => {
  if (lightboxOpen()) return lightboxImage()
  return primarySelectedImage()
}, 'inspection.inspectedImage')

export const inspectionContextLabel = computed(() => {
  if (lightboxOpen()) return 'Lightbox image'
  const count = selectedCount()
  if (count > 1) return `Showing first of ${count} selected`
  return 'Selected image'
}, 'inspection.contextLabel')

export const inspectionCameraHudRows = computed(
  () => buildCameraHudRows(inspectedImage()?.meta.data()?.exif),
  'inspection.cameraHudRows',
)

export const inspectionExifRows = computed((): [string, string][] => {
  const exif = inspectedImage()?.meta.data()?.exif
  if (!exif) return []

  return Object.entries(exif)
    .filter(
      ([name]) =>
        !EXIF_TAGS_WITH_CUSTOM_FORMAT.has(name) && !isPinnedExifDetailTag(name),
    )
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, raw]) => [name, formatExifDisplayValue(name, raw, exif)])
}, 'inspection.exifRows')

export const imageInfoPanelExpanded = computed(
  () =>
    imageInfoPanelOpen() &&
    lightboxOpen() &&
    inspectedImage() !== null &&
    !settingsPanelOpen(),
  'inspection.panelExpanded',
)
