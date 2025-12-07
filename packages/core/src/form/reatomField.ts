import type { StandardSchemaV1 } from '@standard-schema/spec'

import {
  type AbortExt,
  type Action,
  action,
  type ArrayAtom,
  type Atom,
  atom,
  type AtomLike,
  type AtomState,
  type BooleanAtom,
  computed,
  effect,
  isAbort,
  isCausedBy,
  isDeepEqual,
  named,
  peek,
  reatomArray,
  reatomBoolean,
  reatomRecord,
  type Rec,
  type RecordAtom,
  withAbort,
  withActions,
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
  /** Message of the first validation error, computed from errors atom */
  error: undefined | string

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

  /** Full list of all errors related to the field */
  errors: ArrayAtom<FieldError>

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

  /** Writable atom with the "value" data, computed by the `fromState` option */
  value: Atom<Value>

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
}) =>
  | FieldValidateOptionResult<State>
  | Promise<FieldValidateOptionResult<State>>

export type FieldValidateOptionResult<State = any> =
  | string
  | string[]
  | FieldErrorBody
  | FieldErrorBody[]
  | StandardSchemaV1<State>
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
  fromState?: (state: State, self: FieldAtom<State, Value>) => Value

  /**
   * The callback to transform the "state" data from the "value" data from the
   * `change` action. By default, it returns the "value" data without any
   * transformations.
   * 
   * It's also possible to abort the computation and left the state unchaged
   * by throwing abort error inside the callback
   * 
   * @example
   * const numberField = reatomField(0, {
   *  fromState: (state) => state.toString(),
   *  toState: (value: string) => {
   *    const parsed = Number(value)
   *    return isNaN(parsed) ? throwAbort() : parsed
   *  }
   * });
   */
  toState?: (value: Value, self: FieldAtom<State, Value>) => State

  /**
   * The callback used to determine whether the "value" has changed. By default,
   * it utilizes `isDeepEqual` from reatom/utils.
   */
  isDirty?: (newValue: Value, prevValue: Value) => boolean

  /** The name of the field and all related atoms and actions. */
  name?: string

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

