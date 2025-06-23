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
  FieldValidation,
} from './reatomField'

import type { StandardSchemaV1 } from '@standard-schema/spec'
import { withInit } from '@reatom/hooks'
import { FieldSet, reatomFieldSet } from './reatomFieldSet'

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

export interface SubmitAction extends AsyncAction<[], void> {
  error: Atom<Error | undefined>
  statusesAtom: AsyncStatusesAtom
}

export interface Form<T extends FormInitState, SchemaState>
  extends Omit<FieldSet<T>, 'validation'> {
  /** Atom with validation state of the form, computed from all the fields in `fieldsList` */
  validation: Atom<FieldValidation> & {
    /** Action to trigger form validation. */
    trigger: AsyncAction<
      [],
      Promise<undefined extends SchemaState ? FormState<T> : SchemaState>
    >
  }

  /** Submit async handler. It checks the validation of all the fields in `fieldsList`, calls the form's `validate` options handler, and then the `onSubmit` options handler. Check the additional options properties of async action: https://www.reatom.dev/package/async/. */
  submit: SubmitAction

  /** Atom with submitted state of the form */
  submitted: Atom<boolean>
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

export interface FormOptionsWithSchema<State> extends BaseFormOptions {
  /** The callback to process valid form data, typed according to the schema */
  onSubmit?: (ctx: AsyncCtx, state: State) => void | Promise<void>

  /** The callback to validate form fields, typed according to the schema */
  validate?: (ctx: Ctx, state: State) => any

  /** The schema which supports StandardSchemaV1 specification to validate form fields. */
  schema: StandardSchemaV1<State>
}

export interface FormOptionsWithoutSchema<T extends FormInitState>
  extends BaseFormOptions {
  /** The callback to process valid form data, typed according to the raw form state */
  onSubmit?: (ctx: AsyncCtx, state: FormState<T>) => void | Promise<void>

  /** The callback to validate form fields, typed according to the raw form state */
  validate?: (ctx: Ctx, state: FormState<T>) => any

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

export function reatomForm<T extends FormInitState, SchemaState>(
  initState: T | ((name: string) => T),
  optionsWithSchema: FormOptionsWithSchema<SchemaState>,
): Form<T, SchemaState>

export function reatomForm<T extends FormInitState>(
  initState: T | ((name: string) => T),
  options?: FormOptionsWithoutSchema<T>,
): Form<T, undefined>

export function reatomForm<T extends FormInitState>(
  initState: T | ((name: string) => T),
  name?: string,
): Form<T, undefined>

export function reatomForm<T extends FormInitState, SchemaState>(
  initState: T | ((name: string) => T),
  options:
    | string
    | FormOptionsWithSchema<SchemaState>
    | FormOptionsWithoutSchema<T> = {},
): Form<T, SchemaState> {
  const {
    name = __count('form'),
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
    initState instanceof Function ? initState(name) : initState,
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
            if (!ctx.get(field.validation).error && !isCausedBy(ctx, submit))
              checkSchemaValidation(ctx, field)
          })
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
    reset,
    init,
  } = reatomFieldSet(fields, name)

  reset.onCall((ctx) => {
    submitted(ctx, false)
    submit.errorAtom.reset(ctx)
    submit.abort(ctx, `${name}.reset`)
  })

  const submitted = atom(false, `${name}.submitted`)

  const checkSchemaValidation = action((ctx: Ctx, triggerOnlyFor?: Atom) => {
    const state = ctx.get(fieldsState)
    if (!schema) throw new Error('Triggering schema validation without schema')

    const validation = schema['~standard'].validate(state)

    const placeErrors = (result: StandardSchemaV1.Result<SchemaState>) => {
      if (!result.issues?.length) return result
      for (const issue of result.issues) {
        const field = resolveFieldByPath(ctx, issue.path, fields)
        if (!field || (triggerOnlyFor && triggerOnlyFor !== field)) continue

        if (ctx.get(field.disabled)) continue

        field.validation.setError(ctx, issue.message)

        if (triggerOnlyFor) break
      }
      return result
    }

    return validation instanceof Promise
      ? validation.then(placeErrors)
      : placeErrors(validation)
  }, `${name}.checkSchemaValidation`)

  const origValidationTrigger = fieldsetValidation.trigger
  const validationTrigger = reatomAsync(async (ctx) => {
    const status = origValidationTrigger(ctx)
    const { error } = status.validating
      ? await ctx.schedule(() => status.validating!)
      : status
    if (error) throw new Error(error)

    let state: any

    if (schema) {
      const promise = checkSchemaValidation(ctx)
      const schemaValidationResult =
        promise instanceof Promise ? await ctx.schedule(() => promise) : promise
      if (!('value' in schemaValidationResult))
        throw new Error(
          schemaValidationResult.issues[0]?.message ?? 'Unknown schema error',
        )

      state = schemaValidationResult.value
    } else {
      state = ctx.get(fieldsState)
    }

    if (validate) {
      const promise = validate(ctx, state)
      if (promise instanceof Promise) {
        await ctx.schedule(() => promise)
      }
    }

    return state
  }, `${name}.validation.triggerExt`)

  const submit = reatomAsync(async (ctx) => {
    const state = await ctx.schedule(() => validationTrigger(ctx))
    if (onSubmit) await ctx.schedule(() => onSubmit(ctx, state))

    submitted(ctx, true)

    if (resetOnSubmit) {
      // do not use `reset` action here to not abort the success
      ctx.get(fieldsList).forEach((fieldAtom) => fieldAtom.reset(ctx))
      submit.errorAtom.reset(ctx)
      submit.statusesAtom.reset(ctx)
      submitted(ctx, false)
    }
  }, `${name}.onSubmit`).pipe(
    withStatusesAtom(),
    withAbort(),
    withErrorAtom(undefined, { resetTrigger: 'onFulfill' }),
    (submit) => Object.assign(submit, { error: submit.errorAtom }),
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
