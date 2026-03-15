import { action, atom, computed, withLocalStorage } from '@reatom/core'

import { ADMIN_FRAME } from '../root'
import type {
  AdminAtom,
  AdminFrame,
  FilterConfig,
  FilterGroup,
  FilterTag,
  HighlightStyle,
} from '../types'
import { evaluateExpression } from './expression'
import { canPersistToLocalStorage } from './persistence'

export interface EngineDeps {
  frames: () => AdminFrame[]
  atoms: () => Map<string, AdminAtom>
  sessionId: () => string
  tags: () => FilterTag[]
  expression: () => FilterGroup
}

const PREFIX = '_Admin.filters.engine'
const CONFIGS_STORAGE_KEY = `${PREFIX}.configs.v1`
const DEFAULT_HIGHLIGHT_COLOR = '#89b4fa'

export type FilterConfigInput = Pick<
  FilterConfig,
  'id' | 'expression' | 'mode'
> &
  Partial<Pick<FilterConfig, 'name' | 'enabled' | 'highlightColor'>>

function normalizeConfig(config: FilterConfigInput | FilterConfig): FilterConfig {
  return {
    enabled: true,
    name: 'Custom filter',
    highlightColor:
      config.mode === 'highlight' ? DEFAULT_HIGHLIGHT_COLOR : undefined,
    ...config,
  }
}

function getHighlightStyle(color: string): HighlightStyle {
  return {
    background: `color-mix(in srgb, ${color} 16%, transparent)`,
    borderColor: color,
    textColor: color,
  }
}

