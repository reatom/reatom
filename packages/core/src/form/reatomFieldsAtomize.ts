import { type Action, action, named } from '../core'
import { withCallHook } from '../extensions'
import { isRec } from '../utils'
import {
  type FieldAtom,
  reatomField,
  type TransformableFieldExtOptions,
} from './reatomField'
import {
  type FieldArrayAtom,
  isFieldArrayAtom,
  reatomFieldArray,
} from './reatomFieldArray'
import { type FieldLikeAtom, isFieldAtom } from './withBaseField'

/**
 * Union of all valid types that can be used as initial state for field
 * atomization. Includes:
 *
 * - Primitives: `string`, `number`, `boolean`, `null`, `undefined`, `symbol`,
 *   `bigint`
 * - Built-in objects: `Date`, `File`
 * - Already created field atoms: {@link FieldAtom}
 * - Deprecated field options object: {@link FieldSetFieldOptions}
 * - Nested records of fields: {@link FieldsAtomizeInitStateRecord}
 *
 * @see {@link reatomFieldsAtomize} for usage
 */
export type FieldsAtomizeInitState =
  | string
  | number
  | boolean
  | null
  | undefined
  | File
  | symbol
  | bigint
  | Date
  | FieldAtom
  | FieldSetFieldOptions
  | FieldsAtomizeInitStateRecord

/**
 * A record type representing a nested structure of fields. Each key maps to
 * either:
 *
 * - A single field value ({@link FieldsAtomizeInitState})
 * - An existing field-like atom ({@link FieldLikeAtom})
 * - An array for creating a {@link FieldArrayAtom}
 *
 * @example
 *   const initState: FieldsAtomizeInitStateRecord = {
 *     name: '',
 *     age: 0,
 *     address: {
 *       street: '',
 *       city: '',
 *     },
 *     tags: ['default'],
 *   }
 */
export type FieldsAtomizeInitStateRecord = {
  [fieldKey: string]:
    | FieldsAtomizeInitState
    | FieldLikeAtom
    | Array<FieldsAtomizeInitState>
}

/**
 * Conditional type that maps an initial state structure to its atomized
 * equivalent. Transforms primitives and nested records into their corresponding
 * field atoms:
 *
 * - {@link FieldLikeAtom} → passed through unchanged (it also includes
 *   reatomFieldArray instances)
 * - `Date` | `File` → `FieldAtom<Date | File>`
 * - `boolean` → `FieldAtom<boolean>`
 * - `Array<T>` → `FieldArrayAtom<T, T>`
 * - `{ initState: T }` (deprecated) → `FieldAtom<T>`
 * - Nested record → recursively atomized record
 * - Other primitives → `FieldAtom<T>`
 *
 * @example
 *   type Input = { name: string; tags: string[] }
 *   type Output = FieldsAtomize<Input>
 *   // { name: FieldAtom<string>; tags: FieldArrayAtom<string, string> }
 *
 * @template Element - The initial state type to atomize
 */
export type FieldsAtomize<Element> = [Element] extends [FieldLikeAtom]
  ? Element
  : [Element] extends [Date | File]
    ? FieldAtom<Element>
    : [Element] extends [boolean]
      ? FieldAtom<boolean>
      : [Element] extends [Array<infer Item>]
        ? Item extends FieldsAtomizeInitState
          ? FieldArrayAtom<Item, Item>
          : never
        : [Element] extends [
              TransformableFieldExtOptions & { initState: infer State },
            ]
          ? Element extends TransformableFieldExtOptions<State, State>
            ? FieldAtomFromDeprecatedFieldOptions<State>
            : Element extends TransformableFieldExtOptions<State, infer Value>
              ? FieldAtomFromDeprecatedFieldOptions<State, Value>
              : { initState: State } extends Element
                ? FieldAtomFromDeprecatedFieldOptions<State, State>
                : never
          : [Element] extends [FieldsAtomizeInitStateRecord]
            ? {
                [FieldKey in keyof Element]: FieldsAtomize<Element[FieldKey]>
              }
            : FieldAtom<Element>

/**
 * Action that is called when a new field or field array is created inside a
 * {@link FieldArrayAtom}. Used to hook into field creation for custom setup
 * (e.g., applying form-level validation options).
 *
 * @see {@link FieldsAtomizeModel.experimental_onFieldCreated}
 */
export type OnFieldCreatedAction = Action<[field: FieldLikeAtom], FieldLikeAtom>

/**
 * Return type of {@link reatomFieldsAtomize}. Contains the atomized fields tree
 * and an optional hook for field array element creation.
 *
 * @template InitState - The initial state type that was atomized
 */
export type FieldsAtomizeModel<InitState extends FieldsAtomizeInitState> = {
  /**
   * The atomized fields tree. Structure mirrors the input `initState`, but all
   * values are converted to their corresponding field atoms.
   */
  fields: FieldsAtomize<InitState>

  /**
   * Action called whenever a new field is created inside any nested
   * {@link FieldArrayAtom}. Only present if the `initState` contains arrays or
   * field arrays. Used by {@link reatomForm} to apply form-level validation
   * options to dynamically created fields.
   */
  experimental_onFieldCreated?: OnFieldCreatedAction
}

