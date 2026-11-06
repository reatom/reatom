import type { CapturedAttributes } from '../records.ts'
// Explicit domain attributes only. Unknown application values require an
// explicitly imported capture function. No getter execution or silent coercion.
export type Attributes = Readonly<Record<string, string | number | boolean>>
const EMPTY = Object.freeze({})
declare const brand: unique symbol
export type PreparedAttributes = CapturedAttributes & { readonly [brand]: true }
const prepared = new WeakSet<object>()
// Internal bridge for optional, bounded capture implementations. Not a public
// escape hatch from validation. The caller must own every nested value.
export const ownAttributes = (
  input: CapturedAttributes,
): PreparedAttributes => {
  Object.freeze(input)
  prepared.add(input)
  return input as PreparedAttributes
}
export const attributes = (
  input: Attributes | PreparedAttributes = EMPTY,
): PreparedAttributes => {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new TypeError('attributes must be an object')
  if (prepared.has(input)) return input as PreparedAttributes
  const result: Record<string, string | number | boolean> = Object.create(null)
  let bytes = 0
  const keys = Object.keys(input)
  if (keys.length > 100) throw new RangeError('attributes limit')
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(input, key)
    if (!descriptor || !('value' in descriptor))
      throw new TypeError('attribute accessor')
    const value: unknown = descriptor.value
    if (
      typeof value !== 'string' &&
      typeof value !== 'boolean' &&
      !(typeof value === 'number' && Number.isFinite(value))
    )
      throw new TypeError('scalar attributes required')
    // Conservative UTF-8 bound, including keys and entry overhead.
    bytes +=
      key.length * 3 + (typeof value === 'string' ? value.length * 3 : 16) + 8
    if (bytes > 8192) throw new RangeError('attributes limit')
    result[key] = value
  }
  return ownAttributes(result)
}
