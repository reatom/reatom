import { action, atom, computed } from '@reatom/core'

import { ADMIN_FRAME } from '../root'
import type { FilterPredicate, FilterTag } from '../types'

const ERROR_TAG_ID = '_Admin.builtin.error'
const PREFIX = '_Admin.filters.tags'

const builtInErrorPredicate: FilterPredicate = {
  id: '_Admin.builtin.error.pred',
  type: 'error',
  value: true,
}

const builtInTags: FilterTag[] = [
  {
    id: ERROR_TAG_ID,
    name: 'error',
    predicates: [builtInErrorPredicate],
    builtIn: true,
  },
]

export function createTags() {
  const customTags = atom<FilterTag[]>([], `${PREFIX}.custom`)

  const tags = computed(
    () => [...builtInTags, ...customTags()],
    `${PREFIX}.all`,
  )

  const createTag = action((name: string, predicates: FilterPredicate[]) => {
    const id = `${PREFIX}.tag.${Date.now()}`
    const tag: FilterTag = {
      id,
      name,
      predicates,
      builtIn: false,
    }
    customTags.set([...customTags(), tag])
    return tag
  }, `${PREFIX}.createTag`)

  const updateTag = action(
    (
      tagId: string,
      updates: { name?: string; predicates?: FilterPredicate[] },
    ) => {
      const builtIn = builtInTags.find((t) => t.id === tagId)
      if (builtIn) return null
      const list = customTags()
      const idx = list.findIndex((t) => t.id === tagId)
      if (idx === -1) return null
      const next = [...list]
      next[idx] = { ...next[idx]!, ...updates }
      customTags.set(next)
      return next[idx]!
    },
    `${PREFIX}.updateTag`,
  )

  const deleteTag = action((tagId: string) => {
    const builtIn = builtInTags.find((t) => t.id === tagId)
    if (builtIn) return false
    customTags.set(customTags().filter((t) => t.id !== tagId))
    return true
  }, `${PREFIX}.deleteTag`)

  const getTag = (tagId: string): FilterTag | undefined =>
    tags().find((t) => t.id === tagId)

  return {
    tags,
    createTag,
    updateTag,
    deleteTag,
    getTag,
    builtInTagIds: builtInTags.map((t) => t.id),
  }
}

export function createTagsManager() {
  return ADMIN_FRAME.run(() => createTags())
}
