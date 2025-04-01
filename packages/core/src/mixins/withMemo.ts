import type { AtomLike, AtomState } from '../core'
import { ReatomError, top } from '../core'
import { assert, isShallowEqual } from '../utils'

export let withMemo =
  <T extends AtomLike>(
    isEqual: (
      prevState: AtomState<T>,
      nextState: AtomState<T>,
    ) => boolean = isShallowEqual,
  ): ((target: T) => {}) =>
  (target) => {
    assert(
      target?.__reatom?.reactive === true,
      'withMemo can be used only with atoms',
      ReatomError,
    )

    target.__reatom.middlewares.push(function memoMiddleware(next, ...params) {
      let prevState = top().state
      let nextState = next(...params)
      return isEqual(prevState, nextState) ? prevState : nextState
    })
    return {}
  }
