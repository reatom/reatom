import { abortVar, wrap } from '@reatom/core'

// @ts-ignore
export const hotWrap: typeof wrap = (target, frame) => {
  abortVar.subscribe(target.subscribe())
  return wrap(target, frame)
}
