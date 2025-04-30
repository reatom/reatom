import { AtomState, createCtx } from "@reatom/core";
import { connectLogger } from "@reatom/logger"
import { reatomContext, useAction, useAtom } from "@reatom/npm-react"
import { experimental_fieldArray, FieldAtom, FormFieldArrayAtom, reatomForm, withField } from "../src";
import { LinkedListLikeAtom, reatomBoolean } from "@reatom/primitives";
import { PropsWithChildren } from 'react';
import { createRoot } from "react-dom/client";
import { useFormField } from "./use-form-field";
import { z } from "zod";

const ctx = createCtx();
connectLogger(ctx);

function App() {
	return (
		<reatomContext.Provider value={ctx}>
			<Form />
		</reatomContext.Provider>
	)
}

const root = createRoot(document.getElementById('root')!)
root.render(<App />)

const form = reatomForm(name => ({
	username: 'vlad',
	addresses: [
		{
			country: 'my country',
			street: 'my street',
			city: 'my city',
			tags: ['defaultTag', 'defaultTag2'],
			phoneNumbers: experimental_fieldArray({
				initState: Array<{ number: string, priority: boolean }>(),
				create: (ctx, { number, priority }, name) => ({
					number,
					priority: reatomBoolean(priority, `${name}.priority`).pipe(withField())
				})
			})
		}
	],
}), {
	validateOnChange: true,
	schema: z.object({
		username: z.string().min(3, 'min length 3'),
		addresses: z.array(
			z.object({
				country: z.string().min(3, 'min length 3'),
				street: z.string(),
				city: z.string(),
				tags: z.array(z.string().min(3, 'min length 3')),
				phoneNumbers: z.array(
					z.object({
						number: z.string(),
						priority: z.boolean()
					})
				)
			})
		)
	})
});

const vStack = { display: 'flex', flexDirection: 'column', gap: '1rem' } as const;

function Form() {
	const submit = useAction(form.submit);
	const usernameField = useFormField(form.fields.username);

	return (
		<div
			style={{
				display: 'flex',
				gap: '6rem',
				justifyContent: 'center',
				width: '100%'
			}}
		>
			<form
				onSubmit={e => { e.preventDefault(); submit() }}
				style={{ ...vStack, gap: '0.5rem', width: '100%', maxWidth: '20rem' }}
			>
				<input {...usernameField.getInputProps()} />
				<FieldError error={usernameField.error} />

				<AddressesField />
			</form>

			<FieldsState />
		</div>
	);
}

function AddressesField() {
	const [fieldArray] = useAtom(form.fields.addresses.array);
	const createField = useAction(form.fields.addresses.create);
	const removeField = useAction(form.fields.addresses.remove);

	const appendField = () => {
		createField({
			city: '',
			country: '',
			street: '',
			phoneNumbers: [],
			tags: []
		})
	}

	const removeLatestField = () => {
		const field = fieldArray.at(-1);
		if (field)
			removeField(field);
	}

	return (
		<div style={vStack}>
			{fieldArray.map((field, index) => (
				<AddressField
					key={index}
					model={field}
				/>
			))}

			<button type='button' onClick={appendField}>add new</button>
			<button type='button' onClick={removeLatestField}>remove latest</button>
		</div>
	)
}

type ArrayFieldTypeOf<T> = T extends LinkedListLikeAtom ? AtomState<T['array']>[number] : never

type AddressFieldType = ArrayFieldTypeOf<typeof form.fields.addresses>;

function AddressField({ model }: { model: AddressFieldType }) {
	const countryField = useFormField(model.country);
	const streetField = useFormField(model.street);
	const cityField = useFormField(model.city);

	return (
		<div style={{ ...vStack, gap: '0.5rem', border: '1px solid black', padding: '0.5rem' }}>
			<label>
				Country <input {...countryField.getInputProps()} />
				<FieldError error={countryField.error} />
			</label>

			<label>
				Street <input {...streetField.getInputProps()} />
				<FieldError error={streetField.error} />
			</label>

			<label>
				City <input {...cityField.getInputProps()} />
				<FieldError error={cityField.error} />
			</label>

			<TagsField model={model.tags} />
			<PhoneNumbersField model={model.phoneNumbers} />
		</div>
	)
}

