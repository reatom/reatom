import { nativeEvent } from './events.ts'
import { stackFrames } from './stacktrace.ts'
import { retryWithBackoff } from '../retryWithBackoff.ts'
import { markTelemetryUrl } from '../browserCapture.ts'
import type { OtlpLogRecord } from '../buildLogRecord.ts'
import type { OtlpSpan } from '../buildSpan.ts'
import { suppressTracing } from '../observation.ts'
import type { BrowserTelemetry } from '../captureEngine.ts'
import type { Transport } from '../sendTraces.ts'
import type { OtlpAnyValue, OtlpAttrValue } from '../toOtlpValue.ts'

type Attributes = Array<{ key: string; value: OtlpAnyValue }>
type Fields = Record<string, unknown>
let inflightKeepaliveBytes = 0

type FaroBody = { meta: Fields } & Record<string, unknown>

const decode = (value: OtlpAnyValue): unknown => {
  if ('stringValue' in value) return value.stringValue
  if ('intValue' in value) {
    const number = Number(value.intValue)
    return Number.isSafeInteger(number) ? number : value.intValue
  }
  if ('doubleValue' in value) return value.doubleValue
  if ('boolValue' in value) return value.boolValue
  if ('bytesValue' in value) return value.bytesValue
  if ('arrayValue' in value) return value.arrayValue.values.map(decode)
  return attributes(value.kvlistValue.values)
}
const attributes = (items: Attributes = []): Fields =>
  Object.fromEntries(items.map(({ key, value }) => [key, decode(value)]))
const strings = (fields: Fields): Record<string, string> =>
  Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [
      key,
      typeof value === 'string' ? value : JSON.stringify(value),
    ]),
  )
const text = (fields: Fields, key: string): string | undefined =>
  typeof fields[key] === 'string' ? (fields[key] as string) : undefined
const timestamp = (nano: string) =>
  new Date(Number(BigInt(nano) / 1_000_000n)).toISOString()
const trace = (item: { traceId: string; spanId: string }) => ({
  trace_id: item.traceId,
  span_id: item.spanId,
})
const meta = (fields: Fields, version: string, userFields: Fields): Fields => {
  const app = Object.fromEntries(
    [
      ['name', 'service.name'],
      ['namespace', 'service.namespace'],
      ['version', 'service.version'],
      ['environment', 'deployment.environment.name'],
      ['release', 'service.release'],
      ['bundleId', 'service.bundle.id'],
      ['gitHash', 'service.git.hash'],
      ['installationId', 'service.installation.id'],
    ].flatMap(([key, attr]) => {
      const value =
        text(fields, attr!) ??
        (key === 'environment'
          ? text(fields, 'deployment.environment')
          : undefined)
      return value === undefined ? [] : [[key, value]]
    }),
  )
  // Identity is projected atomically from captured record attributes only.
  // Resource defaults must not resurrect logout identity or fill another
  // principal's missing name/email. Anonymous visitor/session IDs stay separate.
  const user: Fields = {}
  for (const [attribute, key] of [
    ['user.id', 'id'],
    ['user.name', 'username'],
    ['user.email', 'email'],
    ['user.full_name', 'fullName'],
    ['user.hash', 'hash'],
  ] as const) {
    const value = text(userFields, attribute)
    if (value !== undefined) user[key] = value
  }
  // Omit empty/invalid or non-round-trippable roles from metadata, preserving
  // typed record data. Commas cannot represent one role without ambiguity.
  const roles = userFields['user.roles']
  if (
    Array.isArray(roles) &&
    roles.length > 0 &&
    roles.every(
      (role) =>
        typeof role === 'string' && role.length > 0 && !role.includes(','),
    )
  )
    user.roles = roles.join(',')
  const id = text(fields, 'session.id')
  const url = text(fields, 'page.url')
  const pageId = text(fields, 'page.id')
  const view = text(fields, 'view.name')
  const browser: Fields = {}
  for (const [attribute, key] of [
    ['browser.name', 'name'],
    ['browser.version', 'version'],
    ['browser.os', 'os'],
    ['browser.language', 'language'],
    ['user_agent.original', 'userAgent'],
  ] as const) {
    const value = text(fields, attribute)
    if (value !== undefined) browser[key] = value
  }
  if (typeof fields['browser.mobile'] === 'boolean')
    browser.mobile = fields['browser.mobile']
  for (const [attribute, key] of [
    ['browser.viewport.width', 'viewportWidth'],
    ['browser.viewport.height', 'viewportHeight'],
  ] as const) {
    const value = fields[attribute]
    if (
      (typeof value === 'number' && Number.isFinite(value) && value >= 0) ||
      typeof value === 'string'
    )
      browser[key] = String(value)
  }
  const brands = fields['browser.brands']
  if (typeof brands === 'string') browser.brands = brands
  else if (Array.isArray(brands)) {
    const valid = brands.slice(0, 32).flatMap((brand) => {
      if (!brand || typeof brand !== 'object') return []
      const item = brand as Fields
      const name = text(item, 'brand'),
        version = text(item, 'version')
      return name === undefined && version === undefined
        ? []
        : [
            {
              ...(name !== undefined && { brand: name }),
              ...(version !== undefined && { version }),
            },
          ]
    })
    if (valid.length) browser.brands = valid
  }
  return {
    sdk: {
      name: '@reatom/opentelemetry',
      version: text(fields, 'telemetry.sdk.version') ?? version,
    },
    app,
    ...(view !== undefined && { view: { name: view } }),
    ...(Object.keys(browser).length > 0 && { browser }),
    ...(Object.keys(user).length && { user }),
    ...(id && { session: { id } }),
    ...((url || pageId) && {
      page: { ...(url && { url }), ...(pageId && { id: pageId }) },
    }),
  }
}
const measurementValues = (value: unknown): value is Record<string, number> =>
  !!value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.entries(value).length > 0 &&
  Object.entries(value).every(
    ([key, n]) =>
      key.trim().length > 0 && typeof n === 'number' && Number.isFinite(n),
  )

