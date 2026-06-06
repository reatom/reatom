import { sleep } from '@reatom/core'

import type { GalleryImageModel } from './models/contracts'
import type { ImageFile } from './types'

function triggerBlobDownload(url: string, filename: string) {
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
}

export async function downloadSingleImage(image: ImageFile) {
  const blob = await image.fileHandle.getFile()
  const url = URL.createObjectURL(blob)
  triggerBlobDownload(url, image.name)
  URL.revokeObjectURL(url)
}

export function downloadPreparedGalleryImage(image: GalleryImageModel) {
  const preparedUrl = image.display.downloadUrl()
  if (!preparedUrl) return

  triggerBlobDownload(preparedUrl, image.source.name)
}

export async function downloadGalleryImage(image: GalleryImageModel) {
  const preparedUrl = image.display.downloadUrl()
  if (preparedUrl) {
    downloadPreparedGalleryImage(image)
    return
  }

  await downloadSingleImage(image.source)
}

export async function downloadSelectedImages(images: ImageFile[]) {
  if (images.length === 0) return
  if (images.length === 1) {
    return downloadSingleImage(images[0]!)
  }
  for (const image of images) {
    await downloadSingleImage(image)
    await sleep(200)
  }
}

export async function downloadSelectedGalleryImages(
  images: GalleryImageModel[],
) {
  if (images.length === 0) return
  if (images.length === 1) {
    return downloadGalleryImage(images[0]!)
  }
  for (const image of images) {
    await downloadGalleryImage(image)
    await sleep(200)
  }
}
