import type { ImageFile } from './types'

async function readFileAsBlob(image: ImageFile): Promise<Blob> {
  const file = await image.fileHandle.getFile()
  return file
}

export async function downloadSingleImage(image: ImageFile) {
  const blob = await readFileAsBlob(image)
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = image.name
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

export async function downloadSelectedImages(images: ImageFile[]) {
  if (images.length === 0) return
  if (images.length === 1) {
    return downloadSingleImage(images[0]!)
  }
  for (const image of images) {
    await downloadSingleImage(image)
    await new Promise((r) => setTimeout(r, 200))
  }
}
