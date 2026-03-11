import { z } from 'jazz-tools'
import { match } from 'ts-pattern'

const envs = z.object({
	EXPO_PUBLIC_MAPLE_INGEST_ENDPOINT: z.string(),
	EXPO_PUBLIC_MAPLE_INGEST_PK_KEY: z.string(),
}).parse({
	EXPO_PUBLIC_MAPLE_INGEST_ENDPOINT: process.env.EXPO_PUBLIC_MAPLE_INGEST_ENDPOINT,
	EXPO_PUBLIC_MAPLE_INGEST_PK_KEY: process.env.EXPO_PUBLIC_MAPLE_INGEST_PK_KEY,
})

const hexFromBytes = (bytes: Uint8Array): string =>
	Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')

export const generateTraceId = (): string =>
	hexFromBytes(crypto.getRandomValues(new Uint8Array(16)))

export const generateSpanId = (): string =>
	hexFromBytes(crypto.getRandomValues(new Uint8Array(8)))

const msToNano = (ms: number): string => String(BigInt(ms) * 1_000_000n)

type AttrValue = string | number | boolean

const toOtlpValue = (v: AttrValue) => {
	if (typeof v === 'number') return { intValue: String(v) }
	if (typeof v === 'boolean') return { boolValue: v }
	return { stringValue: String(v) }
}

const attrsFromRecord = (rec: Record<string, AttrValue>) =>
	Object.entries(rec).map(([key, value]) => ({ key, value: toOtlpValue(value) }))

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
	status?: { code: 'ok' } | { code: 'error', message?: string }
}

export type ResourceAttributes = Record<string, AttrValue> & {
	'service.name'?: string
	'deployment.environment'?: 'dev' | 'prd' | (string & {})
	'service.version'?: string
}

export interface SendTraceOptions {
	resourceAttributes?: ResourceAttributes
	spans: SpanInput[]
}

export const sendTrace = async (opts: SendTraceOptions) => {
	const body = {
		resourceSpans: [
			{
				resource: { attributes: attrsFromRecord(opts.resourceAttributes ?? {}) },
				scopeSpans: [
					{
						scope: { name: 'linsa.observability' },
						spans: opts.spans.map(s => ({
							traceId: s.traceId,
							spanId: s.spanId,
							parentSpanId: s.parentSpanId ?? '',
							name: s.name,
							kind: s.kind ? SPAN_KIND_MAP[s.kind] : 1,
							startTimeUnixNano: msToNano(s.startTimeMs),
							endTimeUnixNano: msToNano(s.endTimeMs),
							attributes: s.attributes ? attrsFromRecord(s.attributes) : [],
							status: match(s.status)
								.with({ code: 'ok' }, () => ({ code: 1 }))
								.with({ code: 'error' }, status => ({ code: 2, message: status.message }))
								.otherwise(() => undefined),
						})),
					},
				],
			},
		],
	}

	// return console.log('sendToMaple', JSON.stringify(body, undefined, 4))

	const res = await fetch(`${envs.EXPO_PUBLIC_MAPLE_INGEST_ENDPOINT}/v1/traces`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-maple-ingest-key': envs.EXPO_PUBLIC_MAPLE_INGEST_PK_KEY,
		},
		body: JSON.stringify(body),
	})

	if (!res.ok) {
		const text = await res.text().catch(() => '')
		throw new Error(`Maple ingest failed (${res.status}): ${text}`)
	}
}
