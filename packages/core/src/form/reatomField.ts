import type { StandardSchemaV1 } from '@standard-schema/spec'

import {
  type AbortExt,
  type Action,
  action,
  type Atom,
  atom,
  type AtomLike,
  type AtomState,
  type BooleanAtom,
  type Computed,
  computed,
  isAbort,
  isCausedBy,
  isDeepEqual,
  named,
  reatomBoolean,
  reatomRecord,
  type Rec,
  type RecordAtom,
  withAbort,
  withCallHook,
  withChangeHook,
  withComputed,
  withInit,
  wrap,
} from '../'
import { toError } from './utils'

export interface FieldFocus {
  /** The field is focused. */
  active: boolean

  /** The field state is not equal to the initial state. */
  dirty: boolean

  /** The field has ever gained and lost focus. */
  touched: boolean
}

export interface FieldErrorBody<Meta = any> {
  /** The message of the error useful for a user. */
  message: string
  /**
   * The record with arbitrary information about the error like minimum chars,
   * upper bound of a number, etc.
   */
  meta?: Rec<Meta>
}

export type FieldErrorSource = 'validation' | (string & {})

export interface FieldError<Meta = any> extends FieldErrorBody<Meta> {
  /**
   * The type of an error source. The value will be `validation` if the error
   * occurred due to the `validate` function.
   */
  source: FieldErrorSource
}

export interface FieldValidation {
  /** The list of field validation errors. */
  errors: FieldError[]

  /** The field validation meta. */
  meta: unknown | undefined

  /** The validation actuality status. */
  triggered: boolean

  /** The field async validation status. */
  validating: undefined | Promise<{ errors: FieldError[] }>
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

  /** Action to prepend some errors to the field. */
  prependErrors: Action<[...error: FieldError[]], FieldValidation>

  /** Action to clear all errors by passed sources. */
  clearErrors: Action<[...sources: FieldErrorSource[]], FieldValidation>
}

export interface FieldElementRef {
  focus: (options?: { preventScroll?: boolean }) => void
}

export interface FieldLikeAtom<State = any> extends Atom<State> {
  __reatomField: true
}

export interface FieldAtom<State = any, Value = State>
  extends FieldLikeAtom<State> {
  /**
   * Action for handling field changes, accepts the "value" parameter and
   * applies it to `toState` option.
   */
  change: Action<[Value], Value>

  /** Atom of an object with all related focus statuses. */
  focus: FocusAtom

  /** The initial state of the atom. */
  initState: Atom<State>

  /** Action to reset the state, the value, the validation, and the focus. */
  reset: Action<[] | [initState: State], void>

  /** Atom of an object with all related validation statuses. */
  validation: ValidationAtom

  /** Atom with the "value" data, computed by the `fromState` option */
  value: Computed<Value>

  /** Atom that defines if the field is disabled */
  disabled: BooleanAtom

  /** Atom with the reference to the field element. */
  elementRef: Atom<FieldElementRef | undefined>

  options: RecordAtom<{
    /**
     * Defines the reset behavior of the validation state during async
     * validation.
     *
     * @default false
     */
    keepErrorDuringValidating: boolean | undefined

    /**
     * Defines the reset behavior of the validation state on field change.
     * Useful if the validation is triggered on blur or submit only.
     *
     * @default !validateOnChange
     */
    keepErrorOnChange: boolean | undefined

    /**
     * Defines if the validation should be triggered with every field change.
     *
     * @default false
     */
    validateOnChange: boolean | undefined

    /**
     * Defines if the validation should be triggered on the field blur.
     *
     * @default false
     */
    validateOnBlur: boolean | undefined

    shouldValidate: boolean | undefined
  }>
}

export type FieldValidateOption<State = any, Value = State> = (meta: {
  state: State
  value: Value
  focus: FieldFocus
  validation: FieldValidation
}) => FieldValidateOptionResult | Promise<FieldValidateOptionResult>

export type FieldValidateOptionResult =
  | string
  | string[]
  | FieldErrorBody
  | FieldErrorBody[]
  | void
  | undefined

export interface FieldOptions<State = any, Value = State> {
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
  fromState?: (state: State) => Value

  /**
   * The callback used to determine whether the "value" has changed. By default,
   * it utilizes `isDeepEqual` from reatom/utils.
   */
  isDirty?: (newValue: Value, prevValue: Value) => boolean

  /** The name of the field and all related atoms and actions. */
  name?: string

  /**
   * The callback to transform the "state" data from the "value" data from the
   * `change` action. By default, it returns the "value" data without any
   * transformations.
   */
  toState?: (value: Value) => State

