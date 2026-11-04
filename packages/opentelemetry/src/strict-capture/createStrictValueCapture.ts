import type { OtlpAttrValue } from '../toOtlpValue.ts'
import { nonFiniteString } from '../nonFiniteString.ts'
import { EMAIL_SCRUB } from '../scrubEmail.ts'
import { isSensitiveName, type ValueCaptureFactory } from '../serialize.ts'

const MAX_DEPTH = 5
const MAX_ENTRIES = 100
const MAX_STRING_LENGTH = 2048
const MAX_BYTES = 8192
const INT64_MIN = -(1n << 63n)
const INT64_MAX = (1n << 63n) - 1n
const TRUNCATED = '[Truncated]'
const REDACTED = '[redacted]'
const SENSITIVE_KEY =
  /pass(word)?|secret|token|auth|cookie|session|crypto|card|cvv|iban|ssn/i
const PHONE_SCRUB = /(?<![\dA-Fa-f])\+?(?:[\s().-]*\d){10,15}(?![\dA-Fa-f])/g
const JWT_SCRUB = /\beyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]*/g
const BEARER_SCRUB = /\bBearer\s+\S+/gi
const MARKER_BYTES = 13 // JSON string including quotes; all fixed markers fit.

const isSensitiveKey = (key: string) => SENSITIVE_KEY.test(key)

const scrubContacts = (value: string): string => {
  const head = value.length > 4096 ? value.slice(0, 4096) : value
  const tail = value.length > 4096 ? value.slice(4096) : ''
  EMAIL_SCRUB.lastIndex = 0
  PHONE_SCRUB.lastIndex = 0
  JWT_SCRUB.lastIndex = 0
  BEARER_SCRUB.lastIndex = 0
  const scrubbed = head
    .replace(BEARER_SCRUB, 'Bearer [redacted]')
    .replace(JWT_SCRUB, '[jwt]')
    .replace(EMAIL_SCRUB, '[email]')
    .replace(PHONE_SCRUB, (match) =>
      match.startsWith('+') || /[\s().-]/.test(match) ? '[phone]' : match,
    )
  return scrubbed + tail
}
const encoder = new TextEncoder()
const stringBytes = (value: string) =>
  encoder.encode(JSON.stringify(value)).length
const byteLengthGetter = Object.getOwnPropertyDescriptor(
  Object.getPrototypeOf(Uint8Array.prototype),
  'length',
)!.get!
const byteBrandGetter = Object.getOwnPropertyDescriptor(
  Object.getPrototypeOf(Uint8Array.prototype),
  Symbol.toStringTag,
)!.get!

// Intrinsic readers only. Instance toJSON, iterators, getters and
// Symbol.toStringTag stay unused; a throwing Proxy still fails the later
// own-key walk.
// React Native and partial polyfills may lack URL or its native getters;
// URL values then fall back to the class marker.
const urlPrototype: object | undefined =
  typeof URL === 'function' ? URL.prototype : undefined
const urlGetter = (name: string) =>
  urlPrototype && Object.getOwnPropertyDescriptor(urlPrototype, name)?.get
const urlProtocolGetter = urlGetter('protocol')
const urlHostGetter = urlGetter('host')
const urlPathnameGetter = urlGetter('pathname')
const urlSearchGetter = urlGetter('search')
const canFormatUrl =
  !!urlProtocolGetter &&
  !!urlHostGetter &&
  !!urlPathnameGetter &&
  !!urlSearchGetter
const dateToISOString = Object.getOwnPropertyDescriptor(
  Date.prototype,
  'toISOString',
)!.value as (this: Date) => string
const mapSizeGetter = Object.getOwnPropertyDescriptor(
  Map.prototype,
  'size',
)!.get!
const setSizeGetter = Object.getOwnPropertyDescriptor(
  Set.prototype,
  'size',
)!.get!
const mapEntriesFn = Object.getOwnPropertyDescriptor(Map.prototype, 'entries')!
  .value as (this: object) => object
const setValuesFn = Object.getOwnPropertyDescriptor(Set.prototype, 'values')!
  .value as (this: object) => object
const iteratorStep = Object.getOwnPropertyDescriptor(
  Object.getPrototypeOf(new Map<unknown, unknown>().entries()),
  'next',
)!.value as (this: object) => unknown
const setIteratorStep = Object.getOwnPropertyDescriptor(
  Object.getPrototypeOf(new Set<unknown>().values()),
  'next',
)!.value as (this: object) => unknown

type PrototypeKind = 'plain' | 'url' | 'date' | 'map' | 'set' | 'class'

const isPrototypeObject = (value: unknown): value is object =>
  value !== null && (typeof value === 'object' || typeof value === 'function')

