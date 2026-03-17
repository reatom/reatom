import { isAbort } from '@reatom/core'

import type {
  AdminAtom,
  AdminFrame,
  CausePredicate,
  FilterKind,
  FilterPredicate,
  FilterTarget,
} from '../types'

export type AtomRegistry = Map<string, AdminAtom>
export type FrameIndex = Map<number, AdminFrame>

function serializeValue(value: unknown): string {
  if (value === undefined) return 'undefined'
  if (value === null) return 'null'
  if (value instanceof Error) {
    return [value.name, value.message, value.stack ?? ''].join(' ')
  }
  if (value instanceof URL) return value.href
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'symbol') return value.toString()
  if (typeof value === 'function') {
    return value.name ? `[Function ${value.name}]` : '[Function anonymous]'
  }

  try {
    return JSON.stringify(value)
  } catch {
    return Object.prototype.toString.call(value)
  }
}

function getPatternRegex(pattern: string | RegExp): RegExp | null {
  if (pattern instanceof RegExp) return pattern

  const delimitedMatch = pattern.match(/^\/(.+)\/([a-z]*)$/i)
  if (delimitedMatch) {
    const [, source, flags] = delimitedMatch
    try {
      return new RegExp(source, flags)
    } catch {
      return null
    }
  }

  try {
    return new RegExp(pattern, 'i')
  } catch {
    return null
  }
}

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
      return serializeValue(frame.state)
    case 'params':
      return serializeValue(frame.params ?? [])
    case 'payload':
      return serializeValue(frame.payload)
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
      serializeValue(frame.state),
      serializeValue(frame.params ?? []),
      serializeValue(frame.payload),
      serializeValue(frame.error),
    ]
    return parts.join(' ')
  }
  return getTargetValue(frame, target, atomRegistry)
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
  const re = getPatternRegex(pattern)
  if (!re) return false
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
  atomRegistry: AtomRegistry,
): boolean {
  if (!frame.error) return false
  if (isAbort(frame.error)) return false
  const atom = atomRegistry.get(frame.atomId)
  if (atom?.name.endsWith('.onReject')) return true
  return true
}

function toFilterKind(value: unknown): FilterKind {
  if (typeof value !== 'string') return 'action'

  switch (value) {
    case 'reactive':
    case 'action':
    case 'async':
    case 'reject':
    case 'fulfill':
      return value
    default:
      return 'action'
  }
}

export function matchKind(
  frame: AdminFrame,
  kind: FilterKind,
  atomRegistry: AtomRegistry,
): boolean {
  const atom = atomRegistry.get(frame.atomId)
  if (!atom) return false

  const isReactive = atom.isReactive
  const isAction = !isReactive
  const isReject = atom.name.endsWith('.onReject')
  const isFulfill = atom.name.endsWith('.onFulfill')
  const isAsync = isReject || isFulfill

  switch (kind) {
    case 'reactive':
      return isReactive
    case 'action':
      return isAction
    case 'async':
      return isAsync
    case 'reject':
      return isReject
    case 'fulfill':
      return isFulfill
    default:
      return false
  }
}

function nameMatchesPattern(name: string, pattern: string | RegExp): boolean {
  if (typeof pattern === 'string' && name.includes(pattern)) return true
  const regex = getPatternRegex(pattern)
  if (!regex) return false
  return regex.test(name)
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

function toRegexPattern(value: unknown): string | RegExp {
  return value instanceof RegExp || typeof value === 'string' ? value : ''
}

function toTimeRange(value: unknown): [number, number] {
  if (!Array.isArray(value)) return [0, 0]
  const [start, end] = value
  return [
    typeof start === 'number' ? start : 0,
    typeof end === 'number' ? end : 0,
  ]
}

function isCausePredicate(
  predicate: FilterPredicate,
): predicate is CausePredicate {
  return predicate.type === 'cause'
}

export function evaluatePredicate(
  frame: AdminFrame,
  predicate: FilterPredicate,
  atomRegistry: AtomRegistry,
  frameIndex: FrameIndex,
  allFrames?: AdminFrame[],
): boolean {
  const target = predicate.target ?? 'name'
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
        toRegexPattern(predicate.value),
        target,
        atomRegistry,
      )
    case 'timeRange': {
      const [start, end] = toTimeRange(predicate.value)
      return matchTimeRange(frame, start, end)
    }
    case 'error':
      return matchError(frame, atomRegistry)
    case 'kind':
      return matchKind(frame, toFilterKind(predicate.value), atomRegistry)
    case 'cause': {
      if (!isCausePredicate(predicate)) return false
      const causePred = predicate
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
