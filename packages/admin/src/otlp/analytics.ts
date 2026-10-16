import type { AdminRecord } from './ingest.ts'

export const ANALYTICS_EVENTS = {
  sessionStart: 'session.start',
  pageView: 'app.page_view',
  engagement: 'app.page.engagement',
  exception: 'exception',
  exceptionSuppressed: 'exception.suppressed',
} as const

export const ENGAGED_ACTIVE_MS = 10_000
export const ENGAGED_PAGE_VIEWS = 2
export const NO_SOURCE = '(none)'
export const ALL_SESSIONS_LABEL = 'All sessions'

const ANALYTICS_EVENT_NAMES: ReadonlySet<string> = new Set(
  Object.values(ANALYTICS_EVENTS),
)
const ID_SEGMENT =
  /^(?:\d+|[\da-f]{12,}|[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12})$/i
const DEFAULT_PATH_DEPTH = 8
const DEFAULT_PATH_CHILDREN = 6
const ROOT_PATH_ID = 'paths'
const FOLDED_PATH_ID = '\u0000more'

export interface AnalyticsDistribution {
  count: number
  mean: number
  median: number
  p25: number
  p75: number
}

export interface AnalyticsVisit {
  label: string
  path: string
  start: number
  /** Time to the next page view; the visible time on the exit page. */
  durationMs: number
  visibleMs: number
  activeMs: number
  exceptions: number
  recordId: string
  traceId: string
}

export interface AnalyticsSession {
  id: string
  visitorId?: string
  previousId?: string
  source: string
  campaign?: string
  start: number
  end: number
  visits: AnalyticsVisit[]
  visibleMs: number
  activeMs: number
  exceptions: number
  engaged: boolean
  recordIds: string[]
}

export interface AnalyticsSessionsOptions {
  /** Step name for a `url.path`. Defaults to {@link cleanAnalyticsPath}. */
  stepLabel?: (path: string) => string
}

export interface AnalyticsTotals {
  visitors: number
  sessions: number
  pageViews: number
  engagedSessions: number
  engagementRate: number
  bounceRate: number
  sessionsWithErrors: number
  pageViewsPerSession: AnalyticsDistribution
  activeMsPerSession: AnalyticsDistribution
  visibleMsPerSession: AnalyticsDistribution
}

export type AnalyticsDimension = 'page' | 'entry' | 'exit' | 'source'

export interface AnalyticsBreakdownRow {
  key: string
  sessions: number
  visitors: number
  pageViews: number
  engagedSessions: number
  /** Per page view for the `page` dimension, per session for the others. */
  activeMs: AnalyticsDistribution
  sessionIds: string[]
}

export type AnalyticsSegmentMode = 'include' | 'exclude'

export type AnalyticsPathDirection = 'root' | 'after' | 'before'

export interface AnalyticsPathNode {
  id: string
  parentId?: string
  label: string
  direction: AnalyticsPathDirection
  /** Steps from the alignment point, negative before it. */
  step: number
  sessions: number
  /** Share of the root sessions. */
  share: number
  /** Share of the parent sessions. */
  continuation: number
  /**
   * Sessions with no further step in this direction: exits after the alignment
   * point, entries before it.
   */
  stops: number
  /** Time from the alignment point to this step. */
  offsetMs: AnalyticsDistribution
  durationMs: AnalyticsDistribution
  activeMs: AnalyticsDistribution
  sessionsWithErrors: number
  /** Siblings folded past `maxChildren`. A folded node has no children. */
  folded: boolean
  sessionIds: string[]
}

export interface AnalyticsPathOptions {
  /**
   * Step label to align sessions at, its first occurrence in each session.
   * Sessions without it are left out. Defaults to the session start.
   */
  align?: string
  /** Steps in each direction. */
  maxDepth?: number
  /** Children per node, the rest fold into one node. */
  maxChildren?: number
  /** Count consecutive views of one step, like reloads, as one step. */
  collapseRepeats?: boolean
}

interface PathStep {
  label: string
  start: number
  durationMs: number
  activeMs: number
  exceptions: number
}

interface PathMember {
  session: AnalyticsSession
  steps: PathStep[]
  anchorIndex: number
  anchorStart: number
}

