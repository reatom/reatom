import { atom, type AtomLike, isObject } from '@reatom/core'

type Primitive = string | number | boolean | null | undefined
type MaybeGetter<T = unknown> = T | (() => T)

export type ClassNameValue = MaybeGetter<
  | Primitive
  | Array<ClassNameValue>
  | AtomLike<ClassNameValue>
  | Record<string, unknown>
  | (() => ClassNameValue)
>

// TODO: Pass the atom name as the second argument.
export let cn = (value: ClassNameValue): AtomLike<string> =>
  atom(() => parseClasses(value))

let parseClasses = (value: ClassNameValue): string => {
  let className = ''
  value = resolveGetter(value)
  if (typeof value === 'string') className = value
  else if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      let parsed = parseClasses(value[i])
      className = joinClassName(className, parsed)
    }
  } else if (isObject(value)) {
    for (let name in value) {
      let val = resolveGetter(value[name] as any)
      if (val) className = joinClassName(className, name)
    }
  }
  return className
}

let resolveGetter = (value: ClassNameValue): ClassNameValue => {
  while (typeof value === 'function') value = value()
  return value
}

let joinClassName = (className: string, value: string): string => {
  if (value !== '') className += className === '' ? value : ' ' + value
  return className
}
