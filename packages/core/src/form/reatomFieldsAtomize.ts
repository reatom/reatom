import { type Action, action, named } from '../core'
import { withCallHook } from '../extensions'
import type { LinkedListAtom } from '../primitives'
import { isRec, type Rec } from '../utils'
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
  | {
      [fieldKey: string]:
        | FieldsAtomizeInitState
        | FieldArrayAtom
        | Array<FieldsAtomizeInitState>
    }

export type FieldsAtomize<Element extends FieldsAtomizeInitState> =
  Element extends FieldLikeAtom
    ? Element
    : Element extends Date
      ? FieldAtom<Element>
      : Element extends Array<infer Item>
        ? Item extends FieldsAtomizeInitState
          ? FieldArrayAtom<Item, Item>
          : never
        : Element extends LinkedListAtom<infer _Param, infer _Node>
          ? Element
          : Element extends Rec
            ? {
                [FieldKey in keyof Element]: FieldsAtomize<Element[FieldKey]>
              }
            : FieldAtom<Element>

export type OnFieldCreatedAction = Action<[field: FieldAtom], FieldAtom>

export type FieldsAtomizeModel<InitState extends FieldsAtomizeInitState> = {
  fields: FieldsAtomize<InitState>
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

          fields[key] = Array.isArray(value)
            ? (reatomFieldArray(value, `${name}.${key}`) as FieldArrayAtom)
            : value
            
          fields[key].onFieldCreated.extend(
            withCallHook((payload) => onFieldCreated?.(payload)),
          )
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