interface PathSettings {
  maxDepth: number
  maxChildren: number
  rootSessions: number
  nodes: AnalyticsPathNode[]
}

const compareText = (left: string, right: string) =>
  left < right ? -1 : left > right ? 1 : 0

const textOf = (value: unknown): string | undefined =>
  typeof value === 'string' && value !== '' ? value : undefined

const numberOf = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'bigint') return Number(value)
  if (typeof value !== 'string' || value.trim() === '') return 0
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const quantile = (sorted: readonly number[], fraction: number): number => {
  if (sorted.length === 0) return 0
  const position = (sorted.length - 1) * fraction
  const lowerIndex = Math.floor(position)
  const lowerValue = sorted[lowerIndex]!
  const upperValue = sorted[Math.ceil(position)]!
  return lowerValue + (upperValue - lowerValue) * (position - lowerIndex)
}

export function analyticsDistribution(
  values: readonly number[],
): AnalyticsDistribution {
  const sorted = [...values].sort((left, right) => left - right)
  const total = sorted.reduce((sum, value) => sum + value, 0)
  return {
    count: sorted.length,
    mean: sorted.length === 0 ? 0 : total / sorted.length,
    median: quantile(sorted, 0.5),
    p25: quantile(sorted, 0.25),
    p75: quantile(sorted, 0.75),
  }
}

export function cleanAnalyticsPath(path: string): string {
  return path
    .split('/')
    .map((segment) => (ID_SEGMENT.test(segment) ? ':id' : segment))
    .join('/')
}

const clickIdSource = (
  attributes: Record<string, unknown>,
  prefix: string,
): string | undefined => {
  for (const [key, value] of Object.entries(attributes)) {
    if (key.startsWith(prefix) && key.endsWith('clid') && textOf(value)) {
      return key.slice(prefix.length)
    }
  }
  return undefined
}

const lastVisitBefore = (
  visits: readonly AnalyticsVisit[],
  time: number,
): AnalyticsVisit => {
  let found = visits[0]!
  for (const visit of visits) {
    if (visit.start >= time) break
    found = visit
  }
  return found
}

const lastVisitAtOrBefore = (
  visits: readonly AnalyticsVisit[],
  time: number,
): AnalyticsVisit => {
  let found = visits[0]!
  for (const visit of visits) {
    if (visit.start > time) break
    found = visit
  }
  return found
}

const pageVisits = (
  ordered: readonly AdminRecord[],
  stepLabel: (path: string) => string,
): AnalyticsVisit[] => {
  const visits: AnalyticsVisit[] = []
  for (const record of ordered) {
    if (record.eventName !== ANALYTICS_EVENTS.pageView) continue
    const path = textOf(record.attributes['url.path']) ?? '/'
    visits.push({
      label: stepLabel(path),
      path,
      start: record.start,
      durationMs: 0,
      visibleMs: 0,
      activeMs: 0,
      exceptions: 0,
      recordId: record.id,
      traceId: record.traceId,
    })
  }
  return visits
}

const attachPageEvents = (
  visits: readonly AnalyticsVisit[],
  ordered: readonly AdminRecord[],
) => {
  const errorsByVisit = new Map<
    AnalyticsVisit,
    Map<string, { recorded: number; summarized: number }>
  >()
  const errorCount = (visit: AnalyticsVisit, record: AdminRecord) => {
    const errorType = textOf(record.attributes['exception.type']) ?? ''
    let byType = errorsByVisit.get(visit)
    if (!byType) {
      byType = new Map()
      errorsByVisit.set(visit, byType)
    }
    let count = byType.get(errorType)
    if (!count) {
      count = { recorded: 0, summarized: 0 }
      byType.set(errorType, count)
    }
    return count
  }

  for (const record of ordered) {
    switch (record.eventName) {
      // Engagement and suppressed-error summaries are flushed on navigation,
      // often in the same millisecond as the next page view, so they belong to
      // the last view strictly before them.
      case ANALYTICS_EVENTS.engagement: {
        const visit = lastVisitBefore(visits, record.start)
        visit.visibleMs += numberOf(
          record.attributes['app.engagement.visible_ms'],
        )
        visit.activeMs += numberOf(
          record.attributes['app.engagement.active_ms'],
        )
        break
      }
      case ANALYTICS_EVENTS.exceptionSuppressed:
        errorCount(lastVisitBefore(visits, record.start), record).summarized +=
          numberOf(record.attributes['app.exception.count'])
        break
      case ANALYTICS_EVENTS.exception: {
        const visit =
          visits.find((candidate) => candidate.traceId === record.traceId) ??
          lastVisitAtOrBefore(visits, record.start)
        errorCount(visit, record).recorded += 1
        break
      }
    }
  }

  // A suppressed summary counts the recorded errors of its type too.
  for (const [visit, byType] of errorsByVisit) {
    for (const count of byType.values()) {
      visit.exceptions += Math.max(count.recorded, count.summarized)
    }
  }

  visits.forEach((visit, index) => {
    const nextVisit = visits[index + 1]
    visit.durationMs = nextVisit
      ? nextVisit.start - visit.start
      : visit.visibleMs
  })
}

