import type { OtlpAttrValue } from './toOtlpValue.ts'
import { nonFiniteString } from './nonFiniteString.ts'

export type CaptureValuesOptions =
  false | { redact?: (key: string, value: unknown) => unknown }

export type Serialize = (value: unknown, key: string) => unknown

export type ValueCaptureContext = {
  names?: readonly string[]
}

export type ValueCapture = {
  capture: (
    key: string,
    value: unknown,
    entryNames?: readonly string[],
  ) => OtlpAttrValue
}

export type ValueCaptureFactory = (
  redact?: (key: string, value: unknown) => unknown,
  context?: ValueCaptureContext,
) => ValueCapture

const MAX_DEPTH = 5
const MAX_ENTRIES = 100
const MAX_STRING_LENGTH = 2048
const MAX_BYTES = 8192
const ENTRY_OVERHEAD = 8
const INT64_MIN = -(1n << 63n)
const INT64_MAX = (1n << 63n) - 1n
const TRUNCATED = '[Truncated]'
const REDACTED = '[redacted]'
const SENSITIVE_KEY =
  /pass(word)?|secret|token|auth|cookie|session|crypto|card|cvv|iban|ssn/i
const CONTACT_TOKEN = /^(?:e-?mail|emails?|phones?|mobile)$/i
const AUTHOR_SEGMENT = /^author(?!i)/i

const isSensitiveKey = (key: string) => SENSITIVE_KEY.test(key)

const nameSegments = (name: string): string[] =>
  name
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter((segment) => segment.length > 0)

/**
 * Segment match so `issueAuthor` is not `auth`. Object keys keep the substring
 * regex.
 */
export const isSensitiveName = (name: string): boolean => {
  if (CONTACT_TOKEN.test(name)) return true
  for (const segment of nameSegments(name)) {
    if (CONTACT_TOKEN.test(segment)) return true
    if (AUTHOR_SEGMENT.test(segment)) continue
    if (SENSITIVE_KEY.test(segment)) return true
  }
  return false
}

const matchingParen = (source: string, open: number): number => {
  let depth = 0
  for (let index = open; index < source.length; index++) {
    const char = source[index]
    if (char === '(') depth++
    else if (char === ')') {
      depth--
      if (depth === 0) return index
    }
  }
  return -1
}

/**
 * Best-effort parameter names from a function source. Empty when stripped or
 * native.
 */
export const parameterNames = (fn: unknown): readonly string[] => {
  if (typeof fn !== 'function') return []
  let source: string
  try {
    source = Function.prototype.toString.call(fn)
  } catch {
    return []
  }
  if (source.includes('[native code]')) return []
  const head = source.trimStart()
  const body = head.startsWith('async ') ? head.slice(6).trimStart() : head
  let list: string | undefined
  if (body.startsWith('function') || body.startsWith('(')) {
    const open = body.indexOf('(')
    const close = open < 0 ? -1 : matchingParen(body, open)
    if (close > open) list = body.slice(open + 1, close)
  } else {
    const arrow = body.indexOf('=>')
    if (arrow > 0) {
      const single = body.slice(0, arrow).trim()
      if (/^[A-Za-z_$][\w$]*$/.test(single)) return [single]
    }
  }
  if (list === undefined) return []
  return list.split(',').flatMap((part) => {
    const cleaned = part
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/=[\s\S]*$/, '')
      .trim()
    const identifiers = cleaned.match(/[A-Za-z_$][\w$]*/g) ?? []
    const name = identifiers.join('.')
    return name.length > 0 ? [name] : []
  })
}

const descriptorValue = (target: object, key: string): unknown => {
  const descriptor = Object.getOwnPropertyDescriptor(target, key)
  if (!descriptor || !('value' in descriptor)) return
  return descriptor.value
}

const classMarker = (prototype: object): string => {
  const constructorDescriptor = Object.getOwnPropertyDescriptor(
    prototype,
    'constructor',
  )
  if (!constructorDescriptor || !('value' in constructorDescriptor))
    return '[Object]'
  const constructor: unknown = constructorDescriptor.value
  if (typeof constructor !== 'function') return '[Object]'
  const nameDescriptor = Object.getOwnPropertyDescriptor(constructor, 'name')
  if (!nameDescriptor || !('value' in nameDescriptor)) return '[Object]'
  const name: unknown = nameDescriptor.value
  if (typeof name !== 'string' || name.length === 0) return '[Object]'
  return `[${name}]`
}

const sliceString = (text: string): string => {
  if (text.length <= MAX_STRING_LENGTH) return text
  let end = MAX_STRING_LENGTH - TRUNCATED.length
  if (end > 0) {
    const last = text.charCodeAt(end - 1)
    if (last >= 0xd800 && last <= 0xdbff) end--
  }
  return text.slice(0, end) + TRUNCATED
}

/**
 * Lean session that shares a traversal and approximate size budget across
 * params and payload. Class instances including Map, Set, Date and URL become a
 * constructor-name marker; they are not walked. Pass `strictValueCapture` from
 * `@reatom/opentelemetry/strict-capture` for PII scrubbing, URL/Date
 * formatting, Map/Set encoding and byte-exact budgets.
 */
