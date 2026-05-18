import { variable } from '@reatom/core'

import type { OtlpAttrValue } from './toOtlpValue.ts'

/**
 * Frame-scoped runtime override for resource attributes. Set inside an
 * instrumented atom/action to attach extra `service.*` / `deployment.*`
 * metadata to the spans emitted by descendants in the same call tree. Values are
 * merged into the construction-time `resourceAttributes` (var keys win)
 * at queue time and shipped on the next batch flush.
 */
export const resourceAttributesVar = variable<Record<string, OtlpAttrValue>>(
  '@reatom/opentelemetry.resourceAttributes',
)
