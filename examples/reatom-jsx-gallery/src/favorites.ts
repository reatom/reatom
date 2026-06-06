import { peek } from '@reatom/core'

import { favoriteImages, favoritesCount, imagesList } from './models/collection'

export { favoriteImages, favoritesCount }

export function isFavorite(id: string): boolean {
  const model = peek(imagesList.array).find((entry) => entry.id === id)
  return model?.favorite() ?? false
}
