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
  const getSession = () => sessionOverride() ?? deps.session()

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

  const clear = action(() => {
    frames.set([])
    atomsOverride.set(null)
    sessionOverride.set(null)
    selectedFrameId.set(null)
    source.set('live')
  }, `${PREFIX}.clear`)

  const selectFrame = action((frameId: number | null) => {
    selectedFrameId.set(frameId)
  }, `${PREFIX}.selectFrame`)

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

  const frameCount = computed(() => frames().length, `${PREFIX}.frameCount`)

  const errorCount = computed(() => {
    return frames().reduce(
      (count, frame) => (frame.error !== null ? count + 1 : count),
      0,
    )
  }, `${PREFIX}.errorCount`)

  const uniqueAtomsCount = computed(
    () => uniqueNames().length,
    `${PREFIX}.uniqueAtomsCount`,
  )

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

  const latestFrameByAtom = computed(() => {
    const latest = new Map<string, AdminFrame>()
    for (const frame of frames()) {
      latest.set(frame.atomId, frame)
    }
    return latest
  }, `${PREFIX}.latestFrameByAtom`)

  const latestFrames = computed(() => {
    return Array.from(latestFrameByAtom().values()).sort(
      (left, right) => left.timestamp - right.timestamp,
    )
  }, `${PREFIX}.latestFrames`)

  const latestStateEntries = computed(() => {
    const atoms = getAtoms()
    return latestFrames().map((frame) => ({
      atom: atoms.get(frame.atomId),
      frame,
    }))
  }, `${PREFIX}.latestStateEntries`)

  const currentSession = computed(() => getSession(), `${PREFIX}.currentSession`)

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
    currentSession,
    selectedFrameId,
    selectFrame,
    selectedFrame,
    frameIndex,
    uniqueNames,
    frameCount,
    errorCount,
    uniqueAtomsCount,
    timeRange,
    latestFrameByAtom,
    latestFrames,
    latestStateEntries,
    importSession,
    exportSession,
    syncFromReporter,
    clear,
    getAtoms,
    getSession,
  }
}

export function createStoreManager(deps: StoreDeps) {
  return ADMIN_FRAME.run(() => createStore(deps))
}
