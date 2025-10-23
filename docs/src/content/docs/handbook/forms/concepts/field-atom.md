---
title: Field atom
---

In many form validation libraries, fields exist only within forms and their lifecycle is tied to the form's lifecycle, while access to fields is typically done through string dot notation, and field configuration has no single source of truth and can be spread across the entire application.

In Reatom, fields are independent entities with their own related states and methods that are fully open to configuration and composition. `reatomField` itself is a field state atom, to which other related states are assigned, such as `validation`, `focus` and others, as well as various methods like `change` and `reset`. Let's examine each aspect of `reatomField` in more detail to build a complete picture and reactive model in your head.

### Validation atom
This atom stores states related to field state validation. In addition to the validation error text of the field itself, it contains `triggered`, which always shows when validation was triggered and completed. But validation can also be asynchronous, so `validating` can contain a validation promise that will return a non-empty list of errors if validation fails.

```ts
export interface FieldValidation {
  /** Message of the first validation error, computed from errors atom */
  error: undefined | string

  /** The validation actuality status. */
  triggered: boolean

  /** The field async validation status. */
  validating: undefined | Promise<{ errors: FieldError[] }>
}
```

But these are read-only states and we cannot change them directly. Therefore, actions are provided that allow changing their state.
By mutating the `errors` atom, we can influence the computation of the `validation` atom's state, and this is especially pleasant because the `errors` atom is one of the basic `reatomArray` primitives, having convenient methods like `push`, `unshift` and others.

```ts
export interface ValidationAtom extends AtomLike<FieldValidation> {
  /** Action to trigger field validation. */
  trigger: Action<[], FieldValidation> & AbortExt

  /** Full list of all errors related to the field */
  errors: ArrayAtom<FieldError>

  /** Action to clear all errors by passed sources. */
  clearErrors: Action<[...sources: FieldErrorSource[]], FieldValidation>
}
```

The `trigger` action activates the field validation callback and returns the new state of the `validation` atom. It's worth noting that despite field validation being potentially asynchronous, the `trigger` action itself does not return a promise, but returns the `.validating` prop which will provide a promise in case of asynchronous validation:

```ts
const result = await field.validation.trigger().validating
```

### Focus atom

All states related to field interaction are stored here.

```ts
export interface FieldFocus {
  /** The field is focused. */
  active: boolean

  /** The field state is not equal to the initial state. */
  dirty: boolean

  /** The field has ever gained and lost focus. */
  touched: boolean
}
```

By combining these statuses you can derive additional meta information:

- `!touched && active` - the field got focus for the first time
- `touched && active` - the field got focus again

```ts
export interface FocusAtom extends AtomLike<FieldFocus> {
  /** Action for handling field focus. */
  in: Action<[], FieldFocus>

  /** Action for handling field blur. */
  out: Action<[], FieldFocus>
}
```

Without these methods, we cannot maintain the `focus` atom in a consistent state. In rendering frameworks, these actions should be used as `focus` and `blur` events, otherwise, in addition to the inconsistency of the `focus` atom, we may lose the ability to validate the field when focus is lost.

### State and value
TODO

### Validation and concurrency
TODO

### `withField` extension
TODO