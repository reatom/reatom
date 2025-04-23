import { ChangeEvent, HTMLInputTypeAttribute, useCallback, useSyncExternalStore } from "react";
import { FieldValidation, FieldAtom } from "../src";
import { wrap } from "@reatom/core";

type UseFormFieldReturn<State, Value = State> = FieldValidation & {
	getInputProps: () => {
		value: string;
		onBlur: () => void;
		onFocus: () => void;
		onChange: (evOrVal: ChangeEvent<{ value: Value; } | { checked: Value; }> | Value) => void;
	};
};

export function useFormField(model: FieldAtom<boolean>, type: 'checkbox'): UseFormFieldReturn<boolean>;
export function useFormField<State, Value>(
	model: FieldAtom<State, Value>, type?: Exclude<'checkbox', string>): UseFormFieldReturn<State, Value>;

export function useFormField<State, Value>(model: FieldAtom<State, Value>, type: HTMLInputTypeAttribute = 'text') {
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
		value: String(value),
		onChange,
		onBlur,
		onFocus,
	}), [onChange, onBlur, onFocus, value]);

	return {
		getInputProps,
		...validation,
	};
}
