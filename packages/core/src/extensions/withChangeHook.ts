import type { Action, AtomLike, AtomState, Ext } from '../core'
import { _enqueue, ReatomError, top, withMiddleware } from '../core'
import type { OverloadParameters, Unsubscribe } from '../utils'

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

        // enqueue before next call for better predictable logs
        _enqueue(() => {
          if (!Object.is(prevState, state)) {
            frame.run(cb, state, prevState)
          }
        }, 'hook')

        // @ts-ignore
        let state = next(...params)
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

    return function withCallHook(next, ...params) {
      let frame = top()
      let prevState = frame.state

      // enqueue before next call for better predictable logs
      _enqueue(() => {
        if (!Object.is(prevState, state)) {
          for (let i = prevState?.length ?? 0; i < state.length; i++) {
            let { params, payload } = state[i]!
            frame.run(cb, payload, params as OverloadParameters<Target>)
          }
        }
      }, 'hook')

      // @ts-ignore
      let state = next(...params)

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