const sessionSource = (
  startAttributes: Record<string, unknown>,
  firstViewAttributes: Record<string, unknown>,
) =>
  textOf(startAttributes['app.attribution.last.source']) ??
  textOf(firstViewAttributes['app.utm.source']) ??
  clickIdSource(startAttributes, 'app.attribution.last.') ??
  clickIdSource(firstViewAttributes, 'app.click_id.') ??
  NO_SOURCE

function buildSession(
  id: string,
  records: readonly AdminRecord[],
  stepLabel: (path: string) => string,
): AnalyticsSession | undefined {
  const ordered = [...records].sort((left, right) => left.start - right.start)
  const visits = pageVisits(ordered, stepLabel)
  if (visits.length === 0) return undefined
  attachPageEvents(visits, ordered)

  const firstVisit = visits[0]!
  const lastVisit = visits[visits.length - 1]!
  const sessionStart = ordered.find(
    (record) => record.eventName === ANALYTICS_EVENTS.sessionStart,
  )
  const startAttributes = sessionStart?.attributes ?? {}
  const firstViewAttributes =
    ordered.find((record) => record.id === firstVisit.recordId)?.attributes ??
    {}
  const visitorId = ordered
    .map((record) => textOf(record.attributes['app.visitor.id']))
    .find((value) => value !== undefined)
  const visibleMs = visits.reduce((sum, visit) => sum + visit.visibleMs, 0)
  const activeMs = visits.reduce((sum, visit) => sum + visit.activeMs, 0)
  const exceptions = visits.reduce((sum, visit) => sum + visit.exceptions, 0)

  return {
    id,
    visitorId,
    previousId: textOf(startAttributes['session.previous_id']),
    source: sessionSource(startAttributes, firstViewAttributes),
    campaign:
      textOf(startAttributes['app.attribution.last.campaign']) ??
      textOf(firstViewAttributes['app.utm.campaign']),
    start: ordered[0]!.start,
    end: Math.max(
      ordered[ordered.length - 1]!.start,
      lastVisit.start + lastVisit.durationMs,
    ),
    visits,
    visibleMs,
    activeMs,
    exceptions,
    engaged:
      activeMs > ENGAGED_ACTIVE_MS || visits.length >= ENGAGED_PAGE_VIEWS,
    recordIds: ordered.map((record) => record.id),
  }
}

export function analyticsSessions(
  records: readonly AdminRecord[],
  options: AnalyticsSessionsOptions = {},
): AnalyticsSession[] {
  const stepLabel = options.stepLabel ?? cleanAnalyticsPath
  const recordsBySession = new Map<string, AdminRecord[]>()
  for (const record of records) {
    if (record.kind !== 'log') continue
    if (!ANALYTICS_EVENT_NAMES.has(record.eventName ?? '')) continue
    const sessionId = textOf(record.attributes['session.id'])
    if (sessionId === undefined) continue
    const sessionRecords = recordsBySession.get(sessionId)
    if (sessionRecords) sessionRecords.push(record)
    else recordsBySession.set(sessionId, [record])
  }
  const sessions: AnalyticsSession[] = []
  for (const [sessionId, sessionRecords] of recordsBySession) {
    const session = buildSession(sessionId, sessionRecords, stepLabel)
    if (session) sessions.push(session)
  }
  return sessions.sort(
    (left, right) => left.start - right.start || compareText(left.id, right.id),
  )
}

