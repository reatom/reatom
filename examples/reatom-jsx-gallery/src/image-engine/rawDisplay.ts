import type { ReatomImage } from '../reatomImage'
import { isRawImageFormat } from './types'

export type RawDisplayStage = 'thumbnail' | 'embedded' | 'developed'

export function isRawDisplayPipeline(image: ReatomImage): boolean {
  return isRawImageFormat(image.meta.data()?.format)
}

export function resolveRawDisplayStage(image: ReatomImage): RawDisplayStage {
  if (image.rawDevelopedImage.data()) return 'developed'
  if (image.rawEmbeddedPreviewImage.data()) return 'embedded'
  return 'thumbnail'
}

export function resolveRawDisplayElement(
  image: ReatomImage,
): HTMLImageElement | null {
  return (
    image.rawDevelopedImage.data() ??
    image.rawEmbeddedPreviewImage.data() ??
    null
  )
}

export function resolveRawDisplaySource(
  image: ReatomImage,
): { url: string; orientationBaked: boolean } | null {
  const developedUrl = image.developedImageUrl.data()
  if (developedUrl) return { url: developedUrl, orientationBaked: true }

  const embeddedUrl = image.embeddedPreviewUrl.data()
  if (embeddedUrl) return { url: embeddedUrl, orientationBaked: false }

  return null
}

export function warmRawDevelopPipeline(image: ReatomImage): void {
  if (!isRawDisplayPipeline(image)) return
  void image.rawDeveloped()
}

export function resolveLightboxPreloadUrl(image: ReatomImage): string {
  if (isRawDisplayPipeline(image)) {
    return image.embeddedPreviewUrl.data() ?? image.thumbnail.data()?.url ?? ''
  }
  return image.fullImageUrl.data() ?? image.thumbnail.data()?.url ?? ''
}

export function resolveLightboxDownloadUrl(image: ReatomImage): string {
  if (isRawDisplayPipeline(image)) {
    return (
      image.developedImageUrl.data() ??
      image.embeddedPreviewUrl.data() ??
      image.thumbnail.data()?.url ??
      ''
    )
  }
  return image.fullImageUrl.data() ?? image.thumbnail.data()?.url ?? ''
}
