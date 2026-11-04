import { Buffer } from 'node:buffer'

import { expect, test } from 'vitest'

import { createValueCapture } from './captureValues.ts'
import { strictValueCapture } from './strict-capture/index.ts'
import type { OtlpAttrValue } from './toOtlpValue.ts'
import { toOtlpValue } from './toOtlpValue.ts'
test('preserves int64 values without converting unbounded bigints', () => {
  const capture = createValueCapture()
  expect(toOtlpValue(capture.capture('id', 1234567890123456789n))).toEqual({
    intValue: '1234567890123456789',
  })
  expect(capture.capture('max', 9223372036854775807n)).toBe(
    9223372036854775807n,
  )
  expect(capture.capture('min', -9223372036854775808n)).toBe(
    -9223372036854775808n,
  )
  expect(capture.capture('underflow', -9223372036854775809n)).toBe(
    '[Unsafe bigint]',
  )
  expect(toOtlpValue(capture.capture('large', 9999999999999999999n))).toEqual({
    stringValue: '[Unsafe bigint]',
  })
  expect(capture.capture('huge', 1n << 1_000_000n)).toBe('[Unsafe bigint]')
})

// Independent measurement of the documented normalized JSON representation.
const representationBytes = (key: string, value: OtlpAttrValue) =>
  new TextEncoder().encode(
    JSON.stringify([key, value], (_, item) =>
      item instanceof Uint8Array
        ? btoa(String.fromCharCode(...item))
        : typeof item === 'bigint'
          ? String(item)
          : item,
    ),
  ).length

test('capture never evaluates an application getter', () => {
  let getterCalls = 0
  const value = {
    public: 'visible',
    get secret() {
      getterCalls++
      return 'private'
    },
  }

  const result = createValueCapture().capture('state', value)

  expect(getterCalls).toBe(0)
  expect(result).toEqual({ public: 'visible', secret: '[Skipped]' })
})

test('capture stops reading a wide object after at most 100 entries', () => {
  let descriptorCalls = 0
  const value = new Proxy(
    Object.fromEntries(Array.from({ length: 10_000 }, (_, i) => [`k${i}`, i])),
    {
      getOwnPropertyDescriptor(target, key) {
        descriptorCalls++
        return Reflect.getOwnPropertyDescriptor(target, key)
      },
    },
  )

  const result = createValueCapture().capture('state', value)

  expect(descriptorCalls).toBeGreaterThan(0)
  expect(descriptorCalls).toBeLessThanOrEqual(100)
  expect(JSON.stringify(result)).toContain('[Truncated]')
})

test('does not call toJSON, coercion, iterator, constructor or function name accessors', () => {
  let calls = 0
  const unexpected = () => {
    calls++
    throw new Error('application hook')
  }
  const fn = Object.defineProperty(() => {}, 'name', { get: unexpected })
  const object = {
    toJSON: unexpected,
    toString: unexpected,
    [Symbol.toPrimitive]: unexpected,
    get constructor() {
      return unexpected()
    },
    fn,
    public: 'visible',
  }
  const array = [object]
  Object.defineProperty(array, Symbol.iterator, { get: unexpected })
  Object.defineProperty(array, 'map', { get: unexpected })
  const session = createValueCapture()

  const result = session.capture('params', array)
  const encoded = JSON.stringify(toOtlpValue(result))
  const map = new Map([['private', 'hidden']])
  Object.defineProperty(map, Symbol.iterator, { get: unexpected })
  const opaque = session.capture('map', map)

  expect(calls).toBe(0)
  expect(encoded).toContain('visible')
  expect(encoded).not.toContain('application hook')
  expect(opaque).toBe('[Map]')
})

test('strict capture encodes maps without calling patched iterators', () => {
  let calls = 0
  const unexpected = () => {
    calls++
    throw new Error('application hook')
  }
  const map = new Map([['private', 'hidden']])
  Object.defineProperty(map, Symbol.iterator, { get: unexpected })
  expect(strictValueCapture().capture('map', map)).toEqual({
    '@map': [['private', 'hidden']],
  })
  expect(calls).toBe(0)
})