function TagsField({ model }: { model: FormFieldArrayAtom<string, string> }) {
	const [fieldArray] = useAtom(model.array);
	const createField = useAction(model.create);
	const removeField = useAction(model.remove);

	return (
		<div style={{ display: 'flex', alignItems: 'start', gap: '0.5rem', flexWrap: 'wrap' }}>
			Tags
			{fieldArray.map((field, index) => (
				<TagField
					key={field.__reatom.name}
					model={field}
				>
					<button type='button' onClick={() => removeField(field)}>-</button>
				</TagField>
			))}
			{!!fieldArray.length && (
				<div style={{ height: '1.25rem', borderRight: '1px solid black' }} />
			)}
			<button type='button' onClick={() => createField('')}>+</button>
		</div>
	)
}

function TagField({ model, children }: PropsWithChildren<{ model: FieldAtom<string> }>) {
	const field = useFormField(model);

	return (
		<div
			style={{ display: 'flex', alignItems: 'start', gap: '0.25rem' }}
		>
			<div>
				<input {...field.getInputProps()} style={{ maxWidth: '4rem' }} />
				<FieldError error={field.error} />
			</div>

			{children}
		</div>
	)
}

function PhoneNumbersField({ model }: { model: AddressFieldType['phoneNumbers'] }) {
	const [fieldArray] = useAtom(model.array);
	const createField = useAction(model.create);
	const removeField = useAction(model.remove);

	return (
		<div style={{ ...vStack, gap: '0.5rem', border: '1px solid black', padding: '0.5rem' }}>
			<label>Phone numbers</label>

			{fieldArray.map((field, index) => (
				<PhoneNumberField
					key={index}
					model={field}
				>
					<button type='button' onClick={() => removeField(field)}>-</button>
				</PhoneNumberField>
			))}

			<button type='button' onClick={() => createField({ number: '', priority: false })}>
				new phone number
			</button>
		</div>
	)
}

type PhoneNumberFieldType = ArrayFieldTypeOf<AddressFieldType['phoneNumbers']>

function PhoneNumberField({ model, children }: PropsWithChildren<{ model: PhoneNumberFieldType }>) {
	const numberField = useFormField(model.number);
	const priorityField = useFormField(model.priority, 'checkbox');

	return (
		<div
			style={{ display: 'flex', gap: '0.25rem' }}
		>
			<input {...numberField.getInputProps()} />
			<FieldError error={numberField.error} />

			<label>
				priority
				<input type='checkbox' {...priorityField.getInputProps()} />
			</label>
			{children}
		</div>
	)
}

function FieldError({ error }: { error: string | undefined }) {
	return error ? <div style={{ color: 'red' }}>{error}</div> : null;
}

function FieldsState() {
	const [fieldsState] = useAtom(form.fieldsState);
	const reset = useAction(form.reset);

	const resetToEmptyState = () => {
		reset({ addresses: [], username: '' });
	}

	const resetToArbitraryState = () => {
		reset({
			username: 'foo',
			addresses: [
				{
					city: 'first city',
					street: 'this street',
					country: 'this country',
					tags: [],
					phoneNumbers: [
						{ number: '123', priority: true }
					]
				},
				{
					city: 'second city',
					street: 'second street',
					country: 'second country',
					tags: [],
					phoneNumbers: [
						{ number: '356', priority: true }
					]
				}
			]
		});
	}

	return (
		<div style={vStack}>
			<pre>
				{JSON.stringify(fieldsState, undefined, 4)}
			</pre>

			<button onClick={resetToEmptyState}>reset to empty state</button>
			<button onClick={resetToArbitraryState}>reset to arbitrary state</button>
		</div>
	)
}
