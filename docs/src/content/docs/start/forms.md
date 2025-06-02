---
title: Forms
description: Getting started with forms in Reatom
---

Forms are one of the most complex aspects of frontend application development, for which dozens of libraries and different patterns have already been built to solve their problems. Having a flexible and powerful reactive system at hand, we provide a native solution for managing your forms of any complexity through a configuration and, to a greater extent, compositional API.

Any form consists of a set of inputs of various kinds, which can often be interconnected and, moreover, can be dynamically added or removed from the form. Along with each input, there are always related states such as `touched`, `dirty`, `errors` and others - which, like the input itself, are reactive. We provide at least 2 APIs for this at different levels of abstraction:
* `reatomField` - a reactive form field object that describes not only the input state, but also the aforementioned related states such as `touched`, `dirty`, `errors`, `validating` and others, as well as options for validation and their triggers
* `reatomForm` - a reactive aggregate of all `reatomField` belonging to it, which tracks all field states and provides the ability to validate them in the context of the entire form, including through validation schemas. This model also allows implementing asynchronous form submission, default options for fields nested in the form, and more.

Between these abstractions there is another reactive primitive, but the goal of this guide is to show how to make a fairly simple form in Reatom, diving as little as possible into the implementation details of forms and everything related to them. Therefore, here we will focus only on `reatomForm`:

```ts {17}
import { reatomForm, wrap } from '@reatom/core'

const loginForm = reatomForm({
    username: '',
    password: '',
    confirmPassword: { 
        initState: '',
        validate: ({ value }) => {
            if (loginForm.fields.password.value() != value)
                return 'Passwords do not match'
        }
    }
}, {
    name: 'loginForm',
    validateOnBlur: true,
    onSubmit: async (values) => {
        //           ^? { username: string, password: string, confirmPassword: string }
        return wrap(api.login(values))
    }
})
```

With the first argument of `reatomForm` (this is `initState`) we defined the structure of our form fields: it doesn't have to be flat, it can also be nested (divided into logical groups through objects). As the value of each key, we define the default value for the field, and it's also possible to derive the field type from the primitive value type. For `confirmPassword` we already passed not a primitive value, but a `reatomField` options object - literally what can be passed to a field to initialize it. We used such a declaration to set a custom validation function `validate`. Since `password` and `confirmPassword` are related to each other and must match, this way we create an invariant for validation.

This way we create a form, access to whose reactive fields we can get like this:
```ts /fields/ {2-7}
loginForm.fields
//        ^? {
//            username: FieldAtom<string, string>,
//            password: FieldAtom<string, string>,
//            confirmPassword: FieldAtom<string, string>
//        }
```

As a result, the form's `initState` object was [atomized](/handbook/atomization/) and we got automatically generated `reatomField` that are ready to be bound to the UI:

```ts /validation|focus/ {3-11} {14-21}
const { username } = loginForm.fields;
username.validation
//       ^? Atom<{
//           errors: FieldError[],
//           triggered: boolean,
//           validating: undefined | Promise<{ errors: FieldError[] }>
//       }> & {
//           trigger: Action<[], FieldValidation> & AbortExt
//           prependErrors: Action<[...error: FieldError[]], FieldValidation>
//           clearErrors: Action<[...sources: FieldErrorSource[]], FieldValidation>
//       }

username.focus
//       ^? Atom<{
//           active: boolean,
//           dirty: boolean,
//           touched: boolean
//       }> & {
//           in: Action<[], FieldFocus>
//           out: Action<[], FieldFocus>
//       }
```

As a result, for each field we can:
* subscribe to its errors, validation activation status and asynchronous validation promise;
* trigger the validation function programmatically
* add and remove errors from different sources (from field validation, from schema validation)
* subscribe to `active` (i.e. currently focused), `dirty` and `touched` statuses
* dispatch `focus` and `blur` events through `focus.in` and `focus.out` actions

But what about the form? The form is an aggregate of all field states, so it has its own computed `validation` and `focus` states just like the fields (*`validation` types are intentionally simplified, as they are actually much more complex*)
```ts /validation|focus/ {2} {5}
loginForm.validation
//        ^? Computed<FieldSetValidation> & { trigger: Action }

loginForm.focus
//        ^? Computed<FieldFocus>
```

And indeed, the submit function, being asynchronous, cannot but be accompanied by related states: we use the Reatom ecosystem and enrich it with the `withAsync` extension to get `loginForm.submit.ready`, `loginForm.submit.error` and concurrency support to cover any UI requirements
```ts /submit/ {2}
loginForm.submit
//        ^? Action<[], Promise<void>> & AsyncExt & AbortExt
```

After calling `loginForm.submit`, parallel validation of all fields belonging to the form occurs first, then schema validation if it is defined, and finally validation through the form's `validate` function. Only then will the `onSubmit` callback passed in the form options be called, which will receive the parsed field values in a structure either by the schema if it is defined, or through the `parseAtoms` function