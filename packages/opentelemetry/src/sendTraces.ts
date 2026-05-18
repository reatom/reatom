import { tracesUrl } from './tracesUrl.ts'

export interface SendTracesInput {
  endpoint: string
  payload: unknown
  /**
   * Auth and tenancy headers attached to every OTLP fetch. The OTLP wire
   * `Content-Type` is fixed to `application/json` and any user-supplied
   * `content-type` (any case) is dropped to keep the protocol intact.
   */
  headers?: Record<string, string>
  fetch?: typeof globalThis.fetch
  /**
   * Set on unload-triggered fetches so the browser holds the connection
   * past page teardown (capped at 64 KB per origin). Off by default to
   * avoid the cap on normal in-flight batches.
   */
  keepalive?: boolean
  /** Aborts the in-flight fetch — used by `dispose()` to tear down cleanly. */
  signal?: AbortSignal
}

// fetch normalizes header casing per-runtime: if both
// `Content-Type: application/json` and `content-type: application/x-protobuf`
// reach it the result is undefined and can mangle the OTLP wire. Drop any
// user-supplied content-type (any case) so our spec-mandated value wins.
const buildHeaders = (
  userHeaders: Record<string, string> | undefined,
): Record<string, string> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (userHeaders) {
    for (const [key, value] of Object.entries(userHeaders)) {
      if (key.toLowerCase() === 'content-type') continue
      headers[key] = value
    }
  }
  return headers
}

/**
 * POSTs an OTLP/JSON trace payload to `${endpoint}/v1/traces`.
 *
 * Caller-supplied `headers` are attached for auth/tenancy. `Content-Type`
 * is locked to `application/json` per spec; user-supplied content-type
 * headers are dropped. `fetch` is injectable for retry wrapping and tests.
 *
 * https://opentelemetry.io/docs/specs/otlp/#otlphttp-request
 */
export const sendTraces = async (input: SendTracesInput): Promise<Response> => {
  const fetchImpl = input.fetch ?? globalThis.fetch
  return fetchImpl(tracesUrl(input.endpoint), {
    method: 'POST',
    headers: buildHeaders(input.headers),
    body: JSON.stringify(input.payload),
    keepalive: input.keepalive,
    signal: input.signal,
  })
}
