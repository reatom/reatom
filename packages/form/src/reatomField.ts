import { 
  type Action, 
  type Atom, 
  AtomState,
  action, 
  atom, 
  named,
  withInit, 
  reatomRecord, 
  type RecordAtom, 
  computed, 
  Computed, 
  withComputed, 
  withCallHook, 
  withChangeHook,
  isCausedBy,
  isDeepEqual,
  withAbort,
  abortVar,
  wrap,
  AbortExt,
  BooleanAtom,
  reatomBoolean,
  AtomLike
} from '@reatom/core'

import { toError } from './utils'

export interface FieldFocus {
  /** The field is focused. */
  active: boolean

  /** The field state is not equal to the initial state. */
  dirty: boolean

  /** The field has ever gained and lost focus. */
  touched: boolean
}

export interface FieldValidation {
  /** The field validation error text. */
  error: undefined | string

  /** The field validation meta. */
  meta: unknown | undefined

  /** The validation actuality status. */
  triggered: boolean

  /** The field async validation status */
  validating: boolean
}

export interface FocusAtom extends AtomLike<FieldFocus> {
  /** Action for handling field focus. */
  in: Action<[], FieldFocus>

  /** Action for handling field blur. */
  out: Action<[], FieldFocus>
}

export interface ValidationAtom extends AtomLike<FieldValidation> {
  /** Action to trigger field validation. */
  trigger: Action<[], FieldValidation> & AbortExt

  /** Action to set an error for the field */
  setError: Action<[error: string], FieldValidation>
}

export interface FieldLikeAtom<State = any> extends Atom<State> {
  __reatomField: true
}

export interface FieldAtom<State = any, Value = State> extends FieldLikeAtom<State> {
  /** Action for handling field changes, accepts the "value" parameter and applies it to `toState` option. */
  change: Action<[Value], Value>

  /** Atom of an object with all related focus statuses. */
  focus: FocusAtom

  /** The initial state of the atom. */
  initState: Atom<State>

  /** Action to reset the state, the value, the validation, and the focus. */
  reset: Action<[], void>

  /** Atom of an object with all related validation statuses. */
  validation: ValidationAtom

  /** Atom with the "value" data, computed by the `fromState` option */
  value: Computed<Value>

  /** Atom that defines if the field is disabled */
  disabled: BooleanAtom

  /**
   * Defines the reset behavior of the validation state during async validation.
   * @default false
   */
  keepErrorDuringValidating: Atom<boolean | undefined>

  /**
   * Defines the reset behavior of the validation state on field change.
   * Useful if the validation is triggered on blur or submit only.
   * @default !validateOnChange
   */
  keepErrorOnChange: Atom<boolean | undefined>

  /**
   * Defines if the validation should be triggered with every field change.
   * @default false
   */
  validateOnChange: Atom<boolean | undefined>

  /**
   * Defines if the validation should be triggered on the field blur.
   * @default false
   */
  validateOnBlur: Atom<boolean | undefined>

  /* @internal */
  shouldValidate: Atom<boolean | undefined>
}

export type FieldValidateOption<State = any, Value = State> = (
  meta: {
    state: State
    value: Value
    focus: FieldFocus
    validation: FieldValidation
  },
) => any

export interface FieldOptions<State = any, Value = State> {
  /**
   * The callback to filter "value" changes (from the 'change' action). It should return 'false' to skip the update.
   * By default, it always returns `true`.
   */
  filter?: (newValue: Value, prevValue: Value) => boolean

  /**
   * The callback to compute the "value" data from the "state" data.
   * By default, it returns the "state" data without any transformations.
   */
  fromState?: (state: State) => Value

  /**
   * The callback used to determine whether the "value" has changed.
   * By default, it utilizes `isDeepEqual` from reatom/utils.
   */
  isDirty?: (newValue: Value, prevValue: Value) => boolean

  /**
   * The name of the field and all related atoms and actions.
   */
  name?: string

  /**
   * The callback to transform the "state" data from the "value" data from the `change` action.
   * By default, it returns the "value" data without any transformations.
   */
  toState?: (value: Value) => State

