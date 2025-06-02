import type { AtomLike, AtomState, Ext } from '../core'
import { _enqueue, top, withMiddleware } from '../core'

export let withInit = <Target extends AtomLike>(
  init: AtomState<Target> | ((state: AtomState<Target>) => AtomState<Target>),
): Ext<Target> => {
  let key = {} // Symbol(`${target.name}.init`)

  return withMiddleware(
    () =>
      function withInit(next, ...params) {
        let frame = top()
        if (!frame.root.inits.has(key)) {
          frame.root.inits.set(key, null)
          frame.state =
            typeof init === 'function'
              ? (init as (state: Target) => Target)(frame.state)
              : init
        }

        return next(...params)
      },
  )
}

export let withInitHook = <Target extends AtomLike>(
  hook: (initState: AtomState<Target>) => any,
): Ext<Target> =>
  withInit((state) => {
    let frame = top()
    _enqueue(() => frame.run(hook, frame.state), 'hook')
    return state
  })
