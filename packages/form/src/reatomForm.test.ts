import { test, expect, describe, vi } from 'vitest'
import { createCtx, Ctx } from '@reatom/core'
import { experimental_fieldArray, reatomField, reatomForm, withField } from '.'
import { reatomBoolean } from '@reatom/primitives';
import { z } from 'zod';
import { noop, sleep } from '@reatom/utils';

test(`adding and removing fields`, async () => {
	const ctx = createCtx();
	const form = reatomForm({
		field: reatomField('initial', 'fieldAtom'),
		list: experimental_fieldArray({
			initState: ['initial'],
			create: (ctx, param) => reatomField(param, 'fieldAtom')
		}),
	});

	expect(ctx.get(form.fields.field)).toBe('initial');
	expect(ctx.get(form.fields.list).size).toBe(1);

	form.fields.list.create(ctx, 'initial');
	expect(ctx.get(form.fields.list).size).toBe(2);

	form.fields.list.clear(ctx);
	expect(ctx.get(form.fields.list).size).toBe(0);
})

test('focus states', () => {
	const ctx = createCtx()
	const form = reatomForm({
		field1: { initState: '', validate: () => { } },
		field2: { initState: '', validate: () => { } },
		list: experimental_fieldArray({
			initState: ['initial'],
			create: (ctx, param) => reatomField(param, 'fieldAtom')
		}),
	});

	form.fields.field1.change(ctx, 'value')
	form.fields.field2.change(ctx, 'value')

	expect(ctx.get(form.focus)).toEqual({
		active: false,
		dirty: true,
		touched: true,
	})

	form.fields.field1.focus.in(ctx)
	expect(ctx.get(form.focus).active).toBe(true)

	form.fields.field1.focus.out(ctx)
	expect(ctx.get(form.focus).active).toBe(false)
	expect(ctx.get(form.focus).touched).toBe(true)

	form.reset(ctx);

	const list = ctx.get(form.fields.list.array);
	list[0]?.change(ctx, 'value');

	expect(ctx.get(form.focus)).toEqual({
		active: false,
		dirty: true,
		touched: true,
	})

	form.fields.list.clear(ctx);

	expect(ctx.get(form.focus)).toEqual({
		active: false,
		dirty: false,
		touched: false,
	})
})

test('validation states', async () => {
	const ctx = createCtx()

	const contract = (value: string) => {
		if (value === 'errorValue')
			throw new Error('Contract error')
	}

	const validate = async (ctx: Ctx, { value }: { value: string }) => {
		await sleep()
		if (value === 'errorValue')
			throw new Error('Contract error')
	}

	const form = reatomForm({
		field1: { initState: '', contract, validateOnChange: true },
		field2: { initState: '', contract, validateOnChange: true },
		field3: { initState: '', validate, validateOnChange: true },
		rest: experimental_fieldArray<string>([])
	}, {
		name: 'testForm',
		onSubmit: () => { },
		validate: () => {
			throw new Error('Form validation error')
		},
	})

	const { field1, field2, field3, rest } = form.fields

	field1.change(ctx, 'value')
	field2.change(ctx, 'value')

	expect(ctx.get(form.validation)).toEqual({
		error: undefined,
		meta: undefined,
		triggered: false,
		validating: false,
	})

	field2.change(ctx, 'errorValue')

	expect(ctx.get(form.validation)).toEqual({
		error: 'Contract error',
		meta: undefined,
		triggered: false,
		validating: false,
	})

	field3.change(ctx, 'hey')

	expect(ctx.get(form.validation)).toEqual({
		error: 'Contract error',
		meta: undefined,
		triggered: true,
		validating: true,
	})

	field2.reset(ctx);

	await form.submit(ctx).catch(() => { })
	expect(ctx.get(form.submit.error)?.message).toBe('Form validation error')

	expect(ctx.get(form.validation)).toEqual({
		error: undefined,
		meta: undefined,
		triggered: true,
		validating: false,
	})

	const fieldNoValidationTrigger = rest.create(ctx, '');
	fieldNoValidationTrigger.change(ctx, 'value');

	expect(ctx.get(form.validation)).toEqual({
		error: undefined,
		meta: undefined,
		triggered: true,
		validating: false,
	})

	rest.clear(ctx);
	field1.change(ctx, 'value')

	expect(ctx.get(form.validation)).toEqual({
		error: undefined,
		meta: undefined,
		triggered: true,
		validating: false,
	})
})

