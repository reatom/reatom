import type { AtomLike, Frame } from '@reatom/core'
import { _enqueue } from '@reatom/core'

import type { OtlpAttrValue } from './toOtlpValue.ts'

const FRAME_ID_SLOT = 'var#otel.frame.id' as const
const INSTANCE_IN_NAME = /#([^.#]+)/

export type ParsedReatomName = {
  raw: string
  spanName: string
  instance?: string
}

export type ReatomPrimitiveKind = 'action' | 'atom' | 'computed'

export const parseInstanceName = (raw: string): ParsedReatomName => {
  const match = INSTANCE_IN_NAME.exec(raw)
  if (!match) return { raw, spanName: raw }
  return {
    raw,
    spanName: raw.replace(INSTANCE_IN_NAME, '#'),
    instance: match[1],
  }
}

export const reatomPrimitiveKind = (target: AtomLike): ReatomPrimitiveKind => {
  if (target.__reatom.reactive !== true) return 'action'
  return target.__reatom.writable ? 'atom' : 'computed'
}

export const readFrameId = (frame: Frame): string | undefined => {
  const id = frame[FRAME_ID_SLOT]
  return typeof id === 'string' ? id : undefined
}

const isRootFrame = (frame: Frame): boolean => frame === frame.root.frame

const MAX_UNINSTRUMENTED_CAUSE_DEPTH = 16
const MAX_UNINSTRUMENTED_CAUSE_FRAMES = 16

/**
 * `pubs[0]` is the caller. Walk through uninstrumented wrappers
 * (`abortVar.spawn`, `bind`) and take the first frame that has a frame id, even
 * after the batch `changed` set was reset. Uninstrumented reactive callers
 * (effect/computed, no frame id) use `walkUninstrumented` instead.
 */
const walkCallerCause = (
  start: Frame,
  seen: Set<Frame>,
  onInstrumented: (cause: Frame) => void,
) => {
  let framesLeft = MAX_UNINSTRUMENTED_CAUSE_FRAMES
  let frame: Frame | null | undefined = start
  let depth = 1
  while (
    frame &&
    !isRootFrame(frame) &&
    !seen.has(frame) &&
    depth <= MAX_UNINSTRUMENTED_CAUSE_DEPTH &&
    framesLeft > 0
  ) {
    framesLeft--
    seen.add(frame)
    if (readFrameId(frame) !== undefined) {
      onInstrumented(frame)
      return
    }
    frame = frame.pubs[0]
    depth++
  }
}

const walkUninstrumented = (
  start: Frame,
  changed: WeakSet<Frame>,
  seen: Set<Frame>,
  onChanged: (cause: Frame) => void,
) => {
  let framesLeft = MAX_UNINSTRUMENTED_CAUSE_FRAMES
  const walk = (frame: Frame, depth: number) => {
    if (
      depth > MAX_UNINSTRUMENTED_CAUSE_DEPTH ||
      framesLeft <= 0 ||
      seen.has(frame) ||
      isRootFrame(frame)
    ) {
      return
    }
    framesLeft--
    if (changed.has(frame)) {
      seen.add(frame)
      onChanged(frame)
      return
    }
    if (readFrameId(frame) !== undefined) {
      seen.add(frame)
      return
    }
    seen.add(frame)
    if (depth === MAX_UNINSTRUMENTED_CAUSE_DEPTH) return
    for (let i = 0; i < frame.pubs.length; i++) {
      const pub = frame.pubs[i]
      if (pub) walk(pub, depth + 1)
    }
  }
  walk(start, 1)
}

/**
 * Cause frame ids for `reatom.cause.ids`. The caller (`pubs[0]`) is always a
 * cause once an instrumented ancestor is found. An uninstrumented reactive
 * caller (effect/computed with no frame id) walks its changed dependencies
 * instead. Later-index pubs are dependencies: only a `changed` write counts, so
 * a stale read does not.
 */
