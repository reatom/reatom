import { schedule } from '../methods'
import {
  Action,
  ActionState,
  AtomLike,
  AtomState,
  Middleware,
  ReatomError,
  top,
} from '../core'
import { assert, defineName, Fn, noop, Unsubscribe } from '../utils'

let addHook = <T extends AtomLike, F extends Fn>(
  middleware: (cb: F) => Middleware<T>,
  target: T,
  cb: F,
): Unsubscribe => {
  let hook = middleware(cb)(target)
  target.__reatom.middlewares.push(hook)
  return () => {
    let index = target.__reatom.middlewares.indexOf(hook)
    if (index !== -1) {
      target.__reatom.middlewares.splice(index, 1)
    }
  }
}

export let withChangeHook =
  <T extends AtomLike>(
    cb: (state: AtomState<T>, prevState?: AtomState<T>) => void,
  ) =>
  (_target: T) =>
    defineName((next: Fn, ...params: any[]) => {
      let frame = top()
      let prevState = frame.state
      let state = next(...params)

      if (!Object.is(prevState, state)) {
        frame = top()
        schedule(() => cb(state, prevState), 'hook', frame).catch(noop)
      }
      return state
    }, `${_target.name}.onChange`)

export let addChangeHook = <T extends AtomLike>(
  target: T,
  cb: (state: AtomState<T>, prevState?: AtomState<T>) => void,
): Unsubscribe => addHook(withChangeHook, target, cb)

export let withCallHook =
  <Params extends any[], Payload>(
    cb: (payload: Payload, params: Params) => void,
  ) =>
  (target: Action<Params, Payload>) => {
    assert(
      !target.__reatom.reactive,
      'withCallHook can be used only with actions',
      ReatomError,
    )

    return defineName(
      withChangeHook(
        (
          state: ActionState<Params, Payload>,
          prevState?: ActionState<Params, Payload>,
        ) => {
          for (let i = prevState?.length ?? 0; i < state.length; i++) {
            let { params, payload } = state[i]!
            cb(payload, params)
          }
        },
      )(target),
      `${target.name}.onCall`,
    )
  }

export let addCallHook = <Params extends any[], Payload>(
  target: Action<Params, Payload>,
  cb: (payload: Payload, params: Params) => void,
): Unsubscribe => addHook(withCallHook, target, cb)