test('validation and focus states with disabled fields', async () => {
	const ctx = createCtx()

	const contract = (value: string) => {
		if (value === 'errorValue')
			throw new Error('Contract error')
	}

	const form = reatomForm({
		field1: { initState: '', contract, validateOnChange: true },
	}, 'testForm')

	form.fields.field1.change(ctx, 'errorValue');
	expect(ctx.get(form.validation)).toMatchObject({ error: 'Contract error', triggered: true });
	expect(ctx.get(form.focus)).toMatchObject({ touched: true, dirty: true });

	form.fields.field1.disabled(ctx, true);
	expect(ctx.get(form.validation)).toMatchObject({ error: undefined, triggered: true });
	expect(ctx.get(form.focus)).toMatchObject({ touched: false, dirty: false })

	form.fields.field1.disabled(ctx, false);
	expect(ctx.get(form.validation)).toMatchObject({ error: 'Contract error', triggered: true });
	expect(ctx.get(form.focus)).toMatchObject({ touched: true, dirty: true });
})

test('validation states with disabled fields and defined schema', async () => {
	const ctx = createCtx()

	const formWithSchema = reatomForm({
		field1: '',
	}, {
		validateOnChange: true,
		schema: z.object({ 
			field1: z.string().refine(value => value !== 'errorValue', 'Schema contract error') 
		})
	})

	const targetField = formWithSchema.fields.field1;

	targetField.change(ctx,'errorValue');
	expect(ctx.get(formWithSchema.validation)).toMatchObject({ error: 'Schema contract error' });

	targetField.change(ctx,'validValue');
	expect(ctx.get(formWithSchema.validation)).toMatchObject({ error: undefined });

	targetField.disabled(ctx,true);
	targetField.change(ctx, 'errorValue');
	expect(ctx.get(formWithSchema.validation)).toMatchObject({ error: undefined });
})

test('default options for fields', async () => {
	const ctx = createCtx()
	const form = reatomForm({
		field: { initState: 'initial', validate: () => { } },
		array: experimental_fieldArray(['one', 'two', 'free']),
	}, {
		validateOnChange: true
	});

	const { field, array } = form.fields;

	field.change(ctx, 'value');

	expect(ctx.get(field.validation)).toEqual({
		error: undefined,
		meta: undefined,
		triggered: true,
		validating: false,
	})

	ctx.get(array.array).forEach(field => {
		field.change(ctx, 'value');

		expect(ctx.get(field.validation)).toEqual({
			error: undefined,
			meta: undefined,
			triggered: true,
			validating: false,
		})
	});
})

