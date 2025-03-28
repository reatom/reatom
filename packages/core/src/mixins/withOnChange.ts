import {
  Action,
  AtomLike,
  AtomState,
  isAction,
  ReatomError,
  top,
} from '../core'
import { assert, Fn } from '../utils'

export let withOnChange =
  <T extends AtomLike>(
    cb: (state: AtomState<T>, prevState?: AtomState<T>) => void,
  ) =>
  (_target: T) =>
  (next: Fn, ...params: any[]) => {
    let prevState = top().state
    let state = next(...params)
    if (!Object.is(prevState, state)) {
      cb(state, prevState)
    }
    return state
  }

export let withOnCall =
  <Params extends any[], Payload>(
    cb: (payload: Payload, params: Params) => void,
  ) =>
  (target: Action<Params, Payload>) => {
    assert(
      isAction(target),
      'withOnCall can be used only with actions',
      ReatomError,
    )

    return withOnChange(
      (state: Array<{ params: Params; payload: Payload }>) => {
        if (state.length) {
          let { params, payload } = state[state.length - 1]!
          cb(payload, params)
        }
      },
    )(target)
  }
