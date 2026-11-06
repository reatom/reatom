---
title: Trace a counter
description: Follow synchronous and asynchronous actions through a small reactive model.
sidebar:
  label: Counter example
---

Create telemetry before the model so it observes the actions and reactive state.
This example keeps records locally. Add `withOTLP` when you want remote delivery.

## Model

```ts title="counter.ts"
import { action, atom, computed, wrap } from '@reatom/core'
import {
  reatomOpentelemetry,
  type ReatomOpentelemetryInput,
} from '@reatom/opentelemetry'

/** Create tracing before models so the adapter sees their construction. */
export const createTracedCounter = (options: ReatomOpentelemetryInput) => {
  const otel = reatomOpentelemetry(options)
  const count = atom(0, 'example.count')
  const doubled = computed(() => count() * 2, 'example.double')
  const increment = action(
    () => count.set((value) => value + 1),
    'example.increment',
  )
  const update = action(
    () => ({
      count: increment(),
      doubled: doubled(),
      context: otel.traceVar.get(),
    }),
    'example.update',
  )
  const updateAfter = action(async (wait: Promise<void>) => {
    await wrap(wait)
    return increment()
  }, 'example.updateAfter')

  return {
    count,
    doubled,
    update,
    updateAfter,
    flush: otel.flush,
    dispose: otel.dispose,
  }
}
```

## Usage

```ts
import { createTracedCounter } from './counter.ts'

const counter = createTracedCounter({
  name: 'counter-app',
  serviceName: 'counter-app',
})

// Call in the application's current Reatom context.
const result = counter.update()
console.log(result.count, result.doubled, result.context)

const gate = Promise.resolve()
console.log(await counter.updateAfter(gate))

// Without an exporter this resolves without sending.
// An attached exporter's flush completion is not a delivery guarantee.
await counter.flush()
counter.dispose()
```

`example.update` is a root action span with `example.increment` as its child.
The counter write and the `example.double` computed read are ordinary Reatom
work; repeated cached reads emit nothing.

`example.updateAfter` is the async form. The trace lives in `otel.traceVar`, a
Reatom frame variable, so `await wrap(wait)` preserves it together with the
store and cancellation scope. The resumed `example.increment` is a child of
`example.updateAfter` without any extra context API.

To start a trace by hand, call `otel.traceVar.set(otel.createTrace({ name }))`
inside an action. To read the current pair, call `otel.traceVar.get()`.
