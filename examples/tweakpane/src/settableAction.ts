import { action, atom } from '@reatom/core'

type Params<T extends (...args: any[]) => void> = {
  init?: T | null
  runOnce?: boolean
  name?: string
}

export const settableAction = <T extends (...args: any[]) => void>({
  init = null,
  runOnce,
  name,
}: Params<T>) => {
  const impl = atom<T | null>(init, `${name}.impl`)
  return action<T>((...args: Parameters<T>) => {
    const fn = impl()
    if (fn) {
      fn(...args)
      if (runOnce) {
        impl.set(null)
      }
    }
  }, name).extend(() => ({ impl }))
}
