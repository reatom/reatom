import { AtomLike, AtomState, Ext, context, top, withMiddleware } from '../core'

export let withInit = <Target extends AtomLike>(
  init: AtomState<Target> | ((state: AtomState<Target>) => AtomState<Target>),
): Ext<Target> => {
  let key = {} // Symbol(`${target.name}.init`)

  return withMiddleware(
    () =>
      function withInit(next, ...params) {
        let meta = context().state.meta.init
        if (!meta.has(key)) {
          meta.set(key, null)
          let frame = top()
          frame.state =
            typeof init === 'function'
              ? (init as (state: Target) => Target)(frame.state)
              : init
        }

        return next(...params)
      },
  )
}
