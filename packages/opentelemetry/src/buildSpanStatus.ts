// OTLP enum values must be integers, not name strings.
// https://opentelemetry.io/docs/specs/otlp/#json-protobuf-encoding
const STATUS_CODE = { unset: 0, ok: 1, error: 2 } as const

export type StatusCode = keyof typeof STATUS_CODE

export interface OtlpSpanStatus {
  code: (typeof STATUS_CODE)[StatusCode]
  message?: string
}

export const buildSpanStatus = (
  code: StatusCode,
  message?: string,
): OtlpSpanStatus =>
  message !== undefined
    ? { code: STATUS_CODE[code], message }
    : { code: STATUS_CODE[code] }
