import {
  action,
  atom,
  type AtomState,
  isAtom,
  named,
  withParams,
} from '../core'
import { withCallHook } from '../extensions'
import {
  type LinkedList,
  type LinkedListAtom,
  LL_NEXT,
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
import {
  type BaseFieldExt,
  type BaseFieldExtOptions,
  withBaseField,
} from './withBaseField'

export type FieldArrayLLNode<Node> = LLNode<FieldsAtomize<Node>>
export type FieldArrayState<Node> = LinkedList<FieldArrayLLNode<Node>>

export type FieldArrayOptions<
  Param,
  Node extends FieldsAtomizeInitState,
> = Omit<
  BaseFieldExtOptions<
    FieldArrayState<Node>,
    FieldArrayLLNode<Node>[],
    [initState: FieldArrayInitState<Param>[]],
    FieldArrayLLNode<Node>[]
  >,
  'getValue' | 'getNormalizedState' | 'initStateAtom'
> & {
  create?: (param: Param, name: string) => Node
  name?: string
}

type FieldArrayInitState<T> = {
  [K in keyof T]: T[K] extends FieldArrayAtom<infer Param, infer _Node>
    ? Param[]
    : FieldArrayInitState<T[K]>
}

export type FieldArrayAtom<
  Param = any,
  Node extends FieldsAtomizeInitState = FieldsAtomizeInitState,
> = LinkedListAtom<[FieldArrayInitState<Param>], FieldsAtomize<Node>> &
  BaseFieldExt<
    FieldArrayState<Node>,
    [initState: FieldArrayInitState<Param>[]]
  > & {
    onFieldCreated: OnFieldCreatedAction
  }

export type FieldArrayItem<T> =
  T extends FieldArrayAtom<infer _Param, infer _Node>
    ? AtomState<T['array']>[number]
    : never

export const isFieldArrayAtom = (atom: any): atom is FieldArrayAtom => {
  return isAtom(atom) && 'onFieldCreated' in atom
}

/**
 * TODO
 *
 * @param initState
 */
export function reatomFieldArray<Param extends FieldsAtomizeInitState>(
  initState: Param extends any[] ? Param : Param[],
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
 * @deprecated Use reatomFieldArray(initState, { create, ...options }) overload
 *   instead
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

/**
 * TODO
 *
 * @param create
 */
export function reatomFieldArray<Param extends FieldsAtomizeInitState>(
  initState: Param extends any[] ? Param : Param[],
  options: FieldArrayOptions<Param, Param>,
): FieldArrayAtom<Param, Param>

/**
 * TODO
 *
 * @param create
 */
export function reatomFieldArray<Param, Node extends FieldsAtomizeInitState>(
  initState: Param[],
  options: FieldArrayOptions<Param, Node>,
): FieldArrayAtom<Param, Node>

export function reatomFieldArray<Param, Node extends FieldsAtomizeInitState>(
  optionsOrInitState:
    | Param[]
    | ((params: Param, name: string) => Node)
    | FieldArrayOptions<Param, Node>,
  nameOrOptions?: string | FieldArrayOptions<Param, Node>,
): FieldArrayAtom<Param, Node> {
  interface This extends FieldArrayAtom<Param, Node> {}

  const {
    create = (param: Param) => param as unknown as Node,
    initState = [],
    name: optionsName,
    ...restOptions
  } = typeof optionsOrInitState === 'function'
    ? { create: optionsOrInitState }
    : Array.isArray(optionsOrInitState)
      ? typeof nameOrOptions === 'object'
        ? { ...nameOrOptions, initState: optionsOrInitState }
        : { initState: optionsOrInitState }
      : { ...optionsOrInitState }

  const name =
    (typeof nameOrOptions === 'string' ? nameOrOptions : nameOrOptions?.name) ||
    optionsName ||
    named('fieldArray')

  const onFieldCreated: This['onFieldCreated'] = action(
    (field: FieldAtom) => field,
    `${name}.onFieldCreated`,
  )

  const initStateAtom: This['initState'] = atom(
    () => fieldArrayAtom(),
    `${name}.initState`,
  ).extend(
    withParams((initState: FieldArrayInitState<Param>[]) => {
      return fieldArrayAtom.initiateFromSnapshot(initState.map((v) => [v]))
    }),
  )

  const fieldArrayAtom = reatomLinkedList(
    {
      create: (param) => {
        const factoryName = `${name}.item`
        const model = reatomFieldsAtomize(
          create(param, factoryName),
          factoryName,
        )
        model.onFieldCreated?.extend(withCallHook(onFieldCreated))

        return model.fields
      },
      initSnapshot: initState.map(
        (state) => [state] as [FieldArrayInitState<Param>],
      ),
    },
    name,
  ).extend(
    withBaseField({
      initStateAtom,
      getNormalizedState: (state) => {
        // TODO decouple into a function (including a reatomForm one)
        const elements = [];
        let head = state.head;
        while (head) {
          elements.push(head);
          head = head[LL_NEXT];
        }
        return elements;
      },
      getValue: (): FieldArrayLLNode<Node>[] => fieldArrayAtom.array(),
      ...restOptions,
    }),
  )

  return Object.assign(fieldArrayAtom, {
    onFieldCreated,
  })
}

/** @deprecated Use reatomFieldArray instead */
export const experimental_fieldArray = reatomFieldArray

/** @deprecated Renamed. Use FieldArrayItem instead */
export type ArrayFieldItem<T> = FieldArrayItem<T>
