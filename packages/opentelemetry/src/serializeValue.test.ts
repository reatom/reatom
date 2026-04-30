import { action,atom } from '@reatom/core'
import { expect, test } from 'vitest'

import { serializeValue } from './serializeValue.ts'

test('passes through primitives', () => {
  expect(serializeValue('hi')).toBe('hi')
  expect(serializeValue(42)).toBe(42)
  expect(serializeValue(true)).toBe(true)
  expect(serializeValue(false)).toBe(false)
})

test('maps non-finite numbers to OTLP string form', () => {
  expect(serializeValue(NaN)).toBe('NaN')
  expect(serializeValue(Infinity)).toBe('Infinity')
  expect(serializeValue(-Infinity)).toBe('-Infinity')
})

test('maps nested non-finite numbers (guards against JSON.stringify null)', () => {
  expect(serializeValue({ x: NaN, y: Infinity })).toEqual({
    x: 'NaN',
    y: 'Infinity',
  })
})

test('converts null and undefined to marker strings', () => {
  expect(serializeValue(null)).toBe('null')
  expect(serializeValue(undefined)).toBe('undefined')
})

test('stringifies bigint', () => {
  expect(serializeValue(42n)).toBe('42')
  expect(serializeValue(9_999_999_999_999_999_999n)).toBe(
    '9999999999999999999',
  )
})

test('marks symbols', () => {
  expect(serializeValue(Symbol('foo'))).toBe('[Symbol foo]')
})

test('marks functions', () => {
  const fn = function namedFn() {}
  const result = serializeValue(fn) as string
  expect(result.startsWith('[Function')).toBe(true)
})

test('marks atoms by name', () => {
  const counter = atom(0, 'counter')
  expect(serializeValue(counter)).toBe('[Atom counter]')
})

test('marks actions by name', () => {
  const increment = action(() => {}, 'increment')
  expect(serializeValue(increment)).toBe('[Action increment]')
})

test('marks promises', () => {
  expect(serializeValue(Promise.resolve(1))).toBe('[Promise]')
})

test('marks errors with message', () => {
  expect(serializeValue(new Error('oops'))).toBe('[Error oops]')
})

test('error includes cause message when present', () => {
  const cause = new Error('root')
  const err = new Error('wrapper', { cause })
  expect(serializeValue(err)).toBe('[Error wrapper -> root]')
})

test('error walks multi-level cause chain', () => {
  const root = new Error('db down')
  const middle = new Error('repo failed', { cause: root })
  const top = new Error('request failed', { cause: middle })
  expect(serializeValue(top)).toBe(
    '[Error request failed -> repo failed -> db down]',
  )
})

test('error cause chain caps depth (3 levels) so a self-cycling cause cannot loop', () => {
  const a: Error & { cause?: unknown } = new Error('a')
  const b: Error & { cause?: unknown } = new Error('b')
  const c: Error & { cause?: unknown } = new Error('c')
  const d: Error & { cause?: unknown } = new Error('d')
  a.cause = b
  b.cause = c
  c.cause = d
  d.cause = a // cycle back to root
  const result = serializeValue(a) as string
  expect(result.startsWith('[Error a -> b -> c -> d')).toBe(true)
  expect(result).not.toContain('-> a -> b')
  expect(result.endsWith(']')).toBe(true)
})

test('error cause chain stops at first non-error link', () => {
  const cause = new Error('inner', { cause: 'plain string' })
  const err = new Error('outer', { cause })
  expect(serializeValue(err)).toBe('[Error outer -> inner]')
})

test('formats Date as ISO string', () => {
  const d = new Date('2024-01-02T03:04:05.000Z')
  expect(serializeValue(d)).toBe('2024-01-02T03:04:05.000Z')
})

test('marks invalid Date instead of throwing', () => {
  expect(serializeValue(new Date('not-a-date'))).toBe('[Invalid Date]')
})

test('formats RegExp as source', () => {
  expect(serializeValue(/foo.*bar/gi)).toBe('/foo.*bar/gi')
})

test('marks binary holders by byteLength', () => {
  const buf = new ArrayBuffer(32)
  expect(serializeValue(buf)).toBe('[ArrayBuffer 32]')
  const view = new Uint8Array(16)
  expect(serializeValue(view)).toBe('[Uint8Array 16]')
})

test('marks weak collections', () => {
  expect(serializeValue(new WeakMap())).toBe('[WeakMap]')
  expect(serializeValue(new WeakSet())).toBe('[WeakSet]')
})

test('serializes plain objects recursively', () => {
  expect(serializeValue({ a: 1, b: 'x' })).toEqual({ a: 1, b: 'x' })
})

test('serializes arrays recursively', () => {
  expect(serializeValue([1, 'x', true])).toEqual([1, 'x', true])
})

