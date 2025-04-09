import { Frame, root, top } from '../core'
import { assert, identity } from '../utils'

export let findVar = <T>(
  cb: (frame: Frame) => undefined | T,
  frame = top(),
  // @ts-expect-error
): undefined | T => {
  let result = cb(frame)
  if (result !== undefined) return result

  for (let i = 0; i < frame.pubs.length; i++) {
    let pub = frame.pubs[i]
    if (pub) {
      let result = findVar(cb, pub)
      if (result !== undefined) return result
    }
  }
}

export interface Variable<Params extends any[] = any[], Payload = any> {
  get(frame?: Frame): Payload
  set(...params: Params): Payload
  has(frame?: Frame): boolean
  read(frame?: Frame): undefined | Payload
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

  let read = (frame = top()) => {
    let context = root().state.context.variable
    let value = findVar((frame) => context.get(frame)?.get(key), frame)

    return value
  }

  return {
    read,
    get(frame?: Frame) {
      let value = read(frame)

      assert(value !== undefined, 'Variable not found')

      return value
    },
    set(...params: [any, ...any[]]) {
      let frame = top()
      let value = set(...params)
      assert(value !== undefined, `Variable can't be undefined`)
      let context = root().state.context.variable
      let recs = context.get(frame)
      if (!recs) context.set(frame, (recs = new WeakMap()))
      recs.set(key, value)

      return value
    },
    has(frame?: Frame) {
      return read(frame) !== undefined
    },
  }
}
