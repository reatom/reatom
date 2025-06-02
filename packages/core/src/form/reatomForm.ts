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
  isAtom,
  isCausedBy,
  isLinkedListAtom,
  isObject,
  named,
  type ParseAtoms,
  reatomLinkedList,
  type Rec,
  withAbort,
  withAsync,
  withCallHook,
  wrap,
} from '../'
import type { FieldLikeAtom } from './reatomField'
import {
  type FieldAtom,
  type FieldOptions,
  isFieldAtom,
  reatomField,
} from './reatomField'
import type { FieldSet, FieldSetValidation } from './reatomFieldSet'
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
  T extends FormInitStateElement = FormInitStateElement,
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
  : T extends Rec
  ? { [K in keyof T]: FormFieldElement<T[K]> }
  : FieldAtom<T>

export type FormFields<T extends FormInitState = FormInitState> = {
  [K in keyof T]: FormFieldElement<T[K]>
}

export type FormState<T extends FormInitState = FormInitState> = ParseAtoms<
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

export interface Form<T extends FormInitState = FormInitState, SchemaState = any, SubmitReturn = void>
  extends Omit<FieldSet<T>, 'validation'> {
  /** Atom with validation state of the form, computed from all the fields in `fieldsList` */
  validation: Computed<FieldSetValidation> & {
    /** Action to trigger form validation. */
    trigger: Action<
      [],
      Promise<undefined extends SchemaState ? FormState<T> : SchemaState>
    > &
    AsyncExt<[], any, Error | undefined> &
    AbortExt
  }

  /** Submit async handler. It checks the validation of all the fields in `fieldsList`, calls the form's `validate` options handler, and then the `onSubmit` options handler. Check the additional options properties of async action: https://www.reatom.dev/package/async/. */
  submit: SubmitAction<SubmitReturn>

  /** Atom with submitted state of the form */
  submitted: Computed<boolean>
}

export interface BaseFormOptions {
  name?: string

  /** Should reset the state after success submit? @default true */
  resetOnSubmit?: boolean

  /**
   * Defines the default reset behavior of the validation state during async validation for all fields.
   * @default false
   */
  keepErrorDuringValidating?: boolean

  /**
   * Defines the default reset behavior of the validation state on field change for all fields.
   * Useful if the validation is triggered on blur or submit only.
   * @default !validateOnChange
   */
  keepErrorOnChange?: boolean

  /**
   * Defines if the validation should be triggered with every field change by default for all fields.
   * @default false
   */
  validateOnChange?: boolean

  /**
   * Defines if the validation should be triggered on the field blur by default for all fields.
   * @default false
   */
  validateOnBlur?: boolean
}

export interface FormOptionsWithSchema<State, SubmitReturn> extends BaseFormOptions {
  /** The callback to process valid form data, typed according to the schema */
  onSubmit?: (state: State) => SubmitReturn | Promise<SubmitReturn>

  /** The callback to validate form fields, typed according to the schema */
  validate?: (state: State) => any

  /** The schema which supports StandardSchemaV1 specification to validate form fields. */
  schema: StandardSchemaV1<unknown, State>
}

export interface FormOptionsWithoutSchema<T extends FormInitState, SubmitReturn>
  extends BaseFormOptions {
  /** The callback to process valid form data, typed according to the raw form state */
  onSubmit?: (state: FormState<T>) => SubmitReturn | Promise<SubmitReturn>

  /** The callback to validate form fields, typed according to the raw form state */
  validate?: (state: FormState<T>) => any

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
        const field = reatomField(element.initState, {
          name,
          ...(element as FieldOptions),
        })

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
  const {
    name = named('form'),
    onSubmit,
    resetOnSubmit = true,
    validate,
    validateOnBlur = false,
    validateOnChange = false,
    keepErrorDuringValidating = false,
    keepErrorOnChange = !validateOnChange,
    schema,
  } = typeof options === 'string' ? { name: options } : options

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
              if (!isCausedBy(submit))
                checkSchemaValidation()
            }),
          )
        }
      },
    },
  )

  const {
    fieldsList,
    fieldArraysList,
    fieldsState,
    focus,
    validation: fieldsetValidation,
    init,
    reset,
  } = reatomFieldSet(fields, name)

  const submitted = atom(false, `${name}.submitted`)

  reset.extend(
    withCallHook(() => {
      submitted.set(false)
      submit.error.reset()

      if (!isCausedBy(submit)) submit.abort(`${name}.reset`)
    }),
  )

  const checkSchemaValidation = action(() => {
    if (!schema) throw new Error('Triggering schema validation without schema')

    const state = fieldsState()
    const validation = schema['~standard'].validate(state)

    const placeErrors = (result: StandardSchemaV1.Result<SchemaState>) => {
      const touched = new Set<FieldAtom>();
       
      if(result.issues) {
        for (const issue of result.issues) {
          const field = resolveFieldByPath(issue.path, fields)
          if (!field) continue
   
          field.validation.prependErrors({ source: 'schema', message: issue.message })
          touched.add(field)
        }
      }

      for(const field of fieldsList()) {
        if(!touched.has(field) && field.validation().errors.find(e => e.source == 'schema'))
          field.validation.clearErrors('schema')
      }
    
      return result
    }

    return validation instanceof Promise
      ? validation.then(placeErrors)
      : placeErrors(validation)
  }, `${name}.checkSchemaValidation`)

  const origValidationTrigger = fieldsetValidation.trigger
  const validationTrigger = action(async () => {
    const status = origValidationTrigger()
    const { errors } = status.validating ? await wrap(status.validating) : status
    if (errors.length) throw new Error(errors[0]!.message)

    let state: any

    if (schema) {
      const promise = checkSchemaValidation()
      const schemaValidationResult =
        promise instanceof Promise ? await wrap(promise) : promise
      if (!('value' in schemaValidationResult))
        throw new Error(
          schemaValidationResult.issues[0]?.message ?? 'Unknown schema error',
        )

      state = schemaValidationResult.value
    } else {
      state = fieldsState()
    }

    if (validate) {
      const promise = validate(state)
      if (promise instanceof Promise) await wrap(promise)
    }

    return state
  }, `${name}.validation.triggerExt`).extend(withAsync(), withAbort())

  const submit = action(async () => {
    const state = await wrap(validationTrigger())

    let result

    if (onSubmit) {
      result = onSubmit(state)
      if (result instanceof Promise) result = await wrap(result)
    }
    
    submitted.set(true)

    if (resetOnSubmit) reset()
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

  const validation = Object.assign(fieldsetValidation, {
    trigger: validationTrigger,
  })

  return {
    fields,
    fieldsList,
    fieldArraysList,
    fieldsState,
    focus,
    init,
    reset,
    submit,
    submitted,
    validation,
  }
}