test('owns nested object, array and byte snapshots before application mutation', () => {
  const bytes = new Uint8Array([1, 2, 3])
  const child = { value: 'before' }
  const array = ['before', bytes]
  const input = { child, array, bytes }
  const result = createValueCapture().capture('resource', input) as Record<
    string,
    OtlpAttrValue
  >

  child.value = 'after'
  array[0] = 'after'
  array.push('later')
  bytes[0] = 9
  input.child = { value: 'replaced' }

  expect(result).toEqual({
    child: { value: 'before' },
    array: ['before', new Uint8Array([1, 2, 3])],
    bytes: new Uint8Array([1, 2, 3]),
  })
  expect(Object.getPrototypeOf(result)).toBe(null)
  expect(Object.getPrototypeOf(result.child)).toBe(null)
  expect((result.array as OtlpAttrValue[])[1]).not.toBe(result.bytes)
  expect(toOtlpValue(result.bytes!)).toEqual({ bytesValue: 'AQID' })
})

test('copies shared references independently while marking only ancestor cycles', () => {
  const shared = { public: 'visible' }
  const input: Record<string, unknown> = { a: shared, b: shared }
  input.self = input
  const result = createValueCapture().capture('state', input) as Record<
    string,
    OtlpAttrValue
  >

  expect(result).toEqual({
    a: { public: 'visible' },
    b: { public: 'visible' },
    self: '[Circular]',
  })
  expect(result.a).not.toBe(result.b)
  expect(result.a).not.toBe(shared)
  const array: unknown[] = []
  array.push(array)
  expect(createValueCapture().capture('state', array)).toEqual(['[Circular]'])
})

test('preserves primitives and safely normalizes unsupported scalar values', () => {
  const session = createValueCapture()
  expect(session.capture('value', 'Привет 😀\n\t\u0000"\\')).toBe(
    'Привет 😀\n\t\u0000"\\',
  )
  expect(session.capture('value', [0, -12.5, true, false])).toEqual([
    0,
    -12.5,
    true,
    false,
  ])
  expect(
    session.capture('value', [null, undefined, Symbol('private'), () => {}]),
  ).toEqual(['[Null]', '[Undefined]', '[Symbol]', '[Function]'])
  expect(session.capture('value', [NaN, Infinity, -Infinity])).toEqual([
    'NaN',
    'Infinity',
    '-Infinity',
  ])
  expect(session.capture('value', 42n)).toBe(42n)
  expect(session.capture('value', new Date(0))).toBe('[Date]')
  expect(session.capture('value', new Set([1]))).toBe('[Set]')
})

test('strict capture formats dates and set entries', () => {
  const session = strictValueCapture()
  expect(session.capture('value', new Date(0))).toBe('1970-01-01T00:00:00.000Z')
  expect(session.capture('value', new Set([1]))).toEqual({ '@set': [1] })
})

test('preserves own __proto__ content and ignores inherited and non-enumerable values', () => {
  const input = JSON.parse('{"__proto__":{"public":"visible"}}')
  Object.defineProperty(input, 'hidden', { value: 'private' })
  const result = createValueCapture().capture('state', input)

  expect(Object.getPrototypeOf(result)).toBe(null)
  expect(result).toEqual(JSON.parse('{"__proto__":{"public":"visible"}}'))
  expect(
    createValueCapture().capture(
      'state',
      Object.assign(Object.create(null), { public: 'visible' }),
    ),
  ).toEqual({ public: 'visible' })
})

test('never inspects objects beyond depth five', () => {
  let traps = 0
  const deep = new Proxy(
    {},
    {
      getPrototypeOf() {
        traps++
        return Object.prototype
      },
      ownKeys() {
        traps++
        return []
      },
      getOwnPropertyDescriptor() {
        traps++
        return undefined
      },
    },
  )

  const result = createValueCapture().capture('state', {
    a: { b: { c: { d: { e: { deep } } } } },
  })

  expect(traps).toBe(0)
  expect(result).toEqual({
    a: { b: { c: { d: { e: '[Truncated]' } } } },
  })
})

