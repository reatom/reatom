```
withMixin(options)
  -> Extension(target)
    --> Assigner properties
    --> Middleware function
```

Mixin is a special API which adjusts an atom or action features. It follows some typical code style and has some rules.

## Rules

- Mixin is a function which may accept options and should return an extension. Mixin name always starts from `with`.
- Extension is a function which accepts a target (atom or action) and returns extension logic: an assigner or a middleware.
- Assigner is an object with properties which will be merged with the target. A function property will be automatically converted to an action.
- Middleware is a function which will be added to the pipeline of the target execution. It accepts a next function (reactive computed or action processor) and should return the final atom state.

## Typical assigner

The main use case of assigner is to add some additional methods or states. It is a good practice to specify new atoms and actions names with the chain prefix (see below).

```ts
export const withPending =
  <T extends AtomLike<Promise<any>>>() =>
  (target: T) => {
    const pending = atom(0, `${target.name}.pending`).mix(
      withComputed((state = 0) => {
        target().finally(wrap(() => pending((state) => state - 1)))
        return state + 1
      }),
    )

    return { pending }
  }
```

## Typical middleware

The main power of middleware is its ability to handle previous and next states. It can be used for memoization or some reaction logic.

```ts
export const withChangeHook =
  <T extends AtomLike>(
    cb: (state: AtomState<T>, prevState: AtomState<T>) => void,
  ) =>
  (
    // we should specify the atom type for type inference
    // even if we don't use it directly
    _target: T,
  ) =>
  (next: Fn, ...params: any[]) => {
    let prevState = top().state
    let state = next(...params)
    if (!Object.is(prevState, state)) {
      cb(state, prevState)
    }
    return state
  }
```
