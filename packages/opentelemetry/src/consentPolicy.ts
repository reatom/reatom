export type TracerSignals = {
  traces?: boolean
  logs?: boolean
}

export type TracerSignal = keyof TracerSignals

const isConsentRecord = (value: unknown): value is Record<string, boolean> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return Object.values(value).every((entry) => typeof entry === 'boolean')
}

/**
 * One tracer signal. No submitted consent leaves the signal on. A consent
 * record holds it only when `diagnostics` is explicitly `false` (the checkbox
 * was offered and left off, or set false). Analytics-only consent, with no
 * `diagnostics` key, does not hold the tracer. `signals[signal] === false` is
 * an app kill switch for that signal alone, including after a diagnostics
 * grant. Consent submit does not write it.
 */
export const tracerSignalEnabled = (
  options: {
    consent?: unknown
    signals?: TracerSignals
  },
  signal: TracerSignal,
): boolean => {
  if (options.signals?.[signal] === false) return false
  if (
    isConsentRecord(options.consent) &&
    Object.hasOwn(options.consent, 'diagnostics') &&
    options.consent.diagnostics === false
  ) {
    return false
  }
  return true
}

/** Keeps stored consent and signals when a replacement omits those keys. */
export const preserveTracerConsent = <
  Options extends { consent?: unknown; signals?: TracerSignals },
>(
  current: Options,
  next: Options,
): Options => {
  const keepConsent = !Object.hasOwn(next, 'consent')
  const keepSignals = !Object.hasOwn(next, 'signals')
  if (!keepConsent && !keepSignals) return next
  return {
    ...next,
    ...(keepConsent && { consent: current.consent }),
    ...(keepSignals && { signals: current.signals }),
  }
}
