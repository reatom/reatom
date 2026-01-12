import type { StandardSchemaV1 } from '@standard-schema/spec'

import type { AbortExt, AsyncDataExt, AsyncExt, FieldArrayAtom, FieldError, Rec } from '../'
import {
  type Action,
  action,
  atom,
  type Computed,
  isCausedBy,
  isFieldArrayAtom,
  isFieldAtom,
  isRec,
  LL_NEXT,
  named,
  withAbort,
  withAsync,
  withAsyncData,
  withCallHook,
  withInit,
  wrap,
} from '../'
import { type FieldAtom } from './reatomField'
import type { FieldsAtomize } from './reatomFieldsAtomize'
import type {
  FieldSetInitState,
  FieldSetState,
  FieldSetValidation,
  ValidationlessFieldSetAtom,
} from './reatomFieldSet'
import { reatomFieldSet } from './reatomFieldSet'

export type SubmitAction<Params extends any[], Return> = Action<
  Params,
  Promise<Return>
> &
  AsyncDataExt<Params, Return, Return | undefined, Error | undefined>

/** @deprecated Renamed. Use FormAtom instead */
export type Form<
  InitState extends FieldSetInitState = FieldSetInitState,
  SchemaState = any,
  SubmitReturn = any,
  SubmitParams extends any[] = any,
> = FormAtom<InitState, SchemaState, SubmitReturn, SubmitParams>

export interface FormAtom<
  InitState extends FieldSetInitState = FieldSetInitState,
  SchemaState = any,
  SubmitReturn = void,
  SubmitParams extends any[] = any,
> extends ValidationlessFieldSetAtom<InitState> {
  /**
   * Atom with validation state of the form, computed from all the fields in
   * `fieldsList`
   */
  validation: Computed<FieldSetValidation> & {
    /** Action to trigger form validation. */
    trigger: Action<
      [],
      Promise<
        undefined extends SchemaState ? FieldSetState<InitState> : SchemaState
      >
    > &
      AsyncExt<[], any, Error | undefined> &
      AbortExt
  } & (undefined extends SchemaState
      ? {}
      : {
          triggerSchemaValidation: Action<
            [],
            | StandardSchemaV1.Result<SchemaState>
            | Promise<StandardSchemaV1.Result<SchemaState>>
          > &
            AbortExt
        })

  /**
   * Submit async handler. It checks the validation of all the fields in
   * `fieldsList`, calls the form's `validate` options handler, and then the
   * `onSubmit` options handler. Check the additional options properties of
   * async action: https://reatom.dev/handbook/async/.
   */
  submit: SubmitAction<SubmitParams, SubmitReturn>

  /** Atom with submitted state of the form */
  submitted: Computed<boolean>
}

export interface BaseFormOptions {
  name?: string

  /**
   * Should reset the state after success submit?
   *
   * @default false
   */
  resetOnSubmit?: boolean

  /**
   * Defines the default reset behavior of the validation state during async
   * validation for all fields.
   *
   * @default false
   */
  keepErrorDuringValidating?: boolean

  /**
   * Defines the default reset behavior of the validation state on field change
   * for all fields. Useful if the validation is triggered on blur or submit
   * only.
   *
   * @default !validateOnChange
   */
  keepErrorOnChange?: boolean

  /**
   * Defines if the validation should be triggered with every field change by
   * default for all fields.
   *
   * @default false
   */
  validateOnChange?: boolean

  /**
   * Defines if the validation should be triggered on the field blur by default
   * for all fields.
   *
   * @default false
   */
  validateOnBlur?: boolean
}

export interface FormOptionsWithSchema<
  State,
  SubmitReturn,
  SubmitParams extends any[],
> extends BaseFormOptions {
  /** The callback to process valid form data, typed according to the schema */
  onSubmit?: (
    state: State,
    ...params: SubmitParams
  ) => SubmitReturn | Promise<SubmitReturn>

  /**
   * The callback to validate form fields before submit, typed according to the
   * schema
   */
  validateBeforeSubmit?: (state: State) => any

  /**
   * The schema which supports StandardSchemaV1 specification to validate form
   * fields.
   */
  schema: StandardSchemaV1<unknown, State>
}

