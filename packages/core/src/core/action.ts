import {
  _copy,
  AtomLike,
  isAtom,
  named,
  ReatomError,
  RootFrame,
  STACK,
  schedule,
  createAtom,
  AtomMeta,
} from './'
import { Fn } from '../utils'

/** Autoclearable array of processed events */
export interface ActionState<Params extends any[] = any[], Payload = any>
  extends Array<{ params: Params; payload: Payload }> {}

/** Logic container with atom features */
export interface Action<Params extends any[] = any[], Payload = any>
  extends AtomLike<ActionState<Params, Payload>, Params, Payload> {}

export type GenericAction<T extends Fn> = T &
  Action<Parameters<T>, ReturnType<T>>

let actionMiddleware = (next: Fn, ...params: any[]) => {
  let rootFrame = STACK[0] as RootFrame
  let frame = STACK[STACK.length - 1]!

  frame = _copy(rootFrame, frame, true)
  frame.pubs[0] = STACK[STACK.length - 2]!

  schedule(() => (frame.state = []), 'cleanup', null)

  return (frame.state = [...frame.state, { params, payload: next(...params) }])
}

export let isAction = (target: unknown): target is Action =>
  isAtom(target) && !target.__reatom.reactive

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
  if (typeof cb !== 'function') {
    throw new ReatomError('function expected')
  }

  let target = createAtom({ initState: [], computed: cb }, name) as Action

  Object.assign(target.__reatom, {
    reactive: false,
    middlewares: [actionMiddleware],
  } satisfies Partial<AtomMeta>)

  return target.extend(...globalThis.__REATOM) as Action<Params, Payload>
}
