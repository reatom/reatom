import { AtomLike, root, top } from '../core'
import { defineName, Fn } from '../utils'

export let withInit = <T>(
  init: T | ((state: T) => T),
): ((target: AtomLike<T>) => {}) => {
  let key = {} // Symbol(`${target.name}.init`)

  return (target) =>
    defineName((next: Fn, ...params: any[]) => {
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
    }, `${target.name}.init`)
}
