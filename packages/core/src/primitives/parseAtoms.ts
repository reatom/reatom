import { Action, Atom, isAction, isAtom } from '../core'
import {
  isLinkedListAtom,
  LinkedList,
  LinkedListLikeAtom,
  LL_PREV,
  LL_NEXT,
} from './reatomLinkedList'
import { isRec, Rec } from '../utils'

type Primitive = string | number | boolean | null | undefined
type Builtin = Date | RegExp | Function

export type ParseAtoms<T> = T extends Action
  ? T
  : T extends LinkedListLikeAtom<infer T>
    ? T extends LinkedList<infer T>
      ? Array<ParseAtoms<Omit<T, typeof LL_PREV | typeof LL_NEXT>>>
      : never
    : T extends Atom<infer T>
      ? ParseAtoms<T>
      : T extends Map<infer K, infer T>
        ? Map<K, ParseAtoms<T>>
        : T extends Set<infer T>
          ? Set<ParseAtoms<T>>
          : T extends Array<infer T>
            ? Array<ParseAtoms<T>>
            : T extends Primitive | Builtin
              ? T
              : T extends object
                ? {
                    [K in keyof T]: ParseAtoms<T[K]>
                  }
                : T

export const parseAtoms = <Value>(value: Value): ParseAtoms<Value> => {
  if (isAction(value)) return value as ParseAtoms<Value>

  if (isLinkedListAtom(value)) value = value.array as any

  while (isAtom(value)) value = value()

  if (typeof value !== 'object' || value === null) return value as any

  if (isRec(value)) {
    const res = {} as Rec
    for (const k in value) res[k] = parseAtoms(value[k])
    return res as any
  }

  if (Array.isArray(value)) {
    const res = []
    for (const v of value) res.push(parseAtoms(v))
    return res as any
  }

  if (value instanceof Map) {
    const res = new Map()
    for (const [k, v] of value) res.set(k, parseAtoms(v))
    return res as any
  }

  if (value instanceof Set) {
    const res = new Set()
    for (const v of value) res.add(parseAtoms(v))
    return res as any
  }

  return value as any
}
