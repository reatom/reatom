import { isAbort, sleep as defaultSleep } from '@reatom/core'

import { calculateBackoff } from './calculateBackoff.ts'
import { parseRetryAfter } from './parseRetryAfter.ts'

export interface RetryWithBackoffInput {
  send: () => Promise<Response>
  maxRetries?: number
  baseDelayMs?: number
  maxDelayMs?: number
  sleep?: (ms: number) => Promise<unknown>
  now?: () => number
  /** Aborts the retry loop. Caller is responsible for plumbing the same signal into `send`'s fetch. */
  signal?: AbortSignal
}

// Throttle/overloaded codes retry; 400 is a client-side data problem
// that won't improve. Network errors (thrown) retry too — transient.
// https://opentelemetry.io/docs/specs/otlp/#failures-1
const RETRYABLE_STATUS = new Set([429, 502, 503, 504])

type Outcome =
  | { kind: 'response'; value: Response }
  | { kind: 'error'; value: unknown }

/**
 * Wraps `send` with exponential backoff on retryable failures.
 *
 * Honors `Retry-After` when present, falls back to jittered backoff.
 * After `maxRetries` the last outcome is surfaced — response returned
 * or error rethrown — so the caller can still decide. An aborted
 * `signal` short-circuits the loop and surfaces the abort reason.
 */
export const retryWithBackoff = async ({
  send,
  maxRetries = 3,
  baseDelayMs = 1000,
  maxDelayMs = 30_000,
  sleep = defaultSleep,
  now = Date.now,
  signal,
}: RetryWithBackoffInput): Promise<Response> => {
  let last: Outcome | undefined

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    signal?.throwIfAborted()
    try {
      const response = await send()
      if (!RETRYABLE_STATUS.has(response.status)) return response
      last = { kind: 'response', value: response }
    } catch (error) {
      if (isAbort(error) || signal?.aborted) throw error
      // OTLP failure spec retries on transient network errors. WHATWG Fetch
      // surfaces those as TypeError; anything else (RangeError from a bad
      // URL, encoder fault, programming bug) is non-retryable and must
      // surface immediately so the bug is visible.
      if (!(error instanceof TypeError)) throw error
      last = { kind: 'error', value: error }
    }

    if (attempt === maxRetries) break

    const retryAfter =
      last.kind === 'response'
        ? parseRetryAfter(last.value.headers.get('Retry-After'), now())
        : undefined
    // Clamp Retry-After: a misconfigured collector returning 86400 would
    // otherwise pin flush() for 24h.
    const delay =
      retryAfter !== undefined
        ? Math.min(retryAfter, maxDelayMs)
        : calculateBackoff(attempt, baseDelayMs, maxDelayMs)

    if (signal) {
      // Bind the listener to a per-iteration controller so it's removed
      // when the sleep wins (the common path); `{once: true}` alone would
      // leak listeners on the long-lived caller-supplied signal under
      // sustained retry pressure.
      const local = new AbortController()
      try {
        await Promise.race([
          Promise.resolve(sleep(delay)),
          new Promise<void>((r) =>
            signal.addEventListener('abort', () => r(), {
              once: true,
              signal: local.signal,
            }),
          ),
        ])
      } finally {
        local.abort()
      }
      signal.throwIfAborted()
    } else {
      await sleep(delay)
    }
  }

  if (last?.kind === 'response') return last.value
  throw last?.value
}
