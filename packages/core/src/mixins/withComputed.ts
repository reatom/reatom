import {
  withMiddleware,
  type AtomLike,
  type AtomState,
  type Ext,
} from '../core'

export let withComputed = <Target extends AtomLike>(
  computed: (state: AtomState<Target>) => AtomState<Target>,
): Ext<Target> =>
  withMiddleware(
    () =>
      function withComputed(next, ...params) {
        let state = next(...params)
        return computed(state)
      },
    false,
  )
