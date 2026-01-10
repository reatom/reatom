import { type Action, action, named } from '../core'
import { withCallHook } from '../extensions'
import type { LinkedListAtom } from '../primitives'
import { isRec } from '../utils'
import {
  type FieldAtom,
  type FieldLikeAtom,
  isFieldAtom,
  reatomField,
} from './reatomField'
import {
  type FieldArrayAtom,
  isFieldArrayAtom,
  reatomFieldArray,
} from './reatomFieldArray'

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
  | FieldsAtomizeInitStateRecord

export type FieldsAtomizeInitStateRecord = {
  [fieldKey: string]:
    | FieldsAtomizeInitState
    | { __reatomFieldArray: true } // TODO: FieldArrayAtom is confliting with FieldAtom
    | Array<FieldsAtomizeInitState>
}

export type FieldsAtomize<Element> = Element extends FieldLikeAtom
  ? Element
  : Element extends Date | File
    ? FieldAtom<Element>
    : Element extends boolean
      ? FieldAtom<boolean>
      : Element extends Array<infer Item>
        ? Item extends FieldsAtomizeInitState
          ? FieldArrayAtom<Item, Item>
          : never
        : Element extends LinkedListAtom<infer _Param, infer _Node>
          ? Element
          : Element extends FieldsAtomizeInitStateRecord
            ? {
                [FieldKey in keyof Element]: FieldsAtomize<Element[FieldKey]>
              }
            : FieldAtom<Element>

export type OnFieldCreatedAction = Action<[field: FieldAtom], FieldAtom>

export type FieldsAtomizeModel<InitState extends FieldsAtomizeInitState> = {
  /** TODO */
  fields: FieldsAtomize<InitState>

  /** TODO */
  onFieldCreated?: OnFieldCreatedAction
}

export const reatomFieldsAtomize = <InitState extends FieldsAtomizeInitState>(
  initState: InitState,
  name: string = named('fieldsAtomize'),
): FieldsAtomizeModel<InitState> => {
  let onFieldCreated: OnFieldCreatedAction | undefined

  const createFieldElement = (
    element: FieldsAtomizeInitState,
    name: string,
  ): FieldsAtomize<typeof element> => {
    if (isFieldAtom(element)) {
      return element
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

          // @ts-ignore FieldArrayAtom is confliting with FieldAtom
          fields[key] = fieldArray
        } else {
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
    onFieldCreated,
  }
}
