import { test, expect, vi } from 'vitest'
import { createCtx } from '@reatom/core'
import { fieldInitValidation, reatomField, withField } from '.'
import { reatomEnum } from '@reatom/primitives';
import { sleep } from '@reatom/utils';

test(`validateOnChange`, async () => {
  const ctx = createCtx();
  const field = reatomField('', { name: 'fieldAtom', validateOnChange: true });
  const changeFn = vi.fn();
  field.validation.trigger.onCall(() => changeFn());

  field.change(ctx, 'value');
  expect(changeFn).toHaveBeenCalledTimes(1);
})

test(`validateOnBlur`, async () => {
  const ctx = createCtx();
  const field = reatomField('', { name: 'fieldAtom', validateOnBlur: true });
  const blurFn = vi.fn();
  field.validation.trigger.onCall(() => blurFn());

  field.focus.out(ctx);
  expect(blurFn).toHaveBeenCalledTimes(1);
})

test(`keepErrorOnChange`, async () => {
  const ctx = createCtx()
  const validate = () => {
    throw new Error('validation error');
  }

  const fieldWithKeep = reatomField('', {
    name: 'fieldKeep',
    validate,
    keepErrorOnChange: true
  })

  const fieldWithoutKeep = reatomField('', {
    name: 'fieldNoKeep',
    validate,
    keepErrorOnChange: false
  })

  fieldWithKeep.validation.trigger(ctx)
  fieldWithoutKeep.validation.trigger(ctx)

  expect(ctx.get(fieldWithKeep.validation).error).toBe('validation error')
  expect(ctx.get(fieldWithoutKeep.validation).error).toBe('validation error')

  fieldWithKeep.change(ctx, 'new value')
  fieldWithoutKeep.change(ctx, 'new value')

  expect(ctx.get(fieldWithKeep.validation).error).toBe('validation error')
  expect(ctx.get(fieldWithoutKeep.validation).error).toBeUndefined()
})

test(`keepErrorDuringValidating`, async () => {
  const ctx = createCtx()

  const validate = async () => {
    await sleep()
    throw new Error('validation error');
  }

  const fieldWithKeep = reatomField('', {
    name: 'fieldKeep',
    validate,
    keepErrorDuringValidating: true
  })

  const fieldWithoutKeep = reatomField('', {
    name: 'fieldNoKeep',
    validate,
    keepErrorDuringValidating: false
  })

  fieldWithKeep.validation.trigger(ctx)
  fieldWithoutKeep.validation.trigger(ctx)

  await sleep();

  expect(ctx.get(fieldWithKeep.validation).error).toBe('validation error')
  expect(ctx.get(fieldWithoutKeep.validation).error).toBe('validation error')

  fieldWithKeep.change(ctx, 'new value')
  fieldWithoutKeep.change(ctx, 'new value')

  fieldWithKeep.validation.trigger(ctx)
  fieldWithoutKeep.validation.trigger(ctx)

  expect(ctx.get(fieldWithKeep.validation).error).toBe('validation error')
  expect(ctx.get(fieldWithoutKeep.validation).error).toBeUndefined()
})

test(`disabled state`, async () => {
  const ctx = createCtx()

  const field = reatomField('', {
    validateOnChange: true,
    contract: (value) => {
      if (value == 'errorValue')
        throw new Error('validation error');
    }
  });

  field.change(ctx, 'errorValue');
  expect(ctx.get(field.validation).error).toBe('validation error');

  field.disabled(ctx, true);
  expect(ctx.get(field.validation)).toMatchObject(fieldInitValidation);

  field.disabled(ctx, false);
  expect(ctx.get(field.validation).error).toBe('validation error');
})

test(`toState and fromState`, async () => {
  const ctx = createCtx()
  const label = 'label';

  const field = reatomField({ label, value: 1337 }, {
    name: 'fieldAtom',
    fromState: (ctx, state) => state.value,
    toState: (ctx, value) => ({ label, value }),
  });

  field(ctx, { label, value: 1000 });
  expect(ctx.get(field.value)).toEqual(1000);

  field.change(ctx, 2000);
  expect(ctx.get(field)).toEqual({ label, value: 2000 });
})

test(`validation concurrency`, async () => {
  const ctx = createCtx()
  const field = reatomField(123, {
    validate: async (ctx, { value }) => {
      await sleep();

      if (value === 0xDEADBEEF)
        throw new Error('validation error');
    }
  });

  field.validation.trigger(ctx);
  expect(ctx.get(field.validation)).toMatchObject({ triggered: true, error: undefined });
  expect(ctx.get(field.validation).validating).toBeInstanceOf(Promise);
  field.change(ctx, 1);

  expect(ctx.get(field.validation)).toMatchObject(fieldInitValidation);

  field.validation.trigger(ctx);
  expect(ctx.get(field.validation)).toMatchObject({ triggered: true, error: undefined });
  expect(ctx.get(field.validation).validating).toBeInstanceOf(Promise);
  field.reset(ctx);
  expect(ctx.get(field.validation)).toMatchObject(fieldInitValidation);

  field.options.merge(ctx, { validateOnChange: true });

  field.change(ctx, 1);
  field.change(ctx, 0xDEADBEEF);
  field.change(ctx, 3);

  expect(ctx.get(field.validation)).toMatchObject({ triggered: true, error: undefined });
  expect(ctx.get(field.validation).validating).toBeInstanceOf(Promise);

  await sleep();

  expect(ctx.get(field.validation)).toMatchObject({ validating: undefined, triggered: true, error: undefined });
  expect(ctx.get(field.value)).toBe(3);
})

test(`withField and initState derivation`, async () => {
  const ctx = createCtx()
  const field = reatomEnum(['lel', 'kek', 'shmek'], 'fieldAtom').pipe(withField());

  expect(ctx.get(field)).toBe('lel');
  field.setKek(ctx);
  expect(ctx.get(field)).toBe('kek');

  field.reset(ctx);
  expect(ctx.get(field)).toBe('lel');

  expect(field.value.__reatom.name).toBe('fieldAtom.value');
})