/**
 * Uses the public `otel.log` path and obeys `signals.logs`. The caller owns
 * category consent and explicit attribute privacy.
 */
export const logMeasurement = (
  otel: Pick<BrowserTelemetry, 'log'>,
  input: {
    type: string
    values: Record<string, number>
    context?: Record<string, OtlpAttrValue>
  },
): void => {
  if (!input.type.trim() || !measurementValues(input.values))
    throw new TypeError('Measurement needs a type and numeric values')
  if (
    input.context &&
    ('measurement.type' in input.context ||
      'measurement.values' in input.context)
  )
    throw new TypeError('Measurement context overrides reserved fields')
  otel.log('measurement', {
    'measurement.type': input.type,
    'measurement.values': input.values,
    ...input.context,
  })
}

export interface FaroTransportOptions {
  /** Exact absolute receiver URL, usually ending in /collect. */
  endpoint: string
  headers?: Record<string, string>
  fetch?: typeof globalThis.fetch
  /** Total attempts per envelope, including the initial request. Default: 3. */
  attempts?: number
  /**
   * Called after acceptance; rotate only if this captured session is still
   * current.
   */
  onSessionInvalid?: (capturedSessionId: string) => void
}

/**
 * Faro receiver bridge. Bounded retries per exact envelope; does not install
 * instrumentation.
 */