test('serializes Map as array of [key, value] pairs (keeps distinct keys)', () => {
  const m = new Map<unknown, unknown>([
    ['a', 1],
    [42, 'x'],
  ])
  expect(serializeValue(m)).toEqual([
    ['a', 1],
    [42, 'x'],
  ])
})

test('Map does not collapse numeric and string keys that stringify equally', () => {
  const m = new Map<unknown, unknown>([
    [1, 'num'],
    ['1', 'str'],
  ])
  expect(serializeValue(m)).toEqual([
    [1, 'num'],
    ['1', 'str'],
  ])
})

test('serializes Set as array', () => {
  expect(serializeValue(new Set([1, 2, 3]))).toEqual([1, 2, 3])
})

test('replaces nested structures beyond default maxDepth (2) with marker', () => {
  const deep = { a: { b: { c: { d: 1 } } } }
  expect(serializeValue(deep)).toEqual({ a: { b: '[Object]' } })
})

test('honors custom maxDepth', () => {
  const deep = { a: { b: { c: 1 } } }
  expect(serializeValue(deep, 1)).toEqual({ a: '[Object]' })
  expect(serializeValue(deep, 3)).toEqual({ a: { b: { c: 1 } } })
})

test('replaces cycles with [Circular]', () => {
  const a: Record<string, unknown> = { name: 'root' }
  a.self = a
  expect(serializeValue(a)).toEqual({ name: 'root', self: '[Circular]' })
})

test('handles cycles via array', () => {
  const arr: unknown[] = [1, 2]
  arr.push(arr)
  expect(serializeValue(arr)).toEqual([1, 2, '[Circular]'])
})

test('replaces throwing getter with [Unserializable] and preserves siblings', () => {
  const hostile: Record<string, unknown> = {
    a: 1,
    get boom() {
      throw new Error('nope')
    },
    c: 3,
  }
  expect(serializeValue(hostile)).toEqual({
    a: 1,
    boom: '[Unserializable]',
    c: 3,
  })
})

test('throwing iterator on a Set yields [Unserializable]', () => {
  const hostile = new Set([1])
  Object.defineProperty(hostile, Symbol.iterator, {
    value: function* () {
      yield 1
      throw new Error('nope')
    },
  })
  expect(serializeValue(hostile)).toBe('[Unserializable]')
})

test('throwing Proxy ownKeys trap yields [Unserializable]', () => {
  const hostile = new Proxy(
    {},
    {
      ownKeys() {
        throw new Error('nope')
      },
    },
  )
  expect(serializeValue(hostile)).toBe('[Unserializable]')
})

test('Error with hostile cause Proxy still renders the wrapper message', () => {
  const hostileCause = new Proxy(
    {},
    {
      has() {
        throw new Error('nope')
      },
    },
  )
  const err = new Error('wrapper', { cause: hostileCause })
  expect(serializeValue(err)).toBe('[Error wrapper]')
})

test('throwing Symbol.toPrimitive on a class instance yields [Unserializable]', () => {
  class Hostile {
    [Symbol.toPrimitive]() {
      throw new Error('nope')
    }
  }
  expect(serializeValue(new Hostile())).toBe('[Unserializable]')
})

test('hostile Symbol.toPrimitive inside an Array preserves siblings', () => {
  class Hostile {
    [Symbol.toPrimitive]() {
      throw new Error('nope')
    }
  }
  expect(serializeValue([1, new Hostile(), 3])).toEqual([
    1,
    '[Unserializable]',
    3,
  ])
})

test('empty Map serializes as empty array', () => {
  expect(serializeValue(new Map())).toEqual([])
})

test('Map beyond maxDepth collapses to [Map] marker', () => {
  const nested = { level: new Map([['a', 1]]) }
  expect(serializeValue(nested, 1)).toEqual({ level: '[Map]' })
})

test('Set beyond maxDepth collapses to [Set] marker', () => {
  const nested = { level: new Set([1, 2]) }
  expect(serializeValue(nested, 1)).toEqual({ level: '[Set]' })
})

test('Map values that cycle back to the Map are marked [Circular]', () => {
  const m = new Map<string, unknown>([['name', 'root']])
  m.set('self', m)
  expect(serializeValue(m)).toEqual([
    ['name', 'root'],
    ['self', '[Circular]'],
  ])
})

test('preserves __proto__ as own key (does not invoke prototype setter)', () => {
  const obj = JSON.parse('{"__proto__":{"a":1},"b":2}')
  const result = serializeValue(obj) as Record<string, unknown>
  expect(Object.prototype.hasOwnProperty.call(result, '__proto__')).toBe(true)
  expect(result['__proto__']).toEqual({ a: 1 })
  expect(result['b']).toBe(2)
})
