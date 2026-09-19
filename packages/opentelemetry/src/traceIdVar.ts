import { variable } from '@reatom/core'

import type { TraceId } from './generateTraceId.ts'

/** Frame-scoped TraceId. Set on the root span; child atoms/actions inherit it. */
export const traceIdVar = variable<TraceId>('@reatom/opentelemetry.traceId')
