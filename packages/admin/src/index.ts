import { noop, urlAtom } from '@reatom/core'

import { createCauseGraphManager } from './cause-graph'
import { createEngineManager } from './filters/engine'
import { createExpressionManager } from './filters/expression'
import { createSearchManager } from './filters/search'
import { createTagsManager } from './filters/tags'
import { createReporter } from './reporter'
import { ADMIN_FRAME } from './root'
import { createSessionManager } from './session'
import { createStoreManager } from './store'
import { createTimelineManager } from './timeline'
import type { AdminFrame } from './types'

export { createCauseGraphManager } from './cause-graph'
export {
  createEngineManager,
  createExpressionManager,
  createSearchManager,
  createTagsManager,
} from './filters'
export { createReporter } from './reporter'
export { ADMIN_FRAME } from './root'
export { createSessionManager } from './session'
export { createStoreManager } from './store'
export { createTimelineManager } from './timeline'
export type { AdminAtom, AdminFrame, AdminSession } from './types'
export type { ExportedSession } from './types'
export type { AdminDevtools, AdminDevtoolsOptions } from './view'
export { createAdminApp, createAdminDevtools } from './view'

export interface AdminOptions {
  maxFrames?: number
  metadata?: Record<string, unknown>
  match?: (name: string) => boolean
  onFrame?: (frame: AdminFrame) => void
}

export interface Admin {
  reporter: ReturnType<typeof createReporter>
  session: ReturnType<typeof createSessionManager>
  store: ReturnType<typeof createStoreManager>
  filters: {
    tags: ReturnType<typeof createTagsManager>
    expression: ReturnType<typeof createExpressionManager>
    engine: ReturnType<typeof createEngineManager>
    search: ReturnType<typeof createSearchManager>
  }
  timeline: ReturnType<typeof createTimelineManager>
  causeGraph: ReturnType<typeof createCauseGraphManager>
  dispose: () => void
}

export function createAdmin(options: AdminOptions = {}): Admin {
  return ADMIN_FRAME.run(() => {
    urlAtom.sync.set(() => noop)
    urlAtom.set(new URL('https://admin.local'))

    const session = createSessionManager(() => options.metadata ?? {})
    const reporter = createReporter({
      maxEntries: options.maxFrames ?? 10000,
      match: options.match,
      onFrame: options.onFrame,
      getSessionId: () => session.current().id,
    })

    const store = createStoreManager({
      frames: () => reporter.frames(),
      atoms: () => reporter.atoms(),
      session: () => session.current(),
    })

    const tags = createTagsManager()
    const expression = createExpressionManager()
    const engine = createEngineManager({
      frames: () => store.frames(),
      atoms: () => store.getAtoms(),
      sessionId: () => store.exportSession().session.id,
      tags: () => tags.tags(),
      expression: () => expression.expression(),
    })

    const search = createSearchManager({
      visibleFrames: () => engine.visibleFrames(),
      atoms: () => store.getAtoms(),
    })

    const timeline = createTimelineManager({
      frames: () => store.frames(),
    })

    const causeGraph = createCauseGraphManager({
      visibleFrames: () => engine.visibleFrames(),
      atoms: () => store.getAtoms(),
    })

    const syncStore = () => store.syncFromReporter()
    const unsubscribeSync = reporter.frames.subscribe(syncStore)
    syncStore()

    const dispose = () => {
      reporter.dispose()
      unsubscribeSync?.()
    }

    return {
      reporter,
      session,
      store,
      filters: {
        tags,
        expression,
        engine,
        search,
      },
      timeline,
      causeGraph,
      dispose,
    }
  })
}
