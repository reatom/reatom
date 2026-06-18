import { isAbort, isAction, isAtom, isObject } from '@reatom/core'

const serializeValue = (value: unknown, depth = 0): unknown => {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'

  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (typeof value === 'bigint') return String(value)
  if (typeof value === 'symbol') return `[Symbol ${value.description}]`
  if (typeof value === 'function') return `[Function ${value || 'anonymous'}]`

  if (isAction(value)) return `[Action ${(value as { name: string }).name}]`
  if (isAtom(value)) return `[Atom ${(value as { name: string }).name}]`

  if (value instanceof Promise) return '[Promise]'
  if (isAbort(value)) return `[AbortError ${value.message}]`
  if (value instanceof Error)
    return `[Error ${value.message}${isObject(value.cause) && 'message' in value.cause ? ` -> ${value.cause.message}` : ''}]`
  if (value instanceof Date) return value.toISOString()
  if (value instanceof RegExp) return value.toString()
  if (value instanceof WeakMap) return '[WeakMap]'
  if (value instanceof WeakSet) return '[WeakSet]'
  if (value instanceof WeakRef) return '[WeakRef]'

  if (ArrayBuffer.isView(value))
    return `[${value.constructor.name} ${value.byteLength}]`
  if (value instanceof ArrayBuffer) return `[ArrayBuffer ${value.byteLength}]`

  if (value instanceof Map) {
    if (depth >= 2) return '[Map]'

    const obj: Record<string, unknown> = {}
    for (const [k, v] of value) obj[String(k)] = serializeValue(v, depth + 1)
    return obj
  }
  if (value instanceof Set) {
    if (depth >= 2) return '[Set]'
    return Array.from(value, (v) => serializeValue(v, depth + 1))
  }

  if (Array.isArray(value)) {
    if (depth >= 2) return '[Array]'
    return value.map((v) => serializeValue(v, depth + 1))
  }

  if (depth >= 2) return '[Object]'

  const obj: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(value))
    obj[key] = serializeValue(val, depth + 1)
  return obj
}

export const serialize = (value: unknown): string => {
  const result = serializeValue(value)
  return typeof result === 'string' ? result : JSON.stringify(result)
}
