import {
  type Action,
  type Atom,
  AtomCache,
  AtomMut,
  AtomState,
  type Ctx,
  type Rec,
  __count,
  action,
  atom,
  isAtom,
} from '@reatom/core'

import { isCausedBy } from '@reatom/effects'

import {
  type AsyncAction,
  withErrorAtom,
  withStatusesAtom,
  type AsyncStatusesAtom,
  reatomAsync,
  withAbort,
  AsyncCtx,
  withDataAtom,
  AsyncDataAtom,
} from '@reatom/async'

import {
  LLNode,
  LinkedList,
  LinkedListAtom,
  LinkedListLikeAtom,
  isLinkedListAtom,
  reatomLinkedList,
  withComputed,
} from '@reatom/primitives'

import { type ParseAtoms } from '@reatom/lens'
import { isObject } from '@reatom/utils'

import {
  type FieldAtom,
  reatomField,
  type FieldOptions,
  FieldLikeAtom,
  FieldError,
} from './reatomField'

import type { StandardSchemaV1 } from '@standard-schema/spec'
import { withInit } from '@reatom/hooks'
import { FieldSet, FieldSetValidation, reatomFieldSet } from './reatomFieldSet'

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
  // TODO contract as parsing method
  // | ((state: any) => any)
  | FieldAtom
  | FormFieldOptions
  | FormFieldArray<any>
  | Array<FormInitStateElement>
  | Rec<FormInitStateElement>

export type FormInitState = Rec<FormInitStateElement | FormInitState>

type ExtractFieldArray<T> = {
  [K in keyof T]: T[K] extends FormFieldArray<infer Param, infer Node>
    ? Param[]
    : ExtractFieldArray<T[K]>
}

export type FormFieldArrayAtom<
  Param = any,
  Node extends FormInitStateElement = FormInitStateElement,