describe('fieldArray and array literals as a fieldArray', () => {
	test('flat array literals', () => {
		const ctx = createCtx()
		const form = reatomForm({
			array: ['hey']
		})

		const arrayField = form.fields.array;
		expect(ctx.get(arrayField.array).length).toBe(1);

		const field = ctx.get(arrayField.array)[0]!;
		expect(ctx.get(field.value)).toBe('hey');

		arrayField.create(ctx, 'new');
		expect(ctx.get(arrayField.array).length).toBe(2);

		const newField = ctx.get(arrayField.array)[1]!;
		expect(ctx.get(newField.value)).toBe('new');
	})

	test('nested array literals and using fieldArray deep inside', () => {
		const ctx = createCtx()
		const form = reatomForm({
			nestedArray: [
				{
					array: ['hey'],
					emptyArray: new Array<string>(),
					emptyArrayExplicit: experimental_fieldArray<string>([])
				}
			]
		})

		const nestedArray = ctx.get(form.fields.nestedArray.array);
		expect(nestedArray.length).toBe(1);

		const array = nestedArray[0]!.array.array;
		expect(ctx.get(array).length).toBe(1);

		expect(ctx.get(ctx.get(array)[0]!.value)).toBe('hey');

		nestedArray[0]!.array.create(ctx, 'new');
		expect(ctx.get(array).length).toBe(2);

		expect(ctx.get(ctx.get(array)[1]!.value)).toBe('new');

		const emptyArray = nestedArray[0]!.emptyArray.array;
		expect(ctx.get(emptyArray).length).toBe(0);

		const emptyArrayExplicit = nestedArray[0]!.emptyArrayExplicit.array;
		expect(ctx.get(emptyArrayExplicit).length).toBe(0);

		nestedArray[0]!.emptyArray.create(ctx, 'new');
		expect(ctx.get(emptyArray).length).toBe(1);
	})

	test('nested array literals and fieldArray in initState', () => {
		const ctx = createCtx()

		const form = reatomForm({		
			addresses: [
				{
					country: '',
					street: '',
					city: '',
					tags: ['defaultTag', 'defaultTag2'],
					phoneNumbers: experimental_fieldArray({
						initState: Array<{ number: string, priority: boolean }>(),
						create: (ctx, { number, priority }) => ({
							number,
							priority: reatomBoolean(priority).pipe(withField())
						})
					}),
				}
			]
		});

		const addresses = ctx.get(form.fields.addresses.array);
		const phoneNumbers = addresses[0]!.phoneNumbers;
		expect(ctx.get(phoneNumbers.array).length).toBe(0);

		phoneNumbers.create(ctx, { number: '778899', priority: true });
		expect(ctx.get(phoneNumbers.array).length).toBe(1);

	})
})

test('reset', () => {
	const ctx = createCtx()
	const form = reatomForm({
		field: { initState: 'initial', validate: () => { } },
	}, {
		name: 'testForm',
		onSubmit: () => { }
	})

	const { field } = form.fields;

	field.change(ctx, 'value')
	field.focus.in(ctx)
	field.focus.out(ctx)
	field.validation.trigger(ctx)

	form.reset(ctx)

	expect(ctx.get(field)).toBe('initial')
	expect(ctx.get(field.focus)).toEqual({
		active: false,
		dirty: false,
		touched: false,
	})
	expect(ctx.get(field.validation)).toEqual({
		error: undefined,
		meta: undefined,
		triggered: false,
		validating: false,
	})
})

describe('init array with reset', () => {
	test('flat fields with array', () => {
		const ctx = createCtx()
		const form = reatomForm({
			dummy: 1,
			list: [
				{
					kek: 'lel',
					arr: ['1', '2']
				}
			]
		})

		form.reset(ctx, { list: [] })

		expect(ctx.get(form.fields.list.array).length).toEqual(0)

		form.fields.dummy.change(ctx, 2);

		form.reset(ctx, { 
			list: [
				{ kek: 'lel', arr: ['1'] }
			] 
		})

		expect(ctx.get(form.fields.list.array).length).toEqual(1)
		expect(ctx.get(ctx.get(ctx.get(form.fields.list.array)[0]!.arr.array)[0]!.value)).toEqual('1')
		expect(ctx.get(form.fields.dummy)).toEqual(1)
	})

	test('nested fields with array', () => {
		const ctx = createCtx()

		const form = reatomForm({
			list: [
				{
					nestedList: [
						{ number: '123', priority: Boolean(true) }
					]
				}
			]
		})

		form.reset(ctx, {
			list: [
				{
					nestedList: []
				},
				{
					nestedList: [
						{ number: '321', priority: false },
						{ number: '456', priority: true }
					]
				}
			]
		})

		const listArray = ctx.get(form.fields.list.array)
		expect(listArray.length).toEqual(2)

		const firstItemNestedList = ctx.get(listArray[0]!.nestedList.array)
		expect(firstItemNestedList.length).toEqual(0)

		const secondItemNestedList = ctx.get(listArray[1]!.nestedList.array)
		expect(secondItemNestedList.length).toEqual(2)

		const firstNestedItem = secondItemNestedList[0]!
		expect(ctx.get(firstNestedItem.number)).toEqual('321')
		expect(ctx.get(firstNestedItem.priority)).toEqual(false)

		const secondNestedItem = secondItemNestedList[1]!
		expect(ctx.get(secondNestedItem.number)).toEqual('456')
		expect(ctx.get(secondNestedItem.priority)).toEqual(true)
	})
})

