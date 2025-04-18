import { assert, Fn, isAbort, noop } from '../utils'
import { top, context, STACK, ReatomError } from '../core'
import { abortVar } from './abort'

export let wrap = <T extends Promise<any> | Fn>(
  target: T,
  frame = top(),
): T => {
  if (typeof target === 'function') {
    return function wrap(...params: any) {
      return frame.run(target, ...params)
    } as T
  }

  let contextFrame = context()

  assert(target instanceof Promise, 'target should be promise', ReatomError)

  let promise = new Promise(async (resolve, reject) => {
    try {
      let value = await target

      frame.run(() => abortVar.read()?.throwIfAborted())

      var seal = () => resolve(value)
    } catch (error) {
      // prevent unhandled error for abort
      if (isAbort(error)) promise.catch(noop)
      seal = () => reject(error)
    }
    queueMicrotask(() => {
      // check context collision
      frame.run(noop)

      STACK.push(contextFrame, frame)
    })
    seal()
    queueMicrotask(() => {
      STACK.pop()
      STACK.pop()
    })
  })

  return promise as T
}
