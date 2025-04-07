import { _atom, AtomLike } from './atom';

/** Derived state container */
export interface Computed<State = any> extends AtomLike<State> {
  (): State
}

export type ComputedFactory = <State>(cb: (() => State) | ((state?: State) => State), name?: string) => Computed<State>

export let computed: ComputedFactory = _atom