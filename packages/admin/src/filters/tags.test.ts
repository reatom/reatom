import { expect, test } from 'vitest'

import { ADMIN_FRAME } from '../root'
import type { FilterPredicate } from '../types'
import { createTagsManager } from './tags'

test('built-in error tag exists', () => {
  const tagsManager = ADMIN_FRAME.run(() => createTagsManager())
  ADMIN_FRAME.run(() => {
    const tags = tagsManager.tags()
    const errorTag = tags.find((t) => t.name === 'error')
    expect(errorTag).toBeDefined()
    expect(errorTag!.builtIn).toBe(true)
    expect(errorTag!.predicates.length).toBeGreaterThan(0)
  })
})

test('createTag adds custom tag', () => {
  const tagsManager = ADMIN_FRAME.run(() => createTagsManager())
  const predicate: FilterPredicate = {
    id: 'p1',
    type: 'text',
    value: 'foo',
  }
  ADMIN_FRAME.run(() => {
    const tag = tagsManager.createTag('myTag', [predicate])
    expect(tag.name).toBe('myTag')
    expect(tag.predicates).toEqual([predicate])
    expect(tag.builtIn).toBe(false)
    const tags = tagsManager.tags()
    expect(tags.some((t) => t.name === 'myTag')).toBe(true)
  })
})

test('updateTag modifies custom tag', () => {
  const tagsManager = ADMIN_FRAME.run(() => createTagsManager())
  ADMIN_FRAME.run(() => {
    const tag = tagsManager.createTag('original', [])
    tagsManager.updateTag(tag.id, { name: 'updated' })
    const updated = tagsManager.getTag(tag.id)
    expect(updated!.name).toBe('updated')
  })
})

test('deleteTag removes only custom tags', () => {
  const tagsManager = ADMIN_FRAME.run(() => createTagsManager())
  ADMIN_FRAME.run(() => {
    const tag = tagsManager.createTag('toDelete', [])
    const result = tagsManager.deleteTag(tag.id)
    expect(result).toBe(true)
    expect(tagsManager.getTag(tag.id)).toBeUndefined()
    const builtInId = tagsManager.builtInTagIds[0]
    const deleteBuiltIn = tagsManager.deleteTag(builtInId!)
    expect(deleteBuiltIn).toBe(false)
    expect(tagsManager.getTag(builtInId!)).toBeDefined()
  })
})
