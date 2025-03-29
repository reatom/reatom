import type { AtomLike, AtomState } from '../core'
import { top } from '../core'

export let withComputed =
  <T extends AtomLike>(
    computed: (state: AtomState<T>) => AtomState<T>,
  ): ((target: T) => {}) =>
  (target) => {
    target.__reatom.middlewares.unshift(function withComputedHandler(next, state) {
      return next(computed(state))
    })
    return {}
  }