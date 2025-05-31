---
title: Sampling
description: Documentation on sampling states and events in Reatom
---
**To debounce, to abort, or to wrap? How to handle concurrent user input without losing your mind!**

I am the author of the Reatom state manager, and today I want to share with you a comparison between traditional debounce patterns and Reatom's modern concurrency model. This tackles a problem every developer faces: efficiently handling rapid-fire user input that triggers asynchronous operations.

We'll explore how Reatom's concurrency model offers a more elegant solution than traditional debouncing techniques, providing both simplicity and power without sacrificing developer experience.

## The Basic Problem

Consider this common scenario: a search input that triggers API calls as the user types.

```javascript
// Basic implementation
const searchInput = document.getElementById('search')

searchInput.addEventListener('input', (event) => {
  fetchData(event.currentTarget.value)
})
```

This code is problematic because it sends a request on every keystroke. If a user quickly types "react", we'd fire five separate API calls! This overwhelms both the network and the server, potentially causing race conditions where results arrive out of order, displaying outdated search results.

## The Traditional Solution: Debounce

The most common solution is to use debounce:

```javascript
import { debounce } from 'lodash'

const searchInput = document.getElementById('search')

searchInput.addEventListener(
  'input',
  debounce((event) => {
    fetchData(event.currentTarget.value)
  }, 500),
)
```

This works well for simple cases. The function waits 500ms after the user stops typing before firing the request. But real-world applications are rarely this simple.

Let's see what happens when we encounter more complex scenarios.

## Problem 1: Event Object Access After Debounce

When using debounce, we quickly encounter a significant limitation: the event object is not designed to be accessed asynchronously after the event handler returns.

```javascript
searchInput.addEventListener(
  'input',
  debounce((event) => {
    // DANGER: event.currentTarget might be null or reference a different element
    fetchData(event.currentTarget.value)
  }, 500),
)
```

Since debounce introduces asynchronous behavior, accessing `event.currentTarget` after the delay can be problematic. The event object might be reused by the browser, making `currentTarget` null or point to an unexpected element.

The conventional solution is to extract and store the value immediately:

```javascript
// An extra function just to extract and pass the value
const fetchDataDebounced = debounce((value) => {
  fetchData(value)
}, 500)

searchInput.addEventListener('input', (event) => {
  fetchDataDebounced(event.currentTarget.value)
})
```

Notice how we've already introduced more complexity - an additional function just to preserve a value!

## Problem 2: Adding Conditional Logic

What if our debounced fetching logic needs to behave differently based on certain conditions? For example, applying debounce only for short queries:

```javascript
const fetchDataDebounced = debounce((value) => {
  fetchData(value)
}, 500)

const handleInput = (event) => {
  const value = event.currentTarget.value

  if (value.length > 3) {
    fetchDataDebounced(value)
  } else {
    // Bypass debounce for short queries
    fetchData(value)
  }
}

searchInput.addEventListener('input', handleInput)
```

Our code is growing increasingly complex. We now have:

1. The event handler
2. The extracted value
3. A separate debounced function
4. Conditional logic that decides which path to take

And what if we wanted to pass more data from the event? More mappings, more variables to maintain.

## Enter Reatom's Concurrency Model

Reatom takes a fundamentally different approach to this problem. Instead of debouncing the handler, we wrap the asynchronous operations and add abortion capabilities.

Here's how we'd solve the same problem with Reatom:

```javascript
import { action, wrap, withAbort } from '@reatom/core'

const handleSearch = action(async (event) => {
  // Safely extract value immediately
  const query = event.currentTarget.value

  // Intentional delay to debounce
  await wrap(sleep(500))

  // Now we can safely use the extracted value
  await wrap(fetchData(query))
}).extend(withAbort())

searchInput.addEventListener('input', handleSearch)
```

This might look similar in length, but notice what's happening:

1. The `withAbort()` extension automatically cancels previous executions when a new one starts
2. The `wrap()` function preserves the async context throughout the call chain
3. We extract the value immediately, avoiding event object problems
4. We maintain a single, readable function with natural control flow

## Adding Conditional Logic with Reatom

Now let's add conditional logic:

```javascript
const handleSearch = action(async (event) => {
  const query = event.currentTarget.value

  // Conditional debounce
  if (query.length > 3) {
    await wrap(sleep(500))
  }

  await wrap(fetchData(query))
}).extend(withAbort())

searchInput.addEventListener('input', handleSearch)
```

Notice how much cleaner this is! The code reads naturally from top to bottom. No separate functions, no breaking the logical flow.

