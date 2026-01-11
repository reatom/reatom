import type {
  AbortExt,
  Action,
  Computed,
  Deatomize,
  FieldError,
  FieldFocus,
  Rec,
} from '../'
import {
  action,
  computed,
  deatomize,
  isAtom,
  isRec,
  named,
  ReatomError,
  withAbort,
  withMemo,
} from '../'
import { type FieldAtom } from './reatomField'
import { type FieldArrayAtom, isFieldArrayAtom } from './reatomFieldArray'
import {
  type FieldsAtomize,
  type FieldsAtomizeInitState,
  type FieldsAtomizeInitStateRecord,
  type FieldsAtomizeModel,
  reatomFieldsAtomize,
} from './reatomFieldsAtomize'
import { fieldInitFocus, isFieldAtom } from './withBaseField'

export interface FieldSetFieldError extends FieldError {
  field: FieldAtom
}

export interface FieldSetValidation {
  /** The list of field validation errors. */
  errors: FieldSetFieldError[]

  /** The validation actuality status. */
  triggered: boolean

  /** The field async validation status */
  validating: undefined | Promise<{ errors: FieldSetFieldError[] }>
}

export type DeepPartial<T, Skip = never> = {
  [K in keyof T]?: T[K] extends Skip
    ? T[K]
    : T[K] extends Rec
      ? DeepPartial<T[K], Skip>
      : T[K]
}

export type FieldSetInitState = FieldsAtomizeInitStateRecord

export type FieldSetState<InitState extends FieldSetInitState> = Deatomize<
  FieldsAtomize<InitState>
>

export type FieldSetPartialState<InitState extends FieldSetInitState> =
  DeepPartial<FieldSetState<InitState>, Array<unknown>>

export interface ValidationlessFieldSetAtom<InitState extends FieldSetInitState>
  extends Computed<FieldSetState<InitState>>, FieldsAtomizeModel<InitState> {
  /** Computed list of all the fields from the fields tree */
  fieldsList: Computed<FieldAtom[]>

  /** Computed list of all the field arrays from the fields tree */
  fieldArraysList: Computed<FieldArrayAtom[]>

  /**
   * Atom with the state of the fieldset, computed from all the fields in
   * `fieldsList`
   *
   * @deprecated Use target atom instead
   */
  fieldsState: Computed<FieldSetState<InitState>>

  /**
   * Atom with focus state of the fieldset, computed from all the fields in
   * `fieldsList`
   */
  focus: Computed<FieldFocus>

  /** Action to set initial values for each field or field array in the fieldset */
  init: Action<[initState: FieldSetPartialState<InitState>], void>

  /** Action to reset the state, the value, the validation, and the focus states. */
  reset: Action<[initState?: FieldSetPartialState<InitState>], void>
}

export interface FieldSetAtom<
  InitState extends FieldSetInitState,
> extends ValidationlessFieldSetAtom<InitState> {
  /**
   * Atom with validation state of the fieldset, computed from all the fields in
   * `fieldsList`
   */
  validation: Computed<FieldSetValidation> & {
    /** Action to trigger fieldset validation. */
    trigger: Action<[], FieldSetValidation> & AbortExt
  }
}

