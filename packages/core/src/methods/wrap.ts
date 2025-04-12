import { assert, Fn } from '../utils'
import { top, root, STACK, ReatomError } from '../core'

export let wrap = <T extends Promise<any> | Fn>(
  target: T,
  frame = top(),
): T => {
  let rootFrame = root()

  if (typeof target === 'function') {
    return function wrap(...params: any) {
      assert(
        STACK.length === 0 || STACK[0] === rootFrame,
        'root collision',
        ReatomError,
      )

      STACK.push(rootFrame, frame)
      try {
        return target(...params)
      } finally {
        STACK.pop()
        STACK.pop()
      }
    } as T
  }

  assert(target instanceof Promise, 'target should be promise', ReatomError)

  return new Promise(async (resolve, reject) => {
    try {
      let value = await target
      var seal = () => resolve(value)
    } catch (error) {
      seal = () => reject(error)
    }
    Promise.resolve().then(() => {
      assert(
        STACK.length === 0 || STACK[0] === rootFrame,
        'root collision',
        ReatomError,
      )
      STACK.push(rootFrame, frame)
    })
    seal()
    Promise.resolve().then(() => {
      STACK.pop()
      STACK.pop()
    })
  }) as T
}