test('shares the entry budget between params and payload and stops before getters or redaction', () => {
  let getters = 0
  let descriptors = 0
  let redactions = 0
  const input = new Proxy(
    Object.fromEntries(Array.from({ length: 1000 }, (_, i) => [`k${i}`, i])),
    {
      getOwnPropertyDescriptor(target, key) {
        descriptors++
        return Reflect.getOwnPropertyDescriptor(target, key)
      },
    },
  )
  const session = createValueCapture((_, value) => {
    redactions++
    return value
  })

  const params = session.capture('params', input)
  const readsAtBegin = descriptors
  const redactAtBegin = redactions
  const payload = session.capture('payload', {
    get secret() {
      getters++
      return 'private'
    },
  })

  expect(readsAtBegin).toBeGreaterThan(0)
  expect(descriptors).toBeLessThanOrEqual(100)
  expect(descriptors).toBe(readsAtBegin)
  expect(redactions).toBe(redactAtBegin)
  expect(getters).toBe(0)
  expect(payload).toBe('[Truncated]')
  expect(
    representationBytes('params', params) +
      representationBytes('payload', payload),
  ).toBeLessThanOrEqual(8192)
})

test.each(['a', 'Ж', '😀', '\u0000', '"\\\n', '\ud800'])(
  'bounds escaped UTF-8 strings across repeated captures: %j',
  (unit: string) => {
    const session = strictValueCapture()
    const outputs: OtlpAttrValue[] = []
    let total = 0
    let exhausted: unknown
    for (let i = 0; i < 1000; i++) {
      try {
        const result = session.capture('value', unit.repeat(20_000))
        outputs.push(result)
        total += representationBytes('value', result)
      } catch (error) {
        exhausted = error
        break
      }
    }

    expect(exhausted).toBeInstanceOf(RangeError)
    expect(total).toBeLessThanOrEqual(8192)
    // Escaping may consume the entire session in its very first root string.
    expect(outputs.length).toBeGreaterThan(0)
    expect(outputs.length).toBeLessThan(1000)
    expect(
      outputs.every(
        (value) => typeof value === 'string' && value.length <= 2048,
      ),
    ).toBe(true)
    expect(outputs[0]).toContain('[Truncated]')
  },
)

test('bounds wide escaped keys, containers, markers and byte base64 together', () => {
  let calls = 0
  const input = Object.fromEntries(
    Array.from({ length: 1000 }, (_, i) => [
      '\u0000'.repeat(120) + i,
      new Uint8Array(600),
    ]),
  )
  const session = strictValueCapture((_, value) => {
    calls++
    return value
  })
  const params = session.capture('params', input)
  const payload = session.capture('payload', 'done')

  expect(
    representationBytes('params', params) +
      representationBytes('payload', payload),
  ).toBeLessThanOrEqual(8192)
  expect(calls).toBeLessThan(20)
  expect(JSON.stringify(params)).toContain('[Truncated]')
})

test('payload cannot reset the byte budget consumed by params', () => {
  const session = strictValueCapture()
  const params = session.capture('params', Array(3).fill('a'.repeat(2000)))
  const payload = session.capture('payload', Array(3).fill('b'.repeat(2000)))

  expect(params).toEqual(Array(3).fill('a'.repeat(2000)))
  expect(JSON.stringify(payload)).toContain('bbbb')
  expect(JSON.stringify(payload)).toContain('[Truncated]')
  expect(
    representationBytes('params', params) +
      representationBytes('payload', payload),
  ).toBeLessThanOrEqual(8192)
})

test('lean payload cannot reset the approximate size budget consumed by params', () => {
  const session = createValueCapture()
  const params = session.capture('params', Array(3).fill('a'.repeat(2000)))
  const payload = session.capture('payload', Array(3).fill('b'.repeat(2000)))

  expect(params).toEqual(Array(3).fill('a'.repeat(2000)))
  expect(JSON.stringify(payload)).toContain('[Truncated]')
})

