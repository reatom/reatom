import { type Action, action, type Atom, atom, isAtom, named } from '../core'
import { withCallHook, withInitHook } from '../extensions'
import {
  type LinkedList,
  type LinkedListAtom,
  type LLNode,
  reatomLinkedList,
} from '../primitives'
import type { FieldAtom } from './reatomField'
import {
  type FieldsAtomize,
  type FieldsAtomizeInitState,
  type OnFieldCreatedAction,
  reatomFieldsAtomize,
} from './reatomFieldsAtomize'

type FieldArrayInitState<T> = {
  [K in keyof T]: T[K] extends FieldArrayAtom<infer Param, infer _Node>
    ? Param[]
    : FieldArrayInitState<T[K]>
}

export type FieldArrayAtom<
  Param = any,
  Node extends FieldsAtomizeInitState = FieldsAtomizeInitState,
> = LinkedListAtom<[FieldArrayInitState<Param>], FieldsAtomize<Node>> & {
  __fieldArray: true
  onFieldCreated: OnFieldCreatedAction
  initState: Atom<LinkedList<LLNode<FieldsAtomize<Node>>>>
  init: Action<[initState: FieldArrayInitState<Param>[]], void>
  reset: Action<[] | [initState: FieldArrayInitState<Param>[]], void>
}

export const isFieldArrayAtom = (atom: any): atom is FieldArrayAtom => {
  return isAtom(atom) && '__fieldArray' in atom
}

/**
 * TODO
 *
 * @param initState
 */
export function reatomFieldArray<Param extends FieldsAtomizeInitState>(
  initState: Param[],
  name?: string,
): FieldArrayAtom<Param, Param>

/**
 * TODO
 *
 * @param create
 */
export function reatomFieldArray<Param, Node extends FieldsAtomizeInitState>(
  create: (param: Param, name: string) => Node,
  name?: string,
): FieldArrayAtom<Param, Node>

/**
 * TODO
 *
 * @param options
 */
export function reatomFieldArray<
  Param,
  Node extends FieldsAtomizeInitState,
>(options: {
  create: (param: Param, name: string) => Node
  initState?: Param[]
  name?: string
}): FieldArrayAtom<Param, Node>

export function reatomFieldArray<Param, Node extends FieldsAtomizeInitState>(
  options:
    | Param[]
    | ((params: Param, name: string) => Node)
    | {
        create: (param: Param, name: string) => Node
        initState?: Param[]
        name?: string
      },
  name?: string,
): FieldArrayAtom<Param, Node> {
  interface This extends FieldArrayAtom<Param, Node> {}

  const {
    create,
    initState = [],
    name: optionsName,
  } = typeof options === 'function'
    ? { create: options }
    : Array.isArray(options)
      ? {
          create: (param: Param) => param as unknown as Node,
          initState: options,
        }
      : options

  name ||= optionsName || named('fieldArray')

  const onFieldCreated: This['onFieldCreated'] = action(
    (field: FieldAtom) => field,
    `${name}.onFieldCreated`,
  )

  const fieldArrayAtom = reatomLinkedList({
    create: (param) => {
      const factoryName = `${name}.item`
      const model = reatomFieldsAtomize(create(param, factoryName), factoryName)
      model.onFieldCreated?.extend(withCallHook(onFieldCreated))

      return model.fields
    },
    initSnapshot: initState.map(
      (state) => [state] as [FieldArrayInitState<Param>],
    ),
  }).extend(withInitHook((initState) => initStateAtom.set(initState)))

  const initStateAtom: This['initState'] = atom(
    () => fieldArrayAtom(),
    `${name}.initState`,
  )

  const init: This['init'] = action((initState) => {
    initStateAtom.set(
      fieldArrayAtom.initiateFromSnapshot(initState.map((v) => [v])),
    )
  }, `${name}.init`)

  const reset: This['reset'] = action((...args) => {
    if (args.length) init(args[0])

    fieldArrayAtom.set(initStateAtom())
  }, `${name}.reset`)

  return Object.assign(fieldArrayAtom, {
    __fieldArray: true as const,
    onFieldCreated,
    initState: initStateAtom,
    init,
    reset,
  })
}
