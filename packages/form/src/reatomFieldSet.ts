import { CtxSpy, isAtom, type Atom, type Action, __count, atom, action, type Ctx, type Rec } from '@reatom/core';
import { parseAtoms } from '@reatom/lens';
import { isLinkedListAtom } from '@reatom/primitives';
import { entries, isShallowEqual, isObject } from '@reatom/utils';
import { type FieldAtom, type FieldFocus, type FieldValidation, fieldInitFocus, fieldInitValidation } from './reatomField';
import { FormInitState, FormFields, FormFieldElement, FormFieldArrayAtom, FormState, FormPartialState } from './reatomForm';

export interface FieldSet<T extends FormInitState> {
  /** Fields from the init state */
  fields: FormFields<T>;

  /** Computed list of all the fields from the fields tree */
  fieldsList: Atom<FieldAtom[]>;

  /** Computed list of all the field arrays from the fields tree */
  fieldArraysList: Atom<FormFieldArrayAtom[]>;

  /** Atom with the state of the fieldset, computed from all the fields in `fieldsList` */
  fieldsState: Atom<FormState<T>>;

  /** Atom with focus state of the fieldset, computed from all the fields in `fieldsList` */
  focus: Atom<FieldFocus>;

  /** Atom with validation state of the fieldset, computed from all the fields in `fieldsList` */
  validation: Atom<FieldValidation>;

  /** Action to set initial values for each field or field array in the fieldset */
  init: Action<[initState: FormPartialState<T>], void>;

  /** Action to reset the state, the value, the validation, and the focus states. */
  reset: Action<[initState?: FormPartialState<T>], void>;
}

export const reatomFieldsSet = <T extends FormInitState>(
  fields: FormFields<T>,
  name = __count('fieldsSet')
): FieldSet<T> => {
  const fieldsList = atom(ctx => computeFieldsList(ctx, fields), `${name}.fieldsList`);
  const fieldArraysList = atom(ctx => computeFieldArraysList(ctx, fields), `${name}.fieldArraysList`);
  const fieldsState = atom(ctx => parseAtoms(ctx, fields), `${name}.fieldsState`);
  
  const focus = atom((ctx, state = fieldInitFocus) => {
    const focus = { ...fieldInitFocus };

    for (const field of ctx.spy(fieldsList)) {
      if (ctx.spy(field.disabled))
        continue;

      const { active, dirty, touched } = ctx.spy(field.focus);
      focus.active ||= active;
      focus.dirty ||= dirty;
      focus.touched ||= touched;
    }

    return isShallowEqual(focus, state) ? state : focus;
  }, `${name}.focus`);

  const validation = atom((ctx, state = fieldInitValidation) => {
    const validation = { ...fieldInitValidation };
    validation.triggered = true;

    for (const field of ctx.spy(fieldsList)) {
      if (ctx.spy(field.disabled))
        continue;

      const { triggered, validating, error } = ctx.spy(field.validation);

      validation.triggered &&= triggered;
      validation.validating ||= validating;
      validation.error ||= error;
    }

    return isShallowEqual(validation, state) ? state : validation;
  }, `${name}.validation`);

  const reinitState = (ctx: Ctx, initState: FormPartialState<T>, fields: FormFields) => {
    for (const [key, value] of Object.entries(initState as Rec)) {
      if (isLinkedListAtom(fields[key])) {
        // @ts-expect-error bad type for initiate
        fields[key].initState(ctx, fields[key].initiate(ctx, value.map(v => [v])));
      }
      else if (isObject(value) &&
        !(value instanceof Date) &&
        key in fields &&
        !isAtom(fields[key])) {
        reinitState(ctx, value, fields[key] as unknown as FormFields);
      }
      else if (isAtom(fields[key])) {
        fields[key].initState(ctx, value);
      }
    }
  };

  const init = action((ctx, initState: FormPartialState<T>) => {
    reinitState(ctx, initState, fields);
  }, `${name}.init`);

  const reset = action((ctx, initState?: FormPartialState<T>) => {
    if (initState)
      reinitState(ctx, initState, fields);

    ctx.get(fieldArraysList).forEach((fieldArray) => fieldArray.reset(ctx));
    ctx.get(fieldsList).forEach((fieldAtom) => fieldAtom.reset(ctx));
  }, `${name}.reset`);

  return {
    fieldsList,
    fieldArraysList,
    fields,
    fieldsState,
    focus,
    validation,
    init,
    reset
  };
};

const computeFieldsList = <T extends FormInitState>(
  ctx: CtxSpy,
  fields: FormFields<T>,
  acc: Array<FieldAtom> = []
): Array<FieldAtom> => {
  const computeElement = (
    element: FormFieldElement,
    acc: Array<FieldAtom> = []
  ) => {
    if (isLinkedListAtom(element)) {
      const elements = ctx.spy(element.array);
      elements.forEach(e => computeElement(e, acc));
    }
    else if (isAtom(element)) acc.push(element);
    else computeFieldsList(ctx, element, acc);

    return acc;
  };

  for (const [_, field] of entries(fields))
    acc.push(...computeElement(field));

  return acc;
};

const computeFieldArraysList = <T extends FormInitState>(
  ctx: CtxSpy,
  fields: FormFields<T>,
  acc: Array<FormFieldArrayAtom<unknown>> = []
) => {
  const computeElement = (
    element: FormFieldElement,
    acc: Array<FormFieldArrayAtom<unknown>> = []
  ) => {
    if (isLinkedListAtom(element)) {
      acc.push(element as FormFieldArrayAtom<unknown>);
      ctx.spy(element.array).forEach(e => computeElement(e, acc));
    }
    else if (!isAtom(element))
      computeFieldArraysList(ctx, element, acc);

    return acc;
  };

  for (const [_, field] of entries(fields)) {
    acc.push(...computeElement(field));
  }

  return acc;
};
