import { computed, peek } from '@reatom/core'

import { imagesList } from './model'
import type { ImageFile } from './types'

export function isFavorite(id: string): boolean {
  const model = peek(imagesList.array).find((m) => m.id === id)
  return model?.favorite() ?? false
}

export const favoriteImages = computed((): ImageFile[] => {
  return imagesList
    .array()
    .filter((m) => m.favorite())
    .map((m) => m.source)
}, 'favoriteImages')

export const favoritesCount = computed(() => {
  return imagesList.array().filter((m) => m.favorite()).length
}, 'favoritesCount')
