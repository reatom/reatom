## Installation

Reatom is a framework agnostic library with various adapters for different frameworks. By default all docs and examples are written for React, but you can reuse each code example with any other framework.

```bash
npm install @reatom/core@alpha @reatom/react@alpha
```

## Template

For a fast start you can use our template with react.dev and mantine.dev and a set of example features:

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/artalar/reatom/tree/v1000/examples/react-search)

## Core primitives

### Atom

Reatom has a lot of advanced features under the hood, but they are hidden by default and you can start just with the atom - base state container.

```typescript
import { atom } from '@reatom/core'

const counter = atom(0)

// Read the atom state
console.log(counter())
// Log: 0

// Write a new state to the atom
counter.set(1)
console.log(counter())
// Log: 1

// Process and update the atom state in a function
counter.set((state) => state + 5)
console.log(counter())
// Log: 6
```

### Computed

The most valuable feature of any signal-based library is the ability to create lazy memoized computations.

```typescript
import { atom, computed } from '@reatom/core'

const counter = atom(0)

const isEven = computed(() => counter() % 2 === 0)

console.log(isEven())
// Log: true

counter.set(1)
// Log nothing, the computed has no subscription

// Trigger the computation implicitly
console.log(isEven())
// Log: false
```

To "activate" a computed you need to subscribe to it. Note, that all reactive computations appear in the next microtask tick, after a dependency change.

```typescript
// Now any change of the counter will trigger the computation
// and the subscription callback (if the state really changed)
isEven.subscribe((state) => console.log(state))
```

But in most cases you don't need to subscribe to atoms manually, you probably want to use them in a high-level computed, such as effects or a UI component, let's dive into it.

### Effects

Effects are a way to react to changes in the state. They are similar to computed, but run immediately after creation. Basically it is just `computed(cb).subscribe()`, but with some extra features which we will investigate later. It is much more useful than just `.subscribe` as you can track many atoms in any combinations in one place.

```typescript
import { atom, effect } from '@reatom/core'

const counter = atom(0)
const isEven = computed(() => counter() % 2 === 0)

effect(() => {
  console.log(`${counter()} is ${isEven() ? 'even' : 'odd'}`)
})
```

Typical use case is to run some long-lived processes, such as an API polling, or a timer, which should work independently of a UI.

## Using with framework

```tsx
import { atom, computed } from '@reatom/core'
import { reatomComponent } from '@reatom/react'

const counter = atom(0)
const isEven = computed(() => counter() % 2 === 0)

const Counter = reatomComponent(() => (
  <section>
    <p>
      {counter()} is {isEven() ? 'even' : 'odd'}
    </p>

    <button onClick={() => counter.set(v => v + 1)}>Increment</button>
  </section>
))
```

`reatomComponent` is just a special variant of `computed` that perfectly integrates with React.

**The coolest thing** about `reatomComponent` is that you can use reactive states (atoms) in any order without the rules of hooks!

## Conclusion

**That's all!** If you need a small, performant and useful reactive primitive and nothing more, you can stay with what we discovered just now and move to the [tooling](/start/tooling/) section to get nice logging of your app.

If you what to dive deeper and learn more Reatom features, go to the [actions](/start/actions/) section.

## Classes

### ReatomError

Defined in: [packages/core/src/core/atom.ts:312](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L312)

#### Extends

- `Error`

#### Constructors

##### Constructor

> **new ReatomError**(`message?`): [`ReatomError`](#reatomerror)

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1082

###### Parameters

###### message?

`string`

###### Returns

[`ReatomError`](#reatomerror)

###### Inherited from

`Error.constructor`

##### Constructor

> **new ReatomError**(`message?`, `options?`): [`ReatomError`](#reatomerror)

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1082

###### Parameters

###### message?

`string`

###### options?

`ErrorOptions`

###### Returns

[`ReatomError`](#reatomerror)

###### Inherited from

`Error.constructor`

#### Properties

##### cause?

> `optional` **cause**: `unknown`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2022.error.d.ts:26

###### Inherited from

`Error.cause`

##### message

> **message**: `string`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1077

###### Inherited from

`Error.message`

##### name

> **name**: `string`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1076

###### Inherited from

`Error.name`

##### stack?

> `optional` **stack**: `string`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1078

###### Inherited from

`Error.stack`

##### stackTraceLimit

> `static` **stackTraceLimit**: `number`

Defined in: node\_modules/.pnpm/@types+node@24.8.0/node\_modules/@types/node/globals.d.ts:68

The `Error.stackTraceLimit` property specifies the number of stack frames
collected by a stack trace (whether generated by `new Error().stack` or
`Error.captureStackTrace(obj)`).

The default value is `10` but may be set to any valid JavaScript number. Changes
will affect any stack trace captured _after_ the value has been changed.

If set to a non-number value, or set to a negative number, stack traces will
not capture any frames.

###### Inherited from

`Error.stackTraceLimit`

#### Methods

##### captureStackTrace()

> `static` **captureStackTrace**(`targetObject`, `constructorOpt?`): `void`

Defined in: node\_modules/.pnpm/@types+node@24.8.0/node\_modules/@types/node/globals.d.ts:52

Creates a `.stack` property on `targetObject`, which when accessed returns
a string representing the location in the code at which
`Error.captureStackTrace()` was called.

```js
const myObject = {};
Error.captureStackTrace(myObject);
myObject.stack;  // Similar to `new Error().stack`
```

The first line of the trace will be prefixed with
`${myObject.name}: ${myObject.message}`.

The optional `constructorOpt` argument accepts a function. If given, all frames
above `constructorOpt`, including `constructorOpt`, will be omitted from the
generated stack trace.

The `constructorOpt` argument is useful for hiding implementation
details of error generation from the user. For instance:

```js
function a() {
  b();
}

function b() {
  c();
}

function c() {
  // Create an error without stack trace to avoid calculating the stack trace twice.
  const { stackTraceLimit } = Error;
  Error.stackTraceLimit = 0;
  const error = new Error();
  Error.stackTraceLimit = stackTraceLimit;

  // Capture the stack trace above function b
  Error.captureStackTrace(error, b); // Neither function c, nor b is included in the stack trace
  throw error;
}

a();
```

###### Parameters

###### targetObject

`object`

###### constructorOpt?

`Function`

###### Returns

`void`

###### Inherited from

`Error.captureStackTrace`

##### prepareStackTrace()

> `static` **prepareStackTrace**(`err`, `stackTraces`): `any`

Defined in: node\_modules/.pnpm/@types+node@24.8.0/node\_modules/@types/node/globals.d.ts:56

###### Parameters

###### err

`Error`

###### stackTraces

`CallSite`[]

###### Returns

`any`

###### See

https://v8.dev/docs/stack-trace-api#customizing-stack-traces

###### Inherited from

`Error.prepareStackTrace`

## Interfaces

### AbortAtom()

Defined in: [packages/core/src/methods/abortVar.ts:67](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/abortVar.ts#L67)

Atom-like object that tracks abort state

#### Extends

- [`Atom`](#atom)\<`null` \| [`AbortError`](#aborterror), \[`null`?\] \| \[`string` \| [`AbortError`](#aborterror)\]\>.[`AbortMethods`](#abortmethods)

> **AbortAtom**(...`params`): `null` \| [`AbortError`](#aborterror)

Defined in: [packages/core/src/methods/abortVar.ts:67](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/abortVar.ts#L67)

Atom-like object that tracks abort state

#### Parameters

##### params

...\[\]

Parameters to pass to the atom

#### Returns

`null` \| [`AbortError`](#aborterror)

The atom's payload (typically its current state)

#### Properties

##### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#atommeta)

Defined in: [packages/core/src/core/atom.ts:101](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L101)

Reference to the atom's internal metadata.

###### Inherited from

[`Atom`](#atom).[`__reatom`](#__reatom-3)

##### actions

> **actions**: [`Actions`](#actions-26)\<[`AbortAtom`](#abortatom)\>

Defined in: [packages/core/src/core/atom.ts:81](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L81)

Bind methods to the atom to extend its functionality.

###### Inherited from

[`Atom`](#atom).[`actions`](#actions-3)

##### extend

> **extend**: [`Extend`](#extend-10)\<[`AbortAtom`](#abortatom)\>

Defined in: [packages/core/src/core/atom.ts:87](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L87)

Extension system to add capabilities to atoms. Allows adding middleware,
methods, or other functionality to modify atom behavior.

###### Inherited from

[`Atom`](#atom).[`extend`](#extend-3)

##### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#unsubscribe-2)

Defined in: [packages/core/src/core/atom.ts:98](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L98)

Subscribe to state changes, with the first call happening immediately. When
a subscriber is added, the callback is immediately invoked with the current
state. After that, it's called whenever the atom's state changes.

###### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it
  changes

###### Returns

[`Unsubscribe`](#unsubscribe-2)

An unsubscribe function that removes the subscription when called

###### Inherited from

[`Atom`](#atom).[`subscribe`](#subscribe-3)

#### Methods

##### getController()

> **getController**(`this`): [`LazyAbortController`](#lazyabortcontroller)

Defined in: [packages/core/src/methods/abortVar.ts:46](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/abortVar.ts#L46)

Creates and returns an AbortController connected to this abort atom

###### Parameters

###### this

[`AbortAtom`](#abortatom)

###### Returns

[`LazyAbortController`](#lazyabortcontroller)

An AbortController that will be aborted when
  the atom is aborted

###### Inherited from

[`AbortMethods`](#abortmethods).[`getController`](#getcontroller-2)

##### set()

###### Call Signature

> **set**(`update`): `null` \| [`AbortError`](#aborterror)

Defined in: [packages/core/src/core/atom.ts:122](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L122)

Update the atom's state using a function that receives the previous state

###### Parameters

###### update

(`state`) => `null` \| [`AbortError`](#aborterror)

Function that takes the current state and returns a new
  state

###### Returns

`null` \| [`AbortError`](#aborterror)

The new state value

###### Inherited from

[`Atom`](#atom).[`set`](#set-9)

###### Call Signature

> **set**(...`params`): `null` \| [`AbortError`](#aborterror)

Defined in: [packages/core/src/core/atom.ts:130](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L130)

Set the atom's state to a new value

###### Parameters

###### params

\[`null`?\] | \[`string` \| [`AbortError`](#aborterror)\]

###### Returns

`null` \| [`AbortError`](#aborterror)

The new state value

###### Inherited from

[`Atom`](#atom).[`set`](#set-9)

##### subscribeAbort()

> **subscribeAbort**(`this`, `cb`): [`Unsubscribe`](#unsubscribe-2)

Defined in: [packages/core/src/methods/abortVar.ts:38](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/abortVar.ts#L38)

Subscribes a callback to be executed when the atom transitions to aborted
state

###### Parameters

###### this

[`AbortAtom`](#abortatom)

###### cb

(`error`) => `void`

Callback to execute when aborted

###### Returns

[`Unsubscribe`](#unsubscribe-2)

Function to unsubscribe the callback

###### Inherited from

[`AbortMethods`](#abortmethods).[`subscribeAbort`](#subscribeabort-2)

##### throwIfAborted()

> **throwIfAborted**(`this`): `void`

Defined in: [packages/core/src/methods/abortVar.ts:29](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/abortVar.ts#L29)

Throws the current abort error if the atom is in aborted state

###### Parameters

###### this

[`AbortAtom`](#abortatom)

###### Returns

`void`

###### Throws

If the atom is in aborted state

###### Inherited from

[`AbortMethods`](#abortmethods).[`throwIfAborted`](#throwifaborted-2)

***

### AbortError

Defined in: [packages/core/src/utils.ts:658](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L658)

Interface extending DOMException for abort-specific error handling. Used to
represent errors triggered by AbortController signal aborts.

#### See

https://developer.mozilla.org/en-US/docs/Web/API/AbortController

#### Extends

- `DOMException`

#### Properties

##### ABORT\_ERR

> `readonly` **ABORT\_ERR**: `20`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.dom.d.ts:6561

###### Inherited from

`DOMException.ABORT_ERR`

##### cause?

> `optional` **cause**: `unknown`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2022.error.d.ts:26

###### Inherited from

`DOMException.cause`

##### ~~code~~

> `readonly` **code**: `number`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.dom.d.ts:6537

###### Deprecated

[MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMException/code)

###### Inherited from

`DOMException.code`

##### DATA\_CLONE\_ERR

> `readonly` **DATA\_CLONE\_ERR**: `25`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.dom.d.ts:6566

###### Inherited from

`DOMException.DATA_CLONE_ERR`

##### DOMSTRING\_SIZE\_ERR

> `readonly` **DOMSTRING\_SIZE\_ERR**: `2`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.dom.d.ts:6543

###### Inherited from

`DOMException.DOMSTRING_SIZE_ERR`

##### HIERARCHY\_REQUEST\_ERR

> `readonly` **HIERARCHY\_REQUEST\_ERR**: `3`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.dom.d.ts:6544

###### Inherited from

`DOMException.HIERARCHY_REQUEST_ERR`

##### INDEX\_SIZE\_ERR

> `readonly` **INDEX\_SIZE\_ERR**: `1`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.dom.d.ts:6542

###### Inherited from

`DOMException.INDEX_SIZE_ERR`

##### INUSE\_ATTRIBUTE\_ERR

> `readonly` **INUSE\_ATTRIBUTE\_ERR**: `10`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.dom.d.ts:6551

###### Inherited from

`DOMException.INUSE_ATTRIBUTE_ERR`

##### INVALID\_ACCESS\_ERR

> `readonly` **INVALID\_ACCESS\_ERR**: `15`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.dom.d.ts:6556

###### Inherited from

`DOMException.INVALID_ACCESS_ERR`

##### INVALID\_CHARACTER\_ERR

> `readonly` **INVALID\_CHARACTER\_ERR**: `5`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.dom.d.ts:6546

###### Inherited from

`DOMException.INVALID_CHARACTER_ERR`

##### INVALID\_MODIFICATION\_ERR

> `readonly` **INVALID\_MODIFICATION\_ERR**: `13`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.dom.d.ts:6554

###### Inherited from

`DOMException.INVALID_MODIFICATION_ERR`

##### INVALID\_NODE\_TYPE\_ERR

> `readonly` **INVALID\_NODE\_TYPE\_ERR**: `24`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.dom.d.ts:6565

###### Inherited from

`DOMException.INVALID_NODE_TYPE_ERR`

##### INVALID\_STATE\_ERR

> `readonly` **INVALID\_STATE\_ERR**: `11`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.dom.d.ts:6552

###### Inherited from

`DOMException.INVALID_STATE_ERR`

##### message

> `readonly` **message**: `string`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.dom.d.ts:6539

[MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMException/message)

###### Inherited from

`DOMException.message`

##### name

> **name**: `"AbortError"`

Defined in: [packages/core/src/utils.ts:659](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L659)

[MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMException/name)

###### Overrides

`DOMException.name`

##### NAMESPACE\_ERR

> `readonly` **NAMESPACE\_ERR**: `14`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.dom.d.ts:6555

###### Inherited from

`DOMException.NAMESPACE_ERR`

##### NETWORK\_ERR

> `readonly` **NETWORK\_ERR**: `19`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.dom.d.ts:6560

###### Inherited from

`DOMException.NETWORK_ERR`

##### NO\_DATA\_ALLOWED\_ERR

> `readonly` **NO\_DATA\_ALLOWED\_ERR**: `6`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.dom.d.ts:6547

###### Inherited from

`DOMException.NO_DATA_ALLOWED_ERR`

##### NO\_MODIFICATION\_ALLOWED\_ERR

> `readonly` **NO\_MODIFICATION\_ALLOWED\_ERR**: `7`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.dom.d.ts:6548

###### Inherited from

`DOMException.NO_MODIFICATION_ALLOWED_ERR`

##### NOT\_FOUND\_ERR

> `readonly` **NOT\_FOUND\_ERR**: `8`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.dom.d.ts:6549

###### Inherited from

`DOMException.NOT_FOUND_ERR`

##### NOT\_SUPPORTED\_ERR

> `readonly` **NOT\_SUPPORTED\_ERR**: `9`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.dom.d.ts:6550

###### Inherited from

`DOMException.NOT_SUPPORTED_ERR`

##### QUOTA\_EXCEEDED\_ERR

> `readonly` **QUOTA\_EXCEEDED\_ERR**: `22`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.dom.d.ts:6563

###### Inherited from

`DOMException.QUOTA_EXCEEDED_ERR`

##### SECURITY\_ERR

> `readonly` **SECURITY\_ERR**: `18`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.dom.d.ts:6559

###### Inherited from

`DOMException.SECURITY_ERR`

##### stack?

> `optional` **stack**: `string`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1078

###### Inherited from

`DOMException.stack`

##### SYNTAX\_ERR

> `readonly` **SYNTAX\_ERR**: `12`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.dom.d.ts:6553

###### Inherited from

`DOMException.SYNTAX_ERR`

##### TIMEOUT\_ERR

> `readonly` **TIMEOUT\_ERR**: `23`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.dom.d.ts:6564

###### Inherited from

`DOMException.TIMEOUT_ERR`

##### TYPE\_MISMATCH\_ERR

> `readonly` **TYPE\_MISMATCH\_ERR**: `17`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.dom.d.ts:6558

###### Inherited from

`DOMException.TYPE_MISMATCH_ERR`

##### URL\_MISMATCH\_ERR

> `readonly` **URL\_MISMATCH\_ERR**: `21`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.dom.d.ts:6562

###### Inherited from

`DOMException.URL_MISMATCH_ERR`

##### VALIDATION\_ERR

> `readonly` **VALIDATION\_ERR**: `16`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.dom.d.ts:6557

###### Inherited from

`DOMException.VALIDATION_ERR`

##### WRONG\_DOCUMENT\_ERR

> `readonly` **WRONG\_DOCUMENT\_ERR**: `4`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.dom.d.ts:6545

###### Inherited from

`DOMException.WRONG_DOCUMENT_ERR`

***

### AbortExt

Defined in: [packages/core/src/mixins/withAbort.ts:10](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/mixins/withAbort.ts#L10)

#### Extended by

- [`AsyncDataExt`](#asyncdataext)

#### Properties

##### abort

> **abort**: [`Action`](#action)\<\[`any`\]\>

Defined in: [packages/core/src/mixins/withAbort.ts:11](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/mixins/withAbort.ts#L11)

***

### AbortMethods

Defined in: [packages/core/src/methods/abortVar.ts:23](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/abortVar.ts#L23)

Interface containing methods for abort handling in Reatom

 AbortMethods

#### Extended by

- [`AbortAtom`](#abortatom)

#### Methods

##### getController()

> **getController**(`this`): [`LazyAbortController`](#lazyabortcontroller)

Defined in: [packages/core/src/methods/abortVar.ts:46](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/abortVar.ts#L46)

Creates and returns an AbortController connected to this abort atom

###### Parameters

###### this

[`AbortAtom`](#abortatom)

###### Returns

[`LazyAbortController`](#lazyabortcontroller)

An AbortController that will be aborted when
  the atom is aborted

##### subscribeAbort()

> **subscribeAbort**(`this`, `cb`): [`Unsubscribe`](#unsubscribe-2)

Defined in: [packages/core/src/methods/abortVar.ts:38](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/abortVar.ts#L38)

Subscribes a callback to be executed when the atom transitions to aborted
state

###### Parameters

###### this

[`AbortAtom`](#abortatom)

###### cb

(`error`) => `void`

Callback to execute when aborted

###### Returns

[`Unsubscribe`](#unsubscribe-2)

Function to unsubscribe the callback

##### throwIfAborted()

> **throwIfAborted**(`this`): `void`

Defined in: [packages/core/src/methods/abortVar.ts:29](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/abortVar.ts#L29)

Throws the current abort error if the atom is in aborted state

###### Parameters

###### this

[`AbortAtom`](#abortatom)

###### Returns

`void`

###### Throws

If the atom is in aborted state

***

### AbortVar

Defined in: [packages/core/src/methods/abortVar.ts:77](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/abortVar.ts#L77)

Interface for a global abort variable tied to the current frame

#### Extends

- [`Variable`](#variable)\<\[`string` \| [`AbortAtom`](#abortatom)\], [`AbortAtom`](#abortatom)\>

#### Methods

##### abort()

> **abort**(`reason?`): `void`

Defined in: [packages/core/src/methods/abortVar.ts:108](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/abortVar.ts#L108)

Aborts the current frame with an optional reason

###### Parameters

###### reason?

`unknown`

Optional reason for aborting

###### Returns

`void`

##### find()

> **find**\<`T`\>(`cb?`, `frame?`): `undefined` \| `T`

Defined in: [packages/core/src/methods/variable.ts:54](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/variable.ts#L54)

Traverses the frame tree to find and map the variable value.

###### Type Parameters

###### T

`T` = [`AbortAtom`](#abortatom)

Return type of the callback

###### Parameters

###### cb?

(`value`) => `undefined` \| `T`

Optional
  transformation callback

###### frame?

[`Frame`](#frame)\<`any`, `any`[], `any`\>

Optional frame to check (defaults to current top
  frame)

###### Returns

`undefined` \| `T`

The transformed value or undefined if not found

###### Inherited from

[`Variable`](#variable).[`find`](#find-9)

##### get()

> **get**(`frame?`): [`AbortAtom`](#abortatom)

Defined in: [packages/core/src/methods/variable.ts:25](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/variable.ts#L25)

Gets the current value of the variable

###### Parameters

###### frame?

[`Frame`](#frame)\<`any`, `any`[], `any`\>

Optional frame to check (defaults to current top
  frame)

###### Returns

[`AbortAtom`](#abortatom)

The current value

###### Throws

If the variable is not found in the frame tree

###### Inherited from

[`Variable`](#variable).[`get`](#get-8)

##### getController()

> **getController**(): `undefined` \| `AbortController`

Defined in: [packages/core/src/methods/abortVar.ts:101](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/abortVar.ts#L101)

Creates and returns an AbortController connected to the current frame

###### Returns

`undefined` \| `AbortController`

An AbortController or undefined if
  no abort atom available

##### has()

> **has**(`frame?`): `boolean`

Defined in: [packages/core/src/methods/variable.ts:42](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/variable.ts#L42)

Checks if the variable exists in the current stack

###### Parameters

###### frame?

[`Frame`](#frame)\<`any`, `any`[], `any`\>

Optional frame to check (defaults to current top
  frame)

###### Returns

`boolean`

True if the variable exists in the context

###### Inherited from

[`Variable`](#variable).[`has`](#has-4)

##### run()

> **run**\<`T`\>(`value`, `fn`): `T`

Defined in: [packages/core/src/methods/variable.ts:67](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/variable.ts#L67)

Runs a function with new variable value

###### Type Parameters

###### T

`T`

Return type of the function

###### Parameters

###### value

[`AbortAtom`](#abortatom)

The temporary value to set

###### fn

() => `T`

Function to execute with the temporary value

###### Returns

`T`

The result of the function

###### Inherited from

[`Variable`](#variable).[`run`](#run-6)

##### set()

> **set**(...`params`): [`AbortAtom`](#abortatom)

Defined in: [packages/core/src/methods/variable.ts:33](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/variable.ts#L33)

Sets a new value for the variable

###### Parameters

###### params

...\[`string` \| [`AbortAtom`](#abortatom)\]

Parameters passed to the setter function

###### Returns

[`AbortAtom`](#abortatom)

The new value

###### Inherited from

[`Variable`](#variable).[`set`](#set-57)

##### subscribeAbort()

> **subscribeAbort**(`cb`): `undefined` \| [`Unsubscribe`](#unsubscribe-2)

Defined in: [packages/core/src/methods/abortVar.ts:93](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/abortVar.ts#L93)

Subscribes a callback to be executed when the current frame is aborted

###### Parameters

###### cb

(`error`) => `void`

Callback to execute when aborted

###### Returns

`undefined` \| [`Unsubscribe`](#unsubscribe-2)

Function to unsubscribe the callback or
  undefined if no abort atom available

##### throwIfAborted()

> **throwIfAborted**(): `void`

Defined in: [packages/core/src/methods/abortVar.ts:84](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/abortVar.ts#L84)

Throws if the current frame is aborted

###### Returns

`void`

###### Throws

If the current frame is aborted

***

### AbstractRender\<Props, Result\>

Defined in: [packages/core/src/reatomAbstractRender.ts:16](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/reatomAbstractRender.ts#L16)

Interface representing an abstract renderer for connecting Reatom with other
reactive systems. Provides methods to render content with given props and
manage the lifecycle through mounting.

#### Type Parameters

##### Props

`Props`

The type of props/parameters that the renderer accepts

##### Result

`Result`

The type of result produced by the render operation

#### Properties

##### mount()

> **mount**: () => [`Unsubscribe`](#unsubscribe-2)

Defined in: [packages/core/src/reatomAbstractRender.ts:30](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/reatomAbstractRender.ts#L30)

Mounts the renderer, setting up subscriptions and event handling

###### Returns

[`Unsubscribe`](#unsubscribe-2)

- Function to unmount and clean up resources

##### render()

> **render**: (`props`) => `object`

Defined in: [packages/core/src/reatomAbstractRender.ts:23](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/reatomAbstractRender.ts#L23)

Renders content using the provided props

###### Parameters

###### props

`Props`

The properties used for rendering

###### Returns

`object`

- Object containing the render result

###### result

> **result**: `Result`

***

### Action()\<Params, Payload\>

Defined in: [packages/core/src/core/action.ts:22](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/action.ts#L22)

Logic container with atom features

#### Extends

- [`AtomLike`](#atomlike)\<[`ActionState`](#actionstate)\<`Params`, `Payload`\>, `Params`, `Payload`\>

#### Type Parameters

##### Params

`Params` *extends* `any`[] = `any`[]

##### Payload

`Payload` = `any`

> **Action**(...`params`): `Payload`

Defined in: [packages/core/src/core/action.ts:22](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/action.ts#L22)

Logic container with atom features

#### Parameters

##### params

...`Params`

Parameters to pass to the atom

#### Returns

`Payload`

The atom's payload (typically its current state)

#### Properties

##### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#atommeta)

Defined in: [packages/core/src/core/atom.ts:101](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L101)

Reference to the atom's internal metadata.

###### Inherited from

[`AtomLike`](#atomlike).[`__reatom`](#__reatom-4)

##### actions

> **actions**: [`Actions`](#actions-26)\<[`Action`](#action)\<`Params`, `Payload`\>\>

Defined in: [packages/core/src/core/atom.ts:81](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L81)

Bind methods to the atom to extend its functionality.

###### Inherited from

[`AtomLike`](#atomlike).[`actions`](#actions-4)

##### extend

> **extend**: [`Extend`](#extend-10)\<[`Action`](#action)\<`Params`, `Payload`\>\>

Defined in: [packages/core/src/core/atom.ts:87](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L87)

Extension system to add capabilities to atoms. Allows adding middleware,
methods, or other functionality to modify atom behavior.

###### Inherited from

[`AtomLike`](#atomlike).[`extend`](#extend-4)

##### set

> **set**: `unknown`

Defined in: [packages/core/src/core/atom.ts:78](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L78)

###### Inherited from

[`AtomLike`](#atomlike).[`set`](#set-12)

##### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#unsubscribe-2)

Defined in: [packages/core/src/core/atom.ts:98](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L98)

Subscribe to state changes, with the first call happening immediately. When
a subscriber is added, the callback is immediately invoked with the current
state. After that, it's called whenever the atom's state changes.

###### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it
  changes

###### Returns

[`Unsubscribe`](#unsubscribe-2)

An unsubscribe function that removes the subscription when called

###### Inherited from

[`AtomLike`](#atomlike).[`subscribe`](#subscribe-4)

***

### ActionCall\<Params, Payload\>

Defined in: [packages/core/src/core/action.ts:12](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/action.ts#L12)

#### Type Parameters

##### Params

`Params` *extends* `any`[] = `any`[]

##### Payload

`Payload` = `any`

#### Properties

##### params

> **params**: `Params`

Defined in: [packages/core/src/core/action.ts:13](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/action.ts#L13)

##### payload

> **payload**: `Payload`

Defined in: [packages/core/src/core/action.ts:14](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/action.ts#L14)

***

### ActionState\<Params, Payload\>

Defined in: [packages/core/src/core/action.ts:18](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/action.ts#L18)

Autoclearable array of processed events

#### Extends

- `Array`\<[`ActionCall`](#actioncall)\<`Params`, `Payload`\>\>

#### Type Parameters

##### Params

`Params` *extends* `any`[] = `any`[]

##### Payload

`Payload` = `any`

#### Indexable

\[`n`: `number`\]: [`ActionCall`](#actioncall)\<`Params`, `Payload`\>

#### Properties

##### \[unscopables\]

> `readonly` **\[unscopables\]**: `object`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2015.symbol.wellknown.d.ts:97

Is an object whose properties have the value 'true'
when they will be absent when used in a 'with' statement.

###### Index Signature

\[`key`: `number`\]: `undefined` \| `boolean`

###### \[iterator\]?

> `optional` **\[iterator\]**: `boolean`

###### \[unscopables\]?

> `readonly` `optional` **\[unscopables\]**: `boolean`

Is an object whose properties have the value 'true'
when they will be absent when used in a 'with' statement.

###### at?

> `optional` **at**: `boolean`

###### concat?

> `optional` **concat**: `boolean`

###### copyWithin?

> `optional` **copyWithin**: `boolean`

###### entries?

> `optional` **entries**: `boolean`

###### every?

> `optional` **every**: `boolean`

###### fill?

> `optional` **fill**: `boolean`

###### filter?

> `optional` **filter**: `boolean`

###### find?

> `optional` **find**: `boolean`

###### findIndex?

> `optional` **findIndex**: `boolean`

###### findLast?

> `optional` **findLast**: `boolean`

###### findLastIndex?

> `optional` **findLastIndex**: `boolean`

###### flat?

> `optional` **flat**: `boolean`

###### flatMap?

> `optional` **flatMap**: `boolean`

###### forEach?

> `optional` **forEach**: `boolean`

###### includes?

> `optional` **includes**: `boolean`

###### indexOf?

> `optional` **indexOf**: `boolean`

###### join?

> `optional` **join**: `boolean`

###### keys?

> `optional` **keys**: `boolean`

###### lastIndexOf?

> `optional` **lastIndexOf**: `boolean`

###### length?

> `optional` **length**: `boolean`

Gets or sets the length of the array. This is a number one higher than the highest index in the array.

###### map?

> `optional` **map**: `boolean`

###### pop?

> `optional` **pop**: `boolean`

###### push?

> `optional` **push**: `boolean`

###### reduce?

> `optional` **reduce**: `boolean`

###### reduceRight?

> `optional` **reduceRight**: `boolean`

###### reverse?

> `optional` **reverse**: `boolean`

###### shift?

> `optional` **shift**: `boolean`

###### slice?

> `optional` **slice**: `boolean`

###### some?

> `optional` **some**: `boolean`

###### sort?

> `optional` **sort**: `boolean`

###### splice?

> `optional` **splice**: `boolean`

###### toLocaleString?

> `optional` **toLocaleString**: `boolean`

###### toReversed?

> `optional` **toReversed**: `boolean`

###### toSorted?

> `optional` **toSorted**: `boolean`

###### toSpliced?

> `optional` **toSpliced**: `boolean`

###### toString?

> `optional` **toString**: `boolean`

###### unshift?

> `optional` **unshift**: `boolean`

###### values?

> `optional` **values**: `boolean`

###### with?

> `optional` **with**: `boolean`

###### Inherited from

`Array.[unscopables]`

##### length

> **length**: `number`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1326

Gets or sets the length of the array. This is a number one higher than the highest index in the array.

###### Inherited from

`Array.length`

#### Methods

##### \[iterator\]()

> **\[iterator\]**(): `ArrayIterator`\<[`ActionCall`](#actioncall)\<`Params`, `Payload`\>\>

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2015.iterable.d.ts:78

Iterator

###### Returns

`ArrayIterator`\<[`ActionCall`](#actioncall)\<`Params`, `Payload`\>\>

###### Inherited from

`Array.[iterator]`

##### at()

> **at**(`index`): `undefined` \| [`ActionCall`](#actioncall)\<`Params`, `Payload`\>

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2022.array.d.ts:24

Returns the item located at the specified index.

###### Parameters

###### index

`number`

The zero-based index of the desired code unit. A negative index will count back from the last item.

###### Returns

`undefined` \| [`ActionCall`](#actioncall)\<`Params`, `Payload`\>

###### Inherited from

`Array.at`

##### concat()

###### Call Signature

> **concat**(...`items`): [`ActionCall`](#actioncall)\<`Params`, `Payload`\>[]

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1350

Combines two or more arrays.
This method returns a new array without modifying any existing arrays.

###### Parameters

###### items

...`ConcatArray`\<[`ActionCall`](#actioncall)\<`Params`, `Payload`\>\>[]

Additional arrays and/or items to add to the end of the array.

###### Returns

[`ActionCall`](#actioncall)\<`Params`, `Payload`\>[]

###### Inherited from

`Array.concat`

###### Call Signature

> **concat**(...`items`): [`ActionCall`](#actioncall)\<`Params`, `Payload`\>[]

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1356

Combines two or more arrays.
This method returns a new array without modifying any existing arrays.

###### Parameters

###### items

...([`ActionCall`](#actioncall)\<`Params`, `Payload`\> \| `ConcatArray`\<[`ActionCall`](#actioncall)\<`Params`, `Payload`\>\>)[]

Additional arrays and/or items to add to the end of the array.

###### Returns

[`ActionCall`](#actioncall)\<`Params`, `Payload`\>[]

###### Inherited from

`Array.concat`

##### copyWithin()

> **copyWithin**(`target`, `start`, `end?`): `this`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2015.core.d.ts:62

Returns the this object after copying a section of the array identified by start and end
to the same array starting at position target

###### Parameters

###### target

`number`

If target is negative, it is treated as length+target where length is the
length of the array.

###### start

`number`

If start is negative, it is treated as length+start. If end is negative, it
is treated as length+end.

###### end?

`number`

If not specified, length of the this object is used as its default value.

###### Returns

`this`

###### Inherited from

`Array.copyWithin`

##### entries()

> **entries**(): `ArrayIterator`\<\[`number`, [`ActionCall`](#actioncall)\<`Params`, `Payload`\>\]\>

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2015.iterable.d.ts:83

Returns an iterable of key, value pairs for every entry in the array

###### Returns

`ArrayIterator`\<\[`number`, [`ActionCall`](#actioncall)\<`Params`, `Payload`\>\]\>

###### Inherited from

`Array.entries`

##### every()

###### Call Signature

> **every**\<`S`\>(`predicate`, `thisArg?`): `this is S[]`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1433

Determines whether all the members of an array satisfy the specified test.

###### Type Parameters

###### S

`S` *extends* [`ActionCall`](#actioncall)\<`Params`, `Payload`\>

###### Parameters

###### predicate

(`value`, `index`, `array`) => `value is S`

A function that accepts up to three arguments. The every method calls
the predicate function for each element in the array until the predicate returns a value
which is coercible to the Boolean value false, or until the end of the array.

###### thisArg?

`any`

An object to which the this keyword can refer in the predicate function.
If thisArg is omitted, undefined is used as the this value.

###### Returns

`this is S[]`

###### Inherited from

`Array.every`

###### Call Signature

> **every**(`predicate`, `thisArg?`): `boolean`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1442

Determines whether all the members of an array satisfy the specified test.

###### Parameters

###### predicate

(`value`, `index`, `array`) => `unknown`

A function that accepts up to three arguments. The every method calls
the predicate function for each element in the array until the predicate returns a value
which is coercible to the Boolean value false, or until the end of the array.

###### thisArg?

`any`

An object to which the this keyword can refer in the predicate function.
If thisArg is omitted, undefined is used as the this value.

###### Returns

`boolean`

###### Inherited from

`Array.every`

##### fill()

> **fill**(`value`, `start?`, `end?`): `this`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2015.core.d.ts:51

Changes all array elements from `start` to `end` index to a static `value` and returns the modified array

###### Parameters

###### value

[`ActionCall`](#actioncall)

value to fill array section with

###### start?

`number`

index to start filling the array at. If start is negative, it is treated as
length+start where length is the length of the array.

###### end?

`number`

index to stop filling the array at. If end is negative, it is treated as
length+end.

###### Returns

`this`

###### Inherited from

`Array.fill`

##### filter()

###### Call Signature

> **filter**\<`S`\>(`predicate`, `thisArg?`): `S`[]

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1469

Returns the elements of an array that meet the condition specified in a callback function.

###### Type Parameters

###### S

`S` *extends* [`ActionCall`](#actioncall)\<`Params`, `Payload`\>

###### Parameters

###### predicate

(`value`, `index`, `array`) => `value is S`

A function that accepts up to three arguments. The filter method calls the predicate function one time for each element in the array.

###### thisArg?

`any`

An object to which the this keyword can refer in the predicate function. If thisArg is omitted, undefined is used as the this value.

###### Returns

`S`[]

###### Inherited from

`Array.filter`

###### Call Signature

> **filter**(`predicate`, `thisArg?`): [`ActionCall`](#actioncall)\<`Params`, `Payload`\>[]

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1475

Returns the elements of an array that meet the condition specified in a callback function.

###### Parameters

###### predicate

(`value`, `index`, `array`) => `unknown`

A function that accepts up to three arguments. The filter method calls the predicate function one time for each element in the array.

###### thisArg?

`any`

An object to which the this keyword can refer in the predicate function. If thisArg is omitted, undefined is used as the this value.

###### Returns

[`ActionCall`](#actioncall)\<`Params`, `Payload`\>[]

###### Inherited from

`Array.filter`

##### find()

###### Call Signature

> **find**\<`S`\>(`predicate`, `thisArg?`): `undefined` \| `S`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2015.core.d.ts:29

Returns the value of the first element in the array where predicate is true, and undefined
otherwise.

###### Type Parameters

###### S

`S` *extends* [`ActionCall`](#actioncall)\<`Params`, `Payload`\>

###### Parameters

###### predicate

(`value`, `index`, `obj`) => `value is S`

find calls predicate once for each element of the array, in ascending
order, until it finds one where predicate returns true. If such an element is found, find
immediately returns that element value. Otherwise, find returns undefined.

###### thisArg?

`any`

If provided, it will be used as the this value for each invocation of
predicate. If it is not provided, undefined is used instead.

###### Returns

`undefined` \| `S`

###### Inherited from

`Array.find`

###### Call Signature

> **find**(`predicate`, `thisArg?`): `undefined` \| [`ActionCall`](#actioncall)\<`Params`, `Payload`\>

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2015.core.d.ts:30

###### Parameters

###### predicate

(`value`, `index`, `obj`) => `unknown`

###### thisArg?

`any`

###### Returns

`undefined` \| [`ActionCall`](#actioncall)\<`Params`, `Payload`\>

###### Inherited from

`Array.find`

##### findIndex()

> **findIndex**(`predicate`, `thisArg?`): `number`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2015.core.d.ts:41

Returns the index of the first element in the array where predicate is true, and -1
otherwise.

###### Parameters

###### predicate

(`value`, `index`, `obj`) => `unknown`

find calls predicate once for each element of the array, in ascending
order, until it finds one where predicate returns true. If such an element is found,
findIndex immediately returns that element index. Otherwise, findIndex returns -1.

###### thisArg?

`any`

If provided, it will be used as the this value for each invocation of
predicate. If it is not provided, undefined is used instead.

###### Returns

`number`

###### Inherited from

`Array.findIndex`

##### findLast()

###### Call Signature

> **findLast**\<`S`\>(`predicate`, `thisArg?`): `undefined` \| `S`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2023.array.d.ts:29

Returns the value of the last element in the array where predicate is true, and undefined
otherwise.

###### Type Parameters

###### S

`S` *extends* [`ActionCall`](#actioncall)\<`Params`, `Payload`\>

###### Parameters

###### predicate

(`value`, `index`, `array`) => `value is S`

findLast calls predicate once for each element of the array, in descending
order, until it finds one where predicate returns true. If such an element is found, findLast
immediately returns that element value. Otherwise, findLast returns undefined.

###### thisArg?

`any`

If provided, it will be used as the this value for each invocation of
predicate. If it is not provided, undefined is used instead.

###### Returns

`undefined` \| `S`

###### Inherited from

`Array.findLast`

###### Call Signature

> **findLast**(`predicate`, `thisArg?`): `undefined` \| [`ActionCall`](#actioncall)\<`Params`, `Payload`\>

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2023.array.d.ts:30

###### Parameters

###### predicate

(`value`, `index`, `array`) => `unknown`

###### thisArg?

`any`

###### Returns

`undefined` \| [`ActionCall`](#actioncall)\<`Params`, `Payload`\>

###### Inherited from

`Array.findLast`

##### findLastIndex()

> **findLastIndex**(`predicate`, `thisArg?`): `number`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2023.array.d.ts:41

Returns the index of the last element in the array where predicate is true, and -1
otherwise.

###### Parameters

###### predicate

(`value`, `index`, `array`) => `unknown`

findLastIndex calls predicate once for each element of the array, in descending
order, until it finds one where predicate returns true. If such an element is found,
findLastIndex immediately returns that element index. Otherwise, findLastIndex returns -1.

###### thisArg?

`any`

If provided, it will be used as the this value for each invocation of
predicate. If it is not provided, undefined is used instead.

###### Returns

`number`

###### Inherited from

`Array.findLastIndex`

##### flat()

> **flat**\<`A`, `D`\>(`this`, `depth?`): `FlatArray`\<`A`, `D`\>[]

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2019.array.d.ts:75

Returns a new array with all sub-array elements concatenated into it recursively up to the
specified depth.

###### Type Parameters

###### A

`A`

###### D

`D` *extends* `number` = `1`

###### Parameters

###### this

`A`

###### depth?

`D`

The maximum recursion depth

###### Returns

`FlatArray`\<`A`, `D`\>[]

###### Inherited from

`Array.flat`

##### flatMap()

> **flatMap**\<`U`, `This`\>(`callback`, `thisArg?`): `U`[]

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2019.array.d.ts:64

Calls a defined callback function on each element of an array. Then, flattens the result into
a new array.
This is identical to a map followed by flat with depth 1.

###### Type Parameters

###### U

`U`

###### This

`This` = `undefined`

###### Parameters

###### callback

(`this`, `value`, `index`, `array`) => `U` \| readonly `U`[]

A function that accepts up to three arguments. The flatMap method calls the
callback function one time for each element in the array.

###### thisArg?

`This`

An object to which the this keyword can refer in the callback function. If
thisArg is omitted, undefined is used as the this value.

###### Returns

`U`[]

###### Inherited from

`Array.flatMap`

##### forEach()

> **forEach**(`callbackfn`, `thisArg?`): `void`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1457

Performs the specified action for each element in an array.

###### Parameters

###### callbackfn

(`value`, `index`, `array`) => `void`

A function that accepts up to three arguments. forEach calls the callbackfn function one time for each element in the array.

###### thisArg?

`any`

An object to which the this keyword can refer in the callbackfn function. If thisArg is omitted, undefined is used as the this value.

###### Returns

`void`

###### Inherited from

`Array.forEach`

##### includes()

> **includes**(`searchElement`, `fromIndex?`): `boolean`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2016.array.include.d.ts:25

Determines whether an array includes a certain element, returning true or false as appropriate.

###### Parameters

###### searchElement

[`ActionCall`](#actioncall)

The element to search for.

###### fromIndex?

`number`

The position in this array at which to begin searching for searchElement.

###### Returns

`boolean`

###### Inherited from

`Array.includes`

##### indexOf()

> **indexOf**(`searchElement`, `fromIndex?`): `number`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1418

Returns the index of the first occurrence of a value in an array, or -1 if it is not present.

###### Parameters

###### searchElement

[`ActionCall`](#actioncall)

The value to locate in the array.

###### fromIndex?

`number`

The array index at which to begin the search. If fromIndex is omitted, the search starts at index 0.

###### Returns

`number`

###### Inherited from

`Array.indexOf`

##### join()

> **join**(`separator?`): `string`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1361

Adds all the elements of an array into a string, separated by the specified separator string.

###### Parameters

###### separator?

`string`

A string used to separate one element of the array from the next in the resulting string. If omitted, the array elements are separated with a comma.

###### Returns

`string`

###### Inherited from

`Array.join`

##### keys()

> **keys**(): `ArrayIterator`\<`number`\>

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2015.iterable.d.ts:88

Returns an iterable of keys in the array

###### Returns

`ArrayIterator`\<`number`\>

###### Inherited from

`Array.keys`

##### lastIndexOf()

> **lastIndexOf**(`searchElement`, `fromIndex?`): `number`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1424

Returns the index of the last occurrence of a specified value in an array, or -1 if it is not present.

###### Parameters

###### searchElement

[`ActionCall`](#actioncall)

The value to locate in the array.

###### fromIndex?

`number`

The array index at which to begin searching backward. If fromIndex is omitted, the search starts at the last index in the array.

###### Returns

`number`

###### Inherited from

`Array.lastIndexOf`

##### map()

> **map**\<`U`\>(`callbackfn`, `thisArg?`): `U`[]

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1463

Calls a defined callback function on each element of an array, and returns an array that contains the results.

###### Type Parameters

###### U

`U`

###### Parameters

###### callbackfn

(`value`, `index`, `array`) => `U`

A function that accepts up to three arguments. The map method calls the callbackfn function one time for each element in the array.

###### thisArg?

`any`

An object to which the this keyword can refer in the callbackfn function. If thisArg is omitted, undefined is used as the this value.

###### Returns

`U`[]

###### Inherited from

`Array.map`

##### pop()

> **pop**(): `undefined` \| [`ActionCall`](#actioncall)\<`Params`, `Payload`\>

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1339

Removes the last element from an array and returns it.
If the array is empty, undefined is returned and the array is not modified.

###### Returns

`undefined` \| [`ActionCall`](#actioncall)\<`Params`, `Payload`\>

###### Inherited from

`Array.pop`

##### push()

> **push**(...`items`): `number`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1344

Appends new elements to the end of an array, and returns the new length of the array.

###### Parameters

###### items

...[`ActionCall`](#actioncall)\<`Params`, `Payload`\>[]

New elements to add to the array.

###### Returns

`number`

###### Inherited from

`Array.push`

##### reduce()

###### Call Signature

> **reduce**(`callbackfn`): [`ActionCall`](#actioncall)

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1481

Calls the specified callback function for all the elements in an array. The return value of the callback function is the accumulated result, and is provided as an argument in the next call to the callback function.

###### Parameters

###### callbackfn

(`previousValue`, `currentValue`, `currentIndex`, `array`) => [`ActionCall`](#actioncall)

A function that accepts up to four arguments. The reduce method calls the callbackfn function one time for each element in the array.

###### Returns

[`ActionCall`](#actioncall)

###### Inherited from

`Array.reduce`

###### Call Signature

> **reduce**(`callbackfn`, `initialValue`): [`ActionCall`](#actioncall)

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1482

###### Parameters

###### callbackfn

(`previousValue`, `currentValue`, `currentIndex`, `array`) => [`ActionCall`](#actioncall)

###### initialValue

[`ActionCall`](#actioncall)

###### Returns

[`ActionCall`](#actioncall)

###### Inherited from

`Array.reduce`

###### Call Signature

> **reduce**\<`U`\>(`callbackfn`, `initialValue`): `U`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1488

Calls the specified callback function for all the elements in an array. The return value of the callback function is the accumulated result, and is provided as an argument in the next call to the callback function.

###### Type Parameters

###### U

`U`

###### Parameters

###### callbackfn

(`previousValue`, `currentValue`, `currentIndex`, `array`) => `U`

A function that accepts up to four arguments. The reduce method calls the callbackfn function one time for each element in the array.

###### initialValue

`U`

If initialValue is specified, it is used as the initial value to start the accumulation. The first call to the callbackfn function provides this value as an argument instead of an array value.

###### Returns

`U`

###### Inherited from

`Array.reduce`

##### reduceRight()

###### Call Signature

> **reduceRight**(`callbackfn`): [`ActionCall`](#actioncall)

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1494

Calls the specified callback function for all the elements in an array, in descending order. The return value of the callback function is the accumulated result, and is provided as an argument in the next call to the callback function.

###### Parameters

###### callbackfn

(`previousValue`, `currentValue`, `currentIndex`, `array`) => [`ActionCall`](#actioncall)

A function that accepts up to four arguments. The reduceRight method calls the callbackfn function one time for each element in the array.

###### Returns

[`ActionCall`](#actioncall)

###### Inherited from

`Array.reduceRight`

###### Call Signature

> **reduceRight**(`callbackfn`, `initialValue`): [`ActionCall`](#actioncall)

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1495

###### Parameters

###### callbackfn

(`previousValue`, `currentValue`, `currentIndex`, `array`) => [`ActionCall`](#actioncall)

###### initialValue

[`ActionCall`](#actioncall)

###### Returns

[`ActionCall`](#actioncall)

###### Inherited from

`Array.reduceRight`

###### Call Signature

> **reduceRight**\<`U`\>(`callbackfn`, `initialValue`): `U`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1501

Calls the specified callback function for all the elements in an array, in descending order. The return value of the callback function is the accumulated result, and is provided as an argument in the next call to the callback function.

###### Type Parameters

###### U

`U`

###### Parameters

###### callbackfn

(`previousValue`, `currentValue`, `currentIndex`, `array`) => `U`

A function that accepts up to four arguments. The reduceRight method calls the callbackfn function one time for each element in the array.

###### initialValue

`U`

If initialValue is specified, it is used as the initial value to start the accumulation. The first call to the callbackfn function provides this value as an argument instead of an array value.

###### Returns

`U`

###### Inherited from

`Array.reduceRight`

##### reverse()

> **reverse**(): [`ActionCall`](#actioncall)\<`Params`, `Payload`\>[]

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1366

Reverses the elements in an array in place.
This method mutates the array and returns a reference to the same array.

###### Returns

[`ActionCall`](#actioncall)\<`Params`, `Payload`\>[]

###### Inherited from

`Array.reverse`

##### shift()

> **shift**(): `undefined` \| [`ActionCall`](#actioncall)\<`Params`, `Payload`\>

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1371

Removes the first element from an array and returns it.
If the array is empty, undefined is returned and the array is not modified.

###### Returns

`undefined` \| [`ActionCall`](#actioncall)\<`Params`, `Payload`\>

###### Inherited from

`Array.shift`

##### slice()

> **slice**(`start?`, `end?`): [`ActionCall`](#actioncall)\<`Params`, `Payload`\>[]

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1381

Returns a copy of a section of an array.
For both start and end, a negative index can be used to indicate an offset from the end of the array.
For example, -2 refers to the second to last element of the array.

###### Parameters

###### start?

`number`

The beginning index of the specified portion of the array.
If start is undefined, then the slice begins at index 0.

###### end?

`number`

The end index of the specified portion of the array. This is exclusive of the element at the index 'end'.
If end is undefined, then the slice extends to the end of the array.

###### Returns

[`ActionCall`](#actioncall)\<`Params`, `Payload`\>[]

###### Inherited from

`Array.slice`

##### some()

> **some**(`predicate`, `thisArg?`): `boolean`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1451

Determines whether the specified callback function returns true for any element of an array.

###### Parameters

###### predicate

(`value`, `index`, `array`) => `unknown`

A function that accepts up to three arguments. The some method calls
the predicate function for each element in the array until the predicate returns a value
which is coercible to the Boolean value true, or until the end of the array.

###### thisArg?

`any`

An object to which the this keyword can refer in the predicate function.
If thisArg is omitted, undefined is used as the this value.

###### Returns

`boolean`

###### Inherited from

`Array.some`

##### sort()

> **sort**(`compareFn?`): `this`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1392

Sorts an array in place.
This method mutates the array and returns a reference to the same array.

###### Parameters

###### compareFn?

(`a`, `b`) => `number`

Function used to determine the order of the elements. It is expected to return
a negative value if the first argument is less than the second argument, zero if they're equal, and a positive
value otherwise. If omitted, the elements are sorted in ascending, UTF-16 code unit order.
```ts
[11,2,22,1].sort((a, b) => a - b)
```

###### Returns

`this`

###### Inherited from

`Array.sort`

##### splice()

###### Call Signature

> **splice**(`start`, `deleteCount?`): [`ActionCall`](#actioncall)\<`Params`, `Payload`\>[]

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1399

Removes elements from an array and, if necessary, inserts new elements in their place, returning the deleted elements.

###### Parameters

###### start

`number`

The zero-based location in the array from which to start removing elements.

###### deleteCount?

`number`

The number of elements to remove.

###### Returns

[`ActionCall`](#actioncall)\<`Params`, `Payload`\>[]

An array containing the elements that were deleted.

###### Inherited from

`Array.splice`

###### Call Signature

> **splice**(`start`, `deleteCount`, ...`items`): [`ActionCall`](#actioncall)\<`Params`, `Payload`\>[]

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1407

Removes elements from an array and, if necessary, inserts new elements in their place, returning the deleted elements.

###### Parameters

###### start

`number`

The zero-based location in the array from which to start removing elements.

###### deleteCount

`number`

The number of elements to remove.

###### items

...[`ActionCall`](#actioncall)\<`Params`, `Payload`\>[]

Elements to insert into the array in place of the deleted elements.

###### Returns

[`ActionCall`](#actioncall)\<`Params`, `Payload`\>[]

An array containing the elements that were deleted.

###### Inherited from

`Array.splice`

##### toLocaleString()

###### Call Signature

> **toLocaleString**(): `string`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1334

Returns a string representation of an array. The elements are converted to string using their toLocaleString methods.

###### Returns

`string`

###### Inherited from

`Array.toLocaleString`

###### Call Signature

> **toLocaleString**(`locales`, `options?`): `string`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2015.core.d.ts:64

###### Parameters

###### locales

`string` | `string`[]

###### options?

`NumberFormatOptions` & `DateTimeFormatOptions`

###### Returns

`string`

###### Inherited from

`Array.toLocaleString`

##### toReversed()

> **toReversed**(): [`ActionCall`](#actioncall)\<`Params`, `Payload`\>[]

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2023.array.d.ts:46

Returns a copy of an array with its elements reversed.

###### Returns

[`ActionCall`](#actioncall)\<`Params`, `Payload`\>[]

###### Inherited from

`Array.toReversed`

##### toSorted()

> **toSorted**(`compareFn?`): [`ActionCall`](#actioncall)\<`Params`, `Payload`\>[]

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2023.array.d.ts:57

Returns a copy of an array with its elements sorted.

###### Parameters

###### compareFn?

(`a`, `b`) => `number`

Function used to determine the order of the elements. It is expected to return
a negative value if the first argument is less than the second argument, zero if they're equal, and a positive
value otherwise. If omitted, the elements are sorted in ascending, UTF-16 code unit order.
```ts
[11, 2, 22, 1].toSorted((a, b) => a - b) // [1, 2, 11, 22]
```

###### Returns

[`ActionCall`](#actioncall)\<`Params`, `Payload`\>[]

###### Inherited from

`Array.toSorted`

##### toSpliced()

###### Call Signature

> **toSpliced**(`start`, `deleteCount`, ...`items`): [`ActionCall`](#actioncall)\<`Params`, `Payload`\>[]

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2023.array.d.ts:66

Copies an array and removes elements and, if necessary, inserts new elements in their place. Returns the copied array.

###### Parameters

###### start

`number`

The zero-based location in the array from which to start removing elements.

###### deleteCount

`number`

The number of elements to remove.

###### items

...[`ActionCall`](#actioncall)\<`Params`, `Payload`\>[]

Elements to insert into the copied array in place of the deleted elements.

###### Returns

[`ActionCall`](#actioncall)\<`Params`, `Payload`\>[]

The copied array.

###### Inherited from

`Array.toSpliced`

###### Call Signature

> **toSpliced**(`start`, `deleteCount?`): [`ActionCall`](#actioncall)\<`Params`, `Payload`\>[]

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2023.array.d.ts:74

Copies an array and removes elements while returning the remaining elements.

###### Parameters

###### start

`number`

The zero-based location in the array from which to start removing elements.

###### deleteCount?

`number`

The number of elements to remove.

###### Returns

[`ActionCall`](#actioncall)\<`Params`, `Payload`\>[]

A copy of the original array with the remaining elements.

###### Inherited from

`Array.toSpliced`

##### toString()

> **toString**(): `string`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1330

Returns a string representation of an array.

###### Returns

`string`

###### Inherited from

`Array.toString`

##### unshift()

> **unshift**(...`items`): `number`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1412

Inserts new elements at the start of an array, and returns the new length of the array.

###### Parameters

###### items

...[`ActionCall`](#actioncall)\<`Params`, `Payload`\>[]

Elements to insert at the start of the array.

###### Returns

`number`

###### Inherited from

`Array.unshift`

##### values()

> **values**(): `ArrayIterator`\<[`ActionCall`](#actioncall)\<`Params`, `Payload`\>\>

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2015.iterable.d.ts:93

Returns an iterable of values in the array

###### Returns

`ArrayIterator`\<[`ActionCall`](#actioncall)\<`Params`, `Payload`\>\>

###### Inherited from

`Array.values`

##### with()

> **with**(`index`, `value`): [`ActionCall`](#actioncall)\<`Params`, `Payload`\>[]

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2023.array.d.ts:85

Copies an array, then overwrites the value at the provided index with the
given value. If the index is negative, then it replaces from the end
of the array.

###### Parameters

###### index

`number`

The index of the value to overwrite. If the index is
negative, then it replaces from the end of the array.

###### value

[`ActionCall`](#actioncall)

The value to write into the copied array.

###### Returns

[`ActionCall`](#actioncall)\<`Params`, `Payload`\>[]

The copied array with the updated value.

###### Inherited from

`Array.with`

***

### ArrayAtom()\<T\>

Defined in: [packages/core/src/primitives/reatomArray.ts:4](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomArray.ts#L4)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Extends

- [`Atom`](#atom)\<`T`[]\>

#### Type Parameters

##### T

`T`

The type of state stored in the atom

> **ArrayAtom**(...`params`): `T`[]

Defined in: [packages/core/src/primitives/reatomArray.ts:4](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomArray.ts#L4)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Parameters

##### params

...\[\]

Parameters to pass to the atom

#### Returns

`T`[]

The atom's payload (typically its current state)

#### Properties

##### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#atommeta)

Defined in: [packages/core/src/core/atom.ts:101](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L101)

Reference to the atom's internal metadata.

###### Inherited from

[`Atom`](#atom).[`__reatom`](#__reatom-3)

##### actions

> **actions**: [`Actions`](#actions-26)\<[`ArrayAtom`](#arrayatom)\<`T`\>\>

Defined in: [packages/core/src/core/atom.ts:81](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L81)

Bind methods to the atom to extend its functionality.

###### Inherited from

[`Atom`](#atom).[`actions`](#actions-3)

##### extend

> **extend**: [`Extend`](#extend-10)\<[`ArrayAtom`](#arrayatom)\<`T`\>\>

Defined in: [packages/core/src/core/atom.ts:87](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L87)

Extension system to add capabilities to atoms. Allows adding middleware,
methods, or other functionality to modify atom behavior.

###### Inherited from

[`Atom`](#atom).[`extend`](#extend-3)

##### pop

> **pop**: [`Action`](#action)\<\[\], `undefined` \| `T`\>

Defined in: [packages/core/src/primitives/reatomArray.ts:6](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomArray.ts#L6)

##### push

> **push**: [`Action`](#action)\<`T`[], `number`\>

Defined in: [packages/core/src/primitives/reatomArray.ts:5](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomArray.ts#L5)

##### shift

> **shift**: [`Action`](#action)\<\[\], `undefined` \| `T`\>

Defined in: [packages/core/src/primitives/reatomArray.ts:7](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomArray.ts#L7)

##### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#unsubscribe-2)

Defined in: [packages/core/src/core/atom.ts:98](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L98)

Subscribe to state changes, with the first call happening immediately. When
a subscriber is added, the callback is immediately invoked with the current
state. After that, it's called whenever the atom's state changes.

###### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it
  changes

###### Returns

[`Unsubscribe`](#unsubscribe-2)

An unsubscribe function that removes the subscription when called

###### Inherited from

[`Atom`](#atom).[`subscribe`](#subscribe-3)

##### unshift

> **unshift**: [`Action`](#action)\<`T`[], `number`\>

Defined in: [packages/core/src/primitives/reatomArray.ts:8](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomArray.ts#L8)

#### Methods

##### set()

###### Call Signature

> **set**(`update`): `T`[]

Defined in: [packages/core/src/core/atom.ts:122](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L122)

Update the atom's state using a function that receives the previous state

###### Parameters

###### update

(`state`) => `T`[]

Function that takes the current state and returns a new
  state

###### Returns

`T`[]

The new state value

###### Inherited from

[`Atom`](#atom).[`set`](#set-9)

###### Call Signature

> **set**(...`params`): `T`[]

Defined in: [packages/core/src/core/atom.ts:130](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L130)

Set the atom's state to a new value

###### Parameters

###### params

...\[`T`[]\]

###### Returns

`T`[]

The new state value

###### Inherited from

[`Atom`](#atom).[`set`](#set-9)

***

### AssignerExt()\<Methods, Target\>

Defined in: [packages/core/src/core/extend.ts:42](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/extend.ts#L42)

Extension that assigns additional methods to an atom/action.

This extension type is used for adding methods or properties to atoms or
actions without modifying their core behavior.

#### Type Parameters

##### Methods

`Methods` *extends* [`Rec`](#rec) = \{ \}

Record of methods/properties to be added to the target

##### Target

`Target` *extends* [`AtomLike`](#atomlike) = [`AtomLike`](#atomlike)

The type of atom or action the extension can be applied to

> **AssignerExt**\<`T`\>(`target`): `Methods`

Defined in: [packages/core/src/core/extend.ts:46](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/extend.ts#L46)

Extension that assigns additional methods to an atom/action.

This extension type is used for adding methods or properties to atoms or
actions without modifying their core behavior.

#### Type Parameters

##### T

`T` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\>

#### Parameters

##### target

`T`

#### Returns

`Methods`

***

### AsyncDataExt\<Params, Payload, State, Error\>

Defined in: [packages/core/src/async/withAsyncData.ts:20](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/async/withAsyncData.ts#L20)

Extension interface added by [withAsyncData](#withasyncdata) to atoms or actions that
return promises. Extends [AsyncExt](#asyncext) with data storage and abort
capabilities for managing async data fetching.

#### Extends

- [`AsyncExt`](#asyncext)\<`Params`, `Payload`, `Error`\>.[`AbortExt`](#abortext)

#### Extended by

- [`RouteLoader`](#routeloader)

#### Type Parameters

##### Params

`Params` *extends* `any`[] = `any`[]

The parameter types of the original atom or action

##### Payload

`Payload` = `any`

The resolved value type of the promise

##### State

`State` = `any`

The type of the stored data

##### Error

`Error` = `any`

The type of errors that can be caught

#### Properties

##### abort

> **abort**: [`Action`](#action)\<\[`any`\]\>

Defined in: [packages/core/src/mixins/withAbort.ts:11](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/mixins/withAbort.ts#L11)

###### Inherited from

[`AbortExt`](#abortext).[`abort`](#abort)

##### data

> **data**: [`Atom`](#atom)\<`State`\>

Defined in: [packages/core/src/async/withAsyncData.ts:31](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/async/withAsyncData.ts#L31)

Atom that stores the fetched data Updated automatically when the async
operation completes successfully

##### error

> **error**: [`Atom`](#atom)\<`undefined` \| `Error`\>

Defined in: [packages/core/src/async/withAsync.ts:81](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/async/withAsync.ts#L81)

Atom containing the most recent error or undefined if no error has occurred

###### Inherited from

[`AsyncExt`](#asyncext).[`error`](#error-3)

##### onFulfill

> **onFulfill**: [`Action`](#action)\<\[`Payload`, `Params`\], \{ `params`: `Params`; `payload`: `Payload`; \}\>

Defined in: [packages/core/src/async/withAsync.ts:45](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/async/withAsync.ts#L45)

Action that is called when the promise resolves successfully

###### Param

The resolved value from the promise

###### Param

The original parameters passed to the atom/action

###### Returns

An object containing the payload and parameters

###### Inherited from

[`AsyncExt`](#asyncext).[`onFulfill`](#onfulfill-1)

##### onReject

> **onReject**: [`Action`](#action)\<\[`Error`, `Params`\], \{ `error`: `Error`; `params`: `Params`; \}\>

Defined in: [packages/core/src/async/withAsync.ts:57](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/async/withAsync.ts#L57)

Action that is called when the promise rejects with an error

###### Param

The error thrown by the promise

###### Param

The original parameters passed to the atom/action

###### Returns

An object containing the error and parameters

###### Inherited from

[`AsyncExt`](#asyncext).[`onReject`](#onreject-1)

##### onSettle

> **onSettle**: [`Action`](#action)\<\[\{ `params`: `Params`; `payload`: `Payload`; \} \| \{ `error`: `Error`; `params`: `Params`; \}\], \{ `params`: `Params`; `payload`: `Payload`; \} \| \{ `error`: `Error`; `params`: `Params`; \}\>

Defined in: [packages/core/src/async/withAsync.ts:68](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/async/withAsync.ts#L68)

Action called after either successful resolution or rejection

###### Param

Either a payload+params object or an error+params object

###### Returns

The same result object that was passed in

###### Inherited from

[`AsyncExt`](#asyncext).[`onSettle`](#onsettle-1)

##### pending

> **pending**: [`Computed`](#computed)\<`number`\>

Defined in: [packages/core/src/async/withAsync.ts:78](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/async/withAsync.ts#L78)

Computed atom tracking how many async operations are currently pending

###### Returns

Number of pending operations (0 when none are pending)

###### Inherited from

[`AsyncExt`](#asyncext).[`pending`](#pending-1)

##### ready

> **ready**: [`Computed`](#computed)\<`boolean`\>

Defined in: [packages/core/src/async/withAsync.ts:36](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/async/withAsync.ts#L36)

Computed atom that indicates when no async operations are pending

###### Returns

Boolean indicating if all operations have completed (true) or some
  are still pending (false)

###### Inherited from

[`AsyncExt`](#asyncext).[`ready`](#ready-1)

***

### AsyncDataOptions\<State, Params, Payload, Err, EmptyErr\>

Defined in: [packages/core/src/async/withAsyncData.ts:44](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/async/withAsyncData.ts#L44)

Configuration options for the [withAsyncData](#withasyncdata) extension Extends
[AsyncOptions](#asyncoptions) with options specific to data management

#### Extends

- [`AsyncOptions`](#asyncoptions)\<`Err`, `EmptyErr`\>

#### Type Parameters

##### State

`State` = `any`

The type of data to store

##### Params

`Params` *extends* `any`[] = `any`[]

The parameter types of the original atom or action

##### Payload

`Payload` = `any`

The resolved value type of the promise

##### Err

`Err` = `Error`

The type of errors after parsing

##### EmptyErr

`EmptyErr` = `undefined`

The type of the empty error state

#### Properties

##### emptyError?

> `optional` **emptyError**: `EmptyErr`

Defined in: [packages/core/src/async/withAsync.ts:100](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/async/withAsync.ts#L100)

Initial/reset value for the error atom

###### Inherited from

[`AsyncOptions`](#asyncoptions).[`emptyError`](#emptyerror-1)

##### initState?

> `optional` **initState**: `State`

Defined in: [packages/core/src/async/withAsyncData.ts:52](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/async/withAsyncData.ts#L52)

Initial value for the data atom

##### mapPayload()?

> `optional` **mapPayload**: (`payload`, `params`, `state`) => `State`

Defined in: [packages/core/src/async/withAsyncData.ts:62](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/async/withAsyncData.ts#L62)

Function to transform the successful payload into the data state

###### Parameters

###### payload

`Payload`

The resolved value from the promise

###### params

`Params`

The original parameters passed to the atom/action

###### state

`State`

The current state of the data atom

###### Returns

`State`

The new state for the data atom

##### parseError()?

> `optional` **parseError**: (`error`) => `Err`

Defined in: [packages/core/src/async/withAsync.ts:97](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/async/withAsync.ts#L97)

Function to transform raw errors into a specific error type

###### Parameters

###### error

`unknown`

The caught error of unknown type

###### Returns

`Err`

A properly typed error object

###### Inherited from

[`AsyncOptions`](#asyncoptions).[`parseError`](#parseerror-1)

##### resetError?

> `optional` **resetError**: `null` \| `"onCall"` \| `"onFulfill"`

Defined in: [packages/core/src/async/withAsync.ts:109](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/async/withAsync.ts#L109)

When to reset the error state

- 'onCall': Reset error when the async operation starts (default)
- 'onFulfill': Reset error only when the operation succeeds
- Null: Never automatically reset errors

###### Inherited from

[`AsyncOptions`](#asyncoptions).[`resetError`](#reseterror-1)

***

### AsyncExt\<Params, Payload, Error\>

Defined in: [packages/core/src/async/withAsync.ts:25](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/async/withAsync.ts#L25)

Extension interface added by [withAsync](#withasync) to atoms or actions that return
promises. Provides utilities for tracking async state, handling errors, and
responding to async events.

#### Extended by

- [`AsyncDataExt`](#asyncdataext)

#### Type Parameters

##### Params

`Params` *extends* `any`[] = `any`[]

The parameter types of the original atom or action

##### Payload

`Payload` = `any`

The resolved value type of the promise

##### Error

`Error` = `any`

The type of errors that can be caught

#### Properties

##### error

> **error**: [`Atom`](#atom)\<`undefined` \| `Error`\>

Defined in: [packages/core/src/async/withAsync.ts:81](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/async/withAsync.ts#L81)

Atom containing the most recent error or undefined if no error has occurred

##### onFulfill

> **onFulfill**: [`Action`](#action)\<\[`Payload`, `Params`\], \{ `params`: `Params`; `payload`: `Payload`; \}\>

Defined in: [packages/core/src/async/withAsync.ts:45](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/async/withAsync.ts#L45)

Action that is called when the promise resolves successfully

###### Param

The resolved value from the promise

###### Param

The original parameters passed to the atom/action

###### Returns

An object containing the payload and parameters

##### onReject

> **onReject**: [`Action`](#action)\<\[`Error`, `Params`\], \{ `error`: `Error`; `params`: `Params`; \}\>

Defined in: [packages/core/src/async/withAsync.ts:57](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/async/withAsync.ts#L57)

Action that is called when the promise rejects with an error

###### Param

The error thrown by the promise

###### Param

The original parameters passed to the atom/action

###### Returns

An object containing the error and parameters

##### onSettle

> **onSettle**: [`Action`](#action)\<\[\{ `params`: `Params`; `payload`: `Payload`; \} \| \{ `error`: `Error`; `params`: `Params`; \}\], \{ `params`: `Params`; `payload`: `Payload`; \} \| \{ `error`: `Error`; `params`: `Params`; \}\>

Defined in: [packages/core/src/async/withAsync.ts:68](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/async/withAsync.ts#L68)

Action called after either successful resolution or rejection

###### Param

Either a payload+params object or an error+params object

###### Returns

The same result object that was passed in

##### pending

> **pending**: [`Computed`](#computed)\<`number`\>

Defined in: [packages/core/src/async/withAsync.ts:78](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/async/withAsync.ts#L78)

Computed atom tracking how many async operations are currently pending

###### Returns

Number of pending operations (0 when none are pending)

##### ready

> **ready**: [`Computed`](#computed)\<`boolean`\>

Defined in: [packages/core/src/async/withAsync.ts:36](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/async/withAsync.ts#L36)

Computed atom that indicates when no async operations are pending

###### Returns

Boolean indicating if all operations have completed (true) or some
  are still pending (false)

***

### Atom()\<State, Params\>

Defined in: [packages/core/src/core/atom.ts:113](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L113)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Extends

- [`AtomLike`](#atomlike)\<`State`, \[\]\>

#### Extended by

- [`FieldLikeAtom`](#fieldlikeatom)
- [`AbortAtom`](#abortatom)
- [`ArrayAtom`](#arrayatom)
- [`BooleanAtom`](#booleanatom)
- [`LinkedListLikeAtom`](#linkedlistlikeatom)
- [`NumberAtom`](#numberatom)
- [`RecordAtom`](#recordatom)
- [`SetAtom`](#setatom)
- [`WebSocketAtom`](#websocketatom)
- [`UrlAtom`](#urlatom)

#### Type Parameters

##### State

`State` = `any`

The type of state stored in the atom

##### Params

`Params` *extends* `any`[] = \[`State`\]

> **Atom**(...`params`): `State`

Defined in: [packages/core/src/core/atom.ts:113](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L113)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Parameters

##### params

...\[\]

Parameters to pass to the atom

#### Returns

`State`

The atom's payload (typically its current state)

#### Properties

##### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#atommeta)

Defined in: [packages/core/src/core/atom.ts:101](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L101)

Reference to the atom's internal metadata.

###### Inherited from

[`AtomLike`](#atomlike).[`__reatom`](#__reatom-4)

##### actions

> **actions**: [`Actions`](#actions-26)\<[`Atom`](#atom)\<`State`, `Params`\>\>

Defined in: [packages/core/src/core/atom.ts:81](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L81)

Bind methods to the atom to extend its functionality.

###### Inherited from

[`AtomLike`](#atomlike).[`actions`](#actions-4)

##### extend

> **extend**: [`Extend`](#extend-10)\<[`Atom`](#atom)\<`State`, `Params`\>\>

Defined in: [packages/core/src/core/atom.ts:87](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L87)

Extension system to add capabilities to atoms. Allows adding middleware,
methods, or other functionality to modify atom behavior.

###### Inherited from

[`AtomLike`](#atomlike).[`extend`](#extend-4)

##### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#unsubscribe-2)

Defined in: [packages/core/src/core/atom.ts:98](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L98)

Subscribe to state changes, with the first call happening immediately. When
a subscriber is added, the callback is immediately invoked with the current
state. After that, it's called whenever the atom's state changes.

###### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it
  changes

###### Returns

[`Unsubscribe`](#unsubscribe-2)

An unsubscribe function that removes the subscription when called

###### Inherited from

[`AtomLike`](#atomlike).[`subscribe`](#subscribe-4)

#### Methods

##### set()

###### Call Signature

> **set**(`update`): `State`

Defined in: [packages/core/src/core/atom.ts:122](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L122)

Update the atom's state using a function that receives the previous state

###### Parameters

###### update

(`state`) => `State`

Function that takes the current state and returns a new
  state

###### Returns

`State`

The new state value

###### Overrides

`AtomLike.set`

###### Call Signature

> **set**(...`params`): `State`

Defined in: [packages/core/src/core/atom.ts:130](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L130)

Set the atom's state to a new value

###### Parameters

###### params

...`Params`

###### Returns

`State`

The new state value

###### Overrides

`AtomLike.set`

***

### AtomLike()\<State, Params, Payload\>

Defined in: [packages/core/src/core/atom.ts:65](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L65)

Base atom interface for other userspace implementations. This is the core
interface that all atom-like objects implement, providing the foundation for
Reatom's reactivity system.

#### Extended by

- [`Action`](#action)
- [`Atom`](#atom)
- [`Computed`](#computed)
- [`ContextAtom`](#contextatom)
- [`FocusAtom`](#focusatom)
- [`ValidationAtom`](#validationatom)
- [`MapAtom`](#mapatom)

#### Type Parameters

##### State

`State` = `any`

The type of state stored in the atom

##### Params

`Params` *extends* `any`[] = `any`[]

##### Payload

`Payload` = `State`

The return type when the atom is called

> **AtomLike**(...`params`): `Payload`

Defined in: [packages/core/src/core/atom.ts:76](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L76)

Base atom interface for other userspace implementations. This is the core
interface that all atom-like objects implement, providing the foundation for
Reatom's reactivity system.

#### Parameters

##### params

...`Params`

Parameters to pass to the atom

#### Returns

`Payload`

The atom's payload (typically its current state)

#### Properties

##### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#atommeta)

Defined in: [packages/core/src/core/atom.ts:101](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L101)

Reference to the atom's internal metadata.

##### actions

> **actions**: [`Actions`](#actions-26)\<[`AtomLike`](#atomlike)\<`State`, `Params`, `Payload`\>\>

Defined in: [packages/core/src/core/atom.ts:81](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L81)

Bind methods to the atom to extend its functionality.

##### extend

> **extend**: [`Extend`](#extend-10)\<[`AtomLike`](#atomlike)\<`State`, `Params`, `Payload`\>\>

Defined in: [packages/core/src/core/atom.ts:87](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L87)

Extension system to add capabilities to atoms. Allows adding middleware,
methods, or other functionality to modify atom behavior.

##### set

> **set**: `unknown`

Defined in: [packages/core/src/core/atom.ts:78](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L78)

##### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#unsubscribe-2)

Defined in: [packages/core/src/core/atom.ts:98](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L98)

Subscribe to state changes, with the first call happening immediately. When
a subscriber is added, the callback is immediately invoked with the current
state. After that, it's called whenever the atom's state changes.

###### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it
  changes

###### Returns

[`Unsubscribe`](#unsubscribe-2)

An unsubscribe function that removes the subscription when called

***

### AtomMeta

Defined in: [packages/core/src/core/atom.ts:20](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L20)

Metadata associated with an atom instance that controls its behavior and
lifecycle. This interface is used internally by the Reatom framework and
should not be accessed directly in application code.

#### Properties

##### initState

> `readonly` **initState**: `any`

Defined in: [packages/core/src/core/atom.ts:28](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L28)

The initial state of the atom.

##### middlewares

> `readonly` **middlewares**: (`next`, ...`params`) => `any`[]

Defined in: [packages/core/src/core/atom.ts:34](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L34)

Array of middleware functions that intercept and potentially transform atom
operations.

###### Parameters

###### next

[`Fn`](#fn)

###### params

...`any`[]

###### Returns

`any`

##### onConnect

> **onConnect**: `undefined` \| [`Action`](#action)\<`any`[], `any`\> & [`AbortExt`](#abortext)

Defined in: [packages/core/src/core/atom.ts:54](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L54)

Function called when the atom gains its first subscriber. `onConnect.abort`
called when the atom loses its last subscriber.

##### reactive

> `readonly` **reactive**: `boolean`

Defined in: [packages/core/src/core/atom.ts:25](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L25)

Indicates whether the atom is reactive. Set to false for actions or the
context atom.

***

### BaseFormOptions

Defined in: [packages/core/src/form/reatomForm.ts:164](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomForm.ts#L164)

#### Extended by

- [`FormOptionsWithSchema`](#formoptionswithschema)
- [`FormOptionsWithoutSchema`](#formoptionswithoutschema)

#### Properties

##### keepErrorDuringValidating?

> `optional` **keepErrorDuringValidating**: `boolean`

Defined in: [packages/core/src/form/reatomForm.ts:176](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomForm.ts#L176)

Defines the default reset behavior of the validation state during async
validation for all fields.

###### Default

```ts
false
```

##### keepErrorOnChange?

> `optional` **keepErrorOnChange**: `boolean`

Defined in: [packages/core/src/form/reatomForm.ts:185](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomForm.ts#L185)

Defines the default reset behavior of the validation state on field change
for all fields. Useful if the validation is triggered on blur or submit
only.

###### Default

```ts
!validateOnChange
```

##### name?

> `optional` **name**: `string`

Defined in: [packages/core/src/form/reatomForm.ts:165](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomForm.ts#L165)

##### resetOnSubmit?

> `optional` **resetOnSubmit**: `boolean`

Defined in: [packages/core/src/form/reatomForm.ts:168](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomForm.ts#L168)

Should reset the state after success submit?

###### Default

```ts
true
```

##### validateOnBlur?

> `optional` **validateOnBlur**: `boolean`

Defined in: [packages/core/src/form/reatomForm.ts:201](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomForm.ts#L201)

Defines if the validation should be triggered on the field blur by default
for all fields.

###### Default

```ts
false
```

##### validateOnChange?

> `optional` **validateOnChange**: `boolean`

Defined in: [packages/core/src/form/reatomForm.ts:193](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomForm.ts#L193)

Defines if the validation should be triggered with every field change by
default for all fields.

###### Default

```ts
false
```

***

### BooleanAtom()

Defined in: [packages/core/src/primitives/reatomBoolean.ts:4](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomBoolean.ts#L4)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Extends

- [`Atom`](#atom)\<`boolean`\>

> **BooleanAtom**(...`params`): `boolean`

Defined in: [packages/core/src/primitives/reatomBoolean.ts:4](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomBoolean.ts#L4)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Parameters

##### params

...\[\]

Parameters to pass to the atom

#### Returns

`boolean`

The atom's payload (typically its current state)

#### Properties

##### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#atommeta)

Defined in: [packages/core/src/core/atom.ts:101](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L101)

Reference to the atom's internal metadata.

###### Inherited from

[`Atom`](#atom).[`__reatom`](#__reatom-3)

##### actions

> **actions**: [`Actions`](#actions-26)\<[`BooleanAtom`](#booleanatom)\>

Defined in: [packages/core/src/core/atom.ts:81](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L81)

Bind methods to the atom to extend its functionality.

###### Inherited from

[`Atom`](#atom).[`actions`](#actions-3)

##### extend

> **extend**: [`Extend`](#extend-10)\<[`BooleanAtom`](#booleanatom)\>

Defined in: [packages/core/src/core/atom.ts:87](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L87)

Extension system to add capabilities to atoms. Allows adding middleware,
methods, or other functionality to modify atom behavior.

###### Inherited from

[`Atom`](#atom).[`extend`](#extend-3)

##### reset

> **reset**: [`Action`](#action)\<\[\], `boolean`\>

Defined in: [packages/core/src/primitives/reatomBoolean.ts:8](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomBoolean.ts#L8)

##### setFalse

> **setFalse**: [`Action`](#action)\<\[\], `false`\>

Defined in: [packages/core/src/primitives/reatomBoolean.ts:7](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomBoolean.ts#L7)

##### setTrue

> **setTrue**: [`Action`](#action)\<\[\], `true`\>

Defined in: [packages/core/src/primitives/reatomBoolean.ts:6](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomBoolean.ts#L6)

##### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#unsubscribe-2)

Defined in: [packages/core/src/core/atom.ts:98](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L98)

Subscribe to state changes, with the first call happening immediately. When
a subscriber is added, the callback is immediately invoked with the current
state. After that, it's called whenever the atom's state changes.

###### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it
  changes

###### Returns

[`Unsubscribe`](#unsubscribe-2)

An unsubscribe function that removes the subscription when called

###### Inherited from

[`Atom`](#atom).[`subscribe`](#subscribe-3)

##### toggle

> **toggle**: [`Action`](#action)\<\[\], `boolean`\>

Defined in: [packages/core/src/primitives/reatomBoolean.ts:5](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomBoolean.ts#L5)

#### Methods

##### set()

###### Call Signature

> **set**(`update`): `boolean`

Defined in: [packages/core/src/core/atom.ts:122](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L122)

Update the atom's state using a function that receives the previous state

###### Parameters

###### update

(`state`) => `boolean`

Function that takes the current state and returns a new
  state

###### Returns

`boolean`

The new state value

###### Inherited from

[`Atom`](#atom).[`set`](#set-9)

###### Call Signature

> **set**(...`params`): `boolean`

Defined in: [packages/core/src/core/atom.ts:130](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L130)

Set the atom's state to a new value

###### Parameters

###### params

...\[`boolean`\]

###### Returns

`boolean`

The new state value

###### Inherited from

[`Atom`](#atom).[`set`](#set-9)

***

### CacheAtom()\<Payload, Params\>

Defined in: packages/core/src/async/withCache.ts:18

Base atom interface for other userspace implementations. This is the core
interface that all atom-like objects implement, providing the foundation for
Reatom's reactivity system.

#### Extends

- [`MapAtom`](#mapatom)\<`unknown`, [`CacheRecord`](#cacherecord)\<`Payload`, `Params`\>\>

#### Type Parameters

##### Payload

`Payload` = `any`

The type of state stored in the atom

##### Params

`Params` *extends* `any`[] = `any`[]

> **CacheAtom**(...`params`): `Map`

Defined in: packages/core/src/async/withCache.ts:18

Base atom interface for other userspace implementations. This is the core
interface that all atom-like objects implement, providing the foundation for
Reatom's reactivity system.

#### Parameters

##### params

...\[\]

Parameters to pass to the atom

#### Returns

`Map`

The atom's payload (typically its current state)

#### Properties

##### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#atommeta)

Defined in: [packages/core/src/core/atom.ts:101](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L101)

Reference to the atom's internal metadata.

###### Inherited from

[`MapAtom`](#mapatom).[`__reatom`](#__reatom-16)

##### actions

> **actions**: [`Actions`](#actions-26)\<[`CacheAtom`](#cacheatom)\<`Payload`, `Params`\>\>

Defined in: [packages/core/src/core/atom.ts:81](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L81)

Bind methods to the atom to extend its functionality.

###### Inherited from

[`MapAtom`](#mapatom).[`actions`](#actions-16)

##### clear

> **clear**: [`Action`](#action)\<\[\], `Map`\<`unknown`, [`CacheRecord`](#cacherecord)\<`Payload`, `Params`\>\>\>

Defined in: [packages/core/src/primitives/reatomMap.ts:35](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomMap.ts#L35)

###### Inherited from

[`MapAtom`](#mapatom).[`clear`](#clear-2)

##### delete

> **delete**: [`Action`](#action)\<\[`unknown`\], `Map`\<`unknown`, [`CacheRecord`](#cacherecord)\<`Payload`, `Params`\>\>\>

Defined in: [packages/core/src/primitives/reatomMap.ts:34](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomMap.ts#L34)

###### Inherited from

[`MapAtom`](#mapatom).[`delete`](#delete-1)

##### deleteWithParams

> **deleteWithParams**: [`Action`](#action)\<\[`Params`\]\>

Defined in: packages/core/src/async/withCache.ts:23

##### extend

> **extend**: [`Extend`](#extend-10)\<[`CacheAtom`](#cacheatom)\<`Payload`, `Params`\>\>

Defined in: [packages/core/src/core/atom.ts:87](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L87)

Extension system to add capabilities to atoms. Allows adding middleware,
methods, or other functionality to modify atom behavior.

###### Inherited from

[`MapAtom`](#mapatom).[`extend`](#extend-28)

##### getOrCreate()

> **getOrCreate**: (`key`, `creator`) => [`CacheRecord`](#cacherecord)

Defined in: [packages/core/src/primitives/reatomMap.ts:31](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomMap.ts#L31)

###### Parameters

###### key

`unknown`

###### creator

() => [`CacheRecord`](#cacherecord)

###### Returns

[`CacheRecord`](#cacherecord)

###### Inherited from

[`MapAtom`](#mapatom).[`getOrCreate`](#getorcreate-1)

##### invalidate

> **invalidate**: [`Action`](#action)\<\[\], `null` \| `Promise`\<`Payload`\>\>

Defined in: packages/core/src/async/withCache.ts:21

Clear all records and call the effect with the last params.

##### options

> **options**: [`WithCacheOptions`](#withcacheoptions)\<`Params`\>

Defined in: packages/core/src/async/withCache.ts:24

##### reset

> **reset**: [`Action`](#action)\<\[\], `Map`\<`unknown`, [`CacheRecord`](#cacherecord)\<`Payload`, `Params`\>\>\>

Defined in: [packages/core/src/primitives/reatomMap.ts:36](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomMap.ts#L36)

###### Inherited from

[`MapAtom`](#mapatom).[`reset`](#reset-5)

##### set

> **set**: [`Action`](#action)\<\[`unknown`, [`CacheRecord`](#cacherecord)\<`Payload`, `Params`\>\], `Map`\<`unknown`, [`CacheRecord`](#cacherecord)\<`Payload`, `Params`\>\>\>

Defined in: [packages/core/src/primitives/reatomMap.ts:33](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomMap.ts#L33)

###### Inherited from

[`MapAtom`](#mapatom).[`set`](#set-34)

##### setWithParams

> **setWithParams**: [`Action`](#action)\<\[`Params`, `Payload`\]\>

Defined in: packages/core/src/async/withCache.ts:22

##### size

> **size**: [`Computed`](#computed)\<`number`\>

Defined in: [packages/core/src/primitives/reatomMap.ts:38](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomMap.ts#L38)

###### Inherited from

[`MapAtom`](#mapatom).[`size`](#size-3)

##### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#unsubscribe-2)

Defined in: [packages/core/src/core/atom.ts:98](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L98)

Subscribe to state changes, with the first call happening immediately. When
a subscriber is added, the callback is immediately invoked with the current
state. After that, it's called whenever the atom's state changes.

###### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it
  changes

###### Returns

[`Unsubscribe`](#unsubscribe-2)

An unsubscribe function that removes the subscription when called

###### Inherited from

[`MapAtom`](#mapatom).[`subscribe`](#subscribe-16)

#### Methods

##### setState()

###### Call Signature

> **setState**(`update`): `Map`\<`unknown`, [`CacheRecord`](#cacherecord)\<`Payload`, `Params`\>\>

Defined in: [packages/core/src/primitives/reatomMap.ts:19](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomMap.ts#L19)

Update the atom's state using a function that receives the previous state

###### Parameters

###### update

(`state`) => `StateInit`\<`unknown`, [`CacheRecord`](#cacherecord)\<`Payload`, `Params`\>\>

Function that takes the current state and returns a new
  state

###### Returns

`Map`\<`unknown`, [`CacheRecord`](#cacherecord)\<`Payload`, `Params`\>\>

The new state value

###### Inherited from

[`MapAtom`](#mapatom).[`setState`](#setstate-3)

###### Call Signature

> **setState**(`newState`): `Map`\<`unknown`, [`CacheRecord`](#cacherecord)\<`Payload`, `Params`\>\>

Defined in: [packages/core/src/primitives/reatomMap.ts:29](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomMap.ts#L29)

Set the atom's state to a new value

###### Parameters

###### newState

`StateInit`\<`unknown`, [`CacheRecord`](#cacherecord)\<`Payload`, `Params`\>\>

The new state value

###### Returns

`Map`\<`unknown`, [`CacheRecord`](#cacherecord)\<`Payload`, `Params`\>\>

The new state value

###### Inherited from

[`MapAtom`](#mapatom).[`setState`](#setstate-3)

***

### CacheExt\<Params, Payload\>

Defined in: packages/core/src/async/withCache.ts:105

#### Type Parameters

##### Params

`Params` *extends* `any`[] = `any`[]

##### Payload

`Payload` = `any`

#### Properties

##### cacheAtom

> **cacheAtom**: [`CacheAtom`](#cacheatom)\<`Payload`, `Params`\>

Defined in: packages/core/src/async/withCache.ts:106

##### swrPendingAtom

> **swrPendingAtom**: [`Atom`](#atom)\<`number`\>

Defined in: packages/core/src/async/withCache.ts:107

***

### CacheRecord\<Payload, Params\>

Defined in: packages/core/src/async/withCache.ts:9

#### Type Parameters

##### Payload

`Payload` = `any`

##### Params

`Params` *extends* `any`[] = `any`[]

#### Properties

##### lastRequest

> **lastRequest**: `number`

Defined in: packages/core/src/async/withCache.ts:13

##### params

> **params**: `Params`

Defined in: packages/core/src/async/withCache.ts:10

##### promise?

> `optional` **promise**: `Promise`\<`Payload`\>

Defined in: packages/core/src/async/withCache.ts:11

##### timeoutId?

> `optional` **timeoutId**: `Timeout`

Defined in: packages/core/src/async/withCache.ts:15

##### value?

> `optional` **value**: `Payload`

Defined in: packages/core/src/async/withCache.ts:12

##### version

> **version**: `number`

Defined in: packages/core/src/async/withCache.ts:14

***

### Computed()\<State\>

Defined in: [packages/core/src/core/atom.ts:142](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L142)

Derived state container.

A computed atom automatically tracks dependencies and recalculates only when
those dependencies change. The calculation is performed lazily, only when the
computed value is read AND subscribed to.

#### Extends

- [`AtomLike`](#atomlike)\<`State`, \[\]\>

#### Extended by

- [`Effect`](#effect)
- [`LinkedListDerivedAtom`](#linkedlistderivedatom)
- [`RouteLoader`](#routeloader)
- [`RouteAtom`](#routeatom)
- [`SearchParamsAtom`](#searchparamsatom)

#### Type Parameters

##### State

`State` = `any`

The type of derived state

> **Computed**(...`params`): `State`

Defined in: [packages/core/src/core/atom.ts:142](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L142)

Derived state container.

A computed atom automatically tracks dependencies and recalculates only when
those dependencies change. The calculation is performed lazily, only when the
computed value is read AND subscribed to.

#### Parameters

##### params

...\[\]

Parameters to pass to the atom

#### Returns

`State`

The atom's payload (typically its current state)

#### Properties

##### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#atommeta)

Defined in: [packages/core/src/core/atom.ts:101](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L101)

Reference to the atom's internal metadata.

###### Inherited from

[`AtomLike`](#atomlike).[`__reatom`](#__reatom-4)

##### actions

> **actions**: [`Actions`](#actions-26)\<[`Computed`](#computed)\<`State`\>\>

Defined in: [packages/core/src/core/atom.ts:81](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L81)

Bind methods to the atom to extend its functionality.

###### Inherited from

[`AtomLike`](#atomlike).[`actions`](#actions-4)

##### extend

> **extend**: [`Extend`](#extend-10)\<[`Computed`](#computed)\<`State`\>\>

Defined in: [packages/core/src/core/atom.ts:87](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L87)

Extension system to add capabilities to atoms. Allows adding middleware,
methods, or other functionality to modify atom behavior.

###### Inherited from

[`AtomLike`](#atomlike).[`extend`](#extend-4)

##### set

> **set**: `unknown`

Defined in: [packages/core/src/core/atom.ts:78](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L78)

###### Inherited from

[`AtomLike`](#atomlike).[`set`](#set-12)

##### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#unsubscribe-2)

Defined in: [packages/core/src/core/atom.ts:98](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L98)

Subscribe to state changes, with the first call happening immediately. When
a subscriber is added, the callback is immediately invoked with the current
state. After that, it's called whenever the atom's state changes.

###### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it
  changes

###### Returns

[`Unsubscribe`](#unsubscribe-2)

An unsubscribe function that removes the subscription when called

###### Inherited from

[`AtomLike`](#atomlike).[`subscribe`](#subscribe-4)

***

### ContextAtom()

Defined in: [packages/core/src/core/atom.ts:295](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L295)

Atom interface for the context atom. Provides methods to start new isolated
contexts.

#### Extends

- [`AtomLike`](#atomlike)\<[`RootState`](#rootstate), \[\], [`RootFrame`](#rootframe)\>

> **ContextAtom**(...`params`): [`RootFrame`](#rootframe)

Defined in: [packages/core/src/core/atom.ts:295](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L295)

Atom interface for the context atom. Provides methods to start new isolated
contexts.

#### Parameters

##### params

...\[\]

Parameters to pass to the atom

#### Returns

[`RootFrame`](#rootframe)

The atom's payload (typically its current state)

#### Properties

##### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#atommeta)

Defined in: [packages/core/src/core/atom.ts:101](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L101)

Reference to the atom's internal metadata.

###### Inherited from

[`AtomLike`](#atomlike).[`__reatom`](#__reatom-4)

##### actions

> **actions**: [`Actions`](#actions-26)\<[`ContextAtom`](#contextatom)\>

Defined in: [packages/core/src/core/atom.ts:81](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L81)

Bind methods to the atom to extend its functionality.

###### Inherited from

[`AtomLike`](#atomlike).[`actions`](#actions-4)

##### extend

> **extend**: [`Extend`](#extend-10)\<[`ContextAtom`](#contextatom)\>

Defined in: [packages/core/src/core/atom.ts:87](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L87)

Extension system to add capabilities to atoms. Allows adding middleware,
methods, or other functionality to modify atom behavior.

###### Inherited from

[`AtomLike`](#atomlike).[`extend`](#extend-4)

##### set

> **set**: `unknown`

Defined in: [packages/core/src/core/atom.ts:78](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L78)

###### Inherited from

[`AtomLike`](#atomlike).[`set`](#set-12)

##### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#unsubscribe-2)

Defined in: [packages/core/src/core/atom.ts:98](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L98)

Subscribe to state changes, with the first call happening immediately. When
a subscriber is added, the callback is immediately invoked with the current
state. After that, it's called whenever the atom's state changes.

###### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it
  changes

###### Returns

[`Unsubscribe`](#unsubscribe-2)

An unsubscribe function that removes the subscription when called

###### Inherited from

[`AtomLike`](#atomlike).[`subscribe`](#subscribe-4)

#### Methods

##### start()

###### Call Signature

> **start**\<`T`\>(`cb`): `T`

Defined in: [packages/core/src/core/atom.ts:302](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L302)

Start a new isolated context and run a callback within it.

###### Type Parameters

###### T

`T`

###### Parameters

###### cb

() => `T`

Function to execute in the new context

###### Returns

`T`

The result of the callback

###### Call Signature

> **start**(): [`RootFrame`](#rootframe)

Defined in: [packages/core/src/core/atom.ts:309](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L309)

Start a new isolated context.

###### Returns

[`RootFrame`](#rootframe)

The new context frame

***

### CookieAttributes

Defined in: [packages/core/src/persist/web-storage/cookie.ts:24](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/web-storage/cookie.ts#L24)

Configuration options for HTTP cookies following standard cookie attributes.

#### See

https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie

#### Properties

##### domain?

> `optional` **domain**: `string`

Defined in: [packages/core/src/persist/web-storage/cookie.ts:32](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/web-storage/cookie.ts#L32)

Domain where the cookie is valid. Defaults to current domain

##### expires?

> `optional` **expires**: `Date`

Defined in: [packages/core/src/persist/web-storage/cookie.ts:28](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/web-storage/cookie.ts#L28)

Expiration date of the cookie. Ignored if `maxAge` is provided

##### maxAge?

> `optional` **maxAge**: `number`

Defined in: [packages/core/src/persist/web-storage/cookie.ts:26](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/web-storage/cookie.ts#L26)

Maximum age of the cookie in seconds. Takes precedence over `expires`

##### path?

> `optional` **path**: `string`

Defined in: [packages/core/src/persist/web-storage/cookie.ts:30](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/web-storage/cookie.ts#L30)

Path where the cookie is valid. Defaults to current path

##### sameSite?

> `optional` **sameSite**: `"strict"` \| `"lax"` \| `"none"`

Defined in: [packages/core/src/persist/web-storage/cookie.ts:36](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/web-storage/cookie.ts#L36)

Controls when the cookie is sent with cross-site requests

##### secure?

> `optional` **secure**: `boolean`

Defined in: [packages/core/src/persist/web-storage/cookie.ts:34](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/web-storage/cookie.ts#L34)

Whether the cookie should only be sent over HTTPS

***

### Effect()\<State\>

Defined in: [packages/core/src/methods/effect.ts:10](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/effect.ts#L10)

Derived state container.

A computed atom automatically tracks dependencies and recalculates only when
those dependencies change. The calculation is performed lazily, only when the
computed value is read AND subscribed to.

#### Extends

- [`Computed`](#computed)\<`State`\>

#### Type Parameters

##### State

`State`

The type of derived state

> **Effect**(...`params`): `State`

Defined in: [packages/core/src/methods/effect.ts:10](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/effect.ts#L10)

Derived state container.

A computed atom automatically tracks dependencies and recalculates only when
those dependencies change. The calculation is performed lazily, only when the
computed value is read AND subscribed to.

#### Parameters

##### params

...\[\]

Parameters to pass to the atom

#### Returns

`State`

The atom's payload (typically its current state)

#### Properties

##### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#atommeta)

Defined in: [packages/core/src/core/atom.ts:101](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L101)

Reference to the atom's internal metadata.

###### Inherited from

[`Computed`](#computed).[`__reatom`](#__reatom-7)

##### actions

> **actions**: [`Actions`](#actions-26)\<[`Effect`](#effect)\<`State`\>\>

Defined in: [packages/core/src/core/atom.ts:81](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L81)

Bind methods to the atom to extend its functionality.

###### Inherited from

[`Computed`](#computed).[`actions`](#actions-7)

##### extend

> **extend**: [`Extend`](#extend-10)\<[`Effect`](#effect)\<`State`\>\>

Defined in: [packages/core/src/core/atom.ts:87](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L87)

Extension system to add capabilities to atoms. Allows adding middleware,
methods, or other functionality to modify atom behavior.

###### Inherited from

[`Computed`](#computed).[`extend`](#extend-7)

##### set

> **set**: `unknown`

Defined in: [packages/core/src/core/atom.ts:78](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L78)

###### Inherited from

[`Computed`](#computed).[`set`](#set-17)

##### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#unsubscribe-2)

Defined in: [packages/core/src/core/atom.ts:98](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L98)

Subscribe to state changes, with the first call happening immediately. When
a subscriber is added, the callback is immediately invoked with the current
state. After that, it's called whenever the atom's state changes.

###### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it
  changes

###### Returns

[`Unsubscribe`](#unsubscribe-2)

An unsubscribe function that removes the subscription when called

###### Inherited from

[`Computed`](#computed).[`subscribe`](#subscribe-7)

##### unsubscribe

> **unsubscribe**: [`Unsubscribe`](#unsubscribe-2)

Defined in: [packages/core/src/methods/effect.ts:11](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/effect.ts#L11)

***

### Ext()\<Target, Extension\>

Defined in: [packages/core/src/core/extend.ts:16](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/extend.ts#L16)

Extension function interface for modifying atoms and actions.

Extensions are functions that take an atom/action as input and return either
the same atom/action with modified behavior or an object with additional
properties to be assigned to the atom/action.

#### Type Parameters

##### Target

`Target` *extends* [`AtomLike`](#atomlike) = [`AtomLike`](#atomlike)

The type of atom or action the extension can be applied to

##### Extension

`Extension` = `Target`

The type that will be returned after applying the
  extension

> **Ext**(`target`): `Extension`

Defined in: [packages/core/src/core/extend.ts:17](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/extend.ts#L17)

Extension function interface for modifying atoms and actions.

Extensions are functions that take an atom/action as input and return either
the same atom/action with modified behavior or an object with additional
properties to be assigned to the atom/action.

#### Parameters

##### target

`Target`

#### Returns

`Extension`

***

### Extend()\<This\>

Defined in: [packages/core/src/core/extend.ts:74](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/extend.ts#L74)

Method signature for the extend functionality on atoms and actions.

This interface defines the overload signatures for the extend method,
supporting different numbers of extensions with proper type inference.

#### Type Parameters

##### This

`This` *extends* [`AtomLike`](#atomlike)

The atom or action type being extended

#### Call Signature

> **Extend**\<`T1`\>(`extension1`): `T1` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1`

Defined in: [packages/core/src/core/extend.ts:75](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/extend.ts#L75)

Method signature for the extend functionality on atoms and actions.

This interface defines the overload signatures for the extend method,
supporting different numbers of extensions with proper type inference.

##### Type Parameters

###### T1

`T1`

##### Parameters

###### extension1

[`Ext`](#ext)\<`This`, `T1`\>

##### Returns

`T1` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1`

#### Call Signature

> **Extend**\<`T1`, `T2`\>(`extension1`, `extension2`): `T2` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2`

Defined in: [packages/core/src/core/extend.ts:76](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/extend.ts#L76)

Method signature for the extend functionality on atoms and actions.

This interface defines the overload signatures for the extend method,
supporting different numbers of extensions with proper type inference.

##### Type Parameters

###### T1

`T1`

###### T2

`T2`

##### Parameters

###### extension1

[`Ext`](#ext)\<`This`, `T1`\>

###### extension2

[`Ext`](#ext)\<`T1` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1`, `T2`\>

##### Returns

`T2` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2`

#### Call Signature

> **Extend**\<`T1`, `T2`, `T3`\>(`extension1`, `extension2`, `extension3`): `T3` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2` & `T3`

Defined in: [packages/core/src/core/extend.ts:77](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/extend.ts#L77)

Method signature for the extend functionality on atoms and actions.

This interface defines the overload signatures for the extend method,
supporting different numbers of extensions with proper type inference.

##### Type Parameters

###### T1

`T1`

###### T2

`T2`

###### T3

`T3`

##### Parameters

###### extension1

[`Ext`](#ext)\<`This`, `T1`\>

###### extension2

[`Ext`](#ext)\<`T1` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1`, `T2`\>

###### extension3

[`Ext`](#ext)\<`T2` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2`, `T3`\>

##### Returns

`T3` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2` & `T3`

#### Call Signature

> **Extend**\<`T1`, `T2`, `T3`, `T4`\>(`extension1`, `extension2`, `extension3`, `extension4`): `T4` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2` & `T3` & `T4`

Defined in: [packages/core/src/core/extend.ts:78](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/extend.ts#L78)

Method signature for the extend functionality on atoms and actions.

This interface defines the overload signatures for the extend method,
supporting different numbers of extensions with proper type inference.

##### Type Parameters

###### T1

`T1`

###### T2

`T2`

###### T3

`T3`

###### T4

`T4`

##### Parameters

###### extension1

[`Ext`](#ext)\<`This`, `T1`\>

###### extension2

[`Ext`](#ext)\<`T1` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1`, `T2`\>

###### extension3

[`Ext`](#ext)\<`T2` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2`, `T3`\>

###### extension4

[`Ext`](#ext)\<`T3` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2` & `T3`, `T4`\>

##### Returns

`T4` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2` & `T3` & `T4`

#### Call Signature

> **Extend**\<`T1`, `T2`, `T3`, `T4`, `T5`\>(`extension1`, `extension2`, `extension3`, `extension4`, `extension5`): `T5` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T5`\<`T5`\> : `T4` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#atomlike)\<`any`, ...[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2` & `T3` & `T4` & `T5`

Defined in: [packages/core/src/core/extend.ts:79](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/extend.ts#L79)

Method signature for the extend functionality on atoms and actions.

This interface defines the overload signatures for the extend method,
supporting different numbers of extensions with proper type inference.

##### Type Parameters

###### T1

`T1`

###### T2

`T2`

###### T3

`T3`

###### T4

`T4`

###### T5

`T5`

##### Parameters

###### extension1

[`Ext`](#ext)\<`This`, `T1`\>

###### extension2

[`Ext`](#ext)\<`T1` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1`, `T2`\>

###### extension3

[`Ext`](#ext)\<`T2` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2`, `T3`\>

###### extension4

[`Ext`](#ext)\<`T3` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2` & `T3`, `T4`\>

###### extension5

[`Ext`](#ext)\<`T4` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2` & `T3` & `T4`, `T5`\>

##### Returns

`T5` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T5`\<`T5`\> : `T4` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#atomlike)\<`any`, ...[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2` & `T3` & `T4` & `T5`

#### Call Signature

> **Extend**\<`T1`, `T2`, `T3`, `T4`, `T5`, `T6`\>(`extension1`, `extension2`, `extension3`, `extension4`, `extension5`, `extension6`): `T6` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T6`\<`T6`\> : `T5` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T5`\<`T5`\> : `T4` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#atomlike)\<`any`, ...[], `any`\> ? `T2`\<`T2`\> : ... *extends* ... ? ... : ... & `T2` & `T3` & `T4` & `T5` & `T6`

Defined in: [packages/core/src/core/extend.ts:80](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/extend.ts#L80)

Method signature for the extend functionality on atoms and actions.

This interface defines the overload signatures for the extend method,
supporting different numbers of extensions with proper type inference.

##### Type Parameters

###### T1

`T1`

###### T2

`T2`

###### T3

`T3`

###### T4

`T4`

###### T5

`T5`

###### T6

`T6`

##### Parameters

###### extension1

[`Ext`](#ext)\<`This`, `T1`\>

###### extension2

[`Ext`](#ext)\<`T1` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1`, `T2`\>

###### extension3

[`Ext`](#ext)\<`T2` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2`, `T3`\>

###### extension4

[`Ext`](#ext)\<`T3` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2` & `T3`, `T4`\>

###### extension5

[`Ext`](#ext)\<`T4` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2` & `T3` & `T4`, `T5`\>

###### extension6

[`Ext`](#ext)\<`T5` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T5`\<`T5`\> : `T4` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#atomlike)\<..., ..., ...\> ? `T1`\<...\> : ... & ... & `T2` & `T3` & `T4` & `T5`, `T6`\>

##### Returns

`T6` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T6`\<`T6`\> : `T5` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T5`\<`T5`\> : `T4` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#atomlike)\<`any`, ...[], `any`\> ? `T2`\<`T2`\> : ... *extends* ... ? ... : ... & `T2` & `T3` & `T4` & `T5` & `T6`

#### Call Signature

> **Extend**\<`T1`, `T2`, `T3`, `T4`, `T5`, `T6`, `T7`\>(`extension1`, `extension2`, `extension3`, `extension4`, `extension5`, `extension6`, `extension7`): `T7` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T7`\<`T7`\> : `T6` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T6`\<`T6`\> : `T5` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T5`\<`T5`\> : `T4` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#atomlike)\<`any`, ...[], `any`\> ? `T3`\<`T3`\> : ... *extends* ... ? ... : ... & `T3` & `T4` & `T5` & `T6` & `T7`

Defined in: [packages/core/src/core/extend.ts:81](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/extend.ts#L81)

Method signature for the extend functionality on atoms and actions.

This interface defines the overload signatures for the extend method,
supporting different numbers of extensions with proper type inference.

##### Type Parameters

###### T1

`T1`

###### T2

`T2`

###### T3

`T3`

###### T4

`T4`

###### T5

`T5`

###### T6

`T6`

###### T7

`T7`

##### Parameters

###### extension1

[`Ext`](#ext)\<`This`, `T1`\>

###### extension2

[`Ext`](#ext)\<`T1` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1`, `T2`\>

###### extension3

[`Ext`](#ext)\<`T2` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2`, `T3`\>

###### extension4

[`Ext`](#ext)\<`T3` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2` & `T3`, `T4`\>

###### extension5

[`Ext`](#ext)\<`T4` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2` & `T3` & `T4`, `T5`\>

###### extension6

[`Ext`](#ext)\<`T5` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T5`\<`T5`\> : `T4` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#atomlike)\<..., ..., ...\> ? `T1`\<...\> : ... & ... & `T2` & `T3` & `T4` & `T5`, `T6`\>

###### extension7

[`Ext`](#ext)\<`T6` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T6`\<`T6`\> : `T5` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T5`\<`T5`\> : `T4` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#atomlike)\<..., ..., ...\> ? `T2`\<...\> : ... & ... & `T3` & `T4` & `T5` & `T6`, `T7`\>

##### Returns

`T7` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T7`\<`T7`\> : `T6` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T6`\<`T6`\> : `T5` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T5`\<`T5`\> : `T4` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#atomlike)\<`any`, ...[], `any`\> ? `T3`\<`T3`\> : ... *extends* ... ? ... : ... & `T3` & `T4` & `T5` & `T6` & `T7`

#### Call Signature

> **Extend**\<`T1`, `T2`, `T3`, `T4`, `T5`, `T6`, `T7`, `T8`\>(`extension1`, `extension2`, `extension3`, `extension4`, `extension5`, `extension6`, `extension7`, `extension8`): `T8` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T8`\<`T8`\> : `T7` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T7`\<`T7`\> : `T6` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T6`\<`T6`\> : `T5` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T5`\<`T5`\> : `T4` *extends* [`AtomLike`](#atomlike)\<`any`, ...[], `any`\> ? `T4`\<`T4`\> : ... *extends* ... ? ... : ... & `T4` & `T5` & `T6` & `T7` & `T8`

Defined in: [packages/core/src/core/extend.ts:82](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/extend.ts#L82)

Method signature for the extend functionality on atoms and actions.

This interface defines the overload signatures for the extend method,
supporting different numbers of extensions with proper type inference.

##### Type Parameters

###### T1

`T1`

###### T2

`T2`

###### T3

`T3`

###### T4

`T4`

###### T5

`T5`

###### T6

`T6`

###### T7

`T7`

###### T8

`T8`

##### Parameters

###### extension1

[`Ext`](#ext)\<`This`, `T1`\>

###### extension2

[`Ext`](#ext)\<`T1` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1`, `T2`\>

###### extension3

[`Ext`](#ext)\<`T2` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2`, `T3`\>

###### extension4

[`Ext`](#ext)\<`T3` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2` & `T3`, `T4`\>

###### extension5

[`Ext`](#ext)\<`T4` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2` & `T3` & `T4`, `T5`\>

###### extension6

[`Ext`](#ext)\<`T5` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T5`\<`T5`\> : `T4` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#atomlike)\<..., ..., ...\> ? `T1`\<...\> : ... & ... & `T2` & `T3` & `T4` & `T5`, `T6`\>

###### extension7

[`Ext`](#ext)\<`T6` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T6`\<`T6`\> : `T5` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T5`\<`T5`\> : `T4` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#atomlike)\<..., ..., ...\> ? `T2`\<...\> : ... & ... & `T3` & `T4` & `T5` & `T6`, `T7`\>

###### extension8

[`Ext`](#ext)\<`T7` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T7`\<`T7`\> : `T6` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T6`\<`T6`\> : `T5` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T5`\<`T5`\> : `T4` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#atomlike)\<..., ..., ...\> ? `T3`\<...\> : ... & ... & `T4` & `T5` & `T6` & `T7`, `T8`\>

##### Returns

`T8` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T8`\<`T8`\> : `T7` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T7`\<`T7`\> : `T6` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T6`\<`T6`\> : `T5` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T5`\<`T5`\> : `T4` *extends* [`AtomLike`](#atomlike)\<`any`, ...[], `any`\> ? `T4`\<`T4`\> : ... *extends* ... ? ... : ... & `T4` & `T5` & `T6` & `T7` & `T8`

#### Call Signature

> **Extend**\<`T1`, `T2`, `T3`, `T4`, `T5`, `T6`, `T7`, `T8`, `T9`\>(`extension1`, `extension2`, `extension3`, `extension4`, `extension5`, `extension6`, `extension7`, `extension8`, `extension9`): `T9` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T9`\<`T9`\> : `T8` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T8`\<`T8`\> : `T7` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T7`\<`T7`\> : `T6` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T6`\<`T6`\> : `T5` *extends* [`AtomLike`](#atomlike)\<`any`, ...[], `any`\> ? `T5`\<`T5`\> : ... *extends* ... ? ... : ... & `T5` & `T6` & `T7` & `T8` & `T9`

Defined in: [packages/core/src/core/extend.ts:83](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/extend.ts#L83)

Method signature for the extend functionality on atoms and actions.

This interface defines the overload signatures for the extend method,
supporting different numbers of extensions with proper type inference.

##### Type Parameters

###### T1

`T1`

###### T2

`T2`

###### T3

`T3`

###### T4

`T4`

###### T5

`T5`

###### T6

`T6`

###### T7

`T7`

###### T8

`T8`

###### T9

`T9`

##### Parameters

###### extension1

[`Ext`](#ext)\<`This`, `T1`\>

###### extension2

[`Ext`](#ext)\<`T1` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1`, `T2`\>

###### extension3

[`Ext`](#ext)\<`T2` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2`, `T3`\>

###### extension4

[`Ext`](#ext)\<`T3` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2` & `T3`, `T4`\>

###### extension5

[`Ext`](#ext)\<`T4` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2` & `T3` & `T4`, `T5`\>

###### extension6

[`Ext`](#ext)\<`T5` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T5`\<`T5`\> : `T4` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#atomlike)\<..., ..., ...\> ? `T1`\<...\> : ... & ... & `T2` & `T3` & `T4` & `T5`, `T6`\>

###### extension7

[`Ext`](#ext)\<`T6` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T6`\<`T6`\> : `T5` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T5`\<`T5`\> : `T4` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#atomlike)\<..., ..., ...\> ? `T2`\<...\> : ... & ... & `T3` & `T4` & `T5` & `T6`, `T7`\>

###### extension8

[`Ext`](#ext)\<`T7` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T7`\<`T7`\> : `T6` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T6`\<`T6`\> : `T5` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T5`\<`T5`\> : `T4` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#atomlike)\<..., ..., ...\> ? `T3`\<...\> : ... & ... & `T4` & `T5` & `T6` & `T7`, `T8`\>

###### extension9

[`Ext`](#ext)\<`T8` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T8`\<`T8`\> : `T7` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T7`\<`T7`\> : `T6` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T6`\<`T6`\> : `T5` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T5`\<`T5`\> : `T4` *extends* [`AtomLike`](#atomlike)\<..., ..., ...\> ? `T4`\<...\> : ... & ... & `T5` & `T6` & `T7` & `T8`, `T9`\>

##### Returns

`T9` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T9`\<`T9`\> : `T8` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T8`\<`T8`\> : `T7` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T7`\<`T7`\> : `T6` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T6`\<`T6`\> : `T5` *extends* [`AtomLike`](#atomlike)\<`any`, ...[], `any`\> ? `T5`\<`T5`\> : ... *extends* ... ? ... : ... & `T5` & `T6` & `T7` & `T8` & `T9`

#### Call Signature

> **Extend**\<`T1`, `T2`, `T3`, `T4`, `T5`, `T6`, `T7`, `T8`, `T9`, `T10`\>(`extension1`, `extension2`, `extension3`, `extension4`, `extension5`, `extension6`, `extension7`, `extension8`, `extension9`, `extension10`): `T10` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T10`\<`T10`\> : `T9` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T9`\<`T9`\> : `T8` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T8`\<`T8`\> : `T7` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T7`\<`T7`\> : `T6` *extends* [`AtomLike`](#atomlike)\<`any`, ...[], `any`\> ? `T6`\<`T6`\> : ... *extends* ... ? ... : ... & `T6` & `T7` & `T8` & `T9` & `T10`

Defined in: [packages/core/src/core/extend.ts:84](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/extend.ts#L84)

Method signature for the extend functionality on atoms and actions.

This interface defines the overload signatures for the extend method,
supporting different numbers of extensions with proper type inference.

##### Type Parameters

###### T1

`T1`

###### T2

`T2`

###### T3

`T3`

###### T4

`T4`

###### T5

`T5`

###### T6

`T6`

###### T7

`T7`

###### T8

`T8`

###### T9

`T9`

###### T10

`T10`

##### Parameters

###### extension1

[`Ext`](#ext)\<`This`, `T1`\>

###### extension2

[`Ext`](#ext)\<`T1` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1`, `T2`\>

###### extension3

[`Ext`](#ext)\<`T2` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2`, `T3`\>

###### extension4

[`Ext`](#ext)\<`T3` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2` & `T3`, `T4`\>

###### extension5

[`Ext`](#ext)\<`T4` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2` & `T3` & `T4`, `T5`\>

###### extension6

[`Ext`](#ext)\<`T5` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T5`\<`T5`\> : `T4` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#atomlike)\<..., ..., ...\> ? `T1`\<...\> : ... & ... & `T2` & `T3` & `T4` & `T5`, `T6`\>

###### extension7

[`Ext`](#ext)\<`T6` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T6`\<`T6`\> : `T5` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T5`\<`T5`\> : `T4` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#atomlike)\<..., ..., ...\> ? `T2`\<...\> : ... & ... & `T3` & `T4` & `T5` & `T6`, `T7`\>

###### extension8

[`Ext`](#ext)\<`T7` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T7`\<`T7`\> : `T6` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T6`\<`T6`\> : `T5` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T5`\<`T5`\> : `T4` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#atomlike)\<..., ..., ...\> ? `T3`\<...\> : ... & ... & `T4` & `T5` & `T6` & `T7`, `T8`\>

###### extension9

[`Ext`](#ext)\<`T8` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T8`\<`T8`\> : `T7` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T7`\<`T7`\> : `T6` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T6`\<`T6`\> : `T5` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T5`\<`T5`\> : `T4` *extends* [`AtomLike`](#atomlike)\<..., ..., ...\> ? `T4`\<...\> : ... & ... & `T5` & `T6` & `T7` & `T8`, `T9`\>

###### extension10

[`Ext`](#ext)\<`T9` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T9`\<`T9`\> : `T8` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T8`\<`T8`\> : `T7` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T7`\<`T7`\> : `T6` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T6`\<`T6`\> : `T5` *extends* [`AtomLike`](#atomlike)\<..., ..., ...\> ? `T5`\<...\> : ... & ... & `T6` & `T7` & `T8` & `T9`, `T10`\>

##### Returns

`T10` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T10`\<`T10`\> : `T9` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T9`\<`T9`\> : `T8` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T8`\<`T8`\> : `T7` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> ? `T7`\<`T7`\> : `T6` *extends* [`AtomLike`](#atomlike)\<`any`, ...[], `any`\> ? `T6`\<`T6`\> : ... *extends* ... ? ... : ... & `T6` & `T7` & `T8` & `T9` & `T10`

#### Call Signature

> **Extend**\<`T`\>(...`extensions`): `object` & [`AtomLike`](#atomlike)\<`unknown`, `unknown`[], `unknown`\>

Defined in: [packages/core/src/core/extend.ts:85](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/extend.ts#L85)

Method signature for the extend functionality on atoms and actions.

This interface defines the overload signatures for the extend method,
supporting different numbers of extensions with proper type inference.

##### Type Parameters

###### T

`T` *extends* [`Ext`](#ext)\<[`AtomLike`](#atomlike)\<`any`, `any`[], `any`\>, [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> \| [`Rec`](#rec)\>[]

##### Parameters

###### extensions

...`T`

##### Returns

`object` & [`AtomLike`](#atomlike)\<`unknown`, `unknown`[], `unknown`\>

***

### FetchRequestInit\<Result, Params\>

Defined in: [packages/core/src/web/fetch.ts:5](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/fetch.ts#L5)

#### Extends

- `RequestInit`

#### Type Parameters

##### Result

`Result` = `unknown`

##### Params

`Params` *extends* `any`[] = `any`[]

#### Properties

##### body?

> `optional` **body**: `null` \| `BodyInit`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.dom.d.ts:1922

A BodyInit object or null to set request's body.

###### Inherited from

`RequestInit.body`

##### cache?

> `optional` **cache**: `RequestCache`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.dom.d.ts:1924

A string indicating how the request will interact with the browser's cache to set request's cache.

###### Inherited from

`RequestInit.cache`

##### credentials?

> `optional` **credentials**: `RequestCredentials`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.dom.d.ts:1926

A string indicating whether credentials will be sent with the request always, never, or only when sent to a same-origin URL. Sets request's credentials.

###### Inherited from

`RequestInit.credentials`

##### getInit()?

> `optional` **getInit**: (...`params`) => `object`

Defined in: [packages/core/src/web/fetch.ts:12](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/fetch.ts#L12)

###### Parameters

###### params

...`Params`

###### Returns

`object`

###### body?

> `optional` **body**: `any`[] \| `Record`\<`string`, `any`\> \| `BodyInit`

###### searchParams?

> `optional` **searchParams**: `string` \| `string`[][] \| `Record`\<`string`, `string`\> \| `URLSearchParams`

##### getResult()?

> `optional` **getResult**: (`response`) => `Result` \| `Promise`\<`Result`\>

Defined in: [packages/core/src/web/fetch.ts:16](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/fetch.ts#L16)

###### Parameters

###### response

`Response`

###### Returns

`Result` \| `Promise`\<`Result`\>

##### headers?

> `optional` **headers**: `HeadersInit`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.dom.d.ts:1928

A Headers object, an object literal, or an array of two-item arrays to set request's headers.

###### Inherited from

`RequestInit.headers`

##### integrity?

> `optional` **integrity**: `string`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.dom.d.ts:1930

A cryptographic hash of the resource to be fetched by request. Sets request's integrity.

###### Inherited from

`RequestInit.integrity`

##### keepalive?

> `optional` **keepalive**: `boolean`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.dom.d.ts:1932

A boolean to set request's keepalive.

###### Inherited from

`RequestInit.keepalive`

##### method?

> `optional` **method**: `string`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.dom.d.ts:1934

A string to set request's method.

###### Inherited from

`RequestInit.method`

##### mode?

> `optional` **mode**: `RequestMode`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.dom.d.ts:1936

A string to indicate whether the request will use CORS, or will be restricted to same-origin URLs. Sets request's mode.

###### Inherited from

`RequestInit.mode`

##### origin?

> `optional` **origin**: `string`

Defined in: [packages/core/src/web/fetch.ts:10](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/fetch.ts#L10)

##### priority?

> `optional` **priority**: `RequestPriority`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.dom.d.ts:1937

###### Inherited from

`RequestInit.priority`

##### redirect?

> `optional` **redirect**: `RequestRedirect`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.dom.d.ts:1939

A string indicating whether request follows redirects, results in an error upon encountering a redirect, or returns the redirect (in an opaque fashion). Sets request's redirect.

###### Inherited from

`RequestInit.redirect`

##### referrer?

> `optional` **referrer**: `string`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.dom.d.ts:1941

A string whose value is a same-origin URL, "about:client", or the empty string, to set request's referrer.

###### Inherited from

`RequestInit.referrer`

##### referrerPolicy?

> `optional` **referrerPolicy**: `ReferrerPolicy`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.dom.d.ts:1943

A referrer policy to set request's referrerPolicy.

###### Inherited from

`RequestInit.referrerPolicy`

##### signal?

> `optional` **signal**: `null` \| `AbortSignal`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.dom.d.ts:1945

An AbortSignal to set request's signal.

###### Inherited from

`RequestInit.signal`

##### transport()?

> `optional` **transport**: \{(`input`, `init?`): `Promise`\<`Response`\>; (`input`, `init?`): `Promise`\<`Response`\>; \}

Defined in: [packages/core/src/web/fetch.ts:11](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/fetch.ts#L11)

###### Call Signature

> (`input`, `init?`): `Promise`\<`Response`\>

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/fetch)

###### Parameters

###### input

`URL` | `RequestInfo`

###### init?

`RequestInit`

###### Returns

`Promise`\<`Response`\>

###### Call Signature

> (`input`, `init?`): `Promise`\<`Response`\>

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/fetch)

###### Parameters

###### input

`string` | `URL` | `Request`

###### init?

`RequestInit`

###### Returns

`Promise`\<`Response`\>

##### url?

> `optional` **url**: `string` \| `URL`

Defined in: [packages/core/src/web/fetch.ts:9](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/fetch.ts#L9)

##### window?

> `optional` **window**: `null`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.dom.d.ts:1947

Can only be null. Used to disassociate request from any Window.

###### Inherited from

`RequestInit.window`

***

### FieldAtom()\<State, Value\>

Defined in: [packages/core/src/form/reatomField.ts:103](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L103)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Extends

- [`FieldLikeAtom`](#fieldlikeatom)\<`State`\>

#### Type Parameters

##### State

`State` = `any`

The type of state stored in the atom

##### Value

`Value` = `State`

> **FieldAtom**(...`params`): `State`

Defined in: [packages/core/src/form/reatomField.ts:103](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L103)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Parameters

##### params

...\[\]

Parameters to pass to the atom

#### Returns

`State`

The atom's payload (typically its current state)

#### Properties

##### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#atommeta)

Defined in: [packages/core/src/core/atom.ts:101](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L101)

Reference to the atom's internal metadata.

###### Inherited from

[`FieldLikeAtom`](#fieldlikeatom).[`__reatom`](#__reatom-11)

##### \_\_reatomField

> **\_\_reatomField**: `true`

Defined in: [packages/core/src/form/reatomField.ts:100](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L100)

###### Inherited from

[`FieldLikeAtom`](#fieldlikeatom).[`__reatomField`](#__reatomfield-1)

##### actions

> **actions**: [`Actions`](#actions-26)\<[`FieldAtom`](#fieldatom)\<`State`, `Value`\>\>

Defined in: [packages/core/src/core/atom.ts:81](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L81)

Bind methods to the atom to extend its functionality.

###### Inherited from

[`FieldLikeAtom`](#fieldlikeatom).[`actions`](#actions-11)

##### change

> **change**: [`Action`](#action)\<\[`Value`\], `Value`\>

Defined in: [packages/core/src/form/reatomField.ts:109](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L109)

Action for handling field changes, accepts the "value" parameter and
applies it to `toState` option.

##### disabled

> **disabled**: [`BooleanAtom`](#booleanatom)

Defined in: [packages/core/src/form/reatomField.ts:127](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L127)

Atom that defines if the field is disabled

##### elementRef

> **elementRef**: [`Atom`](#atom)\<`undefined` \| [`FieldElementRef`](#fieldelementref)\>

Defined in: [packages/core/src/form/reatomField.ts:130](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L130)

Atom with the reference to the field element.

##### extend

> **extend**: [`Extend`](#extend-10)\<[`FieldAtom`](#fieldatom)\<`State`, `Value`\>\>

Defined in: [packages/core/src/core/atom.ts:87](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L87)

Extension system to add capabilities to atoms. Allows adding middleware,
methods, or other functionality to modify atom behavior.

###### Inherited from

[`FieldLikeAtom`](#fieldlikeatom).[`extend`](#extend-23)

##### focus

> **focus**: [`FocusAtom`](#focusatom)

Defined in: [packages/core/src/form/reatomField.ts:112](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L112)

Atom of an object with all related focus statuses.

##### initState

> **initState**: [`Atom`](#atom)\<`State`\>

Defined in: [packages/core/src/form/reatomField.ts:115](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L115)

The initial state of the atom.

##### options

> **options**: [`RecordAtom`](#recordatom)\<\{ `keepErrorDuringValidating`: `undefined` \| `boolean`; `keepErrorOnChange`: `undefined` \| `boolean`; `shouldValidate`: `undefined` \| `boolean`; `validateOnBlur`: `undefined` \| `boolean`; `validateOnChange`: `undefined` \| `boolean`; \}\>

Defined in: [packages/core/src/form/reatomField.ts:132](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L132)

##### reset

> **reset**: [`Action`](#action)\<\[\] \| \[`State`\], `void`\>

Defined in: [packages/core/src/form/reatomField.ts:118](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L118)

Action to reset the state, the value, the validation, and the focus.

##### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#unsubscribe-2)

Defined in: [packages/core/src/core/atom.ts:98](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L98)

Subscribe to state changes, with the first call happening immediately. When
a subscriber is added, the callback is immediately invoked with the current
state. After that, it's called whenever the atom's state changes.

###### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it
  changes

###### Returns

[`Unsubscribe`](#unsubscribe-2)

An unsubscribe function that removes the subscription when called

###### Inherited from

[`FieldLikeAtom`](#fieldlikeatom).[`subscribe`](#subscribe-11)

##### validation

> **validation**: [`ValidationAtom`](#validationatom)

Defined in: [packages/core/src/form/reatomField.ts:121](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L121)

Atom of an object with all related validation statuses.

##### value

> **value**: [`Computed`](#computed)\<`Value`\>

Defined in: [packages/core/src/form/reatomField.ts:124](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L124)

Atom with the "value" data, computed by the `fromState` option

#### Methods

##### set()

###### Call Signature

> **set**(`update`): `State`

Defined in: [packages/core/src/core/atom.ts:122](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L122)

Update the atom's state using a function that receives the previous state

###### Parameters

###### update

(`state`) => `State`

Function that takes the current state and returns a new
  state

###### Returns

`State`

The new state value

###### Inherited from

[`FieldLikeAtom`](#fieldlikeatom).[`set`](#set-23)

###### Call Signature

> **set**(...`params`): `State`

Defined in: [packages/core/src/core/atom.ts:130](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L130)

Set the atom's state to a new value

###### Parameters

###### params

...\[`State`\]

###### Returns

`State`

The new state value

###### Inherited from

[`FieldLikeAtom`](#fieldlikeatom).[`set`](#set-23)

***

### FieldElementRef

Defined in: [packages/core/src/form/reatomField.ts:95](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L95)

#### Properties

##### focus()

> **focus**: (`options?`) => `void`

Defined in: [packages/core/src/form/reatomField.ts:96](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L96)

###### Parameters

###### options?

###### preventScroll?

`boolean`

###### Returns

`void`

***

### FieldError\<Meta\>

Defined in: [packages/core/src/form/reatomField.ts:54](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L54)

#### Extends

- [`FieldErrorBody`](#fielderrorbody)\<`Meta`\>

#### Extended by

- [`FieldSetFieldError`](#fieldsetfielderror)

#### Type Parameters

##### Meta

`Meta` = `any`

#### Properties

##### message

> **message**: `string`

Defined in: [packages/core/src/form/reatomField.ts:44](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L44)

The message of the error useful for a user.

###### Inherited from

[`FieldErrorBody`](#fielderrorbody).[`message`](#message-3)

##### meta?

> `optional` **meta**: [`Rec`](#rec)\<`Meta`\>

Defined in: [packages/core/src/form/reatomField.ts:49](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L49)

The record with arbitrary information about the error like minimum chars,
upper bound of a number, etc.

###### Inherited from

[`FieldErrorBody`](#fielderrorbody).[`meta`](#meta-3)

##### source

> **source**: [`FieldErrorSource`](#fielderrorsource-1)

Defined in: [packages/core/src/form/reatomField.ts:59](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L59)

The type of an error source. The value will be `validation` if the error
occurred due to the `validate` function.

***

### FieldErrorBody\<Meta\>

Defined in: [packages/core/src/form/reatomField.ts:42](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L42)

#### Extended by

- [`FieldError`](#fielderror)

#### Type Parameters

##### Meta

`Meta` = `any`

#### Properties

##### message

> **message**: `string`

Defined in: [packages/core/src/form/reatomField.ts:44](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L44)

The message of the error useful for a user.

##### meta?

> `optional` **meta**: [`Rec`](#rec)\<`Meta`\>

Defined in: [packages/core/src/form/reatomField.ts:49](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L49)

The record with arbitrary information about the error like minimum chars,
upper bound of a number, etc.

***

### FieldFocus

Defined in: [packages/core/src/form/reatomField.ts:31](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L31)

#### Properties

##### active

> **active**: `boolean`

Defined in: [packages/core/src/form/reatomField.ts:33](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L33)

The field is focused.

##### dirty

> **dirty**: `boolean`

Defined in: [packages/core/src/form/reatomField.ts:36](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L36)

The field state is not equal to the initial state.

##### touched

> **touched**: `boolean`

Defined in: [packages/core/src/form/reatomField.ts:39](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L39)

The field has ever gained and lost focus.

***

### FieldLikeAtom()\<State\>

Defined in: [packages/core/src/form/reatomField.ts:99](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L99)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Extends

- [`Atom`](#atom)\<`State`\>

#### Extended by

- [`FieldAtom`](#fieldatom)

#### Type Parameters

##### State

`State` = `any`

The type of state stored in the atom

> **FieldLikeAtom**(...`params`): `State`

Defined in: [packages/core/src/form/reatomField.ts:99](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L99)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Parameters

##### params

...\[\]

Parameters to pass to the atom

#### Returns

`State`

The atom's payload (typically its current state)

#### Properties

##### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#atommeta)

Defined in: [packages/core/src/core/atom.ts:101](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L101)

Reference to the atom's internal metadata.

###### Inherited from

[`Atom`](#atom).[`__reatom`](#__reatom-3)

##### \_\_reatomField

> **\_\_reatomField**: `true`

Defined in: [packages/core/src/form/reatomField.ts:100](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L100)

##### actions

> **actions**: [`Actions`](#actions-26)\<[`FieldLikeAtom`](#fieldlikeatom)\<`State`\>\>

Defined in: [packages/core/src/core/atom.ts:81](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L81)

Bind methods to the atom to extend its functionality.

###### Inherited from

[`Atom`](#atom).[`actions`](#actions-3)

##### extend

> **extend**: [`Extend`](#extend-10)\<[`FieldLikeAtom`](#fieldlikeatom)\<`State`\>\>

Defined in: [packages/core/src/core/atom.ts:87](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L87)

Extension system to add capabilities to atoms. Allows adding middleware,
methods, or other functionality to modify atom behavior.

###### Inherited from

[`Atom`](#atom).[`extend`](#extend-3)

##### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#unsubscribe-2)

Defined in: [packages/core/src/core/atom.ts:98](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L98)

Subscribe to state changes, with the first call happening immediately. When
a subscriber is added, the callback is immediately invoked with the current
state. After that, it's called whenever the atom's state changes.

###### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it
  changes

###### Returns

[`Unsubscribe`](#unsubscribe-2)

An unsubscribe function that removes the subscription when called

###### Inherited from

[`Atom`](#atom).[`subscribe`](#subscribe-3)

#### Methods

##### set()

###### Call Signature

> **set**(`update`): `State`

Defined in: [packages/core/src/core/atom.ts:122](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L122)

Update the atom's state using a function that receives the previous state

###### Parameters

###### update

(`state`) => `State`

Function that takes the current state and returns a new
  state

###### Returns

`State`

The new state value

###### Inherited from

[`Atom`](#atom).[`set`](#set-9)

###### Call Signature

> **set**(...`params`): `State`

Defined in: [packages/core/src/core/atom.ts:130](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L130)

Set the atom's state to a new value

###### Parameters

###### params

...\[`State`\]

###### Returns

`State`

The new state value

###### Inherited from

[`Atom`](#atom).[`set`](#set-9)

***

### FieldOptions\<State, Value\>

Defined in: [packages/core/src/form/reatomField.ts:182](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L182)

#### Extended by

- [`FormFieldOptions`](#formfieldoptions)

#### Type Parameters

##### State

`State` = `any`

##### Value

`Value` = `State`

#### Properties

##### disabled?

> `optional` **disabled**: `boolean`

Defined in: [packages/core/src/form/reatomField.ts:220](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L220)

Defines if the field is disabled by default.

###### Default

```ts
false
```

##### elementRef?

> `optional` **elementRef**: [`FieldElementRef`](#fieldelementref)

Defined in: [packages/core/src/form/reatomField.ts:223](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L223)

Defines a default element reference accosiated with the field.

##### filter()?

> `optional` **filter**: (`newValue`, `prevValue`) => `boolean`

Defined in: [packages/core/src/form/reatomField.ts:188](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L188)

The callback to filter "value" changes (from the 'change' action). It
should return 'false' to skip the update. By default, it always returns
`true`.

###### Parameters

###### newValue

`Value`

###### prevValue

`Value`

###### Returns

`boolean`

##### fromState()?

> `optional` **fromState**: (`state`) => `Value`

Defined in: [packages/core/src/form/reatomField.ts:194](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L194)

The callback to compute the "value" data from the "state" data. By default,
it returns the "state" data without any transformations.

###### Parameters

###### state

`State`

###### Returns

`Value`

##### isDirty()?

> `optional` **isDirty**: (`newValue`, `prevValue`) => `boolean`

Defined in: [packages/core/src/form/reatomField.ts:200](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L200)

The callback used to determine whether the "value" has changed. By default,
it utilizes `isDeepEqual` from reatom/utils.

###### Parameters

###### newValue

`Value`

###### prevValue

`Value`

###### Returns

`boolean`

##### keepErrorDuringValidating?

> `optional` **keepErrorDuringValidating**: `boolean`

Defined in: [packages/core/src/form/reatomField.ts:230](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L230)

Defines the reset behavior of the validation state during async validation.

###### Default

```ts
false
```

##### keepErrorOnChange?

> `optional` **keepErrorOnChange**: `boolean`

Defined in: [packages/core/src/form/reatomField.ts:238](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L238)

Defines the reset behavior of the validation state on field change. Useful
if the validation is triggered on blur or submit only.

###### Default

```ts
!validateOnChange
```

##### name?

> `optional` **name**: `string`

Defined in: [packages/core/src/form/reatomField.ts:203](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L203)

The name of the field and all related atoms and actions.

##### toState()?

> `optional` **toState**: (`value`) => `State`

Defined in: [packages/core/src/form/reatomField.ts:210](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L210)

The callback to transform the "state" data from the "value" data from the
`change` action. By default, it returns the "value" data without any
transformations.

###### Parameters

###### value

`Value`

###### Returns

`State`

##### validate?

> `optional` **validate**: [`FieldValidateOption`](#fieldvalidateoption)\<`State`, `Value`\> \| `StandardSchemaV1`\<`State`, `State`\>

Defined in: [packages/core/src/form/reatomField.ts:213](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L213)

The callback to validate the field.

##### validateOnBlur?

> `optional` **validateOnBlur**: `boolean`

Defined in: [packages/core/src/form/reatomField.ts:252](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L252)

Defines if the validation should be triggered on the field blur.

###### Default

```ts
false
```

##### validateOnChange?

> `optional` **validateOnChange**: `boolean`

Defined in: [packages/core/src/form/reatomField.ts:245](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L245)

Defines if the validation should be triggered with every field change.

###### Default

```ts
false
```

***

### FieldSet\<T\>

Defined in: [packages/core/src/form/reatomFieldSet.ts:43](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomFieldSet.ts#L43)

#### Type Parameters

##### T

`T` *extends* [`FormInitState`](#forminitstate)

#### Properties

##### fieldArraysList

> **fieldArraysList**: [`Computed`](#computed)\<[`FormFieldArrayAtom`](#formfieldarrayatom)[]\>

Defined in: [packages/core/src/form/reatomFieldSet.ts:51](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomFieldSet.ts#L51)

Computed list of all the field arrays from the fields tree

##### fields

> **fields**: [`FormFields`](#formfields-1)\<`T`\>

Defined in: [packages/core/src/form/reatomFieldSet.ts:45](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomFieldSet.ts#L45)

Fields from the init state

##### fieldsList

> **fieldsList**: [`Computed`](#computed)\<[`FieldAtom`](#fieldatom)\<`any`, `any`\>[]\>

Defined in: [packages/core/src/form/reatomFieldSet.ts:48](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomFieldSet.ts#L48)

Computed list of all the fields from the fields tree

##### fieldsState

> **fieldsState**: [`Computed`](#computed)\<[`Deatomize`](#deatomize)\<[`FormFields`](#formfields-1)\<`T`\>\>\>

Defined in: [packages/core/src/form/reatomFieldSet.ts:57](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomFieldSet.ts#L57)

Atom with the state of the fieldset, computed from all the fields in
`fieldsList`

##### focus

> **focus**: [`Computed`](#computed)\<[`FieldFocus`](#fieldfocus)\>

Defined in: [packages/core/src/form/reatomFieldSet.ts:63](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomFieldSet.ts#L63)

Atom with focus state of the fieldset, computed from all the fields in
`fieldsList`

##### init

> **init**: [`Action`](#action)\<\[[`DeepPartial`](#deeppartial)\<[`Deatomize`](#deatomize)\<[`FormFields`](#formfields-1)\<`T`\>\>, `unknown`[]\>\], `void`\>

Defined in: [packages/core/src/form/reatomFieldSet.ts:75](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomFieldSet.ts#L75)

Action to set initial values for each field or field array in the fieldset

##### reset

> **reset**: [`Action`](#action)\<\[[`DeepPartial`](#deeppartial)\<[`Deatomize`](#deatomize)\<[`FormFields`](#formfields-1)\<`T`\>\>, `unknown`[]\>\], `void`\>

Defined in: [packages/core/src/form/reatomFieldSet.ts:78](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomFieldSet.ts#L78)

Action to reset the state, the value, the validation, and the focus states.

##### validation

> **validation**: [`Computed`](#computed)\<[`FieldSetValidation`](#fieldsetvalidation-1)\> & `object`

Defined in: [packages/core/src/form/reatomFieldSet.ts:69](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomFieldSet.ts#L69)

Atom with validation state of the fieldset, computed from all the fields in
`fieldsList`

###### Type declaration

###### trigger

> **trigger**: [`Action`](#action)\<\[\], [`FieldSetValidation`](#fieldsetvalidation-1)\> & [`AbortExt`](#abortext)

Action to trigger fieldset validation.

***

### FieldSetFieldError

Defined in: [packages/core/src/form/reatomFieldSet.ts:25](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomFieldSet.ts#L25)

#### Extends

- [`FieldError`](#fielderror)

#### Properties

##### field

> **field**: [`FieldAtom`](#fieldatom)

Defined in: [packages/core/src/form/reatomFieldSet.ts:26](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomFieldSet.ts#L26)

##### message

> **message**: `string`

Defined in: [packages/core/src/form/reatomField.ts:44](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L44)

The message of the error useful for a user.

###### Inherited from

[`FieldError`](#fielderror).[`message`](#message-2)

##### meta?

> `optional` **meta**: [`Rec`](#rec)\<`any`\>

Defined in: [packages/core/src/form/reatomField.ts:49](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L49)

The record with arbitrary information about the error like minimum chars,
upper bound of a number, etc.

###### Inherited from

[`FieldError`](#fielderror).[`meta`](#meta-1)

##### source

> **source**: [`FieldErrorSource`](#fielderrorsource-1)

Defined in: [packages/core/src/form/reatomField.ts:59](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L59)

The type of an error source. The value will be `validation` if the error
occurred due to the `validate` function.

###### Inherited from

[`FieldError`](#fielderror).[`source`](#source)

***

### FieldSetValidation

Defined in: [packages/core/src/form/reatomFieldSet.ts:29](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomFieldSet.ts#L29)

#### Properties

##### errors

> **errors**: [`FieldSetFieldError`](#fieldsetfielderror)[]

Defined in: [packages/core/src/form/reatomFieldSet.ts:31](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomFieldSet.ts#L31)

The list of field validation errors.

##### meta

> **meta**: `unknown`

Defined in: [packages/core/src/form/reatomFieldSet.ts:34](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomFieldSet.ts#L34)

The field validation meta.

##### triggered

> **triggered**: `boolean`

Defined in: [packages/core/src/form/reatomFieldSet.ts:37](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomFieldSet.ts#L37)

The validation actuality status.

##### validating

> **validating**: `undefined` \| `Promise`\<\{ `errors`: [`FieldSetFieldError`](#fieldsetfielderror)[]; \}\>

Defined in: [packages/core/src/form/reatomFieldSet.ts:40](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomFieldSet.ts#L40)

The field async validation status

***

### FieldValidation

Defined in: [packages/core/src/form/reatomField.ts:62](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L62)

#### Properties

##### errors

> **errors**: [`FieldError`](#fielderror)\<`any`\>[]

Defined in: [packages/core/src/form/reatomField.ts:64](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L64)

The list of field validation errors.

##### meta

> **meta**: `unknown`

Defined in: [packages/core/src/form/reatomField.ts:67](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L67)

The field validation meta.

##### triggered

> **triggered**: `boolean`

Defined in: [packages/core/src/form/reatomField.ts:70](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L70)

The validation actuality status.

##### validating

> **validating**: `undefined` \| `Promise`\<\{ `errors`: [`FieldError`](#fielderror)\<`any`\>[]; \}\>

Defined in: [packages/core/src/form/reatomField.ts:73](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L73)

The field async validation status.

***

### Fn()

Defined in: [packages/core/src/utils.ts:8](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L8)

Generic function type representing any function that takes any parameters and
returns any value. Used throughout Reatom for typing function parameters and
callbacks.

> **Fn**(...`params`): `any`

Defined in: [packages/core/src/utils.ts:9](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L9)

Generic function type representing any function that takes any parameters and
returns any value. Used throughout Reatom for typing function parameters and
callbacks.

#### Parameters

##### params

...`any`[]

#### Returns

`any`

***

### FocusAtom()

Defined in: [packages/core/src/form/reatomField.ts:76](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L76)

Base atom interface for other userspace implementations. This is the core
interface that all atom-like objects implement, providing the foundation for
Reatom's reactivity system.

#### Extends

- [`AtomLike`](#atomlike)\<[`FieldFocus`](#fieldfocus)\>

> **FocusAtom**(...`params`): [`FieldFocus`](#fieldfocus)

Defined in: [packages/core/src/form/reatomField.ts:76](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L76)

Base atom interface for other userspace implementations. This is the core
interface that all atom-like objects implement, providing the foundation for
Reatom's reactivity system.

#### Parameters

##### params

...`any`[]

Parameters to pass to the atom

#### Returns

[`FieldFocus`](#fieldfocus)

The atom's payload (typically its current state)

#### Properties

##### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#atommeta)

Defined in: [packages/core/src/core/atom.ts:101](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L101)

Reference to the atom's internal metadata.

###### Inherited from

[`AtomLike`](#atomlike).[`__reatom`](#__reatom-4)

##### actions

> **actions**: [`Actions`](#actions-26)\<[`FocusAtom`](#focusatom)\>

Defined in: [packages/core/src/core/atom.ts:81](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L81)

Bind methods to the atom to extend its functionality.

###### Inherited from

[`AtomLike`](#atomlike).[`actions`](#actions-4)

##### extend

> **extend**: [`Extend`](#extend-10)\<[`FocusAtom`](#focusatom)\>

Defined in: [packages/core/src/core/atom.ts:87](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L87)

Extension system to add capabilities to atoms. Allows adding middleware,
methods, or other functionality to modify atom behavior.

###### Inherited from

[`AtomLike`](#atomlike).[`extend`](#extend-4)

##### in

> **in**: [`Action`](#action)\<\[\], [`FieldFocus`](#fieldfocus)\>

Defined in: [packages/core/src/form/reatomField.ts:78](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L78)

Action for handling field focus.

##### out

> **out**: [`Action`](#action)\<\[\], [`FieldFocus`](#fieldfocus)\>

Defined in: [packages/core/src/form/reatomField.ts:81](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L81)

Action for handling field blur.

##### set

> **set**: `unknown`

Defined in: [packages/core/src/core/atom.ts:78](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L78)

###### Inherited from

[`AtomLike`](#atomlike).[`set`](#set-12)

##### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#unsubscribe-2)

Defined in: [packages/core/src/core/atom.ts:98](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L98)

Subscribe to state changes, with the first call happening immediately. When
a subscriber is added, the callback is immediately invoked with the current
state. After that, it's called whenever the atom's state changes.

###### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it
  changes

###### Returns

[`Unsubscribe`](#unsubscribe-2)

An unsubscribe function that removes the subscription when called

###### Inherited from

[`AtomLike`](#atomlike).[`subscribe`](#subscribe-4)

***

### Form\<T, SchemaState, SubmitReturn\>

Defined in: [packages/core/src/form/reatomForm.ts:124](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomForm.ts#L124)

#### Extends

- `Omit`\<[`FieldSet`](#fieldset)\<`T`\>, `"validation"`\>

#### Type Parameters

##### T

`T` *extends* [`FormInitState`](#forminitstate) = [`FormInitState`](#forminitstate)

##### SchemaState

`SchemaState` = `any`

##### SubmitReturn

`SubmitReturn` = `void`

#### Properties

##### fieldArraysList

> **fieldArraysList**: [`Computed`](#computed)\<[`FormFieldArrayAtom`](#formfieldarrayatom)[]\>

Defined in: [packages/core/src/form/reatomFieldSet.ts:51](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomFieldSet.ts#L51)

Computed list of all the field arrays from the fields tree

###### Inherited from

`Omit.fieldArraysList`

##### fields

> **fields**: [`FormFields`](#formfields-1)\<`T`\>

Defined in: [packages/core/src/form/reatomFieldSet.ts:45](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomFieldSet.ts#L45)

Fields from the init state

###### Inherited from

`Omit.fields`

##### fieldsList

> **fieldsList**: [`Computed`](#computed)\<[`FieldAtom`](#fieldatom)\<`any`, `any`\>[]\>

Defined in: [packages/core/src/form/reatomFieldSet.ts:48](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomFieldSet.ts#L48)

Computed list of all the fields from the fields tree

###### Inherited from

`Omit.fieldsList`

##### fieldsState

> **fieldsState**: [`Computed`](#computed)\<[`Deatomize`](#deatomize)\<[`FormFields`](#formfields-1)\<`T`\>\>\>

Defined in: [packages/core/src/form/reatomFieldSet.ts:57](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomFieldSet.ts#L57)

Atom with the state of the fieldset, computed from all the fields in
`fieldsList`

###### Inherited from

`Omit.fieldsState`

##### focus

> **focus**: [`Computed`](#computed)\<[`FieldFocus`](#fieldfocus)\>

Defined in: [packages/core/src/form/reatomFieldSet.ts:63](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomFieldSet.ts#L63)

Atom with focus state of the fieldset, computed from all the fields in
`fieldsList`

###### Inherited from

`Omit.focus`

##### init

> **init**: [`Action`](#action)\<\[[`DeepPartial`](#deeppartial)\<[`Deatomize`](#deatomize)\<[`FormFields`](#formfields-1)\<`T`\>\>, `unknown`[]\>\], `void`\>

Defined in: [packages/core/src/form/reatomFieldSet.ts:75](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomFieldSet.ts#L75)

Action to set initial values for each field or field array in the fieldset

###### Inherited from

`Omit.init`

##### reset

> **reset**: [`Action`](#action)\<\[[`DeepPartial`](#deeppartial)\<[`Deatomize`](#deatomize)\<[`FormFields`](#formfields-1)\<`T`\>\>, `unknown`[]\>\], `void`\>

Defined in: [packages/core/src/form/reatomFieldSet.ts:78](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomFieldSet.ts#L78)

Action to reset the state, the value, the validation, and the focus states.

###### Inherited from

`Omit.reset`

##### submit

> **submit**: [`SubmitAction`](#submitaction)\<`SubmitReturn`\>

Defined in: [packages/core/src/form/reatomForm.ts:158](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomForm.ts#L158)

Submit async handler. It checks the validation of all the fields in
`fieldsList`, calls the form's `validate` options handler, and then the
`onSubmit` options handler. Check the additional options properties of
async action: https://reatom.dev/handbook/async/.

##### submitted

> **submitted**: [`Computed`](#computed)\<`boolean`\>

Defined in: [packages/core/src/form/reatomForm.ts:161](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomForm.ts#L161)

Atom with submitted state of the form

##### validation

> **validation**: [`Computed`](#computed)\<[`FieldSetValidation`](#fieldsetvalidation-1)\> & `object` & `undefined` *extends* `SchemaState` ? `object` : `object`

Defined in: [packages/core/src/form/reatomForm.ts:133](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomForm.ts#L133)

Atom with validation state of the form, computed from all the fields in
`fieldsList`

###### Type declaration

###### trigger

> **trigger**: [`Action`](#action)\<\[\], `Promise`\<`undefined` *extends* `SchemaState` ? [`Deatomize`](#deatomize)\<[`FormFields`](#formfields-1)\<`T`\>\> : `SchemaState`\>\> & [`AsyncExt`](#asyncext)\<\[\], `any`, `undefined` \| `Error`\> & [`AbortExt`](#abortext)

Action to trigger form validation.

***

### FormFieldOptions\<State, Value\>

Defined in: [packages/core/src/form/reatomForm.ts:41](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomForm.ts#L41)

#### Extends

- [`FieldOptions`](#fieldoptions)\<`State`, `Value`\>

#### Type Parameters

##### State

`State` = `any`

##### Value

`Value` = `State`

#### Properties

##### disabled?

> `optional` **disabled**: `boolean`

Defined in: [packages/core/src/form/reatomField.ts:220](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L220)

Defines if the field is disabled by default.

###### Default

```ts
false
```

###### Inherited from

[`FieldOptions`](#fieldoptions).[`disabled`](#disabled-1)

##### elementRef?

> `optional` **elementRef**: [`FieldElementRef`](#fieldelementref)

Defined in: [packages/core/src/form/reatomField.ts:223](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L223)

Defines a default element reference accosiated with the field.

###### Inherited from

[`FieldOptions`](#fieldoptions).[`elementRef`](#elementref-1)

##### filter()?

> `optional` **filter**: (`newValue`, `prevValue`) => `boolean`

Defined in: [packages/core/src/form/reatomField.ts:188](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L188)

The callback to filter "value" changes (from the 'change' action). It
should return 'false' to skip the update. By default, it always returns
`true`.

###### Parameters

###### newValue

`Value`

###### prevValue

`Value`

###### Returns

`boolean`

###### Inherited from

[`FieldOptions`](#fieldoptions).[`filter`](#filter-3)

##### fromState()?

> `optional` **fromState**: (`state`) => `Value`

Defined in: [packages/core/src/form/reatomField.ts:194](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L194)

The callback to compute the "value" data from the "state" data. By default,
it returns the "state" data without any transformations.

###### Parameters

###### state

`State`

###### Returns

`Value`

###### Inherited from

[`FieldOptions`](#fieldoptions).[`fromState`](#fromstate)

##### initState

> **initState**: `State`

Defined in: [packages/core/src/form/reatomForm.ts:43](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomForm.ts#L43)

##### isDirty()?

> `optional` **isDirty**: (`newValue`, `prevValue`) => `boolean`

Defined in: [packages/core/src/form/reatomField.ts:200](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L200)

The callback used to determine whether the "value" has changed. By default,
it utilizes `isDeepEqual` from reatom/utils.

###### Parameters

###### newValue

`Value`

###### prevValue

`Value`

###### Returns

`boolean`

###### Inherited from

[`FieldOptions`](#fieldoptions).[`isDirty`](#isdirty)

##### keepErrorDuringValidating?

> `optional` **keepErrorDuringValidating**: `boolean`

Defined in: [packages/core/src/form/reatomField.ts:230](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L230)

Defines the reset behavior of the validation state during async validation.

###### Default

```ts
false
```

###### Inherited from

[`FieldOptions`](#fieldoptions).[`keepErrorDuringValidating`](#keeperrorduringvalidating-1)

##### keepErrorOnChange?

> `optional` **keepErrorOnChange**: `boolean`

Defined in: [packages/core/src/form/reatomField.ts:238](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L238)

Defines the reset behavior of the validation state on field change. Useful
if the validation is triggered on blur or submit only.

###### Default

```ts
!validateOnChange
```

###### Inherited from

[`FieldOptions`](#fieldoptions).[`keepErrorOnChange`](#keeperroronchange-1)

##### name?

> `optional` **name**: `string`

Defined in: [packages/core/src/form/reatomField.ts:203](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L203)

The name of the field and all related atoms and actions.

###### Inherited from

[`FieldOptions`](#fieldoptions).[`name`](#name-3)

##### toState()?

> `optional` **toState**: (`value`) => `State`

Defined in: [packages/core/src/form/reatomField.ts:210](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L210)

The callback to transform the "state" data from the "value" data from the
`change` action. By default, it returns the "value" data without any
transformations.

###### Parameters

###### value

`Value`

###### Returns

`State`

###### Inherited from

[`FieldOptions`](#fieldoptions).[`toState`](#tostate)

##### validate?

> `optional` **validate**: [`FieldValidateOption`](#fieldvalidateoption)\<`State`, `Value`\> \| `StandardSchemaV1`\<`State`, `State`\>

Defined in: [packages/core/src/form/reatomField.ts:213](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L213)

The callback to validate the field.

###### Inherited from

[`FieldOptions`](#fieldoptions).[`validate`](#validate)

##### validateOnBlur?

> `optional` **validateOnBlur**: `boolean`

Defined in: [packages/core/src/form/reatomField.ts:252](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L252)

Defines if the validation should be triggered on the field blur.

###### Default

```ts
false
```

###### Inherited from

[`FieldOptions`](#fieldoptions).[`validateOnBlur`](#validateonblur-1)

##### validateOnChange?

> `optional` **validateOnChange**: `boolean`

Defined in: [packages/core/src/form/reatomField.ts:245](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L245)

Defines if the validation should be triggered with every field change.

###### Default

```ts
false
```

###### Inherited from

[`FieldOptions`](#fieldoptions).[`validateOnChange`](#validateonchange-1)

***

### FormOptionsWithoutSchema\<T, SubmitReturn\>

Defined in: [packages/core/src/form/reatomForm.ts:219](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomForm.ts#L219)

#### Extends

- [`BaseFormOptions`](#baseformoptions)

#### Type Parameters

##### T

`T` *extends* [`FormInitState`](#forminitstate)

##### SubmitReturn

`SubmitReturn`

#### Properties

##### keepErrorDuringValidating?

> `optional` **keepErrorDuringValidating**: `boolean`

Defined in: [packages/core/src/form/reatomForm.ts:176](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomForm.ts#L176)

Defines the default reset behavior of the validation state during async
validation for all fields.

###### Default

```ts
false
```

###### Inherited from

[`BaseFormOptions`](#baseformoptions).[`keepErrorDuringValidating`](#keeperrorduringvalidating)

##### keepErrorOnChange?

> `optional` **keepErrorOnChange**: `boolean`

Defined in: [packages/core/src/form/reatomForm.ts:185](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomForm.ts#L185)

Defines the default reset behavior of the validation state on field change
for all fields. Useful if the validation is triggered on blur or submit
only.

###### Default

```ts
!validateOnChange
```

###### Inherited from

[`BaseFormOptions`](#baseformoptions).[`keepErrorOnChange`](#keeperroronchange)

##### name?

> `optional` **name**: `string`

Defined in: [packages/core/src/form/reatomForm.ts:165](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomForm.ts#L165)

###### Inherited from

[`BaseFormOptions`](#baseformoptions).[`name`](#name-2)

##### onSubmit()?

> `optional` **onSubmit**: (`state`) => `SubmitReturn` \| `Promise`\<`SubmitReturn`\>

Defined in: [packages/core/src/form/reatomForm.ts:225](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomForm.ts#L225)

The callback to process valid form data, typed according to the raw form
state

###### Parameters

###### state

[`Deatomize`](#deatomize)\<[`FormFields`](#formfields-1)\<`T`\>\>

###### Returns

`SubmitReturn` \| `Promise`\<`SubmitReturn`\>

##### resetOnSubmit?

> `optional` **resetOnSubmit**: `boolean`

Defined in: [packages/core/src/form/reatomForm.ts:168](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomForm.ts#L168)

Should reset the state after success submit?

###### Default

```ts
true
```

###### Inherited from

[`BaseFormOptions`](#baseformoptions).[`resetOnSubmit`](#resetonsubmit)

##### schema?

> `optional` **schema**: `undefined`

Defined in: [packages/core/src/form/reatomForm.ts:231](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomForm.ts#L231)

Schema is explicitly disallowed or undefined in this variant

##### validate()?

> `optional` **validate**: (`state`) => `any`

Defined in: [packages/core/src/form/reatomForm.ts:228](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomForm.ts#L228)

The callback to validate form fields, typed according to the raw form state

###### Parameters

###### state

[`Deatomize`](#deatomize)\<[`FormFields`](#formfields-1)\<`T`\>\>

###### Returns

`any`

##### validateOnBlur?

> `optional` **validateOnBlur**: `boolean`

Defined in: [packages/core/src/form/reatomForm.ts:201](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomForm.ts#L201)

Defines if the validation should be triggered on the field blur by default
for all fields.

###### Default

```ts
false
```

###### Inherited from

[`BaseFormOptions`](#baseformoptions).[`validateOnBlur`](#validateonblur)

##### validateOnChange?

> `optional` **validateOnChange**: `boolean`

Defined in: [packages/core/src/form/reatomForm.ts:193](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomForm.ts#L193)

Defines if the validation should be triggered with every field change by
default for all fields.

###### Default

```ts
false
```

###### Inherited from

[`BaseFormOptions`](#baseformoptions).[`validateOnChange`](#validateonchange)

***

### FormOptionsWithSchema\<State, SubmitReturn\>

Defined in: [packages/core/src/form/reatomForm.ts:204](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomForm.ts#L204)

#### Extends

- [`BaseFormOptions`](#baseformoptions)

#### Type Parameters

##### State

`State`

##### SubmitReturn

`SubmitReturn`

#### Properties

##### keepErrorDuringValidating?

> `optional` **keepErrorDuringValidating**: `boolean`

Defined in: [packages/core/src/form/reatomForm.ts:176](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomForm.ts#L176)

Defines the default reset behavior of the validation state during async
validation for all fields.

###### Default

```ts
false
```

###### Inherited from

[`BaseFormOptions`](#baseformoptions).[`keepErrorDuringValidating`](#keeperrorduringvalidating)

##### keepErrorOnChange?

> `optional` **keepErrorOnChange**: `boolean`

Defined in: [packages/core/src/form/reatomForm.ts:185](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomForm.ts#L185)

Defines the default reset behavior of the validation state on field change
for all fields. Useful if the validation is triggered on blur or submit
only.

###### Default

```ts
!validateOnChange
```

###### Inherited from

[`BaseFormOptions`](#baseformoptions).[`keepErrorOnChange`](#keeperroronchange)

##### name?

> `optional` **name**: `string`

Defined in: [packages/core/src/form/reatomForm.ts:165](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomForm.ts#L165)

###### Inherited from

[`BaseFormOptions`](#baseformoptions).[`name`](#name-2)

##### onSubmit()?

> `optional` **onSubmit**: (`state`) => `SubmitReturn` \| `Promise`\<`SubmitReturn`\>

Defined in: [packages/core/src/form/reatomForm.ts:207](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomForm.ts#L207)

The callback to process valid form data, typed according to the schema

###### Parameters

###### state

`State`

###### Returns

`SubmitReturn` \| `Promise`\<`SubmitReturn`\>

##### resetOnSubmit?

> `optional` **resetOnSubmit**: `boolean`

Defined in: [packages/core/src/form/reatomForm.ts:168](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomForm.ts#L168)

Should reset the state after success submit?

###### Default

```ts
true
```

###### Inherited from

[`BaseFormOptions`](#baseformoptions).[`resetOnSubmit`](#resetonsubmit)

##### schema

> **schema**: `StandardSchemaV1`\<`unknown`, `State`\>

Defined in: [packages/core/src/form/reatomForm.ts:216](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomForm.ts#L216)

The schema which supports StandardSchemaV1 specification to validate form
fields.

##### validate()?

> `optional` **validate**: (`state`) => `any`

Defined in: [packages/core/src/form/reatomForm.ts:210](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomForm.ts#L210)

The callback to validate form fields, typed according to the schema

###### Parameters

###### state

`State`

###### Returns

`any`

##### validateOnBlur?

> `optional` **validateOnBlur**: `boolean`

Defined in: [packages/core/src/form/reatomForm.ts:201](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomForm.ts#L201)

Defines if the validation should be triggered on the field blur by default
for all fields.

###### Default

```ts
false
```

###### Inherited from

[`BaseFormOptions`](#baseformoptions).[`validateOnBlur`](#validateonblur)

##### validateOnChange?

> `optional` **validateOnChange**: `boolean`

Defined in: [packages/core/src/form/reatomForm.ts:193](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomForm.ts#L193)

Defines if the validation should be triggered with every field change by
default for all fields.

###### Default

```ts
false
```

###### Inherited from

[`BaseFormOptions`](#baseformoptions).[`validateOnChange`](#validateonchange)

***

### Frame\<State, Params, Payload\>

Defined in: [packages/core/src/core/atom.ts:154](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L154)

Call stack snapshot for an atom or action execution.

Frames represent the execution context of an atom at a specific point in a
call stack, tracking its current state, error status, and dependencies.

#### Extended by

- [`RootFrame`](#rootframe)

#### Type Parameters

##### State

`State` = `any`

The state type of the atom

##### Params

`Params` *extends* `any`[] = `any`[]

The parameter types the atom accepts

##### Payload

`Payload` = `State`

The return type when the atom is called

#### Properties

##### atom

> `readonly` **atom**: [`AtomLike`](#atomlike)\<`State`, `Params`, `Payload`\>

Defined in: [packages/core/src/core/atom.ts:169](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L169)

Reference to the atom itself

##### error

> **error**: `null` \| \{ \}

Defined in: [packages/core/src/core/atom.ts:160](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L160)

Error that occurred during atom evaluation, or null if successful

##### pubs

> **pubs**: \[`null` \| [`Frame`](#frame)\<`any`, `any`[], `any`\>, `...dependencies: Frame<any, any[], any>[]`\]

Defined in: [packages/core/src/core/atom.ts:176](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L176)

Immutable list of dependencies. The first element is actualization flag and
an imperative write cause. Subsequent elements are the atom's
dependencies.

##### root

> `readonly` **root**: [`RootState`](#rootstate)

Defined in: [packages/core/src/core/atom.ts:192](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L192)

The root frame state with all meta information

##### state

> **state**: `State`

Defined in: [packages/core/src/core/atom.ts:163](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L163)

Current state of the atom

##### subs

> `readonly` **subs**: [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\>[]

Defined in: [packages/core/src/core/atom.ts:179](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L179)

Array of atoms that depend on this atom (subscribers).

#### Methods

##### run()

> **run**\<`I`, `O`\>(`fn`, ...`params`): `O`

Defined in: [packages/core/src/core/atom.ts:189](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L189)

Run the callback in this context. DO NOT USE directly, use `wrap` instead
to preserve context correctly.

###### Type Parameters

###### I

`I` *extends* `any`[]

###### O

`O`

###### Parameters

###### fn

(...`params`) => `O`

Function to execute in this context

###### params

...`I`

Parameters to pass to the function

###### Returns

`O`

The result of the function call

***

### GenericExt()\<Target\>

Defined in: [packages/core/src/core/extend.ts:29](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/extend.ts#L29)

Extension that preserves the exact type of the target atom/action.

This specialized extension type ensures that when applied to an atom or
action, the complete original type information is preserved, including all
generic parameters.

#### Type Parameters

##### Target

`Target` *extends* [`AtomLike`](#atomlike) = [`AtomLike`](#atomlike)

The type of atom or action the extension can be applied to

> **GenericExt**\<`T`\>(`target`): `T`

Defined in: [packages/core/src/core/extend.ts:30](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/extend.ts#L30)

Extension that preserves the exact type of the target atom/action.

This specialized extension type ensures that when applied to an atom or
action, the complete original type information is preserved, including all
generic parameters.

#### Type Parameters

##### T

`T` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\>

#### Parameters

##### target

`T`

#### Returns

`T`

***

### LazyAbortController

Defined in: [packages/core/src/methods/abortVar.ts:55](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/abortVar.ts#L55)

Extended AbortController with unsubscribe capability

#### Extends

- `AbortController`

#### Properties

##### signal

> `readonly` **signal**: `AbortSignal`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.dom.d.ts:2564

Returns the AbortSignal object associated with this object.

[MDN Reference](https://developer.mozilla.org/docs/Web/API/AbortController/signal)

###### Inherited from

`AbortController.signal`

##### unsubscribe

> **unsubscribe**: [`Unsubscribe`](#unsubscribe-2)

Defined in: [packages/core/src/methods/abortVar.ts:57](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/abortVar.ts#L57)

Function to unsubscribe and clean up the controller

#### Methods

##### abort()

> **abort**(`reason?`): `void`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.dom.d.ts:2570

Invoking this method will set this object's AbortSignal's aborted flag and signal to any observers that the associated activity is to be aborted.

[MDN Reference](https://developer.mozilla.org/docs/Web/API/AbortController/abort)

###### Parameters

###### reason?

`any`

###### Returns

`void`

###### Inherited from

`AbortController.abort`

***

### LinkedList\<Node\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:28](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomLinkedList.ts#L28)

#### Extended by

- [`LinkedListDerivedState`](#linkedlistderivedstate)

#### Type Parameters

##### Node

`Node` *extends* [`LLNode`](#llnode) = [`LLNode`](#llnode)

#### Properties

##### changes

> **changes**: `LLChanges`\<`Node`\>[]

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:33](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomLinkedList.ts#L33)

##### head

> **head**: `null` \| `Node`

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:29](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomLinkedList.ts#L29)

##### size

> **size**: `number`

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:31](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomLinkedList.ts#L31)

##### tail

> **tail**: `null` \| `Node`

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:30](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomLinkedList.ts#L30)

##### version

> **version**: `number`

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:32](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomLinkedList.ts#L32)

***

### LinkedListAtom()\<Params, Node, Key\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:43](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomLinkedList.ts#L43)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Extends

- [`LinkedListLikeAtom`](#linkedlistlikeatom)\<[`LinkedList`](#linkedlist)\<[`LLNode`](#llnode)\<`Node`\>\>\>

#### Type Parameters

##### Params

`Params` *extends* `any`[] = `any`[]

The type of state stored in the atom

##### Node

`Node` *extends* [`Rec`](#rec) = [`Rec`](#rec)

##### Key

`Key` *extends* keyof `Node` = `never`

> **LinkedListAtom**(...`params`): [`LinkedList`](#linkedlist)

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:43](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomLinkedList.ts#L43)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Parameters

##### params

...\[\]

Parameters to pass to the atom

#### Returns

[`LinkedList`](#linkedlist)

The atom's payload (typically its current state)

#### Properties

##### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#atommeta)

Defined in: [packages/core/src/core/atom.ts:101](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L101)

Reference to the atom's internal metadata.

###### Inherited from

[`LinkedListLikeAtom`](#linkedlistlikeatom).[`__reatom`](#__reatom-15)

##### \_\_reatomLinkedList

> **\_\_reatomLinkedList**: `true`

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:40](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomLinkedList.ts#L40)

###### Inherited from

[`LinkedListLikeAtom`](#linkedlistlikeatom).[`__reatomLinkedList`](#__reatomlinkedlist-2)

##### actions

> **actions**: [`Actions`](#actions-26)\<[`LinkedListAtom`](#linkedlistatom)\<`Params`, `Node`, `Key`\>\>

Defined in: [packages/core/src/core/atom.ts:81](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L81)

Bind methods to the atom to extend its functionality.

###### Inherited from

[`LinkedListLikeAtom`](#linkedlistlikeatom).[`actions`](#actions-15)

##### array

> **array**: [`Computed`](#computed)\<[`LLNode`](#llnode)\<`Node`\>[]\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:38](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomLinkedList.ts#L38)

###### Inherited from

[`LinkedListLikeAtom`](#linkedlistlikeatom).[`array`](#array-2)

##### batch

> **batch**: [`Action`](#action)\<\[[`Fn`](#fn)\]\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:48](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomLinkedList.ts#L48)

##### clear

> **clear**: [`Action`](#action)\<\[\], `void`\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:54](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomLinkedList.ts#L54)

##### create

> **create**: [`Action`](#action)\<`Params`, [`LLNode`](#llnode)\<`Node`\>\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:50](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomLinkedList.ts#L50)

##### extend

> **extend**: [`Extend`](#extend-10)\<[`LinkedListAtom`](#linkedlistatom)\<`Params`, `Node`, `Key`\>\>

Defined in: [packages/core/src/core/atom.ts:87](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L87)

Extension system to add capabilities to atoms. Allows adding middleware,
methods, or other functionality to modify atom behavior.

###### Inherited from

[`LinkedListLikeAtom`](#linkedlistlikeatom).[`extend`](#extend-27)

##### find()

> **find**: (`cb`) => `null` \| [`LLNode`](#llnode)\<`Node`\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:56](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomLinkedList.ts#L56)

###### Parameters

###### cb

(`node`) => `boolean`

###### Returns

`null` \| [`LLNode`](#llnode)\<`Node`\>

##### initiateFromSnapshot()

> **initiateFromSnapshot**: (`initSnapshot`) => [`LinkedList`](#linkedlist)\<[`LLNode`](#llnode)\<`Node`\>\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:65](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomLinkedList.ts#L65)

###### Parameters

###### initSnapshot

`Params`[]

###### Returns

[`LinkedList`](#linkedlist)\<[`LLNode`](#llnode)\<`Node`\>\>

##### initiateFromState()

> **initiateFromState**: (`initState`) => [`LinkedList`](#linkedlist)\<[`LLNode`](#llnode)\<`Node`\>\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:64](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomLinkedList.ts#L64)

###### Parameters

###### initState

`Node`[]

###### Returns

[`LinkedList`](#linkedlist)\<[`LLNode`](#llnode)\<`Node`\>\>

##### map

> **map**: `Key` *extends* `never` ? `never` : [`Atom`](#atom)\<`Map`\<`State`\<`Node`\[`Key`\]\>, [`LLNode`](#llnode)\<`Node`\>\>, \[`Map`\<`State`\<`Node`\[`Key`\]\>, [`LLNode`](#llnode)\<`Node`\>\>\]\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:62](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomLinkedList.ts#L62)

This lazy map is useful for working with serializable identifier, but it is
not recommended to use it for large (thousands elements) lists

##### move

> **move**: [`Action`](#action)\<\[[`LLNode`](#llnode)\<`Node`\>, `null` \| [`LLNode`](#llnode)\<`Node`\>\], `void`\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:53](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomLinkedList.ts#L53)

##### reatomMap()

> **reatomMap**: \<`T`\>(`cb`, `options?`) => [`LinkedListDerivedAtom`](#linkedlistderivedatom)\<[`LLNode`](#llnode)\<`Node`\>, [`LLNode`](#llnode)\<`T`\>\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:69](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomLinkedList.ts#L69)

###### Type Parameters

###### T

`T` *extends* [`Rec`](#rec)

###### Parameters

###### cb

(`node`) => `T`

###### options?

`string` | \{ `name?`: `string`; `onClear?`: (`lastState`) => `void`; `onCreate?`: (`node`) => `void`; `onMove?`: (`node`) => `void`; `onRemove?`: (`node`, `origin`) => `void`; `onSwap?`: (`payload`) => `void`; \}

###### Returns

[`LinkedListDerivedAtom`](#linkedlistderivedatom)\<[`LLNode`](#llnode)\<`Node`\>, [`LLNode`](#llnode)\<`T`\>\>

##### remove

> **remove**: [`Action`](#action)\<\[[`LLNode`](#llnode)\<`Node`\>\], `boolean`\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:51](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomLinkedList.ts#L51)

##### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#unsubscribe-2)

Defined in: [packages/core/src/core/atom.ts:98](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L98)

Subscribe to state changes, with the first call happening immediately. When
a subscriber is added, the callback is immediately invoked with the current
state. After that, it's called whenever the atom's state changes.

###### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it
  changes

###### Returns

[`Unsubscribe`](#unsubscribe-2)

An unsubscribe function that removes the subscription when called

###### Inherited from

[`LinkedListLikeAtom`](#linkedlistlikeatom).[`subscribe`](#subscribe-15)

##### swap

> **swap**: [`Action`](#action)\<\[[`LLNode`](#llnode)\<`Node`\>, [`LLNode`](#llnode)\<`Node`\>\], `void`\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:52](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomLinkedList.ts#L52)

#### Methods

##### set()

###### Call Signature

> **set**(`update`): [`LinkedList`](#linkedlist)

Defined in: [packages/core/src/core/atom.ts:122](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L122)

Update the atom's state using a function that receives the previous state

###### Parameters

###### update

(`state`) => [`LinkedList`](#linkedlist)

Function that takes the current state and returns a new
  state

###### Returns

[`LinkedList`](#linkedlist)

The new state value

###### Inherited from

[`LinkedListLikeAtom`](#linkedlistlikeatom).[`set`](#set-31)

###### Call Signature

> **set**(...`params`): [`LinkedList`](#linkedlist)

Defined in: [packages/core/src/core/atom.ts:130](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L130)

Set the atom's state to a new value

###### Parameters

###### params

...\[[`LinkedList`](#linkedlist)\<[`LLNode`](#llnode)\<`Node`\>\>\]

###### Returns

[`LinkedList`](#linkedlist)

The new state value

###### Inherited from

[`LinkedListLikeAtom`](#linkedlistlikeatom).[`set`](#set-31)

***

### LinkedListDerivedAtom()\<Node, T\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:106](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomLinkedList.ts#L106)

Derived state container.

A computed atom automatically tracks dependencies and recalculates only when
those dependencies change. The calculation is performed lazily, only when the
computed value is read AND subscribed to.

#### Extends

- [`Computed`](#computed)\<[`LinkedListDerivedState`](#linkedlistderivedstate)\<`Node`, `T`\>\>

#### Type Parameters

##### Node

`Node` *extends* [`LLNode`](#llnode)

The type of derived state

##### T

`T` *extends* [`LLNode`](#llnode)

> **LinkedListDerivedAtom**(...`params`): [`LinkedListDerivedState`](#linkedlistderivedstate)

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:106](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomLinkedList.ts#L106)

Derived state container.

A computed atom automatically tracks dependencies and recalculates only when
those dependencies change. The calculation is performed lazily, only when the
computed value is read AND subscribed to.

#### Parameters

##### params

...\[\]

Parameters to pass to the atom

#### Returns

[`LinkedListDerivedState`](#linkedlistderivedstate)

The atom's payload (typically its current state)

#### Properties

##### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#atommeta)

Defined in: [packages/core/src/core/atom.ts:101](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L101)

Reference to the atom's internal metadata.

###### Inherited from

[`Computed`](#computed).[`__reatom`](#__reatom-7)

##### \_\_reatomLinkedList

> **\_\_reatomLinkedList**: `true`

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:110](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomLinkedList.ts#L110)

##### actions

> **actions**: [`Actions`](#actions-26)\<[`LinkedListDerivedAtom`](#linkedlistderivedatom)\<`Node`, `T`\>\>

Defined in: [packages/core/src/core/atom.ts:81](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L81)

Bind methods to the atom to extend its functionality.

###### Inherited from

[`Computed`](#computed).[`actions`](#actions-7)

##### array

> **array**: [`Computed`](#computed)\<`T` *extends* [`LinkedList`](#linkedlist)\<[`LLNode`](#llnode)\> ? [`LLNode`](#llnode) : `never`[]\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:108](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomLinkedList.ts#L108)

##### extend

> **extend**: [`Extend`](#extend-10)\<[`LinkedListDerivedAtom`](#linkedlistderivedatom)\<`Node`, `T`\>\>

Defined in: [packages/core/src/core/atom.ts:87](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L87)

Extension system to add capabilities to atoms. Allows adding middleware,
methods, or other functionality to modify atom behavior.

###### Inherited from

[`Computed`](#computed).[`extend`](#extend-7)

##### set

> **set**: `unknown`

Defined in: [packages/core/src/core/atom.ts:78](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L78)

###### Inherited from

[`Computed`](#computed).[`set`](#set-17)

##### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#unsubscribe-2)

Defined in: [packages/core/src/core/atom.ts:98](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L98)

Subscribe to state changes, with the first call happening immediately. When
a subscriber is added, the callback is immediately invoked with the current
state. After that, it's called whenever the atom's state changes.

###### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it
  changes

###### Returns

[`Unsubscribe`](#unsubscribe-2)

An unsubscribe function that removes the subscription when called

###### Inherited from

[`Computed`](#computed).[`subscribe`](#subscribe-7)

***

### LinkedListDerivedState\<Node, T\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:101](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomLinkedList.ts#L101)

#### Extends

- [`LinkedList`](#linkedlist)\<`T`\>

#### Type Parameters

##### Node

`Node` *extends* [`LLNode`](#llnode)

##### T

`T` *extends* [`LLNode`](#llnode)

#### Properties

##### changes

> **changes**: `LLChanges`\<`T`\>[]

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:33](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomLinkedList.ts#L33)

###### Inherited from

[`LinkedList`](#linkedlist).[`changes`](#changes)

##### head

> **head**: `null` \| `T`

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:29](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomLinkedList.ts#L29)

###### Inherited from

[`LinkedList`](#linkedlist).[`head`](#head)

##### map

> **map**: `WeakMap`\<`Node`, `T`\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:103](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomLinkedList.ts#L103)

##### size

> **size**: `number`

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:31](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomLinkedList.ts#L31)

###### Inherited from

[`LinkedList`](#linkedlist).[`size`](#size-1)

##### tail

> **tail**: `null` \| `T`

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:30](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomLinkedList.ts#L30)

###### Inherited from

[`LinkedList`](#linkedlist).[`tail`](#tail)

##### version

> **version**: `number`

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:32](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomLinkedList.ts#L32)

###### Inherited from

[`LinkedList`](#linkedlist).[`version`](#version-1)

***

### LinkedListLikeAtom()\<T\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:36](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomLinkedList.ts#L36)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Extends

- [`Atom`](#atom)\<`T`\>

#### Extended by

- [`LinkedListAtom`](#linkedlistatom)

#### Type Parameters

##### T

`T` *extends* [`LinkedList`](#linkedlist) = [`LinkedList`](#linkedlist)

The type of state stored in the atom

> **LinkedListLikeAtom**(...`params`): `T`

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:36](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomLinkedList.ts#L36)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Parameters

##### params

...\[\]

Parameters to pass to the atom

#### Returns

`T`

The atom's payload (typically its current state)

#### Properties

##### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#atommeta)

Defined in: [packages/core/src/core/atom.ts:101](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L101)

Reference to the atom's internal metadata.

###### Inherited from

[`Atom`](#atom).[`__reatom`](#__reatom-3)

##### \_\_reatomLinkedList

> **\_\_reatomLinkedList**: `true`

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:40](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomLinkedList.ts#L40)

##### actions

> **actions**: [`Actions`](#actions-26)\<[`LinkedListLikeAtom`](#linkedlistlikeatom)\<`T`\>\>

Defined in: [packages/core/src/core/atom.ts:81](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L81)

Bind methods to the atom to extend its functionality.

###### Inherited from

[`Atom`](#atom).[`actions`](#actions-3)

##### array

> **array**: [`Computed`](#computed)\<`T` *extends* [`LinkedList`](#linkedlist)\<[`LLNode`](#llnode)\> ? [`LLNode`](#llnode) : `never`[]\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:38](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomLinkedList.ts#L38)

##### extend

> **extend**: [`Extend`](#extend-10)\<[`LinkedListLikeAtom`](#linkedlistlikeatom)\<`T`\>\>

Defined in: [packages/core/src/core/atom.ts:87](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L87)

Extension system to add capabilities to atoms. Allows adding middleware,
methods, or other functionality to modify atom behavior.

###### Inherited from

[`Atom`](#atom).[`extend`](#extend-3)

##### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#unsubscribe-2)

Defined in: [packages/core/src/core/atom.ts:98](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L98)

Subscribe to state changes, with the first call happening immediately. When
a subscriber is added, the callback is immediately invoked with the current
state. After that, it's called whenever the atom's state changes.

###### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it
  changes

###### Returns

[`Unsubscribe`](#unsubscribe-2)

An unsubscribe function that removes the subscription when called

###### Inherited from

[`Atom`](#atom).[`subscribe`](#subscribe-3)

#### Methods

##### set()

###### Call Signature

> **set**(`update`): `T`

Defined in: [packages/core/src/core/atom.ts:122](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L122)

Update the atom's state using a function that receives the previous state

###### Parameters

###### update

(`state`) => `T`

Function that takes the current state and returns a new
  state

###### Returns

`T`

The new state value

###### Inherited from

[`Atom`](#atom).[`set`](#set-9)

###### Call Signature

> **set**(...`params`): `T`

Defined in: [packages/core/src/core/atom.ts:130](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L130)

Set the atom's state to a new value

###### Parameters

###### params

...\[`T`\]

###### Returns

`T`

The new state value

###### Inherited from

[`Atom`](#atom).[`set`](#set-9)

***

### MapAtom()\<Key, Value\>

Defined in: [packages/core/src/primitives/reatomMap.ts:11](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomMap.ts#L11)

Base atom interface for other userspace implementations. This is the core
interface that all atom-like objects implement, providing the foundation for
Reatom's reactivity system.

#### Extends

- [`AtomLike`](#atomlike)\<`Map`\<`Key`, `Value`\>, \[\]\>

#### Extended by

- [`CacheAtom`](#cacheatom)

#### Type Parameters

##### Key

`Key`

The type of state stored in the atom

##### Value

`Value`

> **MapAtom**(...`params`): `Map`

Defined in: [packages/core/src/primitives/reatomMap.ts:11](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomMap.ts#L11)

Base atom interface for other userspace implementations. This is the core
interface that all atom-like objects implement, providing the foundation for
Reatom's reactivity system.

#### Parameters

##### params

...\[\]

Parameters to pass to the atom

#### Returns

`Map`

The atom's payload (typically its current state)

#### Properties

##### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#atommeta)

Defined in: [packages/core/src/core/atom.ts:101](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L101)

Reference to the atom's internal metadata.

###### Inherited from

[`AtomLike`](#atomlike).[`__reatom`](#__reatom-4)

##### actions

> **actions**: [`Actions`](#actions-26)\<[`MapAtom`](#mapatom)\<`Key`, `Value`\>\>

Defined in: [packages/core/src/core/atom.ts:81](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L81)

Bind methods to the atom to extend its functionality.

###### Inherited from

[`AtomLike`](#atomlike).[`actions`](#actions-4)

##### clear

> **clear**: [`Action`](#action)\<\[\], `Map`\<`Key`, `Value`\>\>

Defined in: [packages/core/src/primitives/reatomMap.ts:35](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomMap.ts#L35)

##### delete

> **delete**: [`Action`](#action)\<\[`Key`\], `Map`\<`Key`, `Value`\>\>

Defined in: [packages/core/src/primitives/reatomMap.ts:34](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomMap.ts#L34)

##### extend

> **extend**: [`Extend`](#extend-10)\<[`MapAtom`](#mapatom)\<`Key`, `Value`\>\>

Defined in: [packages/core/src/core/atom.ts:87](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L87)

Extension system to add capabilities to atoms. Allows adding middleware,
methods, or other functionality to modify atom behavior.

###### Inherited from

[`AtomLike`](#atomlike).[`extend`](#extend-4)

##### getOrCreate()

> **getOrCreate**: (`key`, `creator`) => `Value`

Defined in: [packages/core/src/primitives/reatomMap.ts:31](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomMap.ts#L31)

###### Parameters

###### key

`Key`

###### creator

() => `Value`

###### Returns

`Value`

##### reset

> **reset**: [`Action`](#action)\<\[\], `Map`\<`Key`, `Value`\>\>

Defined in: [packages/core/src/primitives/reatomMap.ts:36](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomMap.ts#L36)

##### set

> **set**: [`Action`](#action)\<\[`Key`, `Value`\], `Map`\<`Key`, `Value`\>\>

Defined in: [packages/core/src/primitives/reatomMap.ts:33](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomMap.ts#L33)

###### Overrides

[`AtomLike`](#atomlike).[`set`](#set-12)

##### size

> **size**: [`Computed`](#computed)\<`number`\>

Defined in: [packages/core/src/primitives/reatomMap.ts:38](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomMap.ts#L38)

##### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#unsubscribe-2)

Defined in: [packages/core/src/core/atom.ts:98](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L98)

Subscribe to state changes, with the first call happening immediately. When
a subscriber is added, the callback is immediately invoked with the current
state. After that, it's called whenever the atom's state changes.

###### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it
  changes

###### Returns

[`Unsubscribe`](#unsubscribe-2)

An unsubscribe function that removes the subscription when called

###### Inherited from

[`AtomLike`](#atomlike).[`subscribe`](#subscribe-4)

#### Methods

##### setState()

###### Call Signature

> **setState**(`update`): `Map`\<`Key`, `Value`\>

Defined in: [packages/core/src/primitives/reatomMap.ts:19](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomMap.ts#L19)

Update the atom's state using a function that receives the previous state

###### Parameters

###### update

(`state`) => `StateInit`\<`Key`, `Value`\>

Function that takes the current state and returns a new
  state

###### Returns

`Map`\<`Key`, `Value`\>

The new state value

###### Call Signature

> **setState**(`newState`): `Map`\<`Key`, `Value`\>

Defined in: [packages/core/src/primitives/reatomMap.ts:29](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomMap.ts#L29)

Set the atom's state to a new value

###### Parameters

###### newState

`StateInit`\<`Key`, `Value`\>

The new state value

###### Returns

`Map`\<`Key`, `Value`\>

The new state value

***

### Newable\<ReturnType\>

Defined in: [packages/core/src/utils.ts:99](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L99)

Represents a constructor function that can be instantiated with the new
operator.

#### Type Parameters

##### ReturnType

`ReturnType`

The type of object that will be created when
  instantiated

#### Constructors

##### Constructor

> **new Newable**(...`params`): `ReturnType`

Defined in: [packages/core/src/utils.ts:100](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L100)

###### Parameters

###### params

...`any`[]

###### Returns

`ReturnType`

***

### NumberAtom()

Defined in: [packages/core/src/primitives/reatomNumber.ts:5](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomNumber.ts#L5)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Extends

- [`Atom`](#atom)\<`number`\>

> **NumberAtom**(...`params`): `number`

Defined in: [packages/core/src/primitives/reatomNumber.ts:5](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomNumber.ts#L5)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Parameters

##### params

...\[\]

Parameters to pass to the atom

#### Returns

`number`

The atom's payload (typically its current state)

#### Properties

##### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#atommeta)

Defined in: [packages/core/src/core/atom.ts:101](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L101)

Reference to the atom's internal metadata.

###### Inherited from

[`Atom`](#atom).[`__reatom`](#__reatom-3)

##### actions

> **actions**: [`Actions`](#actions-26)\<[`NumberAtom`](#numberatom)\>

Defined in: [packages/core/src/core/atom.ts:81](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L81)

Bind methods to the atom to extend its functionality.

###### Inherited from

[`Atom`](#atom).[`actions`](#actions-3)

##### decrement

> **decrement**: [`Action`](#action)\<\[`number`\], `number`\>

Defined in: [packages/core/src/primitives/reatomNumber.ts:7](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomNumber.ts#L7)

##### extend

> **extend**: [`Extend`](#extend-10)\<[`NumberAtom`](#numberatom)\>

Defined in: [packages/core/src/core/atom.ts:87](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L87)

Extension system to add capabilities to atoms. Allows adding middleware,
methods, or other functionality to modify atom behavior.

###### Inherited from

[`Atom`](#atom).[`extend`](#extend-3)

##### increment

> **increment**: [`Action`](#action)\<\[`number`\], `number`\>

Defined in: [packages/core/src/primitives/reatomNumber.ts:6](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomNumber.ts#L6)

##### random

> **random**: [`Action`](#action)\<\[`number`, `number`\], `number`\>

Defined in: [packages/core/src/primitives/reatomNumber.ts:8](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomNumber.ts#L8)

##### reset

> **reset**: [`Action`](#action)\<\[\], `number`\>

Defined in: [packages/core/src/primitives/reatomNumber.ts:9](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomNumber.ts#L9)

##### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#unsubscribe-2)

Defined in: [packages/core/src/core/atom.ts:98](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L98)

Subscribe to state changes, with the first call happening immediately. When
a subscriber is added, the callback is immediately invoked with the current
state. After that, it's called whenever the atom's state changes.

###### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it
  changes

###### Returns

[`Unsubscribe`](#unsubscribe-2)

An unsubscribe function that removes the subscription when called

###### Inherited from

[`Atom`](#atom).[`subscribe`](#subscribe-3)

#### Methods

##### set()

###### Call Signature

> **set**(`update`): `number`

Defined in: [packages/core/src/core/atom.ts:122](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L122)

Update the atom's state using a function that receives the previous state

###### Parameters

###### update

(`state`) => `number`

Function that takes the current state and returns a new
  state

###### Returns

`number`

The new state value

###### Inherited from

[`Atom`](#atom).[`set`](#set-9)

###### Call Signature

> **set**(...`params`): `number`

Defined in: [packages/core/src/core/atom.ts:130](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L130)

Set the atom's state to a new value

###### Parameters

###### params

...\[`number`\]

###### Returns

`number`

The new state value

###### Inherited from

[`Atom`](#atom).[`set`](#set-9)

***

### ParamsExt()\<Target, Params\>

Defined in: [packages/core/src/core/extend.ts:275](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/extend.ts#L275)

Extension for customizing parameter handling in atoms and actions.

This extension type allows transforming the parameters an atom or action
accepts, enabling custom parameter parsing, validation, or transformation.

#### Type Parameters

##### Target

`Target` *extends* [`AtomLike`](#atomlike) = [`AtomLike`](#atomlike)

The atom or action type being extended

##### Params

`Params` *extends* `any`[] = `any`[]

The new parameter types the atom/action will accept

> **ParamsExt**(`target`): `Target` *extends* [`Action`](#action)\<`ActionParams`, `Payload`\> ? `ActionParams` *extends* \[`any`\] ? [`Action`](#action)\<`Params`, `Payload`\> : `object` & [`Action`](#action)\<`unknown`[], `unknown`\> : `Target` *extends* [`Atom`](#atom)\<`State`, \[`State`\]\> ? [`Atom`](#atom)\<`State`, `Params`\> : [`AtomLike`](#atomlike)\<[`AtomState`](#atomstate-1)\<`Target`\>, \[\] \| `Params`, [`AtomState`](#atomstate-1)\<`Target`\>\> & \{ \[K in string \| number \| symbol\]: Target\[K\] \}

Defined in: [packages/core/src/core/extend.ts:279](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/extend.ts#L279)

Extension for customizing parameter handling in atoms and actions.

This extension type allows transforming the parameters an atom or action
accepts, enabling custom parameter parsing, validation, or transformation.

#### Parameters

##### target

`Target`

#### Returns

`Target` *extends* [`Action`](#action)\<`ActionParams`, `Payload`\> ? `ActionParams` *extends* \[`any`\] ? [`Action`](#action)\<`Params`, `Payload`\> : `object` & [`Action`](#action)\<`unknown`[], `unknown`\> : `Target` *extends* [`Atom`](#atom)\<`State`, \[`State`\]\> ? [`Atom`](#atom)\<`State`, `Params`\> : [`AtomLike`](#atomlike)\<[`AtomState`](#atomstate-1)\<`Target`\>, \[\] \| `Params`, [`AtomState`](#atomstate-1)\<`Target`\>\> & \{ \[K in string \| number \| symbol\]: Target\[K\] \}

***

### PersistRecord\<T\>

Defined in: [packages/core/src/persist/index.ts:14](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/index.ts#L14)

#### Type Parameters

##### T

`T` = `unknown`

#### Properties

##### data

> **data**: `T`

Defined in: [packages/core/src/persist/index.ts:15](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/index.ts#L15)

##### id

> **id**: `number`

Defined in: [packages/core/src/persist/index.ts:16](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/index.ts#L16)

##### timestamp

> **timestamp**: `number`

Defined in: [packages/core/src/persist/index.ts:17](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/index.ts#L17)

##### to

> **to**: `number`

Defined in: [packages/core/src/persist/index.ts:20](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/index.ts#L20)

Time stamp after which the record is cleared.

##### version

> **version**: `number`

Defined in: [packages/core/src/persist/index.ts:18](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/index.ts#L18)

***

### PersistStorage

Defined in: [packages/core/src/persist/index.ts:23](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/index.ts#L23)

#### Properties

##### name

> **name**: `string`

Defined in: [packages/core/src/persist/index.ts:24](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/index.ts#L24)

#### Methods

##### clear()?

> `optional` **clear**(`key`): `void` \| `Promise`\<`void`\>

Defined in: [packages/core/src/persist/index.ts:27](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/index.ts#L27)

###### Parameters

###### key

`string`

###### Returns

`void` \| `Promise`\<`void`\>

##### get()

> **get**(`key`): `null` \| [`PersistRecord`](#persistrecord)\<`unknown`\> \| `Promise`\<`null` \| [`PersistRecord`](#persistrecord)\<`unknown`\>\>

Defined in: [packages/core/src/persist/index.ts:25](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/index.ts#L25)

###### Parameters

###### key

`string`

###### Returns

`null` \| [`PersistRecord`](#persistrecord)\<`unknown`\> \| `Promise`\<`null` \| [`PersistRecord`](#persistrecord)\<`unknown`\>\>

##### set()

> **set**(`key`, `rec`): `void` \| `Promise`\<`void`\>

Defined in: [packages/core/src/persist/index.ts:26](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/index.ts#L26)

###### Parameters

###### key

`string`

###### rec

[`PersistRecord`](#persistrecord)

###### Returns

`void` \| `Promise`\<`void`\>

##### subscribe()?

> `optional` **subscribe**(`key`, `callback`): [`Unsubscribe`](#unsubscribe-2)

Defined in: [packages/core/src/persist/index.ts:28](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/index.ts#L28)

###### Parameters

###### key

`string`

###### callback

(`record`) => `void`

###### Returns

[`Unsubscribe`](#unsubscribe-2)

***

### Queue

Defined in: [packages/core/src/core/atom.ts:204](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L204)

Task queue for scheduled operations.

#### Extends

- `Array`\<[`Fn`](#fn)\>

#### Indexable

\[`n`: `number`\]: [`Fn`](#fn)

#### Properties

##### \[unscopables\]

> `readonly` **\[unscopables\]**: `object`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2015.symbol.wellknown.d.ts:97

Is an object whose properties have the value 'true'
when they will be absent when used in a 'with' statement.

###### Index Signature

\[`key`: `number`\]: `undefined` \| `boolean`

###### \[iterator\]?

> `optional` **\[iterator\]**: `boolean`

###### \[unscopables\]?

> `readonly` `optional` **\[unscopables\]**: `boolean`

Is an object whose properties have the value 'true'
when they will be absent when used in a 'with' statement.

###### at?

> `optional` **at**: `boolean`

###### concat?

> `optional` **concat**: `boolean`

###### copyWithin?

> `optional` **copyWithin**: `boolean`

###### entries?

> `optional` **entries**: `boolean`

###### every?

> `optional` **every**: `boolean`

###### fill?

> `optional` **fill**: `boolean`

###### filter?

> `optional` **filter**: `boolean`

###### find?

> `optional` **find**: `boolean`

###### findIndex?

> `optional` **findIndex**: `boolean`

###### findLast?

> `optional` **findLast**: `boolean`

###### findLastIndex?

> `optional` **findLastIndex**: `boolean`

###### flat?

> `optional` **flat**: `boolean`

###### flatMap?

> `optional` **flatMap**: `boolean`

###### forEach?

> `optional` **forEach**: `boolean`

###### includes?

> `optional` **includes**: `boolean`

###### indexOf?

> `optional` **indexOf**: `boolean`

###### join?

> `optional` **join**: `boolean`

###### keys?

> `optional` **keys**: `boolean`

###### lastIndexOf?

> `optional` **lastIndexOf**: `boolean`

###### length?

> `optional` **length**: `boolean`

Gets or sets the length of the array. This is a number one higher than the highest index in the array.

###### map?

> `optional` **map**: `boolean`

###### pop?

> `optional` **pop**: `boolean`

###### push?

> `optional` **push**: `boolean`

###### reduce?

> `optional` **reduce**: `boolean`

###### reduceRight?

> `optional` **reduceRight**: `boolean`

###### reverse?

> `optional` **reverse**: `boolean`

###### shift?

> `optional` **shift**: `boolean`

###### slice?

> `optional` **slice**: `boolean`

###### some?

> `optional` **some**: `boolean`

###### sort?

> `optional` **sort**: `boolean`

###### splice?

> `optional` **splice**: `boolean`

###### toLocaleString?

> `optional` **toLocaleString**: `boolean`

###### toReversed?

> `optional` **toReversed**: `boolean`

###### toSorted?

> `optional` **toSorted**: `boolean`

###### toSpliced?

> `optional` **toSpliced**: `boolean`

###### toString?

> `optional` **toString**: `boolean`

###### unshift?

> `optional` **unshift**: `boolean`

###### values?

> `optional` **values**: `boolean`

###### with?

> `optional` **with**: `boolean`

###### Inherited from

`Array.[unscopables]`

##### length

> **length**: `number`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1326

Gets or sets the length of the array. This is a number one higher than the highest index in the array.

###### Inherited from

`Array.length`

#### Methods

##### \[iterator\]()

> **\[iterator\]**(): `ArrayIterator`\<[`Fn`](#fn)\>

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2015.iterable.d.ts:78

Iterator

###### Returns

`ArrayIterator`\<[`Fn`](#fn)\>

###### Inherited from

`Array.[iterator]`

##### at()

> **at**(`index`): `undefined` \| [`Fn`](#fn)

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2022.array.d.ts:24

Returns the item located at the specified index.

###### Parameters

###### index

`number`

The zero-based index of the desired code unit. A negative index will count back from the last item.

###### Returns

`undefined` \| [`Fn`](#fn)

###### Inherited from

`Array.at`

##### concat()

###### Call Signature

> **concat**(...`items`): [`Fn`](#fn)[]

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1350

Combines two or more arrays.
This method returns a new array without modifying any existing arrays.

###### Parameters

###### items

...`ConcatArray`\<[`Fn`](#fn)\>[]

Additional arrays and/or items to add to the end of the array.

###### Returns

[`Fn`](#fn)[]

###### Inherited from

`Array.concat`

###### Call Signature

> **concat**(...`items`): [`Fn`](#fn)[]

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1356

Combines two or more arrays.
This method returns a new array without modifying any existing arrays.

###### Parameters

###### items

...([`Fn`](#fn) \| `ConcatArray`\<[`Fn`](#fn)\>)[]

Additional arrays and/or items to add to the end of the array.

###### Returns

[`Fn`](#fn)[]

###### Inherited from

`Array.concat`

##### copyWithin()

> **copyWithin**(`target`, `start`, `end?`): `this`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2015.core.d.ts:62

Returns the this object after copying a section of the array identified by start and end
to the same array starting at position target

###### Parameters

###### target

`number`

If target is negative, it is treated as length+target where length is the
length of the array.

###### start

`number`

If start is negative, it is treated as length+start. If end is negative, it
is treated as length+end.

###### end?

`number`

If not specified, length of the this object is used as its default value.

###### Returns

`this`

###### Inherited from

`Array.copyWithin`

##### entries()

> **entries**(): `ArrayIterator`\<\[`number`, [`Fn`](#fn)\]\>

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2015.iterable.d.ts:83

Returns an iterable of key, value pairs for every entry in the array

###### Returns

`ArrayIterator`\<\[`number`, [`Fn`](#fn)\]\>

###### Inherited from

`Array.entries`

##### every()

###### Call Signature

> **every**\<`S`\>(`predicate`, `thisArg?`): `this is S[]`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1433

Determines whether all the members of an array satisfy the specified test.

###### Type Parameters

###### S

`S` *extends* [`Fn`](#fn)

###### Parameters

###### predicate

(`value`, `index`, `array`) => `value is S`

A function that accepts up to three arguments. The every method calls
the predicate function for each element in the array until the predicate returns a value
which is coercible to the Boolean value false, or until the end of the array.

###### thisArg?

`any`

An object to which the this keyword can refer in the predicate function.
If thisArg is omitted, undefined is used as the this value.

###### Returns

`this is S[]`

###### Inherited from

`Array.every`

###### Call Signature

> **every**(`predicate`, `thisArg?`): `boolean`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1442

Determines whether all the members of an array satisfy the specified test.

###### Parameters

###### predicate

(`value`, `index`, `array`) => `unknown`

A function that accepts up to three arguments. The every method calls
the predicate function for each element in the array until the predicate returns a value
which is coercible to the Boolean value false, or until the end of the array.

###### thisArg?

`any`

An object to which the this keyword can refer in the predicate function.
If thisArg is omitted, undefined is used as the this value.

###### Returns

`boolean`

###### Inherited from

`Array.every`

##### fill()

> **fill**(`value`, `start?`, `end?`): `this`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2015.core.d.ts:51

Changes all array elements from `start` to `end` index to a static `value` and returns the modified array

###### Parameters

###### value

[`Fn`](#fn)

value to fill array section with

###### start?

`number`

index to start filling the array at. If start is negative, it is treated as
length+start where length is the length of the array.

###### end?

`number`

index to stop filling the array at. If end is negative, it is treated as
length+end.

###### Returns

`this`

###### Inherited from

`Array.fill`

##### filter()

###### Call Signature

> **filter**\<`S`\>(`predicate`, `thisArg?`): `S`[]

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1469

Returns the elements of an array that meet the condition specified in a callback function.

###### Type Parameters

###### S

`S` *extends* [`Fn`](#fn)

###### Parameters

###### predicate

(`value`, `index`, `array`) => `value is S`

A function that accepts up to three arguments. The filter method calls the predicate function one time for each element in the array.

###### thisArg?

`any`

An object to which the this keyword can refer in the predicate function. If thisArg is omitted, undefined is used as the this value.

###### Returns

`S`[]

###### Inherited from

`Array.filter`

###### Call Signature

> **filter**(`predicate`, `thisArg?`): [`Fn`](#fn)[]

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1475

Returns the elements of an array that meet the condition specified in a callback function.

###### Parameters

###### predicate

(`value`, `index`, `array`) => `unknown`

A function that accepts up to three arguments. The filter method calls the predicate function one time for each element in the array.

###### thisArg?

`any`

An object to which the this keyword can refer in the predicate function. If thisArg is omitted, undefined is used as the this value.

###### Returns

[`Fn`](#fn)[]

###### Inherited from

`Array.filter`

##### find()

###### Call Signature

> **find**\<`S`\>(`predicate`, `thisArg?`): `undefined` \| `S`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2015.core.d.ts:29

Returns the value of the first element in the array where predicate is true, and undefined
otherwise.

###### Type Parameters

###### S

`S` *extends* [`Fn`](#fn)

###### Parameters

###### predicate

(`value`, `index`, `obj`) => `value is S`

find calls predicate once for each element of the array, in ascending
order, until it finds one where predicate returns true. If such an element is found, find
immediately returns that element value. Otherwise, find returns undefined.

###### thisArg?

`any`

If provided, it will be used as the this value for each invocation of
predicate. If it is not provided, undefined is used instead.

###### Returns

`undefined` \| `S`

###### Inherited from

`Array.find`

###### Call Signature

> **find**(`predicate`, `thisArg?`): `undefined` \| [`Fn`](#fn)

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2015.core.d.ts:30

###### Parameters

###### predicate

(`value`, `index`, `obj`) => `unknown`

###### thisArg?

`any`

###### Returns

`undefined` \| [`Fn`](#fn)

###### Inherited from

`Array.find`

##### findIndex()

> **findIndex**(`predicate`, `thisArg?`): `number`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2015.core.d.ts:41

Returns the index of the first element in the array where predicate is true, and -1
otherwise.

###### Parameters

###### predicate

(`value`, `index`, `obj`) => `unknown`

find calls predicate once for each element of the array, in ascending
order, until it finds one where predicate returns true. If such an element is found,
findIndex immediately returns that element index. Otherwise, findIndex returns -1.

###### thisArg?

`any`

If provided, it will be used as the this value for each invocation of
predicate. If it is not provided, undefined is used instead.

###### Returns

`number`

###### Inherited from

`Array.findIndex`

##### findLast()

###### Call Signature

> **findLast**\<`S`\>(`predicate`, `thisArg?`): `undefined` \| `S`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2023.array.d.ts:29

Returns the value of the last element in the array where predicate is true, and undefined
otherwise.

###### Type Parameters

###### S

`S` *extends* [`Fn`](#fn)

###### Parameters

###### predicate

(`value`, `index`, `array`) => `value is S`

findLast calls predicate once for each element of the array, in descending
order, until it finds one where predicate returns true. If such an element is found, findLast
immediately returns that element value. Otherwise, findLast returns undefined.

###### thisArg?

`any`

If provided, it will be used as the this value for each invocation of
predicate. If it is not provided, undefined is used instead.

###### Returns

`undefined` \| `S`

###### Inherited from

`Array.findLast`

###### Call Signature

> **findLast**(`predicate`, `thisArg?`): `undefined` \| [`Fn`](#fn)

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2023.array.d.ts:30

###### Parameters

###### predicate

(`value`, `index`, `array`) => `unknown`

###### thisArg?

`any`

###### Returns

`undefined` \| [`Fn`](#fn)

###### Inherited from

`Array.findLast`

##### findLastIndex()

> **findLastIndex**(`predicate`, `thisArg?`): `number`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2023.array.d.ts:41

Returns the index of the last element in the array where predicate is true, and -1
otherwise.

###### Parameters

###### predicate

(`value`, `index`, `array`) => `unknown`

findLastIndex calls predicate once for each element of the array, in descending
order, until it finds one where predicate returns true. If such an element is found,
findLastIndex immediately returns that element index. Otherwise, findLastIndex returns -1.

###### thisArg?

`any`

If provided, it will be used as the this value for each invocation of
predicate. If it is not provided, undefined is used instead.

###### Returns

`number`

###### Inherited from

`Array.findLastIndex`

##### flat()

> **flat**\<`A`, `D`\>(`this`, `depth?`): `FlatArray`\<`A`, `D`\>[]

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2019.array.d.ts:75

Returns a new array with all sub-array elements concatenated into it recursively up to the
specified depth.

###### Type Parameters

###### A

`A`

###### D

`D` *extends* `number` = `1`

###### Parameters

###### this

`A`

###### depth?

`D`

The maximum recursion depth

###### Returns

`FlatArray`\<`A`, `D`\>[]

###### Inherited from

`Array.flat`

##### flatMap()

> **flatMap**\<`U`, `This`\>(`callback`, `thisArg?`): `U`[]

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2019.array.d.ts:64

Calls a defined callback function on each element of an array. Then, flattens the result into
a new array.
This is identical to a map followed by flat with depth 1.

###### Type Parameters

###### U

`U`

###### This

`This` = `undefined`

###### Parameters

###### callback

(`this`, `value`, `index`, `array`) => `U` \| readonly `U`[]

A function that accepts up to three arguments. The flatMap method calls the
callback function one time for each element in the array.

###### thisArg?

`This`

An object to which the this keyword can refer in the callback function. If
thisArg is omitted, undefined is used as the this value.

###### Returns

`U`[]

###### Inherited from

`Array.flatMap`

##### forEach()

> **forEach**(`callbackfn`, `thisArg?`): `void`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1457

Performs the specified action for each element in an array.

###### Parameters

###### callbackfn

(`value`, `index`, `array`) => `void`

A function that accepts up to three arguments. forEach calls the callbackfn function one time for each element in the array.

###### thisArg?

`any`

An object to which the this keyword can refer in the callbackfn function. If thisArg is omitted, undefined is used as the this value.

###### Returns

`void`

###### Inherited from

`Array.forEach`

##### includes()

> **includes**(`searchElement`, `fromIndex?`): `boolean`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2016.array.include.d.ts:25

Determines whether an array includes a certain element, returning true or false as appropriate.

###### Parameters

###### searchElement

[`Fn`](#fn)

The element to search for.

###### fromIndex?

`number`

The position in this array at which to begin searching for searchElement.

###### Returns

`boolean`

###### Inherited from

`Array.includes`

##### indexOf()

> **indexOf**(`searchElement`, `fromIndex?`): `number`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1418

Returns the index of the first occurrence of a value in an array, or -1 if it is not present.

###### Parameters

###### searchElement

[`Fn`](#fn)

The value to locate in the array.

###### fromIndex?

`number`

The array index at which to begin the search. If fromIndex is omitted, the search starts at index 0.

###### Returns

`number`

###### Inherited from

`Array.indexOf`

##### join()

> **join**(`separator?`): `string`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1361

Adds all the elements of an array into a string, separated by the specified separator string.

###### Parameters

###### separator?

`string`

A string used to separate one element of the array from the next in the resulting string. If omitted, the array elements are separated with a comma.

###### Returns

`string`

###### Inherited from

`Array.join`

##### keys()

> **keys**(): `ArrayIterator`\<`number`\>

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2015.iterable.d.ts:88

Returns an iterable of keys in the array

###### Returns

`ArrayIterator`\<`number`\>

###### Inherited from

`Array.keys`

##### lastIndexOf()

> **lastIndexOf**(`searchElement`, `fromIndex?`): `number`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1424

Returns the index of the last occurrence of a specified value in an array, or -1 if it is not present.

###### Parameters

###### searchElement

[`Fn`](#fn)

The value to locate in the array.

###### fromIndex?

`number`

The array index at which to begin searching backward. If fromIndex is omitted, the search starts at the last index in the array.

###### Returns

`number`

###### Inherited from

`Array.lastIndexOf`

##### map()

> **map**\<`U`\>(`callbackfn`, `thisArg?`): `U`[]

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1463

Calls a defined callback function on each element of an array, and returns an array that contains the results.

###### Type Parameters

###### U

`U`

###### Parameters

###### callbackfn

(`value`, `index`, `array`) => `U`

A function that accepts up to three arguments. The map method calls the callbackfn function one time for each element in the array.

###### thisArg?

`any`

An object to which the this keyword can refer in the callbackfn function. If thisArg is omitted, undefined is used as the this value.

###### Returns

`U`[]

###### Inherited from

`Array.map`

##### pop()

> **pop**(): `undefined` \| [`Fn`](#fn)

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1339

Removes the last element from an array and returns it.
If the array is empty, undefined is returned and the array is not modified.

###### Returns

`undefined` \| [`Fn`](#fn)

###### Inherited from

`Array.pop`

##### push()

> **push**(...`items`): `number`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1344

Appends new elements to the end of an array, and returns the new length of the array.

###### Parameters

###### items

...[`Fn`](#fn)[]

New elements to add to the array.

###### Returns

`number`

###### Inherited from

`Array.push`

##### reduce()

###### Call Signature

> **reduce**(`callbackfn`): [`Fn`](#fn)

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1481

Calls the specified callback function for all the elements in an array. The return value of the callback function is the accumulated result, and is provided as an argument in the next call to the callback function.

###### Parameters

###### callbackfn

(`previousValue`, `currentValue`, `currentIndex`, `array`) => [`Fn`](#fn)

A function that accepts up to four arguments. The reduce method calls the callbackfn function one time for each element in the array.

###### Returns

[`Fn`](#fn)

###### Inherited from

`Array.reduce`

###### Call Signature

> **reduce**(`callbackfn`, `initialValue`): [`Fn`](#fn)

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1482

###### Parameters

###### callbackfn

(`previousValue`, `currentValue`, `currentIndex`, `array`) => [`Fn`](#fn)

###### initialValue

[`Fn`](#fn)

###### Returns

[`Fn`](#fn)

###### Inherited from

`Array.reduce`

###### Call Signature

> **reduce**\<`U`\>(`callbackfn`, `initialValue`): `U`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1488

Calls the specified callback function for all the elements in an array. The return value of the callback function is the accumulated result, and is provided as an argument in the next call to the callback function.

###### Type Parameters

###### U

`U`

###### Parameters

###### callbackfn

(`previousValue`, `currentValue`, `currentIndex`, `array`) => `U`

A function that accepts up to four arguments. The reduce method calls the callbackfn function one time for each element in the array.

###### initialValue

`U`

If initialValue is specified, it is used as the initial value to start the accumulation. The first call to the callbackfn function provides this value as an argument instead of an array value.

###### Returns

`U`

###### Inherited from

`Array.reduce`

##### reduceRight()

###### Call Signature

> **reduceRight**(`callbackfn`): [`Fn`](#fn)

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1494

Calls the specified callback function for all the elements in an array, in descending order. The return value of the callback function is the accumulated result, and is provided as an argument in the next call to the callback function.

###### Parameters

###### callbackfn

(`previousValue`, `currentValue`, `currentIndex`, `array`) => [`Fn`](#fn)

A function that accepts up to four arguments. The reduceRight method calls the callbackfn function one time for each element in the array.

###### Returns

[`Fn`](#fn)

###### Inherited from

`Array.reduceRight`

###### Call Signature

> **reduceRight**(`callbackfn`, `initialValue`): [`Fn`](#fn)

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1495

###### Parameters

###### callbackfn

(`previousValue`, `currentValue`, `currentIndex`, `array`) => [`Fn`](#fn)

###### initialValue

[`Fn`](#fn)

###### Returns

[`Fn`](#fn)

###### Inherited from

`Array.reduceRight`

###### Call Signature

> **reduceRight**\<`U`\>(`callbackfn`, `initialValue`): `U`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1501

Calls the specified callback function for all the elements in an array, in descending order. The return value of the callback function is the accumulated result, and is provided as an argument in the next call to the callback function.

###### Type Parameters

###### U

`U`

###### Parameters

###### callbackfn

(`previousValue`, `currentValue`, `currentIndex`, `array`) => `U`

A function that accepts up to four arguments. The reduceRight method calls the callbackfn function one time for each element in the array.

###### initialValue

`U`

If initialValue is specified, it is used as the initial value to start the accumulation. The first call to the callbackfn function provides this value as an argument instead of an array value.

###### Returns

`U`

###### Inherited from

`Array.reduceRight`

##### reverse()

> **reverse**(): [`Fn`](#fn)[]

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1366

Reverses the elements in an array in place.
This method mutates the array and returns a reference to the same array.

###### Returns

[`Fn`](#fn)[]

###### Inherited from

`Array.reverse`

##### shift()

> **shift**(): `undefined` \| [`Fn`](#fn)

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1371

Removes the first element from an array and returns it.
If the array is empty, undefined is returned and the array is not modified.

###### Returns

`undefined` \| [`Fn`](#fn)

###### Inherited from

`Array.shift`

##### slice()

> **slice**(`start?`, `end?`): [`Fn`](#fn)[]

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1381

Returns a copy of a section of an array.
For both start and end, a negative index can be used to indicate an offset from the end of the array.
For example, -2 refers to the second to last element of the array.

###### Parameters

###### start?

`number`

The beginning index of the specified portion of the array.
If start is undefined, then the slice begins at index 0.

###### end?

`number`

The end index of the specified portion of the array. This is exclusive of the element at the index 'end'.
If end is undefined, then the slice extends to the end of the array.

###### Returns

[`Fn`](#fn)[]

###### Inherited from

`Array.slice`

##### some()

> **some**(`predicate`, `thisArg?`): `boolean`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1451

Determines whether the specified callback function returns true for any element of an array.

###### Parameters

###### predicate

(`value`, `index`, `array`) => `unknown`

A function that accepts up to three arguments. The some method calls
the predicate function for each element in the array until the predicate returns a value
which is coercible to the Boolean value true, or until the end of the array.

###### thisArg?

`any`

An object to which the this keyword can refer in the predicate function.
If thisArg is omitted, undefined is used as the this value.

###### Returns

`boolean`

###### Inherited from

`Array.some`

##### sort()

> **sort**(`compareFn?`): `this`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1392

Sorts an array in place.
This method mutates the array and returns a reference to the same array.

###### Parameters

###### compareFn?

(`a`, `b`) => `number`

Function used to determine the order of the elements. It is expected to return
a negative value if the first argument is less than the second argument, zero if they're equal, and a positive
value otherwise. If omitted, the elements are sorted in ascending, UTF-16 code unit order.
```ts
[11,2,22,1].sort((a, b) => a - b)
```

###### Returns

`this`

###### Inherited from

`Array.sort`

##### splice()

###### Call Signature

> **splice**(`start`, `deleteCount?`): [`Fn`](#fn)[]

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1399

Removes elements from an array and, if necessary, inserts new elements in their place, returning the deleted elements.

###### Parameters

###### start

`number`

The zero-based location in the array from which to start removing elements.

###### deleteCount?

`number`

The number of elements to remove.

###### Returns

[`Fn`](#fn)[]

An array containing the elements that were deleted.

###### Inherited from

`Array.splice`

###### Call Signature

> **splice**(`start`, `deleteCount`, ...`items`): [`Fn`](#fn)[]

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1407

Removes elements from an array and, if necessary, inserts new elements in their place, returning the deleted elements.

###### Parameters

###### start

`number`

The zero-based location in the array from which to start removing elements.

###### deleteCount

`number`

The number of elements to remove.

###### items

...[`Fn`](#fn)[]

Elements to insert into the array in place of the deleted elements.

###### Returns

[`Fn`](#fn)[]

An array containing the elements that were deleted.

###### Inherited from

`Array.splice`

##### toLocaleString()

###### Call Signature

> **toLocaleString**(): `string`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1334

Returns a string representation of an array. The elements are converted to string using their toLocaleString methods.

###### Returns

`string`

###### Inherited from

`Array.toLocaleString`

###### Call Signature

> **toLocaleString**(`locales`, `options?`): `string`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2015.core.d.ts:64

###### Parameters

###### locales

`string` | `string`[]

###### options?

`NumberFormatOptions` & `DateTimeFormatOptions`

###### Returns

`string`

###### Inherited from

`Array.toLocaleString`

##### toReversed()

> **toReversed**(): [`Fn`](#fn)[]

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2023.array.d.ts:46

Returns a copy of an array with its elements reversed.

###### Returns

[`Fn`](#fn)[]

###### Inherited from

`Array.toReversed`

##### toSorted()

> **toSorted**(`compareFn?`): [`Fn`](#fn)[]

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2023.array.d.ts:57

Returns a copy of an array with its elements sorted.

###### Parameters

###### compareFn?

(`a`, `b`) => `number`

Function used to determine the order of the elements. It is expected to return
a negative value if the first argument is less than the second argument, zero if they're equal, and a positive
value otherwise. If omitted, the elements are sorted in ascending, UTF-16 code unit order.
```ts
[11, 2, 22, 1].toSorted((a, b) => a - b) // [1, 2, 11, 22]
```

###### Returns

[`Fn`](#fn)[]

###### Inherited from

`Array.toSorted`

##### toSpliced()

###### Call Signature

> **toSpliced**(`start`, `deleteCount`, ...`items`): [`Fn`](#fn)[]

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2023.array.d.ts:66

Copies an array and removes elements and, if necessary, inserts new elements in their place. Returns the copied array.

###### Parameters

###### start

`number`

The zero-based location in the array from which to start removing elements.

###### deleteCount

`number`

The number of elements to remove.

###### items

...[`Fn`](#fn)[]

Elements to insert into the copied array in place of the deleted elements.

###### Returns

[`Fn`](#fn)[]

The copied array.

###### Inherited from

`Array.toSpliced`

###### Call Signature

> **toSpliced**(`start`, `deleteCount?`): [`Fn`](#fn)[]

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2023.array.d.ts:74

Copies an array and removes elements while returning the remaining elements.

###### Parameters

###### start

`number`

The zero-based location in the array from which to start removing elements.

###### deleteCount?

`number`

The number of elements to remove.

###### Returns

[`Fn`](#fn)[]

A copy of the original array with the remaining elements.

###### Inherited from

`Array.toSpliced`

##### toString()

> **toString**(): `string`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1330

Returns a string representation of an array.

###### Returns

`string`

###### Inherited from

`Array.toString`

##### unshift()

> **unshift**(...`items`): `number`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es5.d.ts:1412

Inserts new elements at the start of an array, and returns the new length of the array.

###### Parameters

###### items

...[`Fn`](#fn)[]

Elements to insert at the start of the array.

###### Returns

`number`

###### Inherited from

`Array.unshift`

##### values()

> **values**(): `ArrayIterator`\<[`Fn`](#fn)\>

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2015.iterable.d.ts:93

Returns an iterable of values in the array

###### Returns

`ArrayIterator`\<[`Fn`](#fn)\>

###### Inherited from

`Array.values`

##### with()

> **with**(`index`, `value`): [`Fn`](#fn)[]

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2023.array.d.ts:85

Copies an array, then overwrites the value at the provided index with the
given value. If the index is negative, then it replaces from the end
of the array.

###### Parameters

###### index

`number`

The index of the value to overwrite. If the index is
negative, then it replaces from the end of the array.

###### value

[`Fn`](#fn)

The value to write into the copied array.

###### Returns

[`Fn`](#fn)[]

The copied array with the updated value.

###### Inherited from

`Array.with`

***

### RecordAtom()\<T\>

Defined in: [packages/core/src/primitives/reatomRecord.ts:6](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomRecord.ts#L6)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Extends

- [`Atom`](#atom)\<`T`\>

#### Type Parameters

##### T

`T` *extends* [`Rec`](#rec)

The type of state stored in the atom

> **RecordAtom**(...`params`): `T`

Defined in: [packages/core/src/primitives/reatomRecord.ts:6](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomRecord.ts#L6)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Parameters

##### params

...\[\]

Parameters to pass to the atom

#### Returns

`T`

The atom's payload (typically its current state)

#### Properties

##### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#atommeta)

Defined in: [packages/core/src/core/atom.ts:101](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L101)

Reference to the atom's internal metadata.

###### Inherited from

[`Atom`](#atom).[`__reatom`](#__reatom-3)

##### actions

> **actions**: [`Actions`](#actions-26)\<[`RecordAtom`](#recordatom)\<`T`\>\>

Defined in: [packages/core/src/core/atom.ts:81](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L81)

Bind methods to the atom to extend its functionality.

###### Inherited from

[`Atom`](#atom).[`actions`](#actions-3)

##### extend

> **extend**: [`Extend`](#extend-10)\<[`RecordAtom`](#recordatom)\<`T`\>\>

Defined in: [packages/core/src/core/atom.ts:87](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L87)

Extension system to add capabilities to atoms. Allows adding middleware,
methods, or other functionality to modify atom behavior.

###### Inherited from

[`Atom`](#atom).[`extend`](#extend-3)

##### merge

> **merge**: [`Action`](#action)\<\[`Partial`\<`T`\>\], `T`\>

Defined in: [packages/core/src/primitives/reatomRecord.ts:7](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomRecord.ts#L7)

##### omit

> **omit**: [`Action`](#action)\<keyof `T`[], `T`\>

Defined in: [packages/core/src/primitives/reatomRecord.ts:8](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomRecord.ts#L8)

##### reset

> **reset**: [`Action`](#action)\<keyof `T`[], `T`\>

Defined in: [packages/core/src/primitives/reatomRecord.ts:9](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomRecord.ts#L9)

##### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#unsubscribe-2)

Defined in: [packages/core/src/core/atom.ts:98](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L98)

Subscribe to state changes, with the first call happening immediately. When
a subscriber is added, the callback is immediately invoked with the current
state. After that, it's called whenever the atom's state changes.

###### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it
  changes

###### Returns

[`Unsubscribe`](#unsubscribe-2)

An unsubscribe function that removes the subscription when called

###### Inherited from

[`Atom`](#atom).[`subscribe`](#subscribe-3)

#### Methods

##### set()

###### Call Signature

> **set**(`update`): `T`

Defined in: [packages/core/src/core/atom.ts:122](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L122)

Update the atom's state using a function that receives the previous state

###### Parameters

###### update

(`state`) => `T`

Function that takes the current state and returns a new
  state

###### Returns

`T`

The new state value

###### Inherited from

[`Atom`](#atom).[`set`](#set-9)

###### Call Signature

> **set**(...`params`): `T`

Defined in: [packages/core/src/core/atom.ts:130](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L130)

Set the atom's state to a new value

###### Parameters

###### params

...\[`T`\]

###### Returns

`T`

The new state value

###### Inherited from

[`Atom`](#atom).[`set`](#set-9)

***

### RootFrame

Defined in: [packages/core/src/core/atom.ts:289](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L289)

Special frame type for the context atom.

#### Extends

- [`Frame`](#frame)\<[`RootState`](#rootstate), \[\]\>

#### Properties

##### atom

> `readonly` **atom**: [`AtomLike`](#atomlike)\<[`RootState`](#rootstate), \[\], [`RootState`](#rootstate)\>

Defined in: [packages/core/src/core/atom.ts:169](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L169)

Reference to the atom itself

###### Inherited from

[`Frame`](#frame).[`atom`](#atom-2)

##### error

> **error**: `null` \| \{ \}

Defined in: [packages/core/src/core/atom.ts:160](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L160)

Error that occurred during atom evaluation, or null if successful

###### Inherited from

[`Frame`](#frame).[`error`](#error-4)

##### pubs

> **pubs**: \[`null` \| [`Frame`](#frame)\<`any`, `any`[], `any`\>, `...dependencies: Frame<any, any[], any>[]`\]

Defined in: [packages/core/src/core/atom.ts:176](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L176)

Immutable list of dependencies. The first element is actualization flag and
an imperative write cause. Subsequent elements are the atom's
dependencies.

###### Inherited from

[`Frame`](#frame).[`pubs`](#pubs)

##### root

> `readonly` **root**: [`RootState`](#rootstate)

Defined in: [packages/core/src/core/atom.ts:192](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L192)

The root frame state with all meta information

###### Inherited from

[`Frame`](#frame).[`root`](#root)

##### state

> **state**: [`RootState`](#rootstate)

Defined in: [packages/core/src/core/atom.ts:163](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L163)

Current state of the atom

###### Inherited from

[`Frame`](#frame).[`state`](#state-12)

##### subs

> `readonly` **subs**: [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\>[]

Defined in: [packages/core/src/core/atom.ts:179](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L179)

Array of atoms that depend on this atom (subscribers).

###### Inherited from

[`Frame`](#frame).[`subs`](#subs)

#### Methods

##### run()

> **run**\<`I`, `O`\>(`fn`, ...`params`): `O`

Defined in: [packages/core/src/core/atom.ts:189](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L189)

Run the callback in this context. DO NOT USE directly, use `wrap` instead
to preserve context correctly.

###### Type Parameters

###### I

`I` *extends* `any`[]

###### O

`O`

###### Parameters

###### fn

(...`params`) => `O`

Function to execute in this context

###### params

...`I`

Parameters to pass to the function

###### Returns

`O`

The result of the function call

###### Inherited from

[`Frame`](#frame).[`run`](#run-2)

***

### RootState

Defined in: [packages/core/src/core/atom.ts:248](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L248)

Reatom's execution context that manages reactive state.

The context handles tracking relationships between atoms, scheduling
operations, and maintaining the execution stack during Reatom operations.

#### Properties

##### cleanup

> **cleanup**: [`Queue`](#queue)

Defined in: [packages/core/src/core/atom.ts:271](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L271)

Queue for cleanup callbacks to be executed.

##### compute

> **compute**: [`Queue`](#queue)

Defined in: [packages/core/src/core/atom.ts:268](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L268)

Queue for computation callbacks to be executed.

##### effect

> **effect**: [`Queue`](#queue)

Defined in: [packages/core/src/core/atom.ts:274](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L274)

Queue for effect callbacks to be executed.

##### frame

> **frame**: [`RootFrame`](#rootframe)

Defined in: [packages/core/src/core/atom.ts:285](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L285)

Link to itself frame for internal use

##### frames

> **frames**: `WeakMap`\<[`AtomLike`](#atomlike)\<`any`, `any`[], `any`\>, \{ `next`: [`Frame`](#frame); `prev`: `null` \| [`Frame`](#frame)\<`any`, `any`[], `any`\>; \}\>

Defined in: [packages/core/src/core/atom.ts:253](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L253)

Frame history.

##### hook

> **hook**: [`Queue`](#queue)

Defined in: [packages/core/src/core/atom.ts:265](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L265)

Queue for hook callbacks to be executed.

##### inits

> **inits**: `WeakMap`\<`WeakKey`, `any`\>

Defined in: [packages/core/src/core/atom.ts:256](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L256)

Initialization flags for init hooks.

##### selects

> **selects**: `WeakMap`\<[`AtomLike`](#atomlike)\<`any`, `any`[], `any`\>, `Record`\<`string`, [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\>\>\>

Defined in: [packages/core/src/core/atom.ts:259](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L259)

Cache for memoized selectors, keyed by source function.

##### store

> **store**: [`Store`](#store-1)

Defined in: [packages/core/src/core/atom.ts:250](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L250)

Store that maps atoms to their frames in this context.

##### variables

> **variables**: `WeakMap`\<[`Frame`](#frame)\<`any`, `any`[], `any`\>, `WeakMap`\<`WeakKey`, `any`\>\>

Defined in: [packages/core/src/core/atom.ts:262](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L262)

Async variables maps.

#### Methods

##### pushQueue()

> **pushQueue**(`cb`, `queue`): `void`

Defined in: [packages/core/src/core/atom.ts:282](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L282)

Add a callback to a specific queue for later execution.

###### Parameters

###### cb

[`Fn`](#fn)

Callback function to schedule

###### queue

Queue to add the callback to

`"hook"` | `"compute"` | `"cleanup"` | `"effect"`

###### Returns

`void`

***

### RouteAtom()\<Path, Params, Search, Payload, InputParams, InputSearch\>

Defined in: [packages/core/src/web/route.ts:155](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/route.ts#L155)

Derived state container.

A computed atom automatically tracks dependencies and recalculates only when
those dependencies change. The calculation is performed lazily, only when the
computed value is read AND subscribed to.

#### Extends

- [`Computed`](#computed)\<`null` \| [`Plain`](#plain)\<`Params` & `Search`\>\>.[`RouteMixin`](#routemixin)\<`Path`, `Params`\>

#### Type Parameters

##### Path

`Path` *extends* `string` = `string`

The type of derived state

##### Params

`Params` *extends* [`PathKeys`](#pathkeys)\<`Path`\> = [`PathParams`](#pathparams)\<`Path`\>

##### Search

`Search` *extends* [`Rec`](#rec)\<`string`\> = \{ \}

##### Payload

`Payload` = [`Plain`](#plain)\<`Params` & `Search`\>

##### InputParams

`InputParams` = `Params`

##### InputSearch

`InputSearch` = `Search`

> **RouteAtom**(...`params`): `null` \| [`Plain`](#plain)\<`Params` & `Search`\>

Defined in: [packages/core/src/web/route.ts:155](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/route.ts#L155)

Derived state container.

A computed atom automatically tracks dependencies and recalculates only when
those dependencies change. The calculation is performed lazily, only when the
computed value is read AND subscribed to.

#### Parameters

##### params

...\[\]

Parameters to pass to the atom

#### Returns

`null` \| [`Plain`](#plain)\<`Params` & `Search`\>

The atom's payload (typically its current state)

#### Properties

##### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#atommeta)

Defined in: [packages/core/src/core/atom.ts:101](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L101)

Reference to the atom's internal metadata.

###### Inherited from

[`Computed`](#computed).[`__reatom`](#__reatom-7)

##### actions

> **actions**: [`Actions`](#actions-26)\<[`RouteAtom`](#routeatom)\<`Path`, `Params`, `Search`, `Payload`, `InputParams`, `InputSearch`\>\>

Defined in: [packages/core/src/core/atom.ts:81](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L81)

Bind methods to the atom to extend its functionality.

###### Inherited from

[`Computed`](#computed).[`actions`](#actions-7)

##### exact

> **exact**: [`Computed`](#computed)\<`boolean`\>

Defined in: [packages/core/src/web/route.ts:171](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/route.ts#L171)

##### extend

> **extend**: [`Extend`](#extend-10)\<[`RouteAtom`](#routeatom)\<`Path`, `Params`, `Search`, `Payload`, `InputParams`, `InputSearch`\>\>

Defined in: [packages/core/src/core/atom.ts:87](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L87)

Extension system to add capabilities to atoms. Allows adding middleware,
methods, or other functionality to modify atom behavior.

###### Inherited from

[`Computed`](#computed).[`extend`](#extend-7)

##### go

> **go**: [`Action`](#action)\<\[`MaybeVoid`\<`InputParams` & `InputSearch`\>, `boolean`\], `URL`\>

Defined in: [packages/core/src/web/route.ts:164](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/route.ts#L164)

##### loader

> **loader**: [`RouteLoader`](#routeloader)\<[`Plain`](#plain)\<`Params` & `Search`\>, `Payload`\>

Defined in: [packages/core/src/web/route.ts:169](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/route.ts#L169)

##### path()

> **path**: (`params`) => `string`

Defined in: [packages/core/src/web/route.ts:175](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/route.ts#L175)

###### Parameters

###### params

`MaybeVoid`\<`InputParams` & `InputSearch`\>

###### Returns

`string`

##### pattern

> **pattern**: `Path`

Defined in: [packages/core/src/web/route.ts:173](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/route.ts#L173)

##### ~~route()~~

> **route**: \{\<`SubPath`\>(`path`, `name?`): [`RouteAtom`](#routeatom)\<`` `${Path}/${SubPath}` ``, [`Plain`](#plain)\<`Params` & [`PathParams`](#pathparams)\<`SubPath`\>\>, \{ \}, \{ \}\>; \<`SubPath`, `SubParams`, `SubSearch`, `SubParamsOutput`, `SubSearchOutput`, `LoaderParams`, `Payload`\>(`options`, `name?`): [`RouteAtom`](#routeatom)\<`` `${Path extends `${Path}?` ? Path : Path}/${SubPath}` ``, [`Plain`](#plain)\<`Params` & `SubParamsOutput`\>, [`Plain`](#plain)\<`SubSearchOutput`\>, `Payload`, [`Plain`](#plain)\<`Params` & `SubParams`\>, [`Plain`](#plain)\<`SubSearch`\>\>; \}

Defined in: [packages/core/src/web/route.ts:128](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/route.ts#L128)

###### Call Signature

> \<`SubPath`\>(`path`, `name?`): [`RouteAtom`](#routeatom)\<`` `${Path}/${SubPath}` ``, [`Plain`](#plain)\<`Params` & [`PathParams`](#pathparams)\<`SubPath`\>\>, \{ \}, \{ \}\>

Create a sub-route by appending a path pattern to the current route.

###### Type Parameters

###### SubPath

`SubPath` *extends* `string`

###### Parameters

###### path

`SubPath`

The sub-path pattern to append (e.g., 'users', ':userId',
  'posts/:postId?')

###### name?

`string`

###### Returns

[`RouteAtom`](#routeatom)\<`` `${Path}/${SubPath}` ``, [`Plain`](#plain)\<`Params` & [`PathParams`](#pathparams)\<`SubPath`\>\>, \{ \}, \{ \}\>

A new RouteAtom for the combined path pattern

###### Example

```ts
const usersRoute = reatomRoute('users') // Creates /users route
  const userRoute = usersRoute.reatomRoute(':userId') // Creates /users/:userId route
```

###### Call Signature

> \<`SubPath`, `SubParams`, `SubSearch`, `SubParamsOutput`, `SubSearchOutput`, `LoaderParams`, `Payload`\>(`options`, `name?`): [`RouteAtom`](#routeatom)\<`` `${Path extends `${Path}?` ? Path : Path}/${SubPath}` ``, [`Plain`](#plain)\<`Params` & `SubParamsOutput`\>, [`Plain`](#plain)\<`SubSearchOutput`\>, `Payload`, [`Plain`](#plain)\<`Params` & `SubParams`\>, [`Plain`](#plain)\<`SubSearch`\>\>

Create a sub-route with validation schemas for parameters and search
params.

###### Type Parameters

###### SubPath

`SubPath` *extends* `string` = `""`

###### SubParams

`SubParams` *extends* [`PathKeys`](#pathkeys)\<`SubPath`\> = [`PathParams`](#pathparams)\<`SubPath`\>

###### SubSearch

`SubSearch` *extends* `Partial`\<[`Rec`](#rec)\<`string`\>\> = \{ \}

###### SubParamsOutput

`SubParamsOutput` = `SubParams`

###### SubSearchOutput

`SubSearchOutput` = `SubSearch`

###### LoaderParams

`LoaderParams` = [`Plain`](#plain)\<`Params` & `SubParamsOutput` & `SubSearchOutput`\>

###### Payload

`Payload` = `LoaderParams`

###### Parameters

###### options

[`RouteOptions`](#routeoptions)\<`SubPath`, `SubParams`, `SubSearch`, `SubParamsOutput`, `SubSearchOutput`, `LoaderParams`, `Payload`\>

Route configuration object or just a path string

###### name?

`string`

###### Returns

[`RouteAtom`](#routeatom)\<`` `${Path extends `${Path}?` ? Path : Path}/${SubPath}` ``, [`Plain`](#plain)\<`Params` & `SubParamsOutput`\>, [`Plain`](#plain)\<`SubSearchOutput`\>, `Payload`, [`Plain`](#plain)\<`Params` & `SubParams`\>, [`Plain`](#plain)\<`SubSearch`\>\>

A new RouteAtom for the combined path with validation

###### Example

```ts
import { z } from 'zod'

  const userRoute = reatomRoute({
    path: 'user/:id',
    params: z.object({ id: z.number() }), // Should match the path
    search: z.object({ sort: z.enum(['asc', 'desc']).optional() }),
  })

  // Navigate with validated params
  userRoute.go({ id: 123, tab: 'profile' })
```

###### Deprecated

Use `reatomRoute` instead

###### Inherited from

[`RouteMixin`](#routemixin).[`route`](#route-1)

##### set

> **set**: `unknown`

Defined in: [packages/core/src/core/atom.ts:78](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L78)

###### Inherited from

[`Computed`](#computed).[`set`](#set-17)

##### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#unsubscribe-2)

Defined in: [packages/core/src/core/atom.ts:98](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L98)

Subscribe to state changes, with the first call happening immediately. When
a subscriber is added, the callback is immediately invoked with the current
state. After that, it's called whenever the atom's state changes.

###### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it
  changes

###### Returns

[`Unsubscribe`](#unsubscribe-2)

An unsubscribe function that removes the subscription when called

###### Inherited from

[`Computed`](#computed).[`subscribe`](#subscribe-7)

#### Methods

##### reatomRoute()

###### Call Signature

> **reatomRoute**\<`SubPath`\>(`path`, `name?`): [`RouteAtom`](#routeatom)\<`` `${Path}/${SubPath}` ``, [`Plain`](#plain)\<`Params` & [`PathParams`](#pathparams)\<`SubPath`\>\>, \{ \}, \{ \}\>

Defined in: [packages/core/src/web/route.ts:64](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/route.ts#L64)

Create a sub-route by appending a path pattern to the current route.

###### Type Parameters

###### SubPath

`SubPath` *extends* `string`

###### Parameters

###### path

`SubPath`

The sub-path pattern to append (e.g., 'users', ':userId',
  'posts/:postId?')

###### name?

`string`

###### Returns

[`RouteAtom`](#routeatom)\<`` `${Path}/${SubPath}` ``, [`Plain`](#plain)\<`Params` & [`PathParams`](#pathparams)\<`SubPath`\>\>, \{ \}, \{ \}\>

A new RouteAtom for the combined path pattern

###### Example

```ts
const usersRoute = reatomRoute('users') // Creates /users route
  const userRoute = usersRoute.reatomRoute(':userId') // Creates /users/:userId route
```

###### Inherited from

[`RouteMixin`](#routemixin).[`reatomRoute`](#reatomroute-3)

###### Call Signature

> **reatomRoute**\<`SubPath`, `SubParams`, `SubSearch`, `SubParamsOutput`, `SubSearchOutput`, `LoaderParams`, `Payload`\>(`options`, `name?`): [`RouteAtom`](#routeatom)\<`` `${Path extends `${Path}?` ? Path : Path}/${SubPath}` ``, [`Plain`](#plain)\<`Params` & `SubParamsOutput`\>, [`Plain`](#plain)\<`SubSearchOutput`\>, `Payload`, [`Plain`](#plain)\<`Params` & `SubParams`\>, [`Plain`](#plain)\<`SubSearch`\>\>

Defined in: [packages/core/src/web/route.ts:98](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/route.ts#L98)

Create a sub-route with validation schemas for parameters and search
params.

###### Type Parameters

###### SubPath

`SubPath` *extends* `string` = `""`

###### SubParams

`SubParams` *extends* [`PathKeys`](#pathkeys)\<`SubPath`\> = [`PathParams`](#pathparams)\<`SubPath`\>

###### SubSearch

`SubSearch` *extends* `Partial`\<[`Rec`](#rec)\<`string`\>\> = \{ \}

###### SubParamsOutput

`SubParamsOutput` = `SubParams`

###### SubSearchOutput

`SubSearchOutput` = `SubSearch`

###### LoaderParams

`LoaderParams` = [`Plain`](#plain)\<`Params` & `SubParamsOutput` & `SubSearchOutput`\>

###### Payload

`Payload` = `LoaderParams`

###### Parameters

###### options

[`RouteOptions`](#routeoptions)\<`SubPath`, `SubParams`, `SubSearch`, `SubParamsOutput`, `SubSearchOutput`, `LoaderParams`, `Payload`\>

Route configuration object or just a path string

###### name?

`string`

###### Returns

[`RouteAtom`](#routeatom)\<`` `${Path extends `${Path}?` ? Path : Path}/${SubPath}` ``, [`Plain`](#plain)\<`Params` & `SubParamsOutput`\>, [`Plain`](#plain)\<`SubSearchOutput`\>, `Payload`, [`Plain`](#plain)\<`Params` & `SubParams`\>, [`Plain`](#plain)\<`SubSearch`\>\>

A new RouteAtom for the combined path with validation

###### Example

```ts
import { z } from 'zod'

  const userRoute = reatomRoute({
    path: 'user/:id',
    params: z.object({ id: z.number() }), // Should match the path
    search: z.object({ sort: z.enum(['asc', 'desc']).optional() }),
  })

  // Navigate with validated params
  userRoute.go({ id: 123, tab: 'profile' })
```

###### Inherited from

[`RouteMixin`](#routemixin).[`reatomRoute`](#reatomroute-3)

***

### RouteLoader()\<Params, Payload\>

Defined in: [packages/core/src/web/route.ts:151](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/route.ts#L151)

Derived state container.

A computed atom automatically tracks dependencies and recalculates only when
those dependencies change. The calculation is performed lazily, only when the
computed value is read AND subscribed to.

#### Extends

- [`Computed`](#computed)\<`Promise`\<`Payload`\>\>.[`AsyncDataExt`](#asyncdataext)\<\[`Params`\], `Payload`, `undefined` \| `Payload`, `Error` \| `undefined`\>

#### Type Parameters

##### Params

`Params` *extends* [`Rec`](#rec) = [`Rec`](#rec)

The type of derived state

##### Payload

`Payload` = `any`

> **RouteLoader**(...`params`): `Promise`

Defined in: [packages/core/src/web/route.ts:151](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/route.ts#L151)

Derived state container.

A computed atom automatically tracks dependencies and recalculates only when
those dependencies change. The calculation is performed lazily, only when the
computed value is read AND subscribed to.

#### Parameters

##### params

...\[\]

Parameters to pass to the atom

#### Returns

`Promise`

The atom's payload (typically its current state)

#### Properties

##### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#atommeta)

Defined in: [packages/core/src/core/atom.ts:101](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L101)

Reference to the atom's internal metadata.

###### Inherited from

[`Computed`](#computed).[`__reatom`](#__reatom-7)

##### abort

> **abort**: [`Action`](#action)\<\[`any`\]\>

Defined in: [packages/core/src/mixins/withAbort.ts:11](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/mixins/withAbort.ts#L11)

###### Inherited from

[`AsyncDataExt`](#asyncdataext).[`abort`](#abort-3)

##### actions

> **actions**: [`Actions`](#actions-26)\<[`RouteLoader`](#routeloader)\<`Params`, `Payload`\>\>

Defined in: [packages/core/src/core/atom.ts:81](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L81)

Bind methods to the atom to extend its functionality.

###### Inherited from

[`Computed`](#computed).[`actions`](#actions-7)

##### data

> **data**: [`Atom`](#atom)\<`undefined` \| `Payload`\>

Defined in: [packages/core/src/async/withAsyncData.ts:31](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/async/withAsyncData.ts#L31)

Atom that stores the fetched data Updated automatically when the async
operation completes successfully

###### Inherited from

[`AsyncDataExt`](#asyncdataext).[`data`](#data)

##### error

> **error**: [`Atom`](#atom)\<`undefined` \| `Error`\>

Defined in: [packages/core/src/async/withAsync.ts:81](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/async/withAsync.ts#L81)

Atom containing the most recent error or undefined if no error has occurred

###### Inherited from

[`AsyncDataExt`](#asyncdataext).[`error`](#error-1)

##### extend

> **extend**: [`Extend`](#extend-10)\<[`RouteLoader`](#routeloader)\<`Params`, `Payload`\>\>

Defined in: [packages/core/src/core/atom.ts:87](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L87)

Extension system to add capabilities to atoms. Allows adding middleware,
methods, or other functionality to modify atom behavior.

###### Inherited from

[`Computed`](#computed).[`extend`](#extend-7)

##### onFulfill

> **onFulfill**: [`Action`](#action)\<\[`Payload`, \[`Params`\]\], \{ `params`: \[`Params`\]; `payload`: `Payload`; \}\>

Defined in: [packages/core/src/async/withAsync.ts:45](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/async/withAsync.ts#L45)

Action that is called when the promise resolves successfully

###### Param

The resolved value from the promise

###### Param

The original parameters passed to the atom/action

###### Returns

An object containing the payload and parameters

###### Inherited from

[`AsyncDataExt`](#asyncdataext).[`onFulfill`](#onfulfill)

##### onReject

> **onReject**: [`Action`](#action)\<\[`Error`, \[`Params`\]\], \{ `error`: `undefined` \| `Error`; `params`: \[`Params`\]; \}\>

Defined in: [packages/core/src/async/withAsync.ts:57](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/async/withAsync.ts#L57)

Action that is called when the promise rejects with an error

###### Param

The error thrown by the promise

###### Param

The original parameters passed to the atom/action

###### Returns

An object containing the error and parameters

###### Inherited from

[`AsyncDataExt`](#asyncdataext).[`onReject`](#onreject)

##### onSettle

> **onSettle**: [`Action`](#action)\<\[\{ `params`: \[`Params`\]; `payload`: `Payload`; \} \| \{ `error`: `undefined` \| `Error`; `params`: \[`Params`\]; \}\], \{ `params`: \[`Params`\]; `payload`: `Payload`; \} \| \{ `error`: `undefined` \| `Error`; `params`: \[`Params`\]; \}\>

Defined in: [packages/core/src/async/withAsync.ts:68](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/async/withAsync.ts#L68)

Action called after either successful resolution or rejection

###### Param

Either a payload+params object or an error+params object

###### Returns

The same result object that was passed in

###### Inherited from

[`AsyncDataExt`](#asyncdataext).[`onSettle`](#onsettle)

##### pending

> **pending**: [`Computed`](#computed)\<`number`\>

Defined in: [packages/core/src/async/withAsync.ts:78](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/async/withAsync.ts#L78)

Computed atom tracking how many async operations are currently pending

###### Returns

Number of pending operations (0 when none are pending)

###### Inherited from

[`AsyncDataExt`](#asyncdataext).[`pending`](#pending)

##### ready

> **ready**: [`Computed`](#computed)\<`boolean`\>

Defined in: [packages/core/src/async/withAsync.ts:36](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/async/withAsync.ts#L36)

Computed atom that indicates when no async operations are pending

###### Returns

Boolean indicating if all operations have completed (true) or some
  are still pending (false)

###### Inherited from

[`AsyncDataExt`](#asyncdataext).[`ready`](#ready)

##### set

> **set**: `unknown`

Defined in: [packages/core/src/core/atom.ts:78](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L78)

###### Inherited from

[`Computed`](#computed).[`set`](#set-17)

##### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#unsubscribe-2)

Defined in: [packages/core/src/core/atom.ts:98](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L98)

Subscribe to state changes, with the first call happening immediately. When
a subscriber is added, the callback is immediately invoked with the current
state. After that, it's called whenever the atom's state changes.

###### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it
  changes

###### Returns

[`Unsubscribe`](#unsubscribe-2)

An unsubscribe function that removes the subscription when called

###### Inherited from

[`Computed`](#computed).[`subscribe`](#subscribe-7)

***

### RouteMixin\<Path, Params\>

Defined in: [packages/core/src/web/route.ts:49](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/route.ts#L49)

#### Extended by

- [`RouteAtom`](#routeatom)

#### Type Parameters

##### Path

`Path` *extends* `string`

##### Params

`Params` *extends* [`PathKeys`](#pathkeys)\<`Path`\> = [`PathParams`](#pathparams)\<`Path`\>

#### Properties

##### ~~route()~~

> **route**: \{\<`SubPath`\>(`path`, `name?`): [`RouteAtom`](#routeatom)\<`` `${Path}/${SubPath}` ``, [`Plain`](#plain)\<`Params` & [`PathParams`](#pathparams)\<`SubPath`\>\>, \{ \}, \{ \}\>; \<`SubPath`, `SubParams`, `SubSearch`, `SubParamsOutput`, `SubSearchOutput`, `LoaderParams`, `Payload`\>(`options`, `name?`): [`RouteAtom`](#routeatom)\<`` `${Path extends `${Path}?` ? Path : Path}/${SubPath}` ``, [`Plain`](#plain)\<`Params` & `SubParamsOutput`\>, [`Plain`](#plain)\<`SubSearchOutput`\>, `Payload`, [`Plain`](#plain)\<`Params` & `SubParams`\>, [`Plain`](#plain)\<`SubSearch`\>\>; \}

Defined in: [packages/core/src/web/route.ts:128](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/route.ts#L128)

###### Call Signature

> \<`SubPath`\>(`path`, `name?`): [`RouteAtom`](#routeatom)\<`` `${Path}/${SubPath}` ``, [`Plain`](#plain)\<`Params` & [`PathParams`](#pathparams)\<`SubPath`\>\>, \{ \}, \{ \}\>

Create a sub-route by appending a path pattern to the current route.

###### Type Parameters

###### SubPath

`SubPath` *extends* `string`

###### Parameters

###### path

`SubPath`

The sub-path pattern to append (e.g., 'users', ':userId',
  'posts/:postId?')

###### name?

`string`

###### Returns

[`RouteAtom`](#routeatom)\<`` `${Path}/${SubPath}` ``, [`Plain`](#plain)\<`Params` & [`PathParams`](#pathparams)\<`SubPath`\>\>, \{ \}, \{ \}\>

A new RouteAtom for the combined path pattern

###### Example

```ts
const usersRoute = reatomRoute('users') // Creates /users route
  const userRoute = usersRoute.reatomRoute(':userId') // Creates /users/:userId route
```

###### Call Signature

> \<`SubPath`, `SubParams`, `SubSearch`, `SubParamsOutput`, `SubSearchOutput`, `LoaderParams`, `Payload`\>(`options`, `name?`): [`RouteAtom`](#routeatom)\<`` `${Path extends `${Path}?` ? Path : Path}/${SubPath}` ``, [`Plain`](#plain)\<`Params` & `SubParamsOutput`\>, [`Plain`](#plain)\<`SubSearchOutput`\>, `Payload`, [`Plain`](#plain)\<`Params` & `SubParams`\>, [`Plain`](#plain)\<`SubSearch`\>\>

Create a sub-route with validation schemas for parameters and search
params.

###### Type Parameters

###### SubPath

`SubPath` *extends* `string` = `""`

###### SubParams

`SubParams` *extends* [`PathKeys`](#pathkeys)\<`SubPath`\> = [`PathParams`](#pathparams)\<`SubPath`\>

###### SubSearch

`SubSearch` *extends* `Partial`\<[`Rec`](#rec)\<`string`\>\> = \{ \}

###### SubParamsOutput

`SubParamsOutput` = `SubParams`

###### SubSearchOutput

`SubSearchOutput` = `SubSearch`

###### LoaderParams

`LoaderParams` = [`Plain`](#plain)\<`Params` & `SubParamsOutput` & `SubSearchOutput`\>

###### Payload

`Payload` = `LoaderParams`

###### Parameters

###### options

[`RouteOptions`](#routeoptions)\<`SubPath`, `SubParams`, `SubSearch`, `SubParamsOutput`, `SubSearchOutput`, `LoaderParams`, `Payload`\>

Route configuration object or just a path string

###### name?

`string`

###### Returns

[`RouteAtom`](#routeatom)\<`` `${Path extends `${Path}?` ? Path : Path}/${SubPath}` ``, [`Plain`](#plain)\<`Params` & `SubParamsOutput`\>, [`Plain`](#plain)\<`SubSearchOutput`\>, `Payload`, [`Plain`](#plain)\<`Params` & `SubParams`\>, [`Plain`](#plain)\<`SubSearch`\>\>

A new RouteAtom for the combined path with validation

###### Example

```ts
import { z } from 'zod'

  const userRoute = reatomRoute({
    path: 'user/:id',
    params: z.object({ id: z.number() }), // Should match the path
    search: z.object({ sort: z.enum(['asc', 'desc']).optional() }),
  })

  // Navigate with validated params
  userRoute.go({ id: 123, tab: 'profile' })
```

###### Deprecated

Use `reatomRoute` instead

#### Methods

##### reatomRoute()

###### Call Signature

> **reatomRoute**\<`SubPath`\>(`path`, `name?`): [`RouteAtom`](#routeatom)\<`` `${Path}/${SubPath}` ``, [`Plain`](#plain)\<`Params` & [`PathParams`](#pathparams)\<`SubPath`\>\>, \{ \}, \{ \}\>

Defined in: [packages/core/src/web/route.ts:64](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/route.ts#L64)

Create a sub-route by appending a path pattern to the current route.

###### Type Parameters

###### SubPath

`SubPath` *extends* `string`

###### Parameters

###### path

`SubPath`

The sub-path pattern to append (e.g., 'users', ':userId',
  'posts/:postId?')

###### name?

`string`

###### Returns

[`RouteAtom`](#routeatom)\<`` `${Path}/${SubPath}` ``, [`Plain`](#plain)\<`Params` & [`PathParams`](#pathparams)\<`SubPath`\>\>, \{ \}, \{ \}\>

A new RouteAtom for the combined path pattern

###### Example

```ts
const usersRoute = reatomRoute('users') // Creates /users route
  const userRoute = usersRoute.reatomRoute(':userId') // Creates /users/:userId route
```

###### Call Signature

> **reatomRoute**\<`SubPath`, `SubParams`, `SubSearch`, `SubParamsOutput`, `SubSearchOutput`, `LoaderParams`, `Payload`\>(`options`, `name?`): [`RouteAtom`](#routeatom)\<`` `${Path extends `${Path}?` ? Path : Path}/${SubPath}` ``, [`Plain`](#plain)\<`Params` & `SubParamsOutput`\>, [`Plain`](#plain)\<`SubSearchOutput`\>, `Payload`, [`Plain`](#plain)\<`Params` & `SubParams`\>, [`Plain`](#plain)\<`SubSearch`\>\>

Defined in: [packages/core/src/web/route.ts:98](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/route.ts#L98)

Create a sub-route with validation schemas for parameters and search
params.

###### Type Parameters

###### SubPath

`SubPath` *extends* `string` = `""`

###### SubParams

`SubParams` *extends* [`PathKeys`](#pathkeys)\<`SubPath`\> = [`PathParams`](#pathparams)\<`SubPath`\>

###### SubSearch

`SubSearch` *extends* `Partial`\<[`Rec`](#rec)\<`string`\>\> = \{ \}

###### SubParamsOutput

`SubParamsOutput` = `SubParams`

###### SubSearchOutput

`SubSearchOutput` = `SubSearch`

###### LoaderParams

`LoaderParams` = [`Plain`](#plain)\<`Params` & `SubParamsOutput` & `SubSearchOutput`\>

###### Payload

`Payload` = `LoaderParams`

###### Parameters

###### options

[`RouteOptions`](#routeoptions)\<`SubPath`, `SubParams`, `SubSearch`, `SubParamsOutput`, `SubSearchOutput`, `LoaderParams`, `Payload`\>

Route configuration object or just a path string

###### name?

`string`

###### Returns

[`RouteAtom`](#routeatom)\<`` `${Path extends `${Path}?` ? Path : Path}/${SubPath}` ``, [`Plain`](#plain)\<`Params` & `SubParamsOutput`\>, [`Plain`](#plain)\<`SubSearchOutput`\>, `Payload`, [`Plain`](#plain)\<`Params` & `SubParams`\>, [`Plain`](#plain)\<`SubSearch`\>\>

A new RouteAtom for the combined path with validation

###### Example

```ts
import { z } from 'zod'

  const userRoute = reatomRoute({
    path: 'user/:id',
    params: z.object({ id: z.number() }), // Should match the path
    search: z.object({ sort: z.enum(['asc', 'desc']).optional() }),
  })

  // Navigate with validated params
  userRoute.go({ id: 123, tab: 'profile' })
```

***

### RouteOptions\<Path, Params, Search, ParamsOutput, SearchOutput, LoaderParams, Payload\>

Defined in: [packages/core/src/web/route.ts:31](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/route.ts#L31)

#### Type Parameters

##### Path

`Path` *extends* `string` = `""`

##### Params

`Params` *extends* [`PathKeys`](#pathkeys)\<`Path`\> = [`PathParams`](#pathparams)\<`Path`\>

##### Search

`Search` *extends* `Partial`\<[`Rec`](#rec)\<`string`\>\> = \{ \}

##### ParamsOutput

`ParamsOutput` = `Params`

##### SearchOutput

`SearchOutput` = `Search`

##### LoaderParams

`LoaderParams` = [`Plain`](#plain)\<`ParamsOutput` & `SearchOutput`\>

##### Payload

`Payload` = `LoaderParams`

#### Properties

##### loader()?

> `optional` **loader**: (`params`) => `Promise`\<`Payload`\>

Defined in: [packages/core/src/web/route.ts:46](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/route.ts#L46)

###### Parameters

###### params

`LoaderParams`

###### Returns

`Promise`\<`Payload`\>

##### params?

> `optional` **params**: `StandardSchemaV1`\<`Params`, `ParamsOutput`\>

Defined in: [packages/core/src/web/route.ts:42](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/route.ts#L42)

##### path?

> `optional` **path**: `Path`

Defined in: [packages/core/src/web/route.ts:40](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/route.ts#L40)

##### search?

> `optional` **search**: `StandardSchemaV1`\<`Search`, `SearchOutput`\>

Defined in: [packages/core/src/web/route.ts:44](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/route.ts#L44)

***

### SearchParamsAtom()

Defined in: [packages/core/src/web/url.ts:89](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/url.ts#L89)

Interface for the search parameters atom.

#### Extends

- [`Computed`](#computed)\<`Record`\<`string`, `string`\>\>

> **SearchParamsAtom**(...`params`): `Payload`

Defined in: [packages/core/src/web/url.ts:89](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/url.ts#L89)

Interface for the search parameters atom.

#### Parameters

##### params

...\[\]

Parameters to pass to the atom

#### Returns

`Payload`

The atom's payload (typically its current state)

#### Properties

##### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#atommeta)

Defined in: [packages/core/src/core/atom.ts:101](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L101)

Reference to the atom's internal metadata.

###### Inherited from

[`Computed`](#computed).[`__reatom`](#__reatom-7)

##### actions

> **actions**: [`Actions`](#actions-26)\<[`SearchParamsAtom`](#searchparamsatom)\>

Defined in: [packages/core/src/core/atom.ts:81](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L81)

Bind methods to the atom to extend its functionality.

###### Inherited from

[`Computed`](#computed).[`actions`](#actions-7)

##### del

> **del**: [`Action`](#action)\<\[`string`, `boolean`\], `void`\>

Defined in: [packages/core/src/web/url.ts:105](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/url.ts#L105)

Delete a search parameter.

###### Param

Parameter name to delete

###### Param

Whether to replace the current history entry

##### extend

> **extend**: [`Extend`](#extend-10)\<[`SearchParamsAtom`](#searchparamsatom)\>

Defined in: [packages/core/src/core/atom.ts:87](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L87)

Extension system to add capabilities to atoms. Allows adding middleware,
methods, or other functionality to modify atom behavior.

###### Inherited from

[`Computed`](#computed).[`extend`](#extend-7)

##### set

> **set**: [`Action`](#action)\<\[`string`, `string`, `boolean`\], `void`\>

Defined in: [packages/core/src/web/url.ts:97](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/url.ts#L97)

Set a search parameter.

###### Param

Parameter name

###### Param

Parameter value

###### Param

Whether to replace the current history entry

###### Overrides

[`Computed`](#computed).[`set`](#set-17)

##### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#unsubscribe-2)

Defined in: [packages/core/src/core/atom.ts:98](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L98)

Subscribe to state changes, with the first call happening immediately. When
a subscriber is added, the callback is immediately invoked with the current
state. After that, it's called whenever the atom's state changes.

###### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it
  changes

###### Returns

[`Unsubscribe`](#unsubscribe-2)

An unsubscribe function that removes the subscription when called

###### Inherited from

[`Computed`](#computed).[`subscribe`](#subscribe-7)

#### Methods

##### lens()

###### Call Signature

> **lens**\<`T`\>(`key`, `parse?`): [`Atom`](#atom)\<`T`\>

Defined in: [packages/core/src/web/url.ts:113](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/url.ts#L113)

Create an atom that synchronizes with a specific search parameter.

###### Type Parameters

###### T

`T` = `string`

###### Parameters

###### key

`string`

Parameter name

###### parse?

(`value?`) => `T`

Function to parse parameter string value to desired type

###### Returns

[`Atom`](#atom)\<`T`\>

###### Call Signature

> **lens**\<`T`\>(`key`, `options`): [`Atom`](#atom)\<`T`\>

Defined in: [packages/core/src/web/url.ts:131](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/url.ts#L131)

Create an atom that synchronizes with a specific search parameter using
advanced options.

###### Type Parameters

###### T

`T` = `string`

###### Parameters

###### key

`string`

Parameter name

###### options

Configuration options for the lens

###### name?

`string`

Optional name of the created atom

###### parse?

(`value?`) => `T`

Optional function to parse the parameter string value
  into the desired type

###### path?

`string`

Optional path to limit the scope of synchronization to
  specific URL paths

###### replace?

`boolean`

Optional boolean to specify if history entries
  should be replaced (default: false)

###### serialize?

(`value`) => `undefined` \| `string`

Optional function to serialize the value back into
  a string

###### Returns

[`Atom`](#atom)\<`T`\>

***

### SetAtom()\<T\>

Defined in: [packages/core/src/primitives/reatomSet.ts:8](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomSet.ts#L8)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Extends

- [`Atom`](#atom)\<`Set`\<`T`\>, \[`StateInit`\<`T`\>\]\>

#### Type Parameters

##### T

`T`

The type of state stored in the atom

> **SetAtom**(...`params`): `Set`

Defined in: [packages/core/src/primitives/reatomSet.ts:8](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomSet.ts#L8)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Parameters

##### params

...\[\]

Parameters to pass to the atom

#### Returns

`Set`

The atom's payload (typically its current state)

#### Properties

##### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#atommeta)

Defined in: [packages/core/src/core/atom.ts:101](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L101)

Reference to the atom's internal metadata.

###### Inherited from

[`Atom`](#atom).[`__reatom`](#__reatom-3)

##### actions

> **actions**: [`Actions`](#actions-26)\<[`SetAtom`](#setatom)\<`T`\>\>

Defined in: [packages/core/src/core/atom.ts:81](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L81)

Bind methods to the atom to extend its functionality.

###### Inherited from

[`Atom`](#atom).[`actions`](#actions-3)

##### add

> **add**: [`Action`](#action)\<\[`T`\], `Set`\<`T`\>\>

Defined in: [packages/core/src/primitives/reatomSet.ts:9](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomSet.ts#L9)

##### clear

> **clear**: [`Action`](#action)\<\[\], `Set`\<`T`\>\>

Defined in: [packages/core/src/primitives/reatomSet.ts:12](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomSet.ts#L12)

##### delete

> **delete**: [`Action`](#action)\<\[`T`\], `Set`\<`T`\>\>

Defined in: [packages/core/src/primitives/reatomSet.ts:10](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomSet.ts#L10)

##### extend

> **extend**: [`Extend`](#extend-10)\<[`SetAtom`](#setatom)\<`T`\>\>

Defined in: [packages/core/src/core/atom.ts:87](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L87)

Extension system to add capabilities to atoms. Allows adding middleware,
methods, or other functionality to modify atom behavior.

###### Inherited from

[`Atom`](#atom).[`extend`](#extend-3)

##### reset

> **reset**: [`Action`](#action)\<\[\], `Set`\<`T`\>\>

Defined in: [packages/core/src/primitives/reatomSet.ts:13](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomSet.ts#L13)

##### size

> **size**: [`Computed`](#computed)\<`number`\>

Defined in: [packages/core/src/primitives/reatomSet.ts:14](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomSet.ts#L14)

##### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#unsubscribe-2)

Defined in: [packages/core/src/core/atom.ts:98](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L98)

Subscribe to state changes, with the first call happening immediately. When
a subscriber is added, the callback is immediately invoked with the current
state. After that, it's called whenever the atom's state changes.

###### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it
  changes

###### Returns

[`Unsubscribe`](#unsubscribe-2)

An unsubscribe function that removes the subscription when called

###### Inherited from

[`Atom`](#atom).[`subscribe`](#subscribe-3)

##### toggle

> **toggle**: [`Action`](#action)\<\[`T`\], `Set`\<`T`\>\>

Defined in: [packages/core/src/primitives/reatomSet.ts:11](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomSet.ts#L11)

#### Methods

##### set()

###### Call Signature

> **set**(`update`): `Set`

Defined in: [packages/core/src/core/atom.ts:122](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L122)

Update the atom's state using a function that receives the previous state

###### Parameters

###### update

(`state`) => `Set`

Function that takes the current state and returns a new
  state

###### Returns

`Set`

The new state value

###### Inherited from

[`Atom`](#atom).[`set`](#set-9)

###### Call Signature

> **set**(...`params`): `Set`

Defined in: [packages/core/src/core/atom.ts:130](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L130)

Set the atom's state to a new value

###### Parameters

###### params

...\[`StateInit`\<`T`\>\]

###### Returns

`Set`

The new state value

###### Inherited from

[`Atom`](#atom).[`set`](#set-9)

***

### Store

Defined in: [packages/core/src/core/atom.ts:212](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L212)

Atom's state mappings for context.

The Store maps atoms to their frames in the current context, allowing atoms
to retrieve their state and dependencies.

#### Extends

- `WeakMap`\<[`AtomLike`](#atomlike), [`Frame`](#frame)\>

#### Properties

##### \[toStringTag\]

> `readonly` **\[toStringTag\]**: `string`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2015.symbol.wellknown.d.ts:141

###### Inherited from

`WeakMap.[toStringTag]`

#### Methods

##### delete()

> **delete**(`key`): `boolean`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2015.collection.d.ts:67

Removes the specified element from the WeakMap.

###### Parameters

###### key

[`AtomLike`](#atomlike)

###### Returns

`boolean`

true if the element was successfully removed, or false if it was not present.

###### Inherited from

`WeakMap.delete`

##### get()

> **get**\<`State`, `Params`, `Payload`\>(`target`): `undefined` \| [`Frame`](#frame)\<`State`, `Params`, `Payload`\>

Defined in: [packages/core/src/core/atom.ts:219](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L219)

Get the frame for an atom in the current context.

###### Type Parameters

###### State

`State`

###### Params

`Params` *extends* `any`[]

###### Payload

`Payload`

###### Parameters

###### target

[`AtomLike`](#atomlike)\<`State`, `Params`, `Payload`\>

The atom to get the frame for

###### Returns

`undefined` \| [`Frame`](#frame)\<`State`, `Params`, `Payload`\>

The frame for the atom, or undefined if not found

###### Overrides

`WeakMap.get`

##### has()

> **has**(`key`): `boolean`

Defined in: node\_modules/.pnpm/typescript@5.8.3/node\_modules/typescript/lib/lib.es2015.collection.d.ts:75

###### Parameters

###### key

[`AtomLike`](#atomlike)

###### Returns

`boolean`

a boolean indicating whether an element with the specified key exists or not.

###### Inherited from

`WeakMap.has`

##### set()

> **set**\<`State`, `Params`, `Payload`\>(`target`, `frame`): `this`

Defined in: [packages/core/src/core/atom.ts:230](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L230)

Set the frame for an atom in the current context.

###### Type Parameters

###### State

`State`

###### Params

`Params` *extends* `any`[]

###### Payload

`Payload`

###### Parameters

###### target

[`AtomLike`](#atomlike)\<`State`, `Params`, `Payload`\>

The atom to set the frame for

###### frame

[`Frame`](#frame)\<`State`, `Params`, `Payload`\>

The frame to associate with the atom

###### Returns

`this`

This store instance

###### Overrides

`WeakMap.set`

***

### SuspenseRecord

Defined in: [packages/core/src/mixins/withSuspense.ts:6](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/mixins/withSuspense.ts#L6)

Internal suspense cache, do not use it directly, only for libraries!

#### Properties

##### kind

> **kind**: `"fulfilled"` \| `"rejected"` \| `"pending"`

Defined in: [packages/core/src/mixins/withSuspense.ts:7](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/mixins/withSuspense.ts#L7)

##### value

> **value**: `any`

Defined in: [packages/core/src/mixins/withSuspense.ts:8](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/mixins/withSuspense.ts#L8)

***

### SyncPersistStorage

Defined in: [packages/core/src/persist/index.ts:34](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/index.ts#L34)

#### Properties

##### name

> **name**: `string`

Defined in: [packages/core/src/persist/index.ts:35](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/index.ts#L35)

#### Methods

##### clear()?

> `optional` **clear**(`key`): `void`

Defined in: [packages/core/src/persist/index.ts:38](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/index.ts#L38)

###### Parameters

###### key

`string`

###### Returns

`void`

##### get()

> **get**(`key`): `null` \| [`PersistRecord`](#persistrecord)\<`unknown`\>

Defined in: [packages/core/src/persist/index.ts:36](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/index.ts#L36)

###### Parameters

###### key

`string`

###### Returns

`null` \| [`PersistRecord`](#persistrecord)\<`unknown`\>

##### set()

> **set**(`key`, `rec`): `void`

Defined in: [packages/core/src/persist/index.ts:37](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/index.ts#L37)

###### Parameters

###### key

`string`

###### rec

[`PersistRecord`](#persistrecord)

###### Returns

`void`

##### subscribe()?

> `optional` **subscribe**(`key`, `callback`): [`Unsubscribe`](#unsubscribe-2)

Defined in: [packages/core/src/persist/index.ts:39](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/index.ts#L39)

###### Parameters

###### key

`string`

###### callback

(`record`) => `void`

###### Returns

[`Unsubscribe`](#unsubscribe-2)

***

### Unsubscribe()

Defined in: [packages/core/src/utils.ts:24](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L24)

Function interface for unsubscribing from subscriptions. Used consistently
throughout Reatom for cleanup functions.

> **Unsubscribe**(): `void`

Defined in: [packages/core/src/utils.ts:25](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L25)

Function interface for unsubscribing from subscriptions. Used consistently
throughout Reatom for cleanup functions.

#### Returns

`void`

***

### UrlAtom()

Defined in: [packages/core/src/web/url.ts:22](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/url.ts#L22)

URL atom interface that extends the base Atom type.

#### Extends

- [`Atom`](#atom)\<`URL`\>

> **UrlAtom**(...`params`): `URL`

Defined in: [packages/core/src/web/url.ts:22](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/url.ts#L22)

URL atom interface that extends the base Atom type.

#### Parameters

##### params

...\[\]

Parameters to pass to the atom

#### Returns

`URL`

The atom's payload (typically its current state)

#### Properties

##### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#atommeta)

Defined in: [packages/core/src/core/atom.ts:101](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L101)

Reference to the atom's internal metadata.

###### Inherited from

[`Atom`](#atom).[`__reatom`](#__reatom-3)

##### actions

> **actions**: [`Actions`](#actions-26)\<[`UrlAtom`](#urlatom)\>

Defined in: [packages/core/src/core/atom.ts:81](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L81)

Bind methods to the atom to extend its functionality.

###### Inherited from

[`Atom`](#atom).[`actions`](#actions-3)

##### catchLinks

> **catchLinks**: [`Atom`](#atom)\<`boolean`\>

Defined in: [packages/core/src/web/url.ts:60](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/url.ts#L60)

Whether to intercept link clicks for SPA navigation.

###### Default

```ts
true
```

##### extend

> **extend**: [`Extend`](#extend-10)\<[`UrlAtom`](#urlatom)\>

Defined in: [packages/core/src/core/atom.ts:87](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L87)

Extension system to add capabilities to atoms. Allows adding middleware,
methods, or other functionality to modify atom behavior.

###### Inherited from

[`Atom`](#atom).[`extend`](#extend-3)

##### go()

> **go**: (`path`, `replace?`) => `URL`

Defined in: [packages/core/src/web/url.ts:45](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/url.ts#L45)

Navigate to a new path.

###### Parameters

###### path

`string`

The path to navigate to

###### replace?

`boolean`

Whether to replace the current history entry

###### Returns

`URL`

##### init

> **init**: [`Action`](#action)\<\[\], `URL`\> & [`AbortExt`](#abortext)

Defined in: [packages/core/src/web/url.ts:68](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/url.ts#L68)

This initialize DOM subscriptions and returns the current URL. To prevent
this action calling (in server on other environments without DOM), just
call `urlAtom` with your custom URL before it will be reded in other
places.

##### match()

> **match**: (`path`) => [`Computed`](#computed)\<`boolean`\>

Defined in: [packages/core/src/web/url.ts:53](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/url.ts#L53)

Create a computed atom that checks if the current path matches a given
pattern.

###### Parameters

###### path

`string`

The path pattern to match against

###### Returns

[`Computed`](#computed)\<`boolean`\>

##### routes

> **routes**: [`Rec`](#rec)\<[`RouteAtom`](#routeatom)\>

Defined in: [packages/core/src/web/url.ts:85](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/url.ts#L85)

##### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#unsubscribe-2)

Defined in: [packages/core/src/core/atom.ts:98](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L98)

Subscribe to state changes, with the first call happening immediately. When
a subscriber is added, the callback is immediately invoked with the current
state. After that, it's called whenever the atom's state changes.

###### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it
  changes

###### Returns

[`Unsubscribe`](#unsubscribe-2)

An unsubscribe function that removes the subscription when called

###### Inherited from

[`Atom`](#atom).[`subscribe`](#subscribe-3)

##### sync

> **sync**: [`Atom`](#atom)\<(`url`, `replace?`) => `void`\>

Defined in: [packages/core/src/web/url.ts:74](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/url.ts#L74)

Synchronization callback to push URL state updates to the `history`.
Replace with `noop` to disable syncing.

##### syncFromSource

> **syncFromSource**: [`Action`](#action)\<\[`URL`, `boolean`\], `URL`\>

Defined in: [packages/core/src/web/url.ts:83](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/url.ts#L83)

For integrations use: put the new URL from the the source of truth to
`urlAtom`, without syncing it back (calling callback in `sync` Atom).

###### Param

The URL from the source

###### Param

Whether to replace the current history entry

#### Methods

##### set()

###### Call Signature

> **set**(`url`, `replace?`): `URL`

Defined in: [packages/core/src/web/url.ts:29](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/url.ts#L29)

Update the URL atom with a new URL.

###### Parameters

###### url

`URL`

New URL to set

###### replace?

`boolean`

Whether to replace the current history entry

###### Returns

`URL`

###### Overrides

[`Atom`](#atom).[`set`](#set-9)

###### Call Signature

> **set**(`update`, `replace?`): `URL`

Defined in: [packages/core/src/web/url.ts:37](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/url.ts#L37)

Update the URL with a function that receives the current URL.

###### Parameters

###### update

(`url`) => `URL`

Function that takes current URL and returns new URL

###### replace?

`boolean`

Whether to replace the current history entry

###### Returns

`URL`

###### Overrides

[`Atom`](#atom).[`set`](#set-9)

***

### ValidationAtom()

Defined in: [packages/core/src/form/reatomField.ts:84](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L84)

Base atom interface for other userspace implementations. This is the core
interface that all atom-like objects implement, providing the foundation for
Reatom's reactivity system.

#### Extends

- [`AtomLike`](#atomlike)\<[`FieldValidation`](#fieldvalidation)\>

> **ValidationAtom**(...`params`): [`FieldValidation`](#fieldvalidation)

Defined in: [packages/core/src/form/reatomField.ts:84](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L84)

Base atom interface for other userspace implementations. This is the core
interface that all atom-like objects implement, providing the foundation for
Reatom's reactivity system.

#### Parameters

##### params

...`any`[]

Parameters to pass to the atom

#### Returns

[`FieldValidation`](#fieldvalidation)

The atom's payload (typically its current state)

#### Properties

##### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#atommeta)

Defined in: [packages/core/src/core/atom.ts:101](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L101)

Reference to the atom's internal metadata.

###### Inherited from

[`AtomLike`](#atomlike).[`__reatom`](#__reatom-4)

##### actions

> **actions**: [`Actions`](#actions-26)\<[`ValidationAtom`](#validationatom)\>

Defined in: [packages/core/src/core/atom.ts:81](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L81)

Bind methods to the atom to extend its functionality.

###### Inherited from

[`AtomLike`](#atomlike).[`actions`](#actions-4)

##### clearErrors

> **clearErrors**: [`Action`](#action)\<[`FieldErrorSource`](#fielderrorsource-1)[], [`FieldValidation`](#fieldvalidation)\>

Defined in: [packages/core/src/form/reatomField.ts:92](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L92)

Action to clear all errors by passed sources.

##### extend

> **extend**: [`Extend`](#extend-10)\<[`ValidationAtom`](#validationatom)\>

Defined in: [packages/core/src/core/atom.ts:87](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L87)

Extension system to add capabilities to atoms. Allows adding middleware,
methods, or other functionality to modify atom behavior.

###### Inherited from

[`AtomLike`](#atomlike).[`extend`](#extend-4)

##### prependErrors

> **prependErrors**: [`Action`](#action)\<[`FieldError`](#fielderror)\<`any`\>[], [`FieldValidation`](#fieldvalidation)\>

Defined in: [packages/core/src/form/reatomField.ts:89](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L89)

Action to prepend some errors to the field.

##### set

> **set**: `unknown`

Defined in: [packages/core/src/core/atom.ts:78](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L78)

###### Inherited from

[`AtomLike`](#atomlike).[`set`](#set-12)

##### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#unsubscribe-2)

Defined in: [packages/core/src/core/atom.ts:98](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L98)

Subscribe to state changes, with the first call happening immediately. When
a subscriber is added, the callback is immediately invoked with the current
state. After that, it's called whenever the atom's state changes.

###### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it
  changes

###### Returns

[`Unsubscribe`](#unsubscribe-2)

An unsubscribe function that removes the subscription when called

###### Inherited from

[`AtomLike`](#atomlike).[`subscribe`](#subscribe-4)

##### trigger

> **trigger**: [`Action`](#action)\<\[\], [`FieldValidation`](#fieldvalidation)\> & [`AbortExt`](#abortext)

Defined in: [packages/core/src/form/reatomField.ts:86](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L86)

Action to trigger field validation.

***

### Variable\<Params, Payload\>

Defined in: [packages/core/src/methods/variable.ts:16](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/variable.ts#L16)

Interface for context variables in Reatom

Variables maintain values within the context of a computation tree, allowing
for context-aware state similar to React's Context API but with more granular
control and integration with Reatom's reactive system.

#### Extended by

- [`AbortVar`](#abortvar)

#### Type Parameters

##### Params

`Params` *extends* `any`[] = `any`[]

Types of parameters accepted by the setter function

##### Payload

`Payload` = `any`

Type of the stored value

#### Methods

##### find()

> **find**\<`T`\>(`cb?`, `frame?`): `undefined` \| `T`

Defined in: [packages/core/src/methods/variable.ts:54](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/variable.ts#L54)

Traverses the frame tree to find and map the variable value.

###### Type Parameters

###### T

`T` = `Payload`

Return type of the callback

###### Parameters

###### cb?

(`value`) => `undefined` \| `T`

Optional
  transformation callback

###### frame?

[`Frame`](#frame)\<`any`, `any`[], `any`\>

Optional frame to check (defaults to current top
  frame)

###### Returns

`undefined` \| `T`

The transformed value or undefined if not found

##### get()

> **get**(`frame?`): `Payload`

Defined in: [packages/core/src/methods/variable.ts:25](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/variable.ts#L25)

Gets the current value of the variable

###### Parameters

###### frame?

[`Frame`](#frame)\<`any`, `any`[], `any`\>

Optional frame to check (defaults to current top
  frame)

###### Returns

`Payload`

The current value

###### Throws

If the variable is not found in the frame tree

##### has()

> **has**(`frame?`): `boolean`

Defined in: [packages/core/src/methods/variable.ts:42](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/variable.ts#L42)

Checks if the variable exists in the current stack

###### Parameters

###### frame?

[`Frame`](#frame)\<`any`, `any`[], `any`\>

Optional frame to check (defaults to current top
  frame)

###### Returns

`boolean`

True if the variable exists in the context

##### run()

> **run**\<`T`\>(`value`, `fn`): `T`

Defined in: [packages/core/src/methods/variable.ts:67](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/variable.ts#L67)

Runs a function with new variable value

###### Type Parameters

###### T

`T`

Return type of the function

###### Parameters

###### value

`Payload`

The temporary value to set

###### fn

() => `T`

Function to execute with the temporary value

###### Returns

`T`

The result of the function

##### set()

> **set**(...`params`): `Payload`

Defined in: [packages/core/src/methods/variable.ts:33](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/variable.ts#L33)

Sets a new value for the variable

###### Parameters

###### params

...`Params`

Parameters passed to the setter function

###### Returns

`Payload`

The new value

***

### WebSocketAtom()\<T\>

Defined in: packages/core/src/web/reatomWebSocket.ts:16

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Extends

- [`Atom`](#atom)\<[`WebSocketMessage`](#websocketmessage)\<`T`\>[]\>

#### Type Parameters

##### T

`T` = `any`

The type of state stored in the atom

> **WebSocketAtom**(...`params`): [`WebSocketMessage`](#websocketmessage)\<`T`\>[]

Defined in: packages/core/src/web/reatomWebSocket.ts:16

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Parameters

##### params

...\[\]

Parameters to pass to the atom

#### Returns

[`WebSocketMessage`](#websocketmessage)\<`T`\>[]

The atom's payload (typically its current state)

#### Properties

##### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#atommeta)

Defined in: [packages/core/src/core/atom.ts:101](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L101)

Reference to the atom's internal metadata.

###### Inherited from

[`Atom`](#atom).[`__reatom`](#__reatom-3)

##### actions

> **actions**: [`Actions`](#actions-26)\<[`WebSocketAtom`](#websocketatom)\<`T`\>\>

Defined in: [packages/core/src/core/atom.ts:81](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L81)

Bind methods to the atom to extend its functionality.

###### Inherited from

[`Atom`](#atom).[`actions`](#actions-3)

##### autoReconnect

> **autoReconnect**: [`Atom`](#atom)\<`boolean`\>

Defined in: packages/core/src/web/reatomWebSocket.ts:26

Auto-reconnect enabled

##### clearError

> **clearError**: [`Action`](#action)\<\[\], `void`\>

Defined in: packages/core/src/web/reatomWebSocket.ts:53

Clear errors

##### clearMessages

> **clearMessages**: [`Action`](#action)\<\[\], `void`\>

Defined in: packages/core/src/web/reatomWebSocket.ts:51

Clear message history

##### closedAt

> **closedAt**: [`Atom`](#atom)\<`null` \| `number`\>

Defined in: packages/core/src/web/reatomWebSocket.ts:34

Connection closed timestamp

##### connect

> **connect**: [`Action`](#action)\<\[\], `Promise`\<`void`\>\>

Defined in: packages/core/src/web/reatomWebSocket.ts:43

Connect to WebSocket

##### connectedAt

> **connectedAt**: [`Atom`](#atom)\<`null` \| `number`\>

Defined in: packages/core/src/web/reatomWebSocket.ts:32

Connection established timestamp

##### disconnect

> **disconnect**: [`Action`](#action)\<\[`number`, `string`\], `void`\>

Defined in: packages/core/src/web/reatomWebSocket.ts:45

Disconnect from WebSocket

##### error

> **error**: [`Atom`](#atom)\<`null` \| `Error`\>

Defined in: packages/core/src/web/reatomWebSocket.ts:30

Last error

##### extend

> **extend**: [`Extend`](#extend-10)\<[`WebSocketAtom`](#websocketatom)\<`T`\>\>

Defined in: [packages/core/src/core/atom.ts:87](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L87)

Extension system to add capabilities to atoms. Allows adding middleware,
methods, or other functionality to modify atom behavior.

###### Inherited from

[`Atom`](#atom).[`extend`](#extend-3)

##### isConnected

> **isConnected**: [`Atom`](#atom)\<`boolean`\>

Defined in: packages/core/src/web/reatomWebSocket.ts:36

Whether currently connected

##### isConnecting

> **isConnecting**: [`Atom`](#atom)\<`boolean`\>

Defined in: packages/core/src/web/reatomWebSocket.ts:38

Whether currently connecting

##### latestMessage

> **latestMessage**: [`Atom`](#atom)\<`null` \| [`WebSocketMessage`](#websocketmessage)\<`T`\>\>

Defined in: packages/core/src/web/reatomWebSocket.ts:40

Latest message

##### protocols

> **protocols**: [`Atom`](#atom)\<`string`[]\>

Defined in: packages/core/src/web/reatomWebSocket.ts:24

Connection protocols

##### readyState

> **readyState**: [`Atom`](#atom)\<[`WebSocketReadyState`](#websocketreadystate)\>

Defined in: packages/core/src/web/reatomWebSocket.ts:18

Current connection state

##### reconnect

> **reconnect**: [`Action`](#action)\<\[\], `Promise`\<`void`\>\>

Defined in: packages/core/src/web/reatomWebSocket.ts:55

Force reconnect

##### reconnectAttempts

> **reconnectAttempts**: [`Atom`](#atom)\<`number`\>

Defined in: packages/core/src/web/reatomWebSocket.ts:28

Reconnect attempts count

##### send

> **send**: [`Action`](#action)\<\[`string` \| `Blob` \| `ArrayBuffer` \| `ArrayBufferView`\<`ArrayBufferLike`\>\], `void`\>

Defined in: packages/core/src/web/reatomWebSocket.ts:47

Send message

##### sendJson

> **sendJson**: [`Action`](#action)\<\[`any`\], `void`\>

Defined in: packages/core/src/web/reatomWebSocket.ts:49

Send JSON message

##### socket

> **socket**: [`Atom`](#atom)\<`null` \| `WebSocket`\>

Defined in: packages/core/src/web/reatomWebSocket.ts:20

Current WebSocket instance (null if not connected)

##### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#unsubscribe-2)

Defined in: [packages/core/src/core/atom.ts:98](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L98)

Subscribe to state changes, with the first call happening immediately. When
a subscriber is added, the callback is immediately invoked with the current
state. After that, it's called whenever the atom's state changes.

###### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it
  changes

###### Returns

[`Unsubscribe`](#unsubscribe-2)

An unsubscribe function that removes the subscription when called

###### Inherited from

[`Atom`](#atom).[`subscribe`](#subscribe-3)

##### url

> **url**: [`Atom`](#atom)\<`string`\>

Defined in: packages/core/src/web/reatomWebSocket.ts:22

Connection URL

#### Methods

##### set()

###### Call Signature

> **set**(`update`): [`WebSocketMessage`](#websocketmessage)\<`T`\>[]

Defined in: [packages/core/src/core/atom.ts:122](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L122)

Update the atom's state using a function that receives the previous state

###### Parameters

###### update

(`state`) => [`WebSocketMessage`](#websocketmessage)\<`T`\>[]

Function that takes the current state and returns a new
  state

###### Returns

[`WebSocketMessage`](#websocketmessage)\<`T`\>[]

The new state value

###### Inherited from

[`Atom`](#atom).[`set`](#set-9)

###### Call Signature

> **set**(...`params`): [`WebSocketMessage`](#websocketmessage)\<`T`\>[]

Defined in: [packages/core/src/core/atom.ts:130](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L130)

Set the atom's state to a new value

###### Parameters

###### params

...\[[`WebSocketMessage`](#websocketmessage)\<`T`\>[]\]

###### Returns

[`WebSocketMessage`](#websocketmessage)\<`T`\>[]

The new state value

###### Inherited from

[`Atom`](#atom).[`set`](#set-9)

***

### WebSocketMessage\<T\>

Defined in: packages/core/src/web/reatomWebSocket.ts:10

#### Type Parameters

##### T

`T` = `any`

#### Properties

##### data

> **data**: `T`

Defined in: packages/core/src/web/reatomWebSocket.ts:11

##### timestamp

> **timestamp**: `number`

Defined in: packages/core/src/web/reatomWebSocket.ts:12

##### type

> **type**: `"message"` \| `"error"`

Defined in: packages/core/src/web/reatomWebSocket.ts:13

***

### WebSocketOptions

Defined in: packages/core/src/web/reatomWebSocket.ts:58

#### Properties

##### autoReconnect?

> `optional` **autoReconnect**: `boolean`

Defined in: packages/core/src/web/reatomWebSocket.ts:64

Auto-reconnect on connection loss

##### maxMessages?

> `optional` **maxMessages**: `number`

Defined in: packages/core/src/web/reatomWebSocket.ts:70

Maximum number of messages to keep in history

##### maxReconnectAttempts?

> `optional` **maxReconnectAttempts**: `number`

Defined in: packages/core/src/web/reatomWebSocket.ts:68

Maximum reconnect attempts (0 for infinite)

##### messageParser()?

> `optional` **messageParser**: (`data`) => `any`

Defined in: packages/core/src/web/reatomWebSocket.ts:72

Message parser function

###### Parameters

###### data

`any`

###### Returns

`any`

##### name?

> `optional` **name**: `string`

Defined in: packages/core/src/web/reatomWebSocket.ts:74

Debug name for the WebSocket instance

##### protocols?

> `optional` **protocols**: `string`[]

Defined in: packages/core/src/web/reatomWebSocket.ts:62

WebSocket protocols

##### reconnectDelay?

> `optional` **reconnectDelay**: `number`

Defined in: packages/core/src/web/reatomWebSocket.ts:66

Reconnect delay in milliseconds

##### url

> **url**: `string`

Defined in: packages/core/src/web/reatomWebSocket.ts:60

WebSocket URL

***

### WithPersist()

Defined in: [packages/core/src/persist/index.ts:78](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/index.ts#L78)

#### Extended by

- [`WithPersistWebStorage`](#withpersistwebstorage)

> **WithPersist**\<`T`\>(...`args`): [`AssignerExt`](#assignerext)\<\{ `__persistRecordAtom`: [`Atom`](#atom)\<`null` \| [`PersistRecord`](#persistrecord)\<`unknown`\>\>; \}, `T`\>

Defined in: [packages/core/src/persist/index.ts:79](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/index.ts#L79)

#### Type Parameters

##### T

`T` *extends* [`Atom`](#atom)\<`any`, \[`any`\]\>

#### Parameters

##### args

\[`string`\] | \[[`WithPersistOptions`](#withpersistoptions)\<[`AtomState`](#atomstate-1)\<`T`\>\>\]

#### Returns

[`AssignerExt`](#assignerext)\<\{ `__persistRecordAtom`: [`Atom`](#atom)\<`null` \| [`PersistRecord`](#persistrecord)\<`unknown`\>\>; \}, `T`\>

***

### WithPersistOptions\<T\>

Defined in: [packages/core/src/persist/index.ts:45](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/index.ts#L45)

#### Type Parameters

##### T

`T`

#### Properties

##### fromSnapshot()?

> `optional` **fromSnapshot**: (`snapshot`, `state?`) => `T`

Defined in: [packages/core/src/persist/index.ts:51](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/index.ts#L51)

Custom snapshot deserializer.

###### Parameters

###### snapshot

`unknown`

###### state?

`T`

###### Returns

`T`

##### key

> **key**: `string`

Defined in: [packages/core/src/persist/index.ts:47](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/index.ts#L47)

Key of the storage record.

##### migration()?

> `optional` **migration**: (`persistRecord`) => `T`

Defined in: [packages/core/src/persist/index.ts:56](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/index.ts#L56)

A callback to call if the version of a stored snapshot is older than
`version` option.

###### Parameters

###### persistRecord

[`PersistRecord`](#persistrecord)

###### Returns

`T`

##### subscribe?

> `optional` **subscribe**: `boolean`

Defined in: [packages/core/src/persist/index.ts:62](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/index.ts#L62)

Determines whether the atom is updated on storage updates.

###### Default Value

```ts
true
```

##### time?

> `optional` **time**: `number`

Defined in: [packages/core/src/persist/index.ts:69](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/index.ts#L69)

Number of milliseconds from the snapshot creation time after which it will
be deleted.

###### Default Value

```ts
MAX_SAFE_TIMEOUT
```

##### toSnapshot()?

> `optional` **toSnapshot**: (`state`) => `unknown`

Defined in: [packages/core/src/persist/index.ts:49](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/index.ts#L49)

Custom snapshot serializer.

###### Parameters

###### state

`T`

###### Returns

`unknown`

##### version?

> `optional` **version**: `number`

Defined in: [packages/core/src/persist/index.ts:75](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/index.ts#L75)

Version of the stored snapshot. Triggers `migration`.

###### Default Value

```ts
0
```

***

### WithPersistWebStorage()

Defined in: [packages/core/src/persist/web-storage/localStorage.ts:14](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/web-storage/localStorage.ts#L14)

Web storage persist interface that extends the base persist functionality
with a storage atom for managing the underlying storage mechanism.

#### Extends

- [`WithPersist`](#withpersist)

> **WithPersistWebStorage**\<`T`\>(...`args`): [`AssignerExt`](#assignerext)\<\{ `__persistRecordAtom`: [`Atom`](#atom)\<`null` \| [`PersistRecord`](#persistrecord)\<`unknown`\>\>; \}, `T`\>

Defined in: [packages/core/src/persist/web-storage/localStorage.ts:14](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/web-storage/localStorage.ts#L14)

Web storage persist interface that extends the base persist functionality
with a storage atom for managing the underlying storage mechanism.

#### Type Parameters

##### T

`T` *extends* [`Atom`](#atom)\<`any`, \[`any`\]\>

#### Parameters

##### args

\[`string`\] | \[[`WithPersistOptions`](#withpersistoptions)\<[`AtomState`](#atomstate-1)\<`T`\>\>\]

#### Returns

[`AssignerExt`](#assignerext)\<\{ `__persistRecordAtom`: [`Atom`](#atom)\<`null` \| [`PersistRecord`](#persistrecord)\<`unknown`\>\>; \}, `T`\>

#### Properties

##### storageAtom

> **storageAtom**: [`Atom`](#atom)\<[`PersistStorage`](#persiststorage)\>

Defined in: [packages/core/src/persist/web-storage/localStorage.ts:16](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/web-storage/localStorage.ts#L16)

Atom that holds the current storage instance

## Type Aliases

### Actions()\<Target\>

> **Actions**\<`Target`\> = \{\<`Methods`\>(`create`): `Target` & [`ActionsExt`](#actionsext)\<`Methods`\>; \<`Methods`\>(`methods`): `Target` & [`ActionsExt`](#actionsext)\<`Methods`\>; \}

Defined in: [packages/core/src/core/actions.ts:31](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/actions.ts#L31)

Binding function type to add methods to an atom or action.

Accepts either a record of methods or a function that creates methods given
the target atom/action, and returns the target extended with those methods
converted to actions.

#### Type Parameters

##### Target

`Target` *extends* [`AtomLike`](#atomlike)

The atom or action being extended

#### Call Signature

> \<`Methods`\>(`create`): `Target` & [`ActionsExt`](#actionsext)\<`Methods`\>

Add methods created by a factory function that receives the target

##### Type Parameters

###### Methods

`Methods` *extends* [`Rec`](#rec)\<[`Fn`](#fn)\>

##### Parameters

###### create

(`target`) => `Methods`

Function that receives the target and returns methods to
  add

##### Returns

`Target` & [`ActionsExt`](#actionsext)\<`Methods`\>

The target with the methods added as actions

#### Call Signature

> \<`Methods`\>(`methods`): `Target` & [`ActionsExt`](#actionsext)\<`Methods`\>

Add a record of methods directly to the target

##### Type Parameters

###### Methods

`Methods` *extends* [`Rec`](#rec)\<[`Fn`](#fn)\>

##### Parameters

###### methods

`Methods`

Record of methods to add

##### Returns

`Target` & [`ActionsExt`](#actionsext)\<`Methods`\>

The target with the methods added as actions

***

### ActionsExt\<Methods\>

> **ActionsExt**\<`Methods`\> = `{ [K in keyof Methods]: Methods[K] extends (params: infer Params) => infer Payload ? Action<Params, Payload> : never }`

Defined in: [packages/core/src/core/actions.ts:13](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/actions.ts#L13)

Type representing a set of methods converted to Reatom actions.

This type maps each method in the original record to a corresponding Reatom
action with the same parameter and return types.

#### Type Parameters

##### Methods

`Methods` *extends* [`Rec`](#rec)\<[`Fn`](#fn)\>

Record of functions to be converted to actions

***

### ArrayFieldItem\<T\>

> **ArrayFieldItem**\<`T`\> = `T` *extends* [`LinkedListLikeAtom`](#linkedlistlikeatom)\<infer \_Node\> ? [`AtomState`](#atomstate-1)\<`T`\[`"array"`\]\>\[`number`\] : `never`

Defined in: [packages/core/src/form/reatomForm.ts:371](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomForm.ts#L371)

#### Type Parameters

##### T

`T`

***

### Assign\<T1, T2, T3, T4\>

> **Assign**\<`T1`, `T2`, `T3`, `T4`\> = [`Plain`](#plain)\<`T1` *extends* (...`params`) => infer O ? (...`params`) => `O` : `object` & `Omit`\<`T1`, keyof `T2` \| keyof `T3` \| keyof `T4`\> & `Omit`\<`T2`, keyof `T3` \| keyof `T4`\> & `Omit`\<`T3`, keyof `T4`\> & `T4`\>

Defined in: [packages/core/src/utils.ts:380](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L380)

Type utility for merging up to four types with proper type safety. Properties
from later types override properties from earlier types. Preserves function
signatures from T1 if it's a function type.

#### Type Parameters

##### T1

`T1`

First type to merge

##### T2

`T2`

Second type to merge, overrides T1 properties

##### T3

`T3` = \{ \}

Optional third type to merge, overrides T1 and T2 properties

##### T4

`T4` = \{ \}

Optional fourth type to merge, overrides T1, T2, and T3
  properties

***

### AsyncOptions\<Err, EmptyErr\>

> **AsyncOptions**\<`Err`, `EmptyErr`\> = `object`

Defined in: [packages/core/src/async/withAsync.ts:90](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/async/withAsync.ts#L90)

Configuration options for the [withAsync](#withasync) extension

#### Extended by

- [`AsyncDataOptions`](#asyncdataoptions)

#### Type Parameters

##### Err

`Err` = `Error`

The type of errors after parsing

##### EmptyErr

`EmptyErr` = `undefined`

The type of the empty error state (default: undefined)

#### Properties

##### emptyError?

> `optional` **emptyError**: `EmptyErr`

Defined in: [packages/core/src/async/withAsync.ts:100](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/async/withAsync.ts#L100)

Initial/reset value for the error atom

##### parseError()?

> `optional` **parseError**: (`error`) => `Err`

Defined in: [packages/core/src/async/withAsync.ts:97](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/async/withAsync.ts#L97)

Function to transform raw errors into a specific error type

###### Parameters

###### error

`unknown`

The caught error of unknown type

###### Returns

`Err`

A properly typed error object

##### resetError?

> `optional` **resetError**: `null` \| `"onCall"` \| `"onFulfill"`

Defined in: [packages/core/src/async/withAsync.ts:109](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/async/withAsync.ts#L109)

When to reset the error state

- 'onCall': Reset error when the async operation starts (default)
- 'onFulfill': Reset error only when the operation succeeds
- Null: Never automatically reset errors

***

### AtomState\<T\>

> **AtomState**\<`T`\> = `T` *extends* [`AtomLike`](#atomlike)\<infer State, `any`, `any`\> ? `State` : `never`

Defined in: [packages/core/src/core/atom.ts:200](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L200)

Helper type to extract the state type from an atom-like object.

#### Type Parameters

##### T

`T`

The atom-like type to extract the state from

***

### BroadcastMessage

> **BroadcastMessage** = \{ `_type`: `"push"`; `key`: `string`; `rec`: [`PersistRecord`](#persistrecord) \| `null`; \} \| \{ `_type`: `"pull"`; `key`: `string`; \}

Defined in: [packages/core/src/persist/web-storage/broadcastChannel.ts:27](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/web-storage/broadcastChannel.ts#L27)

Message format for BroadcastChannel communication between tabs.

Supports two message types:

- `push`: Broadcasts data changes to other tabs
- `pull`: Requests current data from other tabs

#### Type declaration

\{ `_type`: `"push"`; `key`: `string`; `rec`: [`PersistRecord`](#persistrecord) \| `null`; \}

##### \_type

> **\_type**: `"push"`

Push message containing updated data

##### key

> **key**: `string`

Storage key for the data

##### rec

> **rec**: [`PersistRecord`](#persistrecord) \| `null`

The persist record data, or null for deletions

\{ `_type`: `"pull"`; `key`: `string`; \}

##### \_type

> **\_type**: `"pull"`

Pull message requesting current data

##### key

> **key**: `string`

Storage key to request data for

***

### Constructor()\<T\>

> **Constructor**\<`T`\> = (...`args`) => `T`

Defined in: [packages/core/src/utils.ts:772](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L772)

Represents a constructor function that can be instantiated with the new
operator.

#### Type Parameters

##### T

`T`

The type of object that will be created when instantiated

#### Parameters

##### args

...`any`[]

#### Returns

`T`

***

### Deatomize\<T\>

> **Deatomize**\<`T`\> = `T` *extends* [`Action`](#action) ? `T` : `T` *extends* [`LinkedListLikeAtom`](#linkedlistlikeatom)\<infer T\> ? `T` *extends* [`LinkedList`](#linkedlist)\<[`LLNode`](#llnode)\<infer T\>\> ? [`Deatomize`](#deatomize)\<`T`\>[] : `never` : `T` *extends* [`AtomLike`](#atomlike)\<infer T, `any`, `any`\> ? [`Deatomize`](#deatomize)\<`T`\> : `T` *extends* `Map`\<infer K, infer T\> ? `Map`\<`K`, [`Deatomize`](#deatomize)\<`T`\>\> : `T` *extends* `Set`\<infer T\> ? `Set`\<[`Deatomize`](#deatomize)\<`T`\>\> : `T` *extends* infer T[] ? [`Deatomize`](#deatomize)\<`T`\>[] : `T` *extends* `Primitive` \| `Builtin` ? `T` : `T` *extends* `Record`\<`PropertyKey`, `unknown`\> ? `{ [K in keyof T]: Deatomize<(...)[(...)]> }` : `T`

Defined in: [packages/core/src/methods/deatomize.ts:27](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/deatomize.ts#L27)

Type utility that recursively unwraps atom types to their state types

This complex type recursively traverses a type structure, unwrapping atoms to
their contained state types. It handles various container types like arrays,
maps, sets, and objects.

#### Type Parameters

##### T

`T`

The type to unwrap

#### Returns

Unwrapped version of the type with atoms replaced by their state
  types

***

### DeepPartial\<T, Skip\>

> **DeepPartial**\<`T`, `Skip`\> = `{ [K in keyof T]?: T[K] extends Skip ? T[K] : T[K] extends Rec ? DeepPartial<T[K], Skip> : T[K] }`

Defined in: [packages/core/src/form/reatomForm.ts:110](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomForm.ts#L110)

#### Type Parameters

##### T

`T`

##### Skip

`Skip` = `never`

***

### EnumAtom\<T, Format\>

> **EnumAtom**\<`T`, `Format`\> = [`Atom`](#atom)\<`T`\> & `EnumVariantSetters`\<`T`, `Format`\> & `object`

Defined in: [packages/core/src/primitives/reatomEnum.ts:15](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomEnum.ts#L15)

#### Type declaration

##### enum

> **enum**: `{ [K in T]: K }`

##### reset

> **reset**: [`Action`](#action)\<\[\], `T`\>

#### Type Parameters

##### T

`T` *extends* `string`

##### Format

`Format` *extends* [`EnumFormat`](#enumformat) = `"camelCase"`

***

### EnumAtomOptions\<T, Format\>

> **EnumAtomOptions**\<`T`, `Format`\> = `object`

Defined in: [packages/core/src/primitives/reatomEnum.ts:24](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomEnum.ts#L24)

#### Type Parameters

##### T

`T` *extends* `string`

##### Format

`Format` *extends* [`EnumFormat`](#enumformat) = `"camelCase"`

#### Properties

##### format?

> `optional` **format**: `Format`

Defined in: [packages/core/src/primitives/reatomEnum.ts:29](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomEnum.ts#L29)

##### initState?

> `optional` **initState**: `T`

Defined in: [packages/core/src/primitives/reatomEnum.ts:30](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomEnum.ts#L30)

##### name?

> `optional` **name**: `string`

Defined in: [packages/core/src/primitives/reatomEnum.ts:28](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomEnum.ts#L28)

***

### EnumFormat

> **EnumFormat** = `"camelCase"` \| `"snake_case"`

Defined in: [packages/core/src/primitives/reatomEnum.ts:5](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomEnum.ts#L5)

***

### EventOfTarget\<Target, Type\>

> **EventOfTarget**\<`Target`, `Type`\> = `Target` *extends* `Record`\<`` `on${Type}` ``, infer Cb\> ? `Parameters`\<`Cb`\>\[`0`\] : `Target` *extends* `Record`\<`"onEvent"`, (`type`, `cb`) => `any`\> ? `Parameters`\<`Cb`\>\[`0`\] : `never`

Defined in: [packages/core/src/web/onEvent.ts:4](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/onEvent.ts#L4)

#### Type Parameters

##### Target

`Target` *extends* `EventTarget`

##### Type

`Type` *extends* `string`

***

### Falsy

> **Falsy** = `false` \| `0` \| `""` \| `null` \| `undefined`

Defined in: [packages/core/src/utils.ts:56](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L56)

Union type of all JavaScript falsy values except for NaN. Includes: false, 0,
empty string, null, and undefined.

#### See

https://stackoverflow.com/a/51390763

***

### FieldErrorSource

> **FieldErrorSource** = `"validation"` \| `string` & `object`

Defined in: [packages/core/src/form/reatomField.ts:52](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L52)

***

### FieldValidateOption()\<State, Value\>

> **FieldValidateOption**\<`State`, `Value`\> = (`meta`) => [`FieldValidateOptionResult`](#fieldvalidateoptionresult) \| `Promise`\<[`FieldValidateOptionResult`](#fieldvalidateoptionresult)\>

Defined in: [packages/core/src/form/reatomField.ts:167](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L167)

#### Type Parameters

##### State

`State` = `any`

##### Value

`Value` = `State`

#### Parameters

##### meta

###### focus

[`FieldFocus`](#fieldfocus)

###### state

`State`

###### validation

[`FieldValidation`](#fieldvalidation)

###### value

`Value`

#### Returns

[`FieldValidateOptionResult`](#fieldvalidateoptionresult) \| `Promise`\<[`FieldValidateOptionResult`](#fieldvalidateoptionresult)\>

***

### FieldValidateOptionResult

> **FieldValidateOptionResult** = `string` \| `string`[] \| [`FieldErrorBody`](#fielderrorbody) \| [`FieldErrorBody`](#fielderrorbody)[] \| `void` \| `undefined`

Defined in: [packages/core/src/form/reatomField.ts:174](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L174)

***

### FormFieldArrayAtom\<Param, Node\>

> **FormFieldArrayAtom**\<`Param`, `Node`\> = [`LinkedListAtom`](#linkedlistatom)\<\[`ExtractFieldArray`\<`Param`\>\], [`FormFieldElement`](#formfieldelement)\<`Node`\>\> & `object`

Defined in: [packages/core/src/form/reatomForm.ts:72](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomForm.ts#L72)

#### Type declaration

##### initState

> **initState**: [`Atom`](#atom)\<[`LinkedList`](#linkedlist)\<[`LLNode`](#llnode)\<[`FormFieldElement`](#formfieldelement)\<`Node`\>\>\>\>

##### reset

> **reset**: [`Action`](#action)\<\[\], [`AtomState`](#atomstate-1)\<[`FormFieldArrayAtom`](#formfieldarrayatom)\<`Param`, `Node`\>\>\>

#### Type Parameters

##### Param

`Param` = `any`

##### Node

`Node` *extends* `FormInitStateElement` = `FormInitStateElement`

***

### FormFieldElement\<T\>

> **FormFieldElement**\<`T`\> = `T` *extends* [`FieldLikeAtom`](#fieldlikeatom) ? `T` : `T` *extends* `Date` ? [`FieldAtom`](#fieldatom)\<`T`\> : `T` *extends* infer Item[] ? `Item` *extends* `FormInitStateElement` ? [`FormFieldArrayAtom`](#formfieldarrayatom)\<`Item`, `Item`\> : `never` : `T` *extends* `FormFieldArray`\<infer Param, infer Node\> ? [`FormFieldArrayAtom`](#formfieldarrayatom)\<`Param`, `Node`\> : `T` *extends* [`FieldOptions`](#fieldoptions) & `object` ? `T` *extends* [`FieldOptions`](#fieldoptions)\<`State`, `State`\> ? [`FieldAtom`](#fieldatom)\<`State`\> : `T` *extends* [`FieldOptions`](#fieldoptions)\<`State`, infer Value\> ? [`FieldAtom`](#fieldatom)\<`State`, `Value`\> : `never` : `T` *extends* [`Rec`](#rec)\<`unknown`\> ? `{ [K in keyof T]: FormFieldElement<T[K]> }` : [`FieldAtom`](#fieldatom)\<`T`\>

Defined in: [packages/core/src/form/reatomForm.ts:80](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomForm.ts#L80)

#### Type Parameters

##### T

`T` *extends* `FormInitStateElement` \| `unknown` = `FormInitStateElement`

***

### FormFields\<T\>

> **FormFields**\<`T`\> = `{ [K in keyof T]: FormFieldElement<T[K]> }`

Defined in: [packages/core/src/form/reatomForm.ts:102](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomForm.ts#L102)

#### Type Parameters

##### T

`T` *extends* [`FormInitState`](#forminitstate) = [`FormInitState`](#forminitstate)

***

### FormInitState

> **FormInitState** = `object`

Defined in: [packages/core/src/form/reatomForm.ts:62](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomForm.ts#L62)

#### Index Signature

\[`key`: `string`\]: `FormInitStateElement` \| [`FormInitState`](#forminitstate)

***

### FormPartialState\<T\>

> **FormPartialState**\<`T`\> = [`DeepPartial`](#deeppartial)\<[`FormState`](#formstate)\<`T`\>, `unknown`[]\>

Defined in: [packages/core/src/form/reatomForm.ts:117](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomForm.ts#L117)

#### Type Parameters

##### T

`T` *extends* [`FormInitState`](#forminitstate) = [`FormInitState`](#forminitstate)

***

### FormState\<T\>

> **FormState**\<`T`\> = [`Deatomize`](#deatomize)\<[`FormFields`](#formfields-1)\<`T`\>\>

Defined in: [packages/core/src/form/reatomForm.ts:106](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomForm.ts#L106)

#### Type Parameters

##### T

`T` *extends* [`FormInitState`](#forminitstate) = [`FormInitState`](#forminitstate)

***

### FunctionSource

> **FunctionSource** = `string`

Defined in: [packages/core/src/core/atom.ts:240](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L240)

Type representing the source of a function as a string. Used for caching and
identification purposes.

***

### GenericAction\<T\>

> **GenericAction**\<`T`\> = `T` & [`Action`](#action)\<`Parameters`\<`T`\>, `ReturnType`\<`T`\>\>

Defined in: [packages/core/src/core/action.ts:25](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/action.ts#L25)

#### Type Parameters

##### T

`T` *extends* [`Fn`](#fn)

***

### LLNode\<T\>

> **LLNode**\<`T`\> = `T` & `object`

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:16](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomLinkedList.ts#L16)

Linked List is reusing the model reference to simplify the reference sharing
and using it as a key of LL methods. Btw, symbols works fine with
serialization and will not add a garbage to an output.

#### Type declaration

##### \[LL\_NEXT\]

> **\[LL\_NEXT\]**: `null` \| [`LLNode`](#llnode)\<`T`\>

##### \[LL\_PREV\]

> **\[LL\_PREV\]**: `null` \| [`LLNode`](#llnode)\<`T`\>

#### Type Parameters

##### T

`T` *extends* [`Rec`](#rec) = [`Rec`](#rec)

***

### MaybeUnsubscribe

> **MaybeUnsubscribe** = `void` \| [`Unsubscribe`](#unsubscribe-2) \| \{ `unsubscribe`: [`Unsubscribe`](#unsubscribe-2); \}

Defined in: [packages/core/src/utils.ts:33](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L33)

Type representing different possible return values from observable
subscription methods. Supports both function-based unsubscribers and objects
with unsubscribe methods.

***

### Merge\<Target, Extensions\>

> **Merge**\<`Target`, `Extensions`\> = `Extensions` *extends* \[\] ? `Target` : `Extensions` *extends* \[infer E, `...(infer Rest extends any[])`\] ? [`Merge`](#merge-1)\<`E` *extends* [`AtomLike`](#atomlike) ? `E` : `Target` & `E`, `Rest`\> : `never`

Defined in: [packages/core/src/core/extend.ts:57](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/extend.ts#L57)

Helper type for merging an atom/action with a series of extensions.

This type recursively merges a target with each extension in an array.

#### Type Parameters

##### Target

`Target` *extends* [`AtomLike`](#atomlike)

The base atom or action type

##### Extensions

`Extensions` *extends* `any`[]

Array of extension results to merge with the target

***

### Middleware()\<Target\>

> **Middleware**\<`Target`\> = (`next`, ...`params`) => [`AtomState`](#atomstate-1)\<`Target`\>

Defined in: [packages/core/src/core/extend.ts:152](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/extend.ts#L152)

Type representing a middleware function for atoms and actions.

Middleware functions intercept atom/action calls, allowing for custom
behavior to be applied before or after the normal execution. They receive the
next middleware function in the chain and the parameters passed to the
atom/action.

#### Type Parameters

##### Target

`Target` *extends* [`AtomLike`](#atomlike) = [`AtomLike`](#atomlike)

The atom or action type the middleware applies to

#### Parameters

##### next

(...`params`) => [`AtomState`](#atomstate-1)\<`Target`\>

The next middleware function in the chain or the original
  atom/action handler

##### params

...[`OverloadParameters`](#overloadparameters)\<`Target`\>

The parameters passed to the atom/action

#### Returns

[`AtomState`](#atomstate-1)\<`Target`\>

The state resulting from the atom/action execution

***

### OmitValues\<T, V\>

> **OmitValues**\<`T`, `V`\> = `{ [K in OmitValuesKeys<T, V>]: T[K] }`

Defined in: [packages/core/src/utils.ts:128](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L128)

Creates a type with all properties from T except those with values extending
V.

#### Type Parameters

##### T

`T`

The object type to filter properties from

##### V

`V`

The value type to exclude

***

### OmitValuesKeys\<T, V\>

> **OmitValuesKeys**\<`T`, `V`\> = [`Values`](#values-4)\<`{ [K in keyof T]: T[K] extends V ? never : K }`\>

Defined in: [packages/core/src/utils.ts:117](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L117)

Extracts keys from type T where the corresponding value does not extend type
V.

#### Type Parameters

##### T

`T`

The object type to extract keys from

##### V

`V`

The value type to exclude

***

### OverloadParameters\<T\>

> **OverloadParameters**\<`T`\> = `Parameters`\<[`Overloads`](#overloads)\<`T`\>\>

Defined in: [packages/core/src/utils.ts:190](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L190)

Extracts the parameters type from an overloaded function. Returns a union of
all possible parameter tuples.

#### Type Parameters

##### T

`T`

The overloaded function type to extract parameters from

***

### Overloads\<T\>

> **Overloads**\<`T`\> = `T` *extends* \{(...`params`): `Return1`; (...`params`): `Return2`; (...`params`): `Return3`; (...`params`): `Return4`; (...`params`): `Return5`; \} ? (...`params`) => `Return1` \| `Return2` \| `Return3` \| `Return4` \| `Return5` : `never`

Defined in: [packages/core/src/utils.ts:160](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L160)

Flattens a function type with up to 5 overloads into a single function
signature. This creates a union of the parameter types and return types.

Useful for generic type handling of overloaded functions.

#### Type Parameters

##### T

`T`

The overloaded function type to flatten

***

### PathKeys\<Path\>

> **PathKeys**\<`Path`\> = `Record`\<keyof [`PathParams`](#pathparams)\<`Path`\>, `any`\>

Defined in: [packages/core/src/web/route.ts:29](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/route.ts#L29)

#### Type Parameters

##### Path

`Path` *extends* `string`

***

### PathParams\<Path\>

> **PathParams**\<`Path`\> = `Path` *extends* `` `:${infer Param}/${infer Rest}` `` ? `{ [key in Param]: string }` & [`PathParams`](#pathparams)\<`Rest`\> : `Path` *extends* `` `:${infer MaybeOptionalParam}` `` ? `MaybeOptionalParam` *extends* `` `${infer OptionalParam}?` `` ? `{ [key in OptionalParam]?: string }` : `{ [key in MaybeOptionalParam]: string }` : `Path` *extends* `` `${string}/${infer Rest}` `` ? [`PathParams`](#pathparams)\<`Rest`\> : `object`

Defined in: [packages/core/src/web/route.ts:18](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/route.ts#L18)

#### Type Parameters

##### Path

`Path` *extends* `string` = `string`

***

### PickValues\<T, V\>

> **PickValues**\<`T`, `V`\> = `{ [K in PickValuesKeys<T, V>]: T[K] }`

Defined in: [packages/core/src/utils.ts:148](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L148)

Creates a type with only properties from T with values extending V.

#### Type Parameters

##### T

`T`

The object type to filter properties from

##### V

`V`

The value type to include

***

### PickValuesKeys\<T, V\>

> **PickValuesKeys**\<`T`, `V`\> = [`Values`](#values-4)\<`{ [K in keyof T]: T[K] extends V ? K : never }`\>

Defined in: [packages/core/src/utils.ts:138](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L138)

Extracts keys from type T where the corresponding value extends type V.

#### Type Parameters

##### T

`T`

The object type to extract keys from

##### V

`V`

The value type to include

***

### Plain\<Intersection\>

> **Plain**\<`Intersection`\> = `Intersection` *extends* (...`params`) => infer O ? (...`params`) => `O` & `{ [Key in keyof Intersection]: Intersection[Key] }` : `Intersection` *extends* (...`params`) => `any` ? `Intersection` : `Intersection` *extends* `object` ? `{ [Key in keyof Intersection]: Intersection[Key] }` : `Intersection`

Defined in: [packages/core/src/utils.ts:68](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L68)

Removes named generics to produce a plain type representation. Preserves
function signatures and object structure while eliminating generic parameter
names.

This is useful for presenting cleaner types in documentation and error
messages.

#### Type Parameters

##### Intersection

`Intersection`

The type to convert to a plain representation

***

### Rec\<T\>

> **Rec**\<`T`\> = `Record`\<`string`, `T`\>

Defined in: [packages/core/src/utils.ts:18](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L18)

Type alias for Record<string, T> for brevity. Represents an object with
string keys and values of type T.

#### Type Parameters

##### T

`T` = `any`

The type of values in the record (defaults to any)

***

### Shallow\<T\>

> **Shallow**\<`T`\> = `{ [K in keyof T]: T[K] }` & `object`

Defined in: [packages/core/src/utils.ts:88](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L88)

Creates a shallow clone type of T. Useful for creating a new type that has
the same shape but is a distinct type.

#### Type Parameters

##### T

`T`

The type to create a shallow clone of

***

### StringAtom\<T\>

> **StringAtom**\<`T`\> = [`Atom`](#atom)\<`T`\> & `object`

Defined in: [packages/core/src/primitives/reatomString.ts:4](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomString.ts#L4)

#### Type declaration

##### reset

> **reset**: [`Action`](#action)\<\[\], `T`\>

#### Type Parameters

##### T

`T` *extends* `string` = `string`

***

### SubmitAction\<Return\>

> **SubmitAction**\<`Return`\> = [`Action`](#action)\<\[\], `Promise`\<`Return`\>\> & [`AsyncExt`](#asyncext)\<\[\], `Return`, `Error` \| `undefined`\> & [`AbortExt`](#abortext)

Defined in: [packages/core/src/form/reatomForm.ts:120](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomForm.ts#L120)

#### Type Parameters

##### Return

`Return`

***

### SuspenseExt\<State\>

> **SuspenseExt**\<`State`\> = `object`

Defined in: [packages/core/src/mixins/withSuspense.ts:43](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/mixins/withSuspense.ts#L43)

#### Type Parameters

##### State

`State`

#### Properties

##### suspended

> **suspended**: [`Computed`](#computed)\<`Awaited`\<`State`\>\>

Defined in: [packages/core/src/mixins/withSuspense.ts:44](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/mixins/withSuspense.ts#L44)

***

### UndefinedToOptional\<T\>

> **UndefinedToOptional**\<`T`\> = `Partial`\<`T`\> & [`PickValues`](#pickvalues)\<`T`, \{ \} \| `null`\>

Defined in: [packages/core/src/utils.ts:47](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L47)

Utility type that converts properties with undefined values to optional
properties. Makes properties with object or null values required, while
making other properties optional.

#### Type Parameters

##### T

`T` *extends* `object`

The object type to transform

***

### UrlSearchParamsInit

> **UrlSearchParamsInit** = `ConstructorParameters`\<*typeof* `URLSearchParams`\>\[`0`\]

Defined in: [packages/core/src/web/fetch.ts:1](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/fetch.ts#L1)

***

### Values\<T\>

> **Values**\<`T`\> = `T`\[keyof `T`\]

Defined in: [packages/core/src/utils.ts:108](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L108)

Extracts the union type of all values in an object type.

#### Type Parameters

##### T

`T`

The object type to extract values from

***

### WebSocketReadyState

> **WebSocketReadyState** = `"CONNECTING"` \| `"OPEN"` \| `"CLOSING"` \| `"CLOSED"`

Defined in: packages/core/src/web/reatomWebSocket.ts:8

***

### WithCacheOptions\<Params\>

> **WithCacheOptions**\<`Params`\> = `object` & \{ `paramsToKey?`: (`params`) => `string`; \} \| \{ `isEqual?`: (`prev`, `next`) => `boolean`; \}

Defined in: packages/core/src/async/withCache.ts:27

#### Type declaration

##### ignoreAbort?

> `optional` **ignoreAbort**: `boolean`

Define if the effect should be prevented from abort.

###### Default

```ts
true
```

##### length?

> `optional` **length**: `number`

Maximum amount of cache records.

###### Default

```ts
5
```

##### paramsLength?

> `optional` **paramsLength**: `number`

The number of expected parameters, which will be used as a cache key.

###### Default

```ts
undefined (all)
```

##### staleTime?

> `optional` **staleTime**: `number`

The amount of milliseconds after which a cache record cleanups.

###### Default

```ts
5 * 60 * 1000 ms (5 minutes)
```

##### swr?

> `optional` **swr**: `boolean` \| \{ `shouldFulfill?`: `boolean`; `shouldPending?`: `boolean`; `shouldReject?`: `boolean`; \}

(stale while revalidate) Define if fetching should be triggered even if the
cache exists.

###### Type declaration

`boolean`

\{ `shouldFulfill?`: `boolean`; `shouldPending?`: `boolean`; `shouldReject?`: `boolean`; \}

###### Default

```ts
true
```

#### Type Parameters

##### Params

`Params` *extends* `any`[] = `any`[]

## Variables

### abortVar

> **abortVar**: [`AbortVar`](#abortvar)

Defined in: [packages/core/src/methods/abortVar.ts:137](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/abortVar.ts#L137)

Global abort variable that creates abort atoms coupled to the current frame.

The abortVar is computed from all other abort atoms in the current frame
tree, which allows for propagation of abortion signals through the
computation hierarchy. This is a critical component for cancellation handling
in Reatom's async operations.

#### Example

```ts
// Check if current operation is aborted
  try {
    abortVar.throwIfAborted()
    // continue operation...
  } catch (e) {
    // Handle abortion
  }

  // Trigger abortion
  abortVar.abort('Operation cancelled')

  // Get AbortController for fetch API
  const controller = abortVar.getController()
  fetch('/api/data', { signal: controller?.signal })
```

***

### action()

> **action**: \{\<`Params`, `Payload`\>(`cb`, `name?`): [`Action`](#action)\<`Params`, `Payload`\>; \<`T`\>(`cb`, `name?`): [`GenericAction`](#genericaction)\<`T`\>; \}

Defined in: [packages/core/src/core/action.ts:82](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/action.ts#L82)

Creates a logic and side effect container.

Actions are used to encapsulate complex logic, perform side effects (like API
calls), and orchestrate multiple state updates. Unlike atoms, actions are
meant to be called with parameters and can return values.

Actions also have atom-like features (subscribe, extend) and track their call
history.

#### Call Signature

> \<`Params`, `Payload`\>(`cb`, `name?`): [`Action`](#action)\<`Params`, `Payload`\>

##### Type Parameters

###### Params

`Params` *extends* `any`[] = `any`[]

###### Payload

`Payload` = `any`

##### Parameters

###### cb

(...`params`) => `Payload`

###### name?

`string`

##### Returns

[`Action`](#action)\<`Params`, `Payload`\>

#### Call Signature

> \<`T`\>(`cb`, `name?`): [`GenericAction`](#genericaction)\<`T`\>

##### Type Parameters

###### T

`T` *extends* [`Fn`](#fn)

##### Parameters

###### cb

`T`

###### name?

`string`

##### Returns

[`GenericAction`](#genericaction)\<`T`\>

#### Example

```ts
// Create an action that fetches data and updates state
  const fetchUserData = action(async (userId: string) => {
    const response = await wrap(fetch(`/api/users/${userId}`))
    const data = await wrap(response.json())

    // Update state atoms with the fetched data
    userName(data.name)
    userEmail(data.email)

    return data // Actions can return values
  }, 'fetchUserData')

  // Call the action
  fetchUserData('user123')
```

#### Template

The parameter types the action accepts

#### Template

The return type of the action

#### Param

The function containing the action's logic

#### Param

Optional name for debugging purposes

#### Returns

An action instance that can be called with the specified parameters

***

### assign()

> `const` **assign**: \{\<`T1`, `T2`\>(`a1`, `a2`): [`Plain`](#plain)\<`T1` *extends* (...`params`) => `O` ? (...`params`) => `O` : `object` & `Omit`\<`T1`, keyof `T2`\> & `Omit`\<`T2`, `never`\> & `Omit`\<\{ \}, `never`\>\>; \<`T1`, `T2`, `T3`\>(`a1`, `a2`, `a3?`): [`Plain`](#plain)\<`T1` *extends* (...`params`) => `O` ? (...`params`) => `O` : `object` & `Omit`\<`T1`, keyof `T2` \| keyof `T3`\> & `Omit`\<`T2`, keyof `T3`\> & `Omit`\<`T3`, `never`\>\>; \<`T1`, `T2`, `T3`, `T4`\>(`a1`, `a2`, `a3?`, `a4?`): [`Plain`](#plain)\<`T1` *extends* (...`params`) => `O` ? (...`params`) => `O` : `object` & `Omit`\<`T1`, keyof `T2` \| keyof `T3` \| keyof `T4`\> & `Omit`\<`T2`, keyof `T3` \| keyof `T4`\> & `Omit`\<`T3`, keyof `T4`\> & `T4`\>; \} = `Object.assign`

Defined in: [packages/core/src/utils.ts:399](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L399)

Type-safe version of Object.assign that properly handles type merging. Unlike
standard Object.assign typing, properties with the same name are replaced
rather than becoming a union type.

#### Call Signature

> \<`T1`, `T2`\>(`a1`, `a2`): [`Plain`](#plain)\<`T1` *extends* (...`params`) => `O` ? (...`params`) => `O` : `object` & `Omit`\<`T1`, keyof `T2`\> & `Omit`\<`T2`, `never`\> & `Omit`\<\{ \}, `never`\>\>

##### Type Parameters

###### T1

`T1`

###### T2

`T2`

##### Parameters

###### a1

`T1`

###### a2

`T2`

##### Returns

[`Plain`](#plain)\<`T1` *extends* (...`params`) => `O` ? (...`params`) => `O` : `object` & `Omit`\<`T1`, keyof `T2`\> & `Omit`\<`T2`, `never`\> & `Omit`\<\{ \}, `never`\>\>

#### Call Signature

> \<`T1`, `T2`, `T3`\>(`a1`, `a2`, `a3?`): [`Plain`](#plain)\<`T1` *extends* (...`params`) => `O` ? (...`params`) => `O` : `object` & `Omit`\<`T1`, keyof `T2` \| keyof `T3`\> & `Omit`\<`T2`, keyof `T3`\> & `Omit`\<`T3`, `never`\>\>

##### Type Parameters

###### T1

`T1`

###### T2

`T2`

###### T3

`T3` = \{ \}

##### Parameters

###### a1

`T1`

###### a2

`T2`

###### a3?

`T3`

##### Returns

[`Plain`](#plain)\<`T1` *extends* (...`params`) => `O` ? (...`params`) => `O` : `object` & `Omit`\<`T1`, keyof `T2` \| keyof `T3`\> & `Omit`\<`T2`, keyof `T3`\> & `Omit`\<`T3`, `never`\>\>

#### Call Signature

> \<`T1`, `T2`, `T3`, `T4`\>(`a1`, `a2`, `a3?`, `a4?`): [`Plain`](#plain)\<`T1` *extends* (...`params`) => `O` ? (...`params`) => `O` : `object` & `Omit`\<`T1`, keyof `T2` \| keyof `T3` \| keyof `T4`\> & `Omit`\<`T2`, keyof `T3` \| keyof `T4`\> & `Omit`\<`T3`, keyof `T4`\> & `T4`\>

##### Type Parameters

###### T1

`T1`

###### T2

`T2`

###### T3

`T3` = \{ \}

###### T4

`T4` = \{ \}

##### Parameters

###### a1

`T1`

###### a2

`T2`

###### a3?

`T3`

###### a4?

`T4`

##### Returns

[`Plain`](#plain)\<`T1` *extends* (...`params`) => `O` ? (...`params`) => `O` : `object` & `Omit`\<`T1`, keyof `T2` \| keyof `T3` \| keyof `T4`\> & `Omit`\<`T2`, keyof `T3` \| keyof `T4`\> & `Omit`\<`T3`, keyof `T4`\> & `T4`\>

#### Template

Type of the target object

#### Template

Type of the first source object

#### Template

Type of the optional second source object

#### Template

Type of the optional third source object

#### Returns

A new object with merged properties

***

### atom()

> **atom**: \{\<`T`\>(): [`Atom`](#atom)\<`undefined` \| `T`\>; \<`T`\>(`createState`, `name?`): [`Atom`](#atom)\<`T`\>; \<`T`\>(`initState`, `name?`): [`Atom`](#atom)\<`T`\>; \}

Defined in: [packages/core/src/core/atom.ts:862](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L862)

Creates a mutable state container.

The atom is the core primitive for storing and updating mutable state in
Reatom. Atoms can be called as functions to read their current value or to
update the value.

#### Call Signature

> \<`T`\>(): [`Atom`](#atom)\<`undefined` \| `T`\>

##### Type Parameters

###### T

`T`

##### Returns

[`Atom`](#atom)\<`undefined` \| `T`\>

#### Call Signature

> \<`T`\>(`createState`, `name?`): [`Atom`](#atom)\<`T`\>

##### Type Parameters

###### T

`T`

##### Parameters

###### createState

() => `T`

###### name?

`string`

##### Returns

[`Atom`](#atom)\<`T`\>

#### Call Signature

> \<`T`\>(`initState`, `name?`): [`Atom`](#atom)\<`T`\>

##### Type Parameters

###### T

`T`

##### Parameters

###### initState

`T`

###### name?

`string`

##### Returns

[`Atom`](#atom)\<`T`\>

#### Example

```ts
// Create with initial value
  const counter = atom(0, 'counter')

  // Read current value
  const value = counter() // -> 0

  // Update with new value
  counter.set(5) // Sets value to 5

  // Update with a function
  counter.set((prev) => prev + 1) // Sets value to 6
```

#### Template

The type of state stored in the atom

#### Param

A function that returns the initial state, or the
  initial state value directly

#### Param

Optional name for the atom (useful for debugging)

#### Returns

An atom instance containing the state

***

### context

> **context**: [`ContextAtom`](#contextatom)

Defined in: [packages/core/src/core/atom.ts:929](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L929)

Core context object that manages the reactive state context in Reatom.

The context is responsible for tracking dependencies between atoms, managing
computation stacks, and ensuring proper reactivity. It serves as the
foundation for Reatom's reactivity system and provides access to the current
context frame.

#### Returns

The current context frame

#### Throws

If called outside a valid context (broken async stack)

***

### createAtom()

> **createAtom**: \{\<`State`\>(`setup`, `name?`): [`Atom`](#atom)\<`State`\>; \<`State`\>(`setup`, `name?`): [`Atom`](#atom)\<`State`\>; \}

Defined in: [packages/core/src/core/atom.ts:667](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L667)

#### Call Signature

> \<`State`\>(`setup`, `name?`): [`Atom`](#atom)\<`State`\>

##### Type Parameters

###### State

`State`

##### Parameters

###### setup

###### computed

(`prev`) => `State`

###### initState

`State` \| () => `State`

###### name?

`string`

##### Returns

[`Atom`](#atom)\<`State`\>

#### Call Signature

> \<`State`\>(`setup`, `name?`): [`Atom`](#atom)\<`State`\>

##### Type Parameters

###### State

`State`

##### Parameters

###### setup

###### computed?

() => `State` \| (`state?`) => `State`

###### initState?

`State` \| () => `State`

###### name?

`string`

##### Returns

[`Atom`](#atom)\<`State`\>

***

### entries()

> `const` **entries**: \<`T`\>(`thing`) => \[keyof `T`, `T`\[keyof `T`\]\][] = `Object.entries`

Defined in: [packages/core/src/utils.ts:444](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L444)

Type-safe version of Object.entries that preserves key and value type
information. Returns an array of key-value pairs with correct types.

#### Type Parameters

##### T

`T` *extends* `object`

The object type

#### Parameters

##### thing

`T`

The object to get entries from

#### Returns

\[keyof `T`, `T`\[keyof `T`\]\][]

An array of [key, value] pairs with proper typing

***

### FetchRequest

> **FetchRequest**: *typeof* [`FetchRequest`](#fetchrequest)

Defined in: [packages/core/src/web/fetch.ts:19](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/fetch.ts#L19)

***

### fieldInitFocus

> `const` **fieldInitFocus**: [`FieldFocus`](#fieldfocus)

Defined in: [packages/core/src/form/reatomField.ts:255](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L255)

***

### fieldInitValidation

> `const` **fieldInitValidation**: [`FieldValidation`](#fieldvalidation)

Defined in: [packages/core/src/form/reatomField.ts:261](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L261)

***

### fieldInitValidationLess

> `const` **fieldInitValidationLess**: [`FieldValidation`](#fieldvalidation)

Defined in: [packages/core/src/form/reatomField.ts:268](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L268)

***

### keys()

> `const` **keys**: \<`T`\>(`thing`) => keyof `T`[] = `Object.keys`

Defined in: [packages/core/src/utils.ts:432](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L432)

Type-safe version of Object.keys that preserves the key type information.
Returns an array of keys with the correct type for the object.

#### Type Parameters

##### T

`T` *extends* `object`

The object type

#### Parameters

##### thing

`T`

The object to get keys from

#### Returns

keyof `T`[]

An array of the object's keys with proper typing

***

### LL\_NEXT

> `const` **LL\_NEXT**: *typeof* [`LL_NEXT`](#ll_next)

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:9](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomLinkedList.ts#L9)

***

### LL\_PREV

> `const` **LL\_PREV**: *typeof* [`LL_PREV`](#ll_prev)

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:8](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomLinkedList.ts#L8)

***

### log

> **log**: [`Action`](#action)\<\[`string`, `any`\], `any`\>

Defined in: [packages/core/src/connectLogger.ts:14](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/connectLogger.ts#L14)

***

### MAX\_SAFE\_TIMEOUT

> `const` **MAX\_SAFE\_TIMEOUT**: `number`

Defined in: [packages/core/src/utils.ts:764](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L764)

Maximum safe integer value for setTimeout delay. Any timeout value larger
than this may cause overflow issues in some browsers.

#### See

https://developer.mozilla.org/en-US/docs/Web/API/setTimeout#maximum_delay_value

***

### merge

> `const` **merge**: *typeof* [`assign`](#assign-1)

Defined in: [packages/core/src/utils.ts:421](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L421)

Creates a new object with merged properties from all provided objects.
Similar to Object.assign but always creates a new object rather than mutating
the first argument.

#### Example

```ts
// Creates a new object: { a: 1, b: 2, c: 3 }
  const obj = merge({ a: 1 }, { b: 2 }, { c: 3 })
```

#### Returns

A new object with all properties from the provided objects

***

### noop()

> `const` **noop**: (...`params`) => `any`

Defined in: [packages/core/src/utils.ts:224](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L224)

No-operation function that accepts any parameters and returns undefined.
Useful as a default callback or for stubbing functionality.

#### Parameters

##### params

...`any`[]

#### Returns

`any`

***

### onEvent()

> `const` **onEvent**: \{\<`Target`, `Type`\>(`target`, `type`): `Promise`\<[`EventOfTarget`](#eventoftarget)\<`Target`, `Type`\>\>; \<`Event`\>(`target`, `type`): `Promise`\<`Event`\>; \<`Target`, `Type`\>(`target`, `type`, `cb`, `options?`): [`Unsubscribe`](#unsubscribe-2); \<`Event`\>(`target`, `type`, `cb`, `options?`): [`Unsubscribe`](#unsubscribe-2); \}

Defined in: [packages/core/src/web/onEvent.ts:14](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/onEvent.ts#L14)

#### Call Signature

> \<`Target`, `Type`\>(`target`, `type`): `Promise`\<[`EventOfTarget`](#eventoftarget)\<`Target`, `Type`\>\>

##### Type Parameters

###### Target

`Target` *extends* `EventTarget`

###### Type

`Type` *extends* `string`

##### Parameters

###### target

`Target`

###### type

`Type`

##### Returns

`Promise`\<[`EventOfTarget`](#eventoftarget)\<`Target`, `Type`\>\>

#### Call Signature

> \<`Event`\>(`target`, `type`): `Promise`\<`Event`\>

##### Type Parameters

###### Event

`Event`

##### Parameters

###### target

`EventTarget`

###### type

`string`

##### Returns

`Promise`\<`Event`\>

#### Call Signature

> \<`Target`, `Type`\>(`target`, `type`, `cb`, `options?`): [`Unsubscribe`](#unsubscribe-2)

##### Type Parameters

###### Target

`Target` *extends* `EventTarget`

###### Type

`Type` *extends* `string`

##### Parameters

###### target

`Target`

###### type

`Type`

###### cb

(`value`) => `any`

###### options?

`AddEventListenerOptions`

##### Returns

[`Unsubscribe`](#unsubscribe-2)

#### Call Signature

> \<`Event`\>(`target`, `type`, `cb`, `options?`): [`Unsubscribe`](#unsubscribe-2)

##### Type Parameters

###### Event

`Event`

##### Parameters

###### target

`EventTarget`

###### type

`string`

###### cb

(`value`) => `any`

###### options?

`AddEventListenerOptions`

##### Returns

[`Unsubscribe`](#unsubscribe-2)

***

### onLineAtom

> **onLineAtom**: `OnlineAtom`

Defined in: [packages/core/src/web/onLineAtom.ts:14](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/onLineAtom.ts#L14)

#### Note

https://issues.chromium.org/issues/338514113

***

### ~~parseAtoms()~~

> **parseAtoms**: \<`Value`\>(`value`) => [`Deatomize`](#deatomize)\<`Value`\> = `deatomize`

Defined in: [packages/core/src/methods/deatomize.ts:112](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/deatomize.ts#L112)

Recursively unwraps atoms in a value to get their current states

This function deeply traverses a value, including nested objects, arrays,
maps, and sets, replacing atoms with their current state values. It's useful
for serialization, debugging, or creating snapshots of state that don't
contain reactive references.

#### Type Parameters

##### Value

`Value`

The type of value to parse

#### Parameters

##### value

`Value`

The value containing atoms to unwrap

#### Returns

[`Deatomize`](#deatomize)\<`Value`\>

A new value with all atoms replaced by their
  current states

#### Example

```ts
const user = {
    id: 42,
    name: atom('John', 'userName'),
    stats: {
      score: atom(100, 'userScore'),
      badges: atom(['gold', 'silver'], 'userBadges'),
    },
  }

  // Results in: { id: 42, name: 'John', stats: { score: 100, badges: ['gold', 'silver'] }}
  const plainUser = deatomize(user)
```

#### Deprecated

Use `deatomize` instead

***

### rAF

> **rAF**: [`Atom`](#atom)\<\{ `delta`: `number`; `timestamp`: `number`; \}, \[`object`\]\>

Defined in: [packages/core/src/web/rAF.ts:4](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/rAF.ts#L4)

***

### random

> `const` **random**: *typeof* `_random`

Defined in: [packages/core/src/utils.ts:522](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L522)

Generates a random integer between min and max (inclusive).

#### Param

The minimum integer value (defaults to 0)

#### Param

The maximum integer value (defaults to Number.MAX_SAFE_INTEGER -
  1)

#### Returns

A random integer between min and max

***

### reatomObservable()

> `const` **reatomObservable**: \{\<`T`\>(`producer`, `init?`, `name?`): [`Atom`](#atom)\<`undefined` \| `T`\>; \<`T`\>(`producer`, `init`, `name?`): [`Atom`](#atom)\<`T`\>; \}

Defined in: [packages/core/src/methods/reatomObservable.ts:135](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/reatomObservable.ts#L135)

Creates a Reatom atom from an observable-like data source.

This function bridges external observable sources (like RxJS observables,
event emitters, or custom observable implementations) with Reatom's reactive
system. The atom will automatically subscribe to the observable when it gains
subscribers and unsubscribe when it loses all subscribers.

#### Call Signature

> \<`T`\>(`producer`, `init?`, `name?`): [`Atom`](#atom)\<`undefined` \| `T`\>

##### Type Parameters

###### T

`T`

##### Parameters

###### producer

`Producer`\<`T`\>

###### init?

`undefined`

###### name?

`string`

##### Returns

[`Atom`](#atom)\<`undefined` \| `T`\>

#### Call Signature

> \<`T`\>(`producer`, `init`, `name?`): [`Atom`](#atom)\<`T`\>

##### Type Parameters

###### T

`T`

##### Parameters

###### producer

`Producer`\<`T`\>

###### init

`T` | () => `T`

###### name?

`string`

##### Returns

[`Atom`](#atom)\<`T`\>

#### Examples

```ts
// With RxJS Observable
  import { interval } from 'rxjs'
  const timerAtom = reatomObservable(interval(1000))
```

```ts
// With custom observable function
  const customAtom = reatomObservable((setter) => {
    const id = setInterval(() => setter(Date.now()), 1000)
    return () => clearInterval(id)
  })
```

```ts
// With MobX observable
  import { autorun, observable } from 'mobx'
  const mobxStore = observable({ count: 0 })
  const atomWithDefault = reatomObservable(
    () => autorun(() => mobxStore.count),
    () => mobxStore.count,
  )
```

```ts
// With addEventListener
  const clickAtom = reatomObservable((setter) => {
    document.addEventListener('click', setter)
    return () => document.removeEventListener('click', setter)
  })
```

#### Template

The type of values emitted by the observable

#### Param

Either a function that accepts a setter callback and
  returns an unsubscribe function, or an object with a subscribe method

#### Param

Optional initial value or function that returns the initial
  value. If not provided, the atom starts with `undefined`

#### Returns

A Reatom atom that reflects the observable's values

***

### reatomRoute()

> **reatomRoute**: \{\<`SubPath`\>(`path`, `name?`): [`RouteAtom`](#routeatom)\<`` `/${SubPath}` ``, [`Plain`](#plain)\<`object` & [`PathParams`](#pathparams)\<`SubPath`\>\>, \{ \}, \{ \}\>; \<`SubPath`, `SubParams`, `SubSearch`, `SubParamsOutput`, `SubSearchOutput`, `LoaderParams`, `Payload`\>(`options`, `name?`): [`RouteAtom`](#routeatom)\<`` `/${SubPath}` ``, [`Plain`](#plain)\<`object` & `SubParamsOutput`\>, [`Plain`](#plain)\<`SubSearchOutput`\>, `Payload`, [`Plain`](#plain)\<`object` & `SubParams`\>, [`Plain`](#plain)\<`SubSearch`\>\>; \}

Defined in: [packages/core/src/web/route.ts:394](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/route.ts#L394)

#### Call Signature

> \<`SubPath`\>(`path`, `name?`): [`RouteAtom`](#routeatom)\<`` `/${SubPath}` ``, [`Plain`](#plain)\<`object` & [`PathParams`](#pathparams)\<`SubPath`\>\>, \{ \}, \{ \}\>

Create a sub-route by appending a path pattern to the current route.

##### Type Parameters

###### SubPath

`SubPath` *extends* `string`

##### Parameters

###### path

`SubPath`

The sub-path pattern to append (e.g., 'users', ':userId',
  'posts/:postId?')

###### name?

`string`

##### Returns

[`RouteAtom`](#routeatom)\<`` `/${SubPath}` ``, [`Plain`](#plain)\<`object` & [`PathParams`](#pathparams)\<`SubPath`\>\>, \{ \}, \{ \}\>

A new RouteAtom for the combined path pattern

##### Example

```ts
const usersRoute = reatomRoute('users') // Creates /users route
  const userRoute = usersRoute.reatomRoute(':userId') // Creates /users/:userId route
```

#### Call Signature

> \<`SubPath`, `SubParams`, `SubSearch`, `SubParamsOutput`, `SubSearchOutput`, `LoaderParams`, `Payload`\>(`options`, `name?`): [`RouteAtom`](#routeatom)\<`` `/${SubPath}` ``, [`Plain`](#plain)\<`object` & `SubParamsOutput`\>, [`Plain`](#plain)\<`SubSearchOutput`\>, `Payload`, [`Plain`](#plain)\<`object` & `SubParams`\>, [`Plain`](#plain)\<`SubSearch`\>\>

Create a sub-route with validation schemas for parameters and search
params.

##### Type Parameters

###### SubPath

`SubPath` *extends* `string` = `""`

###### SubParams

`SubParams` *extends* [`PathKeys`](#pathkeys)\<`SubPath`\> = [`PathParams`](#pathparams)\<`SubPath`\>

###### SubSearch

`SubSearch` *extends* `Partial`\<[`Rec`](#rec)\<`string`\>\> = \{ \}

###### SubParamsOutput

`SubParamsOutput` = `SubParams`

###### SubSearchOutput

`SubSearchOutput` = `SubSearch`

###### LoaderParams

`LoaderParams` = [`Plain`](#plain)\<`object` & `SubParamsOutput` & `SubSearchOutput`\>

###### Payload

`Payload` = `LoaderParams`

##### Parameters

###### options

[`RouteOptions`](#routeoptions)\<`SubPath`, `SubParams`, `SubSearch`, `SubParamsOutput`, `SubSearchOutput`, `LoaderParams`, `Payload`\>

Route configuration object or just a path string

###### name?

`string`

##### Returns

[`RouteAtom`](#routeatom)\<`` `/${SubPath}` ``, [`Plain`](#plain)\<`object` & `SubParamsOutput`\>, [`Plain`](#plain)\<`SubSearchOutput`\>, `Payload`, [`Plain`](#plain)\<`object` & `SubParams`\>, [`Plain`](#plain)\<`SubSearch`\>\>

A new RouteAtom for the combined path with validation

##### Example

```ts
import { z } from 'zod'

  const userRoute = reatomRoute({
    path: 'user/:id',
    params: z.object({ id: z.number() }), // Should match the path
    search: z.object({ sort: z.enum(['asc', 'desc']).optional() }),
  })

  // Navigate with validated params
  userRoute.go({ id: 123, tab: 'profile' })
```

***

### reatomString()

> `const` **reatomString**: \{(`init?`, `name?`): [`StringAtom`](#stringatom); \<`T`\>(`init`, `name?`): [`StringAtom`](#stringatom)\<`T`\>; \}

Defined in: [packages/core/src/primitives/reatomString.ts:8](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomString.ts#L8)

#### Call Signature

> (`init?`, `name?`): [`StringAtom`](#stringatom)

##### Parameters

###### init?

`string`

###### name?

`string`

##### Returns

[`StringAtom`](#stringatom)

#### Call Signature

> \<`T`\>(`init`, `name?`): [`StringAtom`](#stringatom)\<`T`\>

##### Type Parameters

###### T

`T` *extends* `string`

##### Parameters

###### init

`T`

###### name?

`string`

##### Returns

[`StringAtom`](#stringatom)\<`T`\>

***

### retryComputed()

> `const` **retryComputed**: \{(`target`): `never`; \<`T`\>(`target`): `T`; \}

Defined in: packages/core/src/methods/retry.ts:38

Retries computed atom by resetting its dependencies and re-evaluating it.

#### Call Signature

> (`target`): `never`

##### Parameters

###### target

[`Action`](#action)

##### Returns

`never`

#### Call Signature

> \<`T`\>(`target`): `T`

##### Type Parameters

###### T

`T`

##### Parameters

###### target

[`AtomLike`](#atomlike)\<`any`, `any`, `T`\>

##### Returns

`T`

#### Template

The return type of the atom.

#### Param

The atom to retry.

#### Returns

The result of the atom after retrying.

#### Throws

If the target is not an action.

***

### rollback

> **rollback**: [`Action`](#action)\<\[`any`\], `void`\>

Defined in: [packages/core/src/methods/transaction.ts:107](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/transaction.ts#L107)

***

### ~~route()~~

> **route**: \{\<`SubPath`\>(`path`, `name?`): [`RouteAtom`](#routeatom)\<`` `/${SubPath}` ``, [`Plain`](#plain)\<`object` & [`PathParams`](#pathparams)\<`SubPath`\>\>, \{ \}, \{ \}\>; \<`SubPath`, `SubParams`, `SubSearch`, `SubParamsOutput`, `SubSearchOutput`, `LoaderParams`, `Payload`\>(`options`, `name?`): [`RouteAtom`](#routeatom)\<`` `/${SubPath}` ``, [`Plain`](#plain)\<`object` & `SubParamsOutput`\>, [`Plain`](#plain)\<`SubSearchOutput`\>, `Payload`, [`Plain`](#plain)\<`object` & `SubParams`\>, [`Plain`](#plain)\<`SubSearch`\>\>; \} = `reatomRoute`

Defined in: [packages/core/src/web/route.ts:398](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/route.ts#L398)

#### Call Signature

> \<`SubPath`\>(`path`, `name?`): [`RouteAtom`](#routeatom)\<`` `/${SubPath}` ``, [`Plain`](#plain)\<`object` & [`PathParams`](#pathparams)\<`SubPath`\>\>, \{ \}, \{ \}\>

Create a sub-route by appending a path pattern to the current route.

##### Type Parameters

###### SubPath

`SubPath` *extends* `string`

##### Parameters

###### path

`SubPath`

The sub-path pattern to append (e.g., 'users', ':userId',
  'posts/:postId?')

###### name?

`string`

##### Returns

[`RouteAtom`](#routeatom)\<`` `/${SubPath}` ``, [`Plain`](#plain)\<`object` & [`PathParams`](#pathparams)\<`SubPath`\>\>, \{ \}, \{ \}\>

A new RouteAtom for the combined path pattern

##### Example

```ts
const usersRoute = reatomRoute('users') // Creates /users route
  const userRoute = usersRoute.reatomRoute(':userId') // Creates /users/:userId route
```

#### Call Signature

> \<`SubPath`, `SubParams`, `SubSearch`, `SubParamsOutput`, `SubSearchOutput`, `LoaderParams`, `Payload`\>(`options`, `name?`): [`RouteAtom`](#routeatom)\<`` `/${SubPath}` ``, [`Plain`](#plain)\<`object` & `SubParamsOutput`\>, [`Plain`](#plain)\<`SubSearchOutput`\>, `Payload`, [`Plain`](#plain)\<`object` & `SubParams`\>, [`Plain`](#plain)\<`SubSearch`\>\>

Create a sub-route with validation schemas for parameters and search
params.

##### Type Parameters

###### SubPath

`SubPath` *extends* `string` = `""`

###### SubParams

`SubParams` *extends* [`PathKeys`](#pathkeys)\<`SubPath`\> = [`PathParams`](#pathparams)\<`SubPath`\>

###### SubSearch

`SubSearch` *extends* `Partial`\<[`Rec`](#rec)\<`string`\>\> = \{ \}

###### SubParamsOutput

`SubParamsOutput` = `SubParams`

###### SubSearchOutput

`SubSearchOutput` = `SubSearch`

###### LoaderParams

`LoaderParams` = [`Plain`](#plain)\<`object` & `SubParamsOutput` & `SubSearchOutput`\>

###### Payload

`Payload` = `LoaderParams`

##### Parameters

###### options

[`RouteOptions`](#routeoptions)\<`SubPath`, `SubParams`, `SubSearch`, `SubParamsOutput`, `SubSearchOutput`, `LoaderParams`, `Payload`\>

Route configuration object or just a path string

###### name?

`string`

##### Returns

[`RouteAtom`](#routeatom)\<`` `/${SubPath}` ``, [`Plain`](#plain)\<`object` & `SubParamsOutput`\>, [`Plain`](#plain)\<`SubSearchOutput`\>, `Payload`, [`Plain`](#plain)\<`object` & `SubParams`\>, [`Plain`](#plain)\<`SubSearch`\>\>

A new RouteAtom for the combined path with validation

##### Example

```ts
import { z } from 'zod'

  const userRoute = reatomRoute({
    path: 'user/:id',
    params: z.object({ id: z.number() }), // Should match the path
    search: z.object({ sort: z.enum(['asc', 'desc']).optional() }),
  })

  // Navigate with validated params
  userRoute.go({ id: 123, tab: 'profile' })
```

#### Deprecated

Use `reatomRoute` instead

***

### searchParamsAtom

> `const` **searchParamsAtom**: [`SearchParamsAtom`](#searchparamsatom)

Defined in: [packages/core/src/web/url.ts:266](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/url.ts#L266)

Create an atom that represents search parameters from the URL.

***

### ~~select()~~

> **select**: \<`State`\>(`cb`, `equal`, `key`) => `State` = `memo`

Defined in: [packages/core/src/methods/memo.ts:134](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/memo.ts#L134)

Memoize additional computation inside a different calls of an atom (computed
or an effect) or an action.

It's useful when you want to avoid recomputing of the whole computed
function, especially if the computation is expensive. You could create an
external atom by yourself, but it is not handy sometimes.

The `memo` function takes a callback function `cb` that returns the value to
be memoized, an optional `equal` function that compares the new and old
values to determine if the memoized value should be updated, and an optional
`key` to uniquely identify the memoized value.

**Important note**: The created internal atom only uses the first passed
callback function. This means it's unsafe to rely on data from the closure
that changes on every recall, as subsequent calls will not update the
callback used by the internal atom.

Note for rare cases: A created underhood atom is memorized for each memo by
the passed function sources from "toString()" method, so every computed
callback in different memos of the same atom should contain different code.
However, you can provide a custom `key` parameter to uniquely identify
different memo calls instead of relying on toString().

#### Type Parameters

##### State

`State`

#### Parameters

##### cb

A function that returns the value to be selected and memoized.

() => `State` | (`state?`) => `State`

##### equal

(`newState`, `oldState`) => `boolean`

##### key

`string` = `...`

An optional unique identifier for the memoized value. Defaults to
  `cb.toString()`. Used to distinguish between different memo calls within
  the same computed function. Providing a custom key is recommended when
  using similar callback functions to avoid conflicts.

#### Returns

`State`

The memoized value.

#### Examples

```ts
// This is very useful to memoize not just the end string,
  // but, for example, a template computation inside `reatomComponent` or so on.
  export const listSum = computed(() => {
    // Simple call of `list().length` will cause extra recomputations for elements sorting or its internal changes.
    // correct optimal way, the component will rerender only on `length` change
    const length = memo(() => list().length)
    // you could call different `memo` many times in one computed
    const sum = memo(() => list().reduce((acc, el) => acc + el().value, 0))

    return `The sum of ${length} elements is: ${sum}`
  }, 'listSum')
```

```ts
// An example of using the equality function as part of the logic
  const scroll = atom(0, 'scroll')
  const throttledScroll = computed(() => {
    const { state } = memo(
      () => ({ state: scroll(), time: Date.now() }),
      // Only update if 50ms have passed since the last update
      (next, prev) => prev.time + 50 < Date.now(),
    )
    return state
  }, 'throttledScroll')
```

```ts
// Using memo in actions for expensive computations
  const processData = action((data: string[]) => {
    // You can even create a service, but not one that is tied only to this action.
    const myService = memo(() => new Service())

    myService.send(data)
  }, 'processData')
```

#### Deprecated

Use `memo` instead

***

### setTimeout

> `const` **setTimeout**: `SetTimeout`

Defined in: [packages/core/src/utils.ts:746](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L746)

Enhanced version of the global setTimeout function. Ensures consistent
behavior across different environments by handling both numeric and object
timeout IDs. Adds a toJSON method to object timeout IDs for serialization.

#### Param

The function to call after the timeout

#### Param

The time in milliseconds to wait before calling the handler

#### Param

Optional arguments to pass to the handler function

#### Returns

A timeout ID that can be used with clearTimeout

***

### spawn

> **spawn**: [`GenericAction`](#genericaction)\<\<`Params`, `Payload`\>(`cb`, ...`params`) => `Payload`\>

Defined in: [packages/core/src/methods/abortVar.ts:189](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/abortVar.ts#L189)

This utility allow you to start a function which will NOT follow the async
abort context.

#### Example

```ts
// If you want to start a fetch when the atom gets a subscription,
  // but don't want to abort the fetch when the subscription is lost to save the data anyway.
  const some = atom('...').extend(
    withConnectHook((target) => {
      spawn(async () => {
        // here `wrap` doesn't follow the connection abort
        const data = await wrap(api.getSome())
        some(data)
      })
    }),
  )
```

***

### STACK

> **STACK**: [`Frame`](#frame)[] = `[]`

Defined in: [packages/core/src/core/atom.ts:1012](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L1012)

***

### SUSPENSE

> **SUSPENSE**: `WeakMap`\<`Promise`\<`any`\>, [`SuspenseRecord`](#suspenserecord)\>

Defined in: [packages/core/src/mixins/withSuspense.ts:12](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/mixins/withSuspense.ts#L12)

Internal suspense cache, do not use it directly, only for libraries!

***

### transactionVar

> **transactionVar**: `TransactionVariable`

Defined in: [packages/core/src/methods/transaction.ts:105](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/transaction.ts#L105)

***

### urlAtom

> **urlAtom**: [`UrlAtom`](#urlatom)

Defined in: [packages/core/src/web/url.ts:145](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/url.ts#L145)

Create the URL atom with the new Reatom API.

***

### variable()

> **variable**: \{\<`T`\>(`name?`): [`Variable`](#variable)\<\[`T`\], `T`\>; \<`Params`, `Payload`\>(`set`, `name?`): [`Variable`](#variable)\<`Params`, `Payload`\>; \}

Defined in: [packages/core/src/methods/variable.ts:108](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/variable.ts#L108)

Creates a new context variable with getter and setter functionality

This implementation provides a similar capability to the proposed TC39
AsyncContextVariable, allowing you to maintain values that are specific to a
particular execution context. Variables created with this function can be
accessed and modified within their frame context.

#### Call Signature

> \<`T`\>(`name?`): [`Variable`](#variable)\<\[`T`\], `T`\>

##### Type Parameters

###### T

`T`

##### Parameters

###### name?

`string`

##### Returns

[`Variable`](#variable)\<\[`T`\], `T`\>

#### Call Signature

> \<`Params`, `Payload`\>(`set`, `name?`): [`Variable`](#variable)\<`Params`, `Payload`\>

##### Type Parameters

###### Params

`Params` *extends* `any`[]

###### Payload

`Payload`

##### Parameters

###### set

(...`params`) => `Payload`

###### name?

`string`

##### Returns

[`Variable`](#variable)\<`Params`, `Payload`\>

#### Example

```ts
// Simple variable with string values
  const currentUser = variable<string>('currentUser')

  // Set the value
  currentUser.set('Alice')

  // Get the value
  console.log(currentUser.get()) // 'Alice'

  // Run code with a different value
  currentUser.run('Bob', () => {
    console.log(currentUser.get()) // 'Bob'
  })

  // Advanced variable with custom setter logic
  const userRole = variable((role: string, permissions: string[]) => {
    return { role, permissions }
  }, 'userRole')

  userRole.set('admin', ['read', 'write', 'delete'])
```

#### Template

The type of the simple variable (when used with just a name)

#### Template

Types of parameters for the setter function

#### Template

The type of the stored value

#### See

[https://github.com/tc39/proposal-async-context?tab=readme-ov-file#asynccontextvariable](https://github.com/tc39/proposal-async-context?tab=readme-ov-file#asynccontextvariable)

***

### withAsync()

> **withAsync**: \<`Err`, `EmptyErr`\>(`options?`) => \<`T`\>(`target`) => `T` *extends* [`AtomLike`](#atomlike)\<`any`, `Params`, `Promise`\<`Payload`\>\> ? `T`\<`T`\> & [`AsyncExt`](#asyncext)\<`Params`, `Payload`, `Err` \| `EmptyErr`\> : `never`

Defined in: [packages/core/src/async/withAsync.ts:136](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/async/withAsync.ts#L136)

Extension that adds async state tracking to atoms or actions that return
promises. Manages pending state, errors, and provides lifecycle actions for
async operations.

This extension preserves Reatom context across async operations, ensuring
that the async operation's results properly update Reatom state.

#### Type Parameters

##### Err

`Err` = `Error`

The type of errors after parsing

##### EmptyErr

`EmptyErr` = `undefined`

The type of the empty error state

#### Parameters

##### options?

Configuration options for error handling

`null` | [`AsyncOptions`](#asyncoptions)\<`Err`, `EmptyErr`\>

#### Returns

An extension function that can be applied to atoms or actions

> \<`T`\>(`target`): `T` *extends* [`AtomLike`](#atomlike)\<`any`, `Params`, `Promise`\<`Payload`\>\> ? `T`\<`T`\> & [`AsyncExt`](#asyncext)\<`Params`, `Payload`, `Err` \| `EmptyErr`\> : `never`

##### Type Parameters

###### T

`T` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\>

##### Parameters

###### target

`T`

##### Returns

`T` *extends* [`AtomLike`](#atomlike)\<`any`, `Params`, `Promise`\<`Payload`\>\> ? `T`\<`T`\> & [`AsyncExt`](#asyncext)\<`Params`, `Payload`, `Err` \| `EmptyErr`\> : `never`

#### Example

```ts
// Basic usage with an action:
  const fetchUser = action(async (userId: string) => {
    const response = await wrap(fetch(`/api/users/${userId}`))
    return await wrap(response.json())
  }, 'fetchUser').extend(withAsync())

  // Can then access:
  fetchUser.error() // → latest error if any
  fetchUser.ready() // → are all operations complete?
```

***

### withBroadcastChannel

> `const` **withBroadcastChannel**: `WithPersistWebStorage`

Defined in: [packages/core/src/persist/web-storage/broadcastChannel.ts:245](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/web-storage/broadcastChannel.ts#L245)

Default BroadcastChannel persistence adapter with automatic fallback to
memory storage.

Provides real-time cross-tab synchronization using a default
BroadcastChannel. Automatically falls back to memory storage in environments
where BroadcastChannel is not available (Node.js, older browsers, some secure
contexts).

#### Example

```typescript
  // Simple cross-tab synchronization - changes in one tab appear in others
  const notificationCountAtom = atom(0, 'notificationCountAtom').extend(
  withBroadcastChannel('notification-count')
  )

  // Shared shopping cart across tabs
  const cartAtom = atom([], 'cartAtom').extend(
  withBroadcastChannel('shopping-cart')
  )

  // Live user presence indicator
  const activeUsersAtom = atom([], 'activeUsersAtom').extend(
  withBroadcastChannel('active-users')
  )

  // Real-time settings synchronization
  const settingsAtom = atom({}, 'settingsAtom').extend(
  withBroadcastChannel('app-settings')
  )
  ```

  **Features:**
  - Instant cross-tab synchronization without page refresh
  - Memory-based storage (no disk persistence)
  - Automatic fallback to memory storage when unavailable
  - Zero configuration required
  - Works across browser tabs and web workers

  **Use Cases:**
  - Live notifications and counters
  - Shared application state across tabs
  - Real-time collaborative features
  - Multi-tab form synchronization
  - Live status indicators

  **Limitations:**
  - Data doesn't persist between browser sessions
  - Limited to same-origin tabs only
  - Not available in all browsers/contexts

#### See

 - [reatomPersistBroadcastChannel](#reatompersistbroadcastchannel) for custom channel creation
 - [withLocalStorage](#withlocalstorage) for persistent cross-session storage
 - [BroadcastMessage](#broadcastmessage) for message format details

***

### withCookie()

> `const` **withCookie**: (`options?`) => `WithPersistWebStorage`

Defined in: [packages/core/src/persist/web-storage/cookie.ts:201](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/web-storage/cookie.ts#L201)

Default cookie persistence adapter that automatically uses browser cookies or
falls back to memory storage when cookies are unavailable.

This is the recommended way to add cookie persistence to atoms. It handles
environment detection automatically and provides a clean API for most use
cases.

#### Parameters

##### options?

[`CookieAttributes`](#cookieattributes)

Cookie configuration options (optional)

#### Returns

`WithPersistWebStorage`

Persist adapter that can be used with atom.extend()

#### Example

```typescript
  // Simple usage - stores in cookies with default settings
  const themeAtom = atom('light', 'themeAtom').extend(
  withCookie()('theme')
  )

  // With custom settings - persistent login with 30-day expiration
  const authAtom = atom(null, 'authAtom').extend(
  withCookie({
  maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
  secure: true,
  sameSite: 'strict',
  path: '/'
  })('auth-token')
  )

  // Session-only cookie (expires when browser closes)
  const cartAtom = atom([], 'cartAtom').extend(
  withCookie()('shopping-cart')
  )
  ```

  **Features:**
  - Automatic fallback to memory storage in non-browser environments
  - Handles JSON serialization and URL encoding automatically
  - Supports all standard cookie attributes
  - Memory cache for performance optimization
  - Graceful error handling for disabled cookies

  **Security Notes:**
  - Use `secure: true` for sensitive data in production
  - Consider `sameSite: 'strict'` for enhanced CSRF protection
  - Avoid storing large objects due to cookie size limits (4KB)

#### See

 - [CookieAttributes](#cookieattributes) for all available options
 - reatomPersistCookie for creating custom cookie adapters

***

### withIndexedDb

> `const` **withIndexedDb**: `WithPersistWebStorage`

Defined in: [packages/core/src/persist/web-storage/indexedDb.ts:312](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/web-storage/indexedDb.ts#L312)

Default IndexedDB persistence adapter with automatic fallback to memory
storage.

Provides large-capacity persistent storage using IndexedDB with cross-tab
synchronization. Automatically falls back to memory storage when IndexedDB,
BroadcastChannel, or the idb-keyval dependency is unavailable.

#### Example

```typescript
  // Large data cache that persists across browser sessions
  const apiCacheAtom = atom(new Map(), 'apiCacheAtom').extend(
  withIndexedDb('api-cache')
  )

  // User data that exceeds localStorage size limits
  const userDataAtom = atom({}, 'userDataAtom').extend(
  withIndexedDb('user-data')
  )

  // Offline document storage for collaborative apps
  const documentsAtom = atom([], 'documentsAtom').extend(
  withIndexedDb('documents')
  )

  // Complex application state with large datasets
  const appStateAtom = atom({
  projects: [],
  settings: {},
  cache: new Map()
  }, 'appStateAtom').extend(
  withIndexedDb('app-state')
  )
  ```

  **Features:**
  - Large storage capacity (hundreds of MB to GB)
  - Data persists between browser sessions and reboots
  - Cross-tab synchronization for consistent state
  - Asynchronous operations with immediate memory access
  - Automatic fallback to memory storage when unavailable
  - Works with complex data structures and large objects

  **Requirements:**
  - Install idb-keyval as a peerDependency: `npm install idb-keyval`
  - Modern browser with IndexedDB and BroadcastChannel support
  - For fallback behavior, no additional requirements

  **Use Cases:**
  - Large application data and caches
  - Offline-first applications
  - Media files and blob storage references
  - Complex data that exceeds localStorage limits
  - Applications needing database-like storage features

  **Comparison with other storage:**
  - vs localStorage: Much larger capacity, better for complex data
  - vs sessionStorage: Persists between browser sessions
  - vs cookies: No size limits, not sent with HTTP requests
  - vs BroadcastChannel: Persistent storage, not just cross-tab sync

#### See

 - [reatomPersistIndexedDb](#reatompersistindexeddb) for custom IndexedDB configuration
 - [withLocalStorage](#withlocalstorage) for simpler persistent storage
 - [withBroadcastChannel](#withbroadcastchannel) for memory-only cross-tab sync

***

### withLocalStorage

> `const` **withLocalStorage**: [`WithPersistWebStorage`](#withpersistwebstorage)

Defined in: [packages/core/src/persist/web-storage/localStorage.ts:208](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/web-storage/localStorage.ts#L208)

Default localStorage persistence adapter with automatic fallback to memory
storage.

Provides persistent storage that survives browser restarts and is shared
across all tabs of the same origin. Automatically falls back to memory
storage in environments where localStorage is not available (Node.js, private
browsing modes).

#### Example

```typescript
  // Basic usage - data persists across browser sessions
  const userPrefsAtom = atom({}, 'userPrefsAtom').extend(
  withLocalStorage('user-preferences')
  )

  // Settings that sync across tabs automatically
  const themeAtom = atom('light', 'themeAtom').extend(
  withLocalStorage('app-theme')
  )

  // Complex data structures
  const dashboardAtom = atom({
  layout: 'grid',
  widgets: []
  }, 'dashboardAtom').extend(
  withLocalStorage('dashboard-config')
  )
  ```

  **Features:**
  - Data persists between browser sessions
  - Cross-tab synchronization via storage events
  - ~5-10MB storage limit (varies by browser)
  - Automatic fallback to memory storage when unavailable
  - Memory cache for optimal performance

  **Use Cases:**
  - User preferences and settings
  - Application state that should persist
  - Cross-tab data synchronization
  - Form data preservation

#### See

 - [withSessionStorage](#withsessionstorage) for session-only storage
 - [reatomPersistWebStorage](#reatompersistwebstorage) for custom storage implementations

***

### withMiddleware()

> **withMiddleware**: \{\<`Target`\>(`cb`, `tail?`): [`GenericExt`](#genericext)\<`Target`\>; \<`Target`, `Result`\>(`cb`, `tail?`): [`Ext`](#ext)\<`Target`, `Result`\>; \}

Defined in: [packages/core/src/core/extend.ts:193](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/extend.ts#L193)

Creates an extension that adds middleware to an atom or action.

Middleware allows intercepting and modifying the execution flow of atoms and
actions. This is the fundamental mechanism for creating behavior extensions
in Reatom.

#### Call Signature

> \<`Target`\>(`cb`, `tail?`): [`GenericExt`](#genericext)\<`Target`\>

##### Type Parameters

###### Target

`Target` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\>

##### Parameters

###### cb

(`target`) => [`Middleware`](#middleware)\<`Target`\>

###### tail?

`boolean`

##### Returns

[`GenericExt`](#genericext)\<`Target`\>

#### Call Signature

> \<`Target`, `Result`\>(`cb`, `tail?`): [`Ext`](#ext)\<`Target`, `Result`\>

##### Type Parameters

###### Target

`Target` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\>

###### Result

`Result` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> = `Target`

##### Parameters

###### cb

(`target`) => [`Middleware`](#middleware)\<`Target`\>

###### tail?

`boolean`

##### Returns

[`Ext`](#ext)\<`Target`, `Result`\>

#### Example

```ts
// Creating a logging middleware extension
  const withLogger = (prefix: string) =>
    withMiddleware((target) => {
      return (next, ...params) => {
        console.log(`${prefix} [${target.name}] Before:`, params)
        const result = next(...params)
        console.log(`${prefix} [${target.name}] After:`, result)
        return result
      }
    })

  // Using the middleware
  const counter = atom(0).extend(withLogger('DEBUG'))
```

#### Template

The type of atom or action the middleware will be applied
  to

#### Template

The resulting type after applying the middleware

#### Param

A function that receives the target and returns a middleware
  function

#### Param

Whether to add the middleware at the end (true) or beginning
  (false) of the middleware chain

#### Returns

An extension that applies the middleware when used with .extend()

***

### withParams()

> **withParams**: \<`Target`, `Params`\>(`parse`) => [`ParamsExt`](#paramsext)\<`Target`, `Params`\>

Defined in: [packages/core/src/core/extend.ts:328](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/extend.ts#L328)

Extension that transforms parameters before they reach the atom or action.
Useful as the `.set` atom method can't be reassigned and changed.

This utility lets you change how parameters are processed when an atom or
action is called, enabling custom parameter handling, validation, or
transformation.

#### Type Parameters

##### Target

`Target` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\>

The type of atom or action being extended

##### Params

`Params` *extends* `any`[]

The parameter types that will be accepted by the extended
  atom/action

#### Parameters

##### parse

(...`parse`) => [`OverloadParameters`](#overloadparameters)\<`Target` *extends* [`Atom`](#atom)\<`any`, \[`any`\]\> ? `Target`\<`Target`\>\[`"set"`\] : `Target`\>\[`0`\]

Function that transforms the new parameters into what the
  atom/action expects

#### Returns

[`ParamsExt`](#paramsext)\<`Target`, `Params`\>

An extension that applies the parameter transformation

#### Example

```ts
// Convert from any unit to meters
  const length = atom(0, 'length').extend(
    withParams((value: number, unit: 'cm' | 'm' | 'km') => {
      switch (unit) {
        case 'cm':
          return value / 100
        case 'm':
          return value
        case 'km':
          return value * 1000
        default:
          return value
      }
    }),
  )

  length(5, 'km') // Sets value to 5000 meters
```

***

### withRollback()

> **withRollback**: () => [`GenericExt`](#genericext)

Defined in: [packages/core/src/methods/transaction.ts:106](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/transaction.ts#L106)

Extension to follow rollback context. For atoms it adds prev state
restoration when relative `rollback()` appears. For actions it adds error
handling and call `rollback()` automatically.

#### Returns

[`GenericExt`](#genericext)

***

### withSessionStorage

> `const` **withSessionStorage**: [`WithPersistWebStorage`](#withpersistwebstorage)

Defined in: [packages/core/src/persist/web-storage/localStorage.ts:257](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/web-storage/localStorage.ts#L257)

Default sessionStorage persistence adapter with automatic fallback to memory
storage.

Provides temporary storage that exists only for the duration of the page
session. Data is cleared when the tab is closed. Automatically falls back to
memory storage in environments where sessionStorage is not available.

#### Example

```typescript
  // Temporary data that clears when tab closes
  const wizardStateAtom = atom({ step: 1 }, 'wizardStateAtom').extend(
  withSessionStorage('wizard-progress')
  )

  // Form data preservation during navigation
  const formDataAtom = atom({}, 'formDataAtom').extend(
  withSessionStorage('form-draft')
  )

  // Shopping cart for current session
  const cartAtom = atom([], 'cartAtom').extend(
  withSessionStorage('shopping-cart')
  )
  ```

  **Features:**
  - Data persists during the page session only
  - Isolated per tab (no cross-tab sharing)
  - ~5-10MB storage limit (varies by browser)
  - Automatic fallback to memory storage when unavailable
  - Memory cache for optimal performance

  **Use Cases:**
  - Temporary form data and wizard states
  - Session-specific application state
  - Temporary selections
  - Navigation state preservation

#### See

 - [withLocalStorage](#withlocalstorage) for persistent cross-session storage
 - [reatomPersistWebStorage](#reatompersistwebstorage) for custom storage implementations

***

### withTap()

> **withTap**: \{(`cb`): [`GenericExt`](#genericext); \<`Target`\>(`cb`): [`Ext`](#ext)\<`Target`, `Target`\>; \}

Defined in: [packages/core/src/core/extend.ts:241](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/extend.ts#L241)

Creates an extension that allows observing state changes without modifying
them.

This extension adds a middleware that calls the provided callback function
whenever the atom's state changes, passing the target atom, new state, and
previous state. This is useful for side effects like logging, analytics, or
debugging.

#### Call Signature

> (`cb`): [`GenericExt`](#genericext)

##### Parameters

###### cb

(`target`, `state`, `prevState`) => `void`

##### Returns

[`GenericExt`](#genericext)

#### Call Signature

> \<`Target`\>(`cb`): [`Ext`](#ext)\<`Target`, `Target`\>

##### Type Parameters

###### Target

`Target` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\>

##### Parameters

###### cb

(`target`, `state`, `prevState`) => `void`

##### Returns

[`Ext`](#ext)\<`Target`, `Target`\>

#### Example

```ts
const counter = atom(0, 'counter').extend(
    withTap((target, state, prevState) => {
      console.log(`${target.name} changed from ${prevState} to ${state}`)
    }),
  )
```

#### Param

Callback function that receives the target, new state, and
  previous state

#### Returns

An extension that can be applied to atoms or actions

***

### wrap()

> **wrap**: \{\<`Params`, `Payload`\>(`target`, `frame?`): (...`params`) => `Payload`; \<`T`\>(`target`, `frame?`): `Promise`\<`Awaited`\<`T`\>\>; \}

Defined in: [packages/core/src/methods/wrap.ts:46](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/wrap.ts#L46)

Preserves Reatom's reactive context across async boundaries or function
calls.

This is a CRITICAL function in Reatom that ensures proper context tracking
across asynchronous operations like Promises, setTimeout, event handlers, and
more. Without proper wrapping, atoms would lose their context after async
operations, leading to "Missed context" errors when attempting to update
state.

Wrap handles two scenarios:

1. Function wrapping: Returns a new function that preserves context when called
2. Promise wrapping: Returns a new promise that preserves context through its
   chain

#### Call Signature

> \<`Params`, `Payload`\>(`target`, `frame?`): (...`params`) => `Payload`

##### Type Parameters

###### Params

`Params` *extends* `any`[]

###### Payload

`Payload`

##### Parameters

###### target

(...`params`) => `Payload`

###### frame?

[`Frame`](#frame)\<`any`, `any`[], `any`\>

##### Returns

> (...`params`): `Payload`

###### Parameters

###### params

...`Params`

###### Returns

`Payload`

#### Call Signature

> \<`T`\>(`target`, `frame?`): `Promise`\<`Awaited`\<`T`\>\>

##### Type Parameters

###### T

`T`

##### Parameters

###### target

`T`

###### frame?

[`Frame`](#frame)\<`any`, `any`[], `any`\>

##### Returns

`Promise`\<`Awaited`\<`T`\>\>

#### Example

```ts
// Wrapping a function (e.g., an event handler)
  button.addEventListener(
    'click',
    wrap(() => {
      counter((prev) => prev + 1) // Works, context preserved
    }),
  )

  // Wrapping async operations
  action(async () => {
    const response = await wrap(fetch('/api/data'))
    const data = await wrap(response.json())
    results(data) // Works, context preserved
  })
```

#### Template

The parameter types when wrapping a function

#### Template

The return type when wrapping a function

#### Template

The promise type when wrapping a promise

#### Param

The function or promise to wrap with context preservation

#### Param

The frame to use (defaults to the current top frame)

#### Returns

A wrapped function or promise that preserves reactive context

## Functions

### \_copy()

> **\_copy**(`frame`): [`Frame`](#frame)\<`any`, `any`[], `any`\>

Defined in: [packages/core/src/core/atom.ts:328](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L328)

#### Parameters

##### frame

[`Frame`](#frame)

#### Returns

[`Frame`](#frame)\<`any`, `any`[], `any`\>

***

### \_enqueue()

> **\_enqueue**(`fn`, `queue`): `void`

Defined in: [packages/core/src/core/queues.ts:18](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/queues.ts#L18)

Schedules a function to be executed in a specific queue of the current
context.

This is the core mechanism for scheduling reactive updates in Reatom. When an
atom's state changes, tasks are queued to be executed afterwards in the
appropriate order. If this is the first task being scheduled, a microtask is
created to process the queues asynchronously.

#### Parameters

##### fn

[`Fn`](#fn)

The function to schedule for execution

##### queue

The queue to add the function to ('hook', 'compute',
  'cleanup', or 'effect')

`"hook"` | `"compute"` | `"cleanup"` | `"effect"`

#### Returns

`void`

***

### \_isPubsChanged()

> **\_isPubsChanged**(`frame`, `pubs`, `from`): `boolean`

Defined in: [packages/core/src/core/atom.ts:533](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L533)

This MUTATES frame.pubs

#### Parameters

##### frame

[`Frame`](#frame)

##### pubs

\[`null` \| [`Frame`](#frame)\<`any`, `any`[], `any`\>, `...dependencies: Frame<any, any[], any>[]`\]

##### from

`number`

#### Returns

`boolean`

***

### \_read()

> **\_read**\<`State`, `Params`, `Payload`\>(`target`): `undefined` \| [`Frame`](#frame)\<`State`, `Params`, `Payload`\>

Defined in: [packages/core/src/core/atom.ts:992](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L992)

Reads the current frame for an atom from the context store.

This internal utility function retrieves the frame associated with an atom
from the current context. It's used to access an atom's state and
dependencies without triggering reactivity or creating new dependencies.

#### Type Parameters

##### State

`State` = `any`

The state type of the atom

##### Params

`Params` *extends* `any`[] = \[\]

The parameter types the atom accepts

##### Payload

`Payload` = `State`

The return type when the atom is called

#### Parameters

##### target

[`AtomLike`](#atomlike)\<`State`, `Params`, `Payload`\>

The atom to read the frame for

#### Returns

`undefined` \| [`Frame`](#frame)\<`State`, `Params`, `Payload`\>

The frame for the atom if it exists in the current context, or
  undefined otherwise

***

### actions()

> **actions**\<`Target`, `Methods`\>(`this`, `options`): [`ActionsExt`](#actionsext)\<`Methods`\>

Defined in: [packages/core/src/core/actions.ts:78](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/actions.ts#L78)

Binds actions to an atom or action as methods.

This function adds methods to an atom or action by converting them to Reatom
actions. Each method is converted to an action with the same name and bound
to the target. The name of each action will be prefixed with the target's
name for better debugging.

#### Type Parameters

##### Target

`Target` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\>

The atom or action being extended

##### Methods

`Methods` *extends* [`Rec`](#rec)\<[`Fn`](#fn)\>

Record of functions to convert to actions

#### Parameters

##### this

`Target`

##### options

Either a record of methods or a function that creates
  methods given the target

`Methods` | (`target`) => `Methods`

#### Returns

[`ActionsExt`](#actionsext)\<`Methods`\>

The target with the methods added as actions

#### Example

```ts
const counter = atom(0, 'counter').actions({
    increment: (amount = 1) => counter((prev) => prev + amount),
    decrement: (amount = 1) => counter((prev) => prev - amount),
    reset: () => counter(0),
  })

  counter.increment(5) // Can now call these methods directly
  counter.reset()
```

#### Throws

If a method name collides with an existing property on
  the target

***

### addCallHook()

> **addCallHook**\<`Target`\>(`target`, `cb`): [`Unsubscribe`](#unsubscribe-2)

Defined in: [packages/core/src/mixins/withChangeHook.ts:85](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/mixins/withChangeHook.ts#L85)

#### Type Parameters

##### Target

`Target` *extends* [`Action`](#action)\<`any`[], `any`\>

#### Parameters

##### target

`Target`

##### cb

(`payload`, `params`) => `void`

#### Returns

[`Unsubscribe`](#unsubscribe-2)

***

### addChangeHook()

> **addChangeHook**\<`T`\>(`target`, `cb`): [`Unsubscribe`](#unsubscribe-2)

Defined in: [packages/core/src/mixins/withChangeHook.ts:32](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/mixins/withChangeHook.ts#L32)

#### Type Parameters

##### T

`T` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\>

#### Parameters

##### target

`T`

##### cb

(`state`, `prevState?`) => `void`

#### Returns

[`Unsubscribe`](#unsubscribe-2)

***

### assert()

> **assert**(`value`, `message`, `ErrorConstructor`): `asserts value`

Defined in: [packages/core/src/utils.ts:212](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L212)

Asserts that a value is truthy, throwing an error if it's falsy. This is a
TypeScript type assertion function that helps with type narrowing.

#### Parameters

##### value

`unknown`

The value to check

##### message

`string`

The error message to use if the assertion fails

##### ErrorConstructor

[`Newable`](#newable)\<`Error`\> = `Error`

Optional custom error constructor to use (defaults
  to Error)

#### Returns

`asserts value`

#### Throws

Throws an error with the provided message if value is falsy

***

### assertFn()

> **assertFn**(`fn`): `asserts fn is Fn`

Defined in: [packages/core/src/core/atom.ts:463](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L463)

#### Parameters

##### fn

`unknown`

#### Returns

`asserts fn is Fn`

***

### bind()

> **bind**\<`Params`, `Payload`\>(`target`, `frame`): (...`params`) => `Payload`

Defined in: [packages/core/src/core/atom.ts:1043](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L1043)

Light version of `wrap` that binds a function to the current reactive
context.

Unlike the full `wrap` function, `bind` does not follow abort context, making
it more lightweight but less safe for certain async operations. Use this when
you need to preserve context but don't need the abort handling capabilities
of `wrap`.

#### Type Parameters

##### Params

`Params` *extends* `any`[]

The parameter types of the target function

##### Payload

`Payload`

The return type of the target function

#### Parameters

##### target

(...`params`) => `Payload`

The function to bind to the reactive context

##### frame

[`Frame`](#frame)\<`any`, `any`[], `any`\> = `...`

The frame to bind to (defaults to the current top frame)

#### Returns

A function that will run in the specified context when called

> (...`params`): `Payload`

##### Parameters

###### params

...`Params`

##### Returns

`Payload`

***

### clearStack()

> **clearStack**(): `void`

Defined in: [packages/core/src/core/atom.ts:1024](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L1024)

Clears the current Reatom context stack.

This is primarily used to force explicit context preservation via `wrap()`.
By clearing the stack, any atom operations outside of a properly wrapped
function will throw "missing async stack" errors, ensuring proper context
handling.

#### Returns

`void`

***

### computed()

> **computed**\<`State`\>(`computed`, `name?`): [`Computed`](#computed)\<`State`\>

Defined in: [packages/core/src/core/atom.ts:895](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L895)

Creates a derived state container that lazily recalculates only when read.

Computed atoms automatically track their dependencies (other atoms or
computed values that are called during computation) and only recalculate when
those dependencies change. The computation is lazy - it only runs when the
computed value is read AND subscribed to.

#### Type Parameters

##### State

`State`

The type of state derived by the computation

#### Parameters

##### computed

A function that computes the derived state

() => `State` | (`state?`) => `State`

##### name?

`string`

Optional name for debugging purposes

#### Returns

[`Computed`](#computed)\<`State`\>

A computed atom instance

#### Example

```ts
const counter = atom(5, 'counter')
  const doubled = computed(() => counter() * 2, 'doubledCounter')

  // Reading triggers computation only if subscribed
  const value = doubled() // -> 10
```

***

### computedParams()

> **computedParams**(`next`): `any`

Defined in: [packages/core/src/core/atom.ts:868](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L868)

#### Parameters

##### next

[`Fn`](#fn)

#### Returns

`any`

***

### concatTree()

> **concatTree**(`acc`, `steps`, `node`): `string`

Defined in: [packages/core/src/connectLogger.ts:89](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/connectLogger.ts#L89)

Concatenates a tree structure representation into a string format.

This function recursively builds a formatted ASCII/Unicode tree
representation of a Node structure with proper branch indentation and
connections.

#### Parameters

##### acc

`string`

The accumulator string that holds the current tree
  representation

##### steps

`string`

Indentation padding string for proper alignment

##### node

`Node`

The current node to process and display in the tree

#### Returns

`string`

A formatted string representation of the tree structure

#### Example

```ts
// For a node with children, might produce something like:
  // myNode ┬─ child1 ─ grandChild
  //        └─ child2
```

***

### connectLogger()

> **connectLogger**(): `void`

Defined in: [packages/core/src/connectLogger.ts:169](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/connectLogger.ts#L169)

Sets up and connects a logger to the Reatom system for debugging and tracing.

This function enhances all non-private atoms and actions with logging
capabilities. When an atom's value changes or an action is called, it logs
the event with relevant information to the console including:

- Previous and current state for atoms
- Parameters and return values for actions
- Complete dependency stack traces
- Error information when exceptions occur

The logger adapts to the environment, using different formatting for browser
and Node.js. Private atoms (those with names starting with '_' or containing
'._') are not logged.

#### Returns

`void`

#### Example

```ts
// Connect the logger at application startup
  import { connectLogger } from '@reatom/core'

  connectLogger()
```

***

### createMemStorage()

> **createMemStorage**(`__namedParameters`): [`SyncPersistStorage`](#syncpersiststorage) & `object`

Defined in: [packages/core/src/persist/index.ts:252](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/index.ts#L252)

#### Parameters

##### \_\_namedParameters

###### mutable?

`boolean` = `true`

###### name

`string`

###### snapshot?

[`Rec`](#rec) = `{}`

###### subscribe?

`boolean` = `true`

#### Returns

[`SyncPersistStorage`](#syncpersiststorage) & `object`

***

### deatomize()

> **deatomize**\<`Value`\>(`value`): [`Deatomize`](#deatomize)\<`Value`\>

Defined in: [packages/core/src/methods/deatomize.ts:75](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/deatomize.ts#L75)

Recursively unwraps atoms in a value to get their current states

This function deeply traverses a value, including nested objects, arrays,
maps, and sets, replacing atoms with their current state values. It's useful
for serialization, debugging, or creating snapshots of state that don't
contain reactive references.

#### Type Parameters

##### Value

`Value`

The type of value to parse

#### Parameters

##### value

`Value`

The value containing atoms to unwrap

#### Returns

[`Deatomize`](#deatomize)\<`Value`\>

A new value with all atoms replaced by their
  current states

#### Example

```ts
const user = {
    id: 42,
    name: atom('John', 'userName'),
    stats: {
      score: atom(100, 'userScore'),
      badges: atom(['gold', 'silver'], 'userBadges'),
    },
  }

  // Results in: { id: 42, name: 'John', stats: { score: 100, badges: ['gold', 'silver'] }}
  const plainUser = deatomize(user)
```

***

### effect()

> **effect**\<`T`\>(`cb`, `name?`): [`Unsubscribe`](#unsubscribe-2)

Defined in: [packages/core/src/methods/effect.ts:56](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/effect.ts#L56)

Creates a reactive side effect that automatically tracks dependencies and
cleans itself up.

`effect` is similar to `computed` but designed for running side effects. It
automatically subscribes to any atoms read within the callback (`cb`). When
the effect's reactive context is aborted (e.g., component unmount in
`reatomFactoryComponent`, cancellation in `withAbort` / `withAsyncData`), the
effect's execution is stopped, and any ongoing async operations within it
(like `await wrap(sleep(...))`) are cancelled.

#### Type Parameters

##### T

`T`

#### Parameters

##### cb

() => `T`

The function to run as a side effect. It can be async. Any atoms
  read inside `cb` will become dependencies.

##### name?

`string`

Optional name for debugging purposes. Auto-generated if not
  provided.

#### Returns

[`Unsubscribe`](#unsubscribe-2)

The new computed atom with `unsubscribe` method to manually clean up
  the effect. Calling this function is usually not necessary when `effect` is
  used within managed contexts like `reatomFactoryComponent` or
  `withConnectHook`, as cleanup happens automatically.

#### Example

```ts
import { atom, effect, wrap, sleep, isAbort } from '@reatom/core'

  const isActive = atom(true, 'isActive')
  const data = atom(0, 'data')

  // This effect polls data every 5 seconds while isActive is true
  const polling = effect(async () => {
    if (!isActive()) return // Depends on isActive

    console.log('Polling started...')
    while (true) {
      const fetchedData = await wrap(fetch('/api/poll'))
      const jsonData = await wrap(fetchedData.json())
      data(jsonData.value)
      await wrap(sleep(5000)) // Abortable sleep == debounce
    }
  }, 'pollingEffect')

  // To manually stop:
  // polling.unsubscribe()
```

***

### experimental\_fieldArray()

#### Call Signature

> **experimental\_fieldArray**\<`Param`\>(`initState`): `FormFieldArray`\<`Param`, `Param`\>

Defined in: [packages/core/src/form/reatomForm.ts:321](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomForm.ts#L321)

##### Type Parameters

###### Param

`Param` *extends* `FormInitStateElement`

##### Parameters

###### initState

`Param`[]

##### Returns

`FormFieldArray`\<`Param`, `Param`\>

#### Call Signature

> **experimental\_fieldArray**\<`Param`, `Node`\>(`create`): `FormFieldArray`\<`Param`, `Node`\>

Defined in: [packages/core/src/form/reatomForm.ts:325](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomForm.ts#L325)

##### Type Parameters

###### Param

`Param`

###### Node

`Node` *extends* `FormInitStateElement` = `FormInitStateElement`

##### Parameters

###### create

(`params`, `name`) => `Node`

##### Returns

`FormFieldArray`\<`Param`, `Node`\>

#### Call Signature

> **experimental\_fieldArray**\<`Param`, `Node`\>(`options`): `FormFieldArray`\<`Param`, `Node`\>

Defined in: [packages/core/src/form/reatomForm.ts:330](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomForm.ts#L330)

##### Type Parameters

###### Param

`Param`

###### Node

`Node` *extends* `FormInitStateElement` = `FormInitStateElement`

##### Parameters

###### options

###### create

(`param`, `name`) => `Node`

###### initState?

`Param`[]

##### Returns

`FormFieldArray`\<`Param`, `Node`\>

***

### extend()

> **extend**\<`This`\>(`this`, ...`extensions`): `This`

Defined in: [packages/core/src/core/extend.ts:111](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/extend.ts#L111)

Applies extensions to atoms or actions.

This is the core extension mechanism in Reatom that allows adding
functionality to atoms and actions. Extensions can add properties, methods,
or modify behavior. Extended atoms maintain their original reference
identity.

#### Type Parameters

##### This

`This` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\>

The type of atom or action being extended

#### Parameters

##### this

`This`

##### extensions

...[`Ext`](#ext)\<[`AtomLike`](#atomlike)\<`any`, `any`[], `any`\>, [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\>\>[]

Array of extensions to apply to the atom/action

#### Returns

`This`

The original atom/action with extensions applied

#### Example

```ts
// Extending an atom with reset capability
  const counter = atom(0, 'counter').extend(
    withReset(0), // Adds counter.reset() method
    withLogger('COUNTER'), // Adds logging middleware
  )
```

***

### getCalls()

> **getCalls**\<`Params`, `Payload`\>(`target`): `object`[]

Defined in: [packages/core/src/methods/ifChanged.ts:97](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/ifChanged.ts#L97)

Retrieves new action calls that occurred in the current batch.

This utility function tracks action invocations and returns an array of new
calls that have been made during the current batch. It's particularly useful
for monitoring action activity within computed atoms or effects without
triggering side effects during the action execution itself.

In a computed atom, the function compares the current action state with the
previous frame's state to determine which calls are new. If this is the first
time the action is being tracked, all current calls are considered new.
Otherwise, only calls that weren't present in the previous frame are
returned. If the computed triggered by some other dependent atom change, the
function may return an empty array. The past calls are not stored!

#### Type Parameters

##### Params

`Params` *extends* `any`[]

Array type representing the action's parameter types

##### Payload

`Payload`

Type of the action's return value/payload

#### Parameters

##### target

[`Action`](#action)\<`Params`, `Payload`\>

The action to monitor for new calls

#### Returns

`object`[]

Array of new action calls,
  each containing the action's payload (return value) and the parameters it
  was called with

#### Example

```ts
// Monitor API calls in an effect
  const apiCall = action((endpoint: string) => fetch(endpoint), 'apiCall')

  effect(() => {
    const newCalls = getCalls(apiCall)
    newCalls.forEach(({ payload, params }) => {
      console.log(`API called: ${params[0]}, Response:`, payload)
    })
  }, 'apiMonitor')
```

#### Throws

If target is a reactive atom instead of an action

***

### getStackTrace()

> **getStackTrace**(`acc?`, `steps?`, `frame?`): `null` \| `string`

Defined in: [packages/core/src/connectLogger.ts:132](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/connectLogger.ts#L132)

Generates a formatted stack trace string based on the current execution
context.

Creates a visual representation of the dependency tree from the current frame
up through its publishers, using ASCII/Unicode characters to show
relationships.

#### Parameters

##### acc?

`string` = `'─ '`

Initial accumulator string for the result.
  Default is `'─ '`

##### steps?

`string` = `''`

Initial indentation padding for proper
  alignment. Default is `''`

##### frame?

[`Frame`](#frame)\<`any`, `any`[], `any`\> = `...`

The starting frame to trace from (defaults to
  current top frame). Default is `top()`

#### Returns

`null` \| `string`

A formatted string representation of the stack trace

#### Example

```ts
// Might produce output like:
  // ─ counter ┬─ doubleCounter
  //           └─ displayValue
```

***

### identity()

> **identity**\<`T`\>(`value`, ...`a`): `T`

Defined in: [packages/core/src/utils.ts:234](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L234)

Identity function that returns the first argument unchanged. Can accept
additional parameters but ignores them.

#### Type Parameters

##### T

`T`

The type of value being passed through

#### Parameters

##### value

`T`

The value to return

##### a

...`any`[]

#### Returns

`T`

The same value that was passed in

***

### ~~ifCalled()~~

> **ifCalled**\<`Params`, `Payload`\>(`target`, `cb`): `void`

Defined in: [packages/core/src/methods/ifChanged.ts:140](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/ifChanged.ts#L140)

#### Type Parameters

##### Params

`Params` *extends* `any`[]

##### Payload

`Payload`

#### Parameters

##### target

[`Action`](#action)\<`Params`, `Payload`\>

##### cb

(`payload`, `params`) => `void`

#### Returns

`void`

#### Deprecated

Use `getCalls` instead

***

### ifChanged()

> **ifChanged**\<`T`\>(`target`, `cb`): `void`

Defined in: [packages/core/src/methods/ifChanged.ts:40](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/ifChanged.ts#L40)

Executes a callback when an atom's state changes

This utility evaluates if an atom's state has changed during the current
frame execution and calls the provided callback with the new state (and
optionally the previous state if available).

#### Type Parameters

##### T

`T` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\>

Type extending AtomLike

#### Parameters

##### target

`T`

The atom to monitor for changes

##### cb

(`newState`, `oldState?`) => `void`

Callback to execute when the atom changes

#### Returns

`void`

#### Example

```ts
// Log when the user's name changes
  ifChanged(userName, (newName, oldName) => {
    console.log(`Name changed from ${oldName} to ${newName}`)
  })
```

#### Throws

If target is not a reactive atom

***

### isAbort()

> **isAbort**(`thing`): `thing is AbortError`

Defined in: [packages/core/src/utils.ts:716](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L716)

Type guard that checks if a value is an AbortError.

#### Parameters

##### thing

`any`

The value to check

#### Returns

`thing is AbortError`

True if the value is an AbortError, false otherwise

***

### isAction()

> **isAction**(`target`): `target is Action<any[], any>`

Defined in: [packages/core/src/core/action.ts:47](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/action.ts#L47)

Type guard to check if a value is a Reatom action.

This function determines whether the given value is an action by checking if
it's an atom with non-reactive behavior (actions are non-reactive atoms).

#### Parameters

##### target

`unknown`

The value to check

#### Returns

`target is Action<any[], any>`

`true` if the value is a Reatom action, `false` otherwise

***

### isAtom()

> **isAtom**(`value`): `value is AtomLike<any, any[], any>`

Defined in: [packages/core/src/core/atom.ts:353](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L353)

#### Parameters

##### value

`any`

#### Returns

`value is AtomLike<any, any[], any>`

***

### isBrowser()

> **isBrowser**(): `boolean`

Defined in: [packages/core/src/utils.ts:780](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L780)

Detects whether the code is running in a browser environment. Checks for the
existence of window and document objects.

#### Returns

`boolean`

True if running in a browser environment, false otherwise

***

### isCausedBy()

> **isCausedBy**(`target`, `frame?`, `visited?`): `boolean`

Defined in: [packages/core/src/methods/isCausedBy.ts:25](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/isCausedBy.ts#L25)

Determines if an atom is part of the causal chain leading to the current
computation

This recursive function checks if the given atom has caused the current
computation by traversing the computation tree. It's useful for determining
dependencies and understanding the flow of state changes through your
application.

#### Parameters

##### target

[`AtomLike`](#atomlike)

The atom to check if it's part of the causal chain

##### frame?

[`Frame`](#frame)\<`any`, `any`[], `any`\> = `...`

The frame to check (defaults to the current
  top frame). Default is `top()`

##### visited?

`Set`\<[`Frame`](#frame)\<`any`, `any`[], `any`\>\> = `...`

#### Returns

`boolean`

True if the target atom is part of the causal chain, false
  otherwise

#### Example

```ts
// Check if user atom changes caused the current computation
  if (isCausedBy(userAtom)) {
    console.log('This computation was triggered by user state change')
  }
```

***

### isChanged()

> **isChanged**(`target`): `boolean`

Defined in: [packages/core/src/methods/ifChanged.ts:7](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/ifChanged.ts#L7)

#### Parameters

##### target

[`AtomLike`](#atomlike)

#### Returns

`boolean`

***

### isComputed()

> **isComputed**(`target`): `boolean`

Defined in: [packages/core/src/core/atom.ts:915](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L915)

Checks if the provided target is a READONLY computed atom

#### Parameters

##### target

[`AtomLike`](#atomlike)

The atom to check

#### Returns

`boolean`

Boolean

***

### isConnected()

> **isConnected**(`anAtom`): `boolean`

Defined in: [packages/core/src/core/atom.ts:460](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L460)

Checks if an atom has active subscriptions.

This function determines if an atom is currently connected to any
subscribers, which indicates that the atom is being actively used somewhere
in the application. This is useful for optimizations or conditional logic
based on whether an atom's changes are being observed.

#### Parameters

##### anAtom

[`AtomLike`](#atomlike)

The atom to check for subscriptions

#### Returns

`boolean`

`true` if the atom has subscribers, `false` otherwise

***

### isDeepEqual()

> **isDeepEqual**(`a`, `b`): `any`

Defined in: [packages/core/src/utils.ts:355](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L355)

Performs a deep equality comparison between two values. Recursively compares
nested objects and arrays while properly handling cyclic references.

Handles primitives, objects, dates, regular expressions, arrays, maps, and
sets. Uses a WeakMap to track visited objects to avoid infinite recursion
with circular references.

#### Parameters

##### a

`any`

First value to compare

##### b

`any`

Second value to compare

#### Returns

`any`

True if the values are deeply equal, false otherwise

***

### isFieldAtom()

> **isFieldAtom**(`thing`): `thing is FieldLikeAtom<any>`

Defined in: [packages/core/src/form/reatomField.ts:568](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L568)

#### Parameters

##### thing

`any`

#### Returns

`thing is FieldLikeAtom<any>`

***

### isInit()

> **isInit**(): `boolean`

Defined in: [packages/core/src/mixins/withInit.ts:22](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/mixins/withInit.ts#L22)

Checks if the current execution context is within the initialization of the
current atom.

#### Returns

`boolean`

True if currently in the initialization phase, false
  otherwise

#### Example

```ts
const search = atom('', 'search').extend(withSearchParams('search'))
  const page = atom(1, 'page').extend(
    withSearchParams('page'),
    withComputed((state) => {
      search() // subscribe to the search changes
      // do NOT drop the persisted state on init
      return isInit() ? state : 1
    }),
  )
```

***

### isLinkedListAtom()

> **isLinkedListAtom**(`thing`): `thing is LinkedListLikeAtom<LinkedList<LLNode<Rec>>>`

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:738](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomLinkedList.ts#L738)

#### Parameters

##### thing

`any`

#### Returns

`thing is LinkedListLikeAtom<LinkedList<LLNode<Rec>>>`

***

### isObject()

> **isObject**\<`T`\>(`thing`): thing is T extends Record\<string \| number \| symbol, unknown\> ? T\<T\> : Record\<string \| number \| symbol, unknown\>

Defined in: [packages/core/src/utils.ts:258](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L258)

Type guard that checks if a value is an object (non-null and typeof
'object'). Provides advanced type narrowing to either the original object
type or a generic object type.

#### Type Parameters

##### T

`T`

The type of value being checked

#### Parameters

##### thing

`T`

The value to check

#### Returns

thing is T extends Record\<string \| number \| symbol, unknown\> ? T\<T\> : Record\<string \| number \| symbol, unknown\>

True if the value is a non-null object, false otherwise

***

### isRec()

> **isRec**(`thing`): `thing is Record<string, unknown>`

Defined in: [packages/core/src/utils.ts:274](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L274)

Type guard that checks if a value is a plain object (a simple object literal
or created with Object.create(null)). Verifies that the object either has no
prototype or its prototype is Object.prototype.

#### Parameters

##### thing

`unknown`

The value to check

#### Returns

`thing is Record<string, unknown>`

True if the value is a plain object, false otherwise

***

### isShallowEqual()

> **isShallowEqual**(`a`, `b`, `is`): `any`

Defined in: [packages/core/src/utils.ts:298](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L298)

Performs a shallow equality comparison between two values. Handles
primitives, objects, dates, regular expressions, arrays, maps, and sets.

For iterables, compares each item in sequence for equality. For objects,
compares direct property values but not nested objects deeply.

#### Parameters

##### a

`any`

First value to compare

##### b

`any`

Second value to compare

##### is

(`value1`, `value2`) => `boolean`

Optional comparison function to use for individual values
  (defaults to Object.is)

#### Returns

`any`

True if the values are shallowly equal, false otherwise

***

### isWritableAtom()

> **isWritableAtom**(`value`): `value is Atom<any, [newState: any]>`

Defined in: [packages/core/src/core/atom.ts:357](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L357)

#### Parameters

##### value

`any`

#### Returns

`value is Atom<any, [newState: any]>`

***

### jsonClone()

> **jsonClone**\<`T`\>(`value`): `T`

Defined in: [packages/core/src/utils.ts:509](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L509)

Creates a deep clone of a value using JSON serialization/deserialization.
This is a type-safe shortcut to `JSON.parse(JSON.stringify(value))`.

Note: This has limitations with circular references, functions, symbols, and
special objects like Date (converts to string). Consider using the native
structuredClone when available.

#### Type Parameters

##### T

`T`

The type of value being cloned

#### Parameters

##### value

`T`

The value to clone

#### Returns

`T`

A deep clone of the input value

#### See

https://developer.mozilla.org/en-US/docs/Web/API/structuredClone

***

### memo()

> **memo**\<`State`\>(`cb`, `equal`, `key`): `State`

Defined in: [packages/core/src/methods/memo.ts:84](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/memo.ts#L84)

Memoize additional computation inside a different calls of an atom (computed
or an effect) or an action.

It's useful when you want to avoid recomputing of the whole computed
function, especially if the computation is expensive. You could create an
external atom by yourself, but it is not handy sometimes.

The `memo` function takes a callback function `cb` that returns the value to
be memoized, an optional `equal` function that compares the new and old
values to determine if the memoized value should be updated, and an optional
`key` to uniquely identify the memoized value.

**Important note**: The created internal atom only uses the first passed
callback function. This means it's unsafe to rely on data from the closure
that changes on every recall, as subsequent calls will not update the
callback used by the internal atom.

Note for rare cases: A created underhood atom is memorized for each memo by
the passed function sources from "toString()" method, so every computed
callback in different memos of the same atom should contain different code.
However, you can provide a custom `key` parameter to uniquely identify
different memo calls instead of relying on toString().

#### Type Parameters

##### State

`State`

#### Parameters

##### cb

A function that returns the value to be selected and memoized.

() => `State` | (`state?`) => `State`

##### equal

(`newState`, `oldState`) => `boolean`

##### key

`string` = `...`

An optional unique identifier for the memoized value. Defaults to
  `cb.toString()`. Used to distinguish between different memo calls within
  the same computed function. Providing a custom key is recommended when
  using similar callback functions to avoid conflicts.

#### Returns

`State`

The memoized value.

#### Examples

```ts
// This is very useful to memoize not just the end string,
  // but, for example, a template computation inside `reatomComponent` or so on.
  export const listSum = computed(() => {
    // Simple call of `list().length` will cause extra recomputations for elements sorting or its internal changes.
    // correct optimal way, the component will rerender only on `length` change
    const length = memo(() => list().length)
    // you could call different `memo` many times in one computed
    const sum = memo(() => list().reduce((acc, el) => acc + el().value, 0))

    return `The sum of ${length} elements is: ${sum}`
  }, 'listSum')
```

```ts
// An example of using the equality function as part of the logic
  const scroll = atom(0, 'scroll')
  const throttledScroll = computed(() => {
    const { state } = memo(
      () => ({ state: scroll(), time: Date.now() }),
      // Only update if 50ms have passed since the last update
      (next, prev) => prev.time + 50 < Date.now(),
    )
    return state
  }, 'throttledScroll')
```

```ts
// Using memo in actions for expensive computations
  const processData = action((data: string[]) => {
    // You can even create a service, but not one that is tied only to this action.
    const myService = memo(() => new Service())

    myService.send(data)
  }, 'processData')
```

***

### mock()

> **mock**\<`Params`, `Payload`\>(`target`, `cb`): [`Unsubscribe`](#unsubscribe-2)

Defined in: [packages/core/src/core/atom.ts:1066](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L1066)

Mocks an atom or action for testing purposes.

This function replaces the original behavior of an atom or action with a
custom callback function for the duration of the mock. This is useful for
isolating units of code during testing and controlling their behavior.

#### Type Parameters

##### Params

`Params` *extends* `any`[]

The parameter types of the target atom/action

##### Payload

`Payload`

The return type of the target atom/action

#### Parameters

##### target

[`AtomLike`](#atomlike)\<`any`, `Params`, `Payload`\>

The atom or action to mock

##### cb

(...`params`) => `Payload`

The callback function to use as the mock implementation. It
  receives the parameters passed to the mocked atom/action and should return
  the desired payload.

#### Returns

[`Unsubscribe`](#unsubscribe-2)

A function that, when called, removes the mock and restores the
  original behavior.

***

### mockRandom()

> **mockRandom**(`fn`): () => `void`

Defined in: [packages/core/src/utils.ts:538](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L538)

Replaces the default random number generator with a custom implementation.
Useful for testing to provide deterministic "random" values.

#### Parameters

##### fn

(`min`, `max`) => `number`

The custom random function to use

#### Returns

A restore function that reverts to the original random
  implementation when called

> (): `void`

##### Returns

`void`

#### Example

```ts
// Set up deterministic random values for testing
  const restore = mockRandom(() => 42)
  console.log(random()) // Always returns 42
  restore() // Back to normal random behavior
```

***

### named()

> **named**(`name`): `string`

Defined in: [packages/core/src/core/atom.ts:522](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L522)

#### Parameters

##### name

`string` | `TemplateStringsArray`

#### Returns

`string`

***

### nonNullable()

> **nonNullable**\<`T`\>(`value`, `message?`): `NonNullable`\<`T`\>

Defined in: [packages/core/src/utils.ts:560](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L560)

Asserts that a value is not null or undefined. Throws a TypeError if the
value is null or undefined. Also serves as a type guard to narrow the type to
non-nullable.

#### Type Parameters

##### T

`T`

The type of value to check

#### Parameters

##### value

`T`

The value to check

##### message?

`string`

Optional custom error message

#### Returns

`NonNullable`\<`T`\>

The input value if it's not null or undefined

#### Example

```ts
const name = nonNullable(user.name) // TypeScript knows name is not null or undefined
```

#### Throws

If the value is null or undefined

***

### notify()

> **notify**(): `void`

Defined in: [packages/core/src/core/queues.ts:70](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/queues.ts#L70)

Processes all scheduled tasks in the current context's queues.

This function is called automatically after tasks have been scheduled via
`enqueue`. It processes tasks in the following priority order:

1. Hook tasks
2. Compute tasks
3. Cleanup tasks
4. Effect tasks

The function resets priority after each task execution to ensure higher
priority tasks (which may have been added during execution) are processed
first.

#### Returns

`void`

***

### omit()

> **omit**\<`T`, `K`\>(`target`, `keys`): [`Plain`](#plain)\<`Omit`\<`T`, `K`\>\>

Defined in: [packages/core/src/utils.ts:485](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L485)

Creates a new object excluding the specified keys from the original object.

#### Type Parameters

##### T

`T`

The source object type

##### K

`K` *extends* `string` \| `number` \| `symbol`

The keys to omit from the object

#### Parameters

##### target

`T`

The source object

##### keys

`K`[]

Array of keys to exclude from the result

#### Returns

[`Plain`](#plain)\<`Omit`\<`T`, `K`\>\>

A new object containing all keys except the specified ones

#### Example

```ts
const user = { id: 1, name: 'Alice', password: 'secret' }
  const safeUser = omit(user, ['password'])
  // Result: { id: 1, name: 'Alice' }
```

***

### peek()

> **peek**\<`Params`, `Result`\>(`cb`, ...`params`): `Result`

Defined in: [packages/core/src/methods/peek.ts:38](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/peek.ts#L38)

Executes a callback in the current context without reactive bindings
(dependencies tracking)

#### Type Parameters

##### Params

`Params` *extends* `any`[]

##### Result

`Result`

#### Parameters

##### cb

(...`params`) => `Result`

##### params

...`Params`

#### Returns

`Result`

#### Examples

```ts
// reset paging on search changes
  effect(() => {
    const searchState = search()

    // get page state without subscribing to it!
    if (peek(page) > 1) peek(0)
  })
```

```ts
const query = atom('', 'query')
  const someResource = computed(
    async () => api.getSome(query()),
    'someResource',
  ).extend(withAsyncData())

  const tip = computed(() => {
    if (!someResource.ready()) {
      return 'Searching...'
    }

    const list = someResource.data()

    if (list.length === 0) {
      // no need to subscribe to the query changes!
      return peek(query) ? 'Nothing found' : 'Try to search something'
    }

    return `Found ${list.length} elements`
  })
```

***

### pick()

> **pick**\<`T`, `K`\>(`target`, `keys`): [`Plain`](#plain)\<`Pick`\<`T`, `K`\>\>

Defined in: [packages/core/src/utils.ts:462](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L462)

Creates a new object with only the specified keys from the original object.

#### Type Parameters

##### T

`T`

The source object type

##### K

`K` *extends* `string` \| `number` \| `symbol`

The keys to pick from the object

#### Parameters

##### target

`T`

The source object

##### keys

`K`[]

Array of keys to include in the result

#### Returns

[`Plain`](#plain)\<`Pick`\<`T`, `K`\>\>

A new object containing only the specified keys and their values

#### Example

```ts
const user = { id: 1, name: 'Alice', email: 'alice@example.com' }
  const userInfo = pick(user, ['name', 'email'])
  // Result: { name: 'Alice', email: 'alice@example.com' }
```

***

### reatomAbstractRender()

> **reatomAbstractRender**\<`Props`, `Result`\>(`options`): [`AbstractRender`](#abstractrender)\<`Props`, `Result`\>

Defined in: [packages/core/src/reatomAbstractRender.ts:73](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/reatomAbstractRender.ts#L73)

Creates a low-level renderer that connects Reatom with other reactive
systems. This function decorates computed rendering to prevent extra or
outdated rerenders, allowing a user render function to run only in the
context of the adapted reactive system.

The renderer maintains proper reactivity by coordinating state updates
between Reatom's atom/computed system and the target rendering system.

#### Type Parameters

##### Props

`Props`

The type of props/parameters that the renderer accepts

##### Result

`Result`

The type of result produced by the render operation

#### Parameters

##### options

Configuration options for the abstract renderer

###### frame

[`Frame`](#frame)

The Reatom frame/context in which the
  rendering occurs

###### mount?

() => `void`

Optional function called when mounting
  the renderer

###### name

`string`

Name identifier for debugging purposes

###### render

(`props`) => `Result`

Function that renders content with the
  given props

###### rerender

(`param`) => `any`

Function called when a rerender is
  needed

#### Returns

[`AbstractRender`](#abstractrender)\<`Props`, `Result`\>

An object with render and mount
  methods

#### Example

```ts
// Creating a React renderer
  const reactRenderer = reatomAbstractRender({
    frame: ctx,
    render: (props) => React.createElement(Component, props),
    rerender: ({ result }) => setElement(result),
    name: 'ReactRenderer',
  })

  // Usage
  const unmount = reactRenderer.mount()
  reactRenderer.render({ prop1: 'value1' })

  // Later cleanup
  unmount()
```

***

### reatomArray()

> **reatomArray**\<`T`\>(`initState`, `name`): [`ArrayAtom`](#arrayatom)\<`T`\>

Defined in: [packages/core/src/primitives/reatomArray.ts:11](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomArray.ts#L11)

#### Type Parameters

##### T

`T`

#### Parameters

##### initState

`T`[] = `...`

##### name

`string` = `...`

#### Returns

[`ArrayAtom`](#arrayatom)\<`T`\>

***

### reatomBoolean()

> **reatomBoolean**(`init`, `name`): [`BooleanAtom`](#booleanatom)

Defined in: [packages/core/src/primitives/reatomBoolean.ts:11](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomBoolean.ts#L11)

#### Parameters

##### init

`boolean` = `false`

##### name

`string` = `...`

#### Returns

[`BooleanAtom`](#booleanatom)

***

### reatomEnum()

> **reatomEnum**\<`T`, `Format`\>(`variants`, `options`): [`EnumAtom`](#enumatom)\<`T`, `Format`\>

Defined in: [packages/core/src/primitives/reatomEnum.ts:33](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomEnum.ts#L33)

#### Type Parameters

##### T

`T` *extends* `string`

##### Format

`Format` *extends* `"camelCase"` \| `"snake_case"` = `"camelCase"`

#### Parameters

##### variants

readonly `T`[]

##### options

`string` | [`EnumAtomOptions`](#enumatomoptions)\<`T`, `Format`\>

#### Returns

[`EnumAtom`](#enumatom)\<`T`, `Format`\>

***

### reatomField()

#### Call Signature

> **reatomField**\<`State`, `Value`\>(`_initState`, `options`): [`FieldAtom`](#fieldatom)\<`State`, `Value`\>

Defined in: [packages/core/src/form/reatomField.ts:275](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L275)

##### Type Parameters

###### State

`State`

###### Value

`Value` = `State`

##### Parameters

###### \_initState

`State`

###### options

`string` | [`FieldOptions`](#fieldoptions)\<`State`, `Value`\>

##### Returns

[`FieldAtom`](#fieldatom)\<`State`, `Value`\>

#### Call Signature

> **reatomField**\<`State`, `A`, `Value`\>(`_initState`, `options`, `stateAtom`): `A` & [`FieldAtom`](#fieldatom)\<`State`, `Value`\>

Defined in: [packages/core/src/form/reatomField.ts:280](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L280)

##### Type Parameters

###### State

`State`

###### A

`A` *extends* [`Atom`](#atom)\<`State`, \[`State`\]\>

###### Value

`Value` = `State`

##### Parameters

###### \_initState

`State`

###### options

`string` | [`FieldOptions`](#fieldoptions)\<`State`, `Value`\>

###### stateAtom

`A`

##### Returns

`A` & [`FieldAtom`](#fieldatom)\<`State`, `Value`\>

***

### reatomFieldSet()

> **reatomFieldSet**\<`T`\>(`fields`, `name`): [`FieldSet`](#fieldset)\<`T`\>

Defined in: [packages/core/src/form/reatomFieldSet.ts:81](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomFieldSet.ts#L81)

#### Type Parameters

##### T

`T` *extends* [`FormInitState`](#forminitstate)

#### Parameters

##### fields

[`FormFields`](#formfields-1)\<`T`\>

##### name

`string` = `...`

#### Returns

[`FieldSet`](#fieldset)\<`T`\>

***

### reatomForm()

#### Call Signature

> **reatomForm**\<`T`, `SchemaState`, `SubmitReturn`\>(`initState`, `optionsWithSchema`): [`Form`](#form)\<`T`, `SchemaState`, `SubmitReturn`\>

Defined in: [packages/core/src/form/reatomForm.ts:404](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomForm.ts#L404)

##### Type Parameters

###### T

`T` *extends* [`FormInitState`](#forminitstate)

###### SchemaState

`SchemaState`

###### SubmitReturn

`SubmitReturn`

##### Parameters

###### initState

`T` | (`name`) => `T`

###### optionsWithSchema

[`FormOptionsWithSchema`](#formoptionswithschema)\<`SchemaState`, `SubmitReturn`\>

##### Returns

[`Form`](#form)\<`T`, `SchemaState`, `SubmitReturn`\>

#### Call Signature

> **reatomForm**\<`T`, `SubmitReturn`\>(`initState`, `options?`): [`Form`](#form)\<`T`, `undefined`, `SubmitReturn`\>

Defined in: [packages/core/src/form/reatomForm.ts:409](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomForm.ts#L409)

##### Type Parameters

###### T

`T` *extends* [`FormInitState`](#forminitstate)

###### SubmitReturn

`SubmitReturn`

##### Parameters

###### initState

`T` | (`name`) => `T`

###### options?

[`FormOptionsWithoutSchema`](#formoptionswithoutschema)\<`T`, `SubmitReturn`\>

##### Returns

[`Form`](#form)\<`T`, `undefined`, `SubmitReturn`\>

#### Call Signature

> **reatomForm**\<`T`\>(`initState`, `name?`): [`Form`](#form)\<`T`, `undefined`, `void`\>

Defined in: [packages/core/src/form/reatomForm.ts:414](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomForm.ts#L414)

##### Type Parameters

###### T

`T` *extends* [`FormInitState`](#forminitstate)

##### Parameters

###### initState

`T` | (`name`) => `T`

###### name?

`string`

##### Returns

[`Form`](#form)\<`T`, `undefined`, `void`\>

***

### reatomLinkedList()

#### Call Signature

> **reatomLinkedList**\<`Node`, `Params`, `Key`\>(`initState`, `name?`): [`LinkedListAtom`](#linkedlistatom)\<`Params`, `Node`, `Key`\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:250](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomLinkedList.ts#L250)

##### Type Parameters

###### Node

`Node` *extends* [`Rec`](#rec)

###### Params

`Params` *extends* `any`[] = \[`Node`\]

###### Key

`Key` *extends* `string` \| `number` \| `symbol` = `never`

##### Parameters

###### initState

`Node`[]

###### name?

`string`

##### Returns

[`LinkedListAtom`](#linkedlistatom)\<`Params`, `Node`, `Key`\>

#### Call Signature

> **reatomLinkedList**\<`Params`, `Node`, `Key`\>(`initState`, `name?`): [`LinkedListAtom`](#linkedlistatom)\<`Params`, `Node`, `Key`\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:256](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomLinkedList.ts#L256)

##### Type Parameters

###### Params

`Params` *extends* `any`[]

###### Node

`Node` *extends* [`Rec`](#rec)

###### Key

`Key` *extends* `string` \| `number` \| `symbol` = `never`

##### Parameters

###### initState

(...`params`) => `Node`

###### name?

`string`

##### Returns

[`LinkedListAtom`](#linkedlistatom)\<`Params`, `Node`, `Key`\>

#### Call Signature

> **reatomLinkedList**\<`Params`, `Node`, `Key`\>(`initState`, `name?`): [`LinkedListAtom`](#linkedlistatom)\<`Params`, `Node`, `Key`\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:265](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomLinkedList.ts#L265)

##### Type Parameters

###### Params

`Params` *extends* `any`[]

###### Node

`Node` *extends* [`Rec`](#rec)

###### Key

`Key` *extends* `string` \| `number` \| `symbol` = `never`

##### Parameters

###### initState

###### create

(...`params`) => `Node`

###### initState?

`Node`[]

###### key?

`Key`

###### name?

`string`

##### Returns

[`LinkedListAtom`](#linkedlistatom)\<`Params`, `Node`, `Key`\>

#### Call Signature

> **reatomLinkedList**\<`Params`, `Node`, `Key`\>(`initState`, `name?`): [`LinkedListAtom`](#linkedlistatom)\<`Params`, `Node`, `Key`\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:278](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomLinkedList.ts#L278)

##### Type Parameters

###### Params

`Params` *extends* `any`[]

###### Node

`Node` *extends* [`Rec`](#rec)

###### Key

`Key` *extends* `string` \| `number` \| `symbol` = `never`

##### Parameters

###### initState

###### create?

(...`params`) => `Node`

###### initState

`Node`[]

###### key?

`Key`

###### name?

`string`

##### Returns

[`LinkedListAtom`](#linkedlistatom)\<`Params`, `Node`, `Key`\>

#### Call Signature

> **reatomLinkedList**\<`Params`, `Node`, `Key`\>(`initSnapshot`, `name?`): [`LinkedListAtom`](#linkedlistatom)\<`Params`, `Node`, `Key`\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:291](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomLinkedList.ts#L291)

##### Type Parameters

###### Params

`Params` *extends* `any`[]

###### Node

`Node` *extends* [`Rec`](#rec)

###### Key

`Key` *extends* `string` \| `number` \| `symbol` = `never`

##### Parameters

###### initSnapshot

###### create

(...`params`) => `Node`

###### initSnapshot?

`Params`[]

###### key?

`Key`

###### name?

`string`

##### Returns

[`LinkedListAtom`](#linkedlistatom)\<`Params`, `Node`, `Key`\>

***

### reatomMap()

> **reatomMap**\<`Key`, `Value`\>(`initState`, `name`): [`MapAtom`](#mapatom)\<`Key`, `Value`\>

Defined in: [packages/core/src/primitives/reatomMap.ts:41](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomMap.ts#L41)

#### Type Parameters

##### Key

`Key`

##### Value

`Value`

#### Parameters

##### initState

`StateInit`\<`Key`, `Value`\> = `...`

##### name

`string` = `...`

#### Returns

[`MapAtom`](#mapatom)\<`Key`, `Value`\>

***

### reatomNumber()

> **reatomNumber**(`initState`, `name`): [`NumberAtom`](#numberatom)

Defined in: [packages/core/src/primitives/reatomNumber.ts:12](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomNumber.ts#L12)

#### Parameters

##### initState

`number` = `0`

##### name

`string` = `...`

#### Returns

[`NumberAtom`](#numberatom)

***

### reatomPersist()

> **reatomPersist**(`storage`): [`WithPersist`](#withpersist) & `object`

Defined in: [packages/core/src/persist/index.ts:93](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/index.ts#L93)

#### Parameters

##### storage

[`PersistStorage`](#persiststorage)

#### Returns

[`WithPersist`](#withpersist) & `object`

***

### reatomPersistBroadcastChannel()

> **reatomPersistBroadcastChannel**(`channel`): `WithPersistWebStorage`

Defined in: [packages/core/src/persist/web-storage/broadcastChannel.ts:92](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/web-storage/broadcastChannel.ts#L92)

Creates a BroadcastChannel-based persistence adapter for cross-tab
synchronization.

Uses the BroadcastChannel API to synchronize atom state across multiple
browser tabs or workers. Provides real-time synchronization without server
involvement. Data is stored in memory and shared via message passing.

#### Parameters

##### channel

`BroadcastChannel`

BroadcastChannel instance for cross-tab communication

#### Returns

`WithPersistWebStorage`

Persist adapter with cross-tab synchronization capabilities

#### Example

```typescript
  // Basic usage with automatic channel
  const counterAtom = atom(0, 'counterAtom').extend(
  withBroadcastChannel('shared-counter')
  )

  // Custom channel for specific use case
  const gameChannel = new BroadcastChannel('game-state')
  const gameStateAtom = atom({}, 'gameStateAtom').extend(
  reatomPersistBroadcastChannel(gameChannel)('game-data')
  )

  // Multiple atoms sharing the same channel
  const chatChannel = new BroadcastChannel('chat-app')
  const messagesAtom = atom([], 'messagesAtom').extend(
  reatomPersistBroadcastChannel(chatChannel)('messages')
  )
  const usersAtom = atom([], 'usersAtom').extend(
  reatomPersistBroadcastChannel(chatChannel)('users')
  )
  ```

  **Features:**
  - Real-time cross-tab synchronization
  - Memory-based storage with broadcast updates
  - Pull-based data request system for late-joining tabs
  - Graceful error handling for closed channels
  - No server or persistent storage required

  **Use Cases:**
  - Live collaborative features
  - Cross-tab state synchronization
  - Real-time notifications
  - Shared application state

#### See

 - [withBroadcastChannel](#withbroadcastchannel) for default channel with automatic fallback
 - [BroadcastMessage](#broadcastmessage) for message format details

***

### reatomPersistIndexedDb()

> **reatomPersistIndexedDb**(`dbName`, `channel`): `WithPersistWebStorage`

Defined in: [packages/core/src/persist/web-storage/indexedDb.ts:118](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/web-storage/indexedDb.ts#L118)

Creates an IndexedDB-based persistence adapter with cross-tab
synchronization.

Provides persistent storage using IndexedDB with real-time synchronization
across browser tabs via BroadcastChannel. Uses idb-keyval as an optional
dependency for simplified IndexedDB operations. Automatically falls back to
memory storage if IndexedDB or idb-keyval is unavailable.

#### Parameters

##### dbName

`string`

Name of the IndexedDB database to use

##### channel

`BroadcastChannel`

BroadcastChannel for cross-tab synchronization

#### Returns

`WithPersistWebStorage`

Persist adapter with IndexedDB storage and cross-tab sync

#### Example

```typescript
  // Custom IndexedDB with specific database name
  const userDataChannel = new BroadcastChannel('user-data-sync')
  const withUserDb = reatomPersistIndexedDb('user-db', userDataChannel)
  const profileAtom = atom({}, 'profileAtom').extend(
  withUserDb('user-profile')
  )

  // Application state with persistent storage
  const appStateChannel = new BroadcastChannel('app-state')
  const withAppDb = reatomPersistIndexedDb('app-state-db', appStateChannel)
  const settingsAtom = atom({}, 'settingsAtom').extend(
  withAppDb('app-settings')
  )

  // Large data sets that exceed localStorage limits
  const dataChannel = new BroadcastChannel('large-data')
  const withLargeDataDb = reatomPersistIndexedDb('large-data-db', dataChannel)
  const cacheAtom = atom(new Map(), 'cacheAtom').extend(
  withLargeDataDb('api-cache')
  )
  ```

  **Features:**
  - Large storage capacity (hundreds of MB to GB depending on browser)
  - Persistent storage that survives browser restarts
  - Cross-tab synchronization via BroadcastChannel
  - Asynchronous operations for better performance
  - Automatic fallback to memory storage when unavailable
  - Memory cache for immediate read access

  **Requirements:**
  - idb-keyval package as peerDependency (optional, auto-detected)
  - IndexedDB support in the browser
  - BroadcastChannel support for cross-tab sync

  **Use Cases:**
  - Large application data that exceeds localStorage limits
  - Offline-capable applications with persistent storage
  - Complex data structures and large datasets
  - Applications requiring robust storage with transactions

#### See

 - [withIndexedDb](#withindexeddb) for default IndexedDB with automatic fallback
 - [withLocalStorage](#withlocalstorage) for simpler persistent storage with size limits
 - [BroadcastMessage](#broadcastmessage) for synchronization message format

***

### reatomPersistWebStorage()

> **reatomPersistWebStorage**(`name`, `storage`): [`WithPersistWebStorage`](#withpersistwebstorage)

Defined in: [packages/core/src/persist/web-storage/localStorage.ts:63](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/persist/web-storage/localStorage.ts#L63)

Creates a Web Storage API persistence adapter for Reatom atoms.

Works with any object that implements the Storage interface (localStorage,
sessionStorage, or custom storage implementations). Provides automatic JSON
serialization, memory caching, and cross-tab synchronization via storage
events.

#### Parameters

##### name

`string`

Unique identifier for this persist instance

##### storage

`Storage`

Storage object implementing the Web Storage API interface

#### Returns

[`WithPersistWebStorage`](#withpersistwebstorage)

Persist adapter with memory cache and storage event synchronization

#### Example

```typescript
  // Using localStorage
  const withMyLocalStorage = reatomPersistWebStorage('myApp', localStorage)
  const settingsAtom = atom({}, 'settingsAtom').extend(
  withMyLocalStorage('user-settings')
  )

  // Using sessionStorage
  const withMySessionStorage = reatomPersistWebStorage('session', sessionStorage)
  const tempDataAtom = atom(null, 'tempDataAtom').extend(
  withMySessionStorage('temp-data')
  )

  // Custom storage implementation
  const customStorage = {
  getItem: (key) => myDatabase.get(key),
  setItem: (key, value) => myDatabase.set(key, value),
  removeItem: (key) => myDatabase.delete(key)
  }
  const withCustomStorage = reatomPersistWebStorage('db', customStorage)
  ```

  **Features:**
  - Memory cache for performance optimization
  - Cross-tab synchronization via storage events (for localStorage)
  - Automatic expiration handling
  - Graceful error handling for storage quota limits
  - JSON serialization with fallback handling

#### See

 - [withLocalStorage](#withlocalstorage) for localStorage with automatic fallback
 - [withSessionStorage](#withsessionstorage) for sessionStorage with automatic fallback

***

### reatomRecord()

> **reatomRecord**\<`T`\>(`initState`, `name`): [`RecordAtom`](#recordatom)\<`T`\>

Defined in: [packages/core/src/primitives/reatomRecord.ts:12](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomRecord.ts#L12)

#### Type Parameters

##### T

`T` *extends* [`Rec`](#rec)

#### Parameters

##### initState

`Exclude`\<`T`, [`Fn`](#fn)\>

##### name

`string` = `...`

#### Returns

[`RecordAtom`](#recordatom)\<`T`\>

***

### reatomSet()

> **reatomSet**\<`T`\>(`initState`, `name`): [`SetAtom`](#setatom)\<`T`\>

Defined in: [packages/core/src/primitives/reatomSet.ts:17](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/primitives/reatomSet.ts#L17)

#### Type Parameters

##### T

`T`

#### Parameters

##### initState

`StateInit`\<`T`\> = `...`

##### name

`string` = `...`

#### Returns

[`SetAtom`](#setatom)\<`T`\>

***

### reatomTransaction()

> **reatomTransaction**(): `TransactionVariable`

Defined in: [packages/core/src/methods/transaction.ts:37](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/transaction.ts#L37)

Creates a transaction variable with rollback capabilities. This variable
stores a list of rollback functions that can be executed to revert state
changes made within a transaction.

#### Returns

`TransactionVariable`

A transaction variable with `withRollback` middleware and a
  `rollback` action.

***

### reatomWebSocket()

> **reatomWebSocket**\<`T`\>(`options`): [`WebSocketAtom`](#websocketatom)\<`T`\>

Defined in: packages/core/src/web/reatomWebSocket.ts:77

#### Type Parameters

##### T

`T` = `any`

#### Parameters

##### options

`string` | [`WebSocketOptions`](#websocketoptions)

#### Returns

[`WebSocketAtom`](#websocketatom)\<`T`\>

***

### reset()

> **reset**\<`T`\>(`target`): `T`

Defined in: packages/core/src/methods/retry.ts:13

Removes all computed atom dependencies. Useful for resources / effects
invalidation.

#### Type Parameters

##### T

`T` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\>

#### Parameters

##### target

`T`

The reactive atom whose dependencies should be reset.

#### Returns

`T`

#### Throws

If the target is not reactive.

***

### run()

> **run**\<`I`, `O`\>(`this`, `fn`, ...`params`): `O`

Defined in: [packages/core/src/core/atom.ts:315](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L315)

#### Type Parameters

##### I

`I` *extends* `any`[]

##### O

`O`

#### Parameters

##### this

[`Frame`](#frame)

##### fn

(...`params`) => `O`

##### params

...`I`

#### Returns

`O`

***

### settled()

> **settled**\<`Result`, `Fallback`\>(`promise`, `fallback?`): `Result` \| `Fallback`

Defined in: [packages/core/src/mixins/withSuspense.ts:14](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/mixins/withSuspense.ts#L14)

#### Type Parameters

##### Result

`Result`

##### Fallback

`Fallback` = `undefined`

#### Parameters

##### promise

`Result` | `Promise`\<`Result`\>

##### fallback?

`Fallback`

#### Returns

`Result` \| `Fallback`

***

### sleep()

> **sleep**(`ms`): `Promise`\<`unknown`\>

Defined in: [packages/core/src/utils.ts:247](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L247)

Creates a promise that resolves after the specified number of milliseconds.
Useful for creating delays in async functions.

#### Parameters

##### ms

`number` = `0`

The number of milliseconds to sleep (defaults to 0)

#### Returns

`Promise`\<`unknown`\>

A promise that resolves after the specified delay

***

### suspense()

> **suspense**\<`State`\>(`target`): `Awaited`\<`State`\>

Defined in: [packages/core/src/mixins/withSuspense.ts:94](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/mixins/withSuspense.ts#L94)

#### Type Parameters

##### State

`State`

#### Parameters

##### target

[`AtomLike`](#atomlike)\<`State`\>

#### Returns

`Awaited`\<`State`\>

***

### take()

#### Call Signature

> **take**\<`Return`\>(`target`, `name?`): `Promise`\<`Awaited`\<`Return`\>\>

Defined in: [packages/core/src/methods/take.ts:42](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/take.ts#L42)

Awaits the next update of an atom or call of an action.

This function returns a Promise that resolves when the specified atom's state
changes or when the specified action is called. This is valuable for
orchestrating workflows that depend on future state changes or action calls.

Note: Must be used with `wrap()` when used in an async context to preserve
reactive context.

##### Type Parameters

###### Return

`Return`

##### Parameters

###### target

The atom or action to wait for

[`AtomLike`](#atomlike)\<`any`, `any`, `Return`\> | () => `Return`

###### name?

`string`

Optional name for debugging purposes

##### Returns

`Promise`\<`Awaited`\<`Return`\>\>

A promise that resolves with the next value of the atom or action
  result

##### Example

```ts
// Wait for form validation before proceeding
  const submitWhenValid = action(async () => {
    while (true) {
      const currentData = formData()
      const error = validate(currentData)
      if (!error) break // Exit loop if valid

      formData({ ...currentData, error }) // Show error

      // Wait for the next change in formData - need wrap() to preserve context
      await wrap(take(formData))
    }
    // Now formData is valid, proceed with submission...
  })
```

#### Call Signature

> **take**\<`Return`, `Result`\>(`target`, `map`, `name?`): `Result` \| `Promise`\<`Result`\>

Defined in: [packages/core/src/methods/take.ts:58](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/take.ts#L58)

Awaits the next update of the target AtomLike and maps the result. If the map
function executes synchronously without throwing, its result is returned
directly. Otherwise, a promise is returned.

##### Type Parameters

###### Return

`Return`

The type of the awaited value from the target.

###### Result

`Result`

The type of the mapped result.

##### Parameters

###### target

The AtomLike to await.

[`AtomLike`](#atomlike)\<`any`, `any`, `Return`\> | () => `Return`

###### map

(`value`) => `Result`

A function to map the awaited value.

###### name?

`string`

Optional name for debugging.

##### Returns

`Result` \| `Promise`\<`Result`\>

The mapped result or a promise that resolves with the mapped result.

***

### throwAbort()

> **throwAbort**(`message`, `controller?`): `never`

Defined in: [packages/core/src/utils.ts:727](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L727)

Creates and throws an AbortError with the provided message. Optionally aborts
the provided controller with the same error.

#### Parameters

##### message

`string` = `''`

The error message

##### controller?

`AbortController`

Optional AbortController to abort

#### Returns

`never`

#### Throws

Always throws the created AbortError

***

### throwIfAborted()

> **throwIfAborted**(`controller?`): `void`

Defined in: [packages/core/src/utils.ts:704](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L704)

Checks if an AbortController is aborted and throws an AbortError if it is.
Useful for quick abort checks at the beginning of async operations.

#### Parameters

##### controller?

The AbortController to check (can be undefined, null or
  void)

`null` | `void` | `AbortController`

#### Returns

`void`

#### Throws

If the controller's signal is aborted

***

### toAbortError()

> **toAbortError**(`reason`): [`AbortError`](#aborterror)

Defined in: [packages/core/src/utils.ts:674](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L674)

Converts any value to an AbortError. If the value is already an AbortError,
it will be returned as is. Otherwise, creates a new AbortError with
appropriate information.

Handles different environments by using DOMException when available or
falling back to regular Error with name set to 'AbortError'.

#### Parameters

##### reason

`any`

The value to convert to an AbortError

#### Returns

[`AbortError`](#aborterror)

An AbortError instance

***

### top()

> **top**(): [`Frame`](#frame)

Defined in: [packages/core/src/core/atom.ts:1005](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/core/atom.ts#L1005)

Gets the current top frame in the Reatom context stack.

Returns the currently active frame in the execution stack, which contains the
current atom being processed and its state.

#### Returns

[`Frame`](#frame)

The current top frame from the context stack

#### Throws

If the context stack is empty (missing async stack)

***

### toStringKey()

> **toStringKey**(`thing`, `immutable`): `string`

Defined in: [packages/core/src/utils.ts:598](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L598)

Converts any JavaScript value to a stable string representation. Handles
complex data structures and edge cases that JSON.stringify cannot manage.

Provides special handling for:

- Circular references
- Maps and Sets
- Symbols
- Functions
- Custom class instances
- Regular objects (with sorted keys for stability)

#### Parameters

##### thing

`any`

The value to convert to a string

##### immutable

`boolean` = `true`

Whether to memoize results for complex objects (defaults
  to true)

#### Returns

`string`

A string representation of the value

#### Example

```ts
// Handles circular references
  const obj = { name: 'test' }
  obj.self = obj
  const key = toStringKey(obj) // No infinite recursion!

  // Stable representation of objects (key order doesn't matter)
  toStringKey({ a: 1, b: 2 }) === toStringKey({ b: 2, a: 1 }) // true
```

***

### withAbort()

> **withAbort**(`strategy`): [`AssignerExt`](#assignerext)\<[`AbortExt`](#abortext)\>

Defined in: [packages/core/src/mixins/withAbort.ts:14](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/mixins/withAbort.ts#L14)

#### Parameters

##### strategy

`"last-in-win"` | `"first-in-win"`

#### Returns

[`AssignerExt`](#assignerext)\<[`AbortExt`](#abortext)\>

***

### withAbortMethods()

> **withAbortMethods**(): (`target`) => [`Atom`](#atom)\<`any`, \[`null` \| `string` \| [`AbortError`](#aborterror)\]\> & `object` & `object`

Defined in: [packages/core/src/methods/abortVar.ts:202](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/abortVar.ts#L202)

#### Returns

> (`target`): [`Atom`](#atom)\<`any`, \[`null` \| `string` \| [`AbortError`](#aborterror)\]\> & `object` & `object`

##### Parameters

###### target

[`Atom`](#atom)\<`null` \| [`AbortError`](#aborterror), \[\] \| \[`any`\]\>

##### Returns

[`Atom`](#atom)\<`any`, \[`null` \| `string` \| [`AbortError`](#aborterror)\]\> & `object` & `object`

***

### withAsyncData()

Implementation of the withAsyncData extension.

#### Example

```ts
// Basic usage with a computed for data fetching:
  const userId = atom('1', 'userId')

  // Create a computed that fetches data when userId changes
  const userData = computed(async () => {
    const id = userId()
    const response = await wrap(fetch(`/api/users/${id}`))
    if (!response.ok) throw new Error('Failed to fetch user')
    return await wrap(response.json())
  }, 'userData').extend(withAsyncData())

  // Access the fetched data and loading states:
  userData.data() // → the fetched user data
  userData.error() // → error if fetch failed
  userData.ready() // → false while loading, true when complete
```

#### Param

Configuration options for the async data handling

#### Call Signature

> **withAsyncData**\<`Err`, `EmptyErr`\>(`options?`): \<`T`\>(`target`) => `T` *extends* [`AtomLike`](#atomlike)\<`any`, `Params`, `Promise`\<`Payload`\>\> ? [`AsyncDataExt`](#asyncdataext)\<`Params`, `Payload`, `undefined` \| `Payload`, `Err` \| `EmptyErr`\> : `never`

Defined in: [packages/core/src/async/withAsyncData.ts:78](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/async/withAsyncData.ts#L78)

Extension that adds async data management to atoms or actions that return
promises.

Creates a properly typed data atom that stores the results of successful
async operations. Includes all features of [withAsync](#withasync) and
[withAbort](#withabort) for complete async handling.

##### Type Parameters

###### Err

`Err` = `Error`

The type of errors after parsing

###### EmptyErr

`EmptyErr` = `undefined`

The type of the empty error state

##### Parameters

###### options?

[`AsyncOptions`](#asyncoptions)\<`Err`, `EmptyErr`\>

Configuration options for async data handling

##### Returns

An extension function that can be applied to atoms or actions

> \<`T`\>(`target`): `T` *extends* [`AtomLike`](#atomlike)\<`any`, `Params`, `Promise`\<`Payload`\>\> ? [`AsyncDataExt`](#asyncdataext)\<`Params`, `Payload`, `undefined` \| `Payload`, `Err` \| `EmptyErr`\> : `never`

###### Type Parameters

###### T

`T` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\>

###### Parameters

###### target

`T`

###### Returns

`T` *extends* [`AtomLike`](#atomlike)\<`any`, `Params`, `Promise`\<`Payload`\>\> ? [`AsyncDataExt`](#asyncdataext)\<`Params`, `Payload`, `undefined` \| `Payload`, `Err` \| `EmptyErr`\> : `never`

##### Example

```ts
// Basic usage with a computed for data fetching:
  const userId = atom('1', 'userId')

  // Create a computed that fetches data when userId changes
  const userData = computed(async () => {
    const id = userId()
    const response = await wrap(fetch(`/api/users/${id}`))
    if (!response.ok) throw new Error('Failed to fetch user')
    return await wrap(response.json())
  }, 'userData').extend(withAsyncData())

  // Access the fetched data and loading states:
  userData.data() // → the fetched user data
  userData.error() // → error if fetch failed
  userData.ready() // → false while loading, true when complete
```

##### Param

Configuration options for the async data handling

#### Call Signature

> **withAsyncData**\<`T`, `Err`, `EmptyErr`\>(`options`): (`target`) => `T` *extends* [`AtomLike`](#atomlike)\<`any`, `Params`, `Promise`\<`Payload`\>\> ? [`AsyncDataExt`](#asyncdataext)\<`Params`, `Payload`, `Payload`, `Err` \| `EmptyErr`\> : `never`

Defined in: [packages/core/src/async/withAsyncData.ts:101](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/async/withAsyncData.ts#L101)

Extension that adds async data management to atoms or actions that return
promises.

This overload uses the payload type as the state type with a specified
initial value. Useful when you know the shape of the data that will be
fetched.

##### Type Parameters

###### T

`T` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\>

The atom or action type

###### Err

`Err` = `Error`

The type of errors after parsing

###### EmptyErr

`EmptyErr` = `undefined`

The type of the empty error state

##### Parameters

###### options

[`AsyncOptions`](#asyncoptions)\<`Err`, `EmptyErr`\> & `T` *extends* [`AtomLike`](#atomlike)\<`any`, `Params`, `Promise`\<`Payload`\>\> ? `object` : `never`

Configuration options including initial state and optional
  payload mapper

##### Returns

An extension function that can be applied to atoms or actions

> (`target`): `T` *extends* [`AtomLike`](#atomlike)\<`any`, `Params`, `Promise`\<`Payload`\>\> ? [`AsyncDataExt`](#asyncdataext)\<`Params`, `Payload`, `Payload`, `Err` \| `EmptyErr`\> : `never`

###### Parameters

###### target

`T`

###### Returns

`T` *extends* [`AtomLike`](#atomlike)\<`any`, `Params`, `Promise`\<`Payload`\>\> ? [`AsyncDataExt`](#asyncdataext)\<`Params`, `Payload`, `Payload`, `Err` \| `EmptyErr`\> : `never`

##### Example

```ts
// Basic usage with a computed for data fetching:
  const userId = atom('1', 'userId')

  // Create a computed that fetches data when userId changes
  const userData = computed(async () => {
    const id = userId()
    const response = await wrap(fetch(`/api/users/${id}`))
    if (!response.ok) throw new Error('Failed to fetch user')
    return await wrap(response.json())
  }, 'userData').extend(withAsyncData())

  // Access the fetched data and loading states:
  userData.data() // → the fetched user data
  userData.error() // → error if fetch failed
  userData.ready() // → false while loading, true when complete
```

##### Param

Configuration options for the async data handling

#### Call Signature

> **withAsyncData**\<`State`, `T`, `Err`, `EmptyErr`\>(`options`): (`target`) => `T` *extends* [`AtomLike`](#atomlike)\<`any`, `Params`, `Promise`\<`Payload`\>\> ? [`AsyncDataExt`](#asyncdataext)\<`Params`, `Payload`, `State` \| `Payload`, `Err` \| `EmptyErr`\> : `never`

Defined in: [packages/core/src/async/withAsyncData.ts:138](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/async/withAsyncData.ts#L138)

Extension that adds async data management to atoms or actions that return
promises.

This overload allows specifying a completely custom state type with an
initial value. The resolved payload will be merged with the state without
custom mapping.

##### Type Parameters

###### State

`State`

The custom state type

###### T

`T` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\>

The atom or action type

###### Err

`Err` = `Error`

The type of errors after parsing

###### EmptyErr

`EmptyErr` = `undefined`

The type of the empty error state

##### Parameters

###### options

[`AsyncOptions`](#asyncoptions)\<`Err`, `EmptyErr`\> & `object`

Configuration options with custom initial state

##### Returns

An extension function that can be applied to atoms or actions

> (`target`): `T` *extends* [`AtomLike`](#atomlike)\<`any`, `Params`, `Promise`\<`Payload`\>\> ? [`AsyncDataExt`](#asyncdataext)\<`Params`, `Payload`, `State` \| `Payload`, `Err` \| `EmptyErr`\> : `never`

###### Parameters

###### target

`T`

###### Returns

`T` *extends* [`AtomLike`](#atomlike)\<`any`, `Params`, `Promise`\<`Payload`\>\> ? [`AsyncDataExt`](#asyncdataext)\<`Params`, `Payload`, `State` \| `Payload`, `Err` \| `EmptyErr`\> : `never`

##### Example

```ts
// Basic usage with a computed for data fetching:
  const userId = atom('1', 'userId')

  // Create a computed that fetches data when userId changes
  const userData = computed(async () => {
    const id = userId()
    const response = await wrap(fetch(`/api/users/${id}`))
    if (!response.ok) throw new Error('Failed to fetch user')
    return await wrap(response.json())
  }, 'userData').extend(withAsyncData())

  // Access the fetched data and loading states:
  userData.data() // → the fetched user data
  userData.error() // → error if fetch failed
  userData.ready() // → false while loading, true when complete
```

##### Param

Configuration options for the async data handling

#### Call Signature

> **withAsyncData**\<`State`, `T`, `Err`, `EmptyErr`\>(`options`): (`target`) => `T` *extends* [`AtomLike`](#atomlike)\<`any`, `Params`, `Promise`\<`Payload`\>\> ? [`AsyncDataExt`](#asyncdataext)\<`Params`, `Payload`, `State`, `Err` \| `EmptyErr`\> : `never`

Defined in: [packages/core/src/async/withAsyncData.ts:170](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/async/withAsyncData.ts#L170)

Extension that adds async data management to atoms or actions that return
promises.

This overload provides full control with a custom state type and payload
mapping function. Allows complete transformation of the payload into the
desired state format.

##### Type Parameters

###### State

`State`

The custom state type

###### T

`T` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\>

The atom or action type

###### Err

`Err` = `Error`

The type of errors after parsing

###### EmptyErr

`EmptyErr` = `undefined`

The type of the empty error state

##### Parameters

###### options

[`AsyncOptions`](#asyncoptions)\<`Err`, `EmptyErr`\> & `object`

Configuration options with custom initial state and payload
  mapper

##### Returns

An extension function that can be applied to atoms or actions

> (`target`): `T` *extends* [`AtomLike`](#atomlike)\<`any`, `Params`, `Promise`\<`Payload`\>\> ? [`AsyncDataExt`](#asyncdataext)\<`Params`, `Payload`, `State`, `Err` \| `EmptyErr`\> : `never`

###### Parameters

###### target

`T`

###### Returns

`T` *extends* [`AtomLike`](#atomlike)\<`any`, `Params`, `Promise`\<`Payload`\>\> ? [`AsyncDataExt`](#asyncdataext)\<`Params`, `Payload`, `State`, `Err` \| `EmptyErr`\> : `never`

##### Example

```ts
// Basic usage with a computed for data fetching:
  const userId = atom('1', 'userId')

  // Create a computed that fetches data when userId changes
  const userData = computed(async () => {
    const id = userId()
    const response = await wrap(fetch(`/api/users/${id}`))
    if (!response.ok) throw new Error('Failed to fetch user')
    return await wrap(response.json())
  }, 'userData').extend(withAsyncData())

  // Access the fetched data and loading states:
  userData.data() // → the fetched user data
  userData.error() // → error if fetch failed
  userData.ready() // → false while loading, true when complete
```

##### Param

Configuration options for the async data handling

***

### withCache()

> **withCache**\<`T`\>(`options`): (`target`) => `T` *extends* [`AtomLike`](#atomlike)\<`any`, `Params`, `Promise`\<`Payload`\>\> ? `T`\<`T`\> & [`CacheExt`](#cacheext)\<`Params`, `Payload`\> : `never`

Defined in: packages/core/src/async/withCache.ts:110

#### Type Parameters

##### T

`T` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> & `Partial`\<[`AsyncExt`](#asyncext)\<`any`[], `any`, `any`\>\> & `Partial`\<[`AsyncDataExt`](#asyncdataext)\<`any`[], `any`, `any`, `any`\>\>

#### Parameters

##### options

[`WithCacheOptions`](#withcacheoptions)\<`T` *extends* [`AtomLike`](#atomlike)\<`any`, `P`, `any`\> ? `P` : `never`\> = `{}`

#### Returns

> (`target`): `T` *extends* [`AtomLike`](#atomlike)\<`any`, `Params`, `Promise`\<`Payload`\>\> ? `T`\<`T`\> & [`CacheExt`](#cacheext)\<`Params`, `Payload`\> : `never`

##### Parameters

###### target

`T`

##### Returns

`T` *extends* [`AtomLike`](#atomlike)\<`any`, `Params`, `Promise`\<`Payload`\>\> ? `T`\<`T`\> & [`CacheExt`](#cacheext)\<`Params`, `Payload`\> : `never`

***

### withCallHook()

> **withCallHook**\<`Target`\>(`cb`): [`Ext`](#ext)\<`Target`\>

Defined in: [packages/core/src/mixins/withChangeHook.ts:47](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/mixins/withChangeHook.ts#L47)

#### Type Parameters

##### Target

`Target` *extends* [`Action`](#action)\<`any`[], `any`\>

#### Parameters

##### cb

(`payload`, `params`) => `void`

#### Returns

[`Ext`](#ext)\<`Target`\>

***

### withChangeHook()

> **withChangeHook**\<`Target`\>(`cb`): [`Ext`](#ext)\<`Target`\>

Defined in: [packages/core/src/mixins/withChangeHook.ts:5](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/mixins/withChangeHook.ts#L5)

#### Type Parameters

##### Target

`Target` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\>

#### Parameters

##### cb

(`state`, `prevState`) => `void`

#### Returns

[`Ext`](#ext)\<`Target`\>

***

### withComputed()

> **withComputed**\<`Target`\>(`computed`, `tail?`): [`Ext`](#ext)\<`Target`\>

Defined in: [packages/core/src/mixins/withComputed.ts:24](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/mixins/withComputed.ts#L24)

A middleware extension that enhances an atom with computed capabilities.

#### Type Parameters

##### Target

`Target` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\>

The target atom or action type to be extended with
  computed functionality.

#### Parameters

##### computed

(`state`) => [`AtomState`](#atomstate-1)\<`Target`\>

A function that computes the new state based on
  the current state.

##### tail?

`boolean` = `true`

Determines the order of the passed computed
  calling. ATTENTION: use `false` only for computed with fixed size of
  dependencies. Default is `true`

#### Returns

[`Ext`](#ext)\<`Target`\>

The extended atom or action with computed
  functionality.

***

### withConnectHook()

> **withConnectHook**\<`Target`\>(`cb`): [`Ext`](#ext)\<`Target`\>

Defined in: [packages/core/src/mixins/withConnectHook.ts:10](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/mixins/withConnectHook.ts#L10)

#### Type Parameters

##### Target

`Target` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\>

#### Parameters

##### cb

(`target`) => `void` \| [`Unsubscribe`](#unsubscribe-2) \| `Promise`\<`void` \| [`Unsubscribe`](#unsubscribe-2)\>

#### Returns

[`Ext`](#ext)\<`Target`\>

***

### withDisconnectHook()

> **withDisconnectHook**\<`Target`\>(`cb`): [`Ext`](#ext)\<`Target`\>

Defined in: [packages/core/src/mixins/withConnectHook.ts:35](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/mixins/withConnectHook.ts#L35)

#### Type Parameters

##### Target

`Target` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\>

#### Parameters

##### cb

(`target`) => `void`

#### Returns

[`Ext`](#ext)\<`Target`\>

***

### withField()

> **withField**\<`T`, `Value`\>(`options`): (`anAtom`) => `T` & [`FieldAtom`](#fieldatom)\<[`AtomState`](#atomstate-1)\<`T`\>, `Value`\>

Defined in: [packages/core/src/form/reatomField.ts:561](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/form/reatomField.ts#L561)

#### Type Parameters

##### T

`T` *extends* [`Atom`](#atom)\<`any`, \[`any`\]\>

##### Value

`Value` = [`AtomState`](#atomstate-1)\<`T`\>

#### Parameters

##### options

`Omit`\<[`FieldOptions`](#fieldoptions)\<[`AtomState`](#atomstate-1)\<`T`\>, `Value`\>, `"name"`\> = `{}`

#### Returns

> (`anAtom`): `T` & [`FieldAtom`](#fieldatom)\<[`AtomState`](#atomstate-1)\<`T`\>, `Value`\>

##### Parameters

###### anAtom

`T`

##### Returns

`T` & [`FieldAtom`](#fieldatom)\<[`AtomState`](#atomstate-1)\<`T`\>, `Value`\>

***

### withInit()

> **withInit**\<`Target`\>(`init`): [`Ext`](#ext)\<`Target`\>

Defined in: [packages/core/src/mixins/withInit.ts:57](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/mixins/withInit.ts#L57)

Define dynamically computed initial value for an atom.

Typically, you can use just an init callback in `atom` first argument:
`atom(() => new Date())`. But if you need to add initial callback after the
atom creation, so there this extensions is useful.

#### Type Parameters

##### Target

`Target` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\>

The atom type that extends AtomLike

#### Parameters

##### init

The initial value or a function that returns the initial value based on
  current state

[`AtomState`](#atomstate-1)\<`Target`\> | (`state`) => [`AtomState`](#atomstate-1)\<`Target`\>

#### Returns

[`Ext`](#ext)\<`Target`\>

An extension that can be applied to an atom

#### Examples

```ts
const something = reatomSomething().extend(
    withInit((initState) => ({ ...initState, ...additions })),
  )
```

```ts
const myData = atom(null, 'myData')
  if (meta.env.TEST) {
    myData.extend(withInit(mockData))
  }
```

***

### withInitHook()

> **withInitHook**\<`Target`\>(`hook`): [`Ext`](#ext)\<`Target`\>

Defined in: [packages/core/src/mixins/withInit.ts:95](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/mixins/withInit.ts#L95)

Extension that runs the passed hook when the atom is initialized.

#### Type Parameters

##### Target

`Target` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\>

The atom type that extends AtomLike

#### Parameters

##### hook

(`initState`) => `any`

A function to be called
  with the initial state during initialization

#### Returns

[`Ext`](#ext)\<`Target`\>

An extension that can be applied to an atom

#### Example

```ts
const userAtom = atom({ id: 1, name: 'John' }).extend(
    withInitHook((initState) => {
      // Perform any setup logic here
      analytics.track('user_loaded', initState)
    }),
  )
```

***

### withMemo()

> **withMemo**\<`Target`\>(`isEqual`): [`Ext`](#ext)\<`Target`\>

Defined in: [packages/core/src/mixins/withMemo.ts:6](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/mixins/withMemo.ts#L6)

#### Type Parameters

##### Target

`Target` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\>

#### Parameters

##### isEqual

(`prevState`, `nextState`) => `boolean`

#### Returns

[`Ext`](#ext)\<`Target`\>

***

### withObservable()

> **withObservable**\<`Target`\>(`producer`, `init?`): [`Ext`](#ext)\<`Target`\>

Defined in: [packages/core/src/methods/reatomObservable.ts:73](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/methods/reatomObservable.ts#L73)

Extends an existing atom to synchronize with an observable-like data source.

This extension bridges external observable sources (like RxJS observables,
event emitters, or custom observable implementations) with Reatom's reactive
system. The extended atom will automatically subscribe to the observable when
it gains subscribers and unsubscribe when it loses all subscribers.

#### Type Parameters

##### Target

`Target` *extends* [`Atom`](#atom)\<`any`, \[`any`\]\>

The type of the atom being extended

#### Parameters

##### producer

`Producer`\<[`AtomState`](#atomstate-1)\<`Target`\>\>

Either a function that accepts a setter callback and
  returns an unsubscribe function, or an object with a subscribe method (like
  RxJS observables)

##### init?

() => [`AtomState`](#atomstate-1)\<`Target`\>

Optional initialization function that returns the initial
  value. This will be called when the atom is first connected

#### Returns

[`Ext`](#ext)\<`Target`\>

An extension function that adds observable synchronization to an
  atom

#### Examples

```ts
// Extending an existing atom with RxJS Observable
  import { interval } from 'rxjs'
  const counterAtom = atom(0)
  const timerAtom = counterAtom.extend(withObservable(interval(1000)))
```

```ts
// With custom observable function
  const stateAtom = atom({ timestamp: 0 })
  const liveAtom = stateAtom.extend(
    withObservable((setter) => {
      const id = setInterval(() => setter({ timestamp: Date.now() }), 1000)
      return () => clearInterval(id)
    }),
  )
```

```ts
// With MobX observable, providing initial value
  import { autorun, observable } from 'mobx'
  const mobxStore = observable({ count: 0 })
  const syncedAtom = atom(0).extend(
    withObservable(
      (setter) => autorun(() => setter(mobxStore.count)),
    ),
  )
```

```ts
// With DOM events
  const clickCountAtom = atom(0)
  const trackedAtom = clickCountAtom.extend(
    withObservable((setter) => {
      let count = 0
      const handler = () => setter(++count)
      document.addEventListener('click', handler)
      return () => document.removeEventListener('click', handler)
    }),
  )
```

***

### withResolvers()

> **withResolvers**\<`T`\>(): `object`

Defined in: [packages/core/src/utils.ts:813](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/utils.ts#L813)

Creates a Promise and returns it along with its resolve and reject functions.
This utility is similar to the upcoming `Promise.withResolvers()` static
method. It allows for manual control over a Promise's settlement from outside
its constructor.

#### Type Parameters

##### T

`T`

The type of the value the promise will resolve with.

#### Returns

`object`

An object containing the `promise`, and its `resolve` and `reject`
  functions.

##### promise

> **promise**: `Promise`\<`T`\>

##### reject()

> **reject**: (`reason?`) => `void`

###### Parameters

###### reason?

`any`

###### Returns

`void`

##### resolve()

> **resolve**: (`value`) => `void`

###### Parameters

###### value

`T`

###### Returns

`void`

#### Example

```ts
const { promise, resolve, reject } = withResolvers<string>()

  promise
    .then((value) => console.log('Resolved:', value))
    .catch((error) => console.error('Rejected:', error))

  // Sometime later, or in a different part of the code:
  if (Math.random() > 0.5) {
    resolve('Success!')
  } else {
    reject(new Error('Failed!'))
  }
```

***

### withSearchParams()

#### Call Signature

> **withSearchParams**\<`T`\>(`key`, `parse?`): \<`Target`\>(`target`) => `Target`

Defined in: [packages/core/src/web/url.ts:309](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/url.ts#L309)

Create an atom that synchronizes with a URL search parameter.

##### Type Parameters

###### T

`T` = `string`

##### Parameters

###### key

`string`

The parameter name to synchronize with

###### parse?

(`value?`) => `T`

Function to parse string value to desired type

##### Returns

> \<`Target`\>(`target`): `Target`

###### Type Parameters

###### Target

`Target` *extends* [`Atom`](#atom)\<`T`, \[`T`\]\>

###### Parameters

###### target

`Target`

###### Returns

`Target`

#### Call Signature

> **withSearchParams**\<`T`\>(`key`, `options`): \<`Target`\>(`target`) => `Target`

Defined in: [packages/core/src/web/url.ts:329](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/web/url.ts#L329)

Create an atom that synchronizes with a URL search parameter.

##### Type Parameters

###### T

`T` = `string`

##### Parameters

###### key

`string`

Parameter name

###### options

Configuration options for the lens

###### parse?

(`value?`) => `T`

Optional function to parse the parameter string value
  into the desired type

###### path?

`string`

Optional path to limit the scope of synchronization to
  specific URL paths

###### replace?

`boolean`

Optional boolean to specify if history entries should
  be replaced (default: false)

###### serialize?

(`value`) => `undefined` \| `string`

Optional function to serialize the value back into a
  string

##### Returns

> \<`Target`\>(`target`): `Target`

###### Type Parameters

###### Target

`Target` *extends* [`Atom`](#atom)\<`T`, \[`T`\]\>

###### Parameters

###### target

`Target`

###### Returns

`Target`

***

### withSuspense()

> **withSuspense**\<`Target`\>(`__namedParameters`): [`Ext`](#ext)\<`Target`, [`SuspenseExt`](#suspenseext)\<[`AtomState`](#atomstate-1)\<`Target`\>\>\>

Defined in: [packages/core/src/mixins/withSuspense.ts:48](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/mixins/withSuspense.ts#L48)

#### Type Parameters

##### Target

`Target` *extends* [`AtomLike`](#atomlike)\<`any`, `any`[], `any`\> & `Partial`\<[`SuspenseExt`](#suspenseext)\<[`AtomState`](#atomstate-1)\<`Target`\>\>\>

#### Parameters

##### \_\_namedParameters

###### preserve?

`boolean` = `false`

#### Returns

[`Ext`](#ext)\<`Target`, [`SuspenseExt`](#suspenseext)\<[`AtomState`](#atomstate-1)\<`Target`\>\>\>

***

### withSuspenseRetry()

> **withSuspenseRetry**\<`T`\>(): [`Ext`](#ext)\<`T`\>

Defined in: [packages/core/src/mixins/withSuspenseRetry.ts:28](https://github.com/reatom/reatom/blob/ab763471e90118096aeb195bc8e0d1a746c34329/packages/core/src/mixins/withSuspenseRetry.ts#L28)

Creates a mixin that retries an async action when it fails coz of a
suspension

This mixin wraps an async action to automatically retry it when a Promise is
thrown, which indicates a suspension. It will keep retrying until the action
completes successfully or throws a non-Promise error.

⚠️ Be careful with non-idempotent operations inside the action body, as they
may be executed multiple times during retries. It's recommended to carefully
plan the execution logic to handle potential retries safely.

#### Type Parameters

##### T

`T` *extends* [`Action`](#action)\<`unknown`[], `Promise`\<`unknown`\>\>

#### Returns

[`Ext`](#ext)\<`T`\>

The same passed action

#### Example

```ts
const fetchUser = action(async () => {
    const id = user().id // `user` is a suspended atom
    const response = await fetch(`/api/users/${id}`)
    return response.json()
  }).extend(withSuspenseRetry())
```
