import {
  action,
  atom,
  computed,
  withActions,
  withChangeHook,
} from '@reatom/core'

import {
  ADMIN_GANTT_OVERSCAN,
  ADMIN_GANTT_ROW_HEIGHT,
  analyticsPathTiming,
  reatomGantt,
} from '../gantt/index.ts'
import {
  analyticsBreakdown,
  analyticsPathTree,
  analyticsSessions,
  analyticsTotals,
  analyticsTrend,
  selectAnalyticsSessions,
  typicalAnalyticsPath,
  typicalAnalyticsSession,
  type AnalyticsBreakdownRow,
  type AnalyticsDimension,
  type AnalyticsSegmentMode,
} from './analytics.ts'
import { hasActiveFilter } from './filter.ts'
import type { AdminRecord } from './ingest.ts'
import type { AdminMcpFilter } from '../mcp/types.ts'

export type OtlpTimelineUnit = 'records' | 'paths'

export interface AnalyticsScopeFocus {
  dimension: AnalyticsDimension
  key: string
}

export interface AnalyticsSessionScope {
  label: string
  sessionIds: ReadonlySet<string>
  dimension?: AnalyticsDimension
  key?: string
}

export interface OtlpAnalyticsSource {
  records: () => readonly AdminRecord[]
  matchedRecords: () => readonly AdminRecord[]
  filter: () => AdminMcpFilter
}

const DIMENSIONS: readonly AnalyticsDimension[] = [
  'page',
  'entry',
  'exit',
  'source',
]

export function reatomOtlpAnalytics(source: OtlpAnalyticsSource, name: string) {
  const sessions = computed(
    () => analyticsSessions(source.records()),
    `${name}.sessions`,
  )
  const segmentMode = atom<AnalyticsSegmentMode>(
    'include',
    `${name}.segmentMode`,
  )
  const scope = atom<AnalyticsSessionScope | null>(
    null,
    `${name}.scope`,
  ).extend(
    withActions((target) => ({
      scopeTo(
        label: string,
        sessionIds: ReadonlySet<string>,
        focus?: AnalyticsScopeFocus,
      ) {
        target.set({
          label,
          sessionIds,
          ...(focus ?? {}),
        })
      },
      clearScope() {
        target.set(null)
      },
    })),
  )
  const segment = computed(() => {
    const filter = source.filter()
    return selectAnalyticsSessions(sessions(), {
      matchedRecords: hasActiveFilter(filter)
        ? source.matchedRecords()
        : undefined,
      mode: segmentMode(),
      sessionIds: scope()?.sessionIds,
    })
  }, `${name}.segment`)
  const totals = computed(() => analyticsTotals(segment()), `${name}.totals`)
  const trend = computed(() => analyticsTrend(segment()), `${name}.trend`)
  const breakdowns = computed(() => {
    const current = segment()
    const rows = {} as Record<AnalyticsDimension, AnalyticsBreakdownRow[]>
    for (const dimension of DIMENSIONS) {
      rows[dimension] = analyticsBreakdown(current, dimension)
    }
    return rows
  }, `${name}.breakdowns`)
  const align = atom<string | undefined>(undefined, `${name}.align`)
  const alignChoice = atom('', `${name}.alignChoice`)
  const pathNodes = computed(
    () => analyticsPathTree(segment(), { align: align() }),
    `${name}.pathNodes`,
  )
  const typicalPath = computed(
    () => typicalAnalyticsPath(pathNodes()),
    `${name}.typicalPath`,
  )
  const typicalSession = computed(
    () => typicalAnalyticsSession(segment(), typicalPath()),
    `${name}.typicalSession`,
  )
  const leftOut = computed(
    () => segment().length - (pathNodes()[0]?.sessions ?? 0),
    `${name}.leftOut`,
  )
  const paths = reatomGantt(
    pathNodes,
    {
      ...analyticsPathTiming,
      virtual: {
        itemSize: ADMIN_GANTT_ROW_HEIGHT,
        overscan: ADMIN_GANTT_OVERSCAN,
      },
    },
    `${name}.paths`,
  )
  const expandTypicalPath = action(() => {
    const ids = new Set<string>()
    for (const node of typicalPath()) {
      if (paths.children(node).length > 0) ids.add(node.id)
    }
    paths.expanded.set(ids)
  }, `${name}.expandTypicalPath`)
  const alignAt = action((label?: string) => {
    const choice = label ?? ''
    const next = choice === '' ? undefined : choice
    const changed = align() !== next
    if (changed) {
      align.set(next)
      paths.select(null)
      paths.collapseAll()
      paths.fit()
    }
    if (alignChoice() !== choice) alignChoice.set(choice)
    if (changed || paths.expanded().size === 0) expandTypicalPath()
  }, `${name}.alignAt`)
  alignChoice.extend(
    withChangeHook((choice) => {
      const next = choice === '' ? undefined : choice
      if (align() !== next) alignAt(choice === '' ? undefined : choice)
    }),
  )
  const recordInScope = computed(() => {
    const current = scope()
    if (current === null) return null
    const recordIds = new Set<string>()
    const pageTraces = new Set<string>()
    for (const session of sessions()) {
      if (!current.sessionIds.has(session.id)) continue
      for (const id of session.recordIds) recordIds.add(id)
      for (const visit of session.visits) {
        if (visit.traceId) pageTraces.add(visit.traceId)
      }
    }
    return (record: AdminRecord) =>
      recordIds.has(record.id) || pageTraces.has(record.traceId)
  }, `${name}.recordInScope`)

  return {
    sessions,
    segmentMode,
    scope,
    segment,
    totals,
    trend,
    breakdowns,
    align,
    alignChoice,
    pathNodes,
    typicalPath,
    typicalSession,
    leftOut,
    paths,
    expandTypicalPath,
    alignAt,
    recordInScope,
  }
}

export type OtlpAnalytics = ReturnType<typeof reatomOtlpAnalytics>
