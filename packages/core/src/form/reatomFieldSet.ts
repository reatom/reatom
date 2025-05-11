import {
  isLinkedListAtom,
  isObject,
  entries,
  named,
  computed,
  withMemo,
  parseAtoms,
  Computed,
  Action,
  isAtom,
  action,
  Rec,
} from '../../'

import {
  type FieldAtom,
  isFieldAtom,
  fieldInitFocus,
  fieldInitValidation,
  FieldFocus,
  FieldValidation,
} from './reatomField'

import {
  FormInitState,
  FormFields,
  FormFieldElement,
  FormState,
  FormPartialState,
  FormFieldArrayAtom,
} from './reatomForm'

export interface FieldSet<T extends FormInitState> {
  /** Fields from the init state */
  fields: FormFields<T>

  /** Computed list of all the fields from the fields tree */
  fieldsList: Computed<FieldAtom[]>

  /** Computed list of all the field arrays from the fields tree */
  fieldArraysList: Computed<FormFieldArrayAtom[]>

  /** Atom with the state of the fieldset, computed from all the fields in `fieldsList` */
  fieldsState: Computed<FormState<T>>

  /** Atom with focus state of the fieldset, computed from all the fields in `fieldsList` */
  focus: Computed<FieldFocus>

  /** Atom with validation state of the fieldset, computed from all the fields in `fieldsList` */
  validation: Computed<FieldValidation>

  /** Action to set initial values for each field or field array in the fieldset */
  init: Action<[initState: FormPartialState<T>], void>

  /** Action to reset the state, the value, the validation, and the focus states. */
  reset: Action<[initState?: FormPartialState<T>], void>
}

export const reatomFieldSet = <T extends FormInitState>(
  fields: FormFields<T>,
  name = named('fieldsSet'),
): FieldSet<T> => {
  const fieldsList = computed(
    () => computeFieldsList(fields),
    `${name}.fieldsList`,
  )
  const fieldArraysList = computed(
    () => computeFieldArraysList(fields),
    `${name}.fieldArraysList`,
  )
  const fieldsState = computed(() => parseAtoms(fields), `${name}.fieldsState`)

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
    const validation = { ...fieldInitValidation }
    validation.triggered = true

    for (const field of fieldsList()) {
      if (field.disabled()) continue

      const { triggered, validating, error } = field.validation()

      validation.triggered &&= triggered
      validation.validating ||= validating
      validation.error ||= error
    }

    return validation
  }, `${name}.validation`).extend(withMemo())

  const reinitState = (initState: FormPartialState<T>, fields: FormFields) => {
    for (const [key, value] of Object.entries(initState as Rec)) {
      let keyValue = fields[key] as unknown
      if (isLinkedListAtom(keyValue)) {
        // @ts-ignore TODO
        keyValue.initState(keyValue.initiateFromSnapshot(value.map((v) => [v])))
      } else if (
        isObject(value) &&
        !(value instanceof Date) &&
        key in fields &&
        !isAtom(keyValue)
      ) {
        reinitState(value, keyValue as unknown as FormFields)
      } else if (isAtom(keyValue)) {
        // @ts-ignore TODO
        keyValue.initState(value)
      }
    }
  }

  const init = action((initState: FormPartialState<T>) => {
    reinitState(initState, fields)
  }, `${name}.init`)

  const reset = action((initState?: FormPartialState<T>) => {
    if (initState) init(initState)

    fieldArraysList().forEach((fieldArray) => fieldArray.reset())
    fieldsList().forEach((fieldAtom) => fieldAtom.reset())
  }, `${name}.reset`)

  return {
    fields,
    fieldsList,
    fieldArraysList,
    fieldsState,
    focus,
    validation,
    init,
    reset,
  }
}

const computeFieldArraysList = <T extends FormInitState>(
  fields: FormFields<T>,
  acc: Array<FormFieldArrayAtom<unknown>> = [],
) => {
  const computeElement = (
    element: FormFieldElement,
    acc: Array<FormFieldArrayAtom<unknown>> = [],
  ) => {
    if (isLinkedListAtom(element)) {
      acc.push(element as FormFieldArrayAtom<unknown>)
      // @ts-ignore TODO
      element.array().forEach((e) => computeElement(e, acc))
    } else if (!isAtom(element)) computeFieldArraysList(element, acc)

    return acc
  }

  for (const [_, field] of entries(fields)) {
    acc.push(...computeElement(field))
  }

  return acc
}

const computeFieldsList = <T extends FormInitState>(
  fields: FormFields<T>,
  acc: Array<FieldAtom> = [],
): Array<FieldAtom> => {
  const computeElement = (
    element: FormFieldElement,
    acc: Array<FieldAtom> = [],
  ) => {
    if (isLinkedListAtom(element)) {
      const elements = element.array()
      elements.forEach((e) => computeElement(e, acc))
    } else if (isFieldAtom(element)) acc.push(element)
    else if (isObject(element)) computeFieldsList(element, acc)

    return acc
  }

  for (const [_, field] of entries(fields)) acc.push(...computeElement(field))

  return acc
}
