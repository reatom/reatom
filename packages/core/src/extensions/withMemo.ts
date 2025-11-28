import type { AtomLike, AtomState, Ext } from '../core'
import { ReatomError, top, withMiddleware } from '../core'
import { assert, isShallowEqual } from '../utils'

export let withMemo =
  <Target extends AtomLike>(
    isEqual: (
      prevState: AtomState<Target>,
      nextState: AtomState<Target>,
    ) => boolean = isShallowEqual,
  ): Ext<Target> =>
  (target) => {
    assert(
      target?.__reatom?.reactive === true,
      'withMemo can be used only with atoms',
      ReatomError,
    )
    return target.extend(
      withMiddleware(
        () =>
          function withMemo(next, ...params) {
            let prevState = top().state
            let nextState = next(...params)
            return isEqual(prevState, nextState) ? prevState : nextState
          },
      ),
    )
  }