  /** The callback to validate the field. */
  validate?: FieldValidateOption<State, Value> | StandardSchemaV1<State>

  /**
   * Defines if the field is disabled by default.
   *
   * @default false
   */
  disabled?: boolean

  /** Defines a default element reference accosiated with the field. */
  elementRef?: FieldElementRef

  /**
   * Defines the reset behavior of the validation state during async validation.
   *
   * @default false
   */
  keepErrorDuringValidating?: boolean

  /**
   * Defines the reset behavior of the validation state on field change. Useful
   * if the validation is triggered on blur or submit only.
   *
   * @default !validateOnChange
   */
  keepErrorOnChange?: boolean

  /**
   * Defines if the validation should be triggered with every field change.
   *
   * @default false
   */
  validateOnChange?: boolean

  /**
   * Defines if the validation should be triggered on the field blur.
   *
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
  errors: [],
  meta: undefined,
  triggered: false,
  validating: undefined,
}

export const fieldInitValidationLess: FieldValidation = {
  errors: [],
  meta: undefined,
  triggered: true,
  validating: undefined,
}

export function reatomField<State, Value = State>(
  _initState: State,
  options: string | FieldOptions<State, Value>,
): FieldAtom<State, Value>

export function reatomField<State, A extends Atom<State>, Value = State>(
  _initState: State,
  options: string | FieldOptions<State, Value>,
  stateAtom: A,
): A & FieldAtom<State, Value>

export function reatomField<State, Value = State>(
  _initState: State,
  options: string | FieldOptions<State, Value> = {},
  stateAtom?: Atom<State>,
): FieldAtom<State, Value> {
  interface This extends FieldAtom<State, Value> {}

  const {
    filter = () => true,
    fromState = (state) => state as unknown as Value,
    isDirty = (newValue, prevValue) => !isDeepEqual(newValue, prevValue),
    name = named(`${typeof _initState}Field`),
    toState = (value) => value as unknown as State,
    validate: validateFn,
    ...restOptions
  } = typeof options === 'string'
    ? ({ name: options } as FieldOptions<State, Value>)
    : options

  const fieldOptions = reatomRecord({
    validateOnChange: restOptions.validateOnChange,
    validateOnBlur: restOptions.validateOnBlur,
    keepErrorDuringValidating: restOptions.keepErrorDuringValidating,
    keepErrorOnChange: restOptions.keepErrorOnChange,
    shouldValidate: undefined as boolean | undefined,
  }).extend((target) => ({
    value: computed(() => {
      const {
        validateOnChange,
        validateOnBlur,
        keepErrorDuringValidating,
        keepErrorOnChange,
        shouldValidate,
      } = target()

      return {
        validateOnChange: validateOnChange ?? false,
        validateOnBlur: validateOnBlur ?? false,
        keepErrorDuringValidating: keepErrorDuringValidating ?? false,
        keepErrorOnChange: keepErrorOnChange ?? !validateOnChange,
        shouldValidate: shouldValidate ?? !!validateFn,
      }
    }, `${target.name}.value`),
  }))

  const disabled = reatomBoolean(
    restOptions.disabled ?? false,
    `${name}.disabled`,
  ).extend(
    withChangeHook((status) => {
      if (!status) validation.trigger()
    }),
  )

  const elementRef = atom(restOptions.elementRef, `${name}.elementRef`)

  const field = stateAtom ?? atom(_initState, `${name}.field`)
  const initState = atom(_initState, `${name}.initState`)
  // TODO: make sure it's ok to copy initState of other atom.
  // We need to extract initial state from `field` atom here and pass it to `initState` atom
  // @ts-expect-error access to private field
  initState.__reatom.initState = field.__reatom.initState

  field.extend(
    withChangeHook(() => {
      if (isCausedBy(reset)) return

      validation.trigger.abort('change')

      const { keepErrorOnChange, validateOnChange } = fieldOptions.value()

      validation.merge(
        keepErrorOnChange
          ? { validating: undefined }
          : { validating: undefined, errors: [] },
      )

      if (!disabled() && validateOnChange) validation.trigger()
    }),
  )

  const value: This['value'] = computed(
    () => fromState(field()),
    `${name}.value`,
  )

  const focus = reatomRecord(fieldInitFocus, `${name}.focus`)
    .actions((target) => ({
      in: () => target.merge({ active: true }),
      out: () => target.merge({ active: false, touched: true }),
    }))
    .extend(
      withComputed((state) => {
        const dirty = isDirty(value(), fromState(initState()))
        return state.dirty === dirty ? state : { ...state, dirty }
      }),
    )

  focus.out.extend(
    withCallHook(() => {
      if (!disabled() && fieldOptions.value().validateOnBlur)
        validation.trigger()
    }),
  )

  const validation = reatomRecord(fieldInitValidationLess, `${name}.validation`)
    .extend(
      withInit(() =>
        fieldOptions.value().shouldValidate
          ? fieldInitValidation
          : fieldInitValidationLess,
      ),
      withComputed((state) => {
        if (!fieldOptions.value().shouldValidate) return fieldInitValidationLess

        if (disabled()) return fieldInitValidation

        value()
        return state.triggered ? { ...state, triggered: false } : state
      }),
      (target) => ({
        trigger: action(() => {
          const validationValue = target()

          if (validationValue.triggered) return validationValue

          const { shouldValidate, keepErrorDuringValidating } =
            fieldOptions.value()
          if (!shouldValidate) return target.merge({ triggered: true })

          let promise
          const state = field()

          try {
            if (typeof validateFn == 'function') {
              const transformResult = (result: FieldValidateOptionResult) => {
                if (!result) return []

                const toFieldError = (
                  error: string | FieldErrorBody,
                ): FieldError =>
                  typeof error == 'string'
                    ? { source: 'validation', message: error }
                    : Object.assign({ source: 'validation' }, error)

                return Array.isArray(result)
                  ? result.map(toFieldError)
                  : [toFieldError(result)]
              }

              const task = validateFn({
                state,
                value: value(),
                focus: focus(),
                validation: validationValue,
              })

              promise =
                task instanceof Promise
                  ? task.then(transformResult)
                  : transformResult(task)
            } else {
              const task = validateFn?.['~standard'].validate(state)
              const transformResult = (
                result: StandardSchemaV1.Result<State> | undefined,
              ) => {
                if (!result?.issues?.length) return []

                return result.issues.map((issue) => ({
                  source: 'validation',
                  message: issue.message,
                  meta: undefined,
                }))
              }

              promise =
                task instanceof Promise
                  ? task.then(transformResult)
                  : transformResult(task)
            }
          } catch (error) {
            promise = [{ source: 'validation', message: toError(error) }]
          }

          if (promise instanceof Promise) {
            const validationPromise = (async () => {
              try {
                const errors = await wrap(promise)
                target.merge({
                  errors,
                  meta: undefined,
                  triggered: true,
                  validating: undefined,
                })
                return { errors }
              } catch (error) {
                if (isAbort(error)) return { errors: target().errors }
                const validation = target.merge({
                  errors: [
                    {
                      source: 'validaton',
                      message: toError(error),
                    },
                  ],
                  meta: undefined,
                  triggered: true,
                  validating: undefined,
                })
                return { errors: validation.errors }
              }
            })()

            return target.merge({
              errors: keepErrorDuringValidating ? validationValue.errors : [],
              meta: undefined,
              triggered: true,
              validating: validationPromise,
            })
          }

          return target.merge({
            validating: undefined,
            errors: promise,
            meta: undefined,
            triggered: true,
          })
        }, `${target.name}.trigger`).extend(withAbort()),
      }),
    )
    .actions((target) => ({
      prependErrors: (...errors: FieldError[]) => {
        if (!errors.length) return target()
        return target.merge({ errors: [...errors, ...target().errors] })
      },
      clearErrors: (...sources: FieldErrorSource[]) => {
        if (!sources.length) return target.merge({ errors: [] })
        return target.merge({
          errors: target().errors.filter((e) => !sources.includes(e.source)),
        })
      },
    }))

  const change: This['change'] = action((newValue) => {
    const prevValue = value()
    if (!filter(newValue, prevValue)) return prevValue

    field.set(toState(newValue))
    focus.merge({ touched: true })

    return value()
  }, `${name}.change`)

  const reset: This['reset'] = action((...args) => {
    field.set(args.length ? initState.set(args[0]) : initState())
    focus.set(fieldInitFocus)

    validation.set(fieldInitValidation)
    validation.trigger.abort('reset')
  }, `${name}.reset`)

  return Object.assign(field, {
    change,
    focus,
    initState,
    reset,
    validation,
    value,
    disabled,
    elementRef,
    options: fieldOptions,

    __reatomField: true as const,
  })
}

export const withField = <T extends Atom, Value = AtomState<T>>(
  options: Omit<FieldOptions<AtomState<T>, Value>, 'name'> = {},
): ((anAtom: T) => T & FieldAtom<AtomState<T>, Value>) => {
  return (anAtom: T) =>
    reatomField(null as AtomState<T>, { name: anAtom.name, ...options }, anAtom)
}

export const isFieldAtom = (thing: any): thing is FieldLikeAtom =>
  thing?.__reatomField === true
