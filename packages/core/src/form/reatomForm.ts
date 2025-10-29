import type { StandardSchemaV1 } from '@standard-schema/spec'

import type {
  AbortExt,
  AsyncExt,
  AtomState,
  LinkedList,
  LinkedListAtom,
  LinkedListLikeAtom,
  LLNode,
} from '../'
import {
  type Action,
  action,
  type Atom,
  atom,
  type Computed,
  type Deatomize,
  isAtom,
  isCausedBy,
  isLinkedListAtom,
  isObject,
  named,
  reatomLinkedList,
  type Rec,
  withAbort,
  withAsync,
  withCallHook,
  wrap,
} from '../'
import type { FieldError, FieldLikeAtom } from './reatomField'
import {
  type FieldAtom,
  type FieldOptions,
  isFieldAtom,
  reatomField,
} from './reatomField'
import type {
  FieldSetValidation,
  ValidationlessFieldSet,
} from './reatomFieldSet'
import { reatomFieldSet } from './reatomFieldSet'

export interface FormFieldOptions<State = any, Value = State>
  extends FieldOptions<State, Value> {
  initState: State
}

type FormInitStateElement =
  | string
  | number
  | boolean
  | null
  | undefined
  | File
  | symbol
  | bigint
  | Date
  | FieldAtom
  | FormFieldOptions
  | FormFieldArray<any>
  | Array<FormInitStateElement>
  | { [key: string]: FormInitStateElement }

export type FormInitState = {
  [key: string]: FormInitStateElement | FormInitState
}

type ExtractFieldArray<T> = {
  [K in keyof T]: T[K] extends FormFieldArray<infer Param, infer _Node>
    ? Param[]
    : ExtractFieldArray<T[K]>
}

export type FormFieldArrayAtom<
  Param = any,
  Node extends FormInitStateElement = FormInitStateElement,
> = LinkedListAtom<[ExtractFieldArray<Param>], FormFieldElement<Node>> & {
  reset: Action<[], AtomState<FormFieldArrayAtom<Param, Node>>>
  initState: Atom<LinkedList<LLNode<FormFieldElement<Node>>>>
}

export type FormFieldElement<
  T extends FormInitStateElement | unknown = FormInitStateElement,
> = T extends FieldLikeAtom
  ? T
  : T extends Date
    ? FieldAtom<T>
    : T extends Array<infer Item>
      ? Item extends FormInitStateElement
        ? FormFieldArrayAtom<Item, Item>
        : never
      : T extends FormFieldArray<infer Param, infer Node>
        ? FormFieldArrayAtom<Param, Node>
        : T extends FieldOptions & { initState: infer State }
          ? T extends FieldOptions<State, State>
            ? FieldAtom<State>
            : T extends FieldOptions<State, infer Value>
              ? FieldAtom<State, Value>
              : never
          : T extends Rec<unknown>
            ? { [K in keyof T]: FormFieldElement<T[K]> }
            : FieldAtom<T>

export type FormFields<T extends FormInitState = FormInitState> = {
  [K in keyof T]: FormFieldElement<T[K]>
}

export type FormState<T extends FormInitState = FormInitState> = Deatomize<
  FormFields<T>
>

export type DeepPartial<T, Skip = never> = {
  [K in keyof T]?: T[K] extends Skip
    ? T[K]
    : T[K] extends Rec
      ? DeepPartial<T[K], Skip>
      : T[K]
}
export type FormPartialState<T extends FormInitState = FormInitState> =
  DeepPartial<FormState<T>, Array<unknown>>

export type SubmitAction<Return> = Action<[], Promise<Return>> &
  AsyncExt<[], Return, Error | undefined> &
  AbortExt

export interface Form<
  T extends FormInitState = FormInitState,
  SchemaState = any,
  SubmitReturn = void,