export function analyticsSegment(
  sessions: readonly AnalyticsSession[],
  matchedRecords: Iterable<AdminRecord>,
  mode: AnalyticsSegmentMode = 'include',
): AnalyticsSession[] {
  const matchedIds = new Set<string>()
  for (const record of matchedRecords) matchedIds.add(record.id)
  const keepMatched = mode === 'include'
  return sessions.filter(
    (session) =>
      session.recordIds.some((id) => matchedIds.has(id)) === keepMatched,
  )
}

export function analyticsTotals(
  sessions: readonly AnalyticsSession[],
): AnalyticsTotals {
  const visitors = new Set<string>()
  let pageViews = 0
  let engagedSessions = 0
  let sessionsWithErrors = 0
  for (const session of sessions) {
    visitors.add(session.visitorId ?? session.id)
    pageViews += session.visits.length
    if (session.engaged) engagedSessions += 1
    if (session.exceptions > 0) sessionsWithErrors += 1
  }
  const engagementRate =
    sessions.length === 0 ? 0 : engagedSessions / sessions.length
  return {
    visitors: visitors.size,
    sessions: sessions.length,
    pageViews,
    engagedSessions,
    engagementRate,
    bounceRate: sessions.length === 0 ? 0 : 1 - engagementRate,
    sessionsWithErrors,
    pageViewsPerSession: analyticsDistribution(
      sessions.map((session) => session.visits.length),
    ),
    activeMsPerSession: analyticsDistribution(
      sessions.map((session) => session.activeMs),
    ),
    visibleMsPerSession: analyticsDistribution(
      sessions.map((session) => session.visibleMs),
    ),
  }
}

export function analyticsBreakdown(
  sessions: readonly AnalyticsSession[],
  dimension: AnalyticsDimension,
): AnalyticsBreakdownRow[] {
  const groups = new Map<
    string,
    {
      sessionIds: string[]
      visitors: Set<string>
      pageViews: number
      engagedSessions: number
      activeMs: number[]
    }
  >()
  const groupOf = (key: string) => {
    let group = groups.get(key)
    if (!group) {
      group = {
        sessionIds: [],
        visitors: new Set(),
        pageViews: 0,
        engagedSessions: 0,
        activeMs: [],
      }
      groups.set(key, group)
    }
    return group
  }
  const countSession = (
    group: ReturnType<typeof groupOf>,
    session: AnalyticsSession,
  ) => {
    group.sessionIds.push(session.id)
    group.visitors.add(session.visitorId ?? session.id)
    if (session.engaged) group.engagedSessions += 1
  }

  for (const session of sessions) {
    if (dimension === 'page') {
      const countedLabels = new Set<string>()
      for (const visit of session.visits) {
        const group = groupOf(visit.label)
        group.pageViews += 1
        group.activeMs.push(visit.activeMs)
        if (countedLabels.has(visit.label)) continue
        countedLabels.add(visit.label)
        countSession(group, session)
      }
      continue
    }
    const key =
      dimension === 'entry'
        ? session.visits[0]!.label
        : dimension === 'exit'
          ? session.visits[session.visits.length - 1]!.label
          : session.source
    const group = groupOf(key)
    group.pageViews += session.visits.length
    group.activeMs.push(session.activeMs)
    countSession(group, session)
  }

  return [...groups]
    .map(([key, group]) => ({
      key,
      sessions: group.sessionIds.length,
      visitors: group.visitors.size,
      pageViews: group.pageViews,
      engagedSessions: group.engagedSessions,
      activeMs: analyticsDistribution(group.activeMs),
      sessionIds: group.sessionIds,
    }))
    .sort(
      (left, right) =>
        right.sessions - left.sessions || compareText(left.key, right.key),
    )
}

const pathSteps = (
  session: AnalyticsSession,
  collapseRepeats: boolean,
): PathStep[] => {
  const steps: PathStep[] = []
  for (const visit of session.visits) {
    const previous = steps[steps.length - 1]
    if (collapseRepeats && previous?.label === visit.label) {
      previous.durationMs += visit.durationMs
      previous.activeMs += visit.activeMs
      previous.exceptions += visit.exceptions
      continue
    }
    steps.push({
      label: visit.label,
      start: visit.start,
      durationMs: visit.durationMs,
      activeMs: visit.activeMs,
      exceptions: visit.exceptions,
    })
  }
  return steps
}

