export type ReactiveBoolean = boolean | (() => boolean)
export type ReactiveString = string | (() => string)

export const resolveReactiveBoolean = (
  value: ReactiveBoolean | undefined,
): boolean => {
  if (typeof value === 'function') return value()
  return value === true
}
