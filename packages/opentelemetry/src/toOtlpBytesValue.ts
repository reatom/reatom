// bytes_value uses standard protobuf JSON base64 encoding
// (OTLP only deviates to hex for traceId/spanId).
// https://opentelemetry.io/docs/specs/otlp/#json-protobuf-encoding
export const toOtlpBytesValue = (bytes: Uint8Array): { bytesValue: string } => {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return { bytesValue: btoa(bin) }
}
