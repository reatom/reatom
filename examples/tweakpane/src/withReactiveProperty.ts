import {
  type Computed,
  type AtomLike,
  withChangeHook,
  withConnectHook,
} from '@reatom/core'

export const withReactiveProperty =
  <T extends Object>(
    property: keyof T,
    computedProperty: Computed<T[keyof T]>,
  ) =>
  (target: AtomLike<T>) => {
    const setValue = (object: T, value: T[keyof T]) =>
      void (object[property] = value)
    computedProperty.extend(
      withChangeHook((value) => void setValue(target(), value)),
    )
    target.extend(
      withConnectHook(() => computedProperty.subscribe()),
      withChangeHook(
        (newObject) => void setValue(newObject, computedProperty()),
      ),
    )

    return {
      [`${String(property)}Computed`]: computedProperty,
    }
  }
