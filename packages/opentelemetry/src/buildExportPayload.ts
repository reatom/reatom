import type { ResourceSpansInput } from './buildResourceSpans.ts'
import { buildResourceSpans } from './buildResourceSpans.ts'

export interface ExportPayloadInput {
  groups: ResourceSpansInput[]
}

export const buildExportPayload = (input: ExportPayloadInput) => ({
  resourceSpans: input.groups.map(buildResourceSpans),
})