test('preserves boundary-length strings and never cuts a surrogate pair', () => {
  expect(createValueCapture().capture('payload', 'a'.repeat(2048))).toBe(
    'a'.repeat(2048),
  )
  const overlong = createValueCapture().capture(
    'payload',
    'a'.repeat(2049),
  ) as string
  expect(overlong).toMatch(/\[Truncated\]$/)
  expect(overlong.length).toBeLessThanOrEqual(2048)
  const result = createValueCapture().capture(
    'payload',
    '😀'.repeat(2048),
  ) as string

  expect(result.length).toBeLessThanOrEqual(2048)
  expect(result.endsWith('[Truncated]')).toBe(true)
  expect(result.slice(0, -'[Truncated]'.length)).toMatch(/^(😀)+$/u)
})

test('oversized keys and binary inputs do not require traversing their values', () => {
  let calls = 0
  const input = Object.defineProperty({}, 'k'.repeat(1_000_000), {
    enumerable: true,
    get() {
      calls++
      return 'private'
    },
  })
  const session = createValueCapture()
  const object = session.capture('params', input)
  const bytes = session.capture('bytes', new Uint8Array(100_000))

  expect(calls).toBe(0)
  expect(
    representationBytes('params', object) + representationBytes('bytes', bytes),
  ).toBeLessThanOrEqual(8192)
  expect(JSON.stringify(object)).toContain('[Truncated]')
  expect(bytes).toBe('[Truncated]')
  expect(() => session.capture('k'.repeat(1_000_000), {})).toThrow(RangeError)
})

test('redacts password, secret and token keys at any reachable depth by default', () => {
  const result = createValueCapture().capture('params', [
    {
      sku: 'public',
      password: 'hidden-password',
      nested: { secret: 'hidden-secret', public: 'ok' },
    },
  ])
  expect(result).toEqual([
    {
      sku: 'public',
      password: '[redacted]',
      nested: { secret: '[redacted]', public: 'ok' },
    },
  ])
  expect(
    createValueCapture().capture('payload', {
      ok: true,
      token: 'hidden-token',
    }),
  ).toEqual({ ok: true, token: '[redacted]' })
})

test('redacts root and child keys before normalization and owns transformed values', () => {
  const replacement = { public: 'transformed', secret: 'private' }
  const seen: string[] = []
  const session = createValueCapture((key, value) => {
    seen.push(key)
    if (key === 'payload') return replacement
    return key === 'secret' ? '[redacted]' : value
  })
  const params = session.capture('params', {
    public: 'visible',
    secret: 'private',
  })
  const payload = session.capture('payload', { original: 'discarded' })
  replacement.public = 'changed'

  expect(params).toEqual({ public: 'visible', secret: '[redacted]' })
  expect(payload).toEqual({ public: 'transformed', secret: '[redacted]' })
  expect(seen).toEqual([
    'params',
    'public',
    'secret',
    'payload',
    'public',
    'secret',
  ])
  expect(
    JSON.stringify([toOtlpValue(params), toOtlpValue(payload)]),
  ).not.toContain('private')
})

test('lean redaction expansion still obeys the string cap', () => {
  const session = createValueCapture((key, value) =>
    key === 'expand' ? '\u0000'.repeat(100_000) : value,
  )
  const result = session.capture('params', { expand: 1, public: 'visible' })
  const expanded = (result as { expand: string }).expand

  expect(typeof expanded).toBe('string')
  expect(expanded.length).toBeLessThanOrEqual(2048)
  expect(expanded).toMatch(/\[Truncated\]$/)
})

test('strict redaction expansion still obeys byte and string budgets', () => {
  const session = strictValueCapture((key, value) =>
    key === 'expand' ? '\u0000'.repeat(100_000) : value,
  )
  const result = session.capture('params', { expand: 1, public: 'visible' })

  expect(representationBytes('params', result)).toBeLessThanOrEqual(8192)
  expect(JSON.stringify(result)).toContain('[Truncated]')
})

