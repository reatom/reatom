/**
 * Parses a `Retry-After` header (delta-seconds or HTTP-date) into a
 * delay in milliseconds. Returns `undefined` when absent, unparseable,
 * or in the past — callers fall back to computed backoff. A past date
 * is no information, not an instruction to retry immediately.
 *
 * `now` is a parameter so tests are deterministic.
 *
 * https://datatracker.ietf.org/doc/html/rfc7231#section-7.1.3
 */
export const parseRetryAfter = (
  header: string | null | undefined,
  now: number,
): number | undefined => {
  if (!header) return undefined

  if (/^\d+$/.test(header)) {
    const ms = Number(header) * 1000
    // Symmetric with the past-HTTP-date branch: zero delay is "no info",
    // not an instruction to retry immediately. Falling through to jittered
    // backoff prevents a synchronized retry stampede.
    return ms > 0 ? ms : undefined
  }

  const target = Date.parse(header)
  if (Number.isNaN(target)) return undefined

  const delta = target - now
  return delta > 0 ? delta : undefined
}
