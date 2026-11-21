import {
  action,
  atom,
  changesSince,
  computed,
  effect,
  peek,
  reatomBoolean,
  reatomLinkedList,
  reatomVirtual,
  type Atom,
  type Computed,
  type LLNode,
} from '@reatom/core'

import { barGeometry, type GanttTime } from '../gantt'
import { adminRecordSpanKey } from '../gantt/records'
import { inProgressRecord } from '../otlp/inProgress'
import {
  LOCAL_VALUES,
  type AdminRecord,
  type reatomOtlpStore,
} from '../otlp/ingest'
import {
  buildCausalGraph,
  appendCausalGraph,
  causalAppendIndex,
  layoutCausalLanes,
  appendCausalLanes,
  projectCausalEdges,
  type CausalEvent,
  type CausalGraph,
  type CausalEdge,
  type CausalLanes,
} from './graph'
import {
  groupCausalBuses,
  layoutCausalBuses,
  type CausalBusLayout,
} from './buses'

export const CAUSAL_ROW_HEIGHT = 26

export interface TimelineRow {
  key: string
  ordinal: number
  record: Atom<AdminRecord>
  synthetic: Atom<boolean>
}
export type TimelineSection = 'graph' | 'logs' | 'time'
export interface CausalTimelineOptions {
  store: ReturnType<typeof reatomOtlpStore>
  predicate: Computed<(record: AdminRecord) => boolean>
  scope: Computed<((record: AdminRecord) => boolean) | null>
  follow: Atom<boolean>
  now: Atom<number>
  live?: Computed<boolean>
  selected: Computed<AdminRecord | null>
  select(record: AdminRecord): void
  replaceSelection(previous: AdminRecord, next: AdminRecord): void
}

export interface CausalRelations {
  incoming: ReadonlyMap<string, readonly CausalEdge[]>
  outgoing: ReadonlyMap<string, readonly CausalEdge[]>
  edgeByKey: ReadonlyMap<string, CausalEdge>
  inScope: ReadonlySet<string>
  boundaries: ReadonlyMap<string, readonly string[]>
  excludedIncoming: ReadonlyMap<string, number>
  excludedOutgoing: ReadonlyMap<string, number>
}

export interface CausalSelectionChain {
  chosen: string | undefined
  ancestors: ReadonlySet<string>
  descendants: ReadonlySet<string>
  /** Directed ancestors and descendants, excluding the chosen event itself. */
  related: ReadonlySet<string>
  ancestorEdgeKeys: ReadonlySet<string>
  descendantEdgeKeys: ReadonlySet<string>
  edgeKeys: ReadonlySet<string>
  edges: ReadonlyMap<string, CausalEdge>
  /** Test a canonical projected relation without allocating its bus layout. */
  includesProjected(edge: CausalEdge): boolean
}

const snapshot = (record: AdminRecord): AdminRecord => {
  const copy = Object.fromEntries(
    Object.entries(record),
  ) as unknown as AdminRecord
  if (record[LOCAL_VALUES]) copy[LOCAL_VALUES] = record[LOCAL_VALUES]
  return copy
}

