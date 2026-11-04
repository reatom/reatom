import { isDevelopment } from './devWarnings.ts'
import { OTEL } from './diag.ts'

export const OTEL_INSTANCES_KEY = Symbol.for('reatom.opentelemetry.instances')

export type LogEmission = {
  kind: 'log' | 'label'
  params: readonly unknown[]
  payload: unknown
  stateName?: string
}

export type RegisteredInstance = {
  name: string
  creationSite: Error
  dispose: () => void
  emitLog?: (emission: LogEmission) => void
}

type RegistryHolder = typeof globalThis & {
  [OTEL_INSTANCES_KEY]?: Map<string, RegisteredInstance>
}

export const getInstanceRegistry = (): Map<string, RegisteredInstance> => {
  const holder = globalThis as RegistryHolder
  let registry = holder[OTEL_INSTANCES_KEY]
  if (!registry) {
    registry = new Map()
    holder[OTEL_INSTANCES_KEY] = registry
  }
  return registry
}

export const registerInstance = (entry: RegisteredInstance) => {
  const registry = getInstanceRegistry()
  const existing = registry.get(entry.name)
  if (existing) {
    if (isDevelopment()) {
      console.warn(
        `${OTEL}duplicate instance "${entry.name}"`,
        existing.creationSite,
        entry.creationSite,
      )
    }
    existing.dispose()
  }
  registry.set(entry.name, entry)
}

export const unregisterInstance = (entry: RegisteredInstance) => {
  const registry = getInstanceRegistry()
  if (registry.get(entry.name) === entry) registry.delete(entry.name)
}
