import type { AdminRecord } from '../../otlp'
import { isStateWrite, recordValuePreview, recordValues } from '../../otlp'
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

/**
 * Value shown first on Overview. State writes use the live state or the
 * recorded body. Other records use the live payload or `reatom.payload`. Params
 * render underneath.
 */
export function overviewDataValue(record: AdminRecord): unknown {
  if (isStateWrite(record)) return stateValue(record)
  return recordValues(record).payload
}

/**
 * Live call arguments, else `reatom.params`. `undefined` when the record has
 * none.
 */
export function overviewParamsValue(record: AdminRecord): unknown {
  return recordValues(record).params
}

const ANALYTICS_OVERVIEW_EVENT = /^(?:app|session)\./

/**
 * Event attributes for an analytics log, without `event.name`. Spans, exception
 * logs, and `reatom.*` logs stay off Overview.
 */
export function overviewEventAttributes(
  record: AdminRecord,
): Record<string, unknown> | undefined {
  if (record.kind !== 'log') return undefined
  if (!ANALYTICS_OVERVIEW_EVENT.test(record.eventName ?? '')) return undefined
  const attributes: Record<string, unknown> = { ...record.attributes }
  delete attributes['event.name']
  return attributes
}
