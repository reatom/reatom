import { AtomLike, root, top } from '../core'
import { Fn } from '../utils'

export let withInit = <T>(
  init: T | ((state: T) => T),
): ((target: AtomLike<T>) => {}) => {
  let key = {} // Symbol(`${target.name}.init`)

  return () =>
    (next: Fn, ...params: any[]) => {
      let context = root.context('init')
      if (!context.has(key)) {
        context.set(key, null)
        let frame = top()
        frame.state =
          typeof init === 'function'
            ? (init as (state: T) => T)(frame.state)
            : init
      }

      return next(...params)
    }
}
