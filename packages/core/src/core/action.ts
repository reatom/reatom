import { _copy, atom, AtomLike, isAtom, named, RootFrame, STACK } from './atom'
import { Fn } from '../utils'
import { schedule } from '../methods/queues'

/** Autoclearable array of processed events */
export interface TemporalArray<T = any> extends Array<T> {}

/** Logic container with atom features */
export interface Action<Params extends any[] = any[], Payload = any>
  extends AtomLike<TemporalArray<{ params: Params; payload: Payload }>> {
  // TODO
  // (): never
  (...params: Params): Payload
}

let actionMiddleware = (next: Fn, ...params: any[]) => {
  let rootFrame = STACK[0] as RootFrame
  let frame = STACK[STACK.length - 1]!

  STACK[STACK.length - 1] = frame = _copy(rootFrame, frame)

  try {
    // FIXME what to do with error?
    return [...frame.state, { params, payload: next(...params) }]
  } finally {
    frame.pubs.length = 1
    schedule(() => (frame.state = []), 'cleanup')
  }
}

// @ts-expect-error
export let isAction: {
  <T extends Action>(target: T): target is T
  (target: any): target is Action
} = (target: any) =>
  isAtom(target) && target.__reatom.middlewares.includes(actionMiddleware)

// TODO support generics
export let action = <Params extends any[] = any[], Payload = any>(
  cb: (...params: Params) => Payload,
  name = named('action'),
): Action<Params, Payload> => {
  let target = atom([], name) as Action

  target.__reatom.middlewares.length = 0

  target.__reatom.middlewares.push(
    (_next, ...params: Params) => cb(...params),
    actionMiddleware,
  )

  return target as Action<Params, Payload>
}
