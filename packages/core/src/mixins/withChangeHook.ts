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
      function withChangeHook(next, ...params) {
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
  let { middlewares } = target.extend(withChangeHook(cb)).__reatom

  let hook = middlewares[middlewares.length - 1]!
  return () => {
    let index = middlewares.indexOf(hook)
    if (index !== -1) {
      middlewares.splice(index, 1)
    }
  }
}

export let withCallHook = <Target extends Action>(
  cb: (payload: ReturnType<Target>, params: OverloadParameters<Target>) => void,
): Ext<Target> => {
  if (typeof cb !== 'function') {
    throw new ReatomError('function expected')
  }

  return withMiddleware<Target>((target) => {
    if (target.__reatom.reactive) {
      throw new ReatomError('withCallHook can be used only with actions')
    }

    return function withChangeHook(next, ...params) {
      let frame = top()
      let prevState = frame.state
      let state = next(...params)

      if (!Object.is(prevState, state)) {
        for (let i = prevState?.length ?? 0; i < state.length; i++) {
          let { params, payload } = state[i]!
          enqueue(
            frame.run.bind(
              frame,
              cb,
              payload,
              params as OverloadParameters<Target>,
            ),
            'hook',
          )
        }
      }
      return state
    }
  })
}

export let addCallHook = <Target extends Action>(
  target: Target,
  cb: (payload: ReturnType<Target>, params: OverloadParameters<Target>) => void,
): Unsubscribe => {
  let { middlewares } = target.extend(withCallHook(cb)).__reatom

  let hook = middlewares[middlewares.length - 1]!
  return () => {
    let index = middlewares.indexOf(hook)
    if (index !== -1) {
      middlewares.splice(index, 1)
    }
  }
}