export const createValueCapture: ValueCaptureFactory = (redact, context) => {
  let bytes = MAX_BYTES
  let entries = MAX_ENTRIES
  const names = context?.names ?? []

  const reserve = (size: number) => {
    if (size > bytes) return false
    bytes -= size
    return true
  }

  const emitString = (text: string): OtlpAttrValue => {
    const result = sliceString(text)
    return reserve(result.length) ? result : TRUNCATED
  }

  const reatomMarker = (fn: object): string | undefined => {
    const meta = descriptorValue(fn, '__reatom')
    if (
      meta === null ||
      (typeof meta !== 'object' && typeof meta !== 'function')
    )
      return
    const reactive = descriptorValue(meta, 'reactive')
    if (typeof reactive !== 'boolean') return
    const kind = reactive ? 'Atom' : 'Action'
    const name = descriptorValue(fn, 'name')
    return typeof name === 'string' && name.length > 0
      ? `[${kind} ${name}]`
      : `[${kind}]`
  }

  const visit = (
    key: string,
    input: unknown,
    depth: number,
    ancestors: WeakSet<object>,
    entryNames?: readonly string[],
  ): OtlpAttrValue => {
    const transformed = redact ? redact(key, input) : input
    const entryName =
      entryNames && /^\d+$/.test(key) ? entryNames[Number(key)] : undefined
    const primitive =
      input === null ||
      input === undefined ||
      typeof input === 'string' ||
      typeof input === 'number' ||
      typeof input === 'boolean' ||
      typeof input === 'bigint'
    const nameCoversPrimitive =
      primitive &&
      names.some(isSensitiveName) &&
      (depth === 0 || entryNames !== undefined)
    const nameCoversRoot = depth === 0 && names.some(isSensitiveName)
    const sensitive =
      isSensitiveKey(key) ||
      isSensitiveName(key) ||
      (entryName !== undefined && isSensitiveName(entryName)) ||
      nameCoversPrimitive ||
      nameCoversRoot
    const value = sensitive ? REDACTED : transformed
    if (value === null) return '[Null]'
    if (value === undefined) return '[Undefined]'
    if (typeof value === 'function')
      return emitString(reatomMarker(value) ?? '[Function]')
    if (typeof value === 'symbol') return '[Symbol]'
    if (typeof value === 'bigint') {
      const result =
        value < INT64_MIN || value > INT64_MAX ? '[Unsafe bigint]' : value
      const cost =
        typeof result === 'bigint' ? String(result).length : result.length
      return reserve(cost) ? result : TRUNCATED
    }
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') {
      const result = nonFiniteString(value) ?? value
      const cost = typeof result === 'string' ? result.length : 8
      return reserve(cost) ? result : TRUNCATED
    }
    if (typeof value === 'string') return emitString(value)

    if (value instanceof Uint8Array) {
      if (!reserve(value.byteLength)) return TRUNCATED
      return new Uint8Array(value)
    }

    if (ancestors.has(value)) return '[Circular]'
    if (depth >= MAX_DEPTH) return TRUNCATED
    const array = Array.isArray(value)
    if (!array) {
      const prototype: unknown = Object.getPrototypeOf(value)
      if (prototype !== null && prototype !== Object.prototype)
        return emitString(
          typeof prototype === 'object' || typeof prototype === 'function'
            ? classMarker(prototype)
            : '[Object]',
        )
    }

    if (!reserve(ENTRY_OVERHEAD)) return TRUNCATED
    ancestors.add(value)
    try {
      if (array) {
        if (entries === 0) return TRUNCATED
        entries--
        const length: unknown = Object.getOwnPropertyDescriptor(
          value,
          'length',
        )?.value
        if (
          typeof length !== 'number' ||
          !Number.isSafeInteger(length) ||
          length < 0
        )
          return '[Opaque]'
        const result: OtlpAttrValue[] = []
        for (let i = 0; i < length; i++) {
          if (entries === 0 || !reserve(ENTRY_OVERHEAD)) {
            result.push(TRUNCATED)
            break
          }
          entries--
          const descriptor = Object.getOwnPropertyDescriptor(value, String(i))
          result.push(
            descriptor && !('value' in descriptor)
              ? '[Skipped]'
              : visit(
                  String(i),
                  descriptor?.value,
                  depth + 1,
                  ancestors,
                  key === 'params' ? entryNames : undefined,
                ),
          )
        }
        return result
      }

      const result = Object.create(null) as Record<string, OtlpAttrValue>
      if (entries === 0) {
        result[TRUNCATED] = TRUNCATED
        return result
      }
      const keys = Reflect.ownKeys(value)
      for (let i = 0; i < keys.length; i++) {
        const childKey = keys[i]!
        if (entries === 0) {
          result[TRUNCATED] = TRUNCATED
          break
        }
        entries--
        if (typeof childKey !== 'string') continue
        if (
          childKey.length > MAX_STRING_LENGTH ||
          !reserve(childKey.length + ENTRY_OVERHEAD)
        ) {
          result[TRUNCATED] = TRUNCATED
          break
        }
        const descriptor = Object.getOwnPropertyDescriptor(value, childKey)
        if (!descriptor?.enumerable) continue
        result[childKey] =
          'value' in descriptor
            ? visit(childKey, descriptor.value, depth + 1, ancestors)
            : '[Skipped]'
      }
      return result
    } finally {
      ancestors.delete(value)
    }
  }

  return {
    capture(key, value, entryNames) {
      if (
        key.length > MAX_STRING_LENGTH ||
        !reserve(key.length + ENTRY_OVERHEAD)
      )
        throw new RangeError('Value capture budget exhausted')
      if (entries === 0) return TRUNCATED
      entries--
      return visit(key, value, 0, new WeakSet(), entryNames)
    },
  }
}
