import { AtomLike, Ext, root, top, withMiddleware } from '../core'

export let withInit = <T>(init: T | ((state: T) => T)): Ext<AtomLike<T>> => {
  let key = {} // Symbol(`${target.name}.init`)

  return withMiddleware(
    () =>
      function initHook(next, ...params) {
        let context = root().state.context.init
        if (!context.has(key)) {
          context.set(key, null)
          let frame = top()
          frame.state =
            typeof init === 'function'
              ? (init as (state: T) => T)(frame.state)
              : init
        }

        return next(...params)
      },
  )
}
