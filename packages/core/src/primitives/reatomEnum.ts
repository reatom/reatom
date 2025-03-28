import {
  action,
  Action,
  Atom,
  atom,
  named,
  ReatomError,
} from 'src/core'

export type EnumFormat = 'camelCase' | 'snake_case'

export type EnumAtom<
  T extends string,
  Format extends EnumFormat = 'camelCase',
> = Atom<T> & {
  [Variant in T as Format extends 'camelCase'
    ? `set${Capitalize<Variant>}`
    : Format extends 'snake_case'
      ? `set_${Variant}`
      : never]: Action<[], Variant>
} & {
  reset: Action<[], T>
  enum: { [K in T]: K }
}

export type EnumAtomOptions<
  T extends string,
  Format extends EnumFormat = 'camelCase',
> = {
  name?: string
  format?: Format
  initState?: T
}

export const reatomEnum = <
  const T extends string,
  Format extends 'camelCase' | 'snake_case' = 'camelCase',
>(
  variants: ReadonlyArray<T>,
  options: string | EnumAtomOptions<T, Format> = {},
) => {
  const {
    name = named('enumAtom'),
    format = 'camelCase' as Format,
    initState = variants[0],
  }: EnumAtomOptions<T, Format> = typeof options === 'string'
    ? { name: options }
    : options

  if(!initState)
    throw new ReatomError(`enum "${name}" must have an at least one variant`)

  const enumAtom = atom(initState, name).mix(
      (target) => ({ reset: () => enumAtom(initState!) }),
      (target) => (next, ...params) => {
        const value = next(...params);
        console.log({ next, params, value })
        if(!variants.includes(value))
          throw new ReatomError(`invalid enum value "${value}" for "${target.name}" enum`)

        return value;
      }
  ) as EnumAtom<T, Format>

  const cases = (enumAtom.enum = {} as { [K in T]: K })

  for (const variant of variants) {
    cases[variant] = variant
    const setterName = variant.replace(
      /^./,
      (firstLetter) =>
        'set' +
        (format === 'camelCase'
          ? firstLetter.toUpperCase()
          : `_${firstLetter}`),
    )

    ;(enumAtom as any)[setterName] = action(
      () => enumAtom(variant)!,
      `${name}.${setterName}`,
    )
  }

  return enumAtom as EnumAtom<T, Format>
}
