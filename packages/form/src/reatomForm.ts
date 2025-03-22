import {
  type Action,
  type Atom,
  AtomCache,
  AtomMut,
  AtomState,
  type Ctx,
  CtxSpy,
  type Rec,
  __count,
  action,
  atom,
  createCtx,
  isAtom,
} from '@reatom/core';

import { take } from '@reatom/effects';

import {
  type AsyncAction,
  withErrorAtom,
  withStatusesAtom,
  type AsyncStatusesAtom,
  reatomAsync,
  withAbort,
} from '@reatom/async';

import {
  LLNode,
  LL_NEXT,
  LL_PREV,
  LinkedList,
  LinkedListAtom,
  isLinkedListAtom,
  reatomLinkedList,
  withComputed,
} from '@reatom/primitives';

import { parseAtoms, withReset, type ParseAtoms } from '@reatom/lens';
import { entries, isObject, isShallowEqual } from '@reatom/utils';

import {
  type FieldAtom,
  type FieldFocus,
  type FieldValidation,
  fieldInitFocus,
  fieldInitValidation,
  reatomField,
  type FieldOptions,
  FieldLikeAtom,
} from './reatomField';

import type { StandardSchemaV1 } from '@standard-schema/spec'

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
  | Rec<FormInitStateElement>

export type FormInitState = Rec<FormInitStateElement | FormInitState>;

type ExtractFieldArray<T> = {
  [K in keyof T]: T[K] extends FormFieldArray<infer Param, infer Node> ? Param[] : ExtractFieldArray<T[K]>
}

export type FormFieldArrayAtom<Param, Node extends FormInitStateElement = FormInitStateElement>
  = LinkedListAtom<[ExtractFieldArray<Param>], FormFieldElement<Node>> & {
    reset: Action<[], AtomState<FormFieldArrayAtom<Param, Node>>>
    initState: AtomMut<LinkedList<LLNode<FormFieldElement<Node>>>>
  }

type FormFieldElement<T extends FormInitStateElement = FormInitStateElement> =
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

type DeepExtractLLNode<T> = {
  [K in keyof T]: T[K] extends Array<infer LLNode>
  ? Array<DeepExtractLLNode<Omit<LLNode, typeof LL_NEXT | typeof LL_PREV>>>
  : T[K]
}

export type FormPartialState<T extends FormInitState = FormInitState> =
  DeepPartial<DeepExtractLLNode<FormState<T>>, Array<unknown>>;

export interface SubmitAction extends AsyncAction<[], void> {
  error: Atom<Error | undefined>;
  statusesAtom: AsyncStatusesAtom;
}

export interface Form<T extends FormInitState> {
  /** Fields from the init state */
  fields: FormFields<T>;

  /** Atom with the state of the form, computed from all the fields in `fieldsList` */
  fieldsState: Atom<FormState<T>>;

  /** Atom with focus state of the form, computed from all the fields in `fieldsList` */
  focus: Atom<FieldFocus>;

  init: Action<[initState: FormPartialState<T>], void>;

  /** Action to reset the state, the value, the validation, and the focus states. */
  reset: Action<[initState?: FormPartialState<T>], void>;

  /** Submit async handler. It checks the validation of all the fields in `fieldsList`, calls the form's `validate` options handler, and then the `onSubmit` options handler. Check the additional options properties of async action: https://www.reatom.dev/package/async/. */
  submit: SubmitAction;

  submitted: Atom<boolean>;

  /** Atom with validation state of the form, computed from all the fields in `fieldsList` */
  validation: Atom<FieldValidation>;
}

export interface FormOptions<T extends FormInitState, State> {
  name?: string;

  /** The callback to process valid form data */
  onSubmit?: (ctx: Ctx, state: FormState<T>) => void | Promise<void>;

  /** The callback to validate form fields. */
  validate?: (ctx: Ctx, state: FormState<T>) => any;