export function createEngine(deps: EngineDeps) {
  const configsBase = atom<FilterConfig[]>([], `${PREFIX}.configs`)
  const configs = canPersistToLocalStorage()
    ? configsBase.extend(withLocalStorage(CONFIGS_STORAGE_KEY))
    : configsBase

  const addConfig = action((config: FilterConfigInput) => {
    configs.set([...configs(), normalizeConfig(config)])
  }, `${PREFIX}.addConfig`)

  const removeConfig = action((id: string) => {
    configs.set(configs().filter((c) => c.id !== id))
  }, `${PREFIX}.removeConfig`)

  const updateConfig = action((id: string, updates: Partial<FilterConfig>) => {
    configs.set(
      configs().map((config) =>
        config.id === id ? normalizeConfig({ ...config, ...updates }) : config,
      ),
    )
  }, `${PREFIX}.updateConfig`)

  const toggleConfig = action((id: string) => {
    configs.set(
      configs().map((config) =>
        config.id === id
          ? normalizeConfig({ ...config, enabled: !config.enabled })
          : config,
      ),
    )
  }, `${PREFIX}.toggleConfig`)

  const sessionFrames = computed(() => {
    const allFrames = deps.frames()
    const sessionId = deps.sessionId()
    return allFrames.filter((frame) => frame.sessionId === sessionId)
  }, `${PREFIX}.sessionFrames`)

  const atomRegistry = () => deps.atoms()

  const matchesConfig = (
    frame: AdminFrame,
    config: FilterConfig,
    data: AdminFrame[],
  ): boolean => {
    const frameIndex = new Map(data.map((entry) => [entry.id, entry]))
    return evaluateExpression(
      frame,
      config.expression,
      deps.tags(),
      atomRegistry(),
      frameIndex,
      data,
    )
  }

  const activeDataSource = computed(() => {
    const frames = sessionFrames()
    const excludeConfigs = configs().filter(
      (config) => config.enabled && config.mode === 'exclude',
    )
    if (excludeConfigs.length === 0) return frames

    const frameIndex = new Map(frames.map((frame) => [frame.id, frame]))
    const tags = deps.tags()
    const atoms = atomRegistry()

    return frames.filter((frame) => {
      const matchesExclude = excludeConfigs.some((config) =>
        evaluateExpression(
          frame,
          config.expression,
          tags,
          atoms,
          frameIndex,
          frames,
        ),
      )
      return !matchesExclude
    })
  }, `${PREFIX}.activeDataSource`)

  const visibleFrames = computed(() => {
    const data = activeDataSource()
    const activeConfigs = configs().filter((config) => config.enabled)
    const showConfigs = activeConfigs.filter((config) => config.mode === 'show')
    const hideConfigs = activeConfigs.filter((config) => config.mode === 'hide')
    const frameIndex = new Map(data.map((frame) => [frame.id, frame]))
    const tags = deps.tags()
    const atoms = atomRegistry()

    if (showConfigs.length === 0 && hideConfigs.length === 0) {
      return data
    }

    return data.filter((frame) => {
      const matchesShow = showConfigs.some((config) =>
        evaluateExpression(
          frame,
          config.expression,
          tags,
          atoms,
          frameIndex,
          data,
        ),
      )
      const matchesHide = hideConfigs.some((config) =>
        evaluateExpression(
          frame,
          config.expression,
          tags,
          atoms,
          frameIndex,
          data,
        ),
      )
      if (showConfigs.length > 0 && !matchesShow) return false
      if (matchesHide) return false
      return true
    })
  }, `${PREFIX}.visibleFrames`)

  const highlightedFrames = computed(() => {
    const data = activeDataSource()
    const highlightConfigs = configs().filter(
      (config) => config.enabled && config.mode === 'highlight',
    )
    const highlighted = new Map<number, HighlightStyle>()
    if (highlightConfigs.length === 0) return highlighted

    const frameIndex = new Map(data.map((frame) => [frame.id, frame]))
    const tags = deps.tags()
    const atoms = atomRegistry()

    for (const frame of data) {
      for (const config of highlightConfigs) {
        const matches = evaluateExpression(
          frame,
          config.expression,
          tags,
          atoms,
          frameIndex,
          data,
        )
        if (!matches) continue

        const color = config.highlightColor ?? DEFAULT_HIGHLIGHT_COLOR
        highlighted.set(frame.id, getHighlightStyle(color))
      }
    }

    return highlighted
  }, `${PREFIX}.highlightedFrames`)

  const highlightedIds = computed(() => {
    return new Set<number>(highlightedFrames().keys())
  }, `${PREFIX}.highlightedIds`)

  const configMatches = computed(() => {
    const data = sessionFrames()
    const counts = new Map<string, number>()
    for (const config of configs()) {
      const matchedCount = data.reduce((count, frame) => {
        const isMatch = matchesConfig(frame, config, data)
        return isMatch ? count + 1 : count
      }, 0)
      counts.set(config.id, matchedCount)
    }
    return counts
  }, `${PREFIX}.configMatches`)

  const draftConfig = computed(() => {
    return normalizeConfig({
      id: `${PREFIX}.draft`,
      name: 'Draft filter',
      expression: deps.expression(),
      mode: 'show',
      enabled: true,
    })
  }, `${PREFIX}.draftConfig`)

  const addDraftConfig = action(
    (name: string, mode: FilterConfig['mode'] = 'show') => {
      addConfig({
        id: `${PREFIX}.config.${Date.now()}`,
        name,
        expression: deps.expression(),
        mode,
        enabled: true,
      })
    },
    `${PREFIX}.addDraftConfig`,
  )

  const duplicateConfig = action((id: string) => {
    const config = configs().find((entry) => entry.id === id)
    if (!config) return null
    const clone = normalizeConfig({
      ...config,
      id: `${PREFIX}.config.${Date.now()}`,
      name: `${config.name} copy`,
    })
    configs.set([...configs(), clone])
    return clone
  }, `${PREFIX}.duplicateConfig`)

  const clearConfigs = action(() => {
    configs.set([])
  }, `${PREFIX}.clearConfigs`)

  const reorderConfigs = action((orderedIds: string[]) => {
    const configById = new Map(configs().map((config) => [config.id, config]))
    const ordered = orderedIds
      .map((id) => configById.get(id))
      .filter((config): config is FilterConfig => config !== undefined)
    const remaining = configs().filter(
      (config) => !orderedIds.includes(config.id),
    )
    configs.set([...ordered, ...remaining])
  }, `${PREFIX}.reorderConfigs`)

  return {
    configs,
    addConfig,
    removeConfig,
    updateConfig,
    toggleConfig,
    duplicateConfig,
    clearConfigs,
    reorderConfigs,
    sessionFrames,
    activeDataSource,
    visibleFrames,
    highlightedFrames,
    highlightedIds,
    configMatches,
    draftConfig,
    addDraftConfig,
  }
}

export function createEngineManager(deps: EngineDeps) {
  return ADMIN_FRAME.run(() => createEngine(deps))
}
