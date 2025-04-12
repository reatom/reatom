import type { AtomLike, AtomState, Ext } from '../core'

export let withComputed =
  <Target extends AtomLike>(
    computed: (state: AtomState<Target>) => AtomState<Target>,
  ): Ext<Target> =>
  (target) => {
    target.__reatom.middlewares.unshift((next, ...params) => {
      let state = next(params)
      return computed(state)
    })
    return target
  }