const prototypeKind = (prototype: unknown): PrototypeKind => {
  if (prototype === null || prototype === Object.prototype) return 'plain'
  if (!isPrototypeObject(prototype)) return 'class'
  let current: object | null = prototype
  const seen = new Set<object>()
  while (current !== null) {
    if (canFormatUrl && current === urlPrototype) return 'url'
    if (current === Date.prototype) return 'date'
    if (current === Map.prototype) return 'map'
    if (current === Set.prototype) return 'set'
    if (seen.has(current)) return 'class'
    seen.add(current)
    let next: unknown
    try {
      next = Object.getPrototypeOf(current)
    } catch {
      return 'class'
    }
    current = isPrototypeObject(next) ? next : null
  }
  return 'class'
}

const formatQueryKeys = (search: string): string => {
  if (search.length <= 1) return ''
  const body = search.charCodeAt(0) === 63 ? search.slice(1) : search
  const keys: string[] = []
  const seen = new Set<string>()
  for (const part of body.split('&')) {
    const eq = part.indexOf('=')
    const key = eq === -1 ? part : part.slice(0, eq)
    if (seen.has(key)) continue
    seen.add(key)
    keys.push(key)
  }
  return keys.length === 0 ? '' : `?${keys.join('&')}`
}

const formatUrl = (value: object): string => {
  try {
    const protocol: unknown = Reflect.apply(urlProtocolGetter!, value, [])
    const host: unknown = Reflect.apply(urlHostGetter!, value, [])
    const pathname: unknown = Reflect.apply(urlPathnameGetter!, value, [])
    const search: unknown = Reflect.apply(urlSearchGetter!, value, [])
    if (
      typeof protocol !== 'string' ||
      typeof host !== 'string' ||
      typeof pathname !== 'string' ||
      typeof search !== 'string'
    )
      return '[Opaque]'
    return `${protocol}//${host}${pathname}${formatQueryKeys(search)}`
  } catch {
    return '[Opaque]'
  }
}

const formatDate = (value: object): string => {
  try {
    const iso: unknown = Reflect.apply(dateToISOString, value, [])
    return typeof iso === 'string' ? iso : '[Invalid Date]'
  } catch {
    return '[Invalid Date]'
  }
}

const classMarker = (prototype: object): string => {
  try {
    const constructorDescriptor = Object.getOwnPropertyDescriptor(
      prototype,
      'constructor',
    )
    if (!constructorDescriptor || !('value' in constructorDescriptor))
      return '[Opaque]'
    const constructor: unknown = constructorDescriptor.value
    if (typeof constructor !== 'function') return '[Opaque]'
    const nameDescriptor = Object.getOwnPropertyDescriptor(constructor, 'name')
    if (!nameDescriptor || !('value' in nameDescriptor)) return '[Opaque]'
    const name: unknown = nameDescriptor.value
    if (typeof name !== 'string' || name.length === 0) return '[Opaque]'
    return `[${name}]`
  } catch {
    return '[Opaque]'
  }
}

const readSize = (value: object, getter: unknown): number | undefined => {
  if (typeof getter !== 'function') return
  try {
    const read: unknown = Reflect.apply(getter, value, [])
    if (typeof read !== 'number' || !Number.isSafeInteger(read) || read < 0)
      return
    return read
  } catch {
    return
  }
}

const descriptorValue = (target: object, key: string): unknown => {
  const descriptor = Object.getOwnPropertyDescriptor(target, key)
  if (!descriptor || !('value' in descriptor)) return
  return descriptor.value
}

// Scan at most MAX_STRING_LENGTH UTF-16 units, preserving surrogate pairs.
// JSON escapes lone surrogates and control characters before UTF-8 encoding.
const stringPrefix = (value: string, maxUnits: number, maxBytes: number) => {
  let end = 0
  let bytes = 0
  while (end < value.length && end < maxUnits) {
    const code = value.charCodeAt(end)
    let units = 1
    let cost = 1
    if (code === 34 || code === 92) cost = 2
    else if (code < 32) cost = [8, 9, 10, 12, 13].includes(code) ? 2 : 6
    else if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(end + 1)
      if (next >= 0xdc00 && next <= 0xdfff) {
        units = 2
        cost = 4
      } else cost = 6
    } else if (code >= 0xdc00 && code <= 0xdfff) cost = 6
    else if (code > 0x7ff) cost = 3
    else if (code > 0x7f) cost = 2
    if (end + units > maxUnits || bytes + cost > maxBytes) break
    end += units
    bytes += cost
  }
  return value.slice(0, end)
}

