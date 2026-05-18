import { isAbort, isAction, isAtom, isObject, isRec } from '@reatom/core'

import { nonFiniteString } from './nonFiniteString.ts'

/**
 * Converts any JS value to a JSON-safe form for span attribute use.
 *
 * Primitives pass through; non-JSON-safe types (bigint, symbol,
 * function, Promise, Error, Date, RegExp, Atom, Action, ArrayBuffer
 * views, Weak* collections) become human-readable marker strings
 * (`[Atom name]`, `[Error msg]`, etc.) so a flat JSON.stringify at
 * the outer `serialize` layer produces a stable attribute value.
 *
 * Nested structures (plain objects, arrays, Maps, Sets) recurse up
 * to `maxDepth` levels (default 2) — beyond that they collapse to
 * `[Object]` / `[Array]` / `[Map]` / `[Set]` markers to cap payload
 * size. Cycles are detected via an ancestor-stack WeakSet and
 * replaced with `[Circular]`.
 *
 * Resilient by OTel mandate: container traversal cannot escape
 * exceptions from hostile getters/proxies/iterators — a failed
 * branch yields `[Unserializable]` instead. Non-finite numbers
 * (NaN, ±Infinity) are stringified per protobuf-JSON, matching
 * `toOtlpDoubleValue`.
 */
export const serializeValue = (value: unknown, maxDepth = 2): unknown => {
  // Fast-path: primitives don't need cycle tracking. Avoids a WeakSet
  // allocation on the per-attribute hot path for string/number/bool
  // attributes, which dominate typical span payloads.
  if (
    value === null ||
    value === undefined ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return encode(value, maxDepth, 0, undefined)
  }
  // Safety net for exotic coercion paths (Proxy traps, hostile
  // Symbol.toPrimitive) that inner catches don't cover. OTel
  // mandate: the tracer MUST NOT throw.
  try {
    return encode(value, maxDepth, 0, new WeakSet())
  } catch {
    return '[Unserializable]'
  }
}

const encode = (
  value: unknown,
  maxDepth: number,
  depth: number,
  seen: WeakSet<object> | undefined,
): unknown => {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'

  if (typeof value === 'string') return value
  if (typeof value === 'number') return nonFiniteString(value) ?? value
  if (typeof value === 'boolean') return value
  if (typeof value === 'bigint') return String(value)
  if (typeof value === 'symbol') return `[Symbol ${value.description}]`

  // Atom/action checks before `typeof function` — reatom atoms and
  // actions are callable functions, so the order matters.
  if (isAction(value)) return `[Action ${(value as Function).name}]`
  if (isAtom(value)) return `[Atom ${(value as Function).name}]`

  if (typeof value === 'function') {
    return `[Function ${value.name || 'anonymous'}]`
  }

  if (value instanceof Promise) return '[Promise]'
  if (isAbort(value)) return `[AbortError ${value.message}]`
  if (value instanceof Error) {
    // The `in` check can trip a Proxy `has` trap; depth cap also breaks
    // any pathological cause cycle.
    let causeTail = ''
    let cur: unknown = value.cause
    try {
      for (let depth = 0; depth < 3; depth++) {
        if (!isObject(cur) || !('message' in cur)) break
        causeTail += ` -> ${String(cur.message)}`
        cur = (cur as { cause?: unknown }).cause
      }
    } catch {}
    return `[Error ${value.message}${causeTail}]`
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '[Invalid Date]' : value.toISOString()
  }
  if (value instanceof RegExp) return value.toString()
  if (value instanceof WeakMap) return '[WeakMap]'
  if (value instanceof WeakSet) return '[WeakSet]'
  if (value instanceof WeakRef) return '[WeakRef]'

  if (ArrayBuffer.isView(value)) {
    return `[${value.constructor.name} ${value.byteLength}]`
  }
  if (value instanceof ArrayBuffer) return `[ArrayBuffer ${value.byteLength}]`

  // From here on `value` is an object-ish container; seen is non-undefined.
  const tracker = seen!

  if (value instanceof Map) {
    if (depth >= maxDepth) return '[Map]'
    if (tracker.has(value)) return '[Circular]'
    tracker.add(value)
    try {
      // Array of [key, value] pairs — preserves distinct keys that
      // would collide under String(k) in a plain-object encoding.
      const out: unknown[] = []
      for (const [k, v] of value) {
        out.push([
          encode(k, maxDepth, depth + 1, tracker),
          encode(v, maxDepth, depth + 1, tracker),
        ])
      }
      return out
    } catch {
      return '[Unserializable]'
    } finally {
      tracker.delete(value)
    }
  }
  if (value instanceof Set) {
    if (depth >= maxDepth) return '[Set]'
    if (tracker.has(value)) return '[Circular]'
    tracker.add(value)
    try {
      const out: unknown[] = []
      for (const v of value) out.push(encode(v, maxDepth, depth + 1, tracker))
      return out
    } catch {
      return '[Unserializable]'
    } finally {
      tracker.delete(value)
    }
  }

  if (Array.isArray(value)) {
    if (depth >= maxDepth) return '[Array]'
    if (tracker.has(value)) return '[Circular]'
    tracker.add(value)
    try {
      return value.map((v) => encode(v, maxDepth, depth + 1, tracker))
    } catch {
      return '[Unserializable]'
    } finally {
      tracker.delete(value)
    }
  }

  if (isRec(value)) {
    if (depth >= maxDepth) return '[Object]'
    if (tracker.has(value)) return '[Circular]'
    tracker.add(value)
    try {
      // Null-prototype: a JSON.parse'd `{"__proto__":{...}}` would otherwise
      // hit Object.prototype's __proto__ setter and silently lose the value.
      const out = Object.create(null) as Record<string, unknown>
      // Object.keys can itself throw via a Proxy ownKeys trap; the
      // outer catch covers that. The per-property catch below keeps
      // siblings alive when an individual getter throws.
      for (const key of Object.keys(value)) {
        try {
          out[key] = encode(value[key], maxDepth, depth + 1, tracker)
        } catch {
          out[key] = '[Unserializable]'
        }
      }
      return out
    } catch {
      return '[Unserializable]'
    } finally {
      tracker.delete(value)
    }
  }

  // Final fallback for class instances that matched no branch above.
  // `String(value)` invokes Symbol.toPrimitive/toString, which user
  // code can make throw — guard so a hostile node inside Array/Set
  // doesn't collapse its parent to [Unserializable].
  try {
    return String(value)
  } catch {
    return '[Unserializable]'
  }
}
