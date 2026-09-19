// Spec-mandated OTLP/HTTP path; kept in one place so the two transport
// call sites (fetch + beacon) cannot drift. URL-based so query strings
// and fragments survive — naive concatenation would mangle endpoints
// like `https://collector?token=abc` into `…?token=abc/v1/traces`.
// https://opentelemetry.io/docs/specs/otlp/#otlphttp-request
export const tracesUrl = (endpoint: string): string => {
  const url = new URL(endpoint)
  url.pathname = url.pathname.replace(/\/$/, '') + '/v1/traces'
  return url.toString()
}
