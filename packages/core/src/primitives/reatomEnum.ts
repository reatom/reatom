import { Action, Atom, atom, named, ReatomError } from '../core'

export type EnumFormat = 'camelCase' | 'snake_case'

type EnumVariantSetters<T extends string, Format extends EnumFormat> = {
  [Variant in T as Format extends 'camelCase'
    ? `set${Capitalize<Variant>}`
    : Format extends 'snake_case'
      ? `set_${Variant}`
      : never]: Action<[], Variant>
}

export type EnumAtom<
  T extends string,
  Format extends EnumFormat = 'camelCase',
> = Atom<T> &
  EnumVariantSetters<T, Format> & {
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

  if (!initState)
    throw new ReatomError(`enum "${name}" must have an at least one variant`)

  return atom(initState, name).mix(
    (target) => ({ reset: () => target(initState!) }),
    (target) =>
      (next, ...params) => {
        const value = next(...params)

        if (!variants.includes(value))
          throw new ReatomError(
            `invalid enum value "${value}" for "${target.name}" enum`,
          )

        return value
      },
    (target) =>
      variants.reduce(
        (acc, variant) => {
          const setterName = variant.replace(
            /^./,
            (firstLetter) =>
              'set' +
              (format === 'camelCase'
                ? firstLetter.toUpperCase()
                : `_${firstLetter}`),
          ) as keyof typeof acc

          // @ts-expect-error bad types inference for dynamic actions
          acc[setterName] = () => target(variant)
          return acc
        },
        {} as EnumVariantSetters<T, Format>,
      ),
    (target) => ({ enum: Object.fromEntries(variants.map((v) => [v, v])) }),
  ) as EnumAtom<T, Format>
}
