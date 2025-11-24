---
title: Auto submit
---

You can easily implement automatic form submission behavior on various events or state changes using `effect`.

### Auto submit on form change

The simplest solution is to create an effect that reacts to form state changes. You will likely also need to implement submit debouncing, so we'll add it in this example as well.

```ts
effect(async () => {
    form() // subscribe to changes of all form fields

    // select only dirty from focus atom
    const dirty = memo(() => form.focus().dirty) 
    if(!dirty) return

    // async debounce, delay submit by 300ms
    await wrap(sleep(300))

    form.submit().catch(noop)
})
```

Here we must use `memo` to subscribe only to this specific part of the [`focus` atom](/handbook/forms/concepts/field-atom/#focus-atom) state, since it contains other states like `active`/`touched`, which could cause unexpected effect re-executions.