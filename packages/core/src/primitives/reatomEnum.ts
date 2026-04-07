import type { Action, Atom } from '../core'
import { atom, named, ReatomError, withActions, withMiddleware } from '../core'
import { assert, type Fn } from '../utils'

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
> = Atom<T, [T | ({} & string)]> &
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

/**
 * Creates a string atom limited to a fixed set of variants and augments it with
 * enum-specific helpers.
 *
 * @remarks
 *   Treat `reatomEnum` as the default way to model enums in Reatom apps. It keeps
 *   the reactive value, runtime validation, generated setter actions, and a
 *   stable `myEnum.enum` object in one place.
 *
 *   Capabilities:
 *
 *   - Infers a string union from a readonly variants array.
 *   - Rejects invalid values at runtime.
 *   - Generates setter actions like `setOpen()` or `set_open()`.
 *   - Exposes `reset()` to return to the configured initial variant.
 *   - Exposes `myEnum.enum` so UI code, comparisons, and integrations can reuse the
 *       same canonical values without repeating raw strings.
 *
 *   By default the first variant becomes the initial state. Setter names use
 *   `camelCase`, or `snake_case` when requested.
 * @example
 *   // Use it as the default enum model and reuse `myEnum.enum` values
 *   const ticketStatus = reatomEnum(
 *     ['new', 'inProgress', 'resolved'],
 *     'ticketStatus',
 *   )
 *
 *   ticketStatus.set(ticketStatus.enum.inProgress)
 *
 *   if (ticketStatus() === ticketStatus.enum.inProgress) {
 *     ticketStatus.setResolved()
 *   }
 *
 *   Object.values(ticketStatus.enum)
 *   // ['new', 'inProgress', 'resolved']
 *
 * @example
 *   // Match backend-style names with `snake_case` setters
 *   const deliveryState = reatomEnum(
 *     ['not_started', 'in_progress', 'done'],
 *     {
 *       name: 'deliveryState',
 *       format: 'snake_case',
 *       initState: 'not_started',
 *     },
 *   )
 *
 *   deliveryState.set_in_progress()
 *   deliveryState.reset()
 *
 *   deliveryState() // 'not_started'
 */
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

  assert(
    initState,
    `enum "${name}" must have an at least one variant`,
    ReatomError,
  )
  return atom(initState, name).extend(
    withMiddleware((target) => (next: Fn, ...params) => {
      const value = next(...params)

      if (!variants.includes(value))
        throw new ReatomError(
          `invalid enum value "${value}" for "${target.name}" enum`,
        )

      return value
    }),
    withActions((target) => ({ reset: () => target.set(initState) })),
    withActions((target) =>
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
          acc[setterName] = () => target.set(variant)
          return acc
        },
        {} as EnumVariantSetters<T, Format>,
      ),
    ),
    () => ({
      enum: Object.fromEntries(variants.map((v) => [v, v])),
    }),
  )
}
