import { buildResource } from './buildResource.ts'
import { buildScopeSpans } from './buildScopeSpans.ts'
import type { OtlpSpan } from './buildSpan.ts'
import type { OtlpAttrValue } from './toOtlpValue.ts'

export interface ResourceSpansInput {
  resourceAttributes: Record<string, OtlpAttrValue>
  version: string
  spans: OtlpSpan[]
}

export const buildResourceSpans = (input: ResourceSpansInput) => ({
  resource: buildResource(input.resourceAttributes),
  scopeSpans: [buildScopeSpans({ version: input.version, spans: input.spans })],
})
