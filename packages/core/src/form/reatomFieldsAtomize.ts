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

/** TODO */
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

/** TODO */
export type FieldsAtomizeInitStateRecord = {
  [fieldKey: string]:
    | FieldsAtomizeInitState
    | FieldLikeAtom
    | Array<FieldsAtomizeInitState>
}

/** TODO */
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

/** TODO */
export type OnFieldCreatedAction = Action<[field: FieldAtom], FieldAtom>

/** TODO */
export type FieldsAtomizeModel<InitState extends FieldsAtomizeInitState> = {
  /** TODO */
  fields: FieldsAtomize<InitState>

  /** TODO */
  onFieldCreated?: OnFieldCreatedAction
}

/**
 * TODO
 *
 * @param initState
 * @param name
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
            (field: FieldAtom) => field,
            `${name}.onFieldCreated`,
          )

          const fieldArray = Array.isArray(value)
            ? reatomFieldArray(value, `${name}.${key}`)
            : value

          fieldArray.onFieldCreated.extend(
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

  const fields = createFieldElement(
    initState,
    `${name}.fields`,
  ) as FieldsAtomize<InitState>

  return {
    fields,
    onFieldCreated,
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