> extends ValidationlessFieldSet<T> {
  /**
   * Atom with validation state of the form, computed from all the fields in
   * `fieldsList`
   */
  validation: Computed<FieldSetValidation> & {
    /** Action to trigger form validation. */
    trigger: Action<
      [],
      Promise<undefined extends SchemaState ? FormState<T> : SchemaState>
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
  submit: SubmitAction<SubmitReturn>

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

export interface FormOptionsWithSchema<State, SubmitReturn>
  extends BaseFormOptions {
  /** The callback to process valid form data, typed according to the schema */
  onSubmit?: (state: State) => SubmitReturn | Promise<SubmitReturn>

  /**
   * The callback to validate form fields before submit, typed according to the
   * schema
   *
   * @deprecated Renamed to `validateBeforeSubmit`
   */
  validate?: (state: State) => any

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

export interface FormOptionsWithoutSchema<T extends FormInitState, SubmitReturn>
  extends BaseFormOptions {
  /**
   * The callback to process valid form data, typed according to the raw form
   * state
   */
  onSubmit?: (state: FormState<T>) => SubmitReturn | Promise<SubmitReturn>

  /**
   * The callback to validate form fields before submit, typed according to the
   * raw form state
   *
   * @deprecated Renamed to `validateBeforeSubmit`
   */
  validate?: (state: FormState<T>) => any

  /**
   * The callback to validate form fields before submit, typed according to the
   * raw form state
   */
  validateBeforeSubmit?: (state: FormState<T>) => any

  /** Schema is explicitly disallowed or undefined in this variant */
  schema?: undefined
}

const reatomFormFields = <T extends FormInitState>(
  initState: T,
  options: {
    name: string
    onFieldResolved?: (field: FieldAtom) => void
  },
): FormFields<T> => {
  const { name, onFieldResolved } = options
  const fields = Array.isArray(initState)
    ? ([] as FormFields<T>)
    : ({} as FormFields<T>)

  const createFieldElement = (
    element: FormInitStateElement,
    name: string,
  ): FormFieldElement => {
    if (isAtom(element)) {
      onFieldResolved?.(element)
      return element
    } else if (isObject(element) && !(element instanceof Date)) {
      if (Array.isArray(element)) {
        return createFieldElement(createFieldArray(element), name)
      } else if (isFieldArray(element)) {
        let id = 0
        const linkedListAtom = reatomLinkedList(
          {
            create: (param) => {
              const itemName = `${name}.${++id}`
              return createFieldElement(
                element.create(param, itemName),
                itemName,
              )
            },
            initSnapshot: element.initState.map(
              (state) => [state] as [param: any],
            ),
          },
          name,
        )

        const initState = atom(
          () => linkedListAtom(),
          `${linkedListAtom.name}.initState`,
        )

        // @ts-expect-error bad keys type inference
        return Object.assign(linkedListAtom, {
          initState,
          reset: action(() => {
            linkedListAtom.set(initState())
          }),
        })
      } else if ('initState' in element) {
        const fieldOptions = {
          name,
          ...element,
        }
        const field = reatomField(element.initState, fieldOptions)

        onFieldResolved?.(field)
        return field
      } else {
        return reatomFormFields(element, { name, onFieldResolved })
      }
    } else {
      const field = reatomField(element, { name })
      onFieldResolved?.(field)
      return field
    }
  }

  for (const [key, value] of Object.entries(initState)) {
    // @ts-expect-error bad keys type inference
    fields[key] = createFieldElement(value, `${name}.${key}`)
  }
  return fields
}

interface FormFieldArray<
  Param,
  Node extends FormInitStateElement = FormInitStateElement,
> {
  create: (param: Param, name: string) => Node
  initState: Array<Param>
  __fieldArray: true
}

function createFieldArray<Param extends FormInitStateElement>(
  initState: Array<Param>,
): FormFieldArray<Param, Param>

function createFieldArray<
  Param,
  Node extends FormInitStateElement = FormInitStateElement,
>(create: (params: Param, name: string) => Node): FormFieldArray<Param, Node>

function createFieldArray<
  Param,
  Node extends FormInitStateElement = FormInitStateElement,
>(options: {
  create: (param: Param, name: string) => Node
  initState?: Array<Param>
}): FormFieldArray<Param, Node>

function createFieldArray<
  Param,
  Node extends FormInitStateElement = FormInitStateElement,
>(
  options:
    | Array<Param>
    | ((params: Param, name: string) => Node)
    | {
        create: (param: Param, name: string) => Node
        initState?: Array<Param>
      },
): FormFieldArray<Param, Node> {
  const { create, initState = [] } =
    typeof options === 'function'
      ? { create: options }
      : Array.isArray(options)
        ? {
            create: (param: Param) => param as unknown as Node,
            initState: options,
          }
        : options

  return {
    create,
    initState,
    __fieldArray: true,
  }
}

const isFieldArray = (value: any): value is FormFieldArray<any> =>
  value?.__fieldArray

export { createFieldArray as experimental_fieldArray }
export type ArrayFieldItem<T> =
  T extends LinkedListLikeAtom<infer _Node>
    ? AtomState<T['array']>[number]
    : never

const resolveFieldByPath = <T extends FormInitState>(
  path: StandardSchemaV1.Issue['path'],
  acc: FormFields<T>,
): FieldAtom | null => {
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

  if (isLinkedListAtom(field)) {
    // @ts-expect-error bad key inference
    return resolveFieldByPath(shiftedPath, field.array())
  } else if (isFieldAtom(field)) {
    return field
  } else {
    return resolveFieldByPath(shiftedPath, field)
  }
}

export function reatomForm<T extends FormInitState, SchemaState, SubmitReturn>(
  initState: T | ((name: string) => T),
  optionsWithSchema: FormOptionsWithSchema<SchemaState, SubmitReturn>,
): Form<T, SchemaState, SubmitReturn>

export function reatomForm<T extends FormInitState, SubmitReturn>(
  initState: T | ((name: string) => T),
  options?: FormOptionsWithoutSchema<T, SubmitReturn>,
): Form<T, undefined, SubmitReturn>

export function reatomForm<T extends FormInitState>(
  initState: T | ((name: string) => T),
  name?: string,
): Form<T, undefined, void>

export function reatomForm<T extends FormInitState, SchemaState, SubmitReturn>(
  initState: T | ((name: string) => T),
  options:
    | string
    | FormOptionsWithSchema<SchemaState, SubmitReturn>
    | FormOptionsWithoutSchema<T, SubmitReturn> = {},
): Form<T, SchemaState, SubmitReturn> {
  if (typeof options === 'string') {
    options = { name: options }
  }
  const {
    name = named('form'),
    onSubmit,
    resetOnSubmit = false,
    validate,
    validateBeforeSubmit = validate,
    validateOnBlur = false,
    validateOnChange = false,
    keepErrorDuringValidating = false,
    keepErrorOnChange = !validateOnChange,
    schema,
  } = options

  const fields = reatomFormFields(
    typeof initState == 'function' ? initState(name) : initState,
    {
      name: `${name}.fields`,
      onFieldResolved: (field) => {
        field.options.set((options) => ({
          validateOnChange: options.validateOnChange ?? validateOnChange,
          validateOnBlur: options.validateOnBlur ?? validateOnBlur,
          keepErrorDuringValidating:
            options.keepErrorDuringValidating ?? keepErrorDuringValidating,
          keepErrorOnChange: options.keepErrorOnChange ?? keepErrorOnChange,
          shouldValidate: !!schema || options.shouldValidate,
        }))

        if (schema) {
          field.validation.trigger.extend(
            withCallHook(() => {
              if (!isCausedBy(submit)) triggerSchemaValidation()
            }),
          )
        }
      },
    },
  )

  const fieldSet = reatomFieldSet(fields, name)

  const submitted = atom(false, `${name}.submitted`)

  fieldSet.reset.extend(
    withCallHook(() => {
      submitted.set(false)
      submit.error.reset()

      if (!isCausedBy(submit)) submit.abort(`${name}.reset`)
    }),
  )

  const triggerSchemaValidation = action(() => {
    if (!schema) throw new Error('Triggering schema validation without schema')

    const state = fieldSet()
    const validation = schema['~standard'].validate(state)

    const placeErrors = (result: StandardSchemaV1.Result<SchemaState>) => {
      const touched = new Map<FieldAtom, FieldError[]>()

      if (result.issues) {
        for (const issue of result.issues) {
          const field = resolveFieldByPath(issue.path, fields)
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

      for (const field of fieldSet.fieldsList()) {
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
  }, `${name}.validation.triggerExt`).extend(withAsync(), withAbort())

  const submit = action(async () => {
    const state = await wrap(triggerValidation())

    let result

    if (onSubmit) {
      result = onSubmit(state)
      if (result instanceof Promise) result = await wrap(result)
    }

    submitted.set(true)

    if (resetOnSubmit) fieldSet.reset()
    return result as SubmitReturn
  }, `${name}.onSubmit`).extend(
    withAsync({ resetError: 'onFulfill' }),
    (target) =>
      Object.assign(target, {
        error: target.error.actions((target) => ({
          reset: () => target.set(undefined),
        })),
      }),
    withAbort(),
  )

  const validation = Object.assign(fieldSet.validation, {
    trigger: triggerValidation,
    triggerSchemaValidation,
  })

  return Object.assign(fieldSet, {
    fields,
    submit,
    submitted,
    validation,
  })
}
