import { isAbort, wrap } from '@reatom/core'

import { isRawImageFormat } from './image-engine/types'
import type { GalleryImageModel } from './models/contracts'
import { resolveRawExportBlob } from './rawExport'

const OBJECT_URL_REVOKE_DELAY_MS = 10_000

function triggerBlobDownload(url: string, filename: string) {
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
}

function withJpegExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf('.')
  const stem = dotIndex > 0 ? filename.slice(0, dotIndex) : filename
  return `${stem}.jpg`
}

async function prepareDownload(
  image: GalleryImageModel,
): Promise<{ blob: Blob; filename: string }> {
  const [fileBlob, meta] = await wrap(Promise.all([image(), image.meta()]))

  if (meta && isRawImageFormat(meta.format)) {
    const rawExportBlob = await wrap(
      resolveRawExportBlob(image, fileBlob, { ...meta, format: meta.format }),
    )
    if (rawExportBlob) {
      return {
        blob: rawExportBlob,
        filename: withJpegExtension(image.source.name),
      }
    }
  }

  return { blob: fileBlob, filename: image.source.name }
}

export async function downloadPreparedGalleryImage(image: GalleryImageModel) {
  try {
    const { blob, filename } = await wrap(prepareDownload(image))
    const url = URL.createObjectURL(blob)
    triggerBlobDownload(url, filename)
    setTimeout(() => URL.revokeObjectURL(url), OBJECT_URL_REVOKE_DELAY_MS)
  } catch (error: unknown) {
    if (isAbort(error)) return
    throw error
  }
}
