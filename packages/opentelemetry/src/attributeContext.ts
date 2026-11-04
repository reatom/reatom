import { byteLengthOf, copyBytes } from './byteIntrinsics.ts'
/** Owned common attributes. The optional extension supplies the app reader. */
import type { BrowserTelemetry } from './captureEngine.ts'
import type { OtlpAttrValue } from './toOtlpValue.ts'
export type TelemetryAttributeSource = () => Readonly<
  Record<string, OtlpAttrValue>
> | null
const sources = new WeakMap<BrowserTelemetry, TelemetryAttributeSource>()
export const snapshotAttributes = (
  input: unknown,
): Record<string, OtlpAttrValue> => {
  try {
    if (input === null) return {}
    let entries = 0,
      bytes = 0
    const seen = new Set<object>()
    const visit = (value: unknown, depth: number): OtlpAttrValue => {
      if (++entries > 100 || depth > 5) throw new RangeError()
      if (typeof value === 'string') {
        bytes += value.length * 3
        if (value.length > 2048 || bytes > 8192) throw new RangeError()
        return value
      }
      if (
        typeof value === 'boolean' ||
        typeof value === 'bigint' ||
        (typeof value === 'number' && Number.isFinite(value))
      ) {
        bytes += 16
        return value
      }
      if (!value || typeof value !== 'object' || seen.has(value))
        throw new TypeError()
      seen.add(value)
      try {
        if (value instanceof Uint8Array) {
          const length = byteLengthOf.call(value)
          bytes += length
          if (bytes > 8192) throw new RangeError()
          const copy = new Uint8Array(length)
          copyBytes.call(copy, value)
          return copy
        }
        if (Array.isArray(value) && value.length > 100) throw new RangeError()
        if (Array.isArray(value))
          return Object.freeze(
            value.map((item) => visit(item, depth + 1)),
          ) as OtlpAttrValue[]
        if (
          Object.getPrototypeOf(value) !== Object.prototype &&
          Object.getPrototypeOf(value) !== null
        )
          throw new TypeError()
        const output: Record<string, OtlpAttrValue> = Object.create(null)
        for (const key of Object.keys(value)) {
          bytes += key.length * 3
          if (bytes > 8192) throw new RangeError()
          output[key] = visit(
            (value as Record<string, unknown>)[key],
            depth + 1,
          )
        }
        return Object.freeze(output)
      } finally {
        seen.delete(value)
      }
    }
    if (
      !input ||
      typeof input !== 'object' ||
      Array.isArray(input) ||
      input instanceof Uint8Array
    )
      throw new TypeError()
    return visit(input, 0) as Record<string, OtlpAttrValue>
  } catch (error) {
    return {
      'reatom.attributes_error':
        error instanceof RangeError ? 'RangeError' : 'TypeError',
    }
  }
}
export const readAttributeSource = (otel: BrowserTelemetry) => {
  const source = sources.get(otel)
  if (!source) return {}
  try {
    return snapshotAttributes(source())
  } catch {
    return { 'reatom.attributes_error': 'TypeError' }
  }
}
export const installAttributeSource = (
  otel: BrowserTelemetry,
  read: TelemetryAttributeSource,
) => {
  sources.set(otel, read)
  return () => {
    if (sources.get(otel) === read) sources.delete(otel)
  }
}
