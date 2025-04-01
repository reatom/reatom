import { Frame, root, STACK } from '../core/atom'
import { Fn, noop } from '../utils'
import { wrap } from './wrap'

// @ts-expect-error TODO
export let schedule: {
  <T>(
    fn: (...params: any[]) => T,
    queue?: 'hook' | 'compute' | 'cleanup' | 'effect',
    frame?: Frame,
  ): Promise<T>
  (
    fn: (...params: any[]) => any,
    queue: 'hook' | 'compute' | 'cleanup' | 'effect',
    frame: null,
  ): void
} = (
  fn: Fn,
  queue: 'hook' | 'compute' | 'cleanup' | 'effect' = 'effect',
  frame?: null | Frame,
): void | Promise<any> => {
  let cb = (res: Fn, rej: Fn) => {
    let rootFrame = root()
    // TODO
    // if (frame === undefined) frame = STACK[STACK.length - 1]!

    if (
      rootFrame.state.hook.length === 0 &&
      rootFrame.state.compute.length === 0 &&
      rootFrame.state.cleanup.length === 0 &&
      rootFrame.state.effect.length === 0
    ) {
      Promise.resolve().then(wrap(notify, rootFrame))
      //.catch(noop) // TODO ?
    }

    rootFrame.state.pushQueue(() => {
      try {
        let result = frame ? frame.run(fn) : fn()
        return result instanceof Promise ? result.then(res, rej) : res(result)
      } catch (e) {
        rej(e)
        throw e
      }
    }, queue)
  }

  return frame === null ? cb(noop, noop) : new Promise(cb)
}

export let notify = async (): Promise<void> => {
  let { state } = root()

  let queues = [
    state.hook[Symbol.iterator](),
    state.compute[Symbol.iterator](),
    state.cleanup[Symbol.iterator](),
    state.effect[Symbol.iterator](),
  ]

  let priority = 0
  while (priority < queues.length) {
    let next = queues[priority++]!.next()
    if (!next.done) {
      priority = 0 // need to recheck queues after use code
      next.value()
    }
  }

  state.hook = []
  state.compute = []
  state.cleanup = []
  state.effect = []
}
