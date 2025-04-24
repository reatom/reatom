import { isLinkedListAtom, isObject, entries, named, computed, withMemo, parseAtoms } from '@reatom/core';
import { type FieldAtom, isFieldAtom, fieldInitFocus, fieldInitValidation } from './reatomField';
import { FormInitState, FormFields, FormFieldElement } from './reatomForm';

const computeFieldsList = <T extends FormInitState>(
  fields: FormFields<T>,
  acc: Array<FieldAtom> = []
): Array<FieldAtom> => {
  const computeElement = (
    element: FormFieldElement,
    acc: Array<FieldAtom> = []
  ) => {
    if (isLinkedListAtom(element)) {
      const elements = element.array();
      elements.forEach(e => computeElement(e, acc));
    }
    else if (isFieldAtom(element))
      acc.push(element);
    else if (isObject(element))
      computeFieldsList(element, acc);

    return acc;
  };

  for (const [_, field] of entries(fields))
    acc.push(...computeElement(field));

  return acc;
};

export const reatomFieldSet = <T extends FormInitState>(
  fields: FormFields<T>,
  name = named('fieldsSet')
) => {
  const fieldsList = computed(() => computeFieldsList(fields), `${name}.fieldsList`);

  const focus = computed(() => {
    const focus = { ...fieldInitFocus };

    for (const field of fieldsList()) {
      const { active, dirty, touched } = field.focus();
      focus.active ||= active;
      focus.dirty ||= dirty;
      focus.touched ||= touched;
    }

    return focus;
  }, `${name}.focus`).extend(withMemo());

  const validation = computed(() => {
    const validation = { ...fieldInitValidation };
    validation.triggered = true;

    for (const field of fieldsList()) {
      const { triggered, validating, error } = field.validation();

      validation.triggered &&= triggered;
      validation.validating ||= validating;
      validation.error ||= error;
    }

    return validation;
  }, `${name}.validation`).extend(withMemo());

  const fieldsState = computed(() => parseAtoms(fields), `${name}.fieldsState`);

  return {
    fields,
    fieldsList,
    fieldsState,
    focus,
    validation,
  };
};
