import {
  Atom,
  Computed,
  computed,
  isAtom,
  Frame,
  ReatomError,
  assert,
  wrap,
  STACK,
} from '@reatom/core'
import { ref, Ref, onScopeDispose, App, inject } from 'vue'
import { RefSymbol } from '@vue/reactivity'

const ReatomContextKey = 'ReatomContextKey'

export const createReatomVue = (frame: Frame) => (app: App) => {
  app.provide(ReatomContextKey, frame)
}

export const useFrame = () => {
  const frame = inject<Frame>(ReatomContextKey) ?? STACK[0]

  assert(
    frame,
    'the root is not set, you probably forgot to specify the  provider',
    ReatomError,
  )

  return frame!
}

export const useAction = <Params extends any[], Payload>(
  fn: (...params: Params) => Payload,
  // name?: string,
): ((...params: Params) => Payload) => {
  const frame = useFrame()

  return wrap(fn, frame)
}

// Define overloads first for clarity
export function reatomRef<T>(target: Atom<T>): Ref<T>
export function reatomRef<T>(target: Computed<T> | (() => T)): Readonly<Ref<T>>
// Implementation using customRef for better control and Vue integration
export function reatomRef<T>(
  target: Atom<T> | Computed<T> | (() => T),
): Ref<T> | Readonly<Ref<T>> {
  if (!isAtom(target)) {
    target = computed(target)
  }
  // TODO fix type inference
  if (!isAtom(target)) throw 42

  const vueState = ref()

  onScopeDispose(target.subscribe((state) => (vueState.value = state)))

  return {
    get value() {
      return vueState.value
    },
    set value(next) {
      // @ts-expect-error
      target.set(next)
    },
    [RefSymbol]: true,
  }
}
