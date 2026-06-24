const hexFromBytes = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')

export const generateTraceId = (): string =>
  hexFromBytes(crypto.getRandomValues(new Uint8Array(16)))

export const generateSpanId = (): string =>
  hexFromBytes(crypto.getRandomValues(new Uint8Array(8)))

const msToNano = (ms: number): string => String(BigInt(ms) * 1_000_000n)

export type AttrValue = string | number | boolean

const toOtlpValue = (v: AttrValue) => {
  if (typeof v === 'number') return { intValue: String(v) }
  if (typeof v === 'boolean') return { boolValue: v }
  return { stringValue: String(v) }
}

const attrsFromRecord = (rec: Record<string, AttrValue>) =>
  Object.entries(rec).map(([key, value]) => ({
    key,
    value: toOtlpValue(value),
  }))

export type SpanKind = 'internal' | 'server' | 'client'

const SPAN_KIND_MAP: Record<SpanKind, number> = {
  internal: 1,
  server: 2,
  client: 3,
}

export interface SpanInput {
  traceId: string
  spanId: string
  parentSpanId?: string
  name: string
  kind?: SpanKind
  startTimeMs: number
  endTimeMs: number
  attributes?: Record<string, AttrValue>
  status?: { code: 'ok' } | { code: 'error'; message?: string }
}

export type ResourceAttributes = Record<string, AttrValue> & {
  'service.name'?: string
  'deployment.environment'?: 'dev' | 'prd' | (string & {})
  'service.version'?: string
}

export interface SendTraceOptions {
  endpoint: string
  headers?: Record<string, string>
  resourceAttributes?: ResourceAttributes
  spans: SpanInput[]
}

export const sendTrace = async (opts: SendTraceOptions) => {
  const body = {
    resourceSpans: [
      {
        resource: {
          attributes: attrsFromRecord(opts.resourceAttributes ?? {}),
        },
        scopeSpans: [
          {
            scope: { name: 'reatom.observability' },
            spans: opts.spans.map((s) => ({
              traceId: s.traceId,
              spanId: s.spanId,
              parentSpanId: s.parentSpanId ?? '',
              name: s.name,
              kind: s.kind ? SPAN_KIND_MAP[s.kind] : 1,
              startTimeUnixNano: msToNano(s.startTimeMs),
              endTimeUnixNano: msToNano(s.endTimeMs),
              attributes: s.attributes ? attrsFromRecord(s.attributes) : [],
              status:
                s.status?.code === 'ok'
                  ? { code: 1 }
                  : s.status?.code === 'error'
                  ? { code: 2, message: s.status.message }
                  : undefined,
            })),
          },
        ],
      },
    ],
  }

  const res = await fetch(opts.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...opts.headers,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`OTel ingest failed (${res.status}): ${text}`)
  }
}
