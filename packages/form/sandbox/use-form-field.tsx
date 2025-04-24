import { ChangeEvent, useCallback, useSyncExternalStore } from "react";
import { FieldValidation, FieldAtom } from "../src";
import { wrap } from "@reatom/core";

type BaseGetInputProps = {
	onBlur: () => void;
	onFocus: () => void;
}

type UseStringFormFieldReturn = FieldValidation & {
	getInputProps: () => BaseGetInputProps & {
		value: string;
		onChange: (ev: ChangeEvent<{ value: string }>) => void
	}
}

type UseCheckboxFormFieldReturn = FieldValidation & {
	getInputProps: () => BaseGetInputProps & {
		checked: boolean;
		onChange: (ev: ChangeEvent<{ checked: boolean }>) => void
	}
}

type UseGenericFormFieldReturn<State, Value = State> = FieldValidation & {
	getInputProps: () => BaseGetInputProps & {
		value: State;
		onChange: (newState: Value) => void
	}
}
type InputType = 'checkbox' | 'text';

export function useFormField<State, Value>(model: FieldAtom<State, Value>): UseGenericFormFieldReturn<State, Value>;
export function useFormField(model: FieldAtom<boolean>, type: 'checkbox'): UseCheckboxFormFieldReturn;
// @ts-expect-error idk
export function useFormField(model: FieldAtom<string>, type: 'text'): UseStringFormFieldReturn;

type UseFormFieldReturn<State, Value = State> =
	| UseGenericFormFieldReturn<State, Value>
	| UseCheckboxFormFieldReturn
	| UseStringFormFieldReturn

export function useFormField<State, Value = State>(
	model: FieldAtom, type?: InputType
): UseFormFieldReturn<State, Value> {	
	const change = wrap(model.change);
	const focus = wrap(model.focus.in);
	const blur = wrap(model.focus.out);
	const value = useSyncExternalStore(model.value.subscribe, model.value);
	const validation = useSyncExternalStore(model.validation.subscribe, model.validation);

	const onBlur = useCallback(() => blur(), [blur]);
	const onFocus = useCallback(() => focus(), [focus]);
	const onChange = useCallback((evOrVal: ChangeEvent<{ value: Value; } | { checked: Value; }> | Value) => {
		if (evOrVal && typeof evOrVal === 'object' && 'target' in evOrVal) {
			if (type === 'checkbox' && 'checked' in evOrVal.target)
				change(evOrVal.target.checked);
			else if ('value' in evOrVal.target)
				change(evOrVal.target.value);
		}
		else {
			change(evOrVal);
		}
	}, [change, type]);

	const getInputProps = useCallback(() => ({
		value,
		onChange,
		onBlur,
		onFocus,
	}), [onChange, onBlur, onFocus, value]);

	return {
		getInputProps,
		...validation,
	};
}