End even more! Chains of decorators is hard to inspect in the debugger: stack traces may be broken, intermediate values may be lost. Reatom uses native async/await which is perfectly supported in the debugger.

## How It Works Under the Hood

Reatom's approach is built on the concept of [asynchronous context](./async-context.md) which allows data to flow through async operations without explicitly passing it through every function call.

The `action` creates a special function that establishes an async context frame. The `wrap` function preserves this context across async boundaries. The `withAbort` extension automatically manages AbortController instances for you, cancelling previous executions when a new one starts.

This provides several key benefits:

1. **Clean, readable code** that follows natural control flow with async/await
2. **Type-safety** by preserving variable types throughout the chain
3. **Debuggability** with inspectable intermediate values
4. **Automatic cancellation** of outdated operations

## Comparing Code Size and Complexity

Let's compare the solutions side-by-side:

**Traditional Debounce with Conditional Logic:**

```javascript
const fetchDataDebounced = debounce((value) => {
  fetchData(value)
}, 500)

const handleInput = (event) => {
  const value = event.currentTarget.value

  if (value.length > 3) {
    fetchDataDebounced(value)
  } else {
    fetchData(value)
  }
}

searchInput.addEventListener('input', handleInput)
```

**Reatom Approach:**

```javascript
const handleSearch = action(async (event) => {
  const query = event.currentTarget.value

  if (query.length > 3) {
    await wrap(sleep(500))
  }

  await wrap(fetchData(query))
}).extend(withAbort())

searchInput.addEventListener('input', handleSearch)
```

The Reatom version is not only more concise but also more maintainable as complexity grows.

## Bonus: Implementing Throttle

As a bonus, Reatom can elegantly implement throttle patterns as well. While debounce is ideal for search inputs (execute once after input stops), throttle is perfect for continuous events like window resizing, scrolling, or drag operations (execute regularly at a fixed rate).

Let's look at a window resize handler - a classic use case for throttling:

```javascript
import { throttle } from 'lodash'

// Traditional throttle approach
function updateLayoutTraditional() {
  // Get current dimensions
  const width = window.innerWidth
  const height = window.innerHeight

  // Potentially expensive calculation
  recalculateLayout(width, height)
  updateDOM()
}

// Execute at most once every 100ms during continuous resizing
const throttledUpdateLayout = throttle(updateLayoutTraditional, 100)
window.addEventListener('resize', throttledUpdateLayout)
```

With Reatom, we can implement the same throttling behavior with better control flow:

```javascript
import { action, wrap, withAbort } from '@reatom/core'

const handleResize = action(async () => {
  // Get dimensions immediately when the event fires
  const width = window.innerWidth
  const height = window.innerHeight

  // Calculate and update immediately
  const newLayout = recalculateLayout(width, height)
  await wrap(updateDOM(newLayout))

  // Then wait before allowing next execution
  await wrap(sleep(100))
}).extend(withAbort({ strategy: 'first-in-win' }))

window.addEventListener('resize', handleResize)
```

By using the 'first-in-win' strategy (rather than the default 'last-in-win'), we ensure that:

1. The first resize event processes immediately
2. Subsequent events during the delay period are completely ignored
3. Only after the delay can another execution begin

This provides smooth, efficient updates during continuous operations like resizing without overwhelming the browser with calculations. The code is also more inspectable in development tools since you can see all intermediate values and the execution flow in breakpoints.

## Conclusion

Reatom's concurrency model offers a more elegant solution to the common problem of handling user input than traditional debouncing techniques. By focusing on wrapping asynchronous operations and providing automatic abortion capabilities, Reatom allows you to write code that is both simpler and more powerful.

Key takeaways:

1. **No more juggling separate debounced functions** - maintain a single, readable function with natural control flow
2. **Immediate value mapping** - just store as many variables as you need, without arguments drilling
3. **Better debugging** - inspect intermediate values and follow the execution flow naturally
4. **Flexible timing control** - easily implement debounce, throttle, or custom timing patterns

**Sampling states and events with atoms and actions: The reactive event pattern that will change how you think about data flow!**

I am the author of the Reatom state manager, and today I want to introduce you to one of the most powerful yet underappreciated patterns in reactive programming: sampling states and events using atoms and actions.

While most state managers force you to choose between imperative events or reactive state, Reatom bridges this gap with an elegant unification of both paradigms. This approach provides the clarity of event-driven programming with the consistency of reactive state management.

## The Problem with Traditional Approaches

Traditional state management typically falls into one of two categories:

