import { createCaptureEngine } from '../captureEngine.ts'
import type {
  BrowserTelemetry,
  ReatomOpentelemetryInput,
  OtelOptions,
} from '../captureEngine.ts'

export type BrowserTelemetryOptions = Omit<
  OtelOptions,
  | 'filter'
  | 'roots'
  | 'route'
  | 'warnContextLoss'
  | 'maxSpansPerTrace'
  | 'maxTraceMs'
>
export type BrowserTelemetryInput = Omit<
  ReatomOpentelemetryInput,
  | 'filter'
  | 'roots'
  | 'route'
  | 'warnContextLoss'
  | 'maxSpansPerTrace'
  | 'maxTraceMs'
  | 'extend'
  | 'skipGlobalExtension'
>
export type {
  BrowserTelemetry,
  StartSpanOptions,
  ManualSpan,
  TraceContext,
} from '../captureEngine.ts'
export type { CaptureSnapshot } from '../browserCapture.ts'
export type {
  CapturedRecord,
  CapturedSpan,
  CapturedLog,
  CaptureStats,
} from '../records.ts'
export type { LocalValues, LocalValuesMode } from '../localValues.ts'
export type { OtlpAttrValue } from '../toOtlpValue.ts'
export type { SpanKind } from '../buildSpan.ts'

/**
 * Local capture and explicit spans, with opt-in browser collectors and
 * transport.
 */
export const reatomOpentelemetry = (
  input: BrowserTelemetryInput,
): BrowserTelemetry => createCaptureEngine(input)
