import { setBounded } from './boundedMap.ts'

export type SamplingInput = {
  ratio?: number
  by?: 'trace' | 'session'
  updates?: number
  errors?: 'always'
}

export type ResolvedSampling = {
  ratio: number
  by: 'trace' | 'session'
  updates: number
  errors: 'always'
}

const TRACE_ID_RATIO_MASK = 0xffffffff

export const resolveSampling = (input?: SamplingInput): ResolvedSampling => {
  const ratio =
    typeof input?.ratio === 'number' && Number.isFinite(input.ratio)
      ? Math.min(1, Math.max(0, input.ratio))
      : 1
  return {
    ratio,
    by: input?.by === 'session' ? 'session' : 'trace',
    updates:
      typeof input?.updates === 'number' && Number.isFinite(input.updates)
        ? Math.min(1, Math.max(0, input.updates))
        : 1,
    errors: 'always',
  }
}

const sampleTraceIdRatio = (traceId: string, ratio: number): boolean => {
  if (ratio >= 1) return true
  if (ratio <= 0) return false
  const upperBound = Math.floor(ratio * TRACE_ID_RATIO_MASK)
  const value = Number.parseInt(traceId.slice(24, 32), 16)
  if (!Number.isFinite(value)) return false
  return value <= upperBound
}

/** Stable across tabs and reloads; identity owns the sampling lifetime. */
export const sampleSessionRatio = (id: string, ratio: number): boolean => {
  if (ratio >= 1) return true
  if (ratio <= 0) return false
  let hash = 2166136261
  for (let index = 0; index < id.length; index++) {
    hash = Math.imul(hash ^ id.charCodeAt(index), 16777619)
  }
  return (hash >>> 0) / 0x100000000 < ratio
}

const RING_TRACES = 16
const RING_SPANS = 32

export const createErrorRing = <T>() => {
  const traces = new Map<string, T[]>()
  return {
    clear() {
      traces.clear()
    },
    add(traceId: string, item: T) {
      let items = traces.get(traceId)
      if (!items) {
        items = []
        setBounded(traces, traceId, items, RING_TRACES)
      }
      if (items.length >= RING_SPANS) items.shift()
      items.push(item)
    },
    take(traceId: string): T[] {
      const items = traces.get(traceId)
      traces.delete(traceId)
      return items ?? []
    },
  }
}

export type TraceSamplingDecision = {
  sampled: boolean
  remote: boolean
}

const MAX_TRACE_DECISIONS = 1024

export const createTraceSampler = (
  samplingOf: () => ResolvedSampling,
  sessionTraceId: () => string,
  sessionDecision?: (id: string) => boolean,
) => {
  const decisions = new Map<string, TraceSamplingDecision>()

  const sampleRoot = (traceId: string, sessionId: string): boolean => {
    const sampling = samplingOf()
    if (sampling.by === 'session') {
      const id = sessionId
      return sessionDecision?.(id) ?? sampleSessionRatio(id, sampling.ratio)
    }
    return sampleTraceIdRatio(traceId, sampling.ratio)
  }

  const note = (traceId: string, decision: TraceSamplingDecision) => {
    setBounded(decisions, traceId, decision, MAX_TRACE_DECISIONS)
  }

  const root = (
    traceId: string,
    sessionId = sessionTraceId(),
  ): TraceSamplingDecision => {
    const key =
      samplingOf().by === 'session' ? `${traceId}:${sessionId}` : traceId
    const existing = decisions.get(traceId) ?? decisions.get(key)
    if (existing) return existing
    const decision: TraceSamplingDecision = {
      sampled: sampleRoot(traceId, sessionId),
      remote: false,
    }
    note(key, decision)
    return decision
  }

  const of = (traceId: string, sessionId?: string): TraceSamplingDecision =>
    decisions.get(traceId) ?? root(traceId, sessionId)

  return {
    decisionCount: () => decisions.size,
    remote(traceId: string, sampled: boolean) {
      note(traceId, { sampled, remote: true })
    },
    root,
    of,
    promote(traceId: string, sessionId?: string): TraceSamplingDecision {
      const decision = of(traceId, sessionId)
      decision.sampled = true
      return decision
    },
  }
}
