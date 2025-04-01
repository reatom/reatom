import { schedule } from '../methods'
import {
  Action,
  ActionState,
  AtomLike,
  AtomState,
  ReatomError,
  top,
} from '../core'
import { assert, defineName, Fn, noop } from '../utils'

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