const stepIndexOf = (
  member: PathMember,
  direction: 'after' | 'before',
  depth: number,
) =>
  direction === 'after'
    ? member.anchorIndex + depth
    : member.anchorIndex - depth

const stepOf = (
  member: PathMember,
  direction: 'after' | 'before',
  depth: number,
): PathStep | undefined => member.steps[stepIndexOf(member, direction, depth)]

const pathNode = (
  settings: PathSettings,
  parent: AnalyticsPathNode,
  direction: 'after' | 'before',
  depth: number,
  label: string,
  members: readonly PathMember[],
  folded: boolean,
): AnalyticsPathNode => {
  const arrow = direction === 'after' ? ' → ' : ' ← '
  const steps = members.map((member) => stepOf(member, direction, depth)!)
  return {
    id: `${parent.id}${arrow}${folded ? FOLDED_PATH_ID : label}`,
    parentId: parent.id,
    label,
    direction,
    step: direction === 'after' ? depth : -depth,
    sessions: members.length,
    share: members.length / settings.rootSessions,
    continuation: members.length / parent.sessions,
    stops: members.filter(
      (member) => stepOf(member, direction, depth + 1) === undefined,
    ).length,
    offsetMs: analyticsDistribution(
      members.map((member, index) => steps[index]!.start - member.anchorStart),
    ),
    durationMs: analyticsDistribution(steps.map((step) => step.durationMs)),
    activeMs: analyticsDistribution(steps.map((step) => step.activeMs)),
    sessionsWithErrors: steps.filter((step) => step.exceptions > 0).length,
    folded,
    sessionIds: members.map((member) => member.session.id),
  }
}

function growPath(
  settings: PathSettings,
  parent: AnalyticsPathNode,
  members: readonly PathMember[],
  direction: 'after' | 'before',
  depth: number,
): void {
  if (depth > settings.maxDepth) return
  const membersByLabel = new Map<string, PathMember[]>()
  for (const member of members) {
    const step = stepOf(member, direction, depth)
    if (step === undefined) continue
    const group = membersByLabel.get(step.label)
    if (group) group.push(member)
    else membersByLabel.set(step.label, [member])
  }
  const ranked = [...membersByLabel].sort(
    ([leftLabel, left], [rightLabel, right]) =>
      right.length - left.length || compareText(leftLabel, rightLabel),
  )
  const keptCount =
    ranked.length > settings.maxChildren + 1
      ? settings.maxChildren
      : ranked.length
  for (const [label, group] of ranked.slice(0, keptCount)) {
    const node = pathNode(
      settings,
      parent,
      direction,
      depth,
      label,
      group,
      false,
    )
    settings.nodes.push(node)
    growPath(settings, node, group, direction, depth + 1)
  }
  const foldedGroups = ranked.slice(keptCount)
  if (foldedGroups.length === 0) return
  settings.nodes.push(
    pathNode(
      settings,
      parent,
      direction,
      depth,
      `+${foldedGroups.length} more`,
      foldedGroups.flatMap(([, group]) => group),
      true,
    ),
  )
}

const pathRoot = (
  align: string | undefined,
  members: readonly PathMember[],
): AnalyticsPathNode => {
  const anchorSteps =
    align === undefined
      ? undefined
      : members.map((member) => member.steps[member.anchorIndex]!)
  const durations = anchorSteps
    ? anchorSteps.map((step) => step.durationMs)
    : members.map((member) => member.session.end - member.anchorStart)
  const activeMs = anchorSteps
    ? anchorSteps.map((step) => step.activeMs)
    : members.map((member) => member.session.activeMs)
  const withErrors = anchorSteps
    ? anchorSteps.filter((step) => step.exceptions > 0).length
    : members.filter((member) => member.session.exceptions > 0).length
  return {
    id: align === undefined ? ROOT_PATH_ID : `${ROOT_PATH_ID}:${align}`,
    label: align ?? ALL_SESSIONS_LABEL,
    direction: 'root',
    step: 0,
    sessions: members.length,
    share: 1,
    continuation: 1,
    stops:
      align === undefined
        ? 0
        : members.filter(
            (member) => member.anchorIndex === member.steps.length - 1,
          ).length,
    offsetMs: analyticsDistribution(members.map(() => 0)),
    durationMs: analyticsDistribution(durations),
    activeMs: analyticsDistribution(activeMs),
    sessionsWithErrors: withErrors,
    folded: false,
    sessionIds: members.map((member) => member.session.id),
  }
}