export interface TransformableFieldOptions<State, Value> extends 
  Omit<FieldOptions<State, Value>, 'fromState' | 'toState'> {
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

export const fieldInitFocus: FieldFocus = {
  active: false,
  dirty: false,
  touched: false,
}

export const fieldInitValidation: FieldValidation = {
  error: undefined,
  triggered: false,
  validating: undefined,
}

export const fieldInitValidationLess: FieldValidation = {
  error: undefined,
  triggered: true,
  validating: undefined,
}

export function reatomField<State>(
  _initState: State,
  options?: string | FieldOptions<State, State>,
): FieldAtom<State, State>

export function reatomField<State, Value>(
  _initState: State,
  options: TransformableFieldOptions<State, Value>,
): FieldAtom<State, Value>

export function reatomField<State, A extends Atom<State>, Value = State>(
  _initState: State,
  options: string | FieldOptions<State, Value>,
  stateAtom: A,
): A & FieldAtom<State, Value>

export function reatomField<State, Value = State>(
  _initState: State,
  options: string | FieldOptions<State, Value> | TransformableFieldOptions<State, Value> = {},
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

  const fieldOptions = reatomRecord(
    {
      validateOnChange: restOptions.validateOnChange,
      validateOnBlur: restOptions.validateOnBlur,
      keepErrorDuringValidating: restOptions.keepErrorDuringValidating,
      keepErrorOnChange: restOptions.keepErrorOnChange,
      shouldValidate: undefined as boolean | undefined,
    },
    `${name}._fieldOptions`,
  ).extend((target) => ({
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
    `${name}._disabled`,
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
      if (isCausedBy(reset, 1)) return

      focus.merge({ touched: true })
      validation.trigger.abort('change')

      const { keepErrorOnChange, validateOnChange } = fieldOptions.value()

      if (!keepErrorOnChange) validation.errors.set([])

      validation.merge({ validating: undefined })

      if (!disabled() && validateOnChange) validation.trigger()
    }),
  )

  const value: This['value'] = atom(
    () => fromState(field(), field as This),
    `${name}.value`,
  ).extend(withComputed(() => fromState(field(), field as This)))

  const focus = reatomRecord(fieldInitFocus, `${name}._focus`)
    .extend(
      withActions((target) => ({
        in: () => target.merge({ active: true }),
        out: () => target.merge({ active: false, touched: true }),
      })),
    )
    .extend(
      withComputed((state) => {
        const dirty = isDirty(value(), fromState(initState(), field as This))
        return state.dirty === dirty ? state : { ...state, dirty }
      }),
    )

  focus.out.extend(
    withCallHook(() => {
      if (!disabled() && fieldOptions.value().validateOnBlur)
        validation.trigger()
    }),
  )

  const validation = reatomRecord(
    fieldInitValidationLess,
    `${name}._validation`,
  )
    .extend(
      withInit(() =>
        fieldOptions.value().shouldValidate
          ? fieldInitValidation
          : fieldInitValidationLess,
      ),
      withComputed((state): FieldValidation => {
        if (!fieldOptions.value().shouldValidate) return fieldInitValidationLess

        if (disabled()) return fieldInitValidation

        value()
        const firstError = peek(validation.errors)[0]?.message
        return state.triggered
          ? { ...state, error: firstError, triggered: false }
          : { ...state, error: firstError }
      }),
      () => ({
        errors: reatomArray<FieldError>([], `${name}.errors`).extend(
          withChangeHook((errors) =>
            validation.merge({ error: errors[0]?.message }),
          ),
        ),
      }),
      (target) => ({
        runValidation: ({
          validation,
          state,
          value,
          focus,
          keepErrorDuringValidating,
        }: {
          validation: FieldValidation
          state: State
          value: Value
          focus: FieldFocus
          keepErrorDuringValidating: boolean
        }) => {
          let promise

          const transformStandardSchemaResult = (
            result: StandardSchemaV1.Result<State> | undefined,
          ) => {
            if (!result?.issues?.length) return []

            return result.issues.map((issue) => ({
              source: 'validation',
              message: issue.message,
              meta: undefined,
            }))
          }

          try {
            if (typeof validateFn == 'function') {
              const transformResult = (
                result: FieldValidateOptionResult<State>,
              ) => {
                if (!result) return []

                if (typeof result === 'object' && '~standard' in result) {
                  let validatonResult = result['~standard'].validate(state)
                  return validatonResult instanceof Promise
                    ? validatonResult.then(transformStandardSchemaResult)
                    : transformStandardSchemaResult(validatonResult)
                }

                const toFieldError = (
                  error: string | FieldErrorBody,
                ): FieldError => {
                  return typeof error == 'string'
                    ? { source: 'validation', message: error }
                    : Object.assign({ source: 'validation' }, error)
                }

                return Array.isArray(result)
                  ? result.map(toFieldError)
                  : [toFieldError(result)]
              }

              const task = validateFn({
                state,
                value,
                focus,
                validation,
              })

              promise =
                task instanceof Promise
                  ? task.then(transformResult)
                  : transformResult(task)
            } else {
              const task = validateFn?.['~standard'].validate(state)

              promise =
                task instanceof Promise
                  ? task.then(transformStandardSchemaResult)
                  : transformStandardSchemaResult(task)
            }
          } catch (error) {
            promise = [{ source: 'validation', message: toError(error) }]
          }

          if (promise instanceof Promise) {
            const validationPromise = (async () => {
              try {
                const errors = await wrap(promise)

                target.errors.set(errors)
                target.merge({
                  triggered: true,
                  validating: undefined,
                })

                return { errors }
              } catch (error) {
                if (isAbort(error)) return { errors: target.errors() }

                const validationErrors = [
                  { source: 'validaton', message: toError(error) },
                ]

                target.errors.set(validationErrors)
                target.merge({
                  triggered: true,
                  validating: undefined,
                })

                return { errors: validationErrors }
              }
            })()

            if (!keepErrorDuringValidating) target.errors.set([])

            return {
              triggered: true,
              validating: validationPromise,
            }
          }

          target.errors.set(promise)

          return {
            validating: undefined,
            triggered: true,
          }
        },
      }),
    )
    .extend((target) => ({
      trigger: action(() => {
        const validation = target()

        if (validation.triggered) return validation

        const { shouldValidate, keepErrorDuringValidating } =
          fieldOptions.value()
        if (!shouldValidate) return target.merge({ triggered: true })

        if (typeof validateFn !== 'function') {
          const propsToMerge = target.runValidation({
            validation,
            focus: focus(),
            state: field(),
            value: value(),
            keepErrorDuringValidating,
          })
          return target.merge(propsToMerge)
        } else {
          return effect(() => {
            const propsToMerge = target.runValidation({
              state: peek(field),
              validation,
              focus: peek(focus),
              value: peek(value),
              keepErrorDuringValidating,
            })
            return target.merge(propsToMerge)
          }, `${target.name}.trigger.validationEffect`)()
        }
      }, `${target.name}.trigger`).extend(withAbort()),
    }))
    .extend(
      withActions((target) => ({
        clearErrors: (...sources: FieldErrorSource[]) => {
          target.errors.set((errors) =>
            sources.length
              ? errors.filter((e) => !sources.includes(e.source))
              : [],
          )
          return target()
        },
      })),
    )

  const change: This['change'] = action((newValue) => {
    const prevValue = value()
    if (!filter(newValue, prevValue)) return prevValue

    value.set(newValue)

    try {
      field.set(toState(newValue, field as This))
    }
    catch (error) {
      if(!isAbort(error))
        throw error
    }
    return newValue
  }, `${name}._change`)

  const reset: This['reset'] = action((...args) => {
    field.set(args.length ? initState.set(args[0]) : initState())
    focus.set(fieldInitFocus)

    validation.set(fieldInitValidation)
    validation.trigger.abort('reset')
  }, `${name}._reset`)

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

export function withField<T extends Atom>(
  options?: Omit<FieldOptions<AtomState<T>, AtomState<T>>, 'name'>,
): (anAtom: T) => T & FieldAtom<AtomState<T>, AtomState<T>>

export function withField<T extends Atom, Value>(
  options?: Omit<TransformableFieldOptions<AtomState<T>, Value>, 'name'>,
): (anAtom: T) => T & FieldAtom<AtomState<T>, Value>

export function withField<T extends Atom, Value = AtomState<T>>(
  options: Omit<FieldOptions<AtomState<T>, Value>, 'name'> = {},
): (anAtom: T) => T & FieldAtom<AtomState<T>, Value> {
  return (anAtom: T) =>
    reatomField(null as AtomState<T>, { name: anAtom.name, ...options }, anAtom)
}

export const isFieldAtom = (thing: any): thing is FieldLikeAtom =>
  thing?.__reatomField === true
