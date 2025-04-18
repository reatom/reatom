import { Frame, context, top } from '../core'
import { assert, identity } from '../utils'

export let findVar = <T>(
  cb: (frame: Frame) => undefined | T,
  frame = top(),
): undefined | T => {
  let result = cb(frame)
  if (result !== undefined) return result

  for (let i = 0; i < frame.pubs.length; i++) {
    let pub = frame.pubs[i]
    if (pub !== null && pub!.atom !== context) {
      let result = findVar(cb, pub)
      if (result !== undefined) return result
    }
  }

  return undefined
}

export interface Variable<Params extends any[] = any[], Payload = any> {
  get(frame?: Frame): Payload
  set(...params: Params): Payload
  has(frame?: Frame): boolean
  read<T = Payload>(
    cb?: (value: undefined | Payload) => undefined | T,
    frame?: Frame,
    meta?: WeakMap<Frame, WeakMap<WeakKey, any>>,
  ): undefined | T
}

/** Async Context Variable emulation
 * @link https://github.com/tc39/proposal-async-context?tab=readme-ov-file#asynccontextvariable
 */
export let variable: {
  <T>(): Variable<[T], T>

  <Params extends any[], Payload>(
    set: (...params: Params) => Payload,
  ): Variable<Params, Payload>
} = (set = identity) => {
  let key = {}

  let read: Variable['read'] = (
    cb = identity,
    frame = top(),
    meta = context().state.meta.variable,
  ) => {
    let value = findVar((frame) => cb(meta.get(frame)?.get(key)), frame)

    return value
  }

  return {
    read,
    get(frame?: Frame) {
      let value = read(identity, frame)

      assert(value !== undefined, 'Variable not found')

      return value
    },
    set(...params: [any, ...any[]]) {
      let frame = top()
      let value = set(...params)
      assert(value !== undefined, `Variable can't be undefined`)
      let meta = context().state.meta.variable
      let recs = meta.get(frame)
      if (!recs) meta.set(frame, (recs = new WeakMap()))
      recs.set(key, value)

      return value
    },
    has(frame?: Frame) {
      return read(identity, frame) !== undefined
    },
  }
}
