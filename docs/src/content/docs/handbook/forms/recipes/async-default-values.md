---
title: Async default values
---

This recipe shows how to load form values from an API. It creates an async action that fetches data and resets the form with the retrieved values when the request completes. The `ready` atom can be used to show a loading state.

```ts
import { reatomForm, computed, withAsync, wrap, withCallHook } from '@reatom/core'

const profileForm = reatomForm({
  username: '',
  address: ''
}, 'profileForm')

const fetchFormValues = computed(
  async () => {
    const response = await wrap(fetch('/api/profile'));
    return wrap(response.json());
  },
  'fetchFormValues'
).extend(withAsync())

fetchFormValues.onFulfill.extend(
  withCallHook(defaultValues => profileForm.reset(defaultValues))
)

fetchFormValues.ready() // Use this atom to show loading state
```