1. **Event-driven approaches** where events trigger reactive streams (RxJS)
2. **State-driven approaches** where derived values automatically update (MobX, signals)

Each has its strengths, but also critical weaknesses. Event-driven systems need a lot of additional methods to handle complex state properly. Reactive systems with "excel" design fails with event tracking and proper async logic handling.

What if we could have the best of both worlds?

## Actions as Reactive Events: A Core Insight

The key insight of Reatom is treating actions as first-class reactive events that can be both triggered and observed. Let's see a simple example:

```javascript
import { atom, action } from '@reatom/core'

// Create an atom - a state container
const counter = atom(0, 'counter')

// Create an action - a callable function that also works as an event emitter
const increment = action((amount = 1) => {
  counter.set(counter() + amount)
  return counter()
}, 'increment')

// Subscribe to state changes
counter.subscribe((count) => {
  console.log(`Counter is now: ${count}`)
})

// Call the action like a normal function
increment(10) // Counter is now: 10
```

So far, this looks like a typical action pattern. But here's where Reatom's unique perspective shines: **actions themselves are observable reactive entities**. This means you can subscribe to action calls just like you subscribe to atom changes:

```javascript
// Subscribe to action calls
increment.subscribe((calls) => {
  console.log('Counter calls:', ...calls)
})

// Call the action like a normal function
increment()
increment(5)
// To the next tick:
// Counter calls: { params: [], payload: 11 }, { params: [5], payload: 16 }
```

This dual nature of actions as both callable functions and observable events creates a foundation for powerful patterns that are difficult to implement in other libraries.

## The `take` Operator: Awaiting Events Procedurally

The `take` operator is a powerful tool for orchestrating asynchronous workflows by allowing you to `await` the next update of an atom or the next call of an action. This enables writing procedural-style logic that reacts to state changes and events. Always use `wrap(take(target))` to ensure proper Reatom context propagation.

For instance, you can wait for a form to become valid before proceeding:
```javascript
// Simplified concept
const formIsValid = atom(false, 'formIsValid');
const submitAction = action(async () => {
  if (!formIsValid()) {
    await wrap(take(formIsValid, (isValid) => isValid || throwAbort())); // Wait for formIsValid to be true
  }
  // Proceed with submission...
}, 'submitAction');
```

`take` also supports conditional waiting by providing a filter function as its second argument, allowing you to wait for specific state conditions or action payloads.

<!-- Furthermore, Reatom allows combining multiple `take` operations:
- `race({ key: take(target1), ... })`: Waits for the first of several events to occur.
- `all([take(target1), take(target2)])`: Waits for all specified events to occur. -->

These patterns simplify building complex, multi-step processes that depend on various asynchronous events or state changes, such as form submissions with timeouts or loading multiple data sources in parallel.

## The `onEvent` Operator: Handling External Events

For integrating with external event sources like DOM elements or WebSockets, Reatom provides the `onEvent` operator. It allows you to `await` specific events (e.g., a button click or a WebSocket message) in a way that respects Reatom's abort context, ensuring proper cleanup when an action is aborted or a component unmounts.

```javascript
// Conceptual usage
const button = document.getElementById('myButton');
const handleClick = action(async () => {
  await wrap(onEvent(button, 'click'));
  // Button was clicked, proceed...
}, 'handleClick');
```
`onEvent` is also useful for the "checkpoint pattern" to avoid race conditions: start listening for an event *before* an unrelated long-running async operation, ensuring the event isn't missed if it fires during the operation.

## Benefits Over Traditional Approaches

Compared to other approaches, Reatom's sampling pattern offers significant advantages:

1. **Readability**: Describe complex flows in a procedural style that's easy to follow
2. **Maintainability**: No deeply nested callbacks or complex state machines
3. **Flexibility**: Combine reactive and imperative patterns seamlessly
4. **Type Safety**: Full TypeScript support with excellent inference
5. **Testing**: Easily isolate and test individual steps or entire flows
6. **Concurrency Control**: Built-in handling of race conditions

## Conclusion

The unification of events and state through Reatom's action and atom primitives enables a uniquely powerful approach to managing application state and behavior. By treating actions as reactive events and providing tools like `take` for procedural event sampling, Reatom creates a programming model that's both more expressive and simpler than traditional approaches.

This pattern is especially valuable for:

- Complex user flows and multi-step processes
- Form validation and submission
- Authentication and authorization
- API request coordination
- Animation sequences

Next time you find yourself building complex state logic with multiple steps and conditions, consider how Reatom's event sampling approach might help you create code that's more maintainable and easier to reason about.

The power of reactive events awaits!
