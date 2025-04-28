import { Frame, action, context, named, top } from '../core'
import { assert, Fn, identity } from '../utils'

/** @internal */
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

// TODO rewrite to class for better mem usage
export interface Variable<Params extends any[] = any[], Payload = any> {
  get(frame?: Frame): Payload
  set(...params: Params): Payload
  has(frame?: Frame): boolean
  current(frame?: Frame): undefined | Payload
  read<T = Payload>(
    cb?: (value: undefined | Payload) => undefined | T,
    frame?: Frame,
    meta?: WeakMap<Frame, WeakMap<WeakKey, any>>,
  ): undefined | T
  run<T>(value: Payload, fn: () => T): T
}

/** Async Context Variable emulation
 * @link https://github.com/tc39/proposal-async-context?tab=readme-ov-file#asynccontextvariable
 */
export let variable: {
  <T>(name?: string): Variable<[T], T>

  <Params extends any[], Payload>(
    set: (...params: Params) => Payload,
    name?: string,
  ): Variable<Params, Payload>
} = (...options: [string?] | [Fn, string?]) => {
  if (typeof options[0] !== 'function') {
    // @ts-expect-error
    options.unshift(identity)
  }
  let [set, name = named('var')] = options as [Fn, string?]

  let key = {}

  let read: Variable['read'] = (
    cb = identity,
    frame = top(),
    meta = context().state.meta.variable,
  ) => {
    let value = findVar((frame) => cb(meta.get(frame)?.get(key)), frame)

    return value
  }

  let write = (value: any, frame = top()) => {
    let meta = context().state.meta.variable
    let recs = meta.get(frame)
    if (!recs) meta.set(frame, (recs = new WeakMap()))
    recs.set(key, value)
  }

  return {
    get(frame?: Frame) {
      let value = read(identity, frame)

      assert(value !== undefined, 'Variable not found')

      return value
    },
    set(...params: [any, ...any[]]) {
      let value = set(...params)

      write(value)

      return value
    },
    has(frame?: Frame) {
      return read(identity, frame) !== undefined
    },
    current(frame = top()) {
      return context().state.meta.variable.get(frame)?.get(key)
    },
    read,
    run(value: any, cb: Fn) {
      return action((value) => {
        write(value)

        return cb()
      }, name)(value)
    },
  }
}