test('form should correctly initialize field options', async () => {
	const ctx = createCtx()

	const form = reatomForm({
		age: 12,
		email: 'test',
		fieldWithDefault: { initState: '', validateOnChange: false }
	}, {
		validateOnChange: true,
		validateOnBlur: true,
		keepErrorDuringValidating: true,
		keepErrorOnChange: true,
	})

	expect(ctx.get(form.fields.age.options).validateOnChange).toBe(true)
	expect(ctx.get(form.fields.email.options).validateOnBlur).toBe(true)
	expect(ctx.get(form.fields.email.options).keepErrorDuringValidating).toBe(true)
	expect(ctx.get(form.fields.fieldWithDefault.options).keepErrorOnChange).toBe(true)
	expect(ctx.get(form.fields.fieldWithDefault.options).validateOnChange).toBe(false)
})
	
test('validating through form schema and placing errors to corresponding fields', async () => {
	const ctx = createCtx()

	const form = reatomForm({
		age: 12,
		email: 'test',
		items: ['', 'valid']
	}, {
		schema: z.object({
			age: z.number().min(18),
			email: z.string().email(),
			items: z.array(z.string().min(1))
		})
	});
	
	form.submit(ctx);

	expect(ctx.get(form.fields.age.validation).error).toBeTruthy();
	expect(ctx.get(form.fields.email.validation).error).toBeTruthy();
	expect(ctx.get(ctx.get(form.fields.items.array)[0]!.validation).error).toBeTruthy();
	expect(ctx.get(ctx.get(form.fields.items.array)[1]!.validation).error).toBeFalsy();
})

test('triggering schema validation only for one field', async () => {
	const ctx = createCtx()

	const form = reatomForm({
		age: 12,
		email: 'test',
		items: ['', 'valid']
	}, {
		validateOnChange: true,
		schema: z.object({
			age: z.number().min(18, 'must be minimum 18'),
			email: z.string().email(),
			items: z.array(z.string().min(1))
		})
	});

	expect(ctx.get(form.validation).error).toBeFalsy();

	form.fields.age.change(ctx, 17);
	expect(ctx.get(form.validation).error).toBe('must be minimum 18');
	expect(ctx.get(form.fields.age.validation).error).toBe('must be minimum 18');
})

test('concurrent field validation with schema', async () => {
	const ctx = createCtx()

	const form = reatomForm({
		age: { 
			initState: 12, 
			validate: async () => { 
				await sleep();
				throw new Error('validation error')
			},
		}
	}, {
		validateOnChange: true,
		schema: z.object({
			age: z.number().min(18, 'must be minimum 18'),
		})
	});

	form.fields.age.change(ctx, 10);
	expect(ctx.get(form.fields.age.validation).error).toBe('must be minimum 18');
	await sleep();

	expect(ctx.get(form.fields.age.validation).error).toBe('must be minimum 18');
})

test('autofocus recipe', async () => {
	const ctx = createCtx()

	const form = reatomForm({
		email: '',
		age: 12
	}, {
		schema: z.object({
			email: z.string().email(),
			age: z.number().min(18),
		})
	})
	const focusFn = vi.fn();
	form.fields.email.elementRef(ctx, { focus: focusFn });

	form.submit.onReject.onCall((ctx) => {
		const errorField = ctx.get(form.fieldsList).find(field => !!ctx.get(field.validation).error);
		if(errorField)
			ctx.get(errorField.elementRef)?.focus();
	})

	await form.submit(ctx).catch(noop);
	expect(ctx.get(form.submit.error)).toBeInstanceOf(Error);
	expect(focusFn).toBeCalled();
})