export const faroTransport = (options: FaroTransportOptions): Transport => {
  const attempts = options.attempts ?? 3
  if (!Number.isSafeInteger(attempts) || attempts < 1 || attempts > 10)
    throw new RangeError('Faro attempts must be an integer between 1 and 10')
  const url = new URL(options.endpoint)
  if (!['http:', 'https:'].includes(url.protocol))
    throw new TypeError('Faro endpoint must be HTTP(S)')
  return async (batch) => {
    const signal =
      batch.deadline === undefined
        ? batch.abort
        : AbortSignal.any([
            batch.abort,
            AbortSignal.timeout(
              Math.max(0, Math.ceil(batch.deadline - Date.now())),
            ),
          ])
    const payloadData: unknown =
      batch.payload ??
      (batch.body === undefined ? undefined : JSON.parse(batch.body))
    const envelopes = new Map<string, { body: FaroBody; count: number }>()
    const groupFor = (fields: Fields, version: string, userFields: Fields) => {
      const metadata = meta(fields, version, userFields)
      const key = JSON.stringify(metadata)
      let group = envelopes.get(key)
      if (!group)
        envelopes.set(key, (group = { body: { meta: metadata }, count: 0 }))
      group.count++
      return group.body
    }
    if (batch.signal === 'logs') {
      const payload = payloadData as {
        resourceLogs: Array<{
          resource: { attributes: Attributes }
          scopeLogs: Array<{
            scope: { version: string }
            logRecords: OtlpLogRecord[]
          }>
        }>
      }
      for (const resource of payload.resourceLogs)
        for (const scope of resource.scopeLogs)
          for (const log of scope.logRecords) {
            const fields = {
              ...attributes(resource.resource.attributes),
              ...attributes(log.attributes),
            }
            const eventName =
              log.eventName ?? text(fields, 'event.name') ?? 'reatom.log'
            const body = groupFor(
              fields,
              scope.scope.version,
              attributes(log.attributes),
            )
            const captured = attributes(log.attributes)
            const actionId = text(captured, 'action.id')
            const actionName = text(captured, 'action.name')
            const actionExcluded =
              eventName === 'measurement' &&
              fields['measurement.type'] === 'web-vitals'
            const common = {
              timestamp: timestamp(log.timeUnixNano),
              trace: trace(log),
              ...(!actionExcluded &&
                actionId !== undefined &&
                actionName !== undefined && {
                  action: { parentId: actionId, name: actionName },
                }),
            }
            const context = strings(fields)
            let kind: string
            let item: Fields
            if (
              eventName === 'measurement' &&
              typeof fields['measurement.type'] === 'string' &&
              measurementValues(fields['measurement.values'])
            ) {
              kind = 'measurements'
              delete context['measurement.type']
              delete context['measurement.values']
              if (fields['measurement.type'] === 'web-vitals') {
                const navigationId = text(
                  fields,
                  'performance.navigation_entry_id',
                )
                if (navigationId !== undefined)
                  context.navigation_entry_id = navigationId
                for (const key of ['id', 'rating', 'navigation_type']) {
                  const value = text(fields, `web_vital.${key}`)
                  if (value !== undefined) context[key] ??= value
                }
              }
              item = {
                ...common,
                type: fields['measurement.type'],
                values: fields['measurement.values'],
                context,
              }
            } else if (eventName === 'exception') {
              kind = 'exceptions'
              const frames = stackFrames(
                fields['exception.stacktrace.frames'],
                fields['exception.stacktrace'],
              )
              item = {
                ...common,
                ...(frames.length > 0 && { stacktrace: { frames } }),
                ...(typeof fields['exception.fatal'] === 'boolean' && {
                  fatal: fields['exception.fatal'],
                }),
                ...(text(fields, 'exception.fingerprint') !== undefined && {
                  fingerprint: fields['exception.fingerprint'],
                }),
                type: text(fields, 'exception.type') ?? 'Error',
                value: text(fields, 'exception.message') ?? 'Exception',
                context,
              }
            } else if (eventName.startsWith('reatom.')) {
              kind = 'logs'
              item = {
                ...common,
                level:
                  log.severityNumber >= 17
                    ? 'error'
                    : log.severityNumber >= 13
                      ? 'warn'
                      : log.severityNumber < 9
                        ? 'debug'
                        : 'info',
                message: log.body
                  ? String(
                      typeof decode(log.body) === 'string'
                        ? decode(log.body)
                        : JSON.stringify(decode(log.body)),
                    )
                  : (text(fields, 'reatom.log.label') ?? eventName),
                context,
              }
            } else {
              kind = 'events'
              item = {
                ...common,
                ...nativeEvent(eventName, fields, context),
              }
            }
            ;((body[kind] ??= []) as Fields[]).push(item)
          }
    } else {
      const payload = payloadData as {
        resourceSpans: Array<{
          resource: { attributes: Attributes }
          scopeSpans: Array<{ scope: { version: string }; spans: OtlpSpan[] }>
        }>
      }
      for (const resource of payload.resourceSpans)
        for (const scope of resource.scopeSpans)
          for (const span of scope.spans) {
            const body = groupFor(
              {
                ...attributes(resource.resource.attributes),
                ...attributes(span.attributes),
              },
              scope.scope.version,
              attributes(span.attributes),
            )
            const traces = (body.traces ??= { resourceSpans: [] }) as {
              resourceSpans: unknown[]
            }
            traces.resourceSpans.push({
              ...resource,
              scopeSpans: [{ ...scope, spans: [span] }],
            })
          }
    }
    const requests = [...envelopes.values()].map(({ body, count }) => ({
      body: JSON.stringify(body),
      count,
      idempotencyKey: globalThis.crypto.randomUUID(),
      session: (body.meta.session as { id: string } | undefined)?.id,
    }))
    // Conversion can grow the OTLP envelope; refuse the whole unload batch before sending.
    const bytes = requests.reduce(
      (n, r) => n + new TextEncoder().encode(r.body).length,
      0,
    )
    if (batch.keepalive && inflightKeepaliveBytes + bytes > 60 * 1024)
      throw new RangeError('Faro keepalive budget exceeded')
    if (batch.keepalive) inflightKeepaliveBytes += bytes
    try {
      let accepted = 0
      let rejected = 0
      let errorMessage: string | undefined
      const send = async (request: (typeof requests)[number]) => {
        try {
          signal.throwIfAborted()
          if (batch.deadline !== undefined && Date.now() >= batch.deadline)
            throw new Error('Faro export deadline exceeded')
          const headers: Record<string, string> = {}
          for (const [key, value] of Object.entries(options.headers ?? {}))
            if (
              ![
                'content-type',
                'x-faro-session-id',
                'idempotency-key',
              ].includes(key.toLowerCase())
            )
              headers[key] = value
          headers['Content-Type'] = 'application/json'
          headers['Idempotency-Key'] = request.idempotencyKey
          if (request.session) headers['x-faro-session-id'] = request.session
          markTelemetryUrl(options.endpoint)
          const response = await retryWithBackoff({
            maxRetries: batch.keepalive ? 0 : attempts - 1,
            retryableStatuses: new Set([408, 425, 429, 500, 502, 503, 504]),
            signal,
            deadline: batch.deadline,
            send: () =>
              suppressTracing(() =>
                (options.fetch ?? globalThis.fetch)(options.endpoint, {
                  method: 'POST',
                  headers,
                  body: request.body,
                  signal,
                  keepalive: batch.keepalive,
                }),
              ),
          })
          await response.body?.cancel()
          if (response.status < 200 || response.status >= 300) {
            errorMessage = `Faro HTTP ${response.status}`
            rejected += request.count
            return
          }
          if (
            response.headers.get('X-Faro-Session-Status') === 'invalid' &&
            request.session
          ) {
            // Callback errors cannot turn an accepted envelope into a retransmission.
            try {
              options.onSessionInvalid?.(request.session)
            } catch {
              /* application hook */
            }
          }
          accepted += request.count
        } catch (error) {
          rejected += request.count
          errorMessage =
            error instanceof Error && error.name === 'AbortError'
              ? 'Faro export aborted'
              : 'Faro export failed'
        }
      }
      // Schedule every keepalive request before awaiting any network response:
      // navigation may destroy this document as soon as the first request starts.
      if (batch.keepalive) await Promise.all(requests.map(send))
      else for (const request of requests) await send(request)
      return { accepted, rejected, ...(errorMessage && { errorMessage }) }
    } finally {
      if (batch.keepalive) inflightKeepaliveBytes -= bytes
    }
  }
}
