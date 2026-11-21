import {
  abortVar,
  action,
  atom,
  changesSince,
  computed,
  effect,
  peek,
  reatomBoolean,
  reatomForm,
  wrap,
} from '@reatom/core'

import {
  ADMIN_GANTT_OVERSCAN,
  ADMIN_GANTT_ROW_HEIGHT,
  adminRecordSpanKey,
  adminRecordTiming,
  reatomGantt,
  reatomGanttRecordSelection,
} from '../gantt'
import { ADMIN_FRAME } from '../root'
import {
  buildLastWriteStateTree,
  buildRecordBuckets,
  causeRailNodes,
  FEED_RENDER_LIMIT,
  groupRecordsByStart,
  recordHistory,
  recordTimeRange,
  suggestedBucketSize,
  visibleFeed,
  type OtlpGraphDirection,
  type OtlpStateNode,
} from './bind.ts'
import { fetchClickHouseExport } from './clickhouse.ts'
import {
  parseCalculator,
  parseFilterCalculator,
  buildCalculatorIndex,
} from './calculator.ts'
import {
  applyFilterMode,
  candidateRecords,
  filteredRecords,
  highlightedRecordIds,
  recordMatches,
  hasActiveFilter,
} from './filter.ts'
import {
  isAbortOrSuspense,
  isInProgressRecord,
  syncInProgressRecords,
} from './inProgress.ts'
import { mountLogIds, isMountLog } from './mount.ts'
import { reatomCausalTimeline } from '../causal/model'
import {
  reatomOtlpStore,
  type AdminRecord,
  type AdminRecordKind,
  type AdminReatomKind,
  type OtlpStoreOptions,
} from './ingest.ts'
import type { AdminMcpFilter } from '../mcp/types.ts'
import type { FilterMode } from '../types.ts'
import { reatomInvestigationSessions } from './sessionsModel.ts'
import type { AnalyticsSession } from './analytics.ts'
import {
  reatomOtlpAnalytics,
  type AnalyticsScopeFocus,
  type OtlpTimelineUnit,
} from './analyticsModel.ts'

const PREFIX = '_Admin.otlp'

export type OtlpAdminSource = 'live' | 'replay' | 'remote'

export type OtlpAdminView =
  'timeline' | 'state' | 'graph' | 'analytics' | 'settings'

export interface OtlpAdminOptions extends OtlpStoreOptions {
  source?: OtlpAdminSource
  fetch?: typeof fetch
}

