import {
  __reatom,
  _copy,
  atom,
  AtomLike,
  isAtom,
  named,
  ReatomError,
  RootFrame,
  STACK,
} from './atom'
import { assert, Fn } from '../utils'
import { schedule } from '../methods/queues'

/** Autoclearable array of processed events */
export interface TemporalArray<T = any> extends Array<T> {}

export interface ActionState<Params extends any[] = any[], Payload = any>
  extends TemporalArray<{ params: Params; payload: Payload }> {}

/** Logic container with atom features */
export interface Action<Params extends any[] = any[], Payload = any>
  extends AtomLike<ActionState<Params, Payload>, Params, Payload> {}

export type GenericAction<T extends Fn> = T &
  AtomLike<
    ActionState<Parameters<T>, ReturnType<T>>,
    Parameters<T>,
    ReturnType<T>
  >

let actionMiddleware = (next: Fn, ...params: any[]) => {
  let rootFrame = STACK[0] as RootFrame
  let frame = STACK[STACK.length - 1]!

  frame = _copy(rootFrame, frame, true)

  try {
    frame.pubs[0] = STACK[STACK.length - 2]!
    return (frame.state = [
      ...frame.state,
      { params, payload: next(...params) },
    ])
  } finally {
    schedule(() => (frame.state = []), 'cleanup', null)
  }
}

export let isAction = (target: unknown): target is Action =>
  isAtom(target) && !target.__reatom.reactive

export function assertAction(target: any): asserts target is Action {
  assert(isAction(target), 'expected action', ReatomError)
}

export function assertNotAction(target: any): asserts target is AtomLike {
  assert(target?.__reatom?.reactive === true, 'expected atom', ReatomError)
}

export let action: {
  <Params extends any[] = any[], Payload = any>(
    cb: (...params: Params) => Payload,
    name?: string,
  ): Action<Params, Payload>
  <T extends Fn>(cb: T, name?: string): GenericAction<T>
} = <Params extends any[] = any[], Payload = any>(
  cb: (...params: Params) => Payload,
  name = named('action'),
): Action<Params, Payload> => {
  let target = atom([], name) as any as Action

  target.__reatom.reactive = false

  target.__reatom.middlewares = [
    (_next, ...params: Params) => cb(...params),
    actionMiddleware,
  ]

  return target.mix(...globalThis.__REATOM) as Action<Params, Payload>
}
