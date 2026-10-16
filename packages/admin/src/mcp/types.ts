import type { FilterMode } from '../types.ts'
import type {
  AnalyticsDimension,
  AnalyticsSegmentMode,
  AnalyticsTrend,
} from '../otlp/analytics.ts'
import type {
  AdminRecordKind,
  AdminRecordOutcome,
  AdminReatomKind,
} from '../otlp/ingest.ts'

export const ADMIN_MCP_MAX_BYTES = 20 * 1024

export interface AdminMcpFilter {
  name?: string
  traceId?: string
  kind?: AdminRecordKind
  reatomKind?: AdminReatomKind
  hasError?: boolean
  query?: string
  calculator?: string
  mode?: FilterMode
}

export interface AdminMcpConnectRemoteInput {
  url?: string
  database?: string
  user?: string
  password?: string
}

export interface AdminMcpHeader {
  recordCount: number
  traceCount: number
  errorCount: number
  start: number
  end: number
  truncated: boolean
  valuesTruncated?: boolean
}

export interface AdminMcpListTracesInput {
  filter?: AdminMcpFilter
  page?: number
  pageSize?: number
  cursor?: string
}

export interface AdminMcpGetTraceInput {
  traceId?: string
  depth?: number
  cursor?: string
}

export interface AdminMcpSearchInput {
  filter?: AdminMcpFilter
  cursor?: string
}

export interface AdminMcpGetRecordInput {
  id?: string
}

export interface AdminMcpGetStateInput {
  path?: string
  cursor?: string
}

export interface AdminMcpCause {
  id: string
  name: string
}

export interface AdminMcpTraceRow {
  traceId: string
  rootName: string
  start: number
  end: number
  durationMs: number
  spanCount: number
  logCount: number
  errorCount: number
  route?: string
  highlighted?: true
}

export interface AdminMcpRecordSummary {
  id: string
  kind: AdminRecordKind
  name: string
  traceId: string
  spanId: string
  start: number
  end?: number
  reatomKind?: AdminReatomKind
  atomName?: string
  eventName?: string
  outcome?: AdminRecordOutcome
  frameId?: string
  hasError: boolean
  highlighted?: true
  attributes: Record<string, unknown>
}

export interface AdminMcpTraceNode {
  id: string
  spanId: string
  parentSpanId?: string
  name: string
  kind: AdminRecordKind
  start: number
  end?: number
  outcome?: AdminRecordOutcome
  hasError: boolean
  depth: number
  childCount: number
  attributes: Record<string, unknown>
  events: AdminMcpRecordSummary[]
}

export interface AdminMcpOk<T> {
  ok: true
  header: AdminMcpHeader
  data: T
  nextCursor?: string
}

export interface AdminMcpMiss {
  ok: false
  header: AdminMcpHeader
  missing: 'record' | 'trace' | 'state' | 'too-large' | 'remote' | 'filter'
  id?: string
  path?: string
  error?: string
}

export type AdminMcpResult<T> = AdminMcpOk<T> | AdminMcpMiss

export interface AdminMcpTruncatedValue {
  truncated: true
  bytes: number
  keys?: string[]
}

export interface AdminMcpSummaryData {
  sources: Array<{ sourceId: string; recordCount: number }>
  names: Array<{ name: string; count: number }>
  errorCount: number
  start: number
  end: number
}

export interface AdminMcpTraceData {
  traceId: string
  rootName: string
  nodes: AdminMcpTraceNode[]
}

export interface AdminMcpRecordData {
  record: {
    id: string
    sourceId: string
    kind: AdminRecordKind
    traceId: string
    spanId: string
    parentSpanId?: string
    name: string
    start: number
    end?: number
    attributes: Record<string, unknown>
    body?: unknown
    resource: Record<string, unknown>
    links: unknown[]
    reatomKind?: AdminReatomKind
    frameId?: string
    causeIds: string[]
    atomName?: string
    eventName?: string
    outcome?: AdminRecordOutcome
    error?: { type?: string; message?: string; stack?: string }
  }
  causes: AdminMcpCause[]
}

export interface AdminMcpStateNode {
  id: string
  kind: 'group' | 'atom'
  label: string
  path: string
  atomName?: string
  sourceId?: string
  recordId?: string
  frameId?: string
  value?: unknown
  childCount: number
  valueTruncated?: boolean
}

export interface AdminMcpStateData {
  path: string
  nodes: AdminMcpStateNode[]
}

export interface AdminMcpAnalyticsSummaryInput {
  filter?: AdminMcpFilter
  segment?: AnalyticsSegmentMode
  range?: { start: number; end: number }
  /** Breakdown rows per dimension. Defaults to 10 and clamps to 1–50. */
  limit?: number
}

export interface AdminMcpBreakdownRow {
  key: string
  sessions: number
  visitors: number
  pageViews: number
  engagedSessions: number
  medianActiveMs: number
}

export interface AdminMcpAnalyticsTotals {
  visitors: number
  sessions: number
  pageViews: number
  engagedSessions: number
  engagementRate: number
  bounceRate: number
  sessionsWithErrors: number
  medianPageViews: number
  medianActiveMs: number
  medianVisibleMs: number
}

export interface AdminMcpAnalyticsSummaryData {
  sessions: number
  totalSessions: number
  totals: AdminMcpAnalyticsTotals
  trend: AnalyticsTrend
  breakdowns: Record<AnalyticsDimension, AdminMcpBreakdownRow[]>
}

export interface AdminMcpPathsInput {
  filter?: AdminMcpFilter
  segment?: AnalyticsSegmentMode
  range?: { start: number; end: number }
  align?: string
  maxDepth?: number
  maxChildren?: number
  cursor?: string
}

export interface AdminMcpPathNode {
  id: string
  parentId?: string
  label: string
  step: number
  sessions: number
  share: number
  continuation: number
  stops: number
  medianOffsetMs: number
  medianDurationMs: number
  medianActiveMs: number
  sessionsWithErrors: number
  folded: boolean
}

export interface AdminMcpPathsData {
  sessions: number
  leftOut: number
  align?: string
  typicalPathIds: string[]
  typicalSessionId?: string
  nodes: AdminMcpPathNode[]
}