  /**
   * The callback to validate the field.
   */
  validate?: FieldValidateOption<State, Value>

  /**
   * The callback to validate field contract.
   */
  contract?: (state: State) => unknown

  /**
   * Defines if the field is disabled by default.
   * @default false
   */
  disabled?: boolean

  /**
   * Defines the reset behavior of the validation state during async validation.
   * @default false
   */
  keepErrorDuringValidating?: boolean

  /**
   * Defines the reset behavior of the validation state on field change.
   * Useful if the validation is triggered on blur or submit only.
   * @default !validateOnChange
   */
  keepErrorOnChange?: boolean

  /**
   * Defines if the validation should be triggered with every field change.
   * @default false
   */
  validateOnChange?: boolean

  /**
   * Defines if the validation should be triggered on the field blur.
   * @default false
   */
  validateOnBlur?: boolean
}

export const fieldInitFocus: FieldFocus = {
  active: false,
  dirty: false,
  touched: false,
}

export const fieldInitValidation: FieldValidation = {
  error: undefined,
  meta: undefined,
  triggered: false,
  validating: false,
}

export const fieldInitValidationLess: FieldValidation = {
  error: undefined,
  meta: undefined,
  triggered: true,
  validating: false,
}

export function reatomField<State, Value = State>(
  _initState: State,
  options: string | FieldOptions<State, Value>,
): FieldAtom<State, Value>;

/** @internal */
export function reatomField<State, A extends Atom<State>, Value = State>(
  _initState: State,
  options: string | FieldOptions<State, Value>,
  stateAtom: A
): A & FieldAtom<State, Value>;

