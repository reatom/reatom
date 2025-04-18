import { action, AtomLike, computed, top } from '../core'
import { Fn, identity, isAbort, noop } from '../utils'
import { abortVar } from './abort'
import { ifCalled } from './ifChanged'

export let take = <T>(
  target: AtomLike<any, any, T>,
  name?: string,
): Promise<Awaited<T>> => {
  name &&= `${top().atom.name}.${name}`

  let cleanups: Array<Fn> = []

  // debug log
  if (name) action(noop, name)()

  let abort = abortVar.read()
  if (!abort) {
    debugger
  }
  abort ??= abortVar.set(name || `${top().atom.name}.take`)

  let promise = new Promise<Awaited<T>>((res, rej) => {
    cleanups.push(
      abort.subscribeAbort(rej),
      computed(async () => {
        try {
          let value: any

          if (target.__reatom.reactive) {
            value = target()
          } else {
            let taken = false
            ifCalled(target, (payload) => {
              // get the first call, not the last
              if (!taken) {
                taken = true
                value = payload
              }
            })
          }

          // skip the first sync call
          if (!cleanups.length) return

          if (value instanceof Promise) value = await value

          res(value)
        } catch (error) {
          // skip the first sync call
          if (!cleanups.length) return

          if (isAbort(error)) return
          rej(error)
        }
      }).subscribe(),
    )
  })

  promise
    .then((value) => {
      cleanups.forEach((fn) => fn())
      // debug log
      if (name) action(identity, `${name}.resolve`)(value)
    })
    .catch((error) => {
      cleanups.forEach((fn) => fn())
      // debug log
      if (name) action(identity, `${name}.resolve`)(error)
    })

  return promise
}
