import {
  AtomLike,
  isAtom,
  named,
  ReatomError,
  STACK,
  enqueue,
  createAtom,
  AtomMeta,
} from './'
import type { Fn } from '../utils'

/** Autoclearable array of processed events */
export interface ActionState<Params extends any[] = any[], Payload = any>
  extends Array<{ params: Params; payload: Payload }> {}

/** Logic container with atom features */
export interface Action<Params extends any[] = any[], Payload = any>
  extends AtomLike<ActionState<Params, Payload>, Params, Payload> {}

export type GenericAction<T extends Fn> = T &
  Action<Parameters<T>, ReturnType<T>>

let actionMiddleware = (next: Fn, ...params: any[]) => {
  let frame = STACK[STACK.length - 1]!

  frame.pubs = [STACK[STACK.length - 2]!]

  enqueue(() => (frame.state = []), 'cleanup')

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
