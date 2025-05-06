**To debounce, to abort, or to wrap? How to handle concurrent user input without losing your mind!**

I am the author of the Reatom state manager, and today I want to share with you a comparison between traditional debounce patterns and Reatom's modern concurrency model. This tackles a problem every developer faces: efficiently handling rapid-fire user input that triggers asynchronous operations.

We'll explore how Reatom's concurrency model offers a more elegant solution than traditional debouncing techniques, providing both simplicity and power without sacrificing developer experience.

## ▍ The Basic Problem

Consider this common scenario: a search input that triggers API calls as the user types.

```javascript
// Basic implementation
const searchInput = document.getElementById('search')

searchInput.addEventListener('input', (event) => {
  fetchData(event.currentTarget.value)
})
```

This code is problematic because it sends a request on every keystroke. If a user quickly types "react", we'd fire five separate API calls! This overwhelms both the network and the server, potentially causing race conditions where results arrive out of order, displaying outdated search results.

## ▍ The Traditional Solution: Debounce

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

## ▍ Problem 1: Event Object Access After Debounce

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

## ▍ Problem 2: Adding Conditional Logic

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

## ▍ Enter Reatom's Concurrency Model

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

## ▍ Adding Conditional Logic with Reatom

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

## ▍ How It Works Under the Hood

Reatom's approach is built on the concept of [asynchronous context](./async-context.md) which allows data to flow through async operations without explicitly passing it through every function call.

The `action` creates a special function that establishes an async context frame. The `wrap` function preserves this context across async boundaries. The `withAbort` extension automatically manages AbortController instances for you, cancelling previous executions when a new one starts.

This provides several key benefits:

1. **Clean, readable code** that follows natural control flow with async/await
2. **Type-safety** by preserving variable types throughout the chain
3. **Debuggability** with inspectable intermediate values
4. **Automatic cancellation** of outdated operations

## ▍ Comparing Code Size and Complexity

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

## ▍ Bonus: Implementing Throttle

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

## ▍ Conclusion

Reatom's concurrency model offers a more elegant solution to the common problem of handling user input than traditional debouncing techniques. By focusing on wrapping asynchronous operations and providing automatic abortion capabilities, Reatom allows you to write code that is both simpler and more powerful.

Key takeaways:

1. **No more juggling separate debounced functions** - maintain a single, readable function with natural control flow
2. **Immediate value mapping** - just store as many variables as you need, without arguments drilling
3. **Better debugging** - inspect intermediate values and follow the execution flow naturally
4. **Flexible timing control** - easily implement debounce, throttle, or custom timing patterns

Need to depend yor async functions not just from time, but from from other events? Check out the next post!
