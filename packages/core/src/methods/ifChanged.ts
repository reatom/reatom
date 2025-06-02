import type { Action, ActionState, AtomLike, AtomState, Frame } from '../core'
import { ReatomError, run, top } from '../core'
import { assert } from '../utils'
import { _getPrevFrame } from './context'

/**
 * Executes a callback when an atom's state changes
 *
 * This utility evaluates if an atom's state has changed during the current
 * frame execution and calls the provided callback with the new state (and optionally
 * the previous state if available).
 *
 * @template T - Type extending AtomLike
 * @param {T} target - The atom to monitor for changes
 * @param {(newState: AtomState<T>, oldState?: AtomState<T>) => void} cb - Callback to execute when the atom changes
 * @throws {ReatomError} If target is not a reactive atom
 *
 * @example
 * ```ts
 * // Log when the user's name changes
 * ifChanged(userName, (newName, oldName) => {
 *   console.log(`Name changed from ${oldName} to ${newName}`);
 * });
 * ```
 */
export const ifChanged = <T extends AtomLike>(
  target: T,
  cb: (newState: AtomState<T>, oldState?: AtomState<T>) => void,
) => {
  if (!target.__reatom.reactive) {
    throw new ReatomError('atom expected')
  }

  let frame = top()
  let prevPubs = _getPrevFrame(frame)?.pubs ?? [null]
  let prevTargetFrame = prevPubs[frame.pubs.length]

  target()
  let targetFrame = frame.root.store.get(target)!

  if (targetFrame.atom !== prevTargetFrame?.atom) {
    cb(targetFrame.state)
  } else if (!Object.is(targetFrame.state, prevTargetFrame.state)) {
    cb(targetFrame.state, prevTargetFrame.state)
  }
}

/**
 * Executes a callback when an action is called
 *
 * This utility detects when an action is called during the current frame execution
 * and executes the provided callback with the action's payload and parameters.
 * Only works within a reactive (atom) context.
 *
 * @template Params - Array type of action parameters
 * @template Payload - Return type of the action
 * @param {Action<Params, Payload>} target - The action to monitor for calls
 * @param {(payload: Payload, params: Params) => void} cb - Callback function to execute when the action is called
 * @throws {ReatomError} If target is not an action or if not used in a reactive context
 *
 * @example
 * ```ts
 * // Log when a user is created
 * ifCalled(createUser, (user, params) => {
 *   console.log(`User created: ${user.name} with ID ${user.id}`);
 * });
 * ```
 */
export const ifCalled = <Params extends any[], Payload>(
  target: Action<Params, Payload>,
  cb: (payload: Payload, params: Params) => void,
) => {
  if (target.__reatom.reactive) {
    throw new ReatomError('action expected')
  }

  type ActionFrame = Frame<ActionState<Params, Payload>, Params, Payload>

  let frame = top()
  let prevPubs = _getPrevFrame(frame)?.pubs ?? [null]
  let prevTargetFrame = prevPubs[frame.pubs.length] as undefined | ActionFrame

  let targetFrame = frame.root.store.get(target) as undefined | ActionFrame

  assert(frame.atom.__reatom.reactive, 'invalid context', ReatomError)

  if (targetFrame === undefined) {
    targetFrame = {
      error: null,
      state: [],
      atom: target,
      pubs: [frame.root.frame],
      subs: [],
      run,
      root: frame.root,
    }
    frame.root.store.set(target, targetFrame)
  }
  frame.pubs.push(targetFrame)

  if (targetFrame.atom !== prevTargetFrame?.atom) {
    targetFrame.state.forEach(({ params, payload }) => cb(payload, params))
  } else if (!Object.is(targetFrame.state, prevTargetFrame.state)) {
    for (
      let i = prevTargetFrame.state.length;
      i < targetFrame.state.length;
      i++
    ) {
      const { params, payload } = targetFrame.state[i]!
      cb(payload, params)
    }
  }
}
