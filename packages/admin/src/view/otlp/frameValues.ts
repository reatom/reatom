import { isDeepEqual } from '@reatom/core'

import { stringifyJson } from '../../serialize'

import type { AdminRecord } from '../../otlp'
import {
  errorFromExceptionLog,
  isStateWrite,
  localValuesOf,
  recordHasError,
  recordValuePreview,
  recordValues,
} from '../../otlp'
import { isExpandableValue } from '../inspector/model'

export type FrameValueTitle =
  'Payload' | 'New state' | 'Previous state' | 'Params'

export type OverviewDataTitle = 'State' | 'Payload'

export type FrameValueKind = 'inspector' | 'text' | 'empty'

export function frameValueView(value: unknown): FrameValueKind {
  if (value === undefined) return 'empty'
  return isExpandableValue(value) ? 'inspector' : 'text'
}

function stateValue(record: AdminRecord): unknown {
  const values = recordValues(record)
  if (values.source === 'local' && values.state !== undefined) {
    return values.state
  }
  if (record.body !== undefined) return record.body
  return recordValuePreview(record)
}

export function recordFieldValue(record: AdminRecord): unknown {
  if (isStateWrite(record)) return stateValue(record)
  const payload = recordValues(record).payload
  return payload !== undefined ? payload : recordValuePreview(record)
}

/** State for a write, payload otherwise. Overview shows this above params. */
export function overviewDataTitle(record: AdminRecord): OverviewDataTitle {
  return isStateWrite(record) ? 'State' : 'Payload'
}

export interface OverviewValues {
  data: unknown
  /** A captured `undefined` is a value; an uncaptured field is absent. */
  hasData: boolean
  params: unknown
}

/**
 * Computed/atom middleware receives internal state inputs, not action
 * arguments. Keep those in JSON rather than presenting them as Params.
 */
function isActionRecord(record: AdminRecord): boolean {
  return (
    record.reatomKind === 'action' ||
    (record.kind === 'span' && record.reatomKind === undefined)
  )
}

/**
 * Overview presents the current state or action result, followed by actual
 * action arguments. A successful identity action needs only its Param tree.
 * History and JSON retain the original fields.
 */
export function overviewValues(record: AdminRecord): OverviewValues {
  const values = recordValues(record)
  const live = localValuesOf(record)
  const action = isActionRecord(record)
  const params = action ? values.params : undefined
  let data: unknown
  let hasData = false
  if (isStateWrite(record)) {
    if (live && Object.hasOwn(live, 'state')) {
      data = values.state
      hasData = true
    } else if (Object.hasOwn(record, 'body')) {
      data = record.body
      hasData = true
    } else if (!live && Object.hasOwn(record.attributes, 'reatom.payload')) {
      data = values.payload
      hasData = true
    }
  } else if (
    live
      ? Object.hasOwn(live, 'payload')
      : Object.hasOwn(record.attributes, 'reatom.payload')
  ) {
    data = values.payload
    hasData = true
  }

  if (
    action &&
    hasData &&
    data !== undefined &&
    !recordHasError(record) &&
    (record.outcome === undefined || record.outcome === 'ok') &&
    Array.isArray(params) &&
    params.length === 1 &&
    Object.is(data, params[0]) &&
    // Replay cannot prove equality: serialization/redaction may have replaced
    // two different originals with the same captured value.
    live !== undefined
  ) {
    return { data: undefined, hasData: false, params }
  }
  return { data, hasData, params }
}

export function overviewDataValue(record: AdminRecord): unknown {
  return overviewValues(record).data
}

/** Live action arguments, else decoded `reatom.params`; absent for state. */
export function overviewParamsValue(record: AdminRecord): unknown {
  return overviewValues(record).params
}

export type EventOverviewEntry = {
  key: string
  value: unknown
  display: string
  title?: string
}

export type EventOverviewSection = {
  title: string
  entries: EventOverviewEntry[]
}

const EVENT_NAME_ATTRIBUTE = 'event.name'
const OTHER_SECTION = 'Other'
const EVENT_SECTION_PREFIXES = [
  { title: 'Exception', prefixes: ['exception.', 'app.exception.'] },
  {
    title: 'Page',
    prefixes: ['url.', 'app.page.', 'app.viewport.', 'app.display.'],
  },
  { title: 'Metrics', prefixes: ['app.engagement.', 'browser.web_vital.'] },
  {
    title: 'Attribution',
    prefixes: ['app.utm.', 'app.click_id.', 'app.attribution.'],
  },
  {
    title: 'Identity',
    prefixes: ['session.', 'app.visitor.', 'app.analytics.', 'user.'],
  },
] as const