export function reatomField<State, Value = State>(
  _initState: State,
  options: string | FieldOptions<State, Value> = {},
  stateAtom?: Atom<State>
): FieldAtom<State, Value> {
  interface This extends FieldAtom<State, Value> { }

  const {
    filter = () => true,
    fromState = (state) => state as unknown as Value,
    isDirty = (newValue, prevValue) => !isDeepEqual(newValue, prevValue),
    name = named(`${typeof _initState}Field`),
    toState = (value) => value as unknown as State,
    validate: validateFn,
    contract,
    ...restOptions
  } = typeof options === 'string' ? ({ name: options } as FieldOptions<State, Value>) : options

	const validateOnBlur = atom(restOptions.validateOnBlur, `${name}.validateOnBlur`).extend(
    target => ({ value: computed(() => target() ?? false, `${target.name}.value`) })
  )

	const validateOnChange = atom(restOptions.validateOnChange, `${name}.validateOnChange`).extend(
    target => ({ value: computed(() => target() ?? false, `${target.name}.value`) })
  )

	const keepErrorDuringValidating = atom(restOptions.keepErrorDuringValidating, `${name}.keepErrorDuringValidating`).extend(
    target => ({ value: computed(() => target() ?? false, `${target.name}.value`) })
  )

	const keepErrorOnChange = atom(restOptions.keepErrorOnChange, `${name}.keepErrorOnChange`).extend(
    target => ({ value: computed(() => target() ?? !validateOnChange.value(), `${target.name}.value`) })
  )

	const shouldValidate = atom<boolean | undefined>(undefined, `${name}.shouldValidate`).extend(
    target => ({ value: computed(() => target() ?? !!(validateFn || contract), `${target.name}.value`) })
  )

  const disabled = reatomBoolean(restOptions.disabled ?? false, `${name}.disabled`).extend(
    withChangeHook((status) => {
      if(!status)
        validation.trigger()
    })
  )

  const field = stateAtom ?? atom(_initState, `${name}.field`)
  const initState = atom(_initState, `${name}.initState`)
  // TODO: make sure it's ok to copy initState of other atom. 
  // We need to extract initial state from `field` atom here and pass it to `initState` atom
  // @ts-expect-error access to private field
  initState.__reatom.initState = field.__reatom.initState
  
  field.extend(
    withChangeHook(() => {
      if(isCausedBy(reset))
        return

      validation.trigger.abort('change')

      validation.merge(
        keepErrorOnChange.value() 
          ? { validating: false, triggered: false }
          : { validating: false, triggered: false, error: undefined }
      ) 

      if (!disabled() && validateOnChange.value())
        validation.trigger()
    }),
  )

  const value: This['value'] = computed(() => fromState(field()), `${name}.value`)

  const focus = reatomRecord(fieldInitFocus, `${name}.focus`)
    .actions((target) => ({
      in: () => target.merge({ active: true }),
      out: () => target.merge({ active: false, touched: true })
    }))
    .extend(
      withComputed((state) => {
        const dirty = isDirty(value(), fromState(initState()))
        return state.dirty === dirty ? state : { ...state, dirty }
      })
    ) 

  focus.out.extend(
    withCallHook(() => {
      if (!disabled() && validateOnBlur.value())
        validation.trigger()
    })
  )

  const validation = reatomRecord(
    fieldInitValidationLess, `${name}.validation`
  ).extend(
    withInit(() => shouldValidate.value() ? fieldInitValidation : fieldInitValidationLess),
    withComputed((state) => {
      if(!shouldValidate.value()) 
        return fieldInitValidationLess

      if(disabled())
        return fieldInitValidation

      value()
      return state.triggered ? { ...state, triggered: false } : state
    }),
    target => ({
      trigger: action(() => {
        const validationValue = target()
    
        if (validationValue.triggered) 
          return validationValue
    
        if (!shouldValidate.value()) 
          return target.merge({ triggered: true })
    
        let promise: any
        let message: undefined | string
        const state = field()
    
        try {
          contract?.(state)
          promise = validateFn?.({
            state,
            value: value(),
            focus: focus(),
            validation: validationValue,
          })
        } catch (error) {
          message = toError(error)
        }
    
        if (promise instanceof Promise) {
          promise
            .then(wrap(() => {
              if (abortVar.read()?.()) 
                return
    
              target.merge({
                error: undefined,
                meta: undefined,
                triggered: true,
                validating: false,
              })
            }))
            .catch(wrap((error) => {
              if (abortVar.read()?.()) 
                return
    
              target.merge({
                error: toError(error),
                meta: undefined,
                triggered: true,
                validating: false,
              })
            }))
    
          return target.merge({
            error: keepErrorDuringValidating.value() ? validationValue.error : undefined,
            meta: undefined,
            triggered: true,
            validating: true,
          })
        }
    
        return target.merge({
          validating: false,
          error: message,
          meta: undefined,
          triggered: true,
        })
      }, `${target.name}.validation.trigger`).extend(withAbort()),
    }),
  ).actions(target => ({
    setError: (error: string) => {
      target.trigger.abort('setError');

      return target.merge({
        error,
        meta: undefined,
        triggered: true,
        validating: false,
      });
    }
  }))

  const change: This['change'] = action((newValue) => {
    const prevValue = value()
    if (!filter(newValue, prevValue)) 
      return prevValue

    field(toState(newValue))
    focus.merge({ touched: true })

    return value()
  }, `${name}.change`)

  const reset: This['reset'] = action(() => {
    field(initState())
    focus(fieldInitFocus)

    validation(fieldInitValidation)
    validation.trigger.abort('reset');
  }, `${name}.reset`)

  return Object.assign(field, {
    change,
    focus,
    initState,
    reset,
    validation,
    value,
    disabled,
    keepErrorDuringValidating,
    keepErrorOnChange,
    validateOnChange,
    validateOnBlur,
    shouldValidate,

    __reatomField: true as const
  })
}

export const withField = <T extends Atom, Value = AtomState<T>>(
  options: Omit<FieldOptions<AtomState<T>, Value>, 'name'> = {}
): ((anAtom: T) => T & FieldAtom<AtomState<T>, Value>) => {
  return (anAtom: T) => reatomField(null as AtomState<T>, { name: anAtom.name, ...options }, anAtom)
}

export const isFieldAtom = (thing: any): thing is FieldLikeAtom => thing?.__reatomField === true