function reatomOtlpAdminModel(options: OtlpAdminOptions) {
  const store = reatomOtlpStore(options)
  const fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis)
  const selectedRecordId = atom<string | null>(
    null,
    `${PREFIX}.selectedRecordId`,
  )
  const selectedRootFrameId = atom<string | null>(
    null,
    `${PREFIX}.selectedRootFrameId`,
  )
  const selectedTraceId = atom<string | null>(null, `${PREFIX}.selectedTraceId`)
  const graphDirection = atom<OtlpGraphDirection>(
    'full',
    `${PREFIX}.graphDirection`,
  )
  const followLive = reatomBoolean(true, `${PREFIX}.followLive`)
  const causalEnabled = reatomBoolean(true, `${PREFIX}.causalEnabled`)
  const source = atom<OtlpAdminSource>(
    options.source ?? 'live',
    `${PREFIX}.source`,
  )
  const remoteOpen = reatomBoolean(false, `${PREFIX}.remoteOpen`)
  const remoteForm = reatomForm(
    {
      url: 'http://127.0.0.1:8123',
      database: 'otel',
      user: 'default',
      password: '',
    },
    {
      name: `${PREFIX}.remote`,
      onSubmit: async (state) => {
        const url = state.url.trim()
        if (url === '') throw new Error('ClickHouse URL is required')
        const { controller, unsubscribe } = abortVar.subscribe()
        try {
          const incoming = await wrap(
            fetchClickHouseExport(
              {
                url,
                database: state.database.trim() || 'otel',
                user: state.user.trim() || 'default',
                password: state.password,
              },
              { fetch: fetchImpl, signal: controller.signal },
            ),
          )
          store.replace(incoming)
          selectedRecordId.set(null)
          selectedRootFrameId.set(null)
          selectedTraceId.set(null)
          source.set('remote')
          remoteOpen.setFalse()
          return { recordCount: incoming.length }
        } finally {
          unsubscribe()
        }
      },
    },
  )
  const inspectorTab = atom<'overview' | 'causes' | 'history' | 'json'>(
    'overview',
    `${PREFIX}.inspectorTab`,
  )
  const workspaceFocus = atom<'logs' | 'details'>(
    'logs',
    `${PREFIX}.workspaceFocus`,
  )
  const workspaceId = atom<
    'activity' | 'state' | 'timeline' | 'graph' | 'filters'
  >('activity', `${PREFIX}.workspaceId`)
  const cardOpen = reatomBoolean(false, `${PREFIX}.cardOpen`)
  const filterName = atom('', `${PREFIX}.filter.name`)
  const filterQuery = atom('', `${PREFIX}.filter.query`)
  const filterCalculator = atom('', `${PREFIX}.filter.calculator`)
  const filterHasError = atom<boolean | undefined>(
    undefined,
    `${PREFIX}.filter.hasError`,
  )
  const filterReatomKind = atom<AdminReatomKind | undefined>(
    undefined,
    `${PREFIX}.filter.reatomKind`,
  )
  const filterKind = atom<AdminRecordKind | undefined>(
    undefined,
    `${PREFIX}.filter.kind`,
  )
  const filterMode = atom<FilterMode>('show', `${PREFIX}.filter.mode`)
  const filter = computed((): AdminMcpFilter => {
    const name = filterName().trim()
    const query = filterQuery().trim()
    const calculator = filterCalculator().trim()
    const hasError = filterHasError()
    const reatomKind = filterReatomKind()
    const kind = filterKind()
    const mode = filterMode()
    const next: AdminMcpFilter = {}
    if (name !== '') next.name = name
    if (query !== '') next.query = query
    if (hasError !== undefined) next.hasError = hasError
    if (reatomKind !== undefined) next.reatomKind = reatomKind
    if (kind !== undefined) next.kind = kind
    if (calculator !== '') {
      const parsed = parseCalculator(calculator)
      if (parsed.ok) next.calculator = calculator
    }
    if (mode !== 'show') next.mode = mode
    return next
  }, `${PREFIX}.filter`)
  const matchedRecords = computed(() => {
    return filteredRecords(store, filter())
  }, `${PREFIX}.matchedRecords`)
  const analytics = reatomOtlpAnalytics(
    { records: store.records, matchedRecords, filter },
    `${PREFIX}.analytics`,
  )
  const investigation = reatomInvestigationSessions(
    store.records,
    `${PREFIX}.investigation`,
    store.contentChanges,
  )
  const timelineUnit = atom<OtlpTimelineUnit>(
    'records',
    `${PREFIX}.timelineUnit`,
  )
  const resetFilter = action(() => {
    filterName.set('')
    filterQuery.set('')
    filterCalculator.set('')
    filterHasError.set(undefined)
    filterReatomKind.set(undefined)
    filterKind.set(undefined)
    filterMode.set('show')
    investigation.scopeSessionId.set(null)
    analytics.scope.clearScope()
    analytics.segmentMode.set('include')
  }, `${PREFIX}.filter.reset`)
  const activitySplitRatio = atom(0.42, `${PREFIX}.activitySplit`)
  const stateSplitRatio = atom(0.42, `${PREFIX}.stateSplit`)
  const timelineSplitRatio = atom(0.58, `${PREFIX}.timelineSplit`)
  const graphSplitRatio = atom(0.58, `${PREFIX}.graphSplit`)
  const bucketSize = atom(100, `${PREFIX}.timeline.bucketSize`)
  const zoom = atom(1, `${PREFIX}.timeline.zoom`)
  const offset = atom(0, `${PREFIX}.timeline.offset`)
  const useAutoFit = reatomBoolean(true, `${PREFIX}.timeline.useAutoFit`)

  const selectionHistory = atom<string[]>([], `${PREFIX}.selectionHistory`)
  const selectionHistoryIndex = atom(-1, `${PREFIX}.selectionHistoryIndex`)
  const rememberSelection = (id: string | null) => {
    if (id === null) return
    const ids = selectionHistory()
    const index = selectionHistoryIndex()
    if (ids[index] === id) return
    const next = ids.slice(0, index + 1)
    next.push(id)
    selectionHistory.set(next)
    selectionHistoryIndex.set(next.length - 1)
  }
  const selectRecord = action((record: AdminRecord | null) => {
    selectedRecordId.set(record?.id ?? null)
    selectedRootFrameId.set(record?.frameId ?? null)
    selectedTraceId.set(record?.traceId ?? null)
    followLive.setFalse()
    workspaceFocus.set('details')
    rememberSelection(record?.id ?? null)
  }, `${PREFIX}.selectRecord`)

  const resetSelection = action(() => {
    selectedRecordId.set(null)
    selectedRootFrameId.set(null)
    selectedTraceId.set(null)
    selectionHistory.set([])
    selectionHistoryIndex.set(-1)
    cardOpen.setFalse()
  }, `${PREFIX}.resetSelection`)

  const clear = action(() => {
    if (source() === 'live') store.clear()
    else store.replace([])
    resetSelection()
    remoteForm.reset()
    resetFilter()
    analytics.align.set(undefined)
    timelineUnit.set('records')
    if (source() === 'remote') source.set('live')
  }, `${PREFIX}.clear`)

  const selectFrame = action((frameId: number) => {
    const matches = store.byFrame(String(frameId))
    const traceId = selectedTraceId()
    const scoped =
      traceId === null
        ? matches
        : matches.filter((entry) => entry.traceId === traceId)
    if (scoped.length === 0) {
      selectedRecordId.set(null)
      return
    }
    const record = scoped.find((entry) => entry.kind === 'span') ?? scoped[0]!
    selectedRootFrameId.set(String(frameId))
    selectedTraceId.set(record.traceId)
    selectedRecordId.set(record.id)
    followLive.setFalse()
    rememberSelection(record.id)
  }, `${PREFIX}.selectFrame`)

  const visibleRecords = computed(() => {
    const current = filter()
    const filtered = applyFilterMode(
      candidateRecords(store, current),
      matchedRecords(),
      current,
    )
    const exactIds = investigation.scopeIds()
    if (exactIds !== null)
      return filtered.filter((record) => exactIds.has(record.id))
    const inScope = analytics.recordInScope()
    if (inScope === null) return filtered
    return filtered.filter(inScope)
  }, `${PREFIX}.visibleRecords`)

  const highlightedIds = computed(() => {
    return highlightedRecordIds(matchedRecords(), filter())
  }, `${PREFIX}.highlightedIds`)

  const feedRecords = computed(() => {
    return visibleFeed(visibleRecords(), FEED_RENDER_LIMIT)
  }, `${PREFIX}.feedRecords`)

  const inProgress = atom<AdminRecord[]>([], `${PREFIX}.inProgress`)
  const ganttNow = atom(Date.now(), `${PREFIX}.ganttNow`)
  let causalRecord = (_id: string): AdminRecord | null => null
  const selectedRecord = computed((): AdminRecord | null => {
    const id = selectedRecordId()
    if (id === null) return null
    return (
      store.byId(id) ??
      causalRecord(id) ??
      inProgress().find((record) => record.id === id) ??
      null
    )
  }, `${PREFIX}.selectedRecord`)

  const railNodes = computed(() => {
    const visibleFrameKeys = new Set(
      visibleRecords().map((record) => `${record.traceId}:${record.frameId}`),
    )
    const nodes = causeRailNodes(
      store.records(),
      selectedRootFrameId(),
      graphDirection(),
      selectedTraceId(),
      visibleFrameKeys,
    )
    const ids = new Set(nodes.map((node) => node.id))
    return nodes.map((node) => ({
      ...node,
      parentIds: node.parentIds.filter((id) => ids.has(id)),
    }))
  }, `${PREFIX}.railNodes`)

  const allRailNodes = computed(() => {
    return causeRailNodes(
      store.records(),
      selectedRootFrameId(),
      'full',
      selectedTraceId(),
    )
  }, `${PREFIX}.allRailNodes`)

  const stateTree = computed(() => {
    const visibleIds = new Set(visibleRecords().map((record) => record.id))
    const prune = (nodes: OtlpStateNode[]): OtlpStateNode[] =>
      nodes.flatMap((node) => {
        if (node.kind === 'atom')
          return node.recordId && visibleIds.has(node.recordId) ? [node] : []
        const children = prune(node.children)
        return children.length ? [{ ...node, children }] : []
      })
    return prune(buildLastWriteStateTree(store.records()))
  }, `${PREFIX}.stateTree`)

  const timeRange = computed(() => {
    return recordTimeRange(store.records())
  }, `${PREFIX}.timeline.timeRange`)

  const effectiveBucketSize = computed(() => {
    if (!useAutoFit()) return bucketSize()
    return suggestedBucketSize(store.records(), timeRange())
  }, `${PREFIX}.timeline.effectiveBucketSize`)

  const sessionSummary = computed(() => {
    const records = store.records()
    const range = timeRange()
    if (!range) {
      return {
        recordCount: 0,
        start: 0,
        end: 0,
        durationMs: 0,
        errorCount: 0,
        burstCount: 0,
      }
    }
    let errorCount = 0
    const bursts = new Set<number>()
    for (const record of records) {
      bursts.add(record.start)
      if (record.error != null || record.outcome === 'error') errorCount += 1
    }
    return {
      recordCount: records.length,
      start: range.min,
      end: range.max,
      durationMs: Math.max(range.max - range.min, 1),
      errorCount,
      burstCount: bursts.size,
    }
  }, `${PREFIX}.timeline.sessionSummary`)

  const buckets = computed(() => {
    return buildRecordBuckets(
      store.records(),
      effectiveBucketSize() * zoom(),
      timeRange(),
    )
  }, `${PREFIX}.timeline.buckets`)

  const visibleRange = computed((): [number, number] => {
    const range = timeRange()
    if (!range) return [0, 0]
    const panOffset = offset()
    const span = range.max - range.min
    return [range.min + panOffset * span, range.max + panOffset * span]
  }, `${PREFIX}.timeline.visibleRange`)

  const chartBuckets = computed(() => {
    const [rangeStart, rangeEnd] = visibleRange()
    const filled = buckets().filter((bucket) => bucket.entries.length > 0)
    if (rangeStart === rangeEnd) return filled
    return filled.filter(
      (bucket) => bucket.end > rangeStart && bucket.start < rangeEnd,
    )
  }, `${PREFIX}.timeline.chartBuckets`)

  const isPannedOutsideRange = computed(() => {
    return buckets().length > 0 && chartBuckets().length === 0
  }, `${PREFIX}.timeline.isPannedOutsideRange`)

  const recordGroups = computed(() => {
    return groupRecordsByStart(store.records())
  }, `${PREFIX}.timeline.recordGroups`)

  const prefersEventList = computed(() => {
    const summary = sessionSummary()
    return summary.recordCount > 0 && summary.recordCount < 25
  }, `${PREFIX}.timeline.prefersEventList`)

  const historyForSelected = computed(() => {
    const record = selectedRecord()
    if (!record) return []
    return recordHistory(store.records(), record)
  }, `${PREFIX}.historyForSelected`)

  const errorCount = computed(() => {
    return store
      .records()
      .filter((record) => record.error != null || record.outcome === 'error')
      .length
  }, `${PREFIX}.errorCount`)

  const applyAutoFit = action(() => {
    useAutoFit.setTrue()
    bucketSize.set(suggestedBucketSize(store.records(), timeRange()))
    zoom.set(1)
    offset.set(0)
  }, `${PREFIX}.timeline.applyAutoFit`)

  const summary = computed(() => {
    const total = store.records().length
    const matched = matchedRecords().length
    const visible = feedRecords().length
    return {
      totalFrames: total,
      visibleFrames: visible,
      hiddenFrames: Math.max(0, total - visible),
      matchedFrames: matched,
      highlightedFrames: highlightedIds().size,
      errorFrames: errorCount(),
      selectedRecordId: selectedRecordId(),
      source: source(),
    }
  }, `${PREFIX}.summary`)

  const showAbortAndSuspense = reatomBoolean(
    false,
    `${PREFIX}.showAbortAndSuspense`,
  )
  const abortSuspenseCount = computed(() => {
    if (
      !hasActiveFilter(filter()) &&
      !analytics.recordInScope() &&
      !investigation.scopeIds()
    )
      return recordCounts().abort
    let count = 0
    for (const record of visibleRecords()) {
      if (isAbortOrSuspense(record)) count += 1
    }
    return count
  }, `${PREFIX}.abortSuspenseCount`)
  const hiddenAbortSuspenseCount = computed(() => {
    if (showAbortAndSuspense()) return 0
    return abortSuspenseCount()
  }, `${PREFIX}.hiddenAbortSuspenseCount`)
  const showMountLogs = reatomBoolean(false, `${PREFIX}.showMountLogs`)
  const mountLogIdSet = computed(() => {
    return mountLogIds(store.records())
  }, `${PREFIX}.mountLogIds`)
  const mountLogCount = computed(() => {
    if (
      !hasActiveFilter(filter()) &&
      !analytics.recordInScope() &&
      !investigation.scopeIds()
    )
      return recordCounts().mount
    const ids = mountLogIdSet()
    let count = 0
    for (const record of visibleRecords()) {
      if (ids.has(record.id)) count += 1
    }
    return count
  }, `${PREFIX}.mountLogCount`)
  const hiddenMountLogCount = computed(() => {
    if (showMountLogs()) return 0
    return mountLogCount()
  }, `${PREFIX}.hiddenMountLogCount`)
  const quickFiltered = computed(() => {
    const visible = visibleRecords()
    const hideAbortAndSuspense = !showAbortAndSuspense()
    const hiddenMountLogIds = showMountLogs() ? null : mountLogIdSet()
    if (!hideAbortAndSuspense && hiddenMountLogIds === null) return visible
    return visible.filter((record) => {
      if (hideAbortAndSuspense && isAbortOrSuspense(record)) return false
      return !hiddenMountLogIds?.has(record.id)
    })
  }, `${PREFIX}.quickFiltered`)
  const ganttRecords = computed(() => {
    const visible = quickFiltered()
    const landed = new Set<string>()
    for (const record of store.records()) {
      if (record.kind === 'span') landed.add(adminRecordSpanKey(record))
    }
    const visibleSpans = new Set(
      visible.filter((record) => record.kind === 'log').map(adminRecordSpanKey),
    )
    const extras = inProgress().filter((record) => {
      const key = adminRecordSpanKey(record)
      if (landed.has(key)) return false
      return visibleSpans.has(key)
    })
    return extras.length === 0 ? visible : [...visible, ...extras]
  }, `${PREFIX}.ganttRecords`)
  const gantt = reatomGantt(
    ganttRecords,
    {
      ...adminRecordTiming,
      end: (record) => (isInProgressRecord(record) ? ganttNow() : record.end),
      virtual: {
        itemSize: ADMIN_GANTT_ROW_HEIGHT,
        overscan: ADMIN_GANTT_OVERSCAN,
        stickToEnd: followLive,
      },
    },
    `${PREFIX}.gantt`,
  )
  const hookFrames = store.recordList.reatomReduce<ReadonlySet<string>>(
    {
      init: () => new Set(),
      apply: (previous, change, state) => {
        if (change.kind === 'insert') {
          const hooks = change.nodes.filter(
            (record) =>
              record.kind === 'span' &&
              record.frameId !== undefined &&
              record.name.endsWith('.withConnectHook'),
          )
          if (!hooks.length) return previous
          return new Set([
            ...previous,
            ...hooks.map((record) => `${record.sourceId}:${record.frameId}`),
          ])
        }
        if (change.kind === 'move' || change.kind === 'swap') return previous
        const result = new Set<string>()
        for (let record = state.head; record; record = record[state.LL_NEXT])
          if (
            record.kind === 'span' &&
            record.frameId !== undefined &&
            record.name.endsWith('.withConnectHook')
          )
            result.add(`${record.sourceId}:${record.frameId}`)
        return result
      },
      rebuild: (_previous, state) => {
        const result = new Set<string>()
        for (let record = state.head; record; record = record[state.LL_NEXT])
          if (
            record.kind === 'span' &&
            record.frameId !== undefined &&
            record.name.endsWith('.withConnectHook')
          )
            result.add(`${record.sourceId}:${record.frameId}`)
        return result
      },
    },
    `${PREFIX}.hookFrames`,
  )
  const hookFrameSet = computed(
    () => hookFrames().state,
    `${PREFIX}.hookFrameSet`,
  )
  type RecordCounts = {
    errors: number
    logs: number
    abort: number
    mount: number
    kinds: Partial<Record<NonNullable<AdminRecord['reatomKind']>, number>>
  }
  const countCache = atom(
    () => ({
      version: -1,
      content: -1,
      hooks: null as ReadonlySet<string> | null,
      value: null as RecordCounts | null,
    }),
    `${PREFIX}._countCache`,
  )
  const recordCounts = computed(() => {
    const source = store.recordList(),
      content = store.contentChanges(),
      hooks = hookFrameSet(),
      cache = countCache()
    if (
      cache.version === source.version &&
      cache.content === content.revision &&
      cache.hooks === hooks
    )
      return cache.value!
    const changes =
      cache.value && cache.content === content.revision && cache.hooks === hooks
        ? changesSince(cache.version, source)
        : null
    const tail = !!changes?.every((change) => change.kind === 'insert')
    const value: RecordCounts = tail
      ? { ...cache.value!, kinds: { ...cache.value!.kinds } }
      : { errors: 0, logs: 0, abort: 0, mount: 0, kinds: {} }
    const take = (record: AdminRecord) => {
      if (record.error != null || record.outcome === 'error') value.errors++
      if (record.kind === 'log') value.logs++
      if (isAbortOrSuspense(record)) value.abort++
      if (isMountLog(record, hooks)) value.mount++
      if (record.reatomKind)
        value.kinds[record.reatomKind] =
          (value.kinds[record.reatomKind] ?? 0) + 1
    }
    if (tail)
      for (const change of changes!) {
        if (change.kind === 'insert')
          for (const record of change.nodes) take(record)
      }
    else
      for (let record = source.head; record; record = record[source.LL_NEXT])
        take(record)
    Object.assign(cache, {
      version: source.version,
      content: content.revision,
      hooks,
      value,
    })
    return value
  }, `${PREFIX}.recordCounts`)
  const causalPredicate = computed(() => {
    const current = filter(),
      hideAbort = !showAbortAndSuspense(),
      hideMount = !showMountLogs(),
      hooks = hookFrameSet()
    const parsed = parseFilterCalculator(current)
    const index = current.calculator
      ? buildCalculatorIndex(store.records())
      : undefined
    const active = hasActiveFilter(current)
    return (record: AdminRecord) => {
      if (hideAbort && isAbortOrSuspense(record)) return false
      if (hideMount && isMountLog(record, hooks)) return false
      if (!active || current.mode === 'highlight') return true
      const match = recordMatches(
        record,
        { ...current, traceId: undefined },
        parsed,
        index,
      )
      return current.mode === 'hide' || current.mode === 'exclude'
        ? !match
        : match
    }
  }, `${PREFIX}.causalPredicate`)
  const causalScope = computed(() => {
    const trace = filter().traceId,
      inScope = analytics.recordInScope(),
      ids = investigation.scopeIds()
    return trace || inScope || ids
      ? (record: AdminRecord) =>
          (!trace || record.traceId === trace) &&
          (!inScope || inScope(record)) &&
          (!ids || ids.has(record.id))
      : null
  }, `${PREFIX}.causalScope`)
  const causal = reatomCausalTimeline({
    store,
    predicate: causalPredicate,
    scope: causalScope,
    follow: followLive,
    now: ganttNow,
    live: computed(() => source() !== 'replay', `${PREFIX}.causalLive`),
    selected: selectedRecord,
    select: selectRecord,
    replaceSelection: (previous, next) => {
      if (selectedRecordId() === previous.id) {
        selectedRecordId.set(next.id)
        selectedRootFrameId.set(next.frameId ?? null)
        selectedTraceId.set(next.traceId)
      }
      if (selectionHistory().includes(previous.id))
        selectionHistory.set((ids) =>
          ids.map((id) => (id === previous.id ? next.id : id)),
        )
    },
  })
  causalRecord = causal.findRecord
  const stopCausal = causal.start()
  const highlightedLogIds = computed(() => {
    const ids = new Set<string>()
    for (const record of store.records()) {
      if (record.kind === 'log') ids.add(record.id)
    }
    return ids
  }, `${PREFIX}.highlightedLogIds`)
  const spanCountByTrace = computed(() => {
    const counts = new Map<string, number>()
    for (const record of store.records()) {
      if (record.kind !== 'span') continue
      counts.set(record.traceId, (counts.get(record.traceId) ?? 0) + 1)
    }
    return counts
  }, `${PREFIX}.spanCountByTrace`)
  const view = atom<OtlpAdminView>('timeline', `${PREFIX}.view`)
  const showPaths = action((align?: string) => {
    investigation.scopeSessionId.set(null)
    view.set('timeline')
    timelineUnit.set('paths')
    analytics.alignAt(align)
  }, `${PREFIX}.showPaths`)
  const openPaths = action(() => {
    investigation.scopeSessionId.set(null)
    view.set('timeline')
    timelineUnit.set('paths')
    if (analytics.paths.expanded().size === 0) analytics.expandTypicalPath()
  }, `${PREFIX}.openPaths`)
  const showSessions = action(
    (
      label: string,
      sessionIds: ReadonlySet<string>,
      focus?: AnalyticsScopeFocus,
    ) => {
      investigation.scopeSessionId.set(null)
      analytics.scope.scopeTo(label, sessionIds, focus)
      view.set('timeline')
      timelineUnit.set('records')
      gantt.mode.set('waterfall')
      const selected = selectedRecord()
      const inScope = analytics.recordInScope()
      if (selected !== null && inScope !== null && !inScope(selected)) {
        const first = analytics
          .sessions()
          .find((session) => sessionIds.has(session.id))
        const pageViewId = first?.visits[0]?.recordId
        const pageView =
          pageViewId === undefined
            ? null
            : (store.records().find((record) => record.id === pageViewId) ??
              null)
        selectRecord(pageView)
      }
    },
    `${PREFIX}.showSessions`,
  )
  const openTypicalSession = action((session?: AnalyticsSession) => {
    const chosen = session ?? analytics.typicalSession()
    if (!chosen) return
    showSessions('Typical session', new Set([chosen.id]))
    const pageViewId = chosen.visits[0]?.recordId
    const pageView =
      store.records().find((record) => record.id === pageViewId) ?? null
    if (pageView) selectRecord(pageView)
    cardOpen.setTrue()
  }, `${PREFIX}.openTypicalSession`)
  const knownInProgress = new Set<string>()
  const syncInProgress = () => {
    const visible = quickFiltered()
    if (visible.length === 0 && store.records().length === 0) {
      knownInProgress.clear()
    }
    const landed = new Set<string>()
    for (const record of store.records()) {
      if (record.kind === 'span') landed.add(adminRecordSpanKey(record))
    }
    const current = peek(inProgress)
    const next = syncInProgressRecords(visible, current, landed)
    if (next.length > 0) ganttNow.set(Date.now())
    for (const record of next) {
      if (knownInProgress.has(record.id)) {
        const previous = current.find((item) => item.id === record.id)
        if (previous && previous !== record && gantt.isExpanded(previous)) {
          gantt.collapse(previous)
          gantt.expand(record)
        }
        continue
      }
      knownInProgress.add(record.id)
      gantt.expand(record)
    }
    for (const id of knownInProgress) {
      if (!next.some((record) => record.id === id)) knownInProgress.delete(id)
    }
    if (
      current.length === next.length &&
      current.every((record, index) => record === next[index])
    ) {
      return
    }
    inProgress.set(next)
  }
  const adoptArrivedSpans = (
    selected: AdminRecord | null,
    expandedInProgress: readonly AdminRecord[],
  ) => {
    const spans = new Map<string, AdminRecord>()
    for (const record of store.records()) {
      if (record.kind === 'span') {
        spans.set(adminRecordSpanKey(record), record)
      }
    }
    for (const node of expandedInProgress) {
      if (!isInProgressRecord(node)) continue
      const span = spans.get(adminRecordSpanKey(node))
      if (!span) continue
      gantt.expand(span)
      gantt.collapse(node)
    }
    if (!selected || !isInProgressRecord(selected)) return
    const span = spans.get(adminRecordSpanKey(selected))
    if (!span) return
    const ids = selectionHistory()
    if (ids.includes(selected.id)) {
      selectionHistory.set(ids.map((id) => (id === selected.id ? span.id : id)))
    }
    selectedRecordId.set(span.id)
    selectedRootFrameId.set(span.frameId ?? null)
    selectedTraceId.set(span.traceId)
    gantt.select(span)
  }
  const ingestBatch = (accept: () => void) => {
    if (causalEnabled()) {
      accept()
      return
    }
    const selected = selectedRecord()
    const expandedInProgress = inProgress().filter((record) =>
      gantt.isExpanded(record),
    )
    accept()
    syncInProgress()
    adoptArrivedSpans(selected, expandedInProgress)
  }
  const ingest = action(
    (incoming: readonly unknown[]) => ingestBatch(() => store.ingest(incoming)),
    `${PREFIX}.ingestBatch`,
  )
  const ingestCaptured = action(
    (incoming: Parameters<typeof store.ingestCaptured>[0]) =>
      ingestBatch(() => store.ingestCaptured(incoming)),
    `${PREFIX}.ingestCaptured`,
  )
  const stopInProgress = effect(() => {
    if (causalEnabled()) return
    quickFiltered()
    peek(syncInProgress)
  }, `${PREFIX}.syncInProgress`)
  const focusHistory = (index: number) => {
    selectionHistoryIndex.set(index)
    const id = selectionHistory()[index]
    if (id === undefined) return
    const record =
      store.byId(id) ??
      causalRecord(id) ??
      inProgress().find((item) => item.id === id) ??
      null
    selectedRecordId.set(record?.id ?? null)
    selectedRootFrameId.set(record?.frameId ?? null)
    selectedTraceId.set(record?.traceId ?? null)
    followLive.setFalse()
    if (record) workspaceFocus.set('details')
  }
  const selectionBack = action(() => {
    const index = selectionHistoryIndex()
    if (index <= 0) return
    focusHistory(index - 1)
  }, `${PREFIX}.selectionBack`)
  const selectionForward = action(() => {
    const index = selectionHistoryIndex()
    if (index < 0 || index >= selectionHistory().length - 1) return
    focusHistory(index + 1)
  }, `${PREFIX}.selectionForward`)
  const canSelectionBack = computed(
    () => selectionHistoryIndex() > 0,
    `${PREFIX}.canSelectionBack`,
  )
  const canSelectionForward = computed(() => {
    const index = selectionHistoryIndex()
    return index >= 0 && index < selectionHistory().length - 1
  }, `${PREFIX}.canSelectionForward`)
  const ganttSelection = reatomGanttRecordSelection(gantt, {
    selectedRecord,
    selectRecord,
    visibleRecords: ganttRecords,
  })
  const legacySelection = effect(() => {
    if (causalEnabled()) return
    const stop = ganttSelection.connect()
    return stop
  }, `${PREFIX}.legacySelection`)
  const disposeModel = () => {
    stopCausal()
    stopInProgress.unsubscribe()
    legacySelection.unsubscribe()
  }

  return {
    store,
    ingest,
    ingestCaptured,
    replace: store.replace,
    records: store.records,
    byTrace: store.byTrace,
    bySpan: store.bySpan,
    byFrame: store.byFrame,
    byAtom: store.byAtom,
    byName: store.byName,
    paused: store.paused,
    clear,
    restoreRecords: store.restoreRecords,
    setResource: store.setResource,
    setLocalValues: store.setLocalValues,
    localValuesTrimmed: store.localValuesTrimmed,
    resetSelection,
    view,
    analytics,
    investigation,
    timelineUnit,
    showPaths,
    openPaths,
    showSessions,
    openTypicalSession,
    showAbortAndSuspense,
    abortSuspenseCount,
    hiddenAbortSuspenseCount,
    showMountLogs,
    mountLogIds: mountLogIdSet,
    mountLogCount,
    hiddenMountLogCount,
    highlightedLogIds,
    spanCountByTrace,
    recordCounts,
    gantt,
    causal,
    causalEnabled,
    ganttRecords,
    ganttNow,
    ganttSelection,
    inProgress,
    selectionHistory,
    selectionHistoryIndex,
    selectionBack,
    selectionForward,
    canSelectionBack,
    canSelectionForward,
    disposeModel,
    selectedRecordId,
    selectedRootFrameId,
    selectedTraceId,
    selectedRecord,
    selectRecord,
    selectFrame,
    graphDirection,
    followLive,
    source,
    remoteOpen,
    remoteForm,
    connectRemote: remoteForm.submit,
    inspectorTab,
    workspaceFocus,
    workspaceId,
    activitySplitRatio,
    stateSplitRatio,
    timelineSplitRatio,
    graphSplitRatio,
    filter,
    filterName,
    filterQuery,
    filterCalculator,
    filterHasError,
    filterReatomKind,
    filterKind,
    filterMode,
    cardOpen,
    resetFilter,
    matchedRecords,
    visibleRecords,
    highlightedIds,
    feedRecords,
    railNodes,
    allRailNodes,
    stateTree,
    bucketSize,
    zoom,
    offset,
    useAutoFit,
    effectiveBucketSize,
    sessionSummary,
    buckets,
    visibleRange,
    chartBuckets,
    isPannedOutsideRange,
    recordGroups,
    prefersEventList,
    applyAutoFit,
    resetTimeline: applyAutoFit,
    historyForSelected,
    errorCount,
    summary,
  }
}

