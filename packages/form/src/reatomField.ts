import {
  type Action,
  type Atom,
  type AtomMut,
  AtomState,
  type Ctx,
  CtxSpy,
  Rec,
  __count,
  action,
  atom,
} from '@reatom/core'
import {
  __thenReatomed,
  abortCauseContext,
  isCausedBy,
  withAbortableSchedule,
} from '@reatom/effects'
import {
  ArrayAtom,
  BooleanAtom,
  type RecordAtom,
  reatomArray,
  reatomBoolean,
  reatomRecord,
  withAssign,
} from '@reatom/primitives'
import { isAbort, isDeepEqual, toAbortError } from '@reatom/utils'

import { toError } from './utils'
import { AsyncCtx } from '@reatom/async'
import { StandardSchemaV1 } from '@standard-schema/spec'

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
  /** The record with arbitrary information about the error like minimum chars, upper bound of a number, etc. */
  meta?: Rec<Meta>
}

export type FieldErrorSource = 'validation' | (string & {})

export interface FieldError<Meta = any> extends FieldErrorBody<Meta> {
  /** The type of an error source. The value will be `validation` if the error occurred due to the `validate` function. */
  source: FieldErrorSource
}

export interface FieldValidation {
  /** Message of the first validation error. */
  error: undefined | string

  /** The validation actuality status. */
  triggered: boolean

  /** The field async validation status. */
  validating: undefined | Promise<{ errors: FieldError[] }>
}

export interface FocusAtom extends Atom<FieldFocus> {
  /** Action for handling field focus. */
  in: Action<[], FieldFocus>

  /** Action for handling field blur. */
  out: Action<[], FieldFocus>
}

export interface ValidationAtom extends Atom<FieldValidation> {
  /** Action to trigger field validation. */
  trigger: Action<[], FieldValidation> & { abort: Action<[reason?: any], void> }

  /** Writable computed for errors from validation atom */
  errors: ArrayAtom<FieldError>

  /** Action to clear all errors by passed sources. */
  clearErrors: Action<[...sources: FieldErrorSource[]], FieldValidation>
}

export interface FieldElementRef {
  focus: (options?: { preventScroll?: boolean }) => void
}

export interface FieldLikeAtom<State = any> extends AtomMut<State> {
  __reatomField: true
}

export interface FieldAtom<State = any, Value = State>
  extends FieldLikeAtom<State> {
  /** Action for handling field changes, accepts the "value" parameter and applies it to `toState` option. */
  change: Action<[Value], Value>

  /** Atom of an object with all related focus statuses. */
  focus: FocusAtom

  /** The initial state of the atom. */
  initState: AtomMut<State>

  /** Action to reset the state, the value, the validation, and the focus. */
  reset: Action<[] | [initState: State], void>

  /** Atom of an object with all related validation statuses. */
  validation: ValidationAtom

  /** Atom with the "value" data, computed by the `fromState` option */
  value: Atom<Value>

  /** Atom that defines if the field is disabled */
  disabled: BooleanAtom

  /** Atom with the reference to the field element. */
  elementRef: AtomMut<FieldElementRef | undefined>

  options: RecordAtom<{
    /**
     * Defines the reset behavior of the validation state during async validation.
     * @default false
     */
    keepErrorDuringValidating: boolean | undefined

    /**
     * Defines the reset behavior of the validation state on field change.
     * Useful if the validation is triggered on blur or submit only.
     * @default !validateOnChange
     */
    keepErrorOnChange: boolean | undefined

    /**
     * Defines if the validation should be triggered with every field change.
     * @default false
     */
    validateOnChange: boolean | undefined

    /**
     * Defines if the validation should be triggered on the field blur.
     * @default false
     */
    validateOnBlur: boolean | undefined

    /* @internal */
    shouldValidate: boolean | undefined
  }>
}

export type FieldValidateOption<State = any, Value = State> = (
  ctx: AsyncCtx,
  meta: {
    state: State
    value: Value
    focus: FieldFocus
    validation: FieldValidation
  },
) => FieldValidateOptionResult | Promise<FieldValidateOptionResult>

export type FieldValidateOptionResult =
  | string
  | string[]
  | FieldErrorBody
  | FieldErrorBody[]
  | void
  | undefined

export interface FieldOptions<State = any, Value = State> {
  /**
   * The callback to filter "value" changes (from the 'change' action). It should return 'false' to skip the update.
   * By default, it always returns `true`.
   */
  filter?: (ctx: Ctx, newValue: Value, prevValue: Value) => boolean