> = LinkedListAtom<[ExtractFieldArray<Param>], FormFieldElement<Node>> & {
  reset: Action<[], AtomState<FormFieldArrayAtom<Param, Node>>>
  initState: AtomMut<LinkedList<LLNode<FormFieldElement<Node>>>>
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

export interface SubmitAction<Return> extends AsyncAction<[], Return> {
  error: Atom<Error | undefined>
  data: AsyncDataAtom<Return | undefined>
  statusesAtom: AsyncStatusesAtom
}

export interface Form<T extends FormInitState, SchemaState, SubmitReturn>
  extends Omit<FieldSet<T>, 'validation'> {
  /** Atom with validation state of the form, computed from all the fields in `fieldsList` */
  validation: Atom<FieldSetValidation> & {
    /** Action to trigger form validation. */
    trigger: AsyncAction<
      [],
      Promise<undefined extends SchemaState ? FormState<T> : SchemaState>
    >
  } & (undefined extends SchemaState
      ? {}
      : {
          triggerSchemaValidation: Action<
            [],
            | StandardSchemaV1.Result<SchemaState>
            | Promise<StandardSchemaV1.Result<SchemaState>>
          >
        })

  /** Submit async handler. It checks the validation of all the fields in `fieldsList`, calls the form's `validateBeforeSubmit` options handler, and then the `onSubmit` options handler. Check the additional options properties of async action: https://www.reatom.dev/package/async/. */
  submit: SubmitAction<SubmitReturn>

  /** Atom with submitted state of the form */
  submitted: Atom<boolean>
}

export interface BaseFormOptions {
  name?: string

  /** Should reset the state after success submit? @default false */
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

export interface FormOptionsWithSchema<State, SubmitReturn>
  extends BaseFormOptions {
  /** The callback to process valid form data, typed according to the schema */
  onSubmit?: (
    ctx: AsyncCtx,
    state: State,
  ) => SubmitReturn | Promise<SubmitReturn>

  /**
   * The callback to validate form fields before submit, typed according to the schema
   * @deprecated Renamed to `validateBeforeSubmit`
   */
  validate?: (ctx: AsyncCtx, state: State) => any

  /**
   * The callback to validate form fields before submit, typed according to the schema
   */
  validateBeforeSubmit?: (ctx: AsyncCtx, state: State) => any

  /** The schema which supports StandardSchemaV1 specification to validate form fields. */
  schema: StandardSchemaV1<unknown, State>
}

export interface FormOptionsWithoutSchema<T extends FormInitState, SubmitReturn>
  extends BaseFormOptions {
  /** The callback to process valid form data, typed according to the raw form state */
  onSubmit?: (
    ctx: AsyncCtx,
    state: FormState<T>,
  ) => SubmitReturn | Promise<SubmitReturn>

  /**
   * The callback to validate form fields before submit, typed according to the raw form state
   * @deprecated Renamed to `validateBeforeSubmit`
   */
  validate?: (ctx: AsyncCtx, state: FormState<T>) => any

  /**
   * The callback to validate form fields before submit, typed according to the raw form state
   */
  validateBeforeSubmit?: (ctx: AsyncCtx, state: FormState<T>) => any

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
            create: (ctx, param) => {
              const itemName = `${name}.${++id}`
              return createFieldElement(
                element.create(ctx, param, itemName),
                itemName,
              )
            },
            initSnapshot: element.initState.map(
              (state) => [state] as [param: any],
            ),
          },
          name,
        )

        const initState = atom<AtomState<typeof linkedListAtom> | null>(
          null,
          `${linkedListAtom.__reatom.name}.initState`,
        ).pipe(
          withComputed((ctx, state) =>
            state ? state : ctx.spy(linkedListAtom),
          ),
        )

        // @ts-expect-error bad keys type inference
        return Object.assign(linkedListAtom, {
          initState,
          reset: action((ctx) => {
            ctx.get((read, actualize) => {
              actualize!(
                ctx,
                linkedListAtom.__reatom,
                (patchCtx: Ctx, patch: AtomCache) => {
                  patch.state = ctx.get(initState)
                },
              )
            })
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
        // @ts-expect-error bad keys type inference
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
  create: (ctx: Ctx, param: Param, name: string) => Node
  initState: Array<Param>
  __fieldArray: true
}

function createFieldArray<Param extends FormInitStateElement>(
  initState: Array<Param>,
): FormFieldArray<Param, Param>

function createFieldArray<
  Param,
  Node extends FormInitStateElement = FormInitStateElement,
>(
  create: (ctx: Ctx, params: Param, name: string) => Node,
): FormFieldArray<Param, Node>

function createFieldArray<
  Param,
  Node extends FormInitStateElement = FormInitStateElement,
>(options: {
  create: (ctx: Ctx, param: Param, name: string) => Node
  initState?: Array<Param>
}): FormFieldArray<Param, Node>

function createFieldArray<
  Param,
  Node extends FormInitStateElement = FormInitStateElement,
>(
  options:
    | Array<Param>
    | ((ctx: Ctx, params: Param, name: string) => Node)
    | {
        create: (ctx: Ctx, param: Param, name: string) => Node
        initState?: Array<Param>
      },
): FormFieldArray<Param, Node> {
  const { create, initState = [] } =
    typeof options === 'function'
      ? { create: options }
      : Array.isArray(options)
        ? {
            create: (ctx: Ctx, param: Param) => param as unknown as Node,
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
export type ArrayFieldItem<T> = T extends LinkedListLikeAtom
  ? AtomState<T['array']>[number]
  : never

const resolveFieldByPath = <T extends FormInitState>(
  ctx: Ctx,
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
    return resolveFieldByPath(ctx, shiftedPath, ctx.get(field.array))
  } else if (isAtom(field)) {
    return field
  } else {
    return resolveFieldByPath(ctx, shiftedPath, field)
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
    name = __count('form'),
    onSubmit,
    resetOnSubmit = false,
    validate,
    validateBeforeSubmit = validate,
    validateOnBlur = false,
    validateOnChange = false,
    keepErrorDuringValidating = false,
    keepErrorOnChange = !validateOnChange,
    schema,
  } = typeof options === 'string' ? { name: options } : options

  const fields = reatomFormFields(
    initState instanceof Function ? initState(`${name}.fields`) : initState,
    {
      name: `${name}.fields`,
      onFieldResolved: (field) => {
        field.options.pipe(
          withInit((ctx, init) => {
            const options = init(ctx)

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
          field.validation.trigger.onCall((ctx) => {
            if (!isCausedBy(ctx, submit)) triggerSchemaValidation(ctx)
          })
        }
      },
    },
  )

  const fieldSet = reatomFieldSet(fields, name)

  fieldSet.reset.onCall((ctx) => {
    submitted(ctx, false)
    submit.errorAtom.reset(ctx)
    submit.statusesAtom.reset(ctx)
    submit.abort(ctx, `${name}.reset`)
  })

  const submitted = atom(false, `${name}.submitted`)

  const triggerSchemaValidation = action((ctx) => {
    const state = ctx.get(fieldSet)
    if (!schema) throw new Error('Triggering schema validation without schema')

    const validation = schema['~standard'].validate(state)

    const placeErrors = (result: StandardSchemaV1.Result<SchemaState>) => {
      const touched = new Map<FieldAtom, FieldError[]>()

      if (result.issues) {
        for (const issue of result.issues) {
          const field = resolveFieldByPath(ctx, issue.path, fields)
          if (!field || ctx.get(field.disabled)) continue

          const fieldErrors = touched.get(field) ?? [...ctx.get(field.validation.errors).filter(e => e.source !== 'schema')]
          fieldErrors.unshift({
            source: 'schema',
            message: issue.message,
          })
          touched.set(field, fieldErrors)
        }
      }

      for (const field of ctx.get(fieldSet.fieldsList)) {
        const placedErrors = touched.get(field)
        if (!placedErrors) {
          if (
            ctx.get(field.validation.errors).find((e) => e.source == 'schema')
          )
            field.validation.clearErrors(ctx, 'schema')
        } else {
          field.validation.errors(ctx, placedErrors)
        }
      }

      return result
    }

    return validation instanceof Promise
      ? validation.then((result) => ctx.schedule(() => placeErrors(result)))
      : placeErrors(validation)
  }, `${name}.triggerSchemaValidation`)

  const origTriggerValidation = fieldSet.validation.trigger
  const triggerValidation = reatomAsync(async (ctx) => {
    const status = origTriggerValidation(ctx)
    const validatedStatus = status.validating
      ? await ctx.schedule(() => status.validating!)
      : status
    const { errors } = validatedStatus
    if (errors.length) throw new Error(errors[0]!.message)

    let state: any

    if (schema) {
      const promise = triggerSchemaValidation(ctx)
      const schemaValidationResult =
        promise instanceof Promise ? await ctx.schedule(() => promise) : promise
      if (!('value' in schemaValidationResult))
        throw new Error(
          schemaValidationResult.issues[0]?.message ?? 'Unknown schema error',
        )

      state = schemaValidationResult.value
    } else {
      state = ctx.get(fieldSet)
    }

    if (validateBeforeSubmit) {
      const promise = validateBeforeSubmit(ctx, state)
      if (promise instanceof Promise) {
        await ctx.schedule(() => promise)
      }
    }

    return state
  }, `${name}.validation.triggerExt`)

  const submit = reatomAsync(async (ctx) => {
    const state = await ctx.schedule(() => triggerValidation(ctx))

    let result: any

    if (onSubmit) {
      result = onSubmit(ctx, state)
      if (result instanceof Promise)
        result = await ctx.schedule(() => result)
    }

    submitted(ctx, true)

    if (resetOnSubmit) fieldSet.reset(ctx)
    return result as SubmitReturn
  }, `${name}.onSubmit`).pipe(
    withDataAtom(),
    withStatusesAtom(),
    withAbort(),
    withErrorAtom(undefined, { resetTrigger: 'onFulfill' }),
    (submit) =>
      Object.assign(submit, {
        data: submit.dataAtom,
        error: submit.errorAtom,
      }),
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