/** Admin-owned ordering: raw capture order remains untouched. */
export function reatomCausalTimeline(
  options: CausalTimelineOptions,
  name = '_Admin.causal',
) {
  const ordered = reatomLinkedList((row: TimelineRow) => row, `${name}.ordered`)
  const graph = atom<CausalGraph>(buildCausalGraph([]), `${name}.graph`)
  const unseen = atom(0, `${name}.unseen`)
  const contentRevision = atom(0, `${name}.contentRevision`)
  const privateState = atom(
    () => ({
      byRaw: new WeakMap<AdminRecord, LLNode<TimelineRow>>(),
      raws: new Map<LLNode<TimelineRow>, Set<AdminRecord>>(),
      bySpan: new Map<string, LLNode<TimelineRow>>(),
      byFrame: new Map<string, LLNode<TimelineRow> | null>(),
      byId: new Map<string, LLNode<TimelineRow>>(),
      handles: new Set<LLNode<TimelineRow>>(),
      logs: new Map<string, AdminRecord[]>(),
      sourceVersion: -1,
      sourceEpoch: -1,
      contentVersion: -1,
      epoch: 0,
      ordinal: 0,
      appendIndex: causalAppendIndex(buildCausalGraph([])),
      appendCount: 0,
      rebuildCount: 0,
    }),
    `${name}._state`,
  )
  const prepared = computed(() => {
    const test = options.predicate(),
      scope = options.scope()
    contentRevision()
    return (row: LLNode<TimelineRow>) => {
      const record = row.record()
      if (row.synthetic())
        return (privateState().logs.get(adminRecordSpanKey(record)) ?? []).some(
          (log) => (!scope || scope(log)) && test(log),
        )
      return (!scope || scope(record)) && test(record)
    }
  }, `${name}.predicate`)
  const visible = ordered.reatomFilter(prepared, `${name}.visible`)
  const rangeCache = atom(
    () => ({ version: -1, content: -1, value: null as GanttTime | null }),
    `${name}._range`,
  )
  const range = computed(() => {
    const source = visible(),
      revision = contentRevision(),
      cache = rangeCache()
    if (cache.version === source.version && cache.content === revision)
      return cache.value
    const changes =
      cache.content === revision ? changesSince(cache.version, source) : null
    const tail = !!changes?.every((change) => change.kind === 'insert')
    let value = tail ? cache.value : null
    const take = (row: TimelineRow) => {
      const record = peek(row.record),
        end = record.end ?? record.start
      value = value
        ? {
            start: Math.min(value.start, record.start),
            end: Math.max(value.end, end),
          }
        : { start: record.start, end }
    }
    if (tail)
      for (const change of changes!) {
        if (change.kind === 'insert') for (const row of change.nodes) take(row)
      }
    else
      for (
        let row = source.head;
        row;
        row = row[source.LL_NEXT] as LLNode<TimelineRow> | null
      )
        take(row)
    cache.version = source.version
    cache.content = revision
    return (cache.value = value)
  }, `${name}.range`)
  const timeWindow = atom<GanttTime | null>(null, `${name}.timeWindow`)
  const pendingCache = atom(
    () => ({ version: -1, content: -1, value: 0 }),
    `${name}._pending`,
  )
  const pending = computed(() => {
    const source = visible(),
      revision = contentRevision(),
      cache = pendingCache()
    if (cache.version === source.version && cache.content === revision)
      return cache.value
    const changes =
      cache.content === revision ? changesSince(cache.version, source) : null
    const tail = !!changes?.every((change) => change.kind === 'insert')
    let value = tail ? cache.value : 0
    if (tail)
      for (const change of changes!) {
        if (change.kind === 'insert')
          for (const row of change.nodes) value += Number(peek(row.synthetic))
      }
    else
      for (
        let row = source.head;
        row;
        row = row[source.LL_NEXT] as LLNode<TimelineRow> | null
      )
        value += Number(peek(row.synthetic))
    cache.version = source.version
    cache.content = revision
    return (cache.value = value)
  }, `${name}.pending`)
  const visibleTime = computed(() => {
    const manual = timeWindow()
    if (manual) return manual
    const time = range()
    if (!time) return null
    const end =
      pending() && (options.live?.() ?? true)
        ? Math.max(time.end, options.now())
        : time.end
    return { start: time.start, end: Math.max(time.start + 1, end) }
  }, `${name}.visibleTime`)
  const sections = {
    graph: reatomBoolean(true, `${name}.graphVisible`),
    logs: reatomBoolean(true, `${name}.logsVisible`),
    time: reatomBoolean(true, `${name}.timeVisible`),
  }
  /**
   * Records gain more vertical space when Time is hidden. Other modes stay
   * compact.
   */
  const rowHeight = computed(
    () => (sections.logs() && !sections.time() ? 36 : CAUSAL_ROW_HEIGHT),
    `${name}.rowHeight`,
  )
  const virtual = reatomVirtual(
    visible,
    { itemSize: rowHeight, overscan: 6, stickToEnd: options.follow },
    `${name}.virtual`,
  )
  const widths = {
    graph: atom(116, `${name}.graphWidth`),
    logs: atom(300, `${name}.logsWidth`),
    time: atom(420, `${name}.timeWidth`),
  }
  const toggleSection = action((section: TimelineSection) => {
    const active = (Object.keys(sections) as TimelineSection[]).filter((key) =>
      sections[key](),
    )
    if (sections[section]() && active.length === 1) return
    sections[section].toggle()
  }, `${name}.toggleSection`)
  const resizeSection = action(
    (section: TimelineSection, width: number) =>
      widths[section].set(
        Math.max(
          section === 'graph' ? 60 : 160,
          Math.min(2000, Math.round(width)),
        ),
      ),
    `${name}.resizeSection`,
  )
  const relationshipDirection = atom<'causes' | 'effects'>(
    'causes',
    `${name}.relationshipDirection`,
  )
  const tracedEdgeKey = atom<string | null>(null, `${name}.tracedEdgeKey`)
  const busTrackBudget = atom(4, `${name}.busTrackBudget`)
  const scopedGraph = computed(() => {
    const raw = graph(),
      test = options.scope(),
      inScope = new Set<string>(),
      sources = new Map<string, string>()
    for (const [key, event] of raw.events) {
      sources.set(key, event.record.sourceId)
      if (!test || test(event.record)) inScope.add(key)
    }
    return { raw, inScope, sources }
  }, `${name}.scopedGraph`)
  const projected = computed(() => {
    const { raw, inScope, sources } = scopedGraph(),
      state = visible(),
      keys: string[] = []
    for (
      let row = state.head;
      row;
      row = row[state.LL_NEXT] as LLNode<TimelineRow> | null
    )
      keys.push(row.key)
    const projection =
      state.size === raw.events.size && inScope.size === raw.events.size
        ? { edges: raw.edges, boundaries: raw.boundaries }
        : projectCausalEdges(raw, new Set(keys), inScope)
    return { keys, sources, ...projection }
  }, `${name}.projected`)
  const busProjection = computed(() => {
    const { keys, edges, sources, boundaries } = projected()
    return groupCausalBuses(keys, edges, { sources, boundaries })
  }, `${name}.busProjection`)
  const busLayouts = computed(
    () => ({
      projection: busProjection(),
      layouts: new Map<number, CausalBusLayout>(),
    }),
    `${name}._busLayouts`,
  )
  /** Width/selection changes do not traverse the evidence or regroup routes. */
  const buses = computed(() => {
    const budget = Math.max(0, Math.min(4, Math.floor(busTrackBudget()))),
      state = busLayouts()
    const existing = state.layouts.get(budget)
    if (existing) return existing
    const layout = layoutCausalBuses(state.projection, budget)
    state.layouts.set(budget, layout)
    return layout
  }, `${name}.buses`)
  /** Raw recorded neighbors within scope, including ordinary filter-hidden rows. */
  const rawRelations = computed((): CausalRelations => {
    const { raw, inScope } = scopedGraph()
    const incoming = new Map<string, CausalEdge[]>(),
      outgoing = new Map<string, CausalEdge[]>(),
      edgeByKey = new Map<string, CausalEdge>()
    const excludedIncoming = new Map<string, number>(),
      excludedOutgoing = new Map<string, number>()
    for (const edge of raw.edges) {
      const from = inScope.has(edge.from),
        to = inScope.has(edge.to)
      if (from && to) {
        const inputs = incoming.get(edge.to) ?? [],
          outputs = outgoing.get(edge.from) ?? []
        inputs.push(edge)
        outputs.push(edge)
        incoming.set(edge.to, inputs)
        outgoing.set(edge.from, outputs)
        edgeByKey.set(edge.key, edge)
      } else {
        if (to)
          excludedIncoming.set(
            edge.to,
            (excludedIncoming.get(edge.to) ?? 0) + 1,
          )
        if (from)
          excludedOutgoing.set(
            edge.from,
            (excludedOutgoing.get(edge.from) ?? 0) + 1,
          )
      }
    }
    return {
      incoming,
      outgoing,
      edgeByKey,
      inScope,
      boundaries: raw.boundaries,
      excludedIncoming,
      excludedOutgoing,
    }
  }, `${name}.rawRelations`)
  type LaneSnapshot = CausalLanes & {
    boundaries: ReadonlyMap<string, readonly string[]>
    raw: CausalGraph
    allVisible: boolean
  }
  const lanes = computed((previous?: LaneSnapshot): LaneSnapshot => {
    const raw = graph(),
      state = visible(),
      inScope = options.scope()
    if (
      previous &&
      previous.raw.identity === raw.tailOf &&
      previous.allVisible &&
      !inScope &&
      state.size === raw.events.size
    ) {
      return Object.assign(
        appendCausalLanes(previous, raw.appended!, raw.appendedEdges!),
        {
          boundaries: raw.boundaries,
          raw,
          allVisible: true,
        },
      )
    }
    const keys: string[] = [],
      scope = new Set<string>()
    for (const [key, event] of raw.events)
      if (!inScope || inScope(event.record)) scope.add(key)
    for (
      let row = state.head;
      row;
      row = row[state.LL_NEXT] as LLNode<TimelineRow> | null
    )
      keys.push(row.key)
    const projected = projectCausalEdges(raw, new Set(keys), scope)
    return Object.assign(layoutCausalLanes(keys, projected.edges, previous), {
      boundaries: projected.boundaries,
      raw,
      allVisible: !inScope && state.size === raw.events.size,
    })
  }, `${name}.lanes`)
  const selectedRow = computed(() => {
    const record = options.selected()
    graph()
    return record ? (privateState().byId.get(record.id) ?? null) : null
  }, `${name}.selectedRow`)
  /**
   * Complete directed chains. Separate walks avoid visiting an ancestor's other
   * children or a descendant's other parents. Cost is the reached adjacency,
   * independent of section visibility; selection never changes base geometry.
   */
  const selectionChain = computed((): CausalSelectionChain => {
    const chosen = selectedRow()?.key,
      relations = chosen ? rawRelations() : undefined
    const ancestors = new Set<string>(),
      descendants = new Set<string>()
    const ancestorEdgeKeys = new Set<string>(),
      descendantEdgeKeys = new Set<string>(),
      edges = new Map<string, CausalEdge>()
    const walk = (upstream: boolean) => {
      if (!chosen || !relations?.inScope.has(chosen)) return
      const adjacency = upstream ? relations.incoming : relations.outgoing
      const nodes = upstream ? ancestors : descendants,
        edgeKeys = upstream ? ancestorEdgeKeys : descendantEdgeKeys
      const visited = new Set([chosen]),
        pending = [chosen]
      while (pending.length) {
        const key = pending.pop()!
        for (const edge of adjacency.get(key) ?? []) {
          edgeKeys.add(edge.key)
          edges.set(edge.key, edge)
          const next = upstream ? edge.from : edge.to
          if (next !== chosen) nodes.add(next)
          if (!visited.has(next)) {
            visited.add(next)
            pending.push(next)
          }
        }
      }
    }
    walk(true)
    walk(false)
    const related = new Set([...ancestors, ...descendants]),
      edgeKeys = new Set(edges.keys())
    const upstream = (key: string) => key === chosen || ancestors.has(key)
    const downstream = (key: string) => key === chosen || descendants.has(key)
    const includesProjected = (edge: CausalEdge) => {
      if (
        !chosen ||
        !relations?.inScope.has(edge.from) ||
        !relations.inScope.has(edge.to)
      )
        return false
      if (!edge.hidden.length) return edgeKeys.has(edge.key)
      if (
        (upstream(edge.from) && upstream(edge.to)) ||
        (downstream(edge.from) && downstream(edge.to))
      )
        return true
      // Canonical projection unions hidden IDs only from this predecessor's
      // paths to the target. A filtered-out selection inside that union proves
      // a selected ancestor→selection→descendant path, unlike an unrelated
      // ancestor→descendant bypass. Direct-wins edges are handled above.
      return (
        ancestors.has(edge.from) &&
        descendants.has(edge.to) &&
        edge.hidden.includes(chosen)
      )
    }
    return {
      chosen,
      ancestors,
      descendants,
      related,
      ancestorEdgeKeys,
      descendantEdgeKeys,
      edgeKeys,
      edges,
      includesProjected,
    }
  }, `${name}.selectionChain`)
  const hiddenSelection = computed(() => {
    const row = selectedRow()
    return !!row && !visible.has(row)
  }, `${name}.hiddenSelection`)
  const select = action((row: TimelineRow) => {
    options.select(row.record())
  }, `${name}.select`)
  const move = action((delta: number) => {
    const rows = visible.array(),
      selected = selectedRow(),
      index = selected ? rows.indexOf(selected) : -1
    if (!rows.length) return
    const next =
      rows[
        Math.max(
          0,
          Math.min(
            rows.length - 1,
            index < 0 ? (delta > 0 ? 0 : rows.length - 1) : index + delta,
          ),
        )
      ]!
    select(next)
    virtual.scrollToIndex(rows.indexOf(next), 'nearest')
  }, `${name}.move`)
  const zoom = action((factor: number, anchor?: number) => {
    const time = visibleTime()
    if (!time || !(factor > 0)) return
    const at = anchor ?? (time.start + time.end) / 2
    timeWindow.set({
      start: at + (time.start - at) / factor,
      end: at + (time.end - at) / factor,
    })
  }, `${name}.zoom`)
  const pan = action((delta: number) => {
    const time = visibleTime()
    if (time)
      timeWindow.set({ start: time.start + delta, end: time.end + delta })
  }, `${name}.pan`)
  const bar = (row: TimelineRow) => {
    const time = visibleTime(),
      record = row.record()
    return time
      ? barGeometry(
          record.start,
          row.synthetic()
            ? (options.live?.() ?? true)
              ? options.now()
              : (range()?.end ?? record.start)
            : record.end,
          time,
        )
      : null
  }
  let anchor: { row: LLNode<TimelineRow>; offset: number } | null = null
  let anchorHeight = peek(rowHeight)
  const sync = action(() => {
    const state = privateState(),
      source = options.store.recordList(),
      content = options.store.contentChanges(),
      epoch = options.store.recordEpoch()
    const reset = epoch !== state.sourceEpoch
    const contentOnly = source.version === state.sourceVersion
    // The capture list only appends, so its inserts are at the tail.
    const changes = reset ? null : changesSince(state.sourceVersion, source)
    const appended = !!changes?.every((change) => change.kind === 'insert')
    const records: AdminRecord[] = []
    if (appended)
      for (const change of changes!) {
        if (change.kind === 'insert') records.push(...change.nodes)
      }
    else if (!contentOnly || reset) {
      if (reset) {
        relationshipDirection.set('causes')
        tracedEdgeKey.set(null)
        state.epoch++
        state.byRaw = new WeakMap()
        state.raws.clear()
        state.bySpan.clear()
      }
      // Version gaps reconcile from authoritative pointers, retaining existing
      // raw identities when the capture epoch has not changed.
      state.byFrame.clear()
      state.byId.clear()
      state.handles.clear()
      state.logs.clear()
      for (let record = source.head; record; record = record[source.LL_NEXT])
        records.push(record)
      if (!reset) {
        const ids = new Set(records.map((record) => record.id))
        const open = new Set(
          records
            .filter((record) => record.kind === 'log')
            .map(adminRecordSpanKey),
        )
        for (const [key, row] of state.bySpan)
          if (row.synthetic() ? !open.has(key) : !ids.has(row.record().id))
            state.bySpan.delete(key)
      }
    }
    let changed = false
    const added = new Set<LLNode<TimelineRow>>()
    const upsert = (record: AdminRecord, synthetic = false) => {
      const span = adminRecordSpanKey(record),
        frame =
          record.frameId === undefined || record.reatomKind === undefined
            ? null
            : JSON.stringify([
                record.sourceId,
                record.traceId,
                record.frameId,
                record.atomName ?? record.name,
                record.reatomKind,
              ])
      const framed = frame ? state.byFrame.get(frame) : undefined
      const alias =
        framed && framed.record().kind !== record.kind ? framed : undefined
      let row =
        state.byRaw.get(record) ??
        (record.kind === 'span' ? (state.bySpan.get(span) ?? alias) : alias)
      if (
        row &&
        alias &&
        alias !== row &&
        record.kind === 'span' &&
        !synthetic
      ) {
        for (const raw of state.raws.get(alias) ?? []) {
          state.byRaw.set(raw, row)
          state.byId.set(raw.id, row)
          const owned = state.raws.get(row) ?? new Set<AdminRecord>()
          owned.add(raw)
          state.raws.set(row, owned)
        }
        state.raws.delete(alias)
        state.handles.delete(alias)
        added.delete(alias)
        state.byFrame.set(frame!, row)
        options.replaceSelection(alias.record(), record)
        changed = true
      }
      if (!row) {
        row = {
          key: `${state.epoch}:${record.kind === 'span' ? span : record.id}`,
          ordinal: state.ordinal++,
          record: atom(snapshot(record), `${name}.row#${state.ordinal}.record`),
          synthetic: atom(synthetic, `${name}.row#${state.ordinal}.synthetic`),
        } as LLNode<TimelineRow>
        added.add(row)
      } else if (
        (!synthetic || row.synthetic()) &&
        !(record.kind === 'log' && row.record().kind === 'span')
      ) {
        const before = row.record()
        if (
          before.id !== record.id ||
          before.error !== record.error ||
          before.end !== record.end ||
          before.start !== record.start ||
          row.synthetic() !== synthetic ||
          content.revision !== state.contentVersion
        ) {
          row.record.set(snapshot(record))
          row.synthetic.set(synthetic)
          changed = true
          if (before.id !== record.id) options.replaceSelection(before, record)
        }
      }
      state.byRaw.set(record, row)
      const owned = state.raws.get(row) ?? new Set<AdminRecord>()
      if (!synthetic) owned.add(record)
      state.raws.set(row, owned)
      state.byId.set(record.id, row)
      state.handles.add(row)
      if (record.kind === 'span') state.bySpan.set(span, row)
      if (frame) {
        if (!state.byFrame.has(frame)) state.byFrame.set(frame, row)
        else if (state.byFrame.get(frame) !== row)
          state.byFrame.set(frame, null)
      }
      return row
    }
    for (const record of records) if (record.kind === 'span') upsert(record)
    for (const record of records)
      if (record.kind === 'log') {
        upsert(record)
        const span = adminRecordSpanKey(record),
          bucket = state.logs.get(span)
        if (bucket) bucket.push(record)
        else state.logs.set(span, [record])
        const parent = state.bySpan.get(span)
        if (
          !parent ||
          (parent.synthetic() && record.start < parent.record().start)
        )
          upsert(inProgressRecord(record, record.start), true)
      }
    if (content.revision !== state.contentVersion)
      for (const record of content.records)
        if (state.byRaw.has(record)) upsert(record)
    if (changed) contentRevision.set((value) => value + 1)
    const arrivals = [...added].filter((row) => !row.synthetic()).length
    if (reset || options.follow()) unseen.set(0)
    else if (arrivals) unseen.set((value) => value + arrivals)
    const toEvent = (row: TimelineRow): CausalEvent => ({
      key: row.key,
      ordinal: row.ordinal,
      record: row.record(),
    })
    const tailEvents = [...added]
      .map(toEvent)
      .sort((a, b) => a.record.start - b.record.start || a.ordinal - b.ordinal)
    const fast =
      appended && !changed && content.revision === state.contentVersion
        ? appendCausalGraph(graph(), tailEvents, state.appendIndex)
        : null
    if (fast) {
      const byKey = new Map([...added].map((row) => [row.key, row]))
      ordered.insertMany(
        tailEvents.map((event) => byKey.get(event.key)!),
        ordered().tail,
      )
      graph.set(fast)
      state.appendCount++
    } else {
      const events: CausalEvent[] = [...state.handles].map(toEvent)
      const next = buildCausalGraph(events)
      const byKey = new Map([...state.handles].map((row) => [row.key, row]))
      const wanted = next.order.map((key) => byKey.get(key)!)
      const wantedSet = new Set(wanted),
        previous = ordered.array(),
        present = new Set(previous)
      ordered.batch(() => {
        ordered.removeMany(previous.filter((row) => !wantedSet.has(row)))
        let after: LLNode<TimelineRow> | null = null
        for (let i = 0; i < wanted.length;) {
          const row = wanted[i]!
          const current: LLNode<TimelineRow> | null = after
            ? after[ordered.LL_NEXT]
            : ordered().head
          if (current === row) {
            after = row
            i++
            continue
          }
          if (present.has(row)) {
            ordered.move(row, after)
            after = row
            i++
            continue
          }
          const run: LLNode<TimelineRow>[] = []
          while (i < wanted.length && !present.has(wanted[i]!)) {
            const node = wanted[i++]!
            run.push(node)
            present.add(node)
          }
          ordered.insertMany(run, after)
          after = run.at(-1) ?? after
        }
      })
      graph.set(next)
      state.appendIndex = causalAppendIndex(next)
      state.rebuildCount++
    }
    if (!appended)
      for (const row of state.raws.keys())
        if (!state.handles.has(row)) state.raws.delete(row)
    state.sourceEpoch = epoch
    state.sourceVersion = source.version
    state.contentVersion = content.revision
    return fast !== null
  }, `${name}.sync`)
  const restoreAnchor = action(() => {
    if (options.follow() || !anchor) return
    const rows = visible.array(),
      index = rows.indexOf(anchor.row)
    if (index >= 0) {
      const height = rowHeight()
      virtual.scrollTo(index * height + Math.min(anchor.offset, height - 1))
    }
  }, `${name}.restoreAnchor`)
  const start = () => {
    const traceSync = effect(() => {
      const key = tracedEdgeKey()
      if (key && !projected().edges.some((edge) => edge.key === key))
        tracedEdgeKey.set(null)
    }, `${name}.traceSync`)
    const followSync = effect(() => {
      if (options.follow()) unseen.set(0)
    }, `${name}.followSync`)
    const sourceSync = effect(() => {
      options.store.recordList()
      options.store.recordEpoch()
      options.store.contentChanges()
      const stableTail = peek(sync)
      if (!stableTail) peek(restoreAnchor)
    }, `${name}.sourceSync`)
    const filterAnchor = effect(() => {
      prepared()
      peek(restoreAnchor)
    }, `${name}.filterAnchor`)
    const windowAnchor = effect(() => {
      const height = rowHeight()
      if (height !== anchorHeight) {
        anchorHeight = height
        peek(restoreAnchor)
      }
      const window = virtual(),
        position = virtual.scrollOffset()
      const firstIndex = Math.min(
        window.size - 1,
        Math.floor(position / height),
      )
      const row = window.items[firstIndex - window.offset]
      anchor = row ? { row, offset: position - firstIndex * height } : null
    }, `${name}.windowAnchor`)
    return () => {
      traceSync.unsubscribe()
      followSync.unsubscribe()
      sourceSync.unsubscribe()
      filterAnchor.unsubscribe()
      windowAnchor.unsubscribe()
    }
  }
  return {
    ordered,
    visible,
    graph,
    buses,
    busTrackBudget,
    rawRelations,
    relationshipDirection,
    tracedEdgeKey,
    lanes,
    virtual,
    range,
    visibleTime,
    timeWindow,
    pending,
    unseen,
    selectedRow,
    selectionChain,
    hiddenSelection,
    select,
    move,
    zoom,
    pan,
    bar,
    sections,
    rowHeight,
    widths,
    toggleSection,
    resizeSection,
    start,
    privateState,
    findRecord: (id: string) => {
      graph()
      return privateState().byId.get(id)?.record() ?? null
    },
  }
}
export type CausalTimeline = ReturnType<typeof reatomCausalTimeline>