  /**
   * The callback to compute the "value" data from the "state" data.
   * By default, it returns the "state" data without any transformations.
   */
  fromState?: (ctx: CtxSpy, state: State) => Value

  /**
   * The callback used to determine whether the "value" has changed.
   * By default, it utilizes `isDeepEqual` from reatom/utils.
   */
  isDirty?: (ctx: Ctx, newValue: Value, prevValue: Value) => boolean

  /**
   * The name of the field and all related atoms and actions.
   */
  name?: string

  /**
   * The callback to transform the "state" data from the "value" data from the `change` action.
   * By default, it returns the "value" data without any transformations.
   */
  toState?: (ctx: Ctx, value: Value) => State

  /**
   * The callback to validate the field.
   */
  validate?: FieldValidateOption<State, Value> | StandardSchemaV1<State>

  /**
   * Defines if the field is disabled by default.
   * @default false
   */
  disabled?: boolean

  /**
   * Defines a default element reference accosiated with the field.
   */
  elementRef?: FieldElementRef

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
  triggered: false,
  validating: undefined,
}

export const fieldInitValidationLess: FieldValidation = {
  error: undefined,
  triggered: true,
  validating: undefined,
}

export function reatomField<State, Value = State>(
  _initState: State,
  options: string | FieldOptions<State, Value>,
): FieldAtom<State, Value>

/** @internal */
export function reatomField<State, A extends AtomMut<State>, Value = State>(
  _initState: State,
  options: string | FieldOptions<State, Value>,
  stateAtom: A,
): A & FieldAtom<State, Value>

