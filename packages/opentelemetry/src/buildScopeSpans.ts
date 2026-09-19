import { buildInstrumentationScope } from './buildInstrumentationScope.ts'
import type { OtlpSpan } from './buildSpan.ts'

export interface ScopeSpansInput {
  version: string
  spans: OtlpSpan[]
}

// Clone the spans array so later mutations of `input.spans` don't affect the built payload
// (e.g. a batch exporter clearing its queue after build, before retry).
export const buildScopeSpans = (input: ScopeSpansInput) => ({
  scope: buildInstrumentationScope(input.version),
  spans: [...input.spans],
})