  /** The schema which supports StandardSchemaV1 specification to validate form fields. */
  schema?: StandardSchemaV1<State>;

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

const reatomFormFields = <T extends FormInitState>(
  initState: T,
  options: {
    name: string,
    defaultFieldOptions?: FieldOptions
  }
): FormFields<T> => {
  const { name, defaultFieldOptions } = options;
  const fields = Array.isArray(initState)
    ? ([] as FormFields<T>)
    : ({} as FormFields<T>);

  const createFieldElement = (element: FormInitStateElement, name: string): FormFieldElement => {
    if (isAtom(element)) {
      return element
    }
    else if (isObject(element) && !(element instanceof Date)) {
      if (Array.isArray(element)) {
        return createFieldElement(createFieldArray(element), name)
      }
      else if (isFieldArray(element)) {
        let id = 0;
        const linkedListAtom = reatomLinkedList({
          create: (ctx, param) => createFieldElement(element.create(ctx, param), `${name}.${++id}`),
          initSnapshot: element.initState.map(state => ([state] as const))
        }, name);

        const initState = atom<AtomState<typeof linkedListAtom> | null>(
          null, `${linkedListAtom.__reatom.name}.initState`
        ).pipe(
          withComputed((ctx, state) => state ? state : ctx.spy(linkedListAtom))
        );

        // @ts-expect-error bad keys type inference
        return Object.assign(linkedListAtom, {
          initState,
          reset: action((ctx) => {
            ctx.get((read, actualize) => {
              actualize!(ctx, linkedListAtom.__reatom, (patchCtx: Ctx, patch: AtomCache) => {
                patch.state = ctx.get(initState)
              });
            })
          })
        });
      }
      else if ('initState' in element) {
        return reatomField(element.initState, {
          name,
          ...defaultFieldOptions,
          ...(element as FieldOptions),
        });
      }
      else {
        // @ts-expect-error bad keys type inference
        return reatomFormFields(element, { name, defaultFieldOptions })
      }
    }
    else {
      return reatomField(element, { name, ...defaultFieldOptions })
    }
  }

  for (const [key, value] of Object.entries(initState)) {
    // @ts-expect-error bad keys type inference
    fields[key] = createFieldElement(value, `${name}.${key}`);
  }
  return fields;
};

const computeFieldsList = <T extends FormInitState>(
  ctx: CtxSpy,
  fields: FormFields<T>,
  acc: Array<FieldAtom> = []
): Array<FieldAtom> => {
  const computeElement = (
    element: FormFieldElement,
    acc: Array<FieldAtom> = [],
  ) => {
    if (isLinkedListAtom(element)) {
      const elements = ctx.spy(element.array);
      elements.forEach(e => computeElement(e, acc))
    }
    else if (isAtom(element)) acc.push(element);
    else computeFieldsList(ctx, element, acc);

    return acc;
  }

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
    acc: Array<FormFieldArrayAtom<unknown>> = [],
  ) => {
    if (isLinkedListAtom(element)) {
      acc.push(element as FormFieldArrayAtom<unknown>);
      ctx.spy(element.array).forEach(e => computeElement(e, acc));
    }
    else if (!isAtom(element))
      computeFieldArraysList(ctx, element, acc)

    return acc;
  }

  for (const [_, field] of entries(fields)) {
    acc.push(...computeElement(field));
  }

  return acc;
};

interface FormFieldArray<Param, Node extends FormInitStateElement = FormInitStateElement> {
  create: (ctx: Ctx, param: Param) => Node,
  initState: Array<Param>;
  __fieldArray: true;
}

function createFieldArray<Param extends FormInitStateElement>(
  initState: Array<Param>
): FormFieldArray<Param, Param>;

function createFieldArray<Param, Node extends FormInitStateElement = FormInitStateElement>(
  create: ((ctx: Ctx, params: Param) => Node)
): FormFieldArray<Param, Node>;

function createFieldArray<Param, Node extends FormInitStateElement = FormInitStateElement>(
  options: {
    create: (ctx: Ctx, param: Param) => Node
    initState?: Array<Param>,
  }
): FormFieldArray<Param, Node>;