test('redacts array entries with their index keys before copying replacements', () => {
  const replacement = new Uint8Array([1, 2, 3])
  const session = createValueCapture((key, value) => {
    if (key === '0') return '[redacted]'
    if (key === '1') return replacement
    return value
  })
  const result = session.capture('params', ['private', 'replace', 'public'])
  replacement[0] = 9

  expect(result).toEqual(['[redacted]', new Uint8Array([1, 2, 3]), 'public'])
})

test('redacts a root before probing the original object', () => {
  let traps = 0
  const input = new Proxy(
    {},
    {
      getPrototypeOf() {
        traps++
        throw new Error('original must not be inspected')
      },
      ownKeys() {
        traps++
        throw new Error('original must not be inspected')
      },
    },
  )

  const result = createValueCapture((key, value) =>
    key === 'payload' ? { public: 'replacement' } : value,
  ).capture('payload', input)

  expect(traps).toBe(0)
  expect(result).toEqual({ public: 'replacement' })
})

test('propagates root redaction failure before inspecting the input', () => {
  const failure = { reason: 'root redaction failed' }
  const session = createValueCapture(() => {
    throw failure
  })
  let caught: unknown
  try {
    session.capture('params', {})
  } catch (error) {
    caught = error
  }

  expect(caught).toBe(failure)
})

test('bounds accessor descriptor visits without invoking any accessor', () => {
  let getters = 0
  let descriptors = 0
  let redactions = 0
  const input: Record<string, unknown> = {}
  for (let i = 0; i < 10_000; i++)
    Object.defineProperty(input, `k${i}`, {
      enumerable: true,
      get() {
        getters++
        return 'private'
      },
    })
  const observed = new Proxy(input, {
    getOwnPropertyDescriptor(target, key) {
      descriptors++
      return Reflect.getOwnPropertyDescriptor(target, key)
    },
  })

  const result = createValueCapture((_, value) => {
    redactions++
    return value
  }).capture('params', observed)

  expect(descriptors).toBeGreaterThan(0)
  expect(descriptors).toBeLessThanOrEqual(100)
  expect(getters).toBe(0)
  expect(redactions).toBe(1)
  expect(JSON.stringify(result)).toContain('[Skipped]')
  expect(JSON.stringify(result)).toContain('[Truncated]')
})

test('bounds sparse arrays and skips their accessors and inherited values', () => {
  let getters = 0
  const input = new Array(1_000_000)
  Object.defineProperty(input, '0', {
    get() {
      getters++
      return 'private'
    },
  })

  const result = createValueCapture().capture(
    'params',
    input,
  ) as OtlpAttrValue[]

  expect(getters).toBe(0)
  expect(result.length).toBeLessThanOrEqual(100)
  expect(result[0]).toBe('[Skipped]')
  expect(result[1]).toBe('[Undefined]')
  expect(result.at(-1)).toBe('[Truncated]')
  const bogusLength = new Proxy([1, 2], {
    getOwnPropertyDescriptor(target, key) {
      return key === 'length'
        ? {
            value: 'not-a-length',
            writable: true,
            enumerable: false,
            configurable: false,
          }
        : Reflect.getOwnPropertyDescriptor(target, key)
    },
  })
  expect(createValueCapture().capture('params', bogusLength)).toBe('[Opaque]')
})

test.each(['plain', 'subclass'] as const)(
  'copies %s bytes without reading user length, constructor or hook properties',
  (kind: 'plain' | 'subclass') => {
    const input =
      kind === 'subclass'
        ? new (class extends Uint8Array {})([1, 2, 3])
        : new Uint8Array([1, 2, 3])
    let calls = 0
    const unexpected = () => {
      calls++
      throw new Error('user byte hook')
    }
    for (const key of [
      'length',
      'constructor',
      'slice',
      'toJSON',
      Symbol.iterator,
      Symbol.toStringTag,
    ]) {
      Object.defineProperty(input, key, { get: unexpected })
    }

    const result = createValueCapture().capture('bytes', input)
    input[0] = 9

    expect(calls).toBe(0)
    expect(result === input).toBe(false)
    expect(Object.getPrototypeOf(result)).toBe(Uint8Array.prototype)
    expect(toOtlpValue(result)).toEqual({ bytesValue: 'AQID' })
  },
)

