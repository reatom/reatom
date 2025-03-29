import { Frame, root } from '../core/atom'
import { wrap } from './wrap'

export let schedule = async <T>(
  fn: (...params: any[]) => T,
  queue: 'hook' | 'compute' | 'cleanup' | 'effect' = 'effect',
  frame?: Frame,
): Promise<T> =>
  new Promise((res, rej) => {
    let rootFrame = root()

    if (
      rootFrame.state.hook.length === 0 &&
      rootFrame.state.compute.length === 0 &&
      rootFrame.state.cleanup.length === 0 &&
      rootFrame.state.effect.length === 0
    ) {
      Promise.resolve().then(wrap(notify, rootFrame))
    }

    rootFrame.state[queue].push(() => {
      try {
        res(frame ? frame.run(fn) : fn())
      } catch (e) {
        rej(e)
      }
    })
  })

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
      priority = 0 // need to recheck queues after the cb
      next.value()
    }
  }

  state.hook = []
  state.compute = []
  state.cleanup = []
  state.effect = []
}
