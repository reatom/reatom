import { random } from '@reatom/core'

/**
 * Exponential backoff with full jitter (AWS recipe): delay sampled
 * uniformly from `[0, cap]` where `cap = min(baseDelayMs * 2^N, maxDelayMs)`.
 * Maximizes spread to prevent synchronized retry waves from hammering a
 * recovering collector.
 *
 * Tests override determinism via core's `mockRandom`.
 *
 * https://opentelemetry.io/docs/specs/otlp/#otlphttp-throttling
 * https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
 */
export const calculateBackoff = (
  attempt: number,
  baseDelayMs: number,
  maxDelayMs = 30_000,
): number => random(0, Math.min(baseDelayMs * 2 ** attempt, maxDelayMs))
