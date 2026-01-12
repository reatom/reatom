import { atom, sleep, withInitHook, wrap } from '@reatom/core'

export const time = atom(() => Date.now(), '_time').extend(
  withInitHook(async () => {
    while (true) {
      await wrap(sleep(1000))
      time.set(Date.now())
    }
  }),
)
