import {
  type Action,
  type Computed,
  type Atom,
  AtomState,
  type Rec,
  named,
  action,
  atom,
  isAtom,
  isCausedBy,
  LLNode,
  LinkedList,
  LinkedListAtom,
  LinkedListLikeAtom,
  isLinkedListAtom,
  reatomLinkedList,
  type ParseAtoms,
  entries,
  isObject,
  computed,
  withCallHook,
  take,
  wrap,
  withAbort,
  withAsync
} from '@reatom/core';

import {
  type FieldAtom,
  type FieldFocus,
  type FieldValidation,
  reatomField,
  type FieldOptions,
  FieldLikeAtom,
  isFieldAtom,
} from './reatomField';

import type { StandardSchemaV1 } from '@standard-schema/spec'
import { reatomFieldSet } from './reatomFieldSet';

export interface FormFieldOptions<State = any, Value = State>
  extends FieldOptions<State, Value> {
  initState: State;
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
  | { [key: string]: FormInitStateElement }

export type FormInitState = {
  [key: string]: FormInitStateElement | FormInitState
};

type ExtractFieldArray<T> = {
  [K in keyof T]: T[K] extends FormFieldArray<infer Param, infer _Node> ? Param[] : ExtractFieldArray<T[K]>
}

export type FormFieldArrayAtom<Param, Node extends FormInitStateElement = FormInitStateElement>
  = LinkedListAtom<[ExtractFieldArray<Param>], FormFieldElement<Node>> & {
    reset: Action<[], AtomState<FormFieldArrayAtom<Param, Node>>>
    initState: Atom<LinkedList<LLNode<FormFieldElement<Node>>>>
  }

export type FormFieldElement<T extends FormInitStateElement = FormInitStateElement> =
  T extends FieldLikeAtom
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
  : FieldAtom<T>;

export type FormFields<T extends FormInitState = FormInitState> = {
  [K in keyof T]: FormFieldElement<T[K]>
};

export type FormState<T extends FormInitState = FormInitState> = ParseAtoms<
  FormFields<T>
>;

export type DeepPartial<T, Skip = never> = {
  [K in keyof T]?: T[K] extends Skip ? T[K] : T[K] extends Rec ? DeepPartial<T[K], Skip> : T[K];
};
export type FormPartialState<T extends FormInitState = FormInitState> =
  DeepPartial<FormState<T>, Array<unknown>>;

export interface SubmitAction extends Action<[], Promise<void>> {
  error: Computed<Error | undefined>;
}

export interface Form<T extends FormInitState> {
  /** Fields from the init state */
  fields: FormFields<T>;

  /** Atom with the state of the form, computed from all the fields in `fieldsList` */
  fieldsState: Computed<FormState<T>>;

  /** Atom with focus state of the form, computed from all the fields in `fieldsList` */
  focus: Computed<FieldFocus>;

  init: Action<[initState: FormPartialState<T>], void>;

  /** Action to reset the state, the value, the validation, and the focus states. */
  reset: Action<[initState?: FormPartialState<T>], void>;

  /** Submit async handler. It checks the validation of all the fields in `fieldsList`, calls the form's `validate` options handler, and then the `onSubmit` options handler. Check the additional options properties of async action: https://www.reatom.dev/package/async/. */
  submit: SubmitAction;

  submitted: Computed<boolean>;

  /** Atom with validation state of the form, computed from all the fields in `fieldsList` */
  validation: Computed<FieldValidation>;
}

export interface BaseFormOptions {
  name?: string;

  /** Should reset the state after success submit? @default true */
  resetOnSubmit?: boolean;

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
  onSubmit?: (state: State) => void | Promise<void>

  /** The callback to validate form fields, typed according to the schema */
  validate?: (state: State) => any

  /** The schema which supports StandardSchemaV1 specification to validate form fields. */
  schema: StandardSchemaV1<State>
}

export interface FormOptionsWithoutSchema<T extends FormInitState> extends BaseFormOptions {
  /** The callback to process valid form data, typed according to the raw form state */
  onSubmit?: (state: FormState<T>) => void | Promise<void>

  /** The callback to validate form fields, typed according to the raw form state */
  validate?: (state: FormState<T>) => any

  /** Schema is explicitly disallowed or undefined in this variant */
  schema?: undefined
}

const reatomFormFields = <T extends FormInitState>(
  initState: T,
  options: {
    name: string,
    onFieldResolved?: (field: FieldAtom) => void
  }
): FormFields<T> => {
  const { name, onFieldResolved } = options;
  const fields = Array.isArray(initState)
    ? ([] as FormFields<T>)
    : ({} as FormFields<T>);

  const createFieldElement = (element: FormInitStateElement, name: string): FormFieldElement => {
    if (isAtom(element)) {
      onFieldResolved?.(element)
      return element
    }
    else if (isObject(element) && !(element instanceof Date)) {
      if (Array.isArray(element)) {
        return createFieldElement(createFieldArray(element), name)
      }
      else if (isFieldArray(element)) {
        let id = 0;
        const linkedListAtom = reatomLinkedList({
          create: (param) => {
            const itemName = `${name}.${++id}`;
            return createFieldElement(element.create(param, itemName), itemName)
          },
          initSnapshot: element.initState.map(state => ([state] as [param: any]))
        }, name);

        const initState = atom(() => linkedListAtom(), `${linkedListAtom.name}.initState`)

        // @ts-expect-error bad keys type inference
        return Object.assign(linkedListAtom, {
          initState,
          reset: action(() => {
            linkedListAtom(initState())
          })
        });
      }
      else if ('initState' in element) {
        const field = reatomField(element.initState, {
          name,
          ...(element as FieldOptions),
        })

        onFieldResolved?.(field)
        return field
      }
      else {
        return reatomFormFields(element, { name, onFieldResolved })
      }
    }
    else {
      const field = reatomField(element, { name })
      onFieldResolved?.(field)
      return field
    }
  }

  for (const [key, value] of Object.entries(initState)) {
    // @ts-expect-error bad keys type inference
    fields[key] = createFieldElement(value, `${name}.${key}`);
  }
  return fields;
};

const computeFieldArraysList = <T extends FormInitState>(
  fields: FormFields<T>,
  acc: Array<FormFieldArrayAtom<unknown>> = []
) => {
  const computeElement = (
    element: FormFieldElement,
    acc: Array<FormFieldArrayAtom<unknown>> = [],
  ) => {
    if (isLinkedListAtom(element)) {
      acc.push(element as FormFieldArrayAtom<unknown>);
      element.array().forEach(e => computeElement(e, acc));
    }
    else if (!isAtom(element))
      computeFieldArraysList(element, acc)

    return acc;
  }

  for (const [_, field] of entries(fields)) {
    acc.push(...computeElement(field));
  }

  return acc;
};

interface FormFieldArray<Param, Node extends FormInitStateElement = FormInitStateElement> {
  create: (param: Param, name: string) => Node,
  initState: Array<Param>;
  __fieldArray: true;
}

function createFieldArray<Param extends FormInitStateElement>(
  initState: Array<Param>
): FormFieldArray<Param, Param>;

function createFieldArray<Param, Node extends FormInitStateElement = FormInitStateElement>(
  create: ((params: Param, name: string) => Node)
): FormFieldArray<Param, Node>;

function createFieldArray<Param, Node extends FormInitStateElement = FormInitStateElement>(
  options: {
    create: (param: Param, name: string) => Node
    initState?: Array<Param>,
  }
): FormFieldArray<Param, Node>;

function createFieldArray<Param, Node extends FormInitStateElement = FormInitStateElement>(
  options:
    | Array<Param>
    | ((params: Param, name: string) => Node)
    | {
      create: (param: Param, name: string) => Node
      initState?: Array<Param>,
    }
): FormFieldArray<Param, Node> {
  const {
    create,
    initState = [],
  } = typeof options === 'function'
      ? { create: options }
      : Array.isArray(options)
        ? {
          create: (param: Param) => param as unknown as Node,
          initState: options
        }
        : options;

  return {
    create,
    initState,
    __fieldArray: true
  }
}

const isFieldArray = (value: any): value is FormFieldArray<any> => value?.__fieldArray;

export { createFieldArray as experimental_fieldArray };
export type ArrayFieldItem<T> = T extends LinkedListLikeAtom<infer _Node> ? AtomState<T['array']>[number] : never;

const resolveFieldByPath = <T extends FormInitState>(
  path: StandardSchemaV1.Issue['path'],
  acc: FormFields<T>
): FieldAtom | null => {
  if (!path?.length)
    return null;

  const shiftedPath = [...path];
  const pathSegment = shiftedPath.shift()!;
  if (typeof pathSegment === 'symbol')
    return null;

  const key = typeof pathSegment === 'object' && 'key' in pathSegment
    ? pathSegment.key.toString()
    : pathSegment.toString();

  const field = acc[key];
  if (!field)
    return null;

  if (isLinkedListAtom(field)) {
    // @ts-expect-error bad key inference
    return resolveFieldByPath(shiftedPath, field.array())
  }
  else if (isFieldAtom(field)) {
    return field
  }
  else {
    return resolveFieldByPath(shiftedPath, field)
  }
}

export function reatomForm<T extends FormInitState, SchemaState>(
  initState: T | ((name: string) => T),
  optionsWithSchema: FormOptionsWithSchema<SchemaState>
): Form<T>

export function reatomForm<T extends FormInitState>(
  initState: T | ((name: string) => T),
  options?: FormOptionsWithoutSchema<T>
): Form<T>

export function reatomForm<T extends FormInitState>(
  initState: T | ((name: string) => T),
  name?: string
): Form<T>

export function reatomForm<T extends FormInitState, SchemaState>(
  initState: T | ((name: string) => T),
  options: string | FormOptionsWithSchema<SchemaState> | FormOptionsWithoutSchema<T> = {},
): Form<T> {
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
  } = typeof options === 'string'
      ? ({ name: options })
      : options;

  const fields = reatomFormFields(typeof initState == 'function' ? initState(name) : initState, {
    name: `${name}.fields`,
    onFieldResolved: (field) => {
      if (field.validateOnChange() === undefined)
        field.validateOnChange(validateOnChange);

      if (field.validateOnBlur() === undefined)
        field.validateOnBlur(validateOnBlur);

      if (field.keepErrorDuringValidating() === undefined)
        field.keepErrorDuringValidating(keepErrorDuringValidating);

      if (field.keepErrorOnChange() === undefined)
        field.keepErrorOnChange(keepErrorOnChange);

      if (schema) {
        field.shouldValidate(true);

        field.validation.trigger.extend(
          withCallHook(() => {
            if (!field.validation().error && !isCausedBy(submit))
              checkSchemaValidation(field);
          })
        )
      }
    },
  });

  const {
    fieldsList,
    fieldsState,
    focus,
    validation
  } = reatomFieldSet(fields, name);

  const fieldArraysList = computed(() => computeFieldArraysList(fields), `${name}.fieldArraysList`);

  const submitted = atom(false, `${name}.submitted`);

  const reset = action((initState?: FormPartialState<T>) => {
    if (initState)
      reinitState(initState, fields);

    fieldArraysList().forEach((fieldArray) => fieldArray.reset());
    fieldsList().forEach((fieldAtom) => fieldAtom.reset());

    submitted(false);
    submit.error.reset();

    if (!isCausedBy(submit))
      submit.abort(`${name}.reset`);
  }, `${name}.reset`);

  const reinitState = (initState: FormPartialState<T>, fields: FormFields) => {
    for (const [key, value] of Object.entries(initState as Rec)) {
      if (isLinkedListAtom(fields[key])) {
        // @ts-expect-error bad type for initiate
        fields[key].initState(fields[key].initiateFromSnapshot(value.map(v => [v])));
      }
      else if (
        isObject(value) &&
        !(value instanceof Date) &&
        key in fields &&
        !isAtom(fields[key])
      ) {
        reinitState(value, fields[key] as unknown as FormFields);
      }
      else if (isAtom(fields[key])) {
        fields[key].initState(value);
      }
    }
  };

  const init = action((initState: FormPartialState<T>) => {
    reinitState(initState, fields);
  }, `${name}.init`);

  const checkSchemaValidation = action(async (triggerOnlyFor?: Atom) => {
    if (!schema)
      throw new Error('Triggering schema validation without schema');

    const state = fieldsState();
    const validation = schema['~standard'].validate(state);
    const result = validation instanceof Promise ? await wrap(validation) : validation;

    if (result.issues?.length) {
      for (const issue of result.issues) {
        const field = resolveFieldByPath(issue.path, fields);
        if (!field || (triggerOnlyFor && triggerOnlyFor !== field))
          continue;

        field.validation.merge({
          error: issue.message,
          meta: undefined,
          triggered: true,
          validating: false,
        });

        if (triggerOnlyFor)
          break;
      }
    }

    return result;
  }, `${name}.checkSchemaValidation`);

  const submit = action(async () => {
    for (const field of fieldsList()) {
      if (!field.validation().triggered)
        field.validation.trigger();
    }

    if (validation().validating) {
      await wrap(
        (async () => {
          while (validation().validating)
            await take(validation, `${name}.onSubmit.validationTake`)
        })()
      )
    }

    const error = validation().error;
    if (error) throw new Error(error);

    let state: any

    if (schema) {
      const schemaValidationResult = await wrap(checkSchemaValidation());
      if (!('value' in schemaValidationResult))
        throw new Error(schemaValidationResult.issues[0]?.message ?? 'Unknown schema error');

      state = schemaValidationResult.value;
    }
    else {
      state = fieldsState();
    }

    if (validate) {
      const promise = validate(state);
      if (promise instanceof Promise)
        await wrap(promise);
    }

    if (onSubmit) {
      const promise = onSubmit(state);
      if (promise instanceof Promise)
        await wrap(promise);
    }

    submitted(true);

    if (resetOnSubmit)
      reset();
  }, `${name}.onSubmit`).extend(
    withAsync({ resetError: 'onFulfill' }),
    (target) => ({ 
      error: target.error.actions(target => ({ 
        reset: () => target(undefined) 
      })) 
    }),
    withAbort()
  );

  return {
    fields,
    fieldsState,
    focus,
    init,
    reset,
    submit,
    submitted,
    validation,
  };
};