/**
 * Transforms a plain object structure into a tree of reactive field atoms. This
 * is the core utility used internally by {@link reatomFieldSet},
 * {@link reatomForm}, and {@link reatomFieldArray} to convert initial state into
 * atomized fields.
 *
 * **Transformation rules:**
 *
 * - Primitives (`string`, `number`, `boolean`, etc.) → {@link FieldAtom}
 * - `Date`, `File` → {@link FieldAtom}
 * - Already a {@link FieldAtom} → passed through unchanged
 * - Arrays → {@link FieldArrayAtom}
 * - Nested objects → recursively atomized
 *
 * @example
 *   // Basic usage with primitives
 *   const { fields } = reatomFieldsAtomize({
 *     name: '',
 *     age: 0,
 *     active: false,
 *   })
 *   fields.name.change('John') // FieldAtom<string>
 *   fields.age.change(25) // FieldAtom<number>
 *   fields.active.change(true) // FieldAtom<boolean>
 *
 * @example
 *   // Nested structures
 *   const { fields } = reatomFieldsAtomize({
 *     user: {
 *       profile: {
 *         firstName: '',
 *         lastName: '',
 *       },
 *     },
 *   })
 *   fields.user.profile.firstName.change('John')
 *
 * @example
 *   // With arrays (creates FieldArrayAtom)
 *   const { fields, onFieldCreated } = reatomFieldsAtomize({
 *     tags: ['initial'],
 *     contacts: [{ email: '', phone: '' }],
 *   })
 *   fields.tags.create('new-tag')
 *   fields.contacts.create({ email: 'test@example.com', phone: '' })
 *   // onFieldCreated is defined when arrays are present
 *
 * @example
 *   // Mixing existing field atoms with plain values
 *   const customField = reatomField('custom', 'myField')
 *   const { fields } = reatomFieldsAtomize({
 *     plain: 'value',
 *     custom: customField, // passed through unchanged
 *   })
 *
 * @example
 *   // With built-in objects
 *   const { fields } = reatomFieldsAtomize({
 *     createdAt: new Date(),
 *     avatar: new File([], 'avatar.png'),
 *   })
 *   fields.createdAt // FieldAtom<Date>
 *   fields.avatar // FieldAtom<File>
 *
 * @param initState - The initial state structure to atomize
 * @param name - Optional debug name for the fields (used in devtools)
 * @returns A {@link FieldsAtomizeModel} containing the atomized `fields` and
 *   optional `onFieldCreated` hook
 */
export const reatomFieldsAtomize = <InitState extends FieldsAtomizeInitState>(
  initState: InitState,
  name: string = named('fieldsAtomize'),
): FieldsAtomizeModel<InitState> => {
  let onFieldCreated: OnFieldCreatedAction | undefined

  const createFieldElement = (
    element: FieldsAtomizeInitState,
    name: string,
  ) => {
    if (isFieldAtom(element)) {
      return element
    } else if (
      element &&
      typeof element === 'object' &&
      'initState' in element
    ) {
      return reatomField(element.initState, name)
    } else if (isRec(element)) {
      const fields: FieldsAtomize<typeof element> = {}
      for (const [key, value] of Object.entries(element)) {
        if (isFieldArrayAtom(value) || Array.isArray(value)) {
          onFieldCreated ??= action(
            (field: FieldLikeAtom) => field,
            `${name}._onFieldCreated`,
          )

          const fieldArray = Array.isArray(value)
            ? reatomFieldArray(value, `${name}.${key}`)
            : value

          fieldArray.experimental_onFieldCreated.extend(
            withCallHook((payload) => onFieldCreated?.(payload)),
          )

          // @ts-expect-error FieldArrayAtom is confliting with FieldAtom
          fields[key] = fieldArray
        } else {
          // @ts-expect-error FieldAtom is confliting with FieldArrayAtom
          fields[key] = createFieldElement(value, `${name}.${key}`)
        }
      }
      return fields
    }
    return reatomField(element, name)
  }

  const fields = createFieldElement(initState, name) as FieldsAtomize<InitState>

  return {
    fields,
    experimental_onFieldCreated: onFieldCreated,
  }
}

/** @deprecated Will be removed in next major release */
interface FieldSetFieldOptions<
  State = any,
  Value = State,
> extends TransformableFieldExtOptions<State, Value> {
  initState: State
}

export { type FieldSetFieldOptions as FormFieldOptions }

/**
 * @deprecated This field was initialized with field options object literal that
 *   considered as a deprecated initialization method. Please use `reatomField`
 *   instead
 */
export type FieldAtomFromDeprecatedFieldOptions<
  State = any,
  Value = State,
> = FieldAtom<State, Value>
