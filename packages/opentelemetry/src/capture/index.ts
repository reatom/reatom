import { createValueCapture, type ValueCaptureFactory } from '../serialize.ts'
import type { OtlpAttrValue } from '../toOtlpValue.ts'
import { ownAttributes } from '../kernel/attributes.ts'
const freeze = (value: OtlpAttrValue): OtlpAttrValue => {
  if (value && typeof value === 'object' && !(value instanceof Uint8Array)) {
    for (const child of Object.values(value)) freeze(child)
    Object.freeze(value)
  }
  return value
}
/**
 * Explicit opt-in inspection. Current lean/strict capture factories can be
 * passed.
 */
export const captureAttributes = (
  input: Readonly<Record<string, unknown>>,
  factory: ValueCaptureFactory = createValueCapture,
) => {
  const capture = factory()
  const keys = Object.keys(input)
  if (keys.length > 100) throw new RangeError('attributes limit')
  const output: Record<string, OtlpAttrValue> = Object.create(null)
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(input, key)
    output[key] =
      descriptor && 'value' in descriptor
        ? freeze(capture.capture(key, descriptor.value))
        : '[Skipped]'
  }
  return ownAttributes(output)
}
