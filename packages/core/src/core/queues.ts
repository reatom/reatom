import type { Fn } from '../utils'
import {
  getReatomGlobal,
  type ReatomGlobalPackage,
  ReatomError,
} from '../global'
import type { Queue } from './'
import { bind, context, REATOM_CORE_VERSION } from './'

interface ReatomQueuesGlobalState {
  batchNestDepth: number
}

declare global {
  interface ReatomGlobalPackages {
    '@reatom/core/core/queues': ReatomGlobalPackage<ReatomQueuesGlobalState>
  }
}

let reatomGlobal = getReatomGlobal()
let reatomQueuesPackage = reatomGlobal.packages['@reatom/core/core/queues']
if (reatomQueuesPackage === undefined) {
  reatomQueuesPackage = reatomGlobal.packages['@reatom/core/core/queues'] = {
    version: REATOM_CORE_VERSION,
    state: { batchNestDepth: 0 },
  }
} else if (reatomQueuesPackage.version !== REATOM_CORE_VERSION) {
  throw new ReatomError('package duplication')
}
let reatomQueuesGlobal = reatomQueuesPackage.state

export type QueueKind = 'hook' | 'compute' | 'cleanup' | 'effect'

/**
 * Schedules a function to be executed in a specific queue of the current
 * context.
 *
 * This is the core mechanism for scheduling reactive updates in Reatom. When an
 * atom's state changes, tasks are queued to be executed afterwards in the
 * appropriate order. If this is the first task being scheduled, a microtask is
 * created to process the queues asynchronously.
 *
 * @param fn - The function to schedule for execution
 * @param queue - The queue to add the function to ('hook', 'compute',
 *   'cleanup', or 'effect')
 */
export let _enqueue = (fn: Fn, queue: QueueKind): void => {
  let contextFrame = context()

  if (
    contextFrame.state.hook.length === 0 &&
    contextFrame.state.compute.length === 0 &&
    contextFrame.state.cleanup.length === 0 &&
    contextFrame.state.effect.length === 0
  ) {
    Promise.resolve().then(bind(notify, contextFrame))
    //.catch(noop) // TODO ?
  }

  contextFrame.state.pushQueue(fn, queue)
}

/**
 * Creates an iterator function for a queue that returns items sequentially.
 *
 * @param queue - The queue to iterate over
 * @param i - The starting index
 * @returns A function that returns the next item in the queue or undefined when
 *   empty
 */
let QueueIterator = (queue: Queue, i: number) => () =>
  i < queue.length ? queue[i++] : undefined

/**
 * Runs a callback as a nested batch and optionally flushes the queue after the
 * outermost batch completes.
 *
 * Use `shouldNotify: true` for user-facing write batches that must notify
 * synchronously after all nested writes finish. Leave it `false` when wrapping
 * reads such as computed values or effects.
 *
 * @example
 *   import { atom, batch } from '@reatom/core'
 *
 *   const count = atom(0, 'count')
 *
 *   batch(() => {
 *     count.set(1)
 *     count.set(2)
 *   }, true)
 *
 * @param cb - The callback to run inside the batch
 * @param shouldNotify - Whether to call `notify` after the outermost batch
 * @returns The callback result
 */
export let batch = <T>(cb: () => T, shouldNotify: boolean = false): T => {
  try {
    reatomQueuesGlobal.batchNestDepth++
    return cb()
  } finally {
    reatomQueuesGlobal.batchNestDepth--
    if (shouldNotify && reatomQueuesGlobal.batchNestDepth === 0) {
      notify()
    }
  }
}

/**
 * Processes all scheduled tasks in the current context's queues.
 *
 * This function is called automatically after tasks have been scheduled via
 * `enqueue`. It processes tasks in the following priority order:
 *
 * 1. Hook tasks
 * 2. Compute tasks
 * 3. Cleanup tasks
 * 4. Effect tasks
 *
 * The function resets priority after each task execution to ensure higher
 * priority tasks (which may have been added during execution) are processed
 * first.
 */
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

      try {
        next()
      } catch (error) {
        console.error('Unhandled error in Reatom queue!')
        console.log(error)
      }
    }
  }

  state.hook = []
  state.compute = []
  state.cleanup = []
  state.effect = []
}
