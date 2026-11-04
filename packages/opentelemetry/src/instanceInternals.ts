import type { BrowserTelemetry } from './captureEngine.ts'
import type { TraceContext } from './captureEngine.ts'
export type InstanceInternals = {
  recordedExceptions: WeakSet<object>
  rateLimitDrops: { count: number }
  invalidateStats(): void
  currentTrace(): TraceContext | undefined
  runInTrace<Result>(
    context: TraceContext | undefined,
    callback: () => Result,
  ): Result
}
export const internalsByInstance = new WeakMap<
  BrowserTelemetry,
  InstanceInternals
>()
export const internalsOf = (instance: BrowserTelemetry) =>
  internalsByInstance.get(instance)