/**
 * OTLP-bound admin chrome model. Allocates named atoms/actions inside
 * `ADMIN_FRAME`. Pause is a local ingest gate. Live clear empties the store and
 * calls `onClear` (for example `otel.clearRecords()`). Replay and remote clear
 * empty the admin store only, so the host app's local records stay. Remote
 * clear uses `replace([])` and returns the source to live. Remote ClickHouse
 * credentials live on `remoteForm` in RAM only — clear and a new instance
 * forget them (nothing survives reload).
 *
 * The Gantt, its selection, selection history, and `view` live here.
 * `ganttRecords` adds synthetic in-progress parents for logs whose span has not
 * landed. Those parents are absent from `records` and from MCP results. Abort
 * and suspense rows are hidden until `showAbortAndSuspense` is set.
 * `hiddenAbortSuspenseCount` is how many of those rows the quick filter is
 * currently hiding. Mount logs (see `mountLogIds` in `mount.ts`) are hidden the
 * same way until `showMountLogs` is set, and `hiddenMountLogCount` counts them.
 * `highlightedLogIds` and `spanCountByTrace` are for the timeline to read.
 */
export function reatomOtlpAdmin(options: OtlpAdminOptions) {
  return ADMIN_FRAME.run(() => reatomOtlpAdminModel(options))
}

export type OtlpAdmin = ReturnType<typeof reatomOtlpAdmin>