function createFieldArray<Param, Node extends FormInitStateElement = FormInitStateElement>(
  options:
    | Array<Param>
    | ((ctx: Ctx, params: Param) => Node)
    | {
      create: (ctx: Ctx, param: Param) => Node
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
          create: (ctx: Ctx, param: Param) => param as unknown as Node,
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

export { createFieldArray as fieldArray };

const resolveFieldByPath = <T extends FormInitState>(
  ctx: Ctx,
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
    return resolveFieldByPath(ctx, shiftedPath, ctx.get(field.array))
  }
  else if (isAtom(field)) {
    return field
  }
  else {
    return resolveFieldByPath(ctx, shiftedPath, field)
  }
}

export const reatomForm = <
  T extends FormInitState,
  SchemaState extends DeepExtractLLNode<FormState<T>>
>(
  initState: T,
  options: string | FormOptions<T, SchemaState> = {},
): Form<T> => {
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
  } = typeof options === 'string'
      ? ({ name: options } as FormOptions<T, SchemaState>)
      : options;

  const fields = reatomFormFields(initState instanceof Function ? initState(createFieldArray) : initState, {
    name: `${name}.fields`,
    defaultFieldOptions: {
      validateOnBlur,
      validateOnChange,
      keepErrorDuringValidating,
      keepErrorOnChange
    }
  });

  const fieldsState = atom(
    (ctx) => parseAtoms(ctx, fields),
    `${name}.fieldsState`,
  );

  const fieldsList = atom(ctx => computeFieldsList(ctx, fields), `${name}.fieldsList`);
  const fieldArraysList = atom(ctx => computeFieldArraysList(ctx, fields), `${name}.fieldArraysList`);

  const focus = atom((ctx, state = fieldInitFocus) => {
    const formFocus = { ...fieldInitFocus };

    for (const field of ctx.spy(fieldsList)) {
      const { active, dirty, touched } = ctx.spy(field.focus);
      formFocus.active ||= active;
      formFocus.dirty ||= dirty;
      formFocus.touched ||= touched;
    }

    return isShallowEqual(formFocus, state) ? state : formFocus;
  }, `${name}.focus`);

  const validation = atom((ctx, state = fieldInitValidation) => {
    const formValid = { ...fieldInitValidation };
    formValid.triggered = true;

    for (const field of ctx.spy(fieldsList)) {
      const { triggered, validating, error } = ctx.spy(field.validation);

      formValid.triggered &&= triggered;
      formValid.validating ||= validating;
      formValid.error ||= error;
    }

    return isShallowEqual(formValid, state) ? state : formValid;
  }, `${name}.validation`);

  const submitted = atom(false, `${name}.submitted`);

  const reset = action((ctx, initState?: FormPartialState<T>) => {
    if (initState)
      reinitState(ctx, initState, fields);

    ctx.get(fieldArraysList).forEach((fieldArray) => fieldArray.reset(ctx));
    ctx.get(fieldsList).forEach((fieldAtom) => fieldAtom.reset(ctx));

    submitted(ctx, false);
    submit.errorAtom.reset(ctx);
    submit.abort(ctx, `${name}.reset`);
  }, `${name}.reset`);

  const reinitState = (ctx: Ctx, initState: FormPartialState<T>, fields: FormFields) => {
    for (const [key, value] of Object.entries(initState as Rec)) {
      if (isLinkedListAtom(fields[key])) {
        // @ts-expect-error bad type for initiate
        fields[key].initState(ctx, fields[key].initiate(ctx, value.map(v => [v])));
      }
      else if (
        isObject(value) &&
        !(value instanceof Date) &&
        key in fields &&
        !isAtom(fields[key])
      ) {
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

  const checkSchemaValidation = async (ctx: Ctx, state: FormState<T>) => {
    if (!schema)
      return null;

    const validation = schema['~standard'].validate(state);
    const result = validation instanceof Promise ? await ctx.schedule(() => validation) : validation;

    if (result.issues?.length) {
      for (const issue of result.issues) {
        const field = resolveFieldByPath(ctx, issue.path, fields);
        if (!field)
          continue;

        field.validation.merge(ctx, {
          error: issue.message,
          meta: undefined,
          triggered: true,
          validating: false,
        })
      }
    }

    return result;
  }

  const submit = reatomAsync(async (ctx) => {
    ctx.get(() => {
      for (const field of ctx.get(fieldsList)) {
        if (!ctx.get(field.validation).triggered) {
          field.validation.trigger(ctx);
        }
      }
    });

    if (ctx.get(validation).validating) {
      await take(ctx, validation, (ctx, { validating }, skip) => {
        if (validating) return skip;
      });
    }

    const error = ctx.get(validation).error;

    if (error) throw new Error(error);

    const state = ctx.get(fieldsState);

    if (validate) {
      const promise = validate(ctx, state);
      if (promise instanceof Promise) {
        await ctx.schedule(() => promise);
      }
    }

    const schemaValidationResult = await checkSchemaValidation(ctx, state);
    if (schemaValidationResult && schemaValidationResult.issues?.length)
      throw new Error(schemaValidationResult.issues[0]!.message);

    if (onSubmit) await ctx.schedule(() => onSubmit(ctx, state));

    submitted(ctx, true);

    if (resetOnSubmit) {
      // do not use `reset` action here to not abort the success
      ctx.get(fieldsList).forEach((fieldAtom) => fieldAtom.reset(ctx));
      submit.errorAtom.reset(ctx);
      submit.statusesAtom.reset(ctx);
      submitted(ctx, false);
    }
  }, `${name}.onSubmit`).pipe(
    withStatusesAtom(),
    withAbort(),
    withErrorAtom(undefined, { resetTrigger: 'onFulfill' }),
    (submit) => Object.assign(submit, { error: submit.errorAtom }),
  );

  if(validateOnChange) {
    fieldsState.onChange((ctx, state) => {
      const changeCause = ctx.cause?.cause;
      const fieldArrayProtos = new Set(ctx.get(fieldArraysList).map(fieldArray => fieldArray.array.__reatom));

      if(changeCause && !fieldArrayProtos.has(changeCause.proto))
        checkSchemaValidation(ctx, state);
    })
  }

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
