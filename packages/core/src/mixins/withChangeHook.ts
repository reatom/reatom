import {
  Action,
  AtomLike,
  AtomState,
  ReatomError,
  Ext,
  enqueue,
  top,
  withMiddleware,
} from '../core'
import { OverloadParameters, Unsubscribe } from '../utils'

export let withChangeHook = <Target extends AtomLike>(
  cb: (
    state: AtomState<Target>,
    prevState: undefined | AtomState<Target>,
  ) => void,
): Ext<Target> => {
  if (typeof cb !== 'function') {
    throw new ReatomError('function expected')
  }

  return withMiddleware<Target>(
    () =>
      function changeHook(next, ...params) {
        let frame = top()
        let prevState = frame.state
        let state = next(...params)

        if (!Object.is(prevState, state)) {
          enqueue(frame.run.bind(frame, cb, state, prevState), 'hook')
        }
        return state
      },
  )
}

export let addChangeHook = <T extends AtomLike>(
  target: T,
  cb: (state: AtomState<T>, prevState?: AtomState<T>) => void,
): Unsubscribe => {
  let active = true

  target.extend(
    withChangeHook((state, prevState) => {
      if (active) {
        cb(state, prevState)
      }
    }),
  )

  return () => {
    active = false
  }
}

export let withCallHook = <Target extends Action>(
  cb: (payload: ReturnType<Target>, params: OverloadParameters<Target>) => void,
): Ext<Target> => {
  if (typeof cb !== 'function') {
    throw new ReatomError('function expected')
  }

  return (target) => {
    if (target.__reatom.reactive) {
      throw new ReatomError('withCallHook can be used only with actions')
    }

    return target.extend(
      withChangeHook(function callHook(state, prevState) {
        for (let i = prevState?.length ?? 0; i < state.length; i++) {
          let { params, payload } = state[i]!
          cb(payload, params as OverloadParameters<Target>)
        }
      }),
    )
  }
}

export let addCallHook = <Target extends Action>(
  target: Target,
  cb: (payload: ReturnType<Target>, params: OverloadParameters<Target>) => void,
): Unsubscribe => {
  let active = true

  target.extend(
    withCallHook((payload, params) => {
      if (active) {
        cb(payload, params)
      }
    }),
  )

  return () => {
    active = false
  }
}
