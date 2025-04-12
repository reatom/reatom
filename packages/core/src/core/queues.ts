import { Frame, Queue, root } from './'
import { Fn, noop } from '../utils'
import { wrap } from '../methods'

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
  ): undefined
} = (
  fn: Fn,
  queue: 'hook' | 'compute' | 'cleanup' | 'effect' = 'effect',
  frame?: null | Frame,
): undefined | Promise<any> => {
  let res = noop
  let rej = noop
  let promise: undefined | Promise<any>

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

      result instanceof Promise
        ? result.then(res, rej) // reduce the amount of microtasks
        : res(result)
    } catch (e) {
      if (promise) {
        rej(e)
      } else {
        console.error('Unhandled error in Reatom queue!')
        console.log(e)
      }
    }
  }, queue)

  if (frame !== null) {
    promise = new Promise((...a) => ([res, rej] = a))
  }

  return promise
}

let QueueIterator = (queue: Queue, i: number) => () =>
  i < queue.length ? queue[i++] : undefined

// FIXME reschedule notify if the amount of tasks is changed??
export let notify = async (): Promise<void> => {
  let { state } = root()

  let queues = [
    QueueIterator(state.hook, 0),
    QueueIterator(state.compute, 0),
    QueueIterator(state.cleanup, 0),
    QueueIterator(state.effect, 0),
  ]

  let priority = 0
  while (priority < queues.length) {
    let next = queues[priority++]!()
    if (next !== undefined) {
      priority = 0 // need to recheck queues after user code
      next()
    }
  }

  state.hook = []
  state.compute = []
  state.cleanup = []
  state.effect = []
}
