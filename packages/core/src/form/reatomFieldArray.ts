import { type Action,isAtom } from "../core";
import type { LinkedListAtom } from "../primitives";
import type { FieldAtom } from "./reatomField";
import type { FieldsAtomizeElement, FieldsAtomizeInitStateElement } from "./reatomFieldsAtomize";

type ExtractFieldArray<T> = {
  [K in keyof T]: T[K] extends FieldArrayAtom<infer Param, infer _Node>
    ? Param[]
    : ExtractFieldArray<T[K]>
}

export type FieldArrayAtom<
  Param = any,
  Node extends FieldsAtomizeInitStateElement = FieldsAtomizeInitStateElement,
> = LinkedListAtom<[ExtractFieldArray<Param>], FieldsAtomizeElement<Node>> & {
  __fieldArray: true
  onFieldCreated: Action<[field: FieldAtom], void>
  // reset: Action<[], AtomState<FormFieldArrayAtom<Param, Node>>>
  // initState: Atom<LinkedList<LLNode<FormFieldElement<Node>>>>
}

export const isFieldArrayAtom = (atom: any): atom is FieldArrayAtom => {
  return isAtom(atom) && '__fieldArray' in atom
}
