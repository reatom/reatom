import { AtomLike, top } from '../core'
import { initContext } from '../core/context'
import { defineName, Fn } from '../utils'

export let withInit = <T>(
  init: T | ((state: T) => T),
): ((target: AtomLike<T>) => {}) => {
  let key = {} // Symbol(`${target.name}.init`)

  return (target) =>
    defineName((next: Fn, ...params: any[]) => {
      let context = initContext()
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
