import { action, atom, computed, withLocalStorage } from '@reatom/core'

import { ADMIN_FRAME } from '../root'
import type { FilterPredicate, FilterTag } from '../types'
import { canPersistToLocalStorage } from './persistence'

const ERROR_TAG_ID = '_Admin.builtin.error'
const ACTION_TAG_ID = '_Admin.builtin.action'
const REACTIVE_TAG_ID = '_Admin.builtin.reactive'
const ASYNC_TAG_ID = '_Admin.builtin.async'
const REJECT_TAG_ID = '_Admin.builtin.reject'
const FULFILL_TAG_ID = '_Admin.builtin.fulfill'
const PREFIX = '_Admin.filters.tags'
const CUSTOM_TAGS_STORAGE_KEY = `${PREFIX}.custom.v1`

const builtInErrorPredicate: FilterPredicate = {
  id: '_Admin.builtin.error.pred',
  type: 'error',
  value: true,
}

const builtInActionPredicate: FilterPredicate = {
  id: '_Admin.builtin.action.pred',
  type: 'kind',
  value: 'action',
}

const builtInReactivePredicate: FilterPredicate = {
  id: '_Admin.builtin.reactive.pred',
  type: 'kind',
  value: 'reactive',
}

const builtInAsyncPredicate: FilterPredicate = {
  id: '_Admin.builtin.async.pred',
  type: 'kind',
  value: 'async',
}

const builtInRejectPredicate: FilterPredicate = {
  id: '_Admin.builtin.reject.pred',
  type: 'kind',
  value: 'reject',
}

const builtInFulfillPredicate: FilterPredicate = {
  id: '_Admin.builtin.fulfill.pred',
  type: 'kind',
  value: 'fulfill',
}

const builtInTags: FilterTag[] = [
  {
    id: ERROR_TAG_ID,
    name: 'error',
    predicates: [builtInErrorPredicate],
    builtIn: true,
  },
  {
    id: ACTION_TAG_ID,
    name: 'action',
    predicates: [builtInActionPredicate],
    builtIn: true,
  },
  {
    id: REACTIVE_TAG_ID,
    name: 'reactive',
    predicates: [builtInReactivePredicate],
    builtIn: true,
  },
  {
    id: ASYNC_TAG_ID,
    name: 'async',
    predicates: [builtInAsyncPredicate],
    builtIn: true,
  },
  {
    id: REJECT_TAG_ID,
    name: 'reject',
    predicates: [builtInRejectPredicate],
    builtIn: true,
  },
  {
    id: FULFILL_TAG_ID,
    name: 'fulfill',
    predicates: [builtInFulfillPredicate],
    builtIn: true,
  },
]

export function createTags() {
  const customTagsBase = atom<FilterTag[]>([], `${PREFIX}.custom`)
  const customTags = canPersistToLocalStorage()
    ? customTagsBase.extend(withLocalStorage(CUSTOM_TAGS_STORAGE_KEY))
    : customTagsBase

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
