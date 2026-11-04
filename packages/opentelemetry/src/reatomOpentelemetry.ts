import { EXTENSIONS, isAction, removeItem, type Ext } from '@reatom/core'
import { createCaptureEngine } from './captureEngine.ts'
import type {
  ReatomOpentelemetryInput,
  ReatomOpentelemetry,
} from './captureEngine.ts'
import { createWithOTel } from './withOTel.ts'
import { createRouteRootMachine } from './roots/route.ts'
import { isObserving, observe } from './observation.ts'
import { isInternalUnit } from './internalName.ts'
import { installLogHooks } from './instanceLogHooks.ts'
export type {
  BrowserTelemetry,
  ManualSpan,
  StartSpanOptions,
  ReatomOpentelemetry,
  ReatomOpentelemetryInput,
  OtelOptions,
  TraceContext,
  CreateTraceOptions,
  ValueCaptureFactory,
  ValueCaptureContext,
} from './captureEngine.ts'
export { internalsOf } from './instanceInternals.ts'

/** Full automatic Reatom instrumentation, including actions, routes and LOG. */
export const reatomOpentelemetry = (
  input: ReatomOpentelemetryInput,
): ReatomOpentelemetry => {
  let tracing!: ReturnType<typeof createWithOTel>
  const instance = createCaptureEngine(input, {
    createTracing: (options) => (tracing = createWithOTel(options)),
    createRoutes: createRouteRootMachine,
    onLogInstance: installLogHooks,
    installGlobal(tracing, runtimeOptions) {
      if (input.skipGlobalExtension === true) return () => {}
      const globalExt: Ext = (target) => {
        if (
          isObserving() ||
          target.name === 'LOG' ||
          target.name === 'LOG.label' ||
          isInternalUnit(target)
        )
          return target
        const current = runtimeOptions()
        let next = isAction(target) ? tracing.auto(target, true) : target
        if (current.extend) {
          const extended = observe(() =>
            current.extend!(next, tracing.withOTel),
          )
          if (extended) next = extended
        }
        return next
      }
      EXTENSIONS.push(globalExt)
      return () => removeItem(EXTENSIONS, globalExt)
    },
  })
  return instance.extend(() => ({ withOTel: tracing.withOTel }))
}
