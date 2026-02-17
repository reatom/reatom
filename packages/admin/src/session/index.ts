import { action, atom, computed } from '@reatom/core'

import { ADMIN_FRAME } from '../root'
import type { AdminSession } from '../types'

const PREFIX = '_Admin.session'

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

export function createSession(
  getMetadata: () => Record<string, unknown> = () => ({}),
) {
  const current = atom<AdminSession>(
    {
      id: generateId(),
      startedAt: Date.now(),
      metadata: getMetadata(),
    },
    `${PREFIX}.current`,
  )

  const id = computed(() => current().id, `${PREFIX}.id`)

  const start = action(() => {
    current.set({
      id: generateId(),
      startedAt: Date.now(),
      metadata: getMetadata(),
    })
    return current()
  }, `${PREFIX}.start`)

  return {
    current,
    id,
    start,
  }
}

export function createSessionManager(
  getMetadata: () => Record<string, unknown> = () => ({}),
) {
  return ADMIN_FRAME.run(() => createSession(getMetadata))
}
