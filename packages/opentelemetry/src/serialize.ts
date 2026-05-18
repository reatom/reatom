import { serializeValue } from './serializeValue.ts'

/**
 * Converts any JS value to a stable string suitable for a span
 * attribute. Strings pass through unquoted; everything else gets
 * JSON.stringify'd after the shape-normalizing pass of
 * `serializeValue` (atoms/actions/errors/promises → marker strings,
 * nested structures depth-limited, cycles handled).
 */
export const serialize = (value: unknown, maxDepth?: number): string => {
  const normalized = serializeValue(value, maxDepth)
  return typeof normalized === 'string' ? normalized : JSON.stringify(normalized)
}