/**
 * One session owns a shared traversal/size budget across params and payload.
 *
 * The size bound is the sum of UTF-8 JSON `[key, normalizedValue]` pairs, with
 * byte arrays represented as base64 strings and int64 bigints as decimal
 * strings. It includes escaping, keys, delimiters and markers, but not OTLP
 * wrappers or record metadata. Accounting is conservative: each value reserves
 * at least 13 bytes, each container also reserves a truncation member, and
 * unused reservations are not refunded.
 *
 * Traversal slots cover roots, attempted own keys (including symbols and
 * non-enumerable keys), array holes and length descriptors. Exhaustion stops
 * application traversal/redaction. Containers mark omitted content with a tail
 * (arrays) or `[Truncated]` member (records, replacing that key if necessary).
 * A later capture returns a charged marker; if even its key/marker cannot fit,
 * it throws RangeError so the observation boundary can cancel the record.
 *
 * Only ordinary arrays, plain records, Map, Set and Uint8Array are traversed.
 * Accessors are `[Skipped]`. A function with an own `__reatom` meta becomes
 * `[Atom <name>]` or `[Action <name>]` (a computed counts as an atom) from the
 * function's own data `name`; it is never called. Other functions stay
 * `[Function]`. `URL` becomes `protocol//host` plus pathname and, when a query
 * is present, `?` plus the deduped query keys. `Date` becomes an ISO string, or
 * `[Invalid Date]`. Other class instances become `[ClassName]` from the
 * prototype constructor's own data name, otherwise `[Opaque]` (DOM nodes follow
 * that rule). Redaction sees roots and readable child values before
 * normalization. Keys matching password/secret/token and siblings become
 * `[redacted]` after that hook. Map values use `String(k)` as the redaction key
 * when `k` is a string. `names` redacts a whole root when the atom or action
 * name matches those words as segments (`login.password`, `setPassword`),
 * without treating `author` as `auth`. `entryNames` on `capture` redact direct
 * `params` elements by parameter name. Kept strings replace email-like and
 * phone-like text with `[email]` and `[phone]`, JWT-shaped tokens with `[jwt]`,
 * and `Bearer` tokens with `Bearer [redacted]`, scanning at most 4096
 * characters. User `toJSON`, getters and `Symbol.toStringTag` are not used.
 * Hook failures and Proxy trap failures propagate; there is no input fallback.
 * Reflect.ownKeys can materialize all keys; arbitrary Proxy traps and redact
 * cannot have a hard CPU bound. Descriptors/values are visited only on budget.
 */
