import type { MockInstance } from 'vitest'
import { vi } from 'vitest'

/**
 * Decodes an OTLP span's attribute KeyValue array into a plain record of
 * stringValue payloads. Used by the unit and integration test suites to
 * assert on attribute contents without re-implementing the drilling.
 *
 * `value` is typed as `unknown` because the wire `OtlpAnyValue` is a
 * discriminated union — only the stringValue variant is interesting to
 * attribute assertions, so we narrow at the access boundary.
 */
export const attrsOf = (
  span: { attributes: ReadonlyArray<{ key: string; value: unknown }> },
): Record<string, string | undefined> =>
  Object.fromEntries(
    span.attributes.map((a) => [
      a.key,
      (a.value as { stringValue?: string }).stringValue,
    ]),
  )

export interface DomStubs {
  documentListeners: Map<string, () => void>
  windowListeners: Map<string, () => void>
}

/**
 * Stubs `globalThis.document` and `globalThis.window` with addEventListener /
 * removeEventListener that record into Maps the test can fire from.
 * Caller MUST call the returned `restore` (typically in a `finally`) to
 * avoid leaking globals into subsequent tests.
 */
export const installDomStubs = (
  documentOverrides: Partial<{ visibilityState: 'visible' | 'hidden' }> = {},
): DomStubs & { restore: () => void } => {
  const documentListeners = new Map<string, () => void>()
  const windowListeners = new Map<string, () => void>()
  Object.defineProperty(globalThis, 'document', {
    value: {
      visibilityState: 'visible' as const,
      addEventListener: (event: string, fn: () => void) =>
        documentListeners.set(event, fn),
      removeEventListener: (event: string) => {
        documentListeners.delete(event)
      },
      ...documentOverrides,
    },
    configurable: true,
  })
  Object.defineProperty(globalThis, 'window', {
    value: {
      addEventListener: (event: string, fn: () => void) =>
        windowListeners.set(event, fn),
      removeEventListener: (event: string) => {
        windowListeners.delete(event)
      },
    },
    configurable: true,
  })
  return {
    documentListeners,
    windowListeners,
    restore: () => {
      delete (globalThis as { document?: unknown }).document
      delete (globalThis as { window?: unknown }).window
    },
  }
}

type WarnSpy = MockInstance<typeof console.warn>

/**
 * Spies on `console.warn` for the duration of `fn`, then restores. Use
 * for tests that assert on warning output — keeps every spy paired with
 * its restore so no test leaks a mocked console into the next.
 */
export const withWarnSpy = async (
  fn: (warn: WarnSpy) => void | Promise<void>,
): Promise<void> => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  try {
    await fn(warn)
  } finally {
    warn.mockRestore()
  }
}

interface OtlpKeyValue {
  key: string
  value: {
    stringValue?: string
    intValue?: string
    boolValue?: boolean
    doubleValue?: number | 'NaN' | 'Infinity' | '-Infinity'
    bytesValue?: string
    arrayValue?: { values: OtlpKeyValue['value'][] }
    kvlistValue?: { values: OtlpKeyValue[] }
  }
}

const decodeAttrValue = (v: OtlpKeyValue['value']): unknown => {
  if (v.stringValue !== undefined) return v.stringValue
  if (v.intValue !== undefined) return v.intValue
  if (v.boolValue !== undefined) return v.boolValue
  if (v.doubleValue !== undefined) return v.doubleValue
  if (v.bytesValue !== undefined) return { bytes: v.bytesValue }
  if (v.arrayValue) return v.arrayValue.values.map(decodeAttrValue)
  if (v.kvlistValue) return decodeAttrs(v.kvlistValue.values)
  return undefined
}

const decodeAttrs = (kv: OtlpKeyValue[]): Record<string, unknown> => {
  const out: Record<string, unknown> = {}
  for (const { key, value } of kv) out[key] = decodeAttrValue(value)
  return out
}

const SPAN_KIND_NAME = ['unspecified', 'internal', 'server', 'client', 'producer', 'consumer'] as const
const STATUS_CODE_NAME = ['unset', 'ok', 'error'] as const

export interface ParsedSpan {
  traceId: string
  spanId: string
  parentSpanId?: string
  name: string
  kind: typeof SPAN_KIND_NAME[number]
  startTimeUnixNano: string
  endTimeUnixNano: string
  attributes: Record<string, unknown>
  events: Array<{ name: string; timeUnixNano: string; attributes: Record<string, unknown> }>
  status?: { code: typeof STATUS_CODE_NAME[number]; message?: string }
}

export interface ParsedResourceSpans {
  resource: { attributes: Record<string, unknown> }
  scope: { name: string; version: string }
  spans: ParsedSpan[]
}

export interface ParsedPayload {
  resourceSpans: ParsedResourceSpans[]
}

/**
 * Decodes the OTLP/JSON wire body into a shape that's readable in
 * `expect(...).toEqual(...)` assertions: hex IDs preserved as strings,
 * AnyValue unions flattened to plain JS, kind/code enums named.
 */
export const parsePayload = (body: string | unknown): ParsedPayload => {
  const raw = typeof body === 'string' ? JSON.parse(body) : body
  return {
    resourceSpans: (raw.resourceSpans ?? []).map((rs: any) => {
      const ss = rs.scopeSpans?.[0] ?? {}
      return {
        resource: { attributes: decodeAttrs(rs.resource?.attributes ?? []) },
        scope: { name: ss.scope?.name ?? '', version: ss.scope?.version ?? '' },
        spans: (ss.spans ?? []).map((s: any): ParsedSpan => ({
          traceId: s.traceId,
          spanId: s.spanId,
          parentSpanId: s.parentSpanId,
          name: s.name,
          kind: SPAN_KIND_NAME[s.kind] ?? 'unspecified',
          startTimeUnixNano: s.startTimeUnixNano,
          endTimeUnixNano: s.endTimeUnixNano,
          attributes: decodeAttrs(s.attributes ?? []),
          events: (s.events ?? []).map((e: any) => ({
            name: e.name,
            timeUnixNano: e.timeUnixNano,
            attributes: decodeAttrs(e.attributes ?? []),
          })),
          status: s.status
            ? {
                code: STATUS_CODE_NAME[s.status.code] ?? 'unset',
                message: s.status.message,
              }
            : undefined,
        })),
      }
    }),
  }
}

/** Convenience: flat list of every span across all resourceSpans. */
export const parseSpans = (body: string | unknown): ParsedSpan[] =>
  parsePayload(body).resourceSpans.flatMap((rs) => rs.spans)

/** Convenience: pick one span by name (asserts uniqueness). */
export const findSpan = (body: string | unknown, name: string): ParsedSpan => {
  const matches = parseSpans(body).filter((s) => s.name === name)
  if (matches.length !== 1) throw new Error(`expected exactly 1 span named "${name}", got ${matches.length}`)
  return matches[0]!
}

/** Matchers shared by tests. */
export const HEX_TRACE_ID = /^[0-9a-f]{32}$/
export const HEX_SPAN_ID = /^[0-9a-f]{16}$/