export const reatomFieldSet = <InitState extends FieldSetInitState>(
  initState: InitState | ((name: string) => InitState),
  name: string = named('fieldSet'),
): FieldSetAtom<InitState> => {
  const { fields, onFieldCreated } = reatomFieldsAtomize(
    typeof initState == 'function' ? initState(name) : initState,
    name,
  )

  const fieldsList = computed(
    () => computeFieldsList(fields),
    `${name}._fieldsList`,
  )
  const fieldArraysList = computed(
    () => computeFieldArraysList(fields),
    `${name}._fieldArraysList`,
  )
  const fieldsState = computed(() => deatomize(fields), name)

  const focus = computed(() => {
    const focus = { ...fieldInitFocus }

    for (const field of fieldsList()) {
      if (field.disabled()) continue

      const { active, dirty, touched } = field.focus()
      focus.active ||= active
      focus.dirty ||= dirty
      focus.touched ||= touched
    }

    return focus
  }, `${name}.focus`).extend(withMemo())

  const validation = computed(() => {
    const validationErrors: FieldSetFieldError[] = []
    const promises: Promise<{ errors: FieldSetFieldError[] }>[] = []
    const validation: FieldSetValidation = {
      errors: validationErrors,
      validating: undefined,
      triggered: true,
    }

    for (const field of fieldsList()) {
      if (field.disabled()) continue

      const errors = field.validation.errors()
      const { triggered, validating } = field.validation()

      validation.triggered &&= triggered
      validationErrors.push(...errors.map((err) => ({ ...err, field })))

      if (validating)
        promises.push(
          validating.then(({ errors }) => ({
            errors: errors.map((err) => ({ ...err, field })),
          })),
        )
    }

    validation.validating = promises.length
      ? Promise.all(promises).then((results) => ({
          errors: results.flatMap((e) => e.errors),
        }))
      : undefined

    return validation
  }, `${name}.validation`).extend(withMemo(), (target) => ({
    trigger: action(() => {
      for (const field of fieldsList()) {
        if (!field.validation().triggered) field.validation.trigger()
      }

      return target()
    }, `${target.name}.trigger`).extend(withAbort()),
  }))

  const reinitState = (
    initState: FieldSetPartialState<InitState>,
    fields: FieldsAtomize<FieldSetInitState>,
  ) => {
    for (const [key, value] of Object.entries(initState)) {
      const targetValue = fields[key]
      if (!targetValue)
        throw new ReatomError(`Field ${key} not found in fields`)

      if (isRec(value) && !isAtom(targetValue)) {
        // @ts-ignore bad value inference from Object.entries
        reinitState(value, targetValue)
      } else if (isFieldAtom(targetValue)) {
        ;(targetValue as FieldAtom).initState.set(value)
      } else if (isFieldArrayAtom(targetValue)) {
        targetValue.initState.set(value)
      }
    }
  }

  const init = action((initState: FieldSetPartialState<InitState>) => {
    reinitState(initState, fields)
  }, `${name}.init`)

  const reset = action((initState?: FieldSetPartialState<InitState>) => {
    if (initState) init(initState)

    fieldArraysList().forEach((fieldArray) => fieldArray.reset())
    fieldsList().forEach((fieldAtom) => fieldAtom.reset())
  }, `${name}.reset`)

  return Object.assign(fieldsState, {
    fields,
    fieldsState,
    fieldsList,
    fieldArraysList,
    focus,
    validation,
    init,
    reset,
    onFieldCreated,
  })
}

const computeFieldArraysList = (
  fields: FieldsAtomize<FieldsAtomizeInitState>,
): FieldArrayAtom[] => {
  const fieldsList: FieldArrayAtom[] = []

  if (isFieldArrayAtom(fields)) {
    fieldsList.push(fields)
    fields.array().forEach((e) => fieldsList.push(...computeFieldArraysList(e)))
  } else if (isRec(fields)) {
    for (const element of Object.values(fields)) {
      fieldsList.push(...computeFieldArraysList(element as typeof fields))
    }
  }
  return fieldsList
}

const computeFieldsList = (
  fields: FieldsAtomize<FieldsAtomizeInitState>,
): Array<FieldAtom> => {
  const fieldsList: Array<FieldAtom> = []

  if (isFieldArrayAtom(fields)) {
    fields.array().forEach((e) => fieldsList.push(...computeFieldsList(e)))
  } else if (isRec(fields)) {
    for (const element of Object.values(fields)) {
      fieldsList.push(...computeFieldsList(element as typeof fields))
    }
  } else {
    fieldsList.push(fields)
  }
  return fieldsList
}

/** @deprecated Renamed. Use FieldSetInitState instead */
export type FormInitState = FieldSetInitState

/** @deprecated Renamed. Use FieldSetState instead */
export type FormState<InitState extends FieldSetInitState> =
  FieldSetState<InitState>

/** @deprecated Renamed. Use FieldSetPartialState instead */
export type FormPartialState<InitState extends FieldSetInitState> =
  FieldSetPartialState<InitState>

/** @deprecated Renamed. Use ValidationlessFieldSetAtom instead */
export type ValidationlessFieldSet<InitState extends FieldSetInitState> =
  ValidationlessFieldSetAtom<InitState>

/** @deprecated Renamed. Use FieldSetAtom instead */
export type FieldSet<InitState extends FieldSetInitState> =
  FieldSetAtom<InitState>