export const strictValueCapture: ValueCaptureFactory = (redact, context) => {
  let bytes = MAX_BYTES
  let entries = MAX_ENTRIES
  const names = context?.names ?? []

  const reserve = (size: number) => {
    if (size > bytes) return false
    bytes -= size
    return true
  }

  const emitString = (text: string): OtlpAttrValue => {
    const scrubbed = text === REDACTED ? text : scrubContacts(text)
    if (scrubbed.length <= MAX_STRING_LENGTH) {
      const cost = stringBytes(scrubbed)
      if (reserve(Math.max(0, cost - MARKER_BYTES))) return scrubbed
    }
    const prefix = stringPrefix(
      scrubbed,
      MAX_STRING_LENGTH - TRUNCATED.length,
      bytes,
    )
    const result = prefix + TRUNCATED
    reserve(stringBytes(result) - MARKER_BYTES)
    return result
  }

  const reatomMarker = (fn: object): string | undefined => {
    const meta = descriptorValue(fn, '__reatom')
    if (!isPrototypeObject(meta)) return
    const reactive = descriptorValue(meta, 'reactive')
    if (typeof reactive !== 'boolean') return
    const kind = reactive ? 'Atom' : 'Action'
    const name = descriptorValue(fn, 'name')
    return typeof name === 'string' && name.length > 0
      ? `[${kind} ${name}]`
      : `[${kind}]`
  }

  let captureCollection!: (
    value: object,
    prototype: object,
    depth: number,
    ancestors: WeakSet<object>,
    kind: 'map' | 'set',
  ) => OtlpAttrValue

  // Every call has already reserved MARKER_BYTES for its result.
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
      // Range-check before conversion: arbitrary-size decimal conversion is
      // unbounded. Int64 values retain their OTLP integer representation.
      const result =
        value < INT64_MIN || value > INT64_MAX ? '[Unsafe bigint]' : value
      const cost = stringBytes(
        typeof result === 'bigint' ? String(result) : result,
      )
      return reserve(Math.max(0, cost - MARKER_BYTES)) ? result : TRUNCATED
    }
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') {
      const result = nonFiniteString(value) ?? value
      const cost = encoder.encode(JSON.stringify(result)).length
      return reserve(Math.max(0, cost - MARKER_BYTES)) ? result : TRUNCATED
    }
    if (typeof value === 'string') return emitString(value)

    if (
      ArrayBuffer.isView(value) &&
      byteBrandGetter.call(value) === 'Uint8Array'
    ) {
      // The intrinsic brand accepts Buffer/subclasses without user hooks.
      // Use the intrinsic getter and indexed byte reads, never user length,
      // constructor/species, slice, or iterator properties.
      const length: number = byteLengthGetter.call(value)
      const cost = 2 + 4 * Math.ceil(length / 3)
      if (!reserve(Math.max(0, cost - MARKER_BYTES))) return TRUNCATED
      const result = new Uint8Array(length)
      for (let i = 0; i < length; i++) result[i] = (value as Uint8Array)[i]!
      return result
    }

    if (ancestors.has(value)) return '[Circular]'
    if (depth >= MAX_DEPTH) return TRUNCATED
    const array = Array.isArray(value)
    if (!array) {
      const prototype: unknown = Object.getPrototypeOf(value)
      const kind = prototypeKind(prototype)
      if (kind === 'url') return emitString(formatUrl(value))
      if (kind === 'date') return emitString(formatDate(value))
      if ((kind === 'map' || kind === 'set') && isPrototypeObject(prototype))
        return captureCollection(value, prototype, depth, ancestors, kind)
      if (kind === 'class')
        return emitString(
          isPrototypeObject(prototype) ? classMarker(prototype) : '[Opaque]',
        )
    }

    // Include braces/brackets, a possible preceding comma and truncation tail.
    const containerBytes = array
      ? 2 + 1 + MARKER_BYTES
      : 2 + 1 + MARKER_BYTES * 2 + 1
    if (!reserve(containerBytes - MARKER_BYTES)) return TRUNCATED
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
          if (entries === 0 || !reserve(1 + MARKER_BYTES)) {
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
      // Object.keys/getOwnPropertyDescriptors would inspect every descriptor.
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
          !reserve(stringBytes(childKey) + 2 + MARKER_BYTES)
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

  captureCollection = (value, prototype, depth, ancestors, kind) => {
    if (entries === 0) return TRUNCATED
    const size = readSize(value, kind === 'map' ? mapSizeGetter : setSizeGetter)
    if (size === undefined) return emitString(classMarker(prototype))
    let iterator: object | undefined
    if (size > 0) {
      try {
        const created: unknown = Reflect.apply(
          kind === 'map' ? mapEntriesFn : setValuesFn,
          value,
          [],
        )
        if (!isPrototypeObject(created))
          return emitString(classMarker(prototype))
        iterator = created
      } catch {
        return emitString(classMarker(prototype))
      }
    }
    const wrapper = kind === 'map' ? '@map' : '@set'
    const overhead = 2 + stringBytes(wrapper) + 1 + 2 + 1 + MARKER_BYTES
    if (!reserve(overhead - MARKER_BYTES)) return TRUNCATED
    entries--
    ancestors.add(value)
    try {
      const list: OtlpAttrValue[] = []
      const next = kind === 'map' ? iteratorStep : setIteratorStep
      const perEntry =
        kind === 'map'
          ? 1 + 2 + 1 + MARKER_BYTES + MARKER_BYTES
          : 1 + MARKER_BYTES
      let read = 0
      while (iterator && read < size) {
        if (entries === 0 || !reserve(perEntry)) {
          list.push(TRUNCATED)
          break
        }
        entries--
        let done = false
        let entry: unknown
        try {
          const step: unknown = Reflect.apply(next, iterator, [])
          if (!isPrototypeObject(step)) {
            list.push(TRUNCATED)
            break
          }
          const doneDescriptor = Object.getOwnPropertyDescriptor(step, 'done')
          const valueDescriptor = Object.getOwnPropertyDescriptor(step, 'value')
          done =
            !!doneDescriptor &&
            'value' in doneDescriptor &&
            doneDescriptor.value === true
          entry =
            valueDescriptor && 'value' in valueDescriptor
              ? valueDescriptor.value
              : undefined
        } catch {
          list.push(TRUNCATED)
          break
        }
        if (done) break
        read++
        if (kind === 'set') {
          list.push(visit(String(read - 1), entry, depth + 1, ancestors))
          continue
        }
        if (!Array.isArray(entry)) {
          list.push(TRUNCATED)
          break
        }
        const key: unknown = entry[0]
        const item: unknown = entry[1]
        const redactionKey = typeof key === 'string' ? key : String(read - 1)
        list.push([
          visit('@key', key, depth + 1, ancestors),
          visit(redactionKey, item, depth + 1, ancestors),
        ])
      }
      const record = Object.create(null) as Record<string, OtlpAttrValue>
      record[wrapper] = list
      return record
    } finally {
      ancestors.delete(value)
    }
  }

  return {
    capture(key, value, entryNames) {
      // Bound key work too: oversized root keys cannot be renamed by this API.
      if (
        key.length > MAX_STRING_LENGTH ||
        !reserve(stringBytes(key) + 3 + MARKER_BYTES)
      )
        throw new RangeError('Value capture budget exhausted')
      if (entries === 0) return TRUNCATED
      entries--
      return visit(key, value, 0, new WeakSet(), entryNames)
    },
  }
}
