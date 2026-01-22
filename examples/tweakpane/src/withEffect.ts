import { type AtomLike, type Ext, withConnectHook, effect, withChangeHook } from "@reatom/core";

export const withEffect =
	<T extends AtomLike>(effectFn: (target: T) => void): Ext<T> =>
	(target) =>
		target.extend(
			withConnectHook(() => effect(() => effectFn(target))),
			withChangeHook(() => void effectFn(target)),
		)
