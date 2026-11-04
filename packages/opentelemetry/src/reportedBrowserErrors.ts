const reported = new WeakMap<object, WeakMap<object, number>>()
/** Private cross-collector dedupe. Claim only after rate/consent admission. */
export const markBrowserErrorReported = (
  otel: object,
  error: unknown,
  now = Date.now(),
  windowMs = 1000,
): boolean => {
  if ((!error || typeof error !== 'object') && typeof error !== 'function')
    return true
  let seen = reported.get(otel)
  if (!seen) reported.set(otel, (seen = new WeakMap()))
  const previous = seen.get(error as object)
  if (
    previous !== undefined &&
    now - previous >= 0 &&
    now - previous < windowMs
  )
    return false
  seen.set(error as object, now)
  return true
}

const standaloneOwners = new WeakMap<object, number>()
/** Prefer the explicit standalone collector over legacy analytics diagnostics. */
export const registerStandaloneBrowserErrors = (otel: object): (() => void) => {
  standaloneOwners.set(otel, (standaloneOwners.get(otel) ?? 0) + 1)
  let active = true
  return () => {
    if (!active) return
    active = false
    const remaining = (standaloneOwners.get(otel) ?? 1) - 1
    if (remaining) standaloneOwners.set(otel, remaining)
    else standaloneOwners.delete(otel)
  }
}
export const hasStandaloneBrowserErrors = (otel: object): boolean =>
  (standaloneOwners.get(otel) ?? 0) > 0