export function formatEventDurationMs(ms: number): string {
  const safeMs = Math.max(0, ms)
  if (safeMs < 1000) return `${Math.round(safeMs)}ms`
  const seconds = safeMs / 1000
  return `${seconds < 10 ? seconds.toFixed(1) : Math.round(seconds)}s`
}

function durationMsFromValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed === '') return undefined
    const parsed = Number(trimmed)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

function isEngagementMsKey(key: string): boolean {
  return key.startsWith('app.engagement.') && key.endsWith('_ms')
}

function formatEventAttribute(key: string, value: unknown): string {
  if (isEngagementMsKey(key)) {
    const ms = durationMsFromValue(value)
    if (ms !== undefined) return formatEventDurationMs(ms)
  }
  if (typeof value === 'string') return value
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value)
  }
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  try {
    return stringifyJson(value)!
  } catch {
    return Object.prototype.toString.call(value)
  }
}

function sectionTitleForKey(key: string): string {
  for (const section of EVENT_SECTION_PREFIXES) {
    if (section.prefixes.some((prefix) => key.startsWith(prefix))) {
      return section.title
    }
  }
  return OTHER_SECTION
}

const ANALYTICS_EXCEPTION_EVENTS = new Set([
  'exception',
  'exception.suppressed',
])

export function eventOverviewError(record: AdminRecord): string | undefined {
  const stamped = record.error
  const fromAttributes = ANALYTICS_EXCEPTION_EVENTS.has(record.eventName ?? '')
    ? errorFromExceptionLog(record)
    : undefined
  const hasAttributeError =
    fromAttributes !== undefined &&
    (fromAttributes.type !== undefined || fromAttributes.message !== undefined)
  const error = stamped ?? (hasAttributeError ? fromAttributes : undefined)
  if (error) {
    const type = error.type ?? 'Error'
    return error.message ? `${type}: ${error.message}` : type
  }
  if (recordHasError(record)) return record.outcome ?? 'error'
  return undefined
}

function eventOverviewEntry(key: string, value: unknown): EventOverviewEntry {
  const display = formatEventAttribute(key, value)
  if (isEngagementMsKey(key) && durationMsFromValue(value) !== undefined) {
    return { key, value, display, title: String(value) }
  }
  return { key, value, display }
}

export function overviewEventSections(
  record: AdminRecord,
): EventOverviewSection[] {
  const buckets = new Map<string, EventOverviewEntry[]>()
  for (const section of EVENT_SECTION_PREFIXES) {
    buckets.set(section.title, [])
  }
  buckets.set(OTHER_SECTION, [])

  for (const [key, value] of Object.entries(record.attributes)) {
    if (key === EVENT_NAME_ATTRIBUTE) continue
    const title = sectionTitleForKey(key)
    buckets.get(title)!.push(eventOverviewEntry(key, value))
  }

  const leftover = buckets.get(OTHER_SECTION)
  leftover?.sort((left, right) => left.key.localeCompare(right.key))

  const titles = [
    ...EVENT_SECTION_PREFIXES.map((section) => section.title),
    OTHER_SECTION,
  ]
  return titles.flatMap((title) => {
    const entries = buckets.get(title)
    if (!entries || entries.length === 0) return []
    return [{ title, entries }]
  })
}

/** Compare captured states in time order, independently of the current filter. */
export function equalStateRecordIds(
  records: readonly AdminRecord[],
): Set<string> {
  const previous = new Map<string, OverviewValues>()
  const equal = new Set<string>()
  for (const record of [...records].sort((a, b) => a.start - b.start)) {
    if (
      !isStateWrite(record) ||
      (record.reatomKind !== 'atom' && record.reatomKind !== 'computed')
    )
      continue
    const key = JSON.stringify([
      record.sourceId,
      record.atomName,
      record.reatomKind,
    ])
    const before = previous.get(key)
    const current = overviewValues(record)
    if (
      recordHasError(record) ||
      (record.kind === 'span' && record.end === undefined)
    ) {
      continue
    }
    previous.set(key, current)
    if (!before?.hasData || !current.hasData) continue
    // A hostile getter/proxy in a live value must not break the debugger.
    try {
      if (isDeepEqual(before.data, current.data)) equal.add(record.id)
    } catch {
      // An unreadable value cannot establish structural equality.
    }
  }
  return equal
}
