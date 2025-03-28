import {
  Action,
  root,
  top,
  run,
  isAction,
  ReatomError,
  Frame,
  AtomLike,
  AtomState,
} from '../core'
import { assert } from '../utils'

let getHistory = (targetFrame: Frame) => {
  let history = root.context('ifChanged').get(targetFrame.atom, () => ({
    // We should handle multiple `ifChanged` calls for the same target
    prev: [] as Array<Frame>,
    next: [] as Array<Frame>,
    frame: targetFrame,
  }))

  if (history.frame !== targetFrame) {
    history.prev = history.next
    history.next = []
    history.frame = targetFrame
  }

  return history
}

export const ifChanged = <T extends AtomLike>(
  target: T,
  cb: (newState: AtomState<T>, oldState?: AtomState<T>) => void,
) => {
  target()
  let targetFrame = root().state.store.get(target)!

  let history = getHistory(targetFrame)

  let idx = history.next.push(targetFrame) - 1
  if (
    history.prev[idx]?.atom !== target ||
    !Object.is(history.prev[idx]!.state, targetFrame.state)
  ) {
    cb(targetFrame.state, history.prev[idx]?.state)
  }
}

/** Allow to react to action calls, works only in reactive (atom) context */
export const ifCalled = <Params extends any[], Payload>(
  target: Action<Params, Payload>,
  cb: (payload: Payload, params: Params) => void,
) => {
  type Calls = Array<{
    params: Params
    payload: Payload
  }>

  let rootFrame = root()
  let topFrame = top()
  let targetFrame = root().state.store.get(target)

  assert(
    rootFrame !== topFrame && !isAction(topFrame.atom),
    'invalid context',
    ReatomError,
  )

  if (targetFrame === undefined) {
    targetFrame = {
      error: null,
      state: [],
      atom: target,
      pubs: [rootFrame],
      subs: [],
      run,
    }
    rootFrame.state.store.set(target, targetFrame)
  }
  topFrame.pubs.push(targetFrame)

  let history = getHistory(targetFrame)

  let idx = history.next.push(targetFrame) - 1
  if (
    // FIXME cleanup
    targetFrame.state.length &&
    (history.prev[idx]?.atom !== target ||
      !Object.is(history.prev[idx]!.state, targetFrame.state))
  ) {
    let oldState = (history.prev[idx]?.state ?? []) as Calls
    let state = targetFrame.state as Calls
    let { params, payload } = oldState.length
      ? state[oldState.length - 1]!
      : state[0]!

    cb(payload, params)
  }
}