export interface FormOptionsWithoutSchema<
  InitState extends FieldSetInitState,
  SubmitReturn,
  SubmitParams extends any[],
> extends BaseFormOptions {
  /**
   * The callback to process valid form data, typed according to the raw form
   * state
   */
  onSubmit?: (
    state: FieldSetState<InitState>,
    ...params: SubmitParams
  ) => SubmitReturn | Promise<SubmitReturn>

  /**
   * The callback to validate form fields before submit, typed according to the
   * raw form state
   *
   * @deprecated Renamed to `validateBeforeSubmit`
   */
  validate?: (state: FieldSetState<InitState>) => any

  /**
   * The callback to validate form fields before submit, typed according to the
   * raw form state
   */
  validateBeforeSubmit?: (state: FieldSetState<InitState>) => any

  /** Schema is explicitly disallowed or undefined in this variant */
  schema?: undefined
}

// TODO: add support for FieldArrayAtom
const resolveFieldByPath = <InitState extends FieldSetInitState & Rec>(
  path: StandardSchemaV1.Issue['path'],
  acc: FieldsAtomize<InitState> & Rec,
): FieldAtom | FieldArrayAtom | null => {
  if (!path?.length) return null

  const shiftedPath = [...path]
  const pathSegment = shiftedPath.shift()!
  if (typeof pathSegment === 'symbol') return null

  const key =
    typeof pathSegment === 'object' && 'key' in pathSegment
      ? pathSegment.key.toString()
      : pathSegment.toString()

  const field = acc[key]
  if (!field) return null

  if (isFieldArrayAtom(field)) {
    if(!shiftedPath.length) return field
    else return resolveFieldByPath(shiftedPath, field.array())
  } else if (isFieldAtom(field)) {
    return field as FieldAtom
  } else {
    return resolveFieldByPath(shiftedPath, field)
  }
}

export function reatomForm<
  InitState extends FieldSetInitState,
  SchemaState,
  SubmitReturn,
  SubmitParams extends any[],
>(
  initState: InitState | ((name: string) => InitState),
  optionsWithSchema: FormOptionsWithSchema<
    SchemaState,
    SubmitReturn,
    SubmitParams
  >,
): FormAtom<InitState, SchemaState, SubmitReturn, SubmitParams>

export function reatomForm<
  InitState extends FieldSetInitState,
  SubmitReturn,
  SubmitParams extends any[],
>(
  initState: InitState | ((name: string) => InitState),
  options?: FormOptionsWithoutSchema<InitState, SubmitReturn, SubmitParams>,
): FormAtom<InitState, undefined, SubmitReturn, SubmitParams>

export function reatomForm<InitState extends FieldSetInitState>(
  initState: InitState | ((name: string) => InitState),
  name?: string,
): FormAtom<InitState, undefined, void, []>

export function reatomForm<
  InitState extends FieldSetInitState,
  SchemaState,
  SubmitReturn,
  SubmitParams extends any[],
