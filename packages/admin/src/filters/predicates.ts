import { isAbort } from '@reatom/core'

import type {
  AdminAtom,
  AdminFrame,
  CausePredicate,
  FilterPredicate,
  FilterTarget,
} from '../types'

export type AtomRegistry = Map<string, AdminAtom>
export type FrameIndex = Map<number, AdminFrame>

function getTargetValue(
  frame: AdminFrame,
  target: FilterTarget,
  atomRegistry: AtomRegistry,
): string {
  const atom = atomRegistry.get(frame.atomId)
  const name = atom?.name ?? ''
  switch (target) {
    case 'name':
      return name
    case 'state':
      return JSON.stringify(frame.state)
    case 'params':
      return JSON.stringify(frame.params ?? [])
    case 'payload':
      return JSON.stringify(frame.payload)
    default:
      return name
  }
}

function getSearchableString(
  frame: AdminFrame,
  target: FilterTarget | 'all',
  atomRegistry: AtomRegistry,
): string {
  if (target === 'all') {
    const parts = [
      atomRegistry.get(frame.atomId)?.name ?? '',
      JSON.stringify(frame.state),
      JSON.stringify(frame.params ?? []),
      JSON.stringify(frame.payload),
    ]
    return parts.join(' ')
  }
  return getTargetValue(frame, target as FilterTarget, atomRegistry)
}

export function matchText(
  frame: AdminFrame,
  text: string,
  target: FilterTarget | 'all',
  atomRegistry: AtomRegistry,
): boolean {
  if (!text) return true
  const str = getSearchableString(frame, target, atomRegistry)
  return str.toLowerCase().includes(text.toLowerCase())
}

export function matchRegex(
  frame: AdminFrame,
  pattern: string | RegExp,
  target: FilterTarget | 'all',
  atomRegistry: AtomRegistry,
): boolean {
  const str = getSearchableString(frame, target, atomRegistry)
  const re = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern
  return re.test(str)
}

export function matchTimeRange(
  frame: AdminFrame,
  start: number,
  end: number,
): boolean {
  return frame.timestamp >= start && frame.timestamp <= end
}

export function matchError(
  frame: AdminFrame,
): boolean {
  if (!frame.error) return false
  if (isAbort(frame.error)) return false
  return true
}

function nameMatchesPattern(name: string, pattern: string | RegExp): boolean {
  if (typeof pattern === 'string') {
    return name.includes(pattern) || new RegExp(pattern, 'i').test(name)
  }
  return pattern.test(name)
}

export function matchCause(
  frame: AdminFrame,
  direction: '>' | '<',
  referencePattern: string | RegExp,
  frameIndex: FrameIndex,
  atomRegistry: AtomRegistry,
  allFrames?: AdminFrame[],
): boolean {
  if (direction === '>') {
    const visited = new Set<number>()
    const queue = [...frame.pubIds]
    while (queue.length > 0) {
      const pubId = queue.shift()!
      if (visited.has(pubId)) continue
      visited.add(pubId)
      const pubFrame = frameIndex.get(pubId)
      if (!pubFrame) continue
      const pubAtom = atomRegistry.get(pubFrame.atomId)
      const pubName = pubAtom?.name ?? ''
      if (nameMatchesPattern(pubName, referencePattern)) return true
      queue.push(...pubFrame.pubIds)
    }
    return false
  }

  if (direction === '<' && allFrames) {
    return allFrames.some((f) => {
      if (f.id === frame.id) return false
      if (!f.pubIds.includes(frame.id)) return false
      const fAtom = atomRegistry.get(f.atomId)
      const fName = fAtom?.name ?? ''
      return nameMatchesPattern(fName, referencePattern)
    })
  }

  return false
}

export function matchSession(frame: AdminFrame, sessionId: string): boolean {
  return frame.sessionId === sessionId
}

export function evaluatePredicate(
  frame: AdminFrame,
  predicate: FilterPredicate,
  atomRegistry: AtomRegistry,
  frameIndex: FrameIndex,
  allFrames?: AdminFrame[],
): boolean {
  const target = (predicate.target ?? 'name') as FilterTarget
  switch (predicate.type) {
    case 'text':
      return matchText(
        frame,
        String(predicate.value ?? ''),
        target,
        atomRegistry,
      )
    case 'regex':
      return matchRegex(
        frame,
        predicate.value as string | RegExp,
        target,
        atomRegistry,
      )
    case 'timeRange': {
      const [start, end] = (predicate.value as [number, number]) ?? [0, 0]
      return matchTimeRange(frame, start, end)
    }
    case 'error':
      return matchError(frame)
    case 'cause': {
      const causePred = predicate as CausePredicate
      return matchCause(
        frame,
        causePred.direction,
        causePred.referencePattern,
        frameIndex,
        atomRegistry,
        allFrames,
      )
    }
    case 'session':
      return matchSession(frame, String(predicate.value ?? ''))
    default:
      return false
  }
}
