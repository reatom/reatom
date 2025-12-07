---
title: Compound fields
---

С помощью [fieldsets](/handbook/forms/concepts/fieldset/) мы можем создавать независимые группы полей, получая возможность взаимодействовать именно с этой группой полей практически как с формой, либо это можно воспринимать как линзы.

```ts
import { bindField, reatomComponent } from "@reatom/react";
import { reatomField, reatomFieldSet, wrap, throwAbort } from "@reatom/core";

const toNumber = (value: string) => {
  const parsed = Number(value)
  return isNaN(parsed) ? throwAbort() : parsed
}

const reatomMinMaxFieldSet = (name: string) => {
  const min = reatomField(0, {
    name: `${name}.min`,
    fromState: (state) => state.toString(),
    toState: toNumber,
    validate: ({ state }) => state > max() ? "Min must be less than max" : undefined,
    validateOnBlur: true,
  });  

  const max = reatomField(100, {
    name: `${name}.max`,
    toState: toNumber,
    validate: ({ state }) => state > 0 ? "Max must be greater than 0" : undefined,
    validateOnBlur: true,
  });

  return reatomFieldSet({ min, max }, name);
};
```

Теперь для нас возможно взаимодействовать с этими полями как с одним целым, просчитывая `focus`, `validation` состояния для всех полей сразу, или даже сбрасывая значение каждого поля одним вызовом метода `reset`

```tsx
const minMaxFieldSet = reatomMinMaxFieldSet("minMaxFieldSet");

const Fields = reatomComponent(() => (
  <fieldset>
    <input {...bindField(minMaxFieldSet.fields.min)} />
    <input {...bindField(minMaxFieldSet.fields.max)} />
    {minMaxFieldSet.focus().dirty && (
      <button onClick={wrap(() => minMaxFieldSet.reset())}>Reset</button>
    )}
    {minMaxFieldSet.validation().errors && (
      <span>{minMaxFieldSet.validation().errors[0]?.message}</span>
    )}
  </fieldset>
));
```