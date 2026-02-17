import { action, atom, computed } from '@reatom/core'

import { ADMIN_FRAME } from '../root'
import type {
  AdminAtom,
  AdminFrame,
  FilterConfig,
  FilterGroup,
  FilterTag,
} from '../types'
import { evaluateExpression } from './expression'
import type { AtomRegistry } from './predicates'

export interface EngineDeps {
  frames: () => AdminFrame[]
  atoms: () => Map<string, AdminAtom>
  sessionId: () => string
  tags: () => FilterTag[]
  expression: () => FilterGroup
}

const PREFIX = '_Admin.filters.engine'

export function createEngine(deps: EngineDeps) {
  const configs = atom<FilterConfig[]>([], `${PREFIX}.configs`)

  const addConfig = action((config: FilterConfig) => {
    configs.set([...configs(), config])
  }, `${PREFIX}.addConfig`)

  const removeConfig = action((id: string) => {
    configs.set(configs().filter((c) => c.id !== id))
  }, `${PREFIX}.removeConfig`)

  const updateConfig = action((id: string, updates: Partial<FilterConfig>) => {
    configs.set(configs().map((c) => (c.id === id ? { ...c, ...updates } : c)))
  }, `${PREFIX}.updateConfig`)

  const activeDataSource = computed(() => {
    const allFrames = deps.frames()
    const sessId = deps.sessionId()
    const sessionFiltered = allFrames.filter((f) => f.sessionId === sessId)
    const excludeConfigs = configs().filter((c) => c.mode === 'exclude')
    if (excludeConfigs.length === 0) return sessionFiltered
    const atomRegistry = deps.atoms() as AtomRegistry
    const frameIndex = new Map(sessionFiltered.map((f) => [f.id, f]))
    const tags = deps.tags()
    const expr = deps.expression()
    return sessionFiltered.filter((f) => {
      const matchesExclude = excludeConfigs.some((config) =>
        evaluateExpression(
          f,
          config.expression,
          tags,
          atomRegistry,
          frameIndex,
          sessionFiltered,
        ),
      )
      return !matchesExclude
    })
  }, `${PREFIX}.activeDataSource`)

  const visibleFrames = computed(() => {
    const data = activeDataSource()
    const showConfigs = configs().filter((c) => c.mode === 'show')
    const hideConfigs = configs().filter((c) => c.mode === 'hide')
    const atomRegistry = deps.atoms() as AtomRegistry
    const frameIndex = new Map(data.map((f) => [f.id, f]))
    const tags = deps.tags()
    const expr = deps.expression()

    if (showConfigs.length === 0 && hideConfigs.length === 0) {
      return data
    }

    return data.filter((f) => {
      const matchesShow = showConfigs.some((config) =>
        evaluateExpression(
          f,
          config.expression,
          tags,
          atomRegistry,
          frameIndex,
          data,
        ),
      )
      const matchesHide = hideConfigs.some((config) =>
        evaluateExpression(
          f,
          config.expression,
          tags,
          atomRegistry,
          frameIndex,
          data,
        ),
      )
      if (showConfigs.length > 0 && !matchesShow) return false
      if (matchesHide) return false
      return true
    })
  }, `${PREFIX}.visibleFrames`)

  const highlightedIds = computed(() => {
    const data = activeDataSource()
    const highlightConfigs = configs().filter((c) => c.mode === 'highlight')
    if (highlightConfigs.length === 0) return new Set<number>()
    const atomRegistry = deps.atoms() as AtomRegistry
    const frameIndex = new Map(data.map((f) => [f.id, f]))
    const tags = deps.tags()
    const ids = new Set<number>()
    for (const f of data) {
      const matches = highlightConfigs.some((config) =>
        evaluateExpression(
          f,
          config.expression,
          tags,
          atomRegistry,
          frameIndex,
          data,
        ),
      )
      if (matches) ids.add(f.id)
    }
    return ids
  }, `${PREFIX}.highlightedIds`)

  return {
    configs,
    addConfig,
    removeConfig,
    updateConfig,
    activeDataSource,
    visibleFrames,
    highlightedIds,
  }
}

export function createEngineManager(deps: EngineDeps) {
  return ADMIN_FRAME.run(() => createEngine(deps))
}
