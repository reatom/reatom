import { action, atom, computed } from '@reatom/core'

import { ADMIN_FRAME } from '../root'
import type {
  AdminAtom,
  AdminFrame,
  AdminSession,
  ExportedSession,
} from '../types'

const PREFIX = '_Admin.store'

export interface StoreDeps {
  frames: () => AdminFrame[]
  atoms: () => Map<string, AdminAtom>
  session: () => AdminSession
}

export function createStore(deps: StoreDeps) {
  const maxFrames = atom(10000, `${PREFIX}.maxFrames`)
  const frames = atom<AdminFrame[]>(deps.frames(), `${PREFIX}.frames`)
  const atomsOverride = atom<Map<string, AdminAtom> | null>(
    null,
    `${PREFIX}.atomsOverride`,
  )
  const sessionOverride = atom<AdminSession | null>(
    null,
    `${PREFIX}.sessionOverride`,
  )
  const source = atom<'live' | 'replay'>('live', `${PREFIX}.source`)
  const selectedFrameId = atom<number | null>(null, `${PREFIX}.selectedFrameId`)

  const getAtoms = () => atomsOverride() ?? deps.atoms()

  const syncFromReporter = action(() => {
    const repFrames = deps.frames()
    if (repFrames.length > 0) {
      const max = maxFrames()
      const next =
        repFrames.length > max ? repFrames.slice(-max) : [...repFrames]
      frames.set(next)
      atomsOverride.set(null)
      sessionOverride.set(null)
      source.set('live')
    }
  }, `${PREFIX}.syncFromReporter`)

  const importSession = action(
    (data: {
      session: AdminSession
      atoms: Record<string, AdminAtom>
      frames: AdminFrame[]
    }) => {
      const atomsMap = new Map<string, AdminAtom>(Object.entries(data.atoms))
      const max = maxFrames()
      const nextFrames =
        data.frames.length > max ? data.frames.slice(-max) : [...data.frames]
      frames.set(nextFrames)
      atomsOverride.set(atomsMap)
      sessionOverride.set(data.session)
      source.set('replay')
    },
    `${PREFIX}.importSession`,
  )

  const selectedFrame = computed(() => {
    const id = selectedFrameId()
    if (id === null) return null
    const frame = frames().find((f) => f.id === id)
    return frame ?? null
  }, `${PREFIX}.selectedFrame`)

  const frameIndex = computed(() => {
    const index = new Map<number, AdminFrame>()
    for (const f of frames()) {
      index.set(f.id, f)
    }
    return index
  }, `${PREFIX}.frameIndex`)

  const uniqueNames = computed(() => {
    const names = new Set<string>()
    const atomsMap = getAtoms()
    for (const f of frames()) {
      const a = atomsMap.get(f.atomId)
      if (a) names.add(a.name)
    }
    return Array.from(names)
  }, `${PREFIX}.uniqueNames`)

  const timeRange = computed((): [number, number] => {
    const list = frames()
    if (list.length === 0) return [0, 0]
    let min = Infinity
    let max = -Infinity
    for (const f of list) {
      if (f.timestamp < min) min = f.timestamp
      if (f.timestamp > max) max = f.timestamp
    }
    return [min === Infinity ? 0 : min, max === -Infinity ? 0 : max]
  }, `${PREFIX}.timeRange`)

  const exportSession = computed((): ExportedSession => {
    const atomsMap = getAtoms()
    const atomsRecord: Record<string, AdminAtom> = {}
    atomsMap.forEach((v, k) => {
      atomsRecord[k] = v
    })
    const session = sessionOverride() ?? deps.session()
    return {
      session,
      atoms: atomsRecord,
      frames: [...frames()],
    }
  }, `${PREFIX}.exportSession`)

  return {
    frames,
    maxFrames,
    source,
    selectedFrameId,
    selectedFrame,
    frameIndex,
    uniqueNames,
    timeRange,
    importSession,
    exportSession,
    syncFromReporter,
    getAtoms,
  }
}

export function createStoreManager(deps: StoreDeps) {
  return ADMIN_FRAME.run(() => createStore(deps))
}