/**
 * Prefix tree of page sequences, LifeFlow style. Offsets are medians from the
 * alignment point, so the nodes plug into `reatomGantt` as bars.
 */
export function analyticsPathTree(
  sessions: readonly AnalyticsSession[],
  options: AnalyticsPathOptions = {},
): AnalyticsPathNode[] {
  const { align } = options
  const collapseRepeats = options.collapseRepeats ?? true
  const members: PathMember[] = []
  for (const session of sessions) {
    const steps = pathSteps(session, collapseRepeats)
    const anchorIndex =
      align === undefined ? -1 : steps.findIndex((step) => step.label === align)
    if (align !== undefined && anchorIndex === -1) continue
    const anchorStart = steps[Math.max(anchorIndex, 0)]!.start
    members.push({ session, steps, anchorIndex, anchorStart })
  }
  if (members.length === 0) return []

  const root = pathRoot(align, members)
  const settings: PathSettings = {
    maxDepth: options.maxDepth ?? DEFAULT_PATH_DEPTH,
    maxChildren: options.maxChildren ?? DEFAULT_PATH_CHILDREN,
    rootSessions: members.length,
    nodes: [root],
  }
  if (align !== undefined) growPath(settings, root, members, 'before', 1)
  growPath(settings, root, members, 'after', 1)
  return settings.nodes
}

/** The most common next step from the root in each direction, in time order. */
export function typicalAnalyticsPath(
  nodes: readonly AnalyticsPathNode[],
): AnalyticsPathNode[] {
  const root = nodes.find((node) => node.direction === 'root')
  if (!root) return []
  const leadingChild = new Map<string, AnalyticsPathNode>()
  for (const node of nodes) {
    if (node.parentId === undefined || node.folded) continue
    const key = `${node.parentId}\u0000${node.direction}`
    const leader = leadingChild.get(key)
    if (!leader || node.sessions > leader.sessions) leadingChild.set(key, node)
  }
  const follow = (direction: 'after' | 'before') => {
    const chain: AnalyticsPathNode[] = []
    let current = root
    for (;;) {
      const next = leadingChild.get(`${current.id}\u0000${direction}`)
      if (!next) return chain
      chain.push(next)
      current = next
    }
  }
  return [...follow('before').reverse(), root, ...follow('after')]
}

const pathDirectionRank = (direction: AnalyticsPathDirection) =>
  direction === 'before' ? 0 : direction === 'after' ? 2 : 1

/** Waterfall order: steps before the alignment point, then after; folded last. */
export function compareAnalyticsPathNodes(
  left: AnalyticsPathNode,
  right: AnalyticsPathNode,
): number {
  const byDirection =
    pathDirectionRank(left.direction) - pathDirectionRank(right.direction)
  if (byDirection !== 0) return byDirection
  if (left.folded !== right.folded) return left.folded ? 1 : -1
  if (left.sessions !== right.sessions) return right.sessions - left.sessions
  return compareText(left.label, right.label)
}

/** A real session that followed the whole path in the median time. */
export function typicalAnalyticsSession(
  sessions: readonly AnalyticsSession[],
  path: readonly AnalyticsPathNode[],
): AnalyticsSession | undefined {
  let followerIds: Set<string> | undefined
  for (const node of path) {
    const nodeIds = new Set(node.sessionIds)
    followerIds =
      followerIds === undefined
        ? nodeIds
        : new Set([...followerIds].filter((id) => nodeIds.has(id)))
  }
  const followers = sessions.filter((session) => followerIds?.has(session.id))
  if (followers.length === 0) return undefined
  const durationOf = (session: AnalyticsSession) => session.end - session.start
  const medianDuration = analyticsDistribution(followers.map(durationOf)).median
  return followers.reduce((best, session) =>
    Math.abs(durationOf(session) - medianDuration) <
    Math.abs(durationOf(best) - medianDuration)
      ? session
      : best,
  )
}
