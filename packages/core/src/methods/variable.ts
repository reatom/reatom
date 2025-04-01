// TODO https://github.com/tc39/proposal-async-context?tab=readme-ov-file#asynccontextvariable

import { Frame, top, WeakMap } from '../core'
import { variableContext } from '../core/context'
import { assert, identity } from '../utils'

export let find = <T>(
  cb: (frame: Frame) => undefined | T,
  frame = top(),
): undefined | T => {
  frame ??= top()
  let result = cb(frame)
  if (result !== undefined) return result

  for (let i = 0; i < frame.pubs.length; i++) {
    let pub = frame.pubs[i]
    if (pub) {
      let result = find(cb, pub)
      if (result !== undefined) return result
    }
  }
}

interface Variable<Params extends any[] = any[], Payload = any> {
  get(): Payload
  set(...params: Params): Payload
  has(): boolean
}

export let variable: {
  <T>(): Variable<[T], T>

  <Params extends any[], Payload>(
    set: (...params: Params) => Payload,
  ): Variable<Params, Payload>
} = (set = identity) => {
  let key = {}

  let get = () => {
    let frame = top()
    let context = variableContext()
    let value = find((frame) => context.get(frame)?.get(key), frame)

    return value
  }

  return {
    get() {
      let value = get()

      if (value === undefined) {
        debugger
      }

      assert(value !== undefined, 'Variable not found')

      return value
    },
    set(...params: [any, ...any[]]) {
      let frame = top()
      let value = set(...params)
      assert(value !== undefined, `Variable can't be undefined`)
      let context = variableContext()
      context
        .create(frame, () => {
          return new WeakMap()
        })
        .set(key, value)

      return value
    },
    has() {
      return get() !== undefined
    },
  }
}
