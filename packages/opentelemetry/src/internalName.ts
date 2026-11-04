export const INTERNAL_PREFIX = 'otel.'
export const ANALYTICS_PREFIX = 'analytics.'

export const internalName = (
  instanceName: string,
  ...parts: readonly string[]
): string =>
  parts.length === 0
    ? `${INTERNAL_PREFIX}${instanceName}`
    : `${INTERNAL_PREFIX}${instanceName}.${parts.join('.')}`

export const isInternalName = (name: string): boolean =>
  name.startsWith(INTERNAL_PREFIX) || name.startsWith(ANALYTICS_PREFIX)

export const isInternalUnit = (target: { name: string }): boolean =>
  isInternalName(target.name)
