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
 * @template Target - The target atom or action type to be extended with computed functionality.
 * @param {function} computed - A function that computes the new state based on the current state.
 * @param {boolean} [tail=true] - Determines the order of the passed computed calling. ATTENTION: use `false` only for computed with fixed size of dependencies
 * @returns {Ext<Target>} The extended atom or action with computed functionality.
 */
export let withComputed = <Target extends AtomLike>(
  computed: (state: AtomState<Target>) => AtomState<Target>,
  tail = true,
): Ext<Target> =>
  withMiddleware(
    () =>
      function withComputed(next, state) {
        if (tail) {
          state = next(state)
          state = computed(state)
        } else {
          let frame = top()
          const pubs = _getPrevFrame(frame)?.pubs
          state = computed(frame.state)

          if (
            !pubs ||
            (pubs.length > frame.pubs.length &&
              _isPubsChanged(frame, pubs, pubs.length + 1))
          ) {
            state = next(state)
          }
        }

        return state
      },
    false,
  )