>(
  initState: InitState | ((name: string) => InitState),
  options:
    | string
    | FormOptionsWithSchema<SchemaState, SubmitReturn, SubmitParams>
    | FormOptionsWithoutSchema<InitState, SubmitReturn, SubmitParams> = {},
): FormAtom<InitState, SchemaState, SubmitReturn, SubmitParams> {
  if (typeof options === 'string') {
    options = { name: options }
  }
  const {
    name = named('form'),
    onSubmit,
    resetOnSubmit = false,
    validateBeforeSubmit,
    validateOnBlur = false,
    validateOnChange = false,
    keepErrorDuringValidating = false,
    keepErrorOnChange = !validateOnChange,
    schema,
  } = options

  const setupField = (field: FieldAtom | FieldArrayAtom) => {
    field.options.extend(
      withInit((options) => {
        return {
          validateOnChange: options.validateOnChange ?? validateOnChange,
          validateOnBlur: options.validateOnBlur ?? validateOnBlur,
          keepErrorDuringValidating:
            options.keepErrorDuringValidating ?? keepErrorDuringValidating,
          keepErrorOnChange: options.keepErrorOnChange ?? keepErrorOnChange,
          shouldValidate: !!schema || options.shouldValidate,
        }
      }),
    )

    if (schema) {
      field.validation.trigger.extend(
        withCallHook(() => {
          if (!isCausedBy(submit)) triggerSchemaValidation()
        }),
      )
    }
  }

  const fieldSet = reatomFieldSet<InitState>(initState, name)

  const setupFields = (element: unknown, insideHook = false) => {
    if (isFieldArrayAtom(element)) {
      setupField(element)
      
      if (insideHook) element.array().forEach((el) => setupFields(el, true))
      else {
        element.extend(
          withInit((state) => {
            let head = state.head
            while (head) {
              setupFields(head)
              head = head[LL_NEXT]
            }
            return state
          }),
        )
      }
    } else if (isRec(element)) {
      Object.values(element).forEach((element) => setupFields(element))
    } else if (isFieldAtom(element)) {
      setupField(element as FieldAtom)
    }
  }

  setupFields(fieldSet.fields)
  fieldSet.onFieldCreated?.extend(withCallHook(setupField))

  const submitted = atom(false, `${name}.submitted`)

  fieldSet.reset.extend(
    withCallHook(() => {
      submitted.set(false)
      submit.error.set(undefined)
      submit.data.set(undefined)

      if (!isCausedBy(submit)) submit.abort(`${name}.reset`)
    }),
  )

  const triggerSchemaValidation = action(() => {
    if (!schema) throw new Error('Triggering schema validation without schema')

    const state = fieldSet()
    const validation = schema['~standard'].validate(state)

    const placeErrors = (result: StandardSchemaV1.Result<SchemaState>) => {
      const touched = new Map<FieldAtom | FieldArrayAtom, FieldError[]>()

      if (result.issues) {
        for (const issue of result.issues) {
          const field = resolveFieldByPath(issue.path, fieldSet.fields)
          if (!field) continue

          const fieldErrors = touched.get(field) ?? [
            ...field.validation.errors().filter((e) => e.source !== 'schema'),
          ]
          fieldErrors.unshift({
            source: 'schema',
            message: issue.message,
          })
          touched.set(field, fieldErrors)
        }
      }

      for (const field of [...fieldSet.fieldsList(), ...fieldSet.fieldArraysList()]) {
        const placedErrors = touched.get(field)
        if (!placedErrors) {
          if (field.validation.errors().find((e) => e.source == 'schema'))
            field.validation.clearErrors('schema')
        } else {
          field.validation.errors.set(placedErrors)
        }
      }

      return result
    }

    return validation instanceof Promise
      ? validation.then(wrap(placeErrors))
      : placeErrors(validation)
  }, `${name}.triggerSchemaValidation`).extend(withAbort())

  const origTriggerValidation = fieldSet.validation.trigger
  const triggerValidation = action(async () => {
    const status = origTriggerValidation()
    const validationResult = status.validating
      ? await wrap(status.validating)
      : status
    const { errors } = validationResult
    if (errors.length) throw new Error(errors[0]!.message)

    let state: any

    if (schema) {
      const promise = triggerSchemaValidation()
      const schemaValidationResult =
        promise instanceof Promise ? await wrap(promise) : promise
      if (schemaValidationResult.issues)
        throw new Error(
          schemaValidationResult.issues[0]?.message ?? 'Unknown schema error',
        )

      state = schemaValidationResult.value
    } else {
      state = fieldSet()
    }

    if (validateBeforeSubmit) {
      const promise = validateBeforeSubmit(state)
      if (promise instanceof Promise) await wrap(promise)
    }

    return state
  }, `${name}.validation.trigger`).extend(withAsync(), withAbort())

  const submit = action(async (...params: SubmitParams) => {
    const state = await wrap(triggerValidation())

    let result

    if (onSubmit) {
      result = onSubmit(state, ...params)
      if (result instanceof Promise) result = await wrap(result)
    }

    submitted.set(true)

    if (resetOnSubmit) fieldSet.reset()
    return result as SubmitReturn
  }, `${name}.submit`).extend(withAsyncData({ resetError: 'onFulfill' }))

  const validation = Object.assign(fieldSet.validation, {
    trigger: triggerValidation,
    triggerSchemaValidation,
  })

  return Object.assign(fieldSet, {
    submit,
    submitted,
    validation,
  })
}
