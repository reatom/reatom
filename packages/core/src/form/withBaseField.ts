import type { StandardSchemaV1 } from '@standard-schema/spec'

import {
  type AbortExt,
  type Action,
  action,
  type ArrayAtom,
  type AssignerExt,
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

/** TODO */
export type FieldValidateOption<State = any, Value = State> = (meta: {
  state: State
  value: Value
  focus: FieldFocus
  validation: FieldValidation
}) =>
  | FieldValidateOptionResult<State>
  | Promise<FieldValidateOptionResult<State>>

/** TODO */
export type FieldValidateOptionResult<State = any> =
  | string
  | string[]
  | FieldErrorBody
  | FieldErrorBody[]
  | StandardSchemaV1<State>
  | void
  | undefined

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

/** TODO */
export interface BaseFieldExtOptions<
  State = any,
  Value = State,
  InitStateParams extends unknown[] = [initState: State],
  NormalizedState = State,
> {
  /**
   * Optional callback to get value for validation. By default returns the field
   * state.
   */
  getValue?: (state: State) => Value

  /**
   * Optional callback to normalize the state before pass it to callbacks such
   * as `validate` or `isDirty`. By default returns the field state.
   */
  getNormalizedState?: (state: State) => NormalizedState

  /**
   * The callback used to determine whether the state has changed (dirty check).
   * By default, it utilizes `isDeepEqual` from reatom/utils comparing states.
   */
  isDirty?: (newState: NormalizedState, prevState: NormalizedState) => boolean

  /** The callback to validate the field. */
  validate?:
    | FieldValidateOption<NoInfer<NormalizedState>, Value>
    | StandardSchemaV1<NoInfer<NormalizedState>>

  /**
   * Defines if the field is disabled by default.
   *
   * @default false
   */
  disabled?: boolean

  /** Defines a default element reference associated with the field. */
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

  /**
   * Optional custom initState atom. If provided, its setter params will be used
   * for the reset action.
   */
  initStateAtom: Atom<State, InitStateParams>
}

/** TODO */
export interface BaseFieldExt<
  State = any,
  InitStateParams extends unknown[] = [initState: State],
> {
  /** Atom of an object with all related focus statuses. */
  focus: FocusAtom

  /** The initial state of the atom. */
  initState: Atom<State, InitStateParams>

  /** Action to reset the state, the validation, and the focus. */
  reset: Action<[] | InitStateParams, void>

  /** Atom of an object with all related validation statuses. */
  validation: ValidationAtom

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

  __reatomField: true
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

const runValidation = <State, Value = State>({
  validationState: validation,
  state,
  value,
  focus,
  keepErrorDuringValidating,
  validateFn,
  validationAtom,
}: {
  validationAtom: RecordAtom<FieldValidation> & Pick<ValidationAtom, 'errors'>
  validationState: FieldValidation
  state: State
  value: Value
  focus: FieldFocus
  keepErrorDuringValidating: boolean
  validateFn: BaseFieldExtOptions<State, Value>['validate']
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
      const transformResult = (result: FieldValidateOptionResult<State>) => {
        if (!result) return []

        if (typeof result === 'object' && '~standard' in result) {
          let validatonResult = result['~standard'].validate(state)
          return validatonResult instanceof Promise
            ? validatonResult.then(wrap(transformStandardSchemaResult))
            : transformStandardSchemaResult(validatonResult)
        }

        const toFieldError = (error: string | FieldErrorBody): FieldError => {
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
          ? task.then(wrap(transformResult))
          : transformResult(task)
    } else {
      const task = validateFn?.['~standard'].validate(state)

      promise =
        task instanceof Promise
          ? task.then(wrap(transformStandardSchemaResult))
          : transformStandardSchemaResult(task)
    }
  } catch (error) {
    // TODO: abort error might get here, should to handle it properly
    if (isAbort(error)) throw error

    promise = [{ source: 'validation', message: toError(error) }]
  }

  if (promise instanceof Promise) {
    const validationPromise = (async () => {
      try {
        const errors = await wrap(promise)

        validationAtom.errors.set(errors)
        validationAtom.merge({
          triggered: true,
          validating: undefined,
        })

        return { errors }
      } catch (error) {
        if (isAbort(error)) {
          validationAtom.merge({ validating: undefined })
          return { errors: validationAtom.errors() }
        }

        const validationErrors = [
          { source: 'validaton', message: toError(error) },
        ]

        validationAtom.errors.set(validationErrors)
        validationAtom.merge({
          triggered: true,
          validating: undefined,
        })

        return { errors: validationErrors }
      }
    })()

    if (!keepErrorDuringValidating) validationAtom.errors.set([])

    return {
      triggered: true,
      validating: validationPromise,
    }
  }

  validationAtom.errors.set(promise)

  return {
    validating: undefined,
    triggered: true,
  }
}

export const withBaseField =
  <
    Target extends Atom,
    Value = AtomState<Target>,
    InitStateParams extends unknown[] = [initState: AtomState<Target>],
    NormalizedState = AtomState<Target>,
  >(
    options: BaseFieldExtOptions<
      AtomState<Target>,
      Value,
      InitStateParams,
      NormalizedState
    >,
  ): AssignerExt<BaseFieldExt<AtomState<Target>, InitStateParams>, Target> =>
  (target) => {
    const {
      isDirty = (newState: NormalizedState, prevState: NormalizedState) =>
        !isDeepEqual(newState, prevState),
      getValue = (state) => state,
      getNormalizedState = (state) => state,
      validate: validateFn,
      disabled: disabledInit = false,
      elementRef: elementRefInit,
      keepErrorDuringValidating: keepErrorDuringValidatingInit,
      keepErrorOnChange: keepErrorOnChangeInit,
      validateOnChange: validateOnChangeInit,
      validateOnBlur: validateOnBlurInit,
      initStateAtom,
    } = options

    const name = target.name

    const fieldOptions = reatomRecord(
      {
        validateOnChange: validateOnChangeInit,
        validateOnBlur: validateOnBlurInit,
        keepErrorDuringValidating: keepErrorDuringValidatingInit,
        keepErrorOnChange: keepErrorOnChangeInit,
        shouldValidate: undefined as boolean | undefined,
      },
      `${name}._fieldOptions`,
    ).extend((optionsTarget) => ({
      value: computed(() => {
        const {
          validateOnChange,
          validateOnBlur,
          keepErrorDuringValidating,
          keepErrorOnChange,
          shouldValidate,
        } = optionsTarget()

        return {
          validateOnChange: validateOnChange ?? false,
          validateOnBlur: validateOnBlur ?? false,
          keepErrorDuringValidating: keepErrorDuringValidating ?? false,
          keepErrorOnChange: keepErrorOnChange ?? !validateOnChange,
          shouldValidate: shouldValidate ?? !!validateFn,
        }
      }, `${optionsTarget.name}.value`),
    }))

    const disabled = reatomBoolean(disabledInit, `${name}._disabled`).extend(
      withChangeHook((status) => {
        if (!status) validation.trigger()
      }),
    )

    const elementRef = atom(elementRefInit, `${name}.elementRef`)

    // @ts-expect-error access reatom internals
    initStateAtom.__reatom.initState = target.__reatom.initState

    target.extend(
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

    const focus = reatomRecord(fieldInitFocus, `${name}._focus`)
      .extend(
        withActions((focusTarget) => ({
          in: () => focusTarget.merge({ active: true }),
          out: () => focusTarget.merge({ active: false, touched: true }),
        })),
      )
      .extend(
        withComputed((state) => {
          const dirty = isDirty(
            getNormalizedState(target()),
            getNormalizedState(initStateAtom()),
          )
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
          if (!fieldOptions.value().shouldValidate)
            return fieldInitValidationLess

          if (disabled()) return fieldInitValidation

          getValue(target())
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
      )
      .extend((validationTarget) => ({
        trigger: action(() => {
          const validationState = validationTarget()

          if (validationState.triggered) return validationState

          const { shouldValidate, keepErrorDuringValidating } =
            fieldOptions.value()
          if (!shouldValidate)
            return validationTarget.merge({ triggered: true })

          if (typeof validateFn !== 'function') {
            const state = target()
            const propsToMerge = runValidation({
              validateFn,
              validationAtom: validationTarget,
              validationState,
              focus: focus(),
              state: getNormalizedState(state),
              value: getValue(state),
              keepErrorDuringValidating,
            })
            return validationTarget.merge(propsToMerge)
          } else {
            return effect(() => {
              const validationArgs = peek(() => {
                const state = target()
                return {
                  focus: focus(),
                  state: getNormalizedState(state),
                  value: getValue(state),
                  keepErrorDuringValidating:
                    fieldOptions.value().keepErrorDuringValidating,
                }
              })

              const propsToMerge = runValidation({
                validateFn,
                validationAtom: validationTarget,
                validationState,
                ...validationArgs,
              })
              return validationTarget.merge(propsToMerge)
            }, `${validationTarget.name}.trigger.validationEffect`)()
          }
        }, `${validationTarget.name}.trigger`).extend(withAbort()),
      }))
      .extend(
        withActions((validationTarget) => ({
          clearErrors: (...sources: FieldErrorSource[]) => {
            validationTarget.errors.set((errors) =>
              sources.length
                ? errors.filter((e) => !sources.includes(e.source))
                : [],
            )
            return validationTarget()
          },
        })),
      )

    const reset = action((...args: [] | InitStateParams) => {
      target.set(
        args.length
          ? initStateAtom.set(...(args as InitStateParams))
          : initStateAtom(),
      )
      focus.set(fieldInitFocus)

      validation.set(fieldInitValidation)
      validation.trigger.abort('reset')
    }, `${name}._reset`)

    return Object.assign(target, {
      focus,
      initState: initStateAtom,
      reset,
      validation,
      disabled,
      elementRef,
      options: fieldOptions,

      __reatomField: true as const,
    })
  }

export const isFieldAtom = (thing: any): thing is FieldLikeAtom =>
  thing?.__reatomField === true
