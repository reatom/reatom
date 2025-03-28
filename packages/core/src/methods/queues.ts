import { root } from '../core/atom'
import { noop } from '../utils'
import { wrap } from './wrap'

export let schedule = async <T>(
  fn: (...params: any[]) => T,
  queue: 'compute' | 'cleanup' | 'effect' = 'effect',
): Promise<T> =>
  new Promise((res, rej) => {
    let rootFrame = root()
    rootFrame.state[queue].push(() => {
      try {
        res(fn())
      } catch (e) {
        rej(e)
      }
    })
    if (!rootFrame.state.scheduled) {
      Promise.resolve().then(wrap(notify, rootFrame))
      rootFrame.state.scheduled = true
    }
  })

let error = (e: any, name: string) =>
  console.log(`Reatom ${name} queue error:`, e)

export let notify = async (): Promise<void> => {
  let { state } = root()
  let { compute, cleanup, effect } = state

  // Without this we need to move the loop logic to separate function for calling it in a two places, it will increase call stack (ugly)
  if (effect.length === 0) effect.push(noop)

  while (compute.length || cleanup.length || effect.length) {
    for (const cb of effect) {
      for (const cb of compute) {
        try {
          cb()
        } catch (e) {
          error(e, 'compute')
        }
      }
      compute.length = 0
      for (const cb of cleanup) {
        try {
          cb()
        } catch (e) {
          error(e, 'cleanup')
        }
      }
      cleanup.length = 0
      try {
        cb()
      } catch (e) {
        error(e, 'effect')
      }
    }
    effect.length = 0
  }

  state.scheduled = false
}