test('fresh sessions and repeated captures never reuse mutable snapshots', () => {
  const input = { public: 'before' }
  const session = createValueCapture()
  const first = session.capture('params', input)
  const second = session.capture('payload', input)
  input.public = 'after'
  const fresh = createValueCapture().capture('params', input)

  expect(first).toEqual({ public: 'before' })
  expect(second).toEqual({ public: 'before' })
  expect(second).not.toBe(first)
  expect(fresh).toEqual({ public: 'after' })
})

test('propagates the exact redaction failure without returning partial data', () => {
  const failure = { reason: 'redact failed' }
  const session = createValueCapture((key, value) => {
    if (key === 'secret') throw failure
    return value
  })
  let result: unknown
  let caught: unknown
  try {
    result = session.capture('params', { public: 'visible', secret: 'private' })
  } catch (error) {
    caught = error
  }

  expect(caught).toBe(failure)
  expect(result).toBeUndefined()
})

test('traverses allowed Proxy descriptors without ordinary property reads', () => {
  let ownKeys = 0
  let descriptors = 0
  let reads = 0
  const input = new Proxy(
    { sentinel: 'exported' },
    {
      ownKeys(target) {
        ownKeys++
        return Reflect.ownKeys(target)
      },
      getOwnPropertyDescriptor(target, key) {
        descriptors++
        return Reflect.getOwnPropertyDescriptor(target, key)
      },
      get() {
        reads++
        throw new Error('ordinary read')
      },
    },
  )

  const result = createValueCapture().capture('payload', input)

  expect(result).toEqual({ sentinel: 'exported' })
  expect(ownKeys).toBeGreaterThan(0)
  expect(descriptors).toBeGreaterThan(0)
  expect(reads).toBe(0)
})

test.each(['getPrototypeOf', 'ownKeys', 'getOwnPropertyDescriptor'] as const)(
  'propagates exact Proxy %s failures',
  (trap: string) => {
    const failure = { reason: trap }
    const input = new Proxy(
      { public: 'visible' },
      {
        [trap]: () => {
          throw failure
        },
      },
    )
    let result: unknown
    let caught: unknown
    try {
      result = createValueCapture().capture('payload', input)
    } catch (error) {
      caught = error
    }

    expect(caught).toBe(failure)
    expect(result).toBeUndefined()
  },
)

test('captures Buffer as privately owned ordinary bytes', () => {
  const input = Buffer.from([1, 2, 3])
  const result = createValueCapture().capture('bytes', input)
  input.fill(9)

  expect(result === input).toBe(false)
  expect(Object.getPrototypeOf(result)).toBe(Uint8Array.prototype)
  expect(toOtlpValue(result)).toEqual({ bytesValue: 'AQID' })
})

test.each([
  ['Int8Array', new Int8Array([1, 2, 3])],
  ['Uint8ClampedArray', new Uint8ClampedArray([1, 2, 3])],
  ['Uint16Array', new Uint16Array([1, 2, 3])],
  ['DataView', new DataView(new ArrayBuffer(3))],
] as const)(
  'names %s when its user tag pretends to be Uint8Array',
  (kind: string, input: ArrayBufferView) => {
    let tagReads = 0
    Object.defineProperty(input, Symbol.toStringTag, {
      get() {
        tagReads++
        return 'Uint8Array'
      },
    })

    const result = createValueCapture().capture('bytes', input)

    expect(tagReads).toBe(0)
    expect(result).toBe(`[${kind}]`)
  },
)

test('oversized Uint8Array subclasses retain the existing byte bound', () => {
  class Bytes extends Uint8Array {}
  const input = new Bytes(100_000)

  const result = createValueCapture().capture('bytes', input)

  expect(result).toBe('[Truncated]')
  expect(representationBytes('bytes', result)).toBeLessThanOrEqual(8192)
})
