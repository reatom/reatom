import { isAbort, random } from '@reatom/core'

export interface RetryWithBackoffInput {
  send: () => Promise<Response>
  retryableStatuses?: ReadonlySet<number>
  maxRetries?: number
  baseDelayMs?: number
  maxDelayMs?: number
  sleep?: (ms: number) => Promise<unknown>
  now?: () => number
  /** Absolute batch deadline, shared by all attempts and body cleanup. */
  deadline?: number
  /** The same signal must also be passed to fetch. */
  signal?: AbortSignal
}

export class ExportTimeoutError extends Error {
  constructor() {
    super('OTLP batch export deadline exceeded')
  }
}

const RETRYABLE_STATUS = new Set([429, 502, 503, 504])

/**
 * Parses a `Retry-After` header (delta-seconds or HTTP-date) into milliseconds.
 * Absent, unparseable, zero, and past values are `undefined` so the caller
 * keeps jittered backoff instead of retrying in lockstep.
 *
 * https://datatracker.ietf.org/doc/html/rfc7231#section-7.1.3
 */
const parseRetryAfter = (
  header: string | null | undefined,
  now: number,
): number | undefined => {
  if (!header) return undefined

  if (/^\d+$/.test(header)) {
    const ms = Number(header) * 1000
    return ms > 0 ? ms : undefined
  }

  const target = Date.parse(header)
  if (Number.isNaN(target)) return undefined

  const delta = target - now
  return delta > 0 ? delta : undefined
}

const wait = (
  ms: number,
  signal: AbortSignal | undefined,
  sleep: RetryWithBackoffInput['sleep'],
): Promise<void> =>
  new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | undefined
    let finished = false
    const finish = (failed: boolean, error?: unknown) => {
      if (finished) return
      finished = true
      if (timer !== undefined) clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
      if (failed) reject(error)
      else resolve()
    }
    const abort = () => finish(true, signal?.reason)
    signal?.addEventListener('abort', abort, { once: true })
    if (signal?.aborted) {
      abort()
      return
    }
    if (sleep) {
      try {
        Promise.resolve(sleep(ms)).then(
          () => finish(false),
          (error) => finish(true, error),
        )
      } catch (error) {
        finish(true, error)
      }
    } else timer = setTimeout(() => finish(false), ms)
  })

/** Retry network failures and throttling, releasing each discarded body first. */
export const retryWithBackoff = async ({
  send,
  maxRetries = 3,
  retryableStatuses = RETRYABLE_STATUS,
  baseDelayMs = 1000,
  maxDelayMs = 30_000,
  sleep,
  now = Date.now,
  deadline,
  signal,
}: RetryWithBackoffInput): Promise<Response> => {
  for (let attempt = 0; ; attempt++) {
    signal?.throwIfAborted()
    if (deadline !== undefined && now() >= deadline)
      throw new ExportTimeoutError()
    let response: Response | undefined
    try {
      response = await send()
    } catch (error) {
      if (
        signal?.aborted ||
        isAbort(error) ||
        !(error instanceof TypeError) ||
        attempt >= maxRetries
      )
        throw error
    }
    if (response && signal?.aborted) {
      await response.body?.cancel()
      signal.throwIfAborted()
    }
    if (
      response &&
      (!retryableStatuses.has(response.status) || attempt >= maxRetries)
    ) {
      return response // Ownership of this final body passes to the caller.
    }
    const retryAfter = response
      ? parseRetryAfter(response.headers.get('Retry-After'), now())
      : undefined
    // Cleanup failures are not network-send failures and must not trigger retry.
    if (response) await response.body?.cancel()
    signal?.throwIfAborted()
    // Full jitter: uniform sample of [0, min(baseDelayMs * 2^N, maxDelayMs)].
    // https://opentelemetry.io/docs/specs/otlp/#otlphttp-throttling
    const delay =
      retryAfter ?? random(0, Math.min(baseDelayMs * 2 ** attempt, maxDelayMs))
    if (deadline !== undefined && delay >= deadline - now())
      throw new ExportTimeoutError()
    await wait(delay, signal, sleep)
  }
}
