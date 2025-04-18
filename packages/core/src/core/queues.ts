import { Queue, context } from './'
import type { Fn } from '../utils'

/** @internal */
export let enqueue = (
  fn: Fn,
  queue: 'hook' | 'compute' | 'cleanup' | 'effect',
): void => {
  let contextFrame = context()

  if (
    contextFrame.state.hook.length === 0 &&
    contextFrame.state.compute.length === 0 &&
    contextFrame.state.cleanup.length === 0 &&
    contextFrame.state.effect.length === 0
  ) {
    Promise.resolve().then(contextFrame.run.bind(contextFrame, notify))
    //.catch(noop) // TODO ?
  }

  contextFrame.state.pushQueue(() => {
    try {
      fn()
    } catch (error) {
      console.error('Unhandled error in Reatom queue!')
      console.log(error)
    }
  }, queue)
}

let QueueIterator = (queue: Queue, i: number) => () =>
  i < queue.length ? queue[i++] : undefined

// TODO reschedule notify if the amount of tasks is changed??
export let notify = () => {
  let { state } = context()

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
