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

export interface FieldExt<State = any, Value = State> extends BaseFieldExt<
  State,
  [initState: State]
> {
  /**
   * Action for handling field changes, accepts the "value" parameter and
   * applies it to `toState` option.
   */
  change: Action<[Value], Value>

  /** Writable atom with the "value" data, computed by the `fromState` option */
  value: Atom<Value>
}

export interface FieldExtOptions<State = any, Value = State> extends Omit<
  BaseFieldExtOptions<State, Value>,
  'isDirty' | 'initStateAtom' | 'getValue' | 'getNormalizedState'
> {
  /**
   * The callback to filter "value" changes (from the 'change' action). It
   * should return 'false' to skip the update. By default, it always returns
   * `true`.
   */
  filter?: (newValue: Value, prevValue: Value) => boolean

  /**
   * The callback used to determine whether the "value" has changed. By default,
   * it utilizes `isDeepEqual` from reatom/utils.
   */
  isDirty?: (newValue: Value, prevValue: Value) => boolean
}

/** TODO */
export interface TransformableFieldExtOptions<
  State = any,
  Value = State,
> extends FieldExtOptions<State, Value> {
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
}

/**
 * TODO
 *
 * @param options
 */
export function withField<T extends Atom>(
  options?: FieldExtOptions<AtomState<T>, AtomState<T>>,
): (anAtom: T) => T & FieldExt<AtomState<T>, AtomState<T>>

/**
 * TODO
 *
 * @param options
 */
export function withField<T extends Atom, State = AtomState<T>, Value = State>(
  options?: TransformableFieldExtOptions<State, Value>,
): (anAtom: T) => T & FieldExt<State, Value>

/**
 * TODO
 *
 * @param options
 */
export function withField<T extends Atom, State>(
  options?: FieldExtOptions<State, State>,
): (anAtom: T) => T & FieldExt<State, State>

export function withField<T extends Atom, State = AtomState<T>, Value = State>(
  options: TransformableFieldExtOptions<State, Value> = {},
): (anAtom: T) => T & FieldExt<State, Value> {
  return (target) => {
    const {
      filter = () => true,
      fromState = (state) => state as unknown as Value,
      isDirty = (newValue: Value, prevValue: Value) =>
        !isDeepEqual(newValue, prevValue),
      toState = (value) => value as unknown as State,
      validate: validateFn,
      ...restOptions
    } = options

    const name = target.name
    const thisField: FieldAtom<State, Value> = target as any

    const baseField = target.extend(
      withBaseField({
        initStateAtom: atom(() => target(), `${name}.initState`),
        isDirty: (_newState, prevState) =>
          isDirty(value(), fromState(prevState, thisField)),
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

  const value = createAtom(
    { computed: () => fromState(target(), thisField) },
    `${name}.value`,
  )

    const change = action((newValue) => {
      const prevValue = value()
      if (!filter(newValue, prevValue)) return prevValue

      value.set(newValue)

      try {
        target.set(toState(newValue, thisField))
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
}

/** TODO */
export interface FieldOptions<
  State = any,
  Value = State,
> extends FieldExtOptions<State, Value> {
  /** The name of the field and all related atoms and actions. */
  name?: string
}

/** TODO */
export interface TransformableFieldOptions<
  State = any,
  Value = State,
> extends TransformableFieldExtOptions<State, Value> {
  /** The name of the field and all related atoms and actions. */
  name?: string
}

/** TODO */
export interface FieldAtom<State = any, Value = State>
  extends Atom<State>, FieldExt<State, Value> {}

/**
 * TODO
 *
 * @param options
 */
export function reatomField<State, Value = State>(
  initState: State,
  options: TransformableFieldOptions<State, Value>,
): FieldAtom<State, Value>

/**
 * TODO
 *
 * @param options
 */
export function reatomField<State>(
  initState: State extends any[] ? State[number] : State,
  options?: string | FieldOptions<State, State>,
): FieldAtom<State, State>

export function reatomField<State, Value = State>(
  initState: State,
  options:
    | string
    | FieldOptions<State, Value>
    | TransformableFieldOptions<State, Value> = {},
): FieldAtom<State, Value> {
  const { name = named(`${typeof initState}Field`), ...rest } =
    typeof options === 'string' ? { name: options } : options
  return atom(initState, name).extend(
    withField<Atom, State, Value>(
      rest as TransformableFieldOptions<State, Value>,
    ),
  )
}
