import { Action, atom, Atom, named } from '../core'
import { Fn, Rec, omit } from '../utils'

export interface RecordAtom<T extends Rec> extends Atom<T> {
  merge: Action<[slice: Partial<T>], T>
  omit: Action<Array<keyof T>, T>
  reset: Action<Array<keyof T>, T>
}

export const reatomRecord = <T extends Rec>(
  initState: Exclude<T, Fn>,
  name = named('recordAtom'),
): RecordAtom<T> =>
  atom(initState, name).mix(
    (target) => ({
      merge: (slice: Partial<T>) => (
        target((prev) => {
          for (const key in prev) {
            if (!Object.is(prev[key], slice[key])) {
              return { ...prev, ...slice }
            }
          }
          return prev
        })
      ),
      omit: (...keys: Array<keyof T>) => (
        target((prev) => {
          if (keys.some((key) => key in prev)) return omit(prev, keys) as any
          return prev
        })
      ),
      reset: (...keys: (keyof T)[]) => (
        target((prev) => {
          if (keys.length === 0) return initState
          const next = {} as T
          let changed = false
          for (const key in prev) {
            if (keys.includes(key)) {
              if (key in initState) {
                next[key] = initState[key]
                changed ||= !Object.is(prev[key], initState[key])
              } else {
                changed ||= key in prev
              }
            } else {
              next[key] = prev[key]
            }
          }
          return changed ? next : prev
        })
      ),
    })
)
