import { type AtomLike, computed, type Computed, isObject, named } from '@reatom/core'

type Primitive = string | number | boolean | null | undefined
type GetterMaybe<T = any> = T | (() => T)

export type ClassNameValue = GetterMaybe<
  | Primitive
  | Array<ClassNameValue>
  | AtomLike<ClassNameValue>
  | Record<string, unknown>
  | (() => ClassNameValue)
>

// @see https://github.com/JedWatson/classnames
// @see https://vuejs.org/guide/essentials/class-and-style.html#binding-html-classes
export let cn = (value: ClassNameValue, name = named('classNameAtom')): Computed<string> =>
  computed(() => parseClasses(value), name)

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
