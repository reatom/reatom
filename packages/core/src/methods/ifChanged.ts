import {
  Action,
  root,
  top,
  run,
  ReatomError,
  Frame,
  AtomLike,
  AtomState,
  assertAction,
  assertNotAction,
  ActionState,
} from '../core'
import { getPrevPubs } from '../core/context'
import { assert } from '../utils'

export const ifChanged = <T extends AtomLike>(
  target: T,
  cb: (newState: AtomState<T>, oldState?: AtomState<T>) => void,
) => {
  assertNotAction(target)

  let frame = top()
  let prevPubs = getPrevPubs(frame)
  let prevTargetFrame = prevPubs[frame.pubs.length]

  target()
  let targetFrame = root().state.store.get(target)!

  if (targetFrame.atom !== prevTargetFrame?.atom) {
    cb(targetFrame.state)
  } else if (!Object.is(targetFrame.state, prevTargetFrame.state)) {
    cb(targetFrame.state, prevTargetFrame.state)
  }
}

/** Allow to react to action calls, works only in reactive (atom) context */
export const ifCalled = <Params extends any[], Payload>(
  target: Action<Params, Payload>,
  cb: (payload: Payload, params: Params) => void,
) => {
  assertAction(target)

  type ActionFrame = Frame<ActionState<Params, Payload>, Params, Payload>

  let frame = top()
  let prevPubs = getPrevPubs(frame)
  let prevTargetFrame = prevPubs[frame.pubs.length] as undefined | ActionFrame

  let rootFrame = root()
  let targetFrame = rootFrame.state.store.get(target) as undefined | ActionFrame

  assert(frame.atom.__reatom.reactive, 'invalid context', ReatomError)

  if (targetFrame === undefined) {
    targetFrame = {
      error: null,
      state: [],
      atom: target,
      pubs: [rootFrame],
      subs: [],
      reactive: false,
      run,
    }
    rootFrame.state.store.set(target, targetFrame)
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