const visitCauses = (
  frame: Frame,
  changed: WeakSet<Frame>,
  take: (cause: Frame) => void,
) => {
  const seen = new Set<Frame>()
  const caller = frame.pubs[0]
  if (caller && !isRootFrame(caller)) {
    if (caller.atom.__reatom.reactive && readFrameId(caller) === undefined)
      walkUninstrumented(caller, changed, seen, take)
    else walkCallerCause(caller, seen, take)
  }
  for (let i = 1; i < frame.pubs.length; i++) {
    const pub = frame.pubs[i]
    if (!pub || isRootFrame(pub) || seen.has(pub)) continue
    if (changed.has(pub)) {
      seen.add(pub)
      take(pub)
    } else if (readFrameId(pub) === undefined)
      walkUninstrumented(pub, changed, seen, take)
  }
}

export const collectCauseIds = (
  frame: Frame,
  changed: WeakSet<Frame>,
): string[] => {
  const ids: string[] = []
  const seenIds = new Set<string>()
  visitCauses(frame, changed, (cause) => {
    if (!cause || isRootFrame(cause)) return
    const id = readFrameId(cause)
    if (id === undefined || seenIds.has(id)) return
    seenIds.add(id)
    ids.push(id)
  })
  return ids
}

export type TracePair = { traceId: string; spanId: string }

export type TracedCause = TracePair & {
  frameId: string
  changedOrder: number
}

/**
 * Last `markChanged` write in the batch is primary; one cause per other
 * `traceId`.
 */
export const pickCrossTraceCauses = (
  traced: readonly TracedCause[],
): { primary: TracedCause; others: TracedCause[] } | undefined => {
  const latestByTrace = new Map<string, TracedCause>()
  for (const cause of traced) {
    const previous = latestByTrace.get(cause.traceId)
    if (!previous || cause.changedOrder > previous.changedOrder) {
      latestByTrace.set(cause.traceId, cause)
    }
  }
  if (latestByTrace.size < 2) return undefined
  let primary: TracedCause | undefined
  for (const cause of latestByTrace.values()) {
    if (!primary || cause.changedOrder > primary.changedOrder) primary = cause
  }
  const others = [...latestByTrace.values()].filter(
    (cause) => cause.traceId !== primary!.traceId,
  )
  return { primary: primary!, others }
}

const collectTracedCauses = (
  frame: Frame,
  changed: WeakSet<Frame>,
  traces: WeakMap<Frame, TracedCause>,
): TracedCause[] => {
  const result: TracedCause[] = []
  visitCauses(frame, changed, (cause) => {
    const traced = traces.get(cause)
    if (traced) result.push(traced)
  })
  return result
}

export const recordNameAttributes = (
  parsed: ParsedReatomName,
): Record<string, OtlpAttrValue> => {
  const attributes: Record<string, OtlpAttrValue> = {
    'reatom.name': parsed.raw,
  }
  if (parsed.instance !== undefined) {
    attributes['reatom.instance'] = parsed.instance
  }
  return attributes
}

export const createCauseStore = () => {
  let seq = 0
  let changeSeq = 0
  let changed = new WeakSet<Frame>()
  let traces = new WeakMap<Frame, TracedCause>()
  let cleanupQueued = false

  return {
    assign(frame: Frame): string {
      const existing = readFrameId(frame)
      if (existing !== undefined) return existing
      const id = String(++seq)
      frame[FRAME_ID_SLOT] = id
      return id
    },
    markChanged(frame: Frame, trace?: TracePair) {
      changed.add(frame)
      if (!cleanupQueued) {
        cleanupQueued = true
        _enqueue(() => {
          changed = new WeakSet()
          traces = new WeakMap()
          cleanupQueued = false
        }, 'cleanup')
      }
      if (!trace) return
      const frameId = readFrameId(frame)
      if (frameId === undefined) return
      traces.set(frame, {
        frameId,
        traceId: trace.traceId,
        spanId: trace.spanId,
        changedOrder: ++changeSeq,
      })
    },
    causeIds(frame: Frame): string[] {
      return collectCauseIds(frame, changed)
    },
    tracedCauses(frame: Frame): TracedCause[] {
      return collectTracedCauses(frame, changed, traces)
    },
  }
}

export type CauseStore = ReturnType<typeof createCauseStore>
