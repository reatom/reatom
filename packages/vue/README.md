Reatom integration for Vue Composition API.

Vue has simple and powerful enough primitives for state processing out of the box, refs can be created outside the component and most of the tasks are solved by it. But there are a number of issues that reatom covers better.

- Atoms have lifecycle hooks, useful for states used in many components. They let you initialize a resource on the first subscription and dispose of it on the last unsubscription.
- Actions help you group and better log and debug your logic. Reatom allows you to trace the entire chain of data transformations through all sync and async actions and atoms.
- Reatom is a perfect solution as a multi frontend core as it is small, powerful and already has adapters for vue, react, solid, svelte (lit and angular adapters in development).
- Reatom has very powerful primitives for describing asynchronous logic, gathering the best of rxjs, redux-saga and TanStack Query. There seem to be no alternatives here.
- Reatom has one of the largest ecosystems of any state manager and probably the most balanced. At the same time, each package is developed with a manic focus on band size and perf.

## Installation

```sh
npm i @reatom/npm-vue
```

## `reatomRef`

A function that turns a Reatom atom into a Vue ref which is updated on target atom changes. A returned pseudo-ref is mutable if a target atom is mutable itself.

```ts
import { atom } from '@reatom/core'
import { reatomRef } from '@reatom/npm-vue'

const count = atom(0, 'count')

// turn an atom into a ref-like object
const countRef = reatomRef(count)
// selectors are supported as well
const countDoubleRef = reatomRef(() => count() * 2)

countRef // Ref<number>
countRef.value // 0
countRef.value = 3 // 3

countDoubleRef // Readonly<Ref<number>>
countDoubleRef.value // 6
```

### createReatomVue

A function that creates a [Vue App plugin](https://vuejs.org/guide/reusability/plugins.html#plugins) which you can `use`. Accepts a `Frame` object. It is optional, but useful when you want to use scoped states for SSR, testing ro better debugging.

```ts
import { context } from '@reatom/core'
import { createReatomVue } from '@reatom/npm-vue'

app.use(createReatomVue(context.start()))
```

## `useFrame`

A function to inject a `Frame` object provided by `createReatomVue`. Used by different APIs internally.

### `useAction`

Binds an action or a function to context frame value.

```vue
<script>
import * as model from './model'
import { useAction } from '@reatom/npm-vue'

const doSomething = useAction(model.doSomething)
</script>

<template>
  <BigBrightButton @click="doSomething">Do it!</BigBrightButton>
</template>
```
