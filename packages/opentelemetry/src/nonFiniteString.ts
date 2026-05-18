/**
 * Returns the protobuf-JSON string representation of a non-finite
 * number, or `undefined` if the value is finite (so callers can use
 * the raw number). Shared between the OTLP double encoder and the
 * attribute serializer to keep both layers on the same spec wire.
 *
 * https://protobuf.dev/programming-guides/json/
 */
export const nonFiniteString = (
  value: number,
): 'NaN' | 'Infinity' | '-Infinity' | undefined => {
  if (Number.isFinite(value)) return undefined
  if (Number.isNaN(value)) return 'NaN'
  return value > 0 ? 'Infinity' : '-Infinity'
}
