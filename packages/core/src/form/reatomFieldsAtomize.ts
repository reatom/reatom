import { type Action,action, named } from "../core"
import { withCallHook } from "../extensions"
import type { LinkedListAtom } from "../primitives"
import { isRec, type Rec } from "../utils"
import { type FieldAtom, type FieldLikeAtom,isFieldAtom, reatomField } from "./reatomField"
import { type FieldArrayAtom,isFieldArrayAtom } from "./reatomFieldArray"

export type FieldsAtomizeInitStateElement =
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
    | FieldsAtomizeInitState

export type FieldsAtomizeInitState = {
    [fieldKey: string]: FieldsAtomizeInitStateElement | FieldArrayAtom | Array<FieldsAtomizeInitStateElement>
}

export type FieldsAtomizeElement<
    Element extends FieldsAtomizeInitState[keyof FieldsAtomizeInitState]
> = Element extends FieldLikeAtom
    ? Element
    : Element extends Date
        ? FieldAtom<Element>
        : Element extends Array<infer Item>
            ? Item extends FieldsAtomizeInitStateElement
                ? FieldArrayAtom<Item, Item>
                : never
            : Element extends LinkedListAtom<infer _Param, infer _Node>
                ? Element
                : Element extends Rec
                    ? FieldsAtomize<Element>
                    : FieldAtom<Element>

export type FieldsAtomize<InitState extends FieldsAtomizeInitState> = {
  [FieldKey in keyof InitState]: FieldsAtomizeElement<InitState[FieldKey]>
}

export type FieldsAtomizeModel<InitState extends FieldsAtomizeInitState> = {
  fields: FieldsAtomize<InitState>,
  onFieldCreated: Action<[field: FieldAtom], void>
}

export const reatomFieldsAtomize = <InitState extends FieldsAtomizeInitState>(
    initState: InitState,
    name: string = named('fieldsAtomize')
): FieldsAtomizeModel<InitState> => {
    const onFieldCreated = action((field: FieldAtom) => void field, `${name}.onFieldCreated`)

    const createFieldElement = (
        element: FieldsAtomizeInitState[keyof FieldsAtomizeInitState],
        name: string,
    ): FieldsAtomizeElement<typeof element> => {
        if (isFieldAtom(element)) {
            return element;
        }
        else if(isFieldArrayAtom(element)) {
            element.onFieldCreated.extend(withCallHook((_payload, params) => onFieldCreated(params[0])))
            return element;
        }
        else if(isRec(element)) {
            const fields = Array.isArray(element)
                ? ([] as FieldsAtomize<InitState>)
                : ({} as FieldsAtomize<InitState>)

            for (const [key, value] of Object.entries(initState)) {
                // @ts-expect-error bad keys type inference
                fields[key] = createFieldElement(value, `${name}.${key}`)
            }
            return fields
        }
        else if(Array.isArray(element)) {
            // TODO: instantiate and return reatomFieldArray
        }
        return reatomField(element, name)
    }

    const fields = createFieldElement(initState, name) as FieldsAtomize<InitState>  

    return {
        fields,
        onFieldCreated
    }
}
