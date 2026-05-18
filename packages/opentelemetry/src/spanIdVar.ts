import { variable } from '@reatom/core'

import type { SpanId } from './generateSpanId.ts'

/** Frame-scoped SpanId. Set per atom/action; the parent frame's value becomes parentSpanId. */
export const spanIdVar = variable<SpanId>('@reatom/opentelemetry.spanId')
