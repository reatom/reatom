import { action, atom, computed, withLocalStorage } from '@reatom/core'

export const favoriteProjectIdsAtom = atom<Array<string>>(
  [],
  'projects.favoriteIds',
).extend(
  withLocalStorage({
    key: 'reatom-mantine-dashboard.favorite-projects',
    version: 1,
  }),
)

export const favoriteProjectsCountAtom = computed(
  () => favoriteProjectIdsAtom().length,
  'projects.favoriteCount',
)

export const toggleProjectFavoriteAction = action((projectId: string) => {
  favoriteProjectIdsAtom.set((ids) =>
    ids.includes(projectId)
      ? ids.filter((id) => id !== projectId)
      : [...ids, projectId],
  )
}, 'projects.toggleFavorite')