export function reatomField<State, Value = State>(
  _initState: State,
  options: string | FieldOptions<State, Value> = {},
  stateAtom?: AtomMut<State>,
): FieldAtom<State, Value> {
  interface This extends FieldAtom<State, Value> {}

  const {
    filter = () => true,
    fromState = (ctx, state) => state as unknown as Value,
    isDirty = (ctx, newValue, prevValue) => !isDeepEqual(newValue, prevValue),
    name = __count(`${typeof _initState}Field`),
    toState = (ctx, value) => value as unknown as State,
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
  }).pipe(
    withAssign((target, name) => ({
      value: atom((ctx) => {
        const {
          validateOnChange,
          validateOnBlur,
          keepErrorDuringValidating,
          keepErrorOnChange,
          shouldValidate,
        } = ctx.spy(target)

        return {
          validateOnChange: validateOnChange ?? false,
          validateOnBlur: validateOnBlur ?? false,
          keepErrorDuringValidating: keepErrorDuringValidating ?? false,
          keepErrorOnChange: keepErrorOnChange ?? !validateOnChange,
          shouldValidate: shouldValidate ?? !!validateFn,
        }
      }, `${name}.value`),
    })),
  )

  const disabled = reatomBoolean(
    restOptions.disabled ?? false,
    `${name}.disabled`,
  )
  disabled.onChange((ctx, status) => {
    if (!status) validation.trigger(ctx)
  })

  const elementRef = atom(restOptions.elementRef, `${name}.elementRef`)

  const field = stateAtom ?? atom(_initState, `${name}.field`)
  const initState = atom(_initState, `${name}.initState`)
  // TODO: make sure it's ok to copy initState of other atom.
  // We need to extract initial state from `field` atom here and pass it to `initState` atom
  initState.__reatom.initState = field.__reatom.initState

  field.onChange((ctx) => {
    if (isCausedBy(ctx, reset)) return

    ctx.get(validationController).abort(toAbortError('change'))

    const { keepErrorOnChange, validateOnChange } = ctx.get(fieldOptions.value)

    if(!keepErrorOnChange)
      validation.errors(ctx, [])

    validation.merge(ctx, { validating: undefined })

    if (!ctx.get(disabled) && validateOnChange) validation.trigger(ctx)
  })

  const value: This['value'] = atom(
    (ctx) => fromState(ctx, ctx.spy(field)),
    `${name}.value`,
  )

  const focus = reatomRecord(fieldInitFocus, `${name}.focus`).pipe(
    withAssign((target, name) => ({
      in: action((ctx) => target.merge(ctx, { active: true }), `${name}.in`),
      out: action(
        (ctx) => target.merge(ctx, { active: false, touched: true }),
        `${name}.out`,
      ),
    })),
  )

  // @ts-expect-error the original computed state can't be typed properly
  focus.__reatom.computer = (ctx, state: FieldFocus) => {
    const dirty = isDirty(
      ctx,
      ctx.spy(value),
      fromState(ctx, ctx.spy(initState)),
    )
    return state.dirty === dirty ? state : { ...state, dirty }
  }

  focus.out.onCall((ctx) => {
    if (!ctx.get(disabled) && ctx.get(fieldOptions.value).validateOnBlur)
      validation.trigger(ctx)
  })

  const validationController = atom(
    new AbortController(),
    `${name}._validationController`,
  )
  // prevent collisions for different contexts
  validationController.__reatom.initState = () => new AbortController()

  const validation = reatomRecord(
    fieldInitValidationLess,
    `${name}.validation`,
  ).pipe(
    withAssign((target, name) => ({
      errors: reatomArray<FieldError>([], `${name}.errors`),
    })),
    withAssign((target, name) => ({
      trigger: action((ctx) => {
        const validationValue = ctx.get(target)

        if (validationValue.triggered) return validationValue

        const { shouldValidate, keepErrorDuringValidating } = ctx.get(
          fieldOptions.value,
        )
        if (!shouldValidate) {
          return target.merge(ctx, { triggered: true })
        }

        ctx.get(validationController).abort(toAbortError('concurrent'))

        const controller = validationController(ctx, new AbortController())
        abortCauseContext.set(ctx.cause, controller)

        let promise
        const state = ctx.get(field)

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

            const asyncCtx = Object.assign(withAbortableSchedule(ctx), {
              controller,
            })
            const task = validateFn(asyncCtx, {
              state,
              value: ctx.get(value),
              focus: ctx.get(focus),
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
              const errors = await ctx.schedule(() => promise)
              target.errors(ctx, errors)
              target.merge(ctx, {
                triggered: true,
                validating: undefined,
              })

              return { errors }
            } catch (error) {
              if (isAbort(error) || controller.signal.aborted)
                return { errors: ctx.get(target.errors) }

              const validationErrors = [
                { source: 'validaton', message: toError(error) },
              ]

              target.errors(ctx, validationErrors)
              target.merge(ctx, {
                triggered: true,
                validating: undefined,
              })

              return { errors: validationErrors }
            }
          })()

          if(!keepErrorDuringValidating)
            target.errors(ctx, [])

          return target.merge(ctx, {
            triggered: true,
            validating: validationPromise,
          })
        }

        target.errors(ctx, promise)

        const val = target.merge(ctx, {
          validating: undefined,
          triggered: true,
        })
        return val
      }, `${name}.trigger`).pipe(
        withAssign((target, name) => ({
          abort: action(
            (ctx, reason: any) =>
              ctx.get(validationController).abort(toAbortError(reason)),
            `${name}.abort`,
          ),
        })),
      ),
      clearErrors: action((ctx, ...sources: FieldErrorSource[]) => {
        target.errors(ctx, sources.length ? ctx.get(target.errors).filter(e => !sources.includes(e.source)) : [])
        return ctx.get(target)
      }, `${name}.clearErrors`),
    })),
  )

  validation.__reatom.initState = (ctx) =>
    ctx.get(fieldOptions.value).shouldValidate
      ? fieldInitValidation
      : fieldInitValidationLess

  // @ts-expect-error the original computed state can't be typed properly
  validation.__reatom.computer = (ctx, state: FieldValidation) => {
    if (!ctx.spy(fieldOptions.value).shouldValidate)
      return fieldInitValidationLess

    if (ctx.spy(disabled)) return fieldInitValidation

    ctx.spy(value)
    const firstError = ctx.spy(validation.errors)[0]?.message;
    return state.triggered ? { ...state, error: firstError, triggered: false } : { ...state, error: firstError }
  }

  const change: This['change'] = action((ctx, newValue) => {
    const prevValue = ctx.get(value)
    if (!filter(ctx, newValue, prevValue)) return prevValue

    field(ctx, toState(ctx, newValue))
    focus.merge(ctx, { touched: true })

    return ctx.get(value)
  }, `${name}.change`)

  const reset: This['reset'] = action((ctx, ...args) => {
    field(ctx, args.length ? initState(ctx, args[0]) : ctx.get(initState))
    focus(ctx, fieldInitFocus)

    validation(ctx, fieldInitValidation)
    ctx.get(validationController).abort(toAbortError('reset'))
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

export const withField = <T extends AtomMut, Value = AtomState<T>>(
  options: Omit<FieldOptions<AtomState<T>, Value>, 'name'> = {},
): ((anAtom: T) => T & FieldAtom<AtomState<T>, Value>) => {
  return (anAtom: T) =>
    reatomField(
      null as AtomState<T>,
      { name: anAtom.__reatom.name, ...options },
      anAtom,
    )
}

export const isFieldAtom = (thing: any): thing is FieldLikeAtom =>
  thing?.__reatomField === true
