import {
  type Action,
  action,
  type Atom,
  atom,
  type AtomState,
  createAtom,
  isAbort,
  isDeepEqual,
  named,
} from '../'
import {
  type BaseFieldExt,
  type BaseFieldExtOptions,
  withBaseField,
} from './withBaseField'

/** TODO */
export interface FieldAtom<State = any, Value = State>
  extends Atom<State>, BaseFieldExt<State, [initState: State]> {
  /**
   * Action for handling field changes, accepts the "value" parameter and
   * applies it to `toState` option.
   */
  change: Action<[Value], Value>

  /** Writable atom with the "value" data, computed by the `fromState` option */
  value: Atom<Value>
}

/** TODO */
export interface FieldOptions<State = any, Value = State> extends Omit<
  BaseFieldExtOptions<State, Value>,
  'isDirty' | 'initStateAtom'
> {
  /**
   * The callback to filter "value" changes (from the 'change' action). It
   * should return 'false' to skip the update. By default, it always returns
   * `true`.
   */
  filter?: (newValue: Value, prevValue: Value) => boolean

  /**
   * The callback to compute the "value" data from the "state" data. By default,
   * it returns the "state" data without any transformations.
   */
  fromState?: (state: State, self: FieldAtom<State, Value>) => Value

  /**
   * The callback to transform the "state" data from the "value" data from the
   * `change` action. By default, it returns the "value" data without any
   * transformations.
   *
   * It's also possible to abort the computation and left the state unchaged by
   * throwing abort error inside the callback
   *
   * @example
   *   const numberField = reatomField(0, {
   *     fromState: (state) => state.toString(),
   *     toState: (value: string) => {
   *       const parsed = Number(value)
   *       return isNaN(parsed) ? throwAbort() : parsed
   *     },
   *   })
   */
  toState?: (value: Value, self: FieldAtom<State, Value>) => State

  /**
   * The callback used to determine whether the "value" has changed. By default,
   * it utilizes `isDeepEqual` from reatom/utils.
   */
  isDirty?: (newValue: Value, prevValue: Value) => boolean

  /** The name of the field and all related atoms and actions. */
  name?: string
}

/** TODO */
export interface TransformableFieldOptions<State, Value> extends Omit<
  FieldOptions<State, Value>,
  'fromState' | 'toState'
> {
  /**
   * The callback to compute the "value" data from the "state" data. By default,
   * it returns the "state" data without any transformations.
   */
  fromState: (state: State, self: FieldAtom<State, Value>) => Value

  /**
   * The callback to transform the "state" data from the "value" data from the
   * `change` action. By default, it returns the "value" data without any
   * transformations.
   */
  toState: (value: Value, self: FieldAtom<State, Value>) => State
}

/**
 * TODO
 *
 * @param options
 */
export function reatomField<State>(
  initState: State,
  options?: string | FieldOptions<State, State>,
): FieldAtom<State, State>

/**
 * TODO
 *
 * @param options
 */
export function reatomField<State, Value>(
  initState: State,
  options: TransformableFieldOptions<State, Value>,
): FieldAtom<State, Value>

// TODO: consider to remove this in favor of withField (it should contain all the reatomField logic initially)
/** @deprecated */
export function reatomField<State, A extends Atom<State>, Value = State>(
  initState: null,
  options: string | FieldOptions<State, Value>,
  stateAtom: A,
): A & FieldAtom<State, Value>

export function reatomField<State, Value = State>(
  initState: State,
  options:
    | string
    | FieldOptions<State, Value>
    | TransformableFieldOptions<State, Value> = {},
  stateAtom?: Atom<State>,
): FieldAtom<State, Value> {
  type This = FieldAtom<State, Value>

  const {
    filter = () => true,
    fromState = (state) => state as unknown as Value,
    isDirty = (newValue: Value, prevValue: Value) =>
      !isDeepEqual(newValue, prevValue),
    name = named(`${typeof initState}Field`),
    toState = (value) => value as unknown as State,
    validate: validateFn,
    ...restOptions
  } = typeof options === 'string'
    ? ({ name: options } as FieldOptions<State, Value>)
    : options

  const field = stateAtom ?? atom(initState, `${name}.field`)

  const baseField = field.extend(
    withBaseField({
      initStateAtom: atom(() => field(), `${name}.initState`),
      isDirty: (newState, prevState) =>
        isDirty(
          fromState(newState, field as This),
          fromState(prevState, field as This),
        ),
      getValue: () => value(),
      validate: validateFn,
      disabled: restOptions.disabled,
      elementRef: restOptions.elementRef,
      keepErrorDuringValidating: restOptions.keepErrorDuringValidating,
      keepErrorOnChange: restOptions.keepErrorOnChange,
      validateOnChange: restOptions.validateOnChange,
      validateOnBlur: restOptions.validateOnBlur,
    }),
  )

  const value: This['value'] = createAtom(
    { computed: () => fromState(field(), field as This) },
    `${name}.value`,
  )

  const change: This['change'] = action((newValue) => {
    const prevValue = value()
    if (!filter(newValue, prevValue)) return prevValue

    value.set(newValue)

    try {
      field.set(toState(newValue, field as This))
    } catch (error) {
      if (!isAbort(error)) throw error
    }
    return newValue
  }, `${name}._change`)

  return Object.assign(baseField, {
    change,
    value,
  })
}

/**
 * TODO
 *
 * @param options
 */
export function withField<T extends Atom>(
  options?: Omit<FieldOptions<AtomState<T>, AtomState<T>>, 'name'>,
): (anAtom: T) => T & FieldAtom<AtomState<T>, AtomState<T>>

/**
 * TODO
 *
 * @param options
 */
export function withField<T extends Atom, Value>(
  options?: Omit<TransformableFieldOptions<AtomState<T>, Value>, 'name'>,
): (anAtom: T) => T & FieldAtom<AtomState<T>, Value>

/**
 * TODO
 *
 * @param options
 */
export function withField<T extends Atom, Value = AtomState<T>>(
  options: Omit<FieldOptions<AtomState<T>, Value>, 'name'> = {},
): (anAtom: T) => T & FieldAtom<AtomState<T>, Value> {
  return (anAtom: T) =>
    reatomField(null, { name: anAtom.name, ...options }, anAtom)
}
