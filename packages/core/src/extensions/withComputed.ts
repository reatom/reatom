import {
  _isPubsChanged,
  type AtomLike,
  type AtomState,
  type Ext,
  top,
  withMiddleware,
} from '../core'
import { _getPrevFrame } from '../methods/context'

/**
 * A middleware extension that enhances an atom with computed capabilities.
 *
 * @template Target - The target atom or action type to be extended with
 *   computed functionality.
 * @param {function} computed - A function that computes the new state based on
 *   the current state.
 * @param {Object} [options={}] - Configuration options. Default is `{}`
 * @param {boolean} [options.tail=true] - Determines the order of the passed
 *   computed calling. ATTENTION: use `false` only for computed with fixed size
 *   of dependencies. Default is `true`
 * @returns {Ext<Target>} The extended atom or action with computed
 *   functionality.
 */
export let withComputed = <Target extends AtomLike>(
  computed: (state: AtomState<Target>) => AtomState<Target>,
  { tail = true }: { tail?: boolean } = {},
): Ext<Target> =>
  withMiddleware(
    () =>
      function withComputed(next, state) {
        if (tail) {
          state = next(state)
          state = computed(state)
        } else {
          let frame = top()
          const prevPubs = _getPrevFrame(frame)?.pubs
          const isInit = !prevPubs

          state = computed(frame.state)

          // TODO "recompute after set with zero deps"?
          const hasMoreDeps = !isInit && prevPubs.length > frame.pubs.length
          const isDepsChanged =
            hasMoreDeps && _isPubsChanged(frame, prevPubs, frame.pubs.length)

          if (isInit || isDepsChanged) {
            state = next(state)
          }
        }

        return state
      },
    'computed',
  )
