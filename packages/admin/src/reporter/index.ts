import type { ActionState, AtomLike, Frame } from '@reatom/core'
import {
  _enqueue,
  atom,
  bind,
  EXTENSIONS,
  isAction,
  reatomBoolean,
  top,
  withMiddleware,
} from '@reatom/core'
import { isSkip } from '@reatom/core'
import { context } from '@reatom/core'

import { ADMIN_FRAME } from '../root'
import type { AdminAtom, AdminFrame } from '../types'

const ATOM_ID_PREFIX = '_Admin.atom#'
const FRAME_ID_PREFIX = '_Admin.frame#'

let atomIdCounter = 0
let frameIdCounter = 0

export interface ReporterOptions {
  maxEntries?: number
  match?: (name: string) => boolean
  onFrame?: (frame: AdminFrame) => void
  getSessionId?: () => string
}

export interface Reporter {
  atoms: ReturnType<typeof atom<Map<string, AdminAtom>>>
  frames: ReturnType<typeof atom<AdminFrame[]>>
  paused: ReturnType<typeof reatomBoolean>
  clear: () => void
  dispose: () => void
}

export function createReporter(options: ReporterOptions = {}): Reporter {
  const maxEntries = options.maxEntries ?? 10000
  const match = options.match ?? (() => true)
  const onFrame = options.onFrame
  const getSessionId = options.getSessionId ?? (() => '')

  const atomIdMap = new WeakMap<AtomLike, string>()
  const frameIdMap = new WeakMap<Frame, number>()

  const atoms = atom(new Map<string, AdminAtom>(), `${FRAME_ID_PREFIX}atoms`)
  const frames = atom<AdminFrame[]>([], `${FRAME_ID_PREFIX}frames`)
  const paused = reatomBoolean(false, `${FRAME_ID_PREFIX}paused`)

  const clear = () => {
    atoms.set(new Map())
    frames.set([])
  }

  const registerAtom = (target: AtomLike): string => {
    let id = atomIdMap.get(target)
    if (id) return id
    id = `${ATOM_ID_PREFIX}${++atomIdCounter}`
    atomIdMap.set(target, id)
    const adminAtom: AdminAtom = {
      id,
      name: target.name,
      isReactive: target.__reatom.reactive,
    }
    atoms.set(new Map(atoms()).set(id, adminAtom))
    return id
  }

  const getOrCreateFrameId = (frame: Frame): number => {
    if (frame.atom === context) return 0
    let id = frameIdMap.get(frame)
    if (id !== undefined) return id
    id = ++frameIdCounter
    frameIdMap.set(frame, id)
    return id
  }

  const buildPubIds = (frame: Frame): number[] => {
    const ids: number[] = []
    for (let i = 1; i < frame.pubs.length; i++) {
      const pub = frame.pubs[i]
      if (pub !== null && pub !== undefined && pub.atom !== context) {
        const pid = frameIdMap.get(pub)
        if (pid !== undefined) ids.push(pid)
      }
    }
    return ids
  }

  const captureFrame = (
    frame: Frame,
    state: unknown,
    error: unknown,
    params: unknown[] | undefined,
    payload: unknown,
  ) => {
    if (paused()) return
    const target = frame.atom
    if (isSkip(target)) return
    const matchResult = match(target.name)
    if (!matchResult) return

    const atomId = registerAtom(target)
    const frameId = getOrCreateFrameId(frame)
    const pubIds = buildPubIds(frame)

    let resolvedState = state
    let resolvedParams: Array<unknown> | undefined
    let resolvedPayload: unknown

    if (target.__reatom.reactive) {
      resolvedParams = undefined
      resolvedPayload = undefined
    } else {
      const actionState = state as ActionState
      const lastCall = actionState?.at?.(actionState.length - 1)
      resolvedParams = lastCall?.params
      resolvedPayload = lastCall?.payload
    }

    const adminFrame: AdminFrame = {
      id: frameId,
      timestamp: Date.now(),
      sessionId: getSessionId(),
      atomId,
      state: resolvedState,
      error: error ?? null,
      params: resolvedParams,
      payload: resolvedPayload,
      pubIds,
    }

    frames.set((prev) => {
      const next = [...prev, adminFrame]
      if (next.length > maxEntries) return next.slice(-maxEntries)
      return next
    })

    onFrame?.(adminFrame)
  }

  const reporterExt = <T extends AtomLike>(target: T): T => {
    if (isSkip(target)) return target

    return target.extend(
      withMiddleware(
        () =>
          function reporterMiddleware(
            next: (...args: unknown[]) => unknown,
            ...params: unknown[]
          ) {
            const frame = top()
            const prevState = frame.state
            let state: unknown
            let error: unknown = null
            try {
              state = next(...params)
            } catch (e) {
              error = e ?? new Error('unknown error')
              throw e
            }

            _enqueue(
              bind(() => {
                if (target.__reatom.reactive) {
                  if (Object.is(prevState, state)) return
                  const inits = frame.root.inits
                  const initKey = {}
                  if (!inits.has(initKey)) {
                    inits.set(initKey, null)
                    if (params.length === 0) return
                  }
                } else {
                  const actionState = state as ActionState
                  const lastCall = actionState?.at?.(actionState.length - 1)
                  if (
                    isAction(target) &&
                    target.name.endsWith('.onReject') &&
                    lastCall
                  ) {
                    error = (lastCall.payload as { error?: unknown })?.error
                  }
                }
                captureFrame(
                  frame,
                  state,
                  error,
                  params as unknown[] | undefined,
                  undefined,
                )
              }, ADMIN_FRAME),
              'hook',
            )

            return state
          },
      ),
    )
  }

  EXTENSIONS.push(reporterExt)

  const dispose = () => {
    const idx = EXTENSIONS.indexOf(reporterExt)
    if (idx !== -1) EXTENSIONS.splice(idx, 1)
  }

  return {
    atoms,
    frames,
    paused,
    clear,
    dispose,
  }
}
