import { log, withActionMiddleware, withCallHook } from '@reatom/core'
import { getInstanceRegistry, type LogEmission } from './instanceRegistry.ts'
const OTEL_LOG_HOOKS_KEY = Symbol.for('reatom.opentelemetry.logHooks')
type RegistryHolder = typeof globalThis & { [OTEL_LOG_HOOKS_KEY]?: true }
const dispatchLog = (emission: LogEmission) => {
  for (const instance of getInstanceRegistry().values()) {
    instance.emitLog?.(emission)
  }
}

export const installLogHooks = () => {
  const holder = globalThis as RegistryHolder
  if (holder[OTEL_LOG_HOOKS_KEY]) return
  holder[OTEL_LOG_HOOKS_KEY] = true

  const stateNames = new WeakMap<object, string>()
  let pendingStateName: string | undefined

  try {
    log.extend(
      withActionMiddleware(() => (next, ...params) => {
        const result = next(...params)
        if (
          pendingStateName !== undefined &&
          result !== null &&
          typeof result === 'object'
        ) {
          stateNames.set(result, pendingStateName)
        }
        return result
      }),
      withCallHook((payload, params) => {
        dispatchLog({
          kind: 'log',
          params,
          payload,
          stateName:
            payload !== null && typeof payload === 'object'
              ? stateNames.get(payload)
              : undefined,
        })
      }),
    )
    log.label.extend(
      withCallHook((payload, params) => {
        dispatchLog({ kind: 'label', params, payload })
      }),
    )
    const originalState = log.state.bind(log)
    log.state = ((name: string, data: unknown) => {
      pendingStateName = name
      try {
        return originalState(name, data)
      } finally {
        pendingStateName = undefined
      }
    }) as typeof log.state
  } catch {
    holder[OTEL_LOG_HOOKS_KEY] = undefined
  }
}
