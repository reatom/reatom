# Classes


<a name="classesreatomerrormd"></a>

## Class: ReatomError

Defined in: [packages/core/src/core/atom.ts:350](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L350)

### Extends

- `Error`

### Constructors

#### Constructor

> **new ReatomError**(`message?`): `ReatomError`

Defined in: node\_modules/typescript/lib/lib.es5.d.ts:1082

##### Parameters

###### message?

`string`

##### Returns

`ReatomError`

##### Inherited from

`Error.constructor`

#### Constructor

> **new ReatomError**(`message?`, `options?`): `ReatomError`

Defined in: node\_modules/typescript/lib/lib.es5.d.ts:1082

##### Parameters

###### message?

`string`

###### options?

`ErrorOptions`

##### Returns

`ReatomError`

##### Inherited from

`Error.constructor`

# Functions


<a name="functionsactionsmd"></a>

## Function: actions()

> **actions**\<`Target`, `Methods`\>(`this`, `options`): [`ActionsExt`](#type-aliasesactionsextmd)\<`Methods`\>

Defined in: [packages/core/src/core/actions.ts:73](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/actions.ts#L73)

Binds actions to an atom or action as methods.

This function adds methods to an atom or action by converting them to Reatom actions.
Each method is converted to an action with the same name and bound to the target.
The name of each action will be prefixed with the target's name for better debugging.

### Type Parameters

#### Target

`Target` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\>

The atom or action being extended

#### Methods

`Methods` *extends* [`Rec`](#type-aliasesrecmd)\<[`Fn`](#interfacesfnmd)\>

Record of functions to convert to actions

### Parameters

#### this

`Target`

#### options

Either a record of methods or a function that creates methods given the target

`Methods` | (`target`) => `Methods`

### Returns

[`ActionsExt`](#type-aliasesactionsextmd)\<`Methods`\>

The target with the methods added as actions

### Throws

If a method name collides with an existing property on the target

### Example

```ts
const counter = atom(0, 'counter').actions({
  increment: (amount = 1) => counter((prev) => prev + amount),
  decrement: (amount = 1) => counter((prev) => prev - amount),
  reset: () => counter(0),
})

counter.increment(5)  // Can now call these methods directly
counter.reset()
```


<a name="functionsaddcallhookmd"></a>

## Function: addCallHook()

> **addCallHook**\<`Target`\>(`target`, `cb`): [`Unsubscribe`](#interfacesunsubscribemd)

Defined in: [packages/core/src/mixins/withChangeHook.ts:89](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/mixins/withChangeHook.ts#L89)

### Type Parameters

#### Target

`Target` *extends* [`Action`](#interfacesactionmd)\<`any`[], `any`\>

### Parameters

#### target

`Target`

#### cb

(`payload`, `params`) => `void`

### Returns

[`Unsubscribe`](#interfacesunsubscribemd)


<a name="functionsaddchangehookmd"></a>

## Function: addChangeHook()

> **addChangeHook**\<`T`\>(`target`, `cb`): [`Unsubscribe`](#interfacesunsubscribemd)

Defined in: [packages/core/src/mixins/withChangeHook.ts:38](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/mixins/withChangeHook.ts#L38)

### Type Parameters

#### T

`T` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\>

### Parameters

#### target

`T`

#### cb

(`state`, `prevState?`) => `void`

### Returns

[`Unsubscribe`](#interfacesunsubscribemd)


<a name="functionsassertmd"></a>

## Function: assert()

> **assert**(`value`, `message`, `ErrorConstructor`): `asserts value`

Defined in: [packages/core/src/utils.ts:185](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/utils.ts#L185)

Asserts that a value is truthy, throwing an error if it's falsy.
This is a TypeScript type assertion function that helps with type narrowing.

### Parameters

#### value

`unknown`

The value to check

#### message

`string`

The error message to use if the assertion fails

#### ErrorConstructor

[`Newable`](#interfacesnewablemd)\<`Error`\> = `Error`

Optional custom error constructor to use (defaults to Error)

### Returns

`asserts value`

### Throws

Throws an error with the provided message if value is falsy


<a name="functionsassertfnmd"></a>

## Function: assertFn()

> **assertFn**(`fn`): `asserts fn is Fn`

Defined in: [packages/core/src/core/atom.ts:506](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L506)

### Parameters

#### fn

`unknown`

### Returns

`asserts fn is Fn`


<a name="functionsbindmd"></a>

## Function: bind()

> **bind**\<`Params`, `Payload`\>(`target`, `frame`): (...`params`) => `Payload`

Defined in: [packages/core/src/core/atom.ts:1069](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L1069)

Light version of `wrap` that binds a function to the current reactive context.

Unlike the full `wrap` function, `bind` does not follow abort context, making it
more lightweight but less safe for certain async operations. Use this when you
need to preserve context but don't need the abort handling capabilities of `wrap`.

### Type Parameters

#### Params

`Params` *extends* `any`[]

The parameter types of the target function

#### Payload

`Payload`

The return type of the target function

### Parameters

#### target

(...`params`) => `Payload`

The function to bind to the reactive context

#### frame

[`Frame`](#interfacesframemd)\<`any`, `any`[], `any`\> = `...`

The frame to bind to (defaults to the current top frame)

### Returns

A function that will run in the specified context when called

> (...`params`): `Payload`

#### Parameters

##### params

...`Params`

#### Returns

`Payload`


<a name="functionsclearstackmd"></a>

## Function: clearStack()

> **clearStack**(): `void`

Defined in: [packages/core/src/core/atom.ts:1036](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L1036)

Clears the current Reatom context stack.

This is primarily used to force explicit context preservation via `wrap()`.
By clearing the stack, any atom operations outside of a properly wrapped
function will throw "missing async stack" errors, ensuring proper context handling.

### Returns

`void`


<a name="functionscomputedmd"></a>

## Function: computed()

> **computed**\<`State`\>(`computed`, `name?`): [`Computed`](#interfacescomputedmd)\<`State`\>

Defined in: [packages/core/src/core/atom.ts:918](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L918)

Creates a derived state container that lazily recalculates only when read.

Computed atoms automatically track their dependencies (other atoms or computed values
that are called during computation) and only recalculate when those dependencies change.
The computation is lazy - it only runs when the computed value is read AND subscribed to.

### Type Parameters

#### State

`State`

The type of state derived by the computation

### Parameters

#### computed

A function that computes the derived state

() => `State` | (`state?`) => `State`

#### name?

`string`

Optional name for debugging purposes

### Returns

[`Computed`](#interfacescomputedmd)\<`State`\>

A computed atom instance

### Example

```ts
const counter = atom(5, 'counter')
const doubled = computed(() => counter() * 2, 'doubledCounter')

// Reading triggers computation only if subscribed
const value = doubled() // -> 10
```


<a name="functionscomputedparamsmd"></a>

## Function: computedParams()

> **computedParams**(`next`): `any`

Defined in: [packages/core/src/core/atom.ts:890](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L890)

### Parameters

#### next

[`Fn`](#interfacesfnmd)

### Returns

`any`


<a name="functionsconcattreemd"></a>

## Function: concatTree()

> **concatTree**(`acc`, `steps`, `node`): `string`

Defined in: [packages/core/src/connectLogger.ts:84](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/connectLogger.ts#L84)

Concatenates a tree structure representation into a string format.

This function recursively builds a formatted ASCII/Unicode tree representation
of a Node structure with proper branch indentation and connections.

### Parameters

#### acc

`string`

The accumulator string that holds the current tree representation

#### steps

`string`

Indentation padding string for proper alignment

#### node

`Node`

The current node to process and display in the tree

### Returns

`string`

A formatted string representation of the tree structure

### Example

```ts
// For a node with children, might produce something like:
// myNode ┬─ child1 ─ grandChild
//        └─ child2
```


<a name="functionsconnectloggermd"></a>

## Function: connectLogger()

> **connectLogger**(): `void`

Defined in: [packages/core/src/connectLogger.ts:148](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/connectLogger.ts#L148)

Sets up and connects a logger to the Reatom system for debugging and tracing.

This function enhances all non-private atoms and actions with logging capabilities.
When an atom's value changes or an action is called, it logs the event with relevant
information to the console including:
- Previous and current state for atoms
- Parameters and return values for actions
- Complete dependency stack traces
- Error information when exceptions occur

The logger adapts to the environment, using different formatting for browser and Node.js.
Private atoms (those with names starting with '_' or containing '._') are not logged.

### Returns

`void`

### Example

```ts
// Connect the logger at application startup
import { connectLogger } from '@reatom/core'

connectLogger()
```


<a name="functionscopymd"></a>

## Function: \_copy()

> **\_copy**(`contextFrame`, `frame`): [`Frame`](#interfacesframemd)\<`any`, `any`[], `any`\>

Defined in: [packages/core/src/core/atom.ts:377](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L377)

### Parameters

#### contextFrame

[`ContextFrame`](#interfacescontextframemd)

#### frame

[`Frame`](#interfacesframemd)

### Returns

[`Frame`](#interfacesframemd)\<`any`, `any`[], `any`\>


<a name="functionseffectmd"></a>

## Function: effect()

> **effect**\<`T`\>(`cb`, `name?`): [`Effect`](#interfaceseffectmd)\<`T`\>

Defined in: [packages/core/src/methods/effect.ts:58](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/methods/effect.ts#L58)

Creates a reactive side effect that automatically tracks dependencies and cleans itself up.

`effect` is similar to `computed` but designed for running side effects.
It automatically subscribes to any atoms read within the callback (`cb`).
When the effect's reactive context is aborted (e.g., component unmount in `reatomFactoryComponent`,
cancellation in `withAbort` / `withAsyncData`), the effect's execution is stopped,
and any ongoing async operations within it (like `await wrap(sleep(...))`) are cancelled.

### Type Parameters

#### T

`T`

### Parameters

#### cb

() => `T`

The function to run as a side effect. It can be async.
          Any atoms read inside `cb` will become dependencies.

#### name?

`string`

Optional name for debugging purposes. Auto-generated if not provided.

### Returns

[`Effect`](#interfaceseffectmd)\<`T`\>

A function to manually unsubscribe and clean up the effect.
         Calling this function is usually not necessary when `effect` is used
         within managed contexts like `reatomFactoryComponent` or `withConnectHook`,
         as cleanup happens automatically.

### Example

```ts
import { atom, effect, wrap, sleep, isAbort } from '@reatom/core'

const isActive = atom(true, 'isActive')
const data = atom(0, 'data')

// This effect polls data every 5 seconds while isActive is true
const polling = effect(async () => {
  if (!isActive()) return // Depends on isActive

  console.log('Polling started...')
  try {
    while (true) {
      const fetchedData = await wrap(fetch('/api/poll'))
      const jsonData = await wrap(fetchedData.json())
      data(jsonData.value)
      await wrap(sleep(5000)) // Abortable sleep
    }
  } catch (error) {
    if (isAbort(error)) {
      console.log('Polling aborted cleanly.')
    } else {
      console.error('Polling error:', error)
    }
  }
}, 'pollingEffect')

// To manually stop:
// polling()
```


<a name="functionsenqueuemd"></a>

## Function: \_enqueue()

> **\_enqueue**(`fn`, `queue`): `void`

Defined in: [packages/core/src/core/queues.ts:15](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/queues.ts#L15)

Schedules a function to be executed in a specific queue of the current context.

This is the core mechanism for scheduling reactive updates in Reatom. When an atom's
state changes, tasks are queued to be executed afterwards in the appropriate order.
If this is the first task being scheduled, a microtask is created to process the
queues asynchronously.

### Parameters

#### fn

[`Fn`](#interfacesfnmd)

The function to schedule for execution

#### queue

The queue to add the function to ('hook', 'compute', 'cleanup', or 'effect')

`"hook"` | `"compute"` | `"cleanup"` | `"effect"`

### Returns

`void`


<a name="functionsexperimental_fieldarraymd"></a>

## Function: experimental\_fieldArray()

### Call Signature

> **experimental\_fieldArray**\<`Param`\>(`initState`): `FormFieldArray`\<`Param`, `Param`\>

Defined in: [packages/core/src/form/src/reatomForm.ts:270](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L270)

#### Type Parameters

##### Param

`Param` *extends* `FormInitStateElement`

#### Parameters

##### initState

`Param`[]

#### Returns

`FormFieldArray`\<`Param`, `Param`\>

### Call Signature

> **experimental\_fieldArray**\<`Param`, `Node`\>(`create`): `FormFieldArray`\<`Param`, `Node`\>

Defined in: [packages/core/src/form/src/reatomForm.ts:274](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L274)

#### Type Parameters

##### Param

`Param`

##### Node

`Node` *extends* `FormInitStateElement` = `FormInitStateElement`

#### Parameters

##### create

(`params`, `name`) => `Node`

#### Returns

`FormFieldArray`\<`Param`, `Node`\>

### Call Signature

> **experimental\_fieldArray**\<`Param`, `Node`\>(`options`): `FormFieldArray`\<`Param`, `Node`\>

Defined in: [packages/core/src/form/src/reatomForm.ts:279](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L279)

#### Type Parameters

##### Param

`Param`

##### Node

`Node` *extends* `FormInitStateElement` = `FormInitStateElement`

#### Parameters

##### options

###### create

(`param`, `name`) => `Node`

###### initState?

`Param`[]

#### Returns

`FormFieldArray`\<`Param`, `Node`\>


<a name="functionsextendmd"></a>

## Function: extend()

> **extend**\<`This`\>(`this`, ...`extensions`): `This`

Defined in: [packages/core/src/core/extend.ts:109](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/extend.ts#L109)

Applies extensions to atoms or actions.

This is the core extension mechanism in Reatom that allows adding functionality
to atoms and actions. Extensions can add properties, methods, or modify behavior.
Extended atoms maintain their original reference identity.

### Type Parameters

#### This

`This` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\>

The type of atom or action being extended

### Parameters

#### this

`This`

#### extensions

...[`Ext`](#interfacesextmd)\<[`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\>, [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\>\>[]

Array of extensions to apply to the atom/action

### Returns

`This`

The original atom/action with extensions applied

### Example

```ts
// Extending an atom with reset capability
const counter = atom(0, 'counter').extend(
  withReset(0), // Adds counter.reset() method
  withLogger('COUNTER') // Adds logging middleware
)
```


<a name="functionsgetstacktracemd"></a>

## Function: getStackTrace()

> **getStackTrace**(`acc?`, `steps?`, `frame?`): `string`

Defined in: [packages/core/src/connectLogger.ts:122](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/connectLogger.ts#L122)

Generates a formatted stack trace string based on the current execution context.

Creates a visual representation of the dependency tree from the current frame
up through its publishers, using ASCII/Unicode characters to show relationships.

### Parameters

#### acc?

`string` = `'─ '`

Initial accumulator string for the result

#### steps?

`string` = `''`

Initial indentation padding for proper alignment

#### frame?

[`Frame`](#interfacesframemd)\<`any`, `any`[], `any`\> = `...`

The starting frame to trace from (defaults to current top frame)

### Returns

`string`

A formatted string representation of the stack trace

### Example

```ts
// Might produce output like:
// ─ counter ┬─ doubleCounter
//           └─ displayValue
```


<a name="functionsidentitymd"></a>

## Function: identity()

> **identity**\<`T`\>(`value`, ...`a`): `T`

Defined in: [packages/core/src/utils.ts:207](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/utils.ts#L207)

Identity function that returns the first argument unchanged.
Can accept additional parameters but ignores them.

### Type Parameters

#### T

`T`

The type of value being passed through

### Parameters

#### value

`T`

The value to return

#### a

...`any`[]

### Returns

`T`

The same value that was passed in


<a name="functionsifcalledmd"></a>

## Function: ifCalled()

> **ifCalled**\<`Params`, `Payload`\>(`target`, `cb`): `void`

Defined in: [packages/core/src/methods/ifChanged.ts:78](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/methods/ifChanged.ts#L78)

Executes a callback when an action is called

This utility detects when an action is called during the current frame execution
and executes the provided callback with the action's payload and parameters.
Only works within a reactive (atom) context.

### Type Parameters

#### Params

`Params` *extends* `any`[]

Array type of action parameters

#### Payload

`Payload`

Return type of the action

### Parameters

#### target

[`Action`](#interfacesactionmd)\<`Params`, `Payload`\>

The action to monitor for calls

#### cb

(`payload`, `params`) => `void`

Callback function to execute when the action is called

### Returns

`void`

### Throws

If target is not an action or if not used in a reactive context

### Example

```ts
// Log when a user is created
ifCalled(createUser, (user, params) => {
  console.log(`User created: ${user.name} with ID ${user.id}`);
});
```


<a name="functionsifchangedmd"></a>

## Function: ifChanged()

> **ifChanged**\<`T`\>(`target`, `cb`): `void`

Defined in: [packages/core/src/methods/ifChanged.ts:35](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/methods/ifChanged.ts#L35)

Executes a callback when an atom's state changes

This utility evaluates if an atom's state has changed during the current
frame execution and calls the provided callback with the new state (and optionally
the previous state if available).

### Type Parameters

#### T

`T` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\>

Type extending AtomLike

### Parameters

#### target

`T`

The atom to monitor for changes

#### cb

(`newState`, `oldState?`) => `void`

Callback to execute when the atom changes

### Returns

`void`

### Throws

If target is not a reactive atom

### Example

```ts
// Log when the user's name changes
ifChanged(userName, (newName, oldName) => {
  console.log(`Name changed from ${oldName} to ${newName}`);
});
```


<a name="functionsisabortmd"></a>

## Function: isAbort()

> **isAbort**(`thing`): `thing is AbortError`

Defined in: [packages/core/src/utils.ts:680](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/utils.ts#L680)

Type guard that checks if a value is an AbortError.

### Parameters

#### thing

`any`

The value to check

### Returns

`thing is AbortError`

True if the value is an AbortError, false otherwise


<a name="functionsisactionmd"></a>

## Function: isAction()

> **isAction**(`target`): `target is Action<any[], any>`

Defined in: [packages/core/src/core/action.ts:43](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/action.ts#L43)

Type guard to check if a value is a Reatom action.

This function determines whether the given value is an action by checking
if it's an atom with non-reactive behavior (actions are non-reactive atoms).

### Parameters

#### target

`unknown`

The value to check

### Returns

`target is Action<any[], any>`

`true` if the value is a Reatom action, `false` otherwise


<a name="functionsisatommd"></a>

## Function: isAtom()

> **isAtom**(`value`): `value is AtomLike<any, any[], any>`

Defined in: [packages/core/src/core/atom.ts:400](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L400)

### Parameters

#### value

`any`

### Returns

`value is AtomLike<any, any[], any>`


<a name="functionsisbrowsermd"></a>

## Function: isBrowser()

> **isBrowser**(): `boolean`

Defined in: [packages/core/src/utils.ts:743](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/utils.ts#L743)

Detects whether the code is running in a browser environment.
Checks for the existence of window and document objects.

### Returns

`boolean`

True if running in a browser environment, false otherwise


<a name="functionsiscausedbymd"></a>

## Function: isCausedBy()

> **isCausedBy**(`target`, `frame?`): `boolean`

Defined in: [packages/core/src/methods/isCausedBy.ts:22](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/methods/isCausedBy.ts#L22)

Determines if an atom is part of the causal chain leading to the current computation

This recursive function checks if the given atom has caused the current computation
by traversing the computation tree. It's useful for determining dependencies and
understanding the flow of state changes through your application.

### Parameters

#### target

[`AtomLike`](#interfacesatomlikemd)

The atom to check if it's part of the causal chain

#### frame?

[`Frame`](#interfacesframemd)\<`any`, `any`[], `any`\> = `...`

The frame to check (defaults to the current top frame)

### Returns

`boolean`

True if the target atom is part of the causal chain, false otherwise

### Example

```ts
// Check if user atom changes caused the current computation
if (isCausedBy(userAtom)) {
  console.log('This computation was triggered by user state change');
}
```


<a name="functionsiscomputedmd"></a>

## Function: isComputed()

> **isComputed**(`target`): `boolean`

Defined in: [packages/core/src/core/atom.ts:935](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L935)

Checks if the provided target is a READONLY computed atom

### Parameters

#### target

[`AtomLike`](#interfacesatomlikemd)

The atom to check

### Returns

`boolean`

boolean


<a name="functionsisconnectedmd"></a>

## Function: isConnected()

> **isConnected**(`anAtom`): `boolean`

Defined in: [packages/core/src/core/atom.ts:503](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L503)

Checks if an atom has active subscriptions.

This function determines if an atom is currently connected to any subscribers,
which indicates that the atom is being actively used somewhere in the application.
This is useful for optimizations or conditional logic based on whether an atom's
changes are being observed.

### Parameters

#### anAtom

[`AtomLike`](#interfacesatomlikemd)

The atom to check for subscriptions

### Returns

`boolean`

`true` if the atom has subscribers, `false` otherwise


<a name="functionsisdeepequalmd"></a>

## Function: isDeepEqual()

> **isDeepEqual**(`a`, `b`): `any`

Defined in: [packages/core/src/utils.ts:324](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/utils.ts#L324)

Performs a deep equality comparison between two values.
Recursively compares nested objects and arrays while properly handling cyclic references.

Handles primitives, objects, dates, regular expressions, arrays, maps, and sets.
Uses a WeakMap to track visited objects to avoid infinite recursion with circular references.

### Parameters

#### a

`any`

First value to compare

#### b

`any`

Second value to compare

### Returns

`any`

True if the values are deeply equal, false otherwise


<a name="functionsisfieldatommd"></a>

## Function: isFieldAtom()

> **isFieldAtom**(`thing`): `thing is FieldLikeAtom<any>`

Defined in: [packages/core/src/form/src/reatomField.ts:470](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L470)

### Parameters

#### thing

`any`

### Returns

`thing is FieldLikeAtom<any>`


<a name="functionsislinkedlistatommd"></a>

## Function: isLinkedListAtom()

> **isLinkedListAtom**(`thing`): `thing is LinkedListLikeAtom<LinkedList<LLNode<Rec>>>`

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:739](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L739)

### Parameters

#### thing

`any`

### Returns

`thing is LinkedListLikeAtom<LinkedList<LLNode<Rec>>>`


<a name="functionsisobjectmd"></a>

## Function: isObject()

> **isObject**\<`T`\>(`thing`): thing is T extends Record\<string \| number \| symbol, unknown\> ? T\<T\> : Record\<string \| number \| symbol, unknown\>

Defined in: [packages/core/src/utils.ts:230](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/utils.ts#L230)

Type guard that checks if a value is an object (non-null and typeof 'object').
Provides advanced type narrowing to either the original object type or a generic object type.

### Type Parameters

#### T

`T`

The type of value being checked

### Parameters

#### thing

`T`

The value to check

### Returns

thing is T extends Record\<string \| number \| symbol, unknown\> ? T\<T\> : Record\<string \| number \| symbol, unknown\>

True if the value is a non-null object, false otherwise


<a name="functionsispubschangedmd"></a>

## Function: \_isPubsChanged()

> **\_isPubsChanged**(`contextFrame`, `frame`, `pubs`, `from`): `boolean`

Defined in: [packages/core/src/core/atom.ts:563](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L563)

### Parameters

#### contextFrame

[`ContextFrame`](#interfacescontextframemd)

#### frame

[`Frame`](#interfacesframemd)

#### pubs

\[`null` \| [`Frame`](#interfacesframemd)\<`any`, `any`[], `any`\>, `...dependencies: Frame<any, any[], any>[]`\]

#### from

`number`

### Returns

`boolean`


<a name="functionsisrecmd"></a>

## Function: isRec()

> **isRec**(`thing`): `thing is Record<string, unknown>`

Defined in: [packages/core/src/utils.ts:245](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/utils.ts#L245)

Type guard that checks if a value is a plain object (a simple object literal or created with Object.create(null)).
Verifies that the object either has no prototype or its prototype is Object.prototype.

### Parameters

#### thing

`unknown`

The value to check

### Returns

`thing is Record<string, unknown>`

True if the value is a plain object, false otherwise


<a name="functionsisshallowequalmd"></a>

## Function: isShallowEqual()

> **isShallowEqual**(`a`, `b`, `is`): `any`

Defined in: [packages/core/src/utils.ts:268](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/utils.ts#L268)

Performs a shallow equality comparison between two values.
Handles primitives, objects, dates, regular expressions, arrays, maps, and sets.

For iterables, compares each item in sequence for equality.
For objects, compares direct property values but not nested objects deeply.

### Parameters

#### a

`any`

First value to compare

#### b

`any`

Second value to compare

#### is

(`value1`, `value2`) => `boolean`

Optional comparison function to use for individual values (defaults to Object.is)

### Returns

`any`

True if the values are shallowly equal, false otherwise


<a name="functionsjsonclonemd"></a>

## Function: jsonClone()

> **jsonClone**\<`T`\>(`value`): `T`

Defined in: [packages/core/src/utils.ts:478](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/utils.ts#L478)

Creates a deep clone of a value using JSON serialization/deserialization.
This is a type-safe shortcut to `JSON.parse(JSON.stringify(value))`.

Note: This has limitations with circular references, functions, symbols,
and special objects like Date (converts to string).
Consider using the native structuredClone when available.

### Type Parameters

#### T

`T`

The type of value being cloned

### Parameters

#### value

`T`

The value to clone

### Returns

`T`

A deep clone of the input value

### See

https://developer.mozilla.org/en-US/docs/Web/API/structuredClone


<a name="functionsmockmd"></a>

## Function: mock()

> **mock**\<`Params`, `Payload`\>(`target`, `cb`): [`Unsubscribe`](#interfacesunsubscribemd)

Defined in: [packages/core/src/core/atom.ts:1091](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L1091)

Mocks an atom or action for testing purposes.

This function replaces the original behavior of an atom or action with a custom
callback function for the duration of the mock. This is useful for isolating
units of code during testing and controlling their behavior.

### Type Parameters

#### Params

`Params` *extends* `any`[]

The parameter types of the target atom/action

#### Payload

`Payload`

The return type of the target atom/action

### Parameters

#### target

[`AtomLike`](#interfacesatomlikemd)\<`any`, `Params`, `Payload`\>

The atom or action to mock

#### cb

(...`params`) => `Payload`

The callback function to use as the mock implementation. It receives
            the parameters passed to the mocked atom/action and should return
            the desired payload.

### Returns

[`Unsubscribe`](#interfacesunsubscribemd)

A function that, when called, removes the mock and restores the original behavior.


<a name="functionsmockrandommd"></a>

## Function: mockRandom()

> **mockRandom**(`fn`): () => `void`

Defined in: [packages/core/src/utils.ts:505](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/utils.ts#L505)

Replaces the default random number generator with a custom implementation.
Useful for testing to provide deterministic "random" values.

### Parameters

#### fn

(`min`, `max`) => `number`

The custom random function to use

### Returns

A restore function that reverts to the original random implementation when called

> (): `void`

#### Returns

`void`

### Example

```ts
// Set up deterministic random values for testing
const restore = mockRandom(() => 42);
console.log(random()); // Always returns 42
restore(); // Back to normal random behavior
```


<a name="functionsnamedmd"></a>

## Function: named()

> **named**(`name`): `string`

Defined in: [packages/core/src/core/atom.ts:554](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L554)

### Parameters

#### name

`string` | `TemplateStringsArray`

### Returns

`string`


<a name="functionsnonnullablemd"></a>

## Function: nonNullable()

> **nonNullable**\<`T`\>(`value`, `message?`): `NonNullable`\<`T`\>

Defined in: [packages/core/src/utils.ts:527](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/utils.ts#L527)

Asserts that a value is not null or undefined.
Throws a TypeError if the value is null or undefined.
Also serves as a type guard to narrow the type to non-nullable.

### Type Parameters

#### T

`T`

The type of value to check

### Parameters

#### value

`T`

The value to check

#### message?

`string`

Optional custom error message

### Returns

`NonNullable`\<`T`\>

The input value if it's not null or undefined

### Throws

If the value is null or undefined

### Example

```ts
const name = nonNullable(user.name); // TypeScript knows name is not null or undefined
```


<a name="functionsnotifymd"></a>

## Function: notify()

> **notify**(): `void`

Defined in: [packages/core/src/core/queues.ts:64](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/queues.ts#L64)

Processes all scheduled tasks in the current context's queues.

This function is called automatically after tasks have been scheduled via `enqueue`.
It processes tasks in the following priority order:
1. hook tasks
2. compute tasks
3. cleanup tasks
4. effect tasks

The function resets priority after each task execution to ensure higher priority
tasks (which may have been added during execution) are processed first.

### Returns

`void`


<a name="functionsomitmd"></a>

## Function: omit()

> **omit**\<`T`, `K`\>(`target`, `keys`): [`Plain`](#type-aliasesplainmd)\<`Omit`\<`T`, `K`\>\>

Defined in: [packages/core/src/utils.ts:453](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/utils.ts#L453)

Creates a new object excluding the specified keys from the original object.

### Type Parameters

#### T

`T`

The source object type

#### K

`K` *extends* `string` \| `number` \| `symbol`

The keys to omit from the object

### Parameters

#### target

`T`

The source object

#### keys

`K`[]

Array of keys to exclude from the result

### Returns

[`Plain`](#type-aliasesplainmd)\<`Omit`\<`T`, `K`\>\>

A new object containing all keys except the specified ones

### Example

```ts
const user = { id: 1, name: 'Alice', password: 'secret' };
const safeUser = omit(user, ['password']);
// Result: { id: 1, name: 'Alice' }
```


<a name="functionsparseatomsmd"></a>

## Function: parseAtoms()

> **parseAtoms**\<`Value`\>(`value`): [`ParseAtoms`](#type-aliasesparseatomsmd)\<`Value`\>

Defined in: [packages/core/src/methods/parseAtoms.ts:71](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/methods/parseAtoms.ts#L71)

Recursively unwraps atoms in a value to get their current states

This function deeply traverses a value, including nested objects, arrays, maps, and sets,
replacing atoms with their current state values. It's useful for serialization, debugging,
or creating snapshots of state that don't contain reactive references.

### Type Parameters

#### Value

`Value`

The type of value to parse

### Parameters

#### value

`Value`

The value containing atoms to unwrap

### Returns

[`ParseAtoms`](#type-aliasesparseatomsmd)\<`Value`\>

A new value with all atoms replaced by their current states

### Example

```ts
const user = {
  id: 42,
  name: atom('John', 'userName'),
  stats: {
    score: atom(100, 'userScore'),
    badges: atom(['gold', 'silver'], 'userBadges')
  }
};

// Results in: { id: 42, name: 'John', stats: { score: 100, badges: ['gold', 'silver'] }}
const plainUser = parseAtoms(user);
```


<a name="functionspickmd"></a>

## Function: pick()

> **pick**\<`T`, `K`\>(`target`, `keys`): [`Plain`](#type-aliasesplainmd)\<`Pick`\<`T`, `K`\>\>

Defined in: [packages/core/src/utils.ts:430](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/utils.ts#L430)

Creates a new object with only the specified keys from the original object.

### Type Parameters

#### T

`T`

The source object type

#### K

`K` *extends* `string` \| `number` \| `symbol`

The keys to pick from the object

### Parameters

#### target

`T`

The source object

#### keys

`K`[]

Array of keys to include in the result

### Returns

[`Plain`](#type-aliasesplainmd)\<`Pick`\<`T`, `K`\>\>

A new object containing only the specified keys and their values

### Example

```ts
const user = { id: 1, name: 'Alice', email: 'alice@example.com' };
const userInfo = pick(user, ['name', 'email']);
// Result: { name: 'Alice', email: 'alice@example.com' }
```


<a name="functionsreadmd"></a>

## Function: \_read()

> **\_read**\<`State`, `Params`, `Payload`\>(`target`): `undefined` \| [`Frame`](#interfacesframemd)\<`State`, `Params`, `Payload`\>

Defined in: [packages/core/src/core/atom.ts:1020](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L1020)

Reads the current frame for an atom from the context store.

This internal utility function retrieves the frame associated with an atom
from the current context. It's used to access an atom's state and dependencies
without triggering reactivity or creating new dependencies.

### Type Parameters

#### State

`State` = `any`

The state type of the atom

#### Params

`Params` *extends* `any`[] = \[\]

The parameter types the atom accepts

#### Payload

`Payload` = `State`

The return type when the atom is called

### Parameters

#### target

[`AtomLike`](#interfacesatomlikemd)\<`State`, `Params`, `Payload`\>

The atom to read the frame for

### Returns

`undefined` \| [`Frame`](#interfacesframemd)\<`State`, `Params`, `Payload`\>

The frame for the atom if it exists in the current context, or undefined otherwise


<a name="functionsreatomabstractrendermd"></a>

## Function: reatomAbstractRender()

> **reatomAbstractRender**\<`Props`, `Result`\>(`options`): [`AbstractRender`](#interfacesabstractrendermd)\<`Props`, `Result`\>

Defined in: [packages/core/src/reatomAbstractRender.ts:66](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/reatomAbstractRender.ts#L66)

Creates a low-level renderer that connects Reatom with other reactive systems.
This function decorates computed rendering to prevent extra or outdated rerenders,
allowing a user render function to run only in the context of the adapted reactive system.

The renderer maintains proper reactivity by coordinating state updates between
Reatom's atom/computed system and the target rendering system.

### Type Parameters

#### Props

`Props`

The type of props/parameters that the renderer accepts

#### Result

`Result`

The type of result produced by the render operation

### Parameters

#### options

Configuration options for the abstract renderer

##### frame

[`Frame`](#interfacesframemd)

The Reatom frame/context in which the rendering occurs

##### mount?

() => `void`

Optional function called when mounting the renderer

##### name

`string`

Name identifier for debugging purposes

##### render

(`props`) => `Result`

Function that renders content with the given props

##### rerender

(`param`) => `any`

Function called when a rerender is needed

### Returns

[`AbstractRender`](#interfacesabstractrendermd)\<`Props`, `Result`\>

An object with render and mount methods

### Example

```ts
// Creating a React renderer
const reactRenderer = reatomAbstractRender({
  frame: ctx,
  render: (props) => React.createElement(Component, props),
  rerender: ({ result }) => setElement(result),
  name: 'ReactRenderer'
});

// Usage
const unmount = reactRenderer.mount();
reactRenderer.render({ prop1: 'value1' });

// Later cleanup
unmount();
```


<a name="functionsreatomarraymd"></a>

## Function: reatomArray()

> **reatomArray**\<`T`\>(`initState`, `name`): [`ArrayAtom`](#interfacesarrayatommd)\<`T`\>

Defined in: [packages/core/src/primitives/reatomArray.ts:10](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomArray.ts#L10)

### Type Parameters

#### T

`T`

### Parameters

#### initState

`T`[] = `...`

#### name

`string` = `...`

### Returns

[`ArrayAtom`](#interfacesarrayatommd)\<`T`\>


<a name="functionsreatombooleanmd"></a>

## Function: reatomBoolean()

> **reatomBoolean**(`init`, `name`): [`BooleanAtom`](#interfacesbooleanatommd)

Defined in: [packages/core/src/primitives/reatomBoolean.ts:10](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomBoolean.ts#L10)

### Parameters

#### init

`boolean` = `false`

#### name

`string` = `...`

### Returns

[`BooleanAtom`](#interfacesbooleanatommd)


<a name="functionsreatomenummd"></a>

## Function: reatomEnum()

> **reatomEnum**\<`T`, `Format`\>(`variants`, `options`): [`EnumAtom`](#type-aliasesenumatommd)\<`T`, `Format`\>

Defined in: [packages/core/src/primitives/reatomEnum.ts:32](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomEnum.ts#L32)

### Type Parameters

#### T

`T` *extends* `string`

#### Format

`Format` *extends* `"camelCase"` \| `"snake_case"` = `"camelCase"`

### Parameters

#### variants

readonly `T`[]

#### options

`string` | [`EnumAtomOptions`](#type-aliasesenumatomoptionsmd)\<`T`, `Format`\>

### Returns

[`EnumAtom`](#type-aliasesenumatommd)\<`T`, `Format`\>


<a name="functionsreatomfieldmd"></a>

## Function: reatomField()

### Call Signature

> **reatomField**\<`State`, `Value`\>(`_initState`, `options`): [`FieldAtom`](#interfacesfieldatommd)\<`State`, `Value`\>

Defined in: [packages/core/src/form/src/reatomField.ts:226](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L226)

#### Type Parameters

##### State

`State`

##### Value

`Value` = `State`

#### Parameters

##### \_initState

`State`

##### options

`string` | [`FieldOptions`](#interfacesfieldoptionsmd)\<`State`, `Value`\>

#### Returns

[`FieldAtom`](#interfacesfieldatommd)\<`State`, `Value`\>

### Call Signature

> **reatomField**\<`State`, `A`, `Value`\>(`_initState`, `options`, `stateAtom`): `A` & [`FieldAtom`](#interfacesfieldatommd)\<`State`, `Value`\>

Defined in: [packages/core/src/form/src/reatomField.ts:231](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L231)

#### Type Parameters

##### State

`State`

##### A

`A` *extends* [`Atom`](#interfacesatommd)\<`State`\>

##### Value

`Value` = `State`

#### Parameters

##### \_initState

`State`

##### options

`string` | [`FieldOptions`](#interfacesfieldoptionsmd)\<`State`, `Value`\>

##### stateAtom

`A`

#### Returns

`A` & [`FieldAtom`](#interfacesfieldatommd)\<`State`, `Value`\>


<a name="functionsreatomfieldsetmd"></a>

## Function: reatomFieldSet()

> **reatomFieldSet**\<`T`\>(`fields`, `name`): [`FieldSet`](#interfacesfieldsetmd)\<`T`\>

Defined in: [packages/core/src/form/src/reatomFieldSet.ts:60](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomFieldSet.ts#L60)

### Type Parameters

#### T

`T` *extends* [`FormInitState`](#type-aliasesforminitstatemd)

### Parameters

#### fields

[`FormFields`](#type-aliasesformfieldsmd)\<`T`\>

#### name

`string` = `...`

### Returns

[`FieldSet`](#interfacesfieldsetmd)\<`T`\>


<a name="functionsreatomformmd"></a>

## Function: reatomForm()

### Call Signature

> **reatomForm**\<`T`, `SchemaState`\>(`initState`, `optionsWithSchema`): [`Form`](#interfacesformmd)\<`T`\>

Defined in: [packages/core/src/form/src/reatomForm.ts:353](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L353)

#### Type Parameters

##### T

`T` *extends* [`FormInitState`](#type-aliasesforminitstatemd)

##### SchemaState

`SchemaState`

#### Parameters

##### initState

`T` | (`name`) => `T`

##### optionsWithSchema

[`FormOptionsWithSchema`](#interfacesformoptionswithschemamd)\<`SchemaState`\>

#### Returns

[`Form`](#interfacesformmd)\<`T`\>

### Call Signature

> **reatomForm**\<`T`\>(`initState`, `options?`): [`Form`](#interfacesformmd)\<`T`\>

Defined in: [packages/core/src/form/src/reatomForm.ts:358](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L358)

#### Type Parameters

##### T

`T` *extends* [`FormInitState`](#type-aliasesforminitstatemd)

#### Parameters

##### initState

`T` | (`name`) => `T`

##### options?

[`FormOptionsWithoutSchema`](#interfacesformoptionswithoutschemamd)\<`T`\>

#### Returns

[`Form`](#interfacesformmd)\<`T`\>

### Call Signature

> **reatomForm**\<`T`\>(`initState`, `name?`): [`Form`](#interfacesformmd)\<`T`\>

Defined in: [packages/core/src/form/src/reatomForm.ts:363](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L363)

#### Type Parameters

##### T

`T` *extends* [`FormInitState`](#type-aliasesforminitstatemd)

#### Parameters

##### initState

`T` | (`name`) => `T`

##### name?

`string`

#### Returns

[`Form`](#interfacesformmd)\<`T`\>


<a name="functionsreatomlinkedlistmd"></a>

## Function: reatomLinkedList()

### Call Signature

> **reatomLinkedList**\<`Node`, `Params`, `Key`\>(`initState`, `name?`): [`LinkedListAtom`](#interfaceslinkedlistatommd)\<`Params`, `Node`, `Key`\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:250](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L250)

#### Type Parameters

##### Node

`Node` *extends* [`Rec`](#type-aliasesrecmd)

##### Params

`Params` *extends* `any`[] = \[`Node`\]

##### Key

`Key` *extends* `string` \| `number` \| `symbol` = `never`

#### Parameters

##### initState

`Node`[]

##### name?

`string`

#### Returns

[`LinkedListAtom`](#interfaceslinkedlistatommd)\<`Params`, `Node`, `Key`\>

### Call Signature

> **reatomLinkedList**\<`Params`, `Node`, `Key`\>(`initState`, `name?`): [`LinkedListAtom`](#interfaceslinkedlistatommd)\<`Params`, `Node`, `Key`\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:256](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L256)

#### Type Parameters

##### Params

`Params` *extends* `any`[]

##### Node

`Node` *extends* [`Rec`](#type-aliasesrecmd)

##### Key

`Key` *extends* `string` \| `number` \| `symbol` = `never`

#### Parameters

##### initState

(...`params`) => `Node`

##### name?

`string`

#### Returns

[`LinkedListAtom`](#interfaceslinkedlistatommd)\<`Params`, `Node`, `Key`\>

### Call Signature

> **reatomLinkedList**\<`Params`, `Node`, `Key`\>(`initState`, `name?`): [`LinkedListAtom`](#interfaceslinkedlistatommd)\<`Params`, `Node`, `Key`\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:265](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L265)

#### Type Parameters

##### Params

`Params` *extends* `any`[]

##### Node

`Node` *extends* [`Rec`](#type-aliasesrecmd)

##### Key

`Key` *extends* `string` \| `number` \| `symbol` = `never`

#### Parameters

##### initState

###### create

(...`params`) => `Node`

###### initState?

`Node`[]

###### key?

`Key`

##### name?

`string`

#### Returns

[`LinkedListAtom`](#interfaceslinkedlistatommd)\<`Params`, `Node`, `Key`\>

### Call Signature

> **reatomLinkedList**\<`Params`, `Node`, `Key`\>(`initState`, `name?`): [`LinkedListAtom`](#interfaceslinkedlistatommd)\<`Params`, `Node`, `Key`\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:278](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L278)

#### Type Parameters

##### Params

`Params` *extends* `any`[]

##### Node

`Node` *extends* [`Rec`](#type-aliasesrecmd)

##### Key

`Key` *extends* `string` \| `number` \| `symbol` = `never`

#### Parameters

##### initState

###### create?

(...`params`) => `Node`

###### initState

`Node`[]

###### key?

`Key`

##### name?

`string`

#### Returns

[`LinkedListAtom`](#interfaceslinkedlistatommd)\<`Params`, `Node`, `Key`\>

### Call Signature

> **reatomLinkedList**\<`Params`, `Node`, `Key`\>(`initSnapshot`, `name?`): [`LinkedListAtom`](#interfaceslinkedlistatommd)\<`Params`, `Node`, `Key`\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:291](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L291)

#### Type Parameters

##### Params

`Params` *extends* `any`[]

##### Node

`Node` *extends* [`Rec`](#type-aliasesrecmd)

##### Key

`Key` *extends* `string` \| `number` \| `symbol` = `never`

#### Parameters

##### initSnapshot

###### create

(...`params`) => `Node`

###### initSnapshot?

`Params`[]

###### key?

`Key`

##### name?

`string`

#### Returns

[`LinkedListAtom`](#interfaceslinkedlistatommd)\<`Params`, `Node`, `Key`\>


<a name="functionsreatommapmd"></a>

## Function: reatomMap()

> **reatomMap**\<`Key`, `Value`\>(`initState`, `name`): [`MapAtom`](#interfacesmapatommd)\<`Key`, `Value`\>

Defined in: [packages/core/src/primitives/reatomMap.ts:17](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomMap.ts#L17)

### Type Parameters

#### Key

`Key`

#### Value

`Value`

### Parameters

#### initState

`undefined` | `null` | `Map`\<`Key`, `Value`\> | `Iterable`\<readonly \[`Key`, `Value`\], `any`, `any`\>

#### name

`string` = `...`

### Returns

[`MapAtom`](#interfacesmapatommd)\<`Key`, `Value`\>


<a name="functionsreatomnumbermd"></a>

## Function: reatomNumber()

> **reatomNumber**(`initState`, `name`): [`NumberAtom`](#interfacesnumberatommd)

Defined in: [packages/core/src/primitives/reatomNumber.ts:11](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomNumber.ts#L11)

### Parameters

#### initState

`number` = `0`

#### name

`string` = `...`

### Returns

[`NumberAtom`](#interfacesnumberatommd)


<a name="functionsreatomrecordmd"></a>

## Function: reatomRecord()

> **reatomRecord**\<`T`\>(`initState`, `name`): [`RecordAtom`](#interfacesrecordatommd)\<`T`\>

Defined in: [packages/core/src/primitives/reatomRecord.ts:10](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomRecord.ts#L10)

### Type Parameters

#### T

`T` *extends* [`Rec`](#type-aliasesrecmd)

### Parameters

#### initState

`Exclude`\<`T`, [`Fn`](#interfacesfnmd)\>

#### name

`string` = `...`

### Returns

[`RecordAtom`](#interfacesrecordatommd)\<`T`\>


<a name="functionsreatomsetmd"></a>

## Function: reatomSet()

> **reatomSet**\<`T`\>(`initState`, `name`): [`SetAtom`](#interfacessetatommd)\<`T`\>

Defined in: [packages/core/src/primitives/reatomSet.ts:21](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomSet.ts#L21)

### Type Parameters

#### T

`T`

### Parameters

#### initState

`undefined` | `null` | `Set`\<`T`\> | `Iterable`\<`T`, `any`, `any`\>

#### name

`string` = `...`

### Returns

[`SetAtom`](#interfacessetatommd)\<`T`\>


<a name="functionsreatomtransactionmd"></a>

## Function: reatomTransaction()

> **reatomTransaction**(): `TransactionVariable`

Defined in: [packages/core/src/methods/transaction.ts:41](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/methods/transaction.ts#L41)

Creates a transaction variable with rollback capabilities.
This variable stores a list of rollback functions that can be executed
to revert state changes made within a transaction.

### Returns

`TransactionVariable`

A transaction variable with `withRollback` middleware and a `rollback` action.


<a name="functionsrunmd"></a>

## Function: run()

> **run**\<`I`, `O`\>(`this`, `fn`, ...`params`): `O`

Defined in: [packages/core/src/core/atom.ts:353](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L353)

### Type Parameters

#### I

`I` *extends* `any`[]

#### O

`O`

### Parameters

#### this

[`Frame`](#interfacesframemd)

#### fn

(...`params`) => `O`

#### params

...`I`

### Returns

`O`


<a name="functionssettledmd"></a>

## Function: settled()

> **settled**\<`Result`, `Fallback`\>(`promise`, `fallback?`): `Result` \| `Fallback`

Defined in: [packages/core/src/mixins/withSuspense.ts:10](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/mixins/withSuspense.ts#L10)

### Type Parameters

#### Result

`Result`

#### Fallback

`Fallback` = `undefined`

### Parameters

#### promise

`Promise`\<`Result`\>

#### fallback?

`Fallback`

### Returns

`Result` \| `Fallback`


<a name="functionssleepmd"></a>

## Function: sleep()

> **sleep**(`ms`): `Promise`\<`unknown`\>

Defined in: [packages/core/src/utils.ts:220](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/utils.ts#L220)

Creates a promise that resolves after the specified number of milliseconds.
Useful for creating delays in async functions.

### Parameters

#### ms

`number` = `0`

The number of milliseconds to sleep (defaults to 0)

### Returns

`Promise`\<`unknown`\>

A promise that resolves after the specified delay


<a name="functionssuspensemd"></a>

## Function: suspense()

> **suspense**\<`T`\>(`target`): `Awaited`\<`T`\>

Defined in: [packages/core/src/mixins/withSuspense.ts:91](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/mixins/withSuspense.ts#L91)

### Type Parameters

#### T

`T`

### Parameters

#### target

[`AtomLike`](#interfacesatomlikemd)\<`T`\>

### Returns

`Awaited`\<`T`\>


<a name="functionstakemd"></a>

## Function: take()

> **take**\<`T`\>(`target`, `name?`): `Promise`\<`Awaited`\<`T`\>\>

Defined in: [packages/core/src/methods/take.ts:40](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/methods/take.ts#L40)

Awaits the next update of an atom or call of an action.

This function returns a Promise that resolves when the specified atom's state
changes or when the specified action is called. This is valuable for orchestrating
workflows that depend on future state changes or action calls.

Note: Must be used with `wrap()` when used in an async context to preserve reactive context.

### Type Parameters

#### T

`T`

The type of value expected when the promise resolves

### Parameters

#### target

[`AtomLike`](#interfacesatomlikemd)\<`any`, `any`, `T`\>

The atom or action to wait for

#### name?

`string`

Optional name for debugging purposes

### Returns

`Promise`\<`Awaited`\<`T`\>\>

A promise that resolves with the next value of the atom or action result

### Example

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


<a name="functionsthrowabortmd"></a>

## Function: throwAbort()

> **throwAbort**(`message`, `controller?`): `never`

Defined in: [packages/core/src/utils.ts:691](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/utils.ts#L691)

Creates and throws an AbortError with the provided message.
Optionally aborts the provided controller with the same error.

### Parameters

#### message

`string`

The error message

#### controller?

`AbortController`

Optional AbortController to abort

### Returns

`never`

### Throws

Always throws the created AbortError


<a name="functionsthrowifabortedmd"></a>

## Function: throwIfAborted()

> **throwIfAborted**(`controller?`): `void`

Defined in: [packages/core/src/utils.ts:668](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/utils.ts#L668)

Checks if an AbortController is aborted and throws an AbortError if it is.
Useful for quick abort checks at the beginning of async operations.

### Parameters

#### controller?

The AbortController to check (can be undefined, null or void)

`null` | `void` | `AbortController`

### Returns

`void`

### Throws

If the controller's signal is aborted


<a name="functionstoaborterrormd"></a>

## Function: toAbortError()

> **toAbortError**(`reason`): [`AbortError`](#interfacesaborterrormd)

Defined in: [packages/core/src/utils.ts:639](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/utils.ts#L639)

Converts any value to an AbortError.
If the value is already an AbortError, it will be returned as is.
Otherwise, creates a new AbortError with appropriate information.

Handles different environments by using DOMException when available
or falling back to regular Error with name set to 'AbortError'.

### Parameters

#### reason

`any`

The value to convert to an AbortError

### Returns

[`AbortError`](#interfacesaborterrormd)

An AbortError instance


<a name="functionstostringkeymd"></a>

## Function: toStringKey()

> **toStringKey**(`thing`, `immutable`): `string`

Defined in: [packages/core/src/utils.ts:563](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/utils.ts#L563)

Converts any JavaScript value to a stable string representation.
Handles complex data structures and edge cases that JSON.stringify cannot manage.

Provides special handling for:
- Circular references
- Maps and Sets
- Symbols
- Functions
- Custom class instances
- Regular objects (with sorted keys for stability)

### Parameters

#### thing

`any`

The value to convert to a string

#### immutable

`boolean` = `true`

Whether to memoize results for complex objects (defaults to true)

### Returns

`string`

A string representation of the value

### Example

```ts
// Handles circular references
const obj = { name: 'test' };
obj.self = obj;
const key = toStringKey(obj); // No infinite recursion!

// Stable representation of objects (key order doesn't matter)
toStringKey({a: 1, b: 2}) === toStringKey({b: 2, a: 1}) // true
```


<a name="functionstopmd"></a>

## Function: top()

> **top**(): [`Frame`](#interfacesframemd)

Defined in: [packages/core/src/core/atom.ts:1049](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L1049)

Gets the current top frame in the Reatom context stack.

Returns the currently active frame in the execution stack, which contains
the current atom being processed and its state.

### Returns

[`Frame`](#interfacesframemd)

The current top frame from the context stack

### Throws

If the context stack is empty (missing async stack)


<a name="functionswithabortmd"></a>

## Function: withAbort()

> **withAbort**(`strategy`): [`AssignerExt`](#interfacesassignerextmd)\<[`AbortExt`](#interfacesabortextmd)\>

Defined in: [packages/core/src/mixins/withAbort.ts:10](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/mixins/withAbort.ts#L10)

### Parameters

#### strategy

`"last-in-win"` | `"first-in-win"`

### Returns

[`AssignerExt`](#interfacesassignerextmd)\<[`AbortExt`](#interfacesabortextmd)\>


<a name="functionswithasyncdatamd"></a>

## Function: withAsyncData()

Implementation of the withAsyncData extension.

### Param

Configuration options for the async data handling

### Example

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
userData.data()     // → the fetched user data
userData.error()    // → error if fetch failed
userData.ready()    // → false while loading, true when complete
```

### Call Signature

> **withAsyncData**\<`Err`, `EmptyErr`\>(`options?`): \<`T`\>(`target`) => `T` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `Params`, `Promise`\<`Payload`\>\> ? [`AsyncDataExt`](#interfacesasyncdataextmd)\<`Params`, `Payload`, `undefined` \| `Payload`, `Err` \| `EmptyErr`\> : `never`

Defined in: [packages/core/src/async/withAsyncData.ts:73](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/async/withAsyncData.ts#L73)

Extension that adds async data management to atoms or actions that return promises.

Creates a properly typed data atom that stores the results of successful async operations.
Includes all features of [withAsync](#variableswithasyncmd) and [withAbort](#functionswithabortmd) for complete async handling.

#### Type Parameters

##### Err

`Err` = `Error`

The type of errors after parsing

##### EmptyErr

`EmptyErr` = `undefined`

The type of the empty error state

#### Parameters

##### options?

[`AsyncOptions`](#type-aliasesasyncoptionsmd)\<`Err`, `EmptyErr`\>

Configuration options for async data handling

#### Returns

An extension function that can be applied to atoms or actions

> \<`T`\>(`target`): `T` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `Params`, `Promise`\<`Payload`\>\> ? [`AsyncDataExt`](#interfacesasyncdataextmd)\<`Params`, `Payload`, `undefined` \| `Payload`, `Err` \| `EmptyErr`\> : `never`

##### Type Parameters

###### T

`T` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\>

##### Parameters

###### target

`T`

##### Returns

`T` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `Params`, `Promise`\<`Payload`\>\> ? [`AsyncDataExt`](#interfacesasyncdataextmd)\<`Params`, `Payload`, `undefined` \| `Payload`, `Err` \| `EmptyErr`\> : `never`

#### Param

Configuration options for the async data handling

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
userData.data()     // → the fetched user data
userData.error()    // → error if fetch failed
userData.ready()    // → false while loading, true when complete
```

### Call Signature

> **withAsyncData**\<`T`, `Err`, `EmptyErr`\>(`options`): (`target`) => `T` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `Params`, `Promise`\<`Payload`\>\> ? [`AsyncDataExt`](#interfacesasyncdataextmd)\<`Params`, `Payload`, `Payload`, `Err` \| `EmptyErr`\> : `never`

Defined in: [packages/core/src/async/withAsyncData.ts:93](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/async/withAsyncData.ts#L93)

Extension that adds async data management to atoms or actions that return promises.

This overload uses the payload type as the state type with a specified initial value.
Useful when you know the shape of the data that will be fetched.

#### Type Parameters

##### T

`T` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\>

The atom or action type

##### Err

`Err` = `Error`

The type of errors after parsing

##### EmptyErr

`EmptyErr` = `undefined`

The type of the empty error state

#### Parameters

##### options

[`AsyncOptions`](#type-aliasesasyncoptionsmd)\<`Err`, `EmptyErr`\> & `T` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `Params`, `Promise`\<`Payload`\>\> ? `object` : `never`

Configuration options including initial state and optional payload mapper

#### Returns

An extension function that can be applied to atoms or actions

> (`target`): `T` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `Params`, `Promise`\<`Payload`\>\> ? [`AsyncDataExt`](#interfacesasyncdataextmd)\<`Params`, `Payload`, `Payload`, `Err` \| `EmptyErr`\> : `never`

##### Parameters

###### target

`T`

##### Returns

`T` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `Params`, `Promise`\<`Payload`\>\> ? [`AsyncDataExt`](#interfacesasyncdataextmd)\<`Params`, `Payload`, `Payload`, `Err` \| `EmptyErr`\> : `never`

#### Param

Configuration options for the async data handling

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
userData.data()     // → the fetched user data
userData.error()    // → error if fetch failed
userData.ready()    // → false while loading, true when complete
```

### Call Signature

> **withAsyncData**\<`State`, `T`, `Err`, `EmptyErr`\>(`options`): (`target`) => `T` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `Params`, `Promise`\<`Payload`\>\> ? [`AsyncDataExt`](#interfacesasyncdataextmd)\<`Params`, `Payload`, `State` \| `Payload`, `Err` \| `EmptyErr`\> : `never`

Defined in: [packages/core/src/async/withAsyncData.ts:128](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/async/withAsyncData.ts#L128)

Extension that adds async data management to atoms or actions that return promises.

This overload allows specifying a completely custom state type with an initial value.
The resolved payload will be merged with the state without custom mapping.

#### Type Parameters

##### State

`State`

The custom state type

##### T

`T` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\>

The atom or action type

##### Err

`Err` = `Error`

The type of errors after parsing

##### EmptyErr

`EmptyErr` = `undefined`

The type of the empty error state

#### Parameters

##### options

[`AsyncOptions`](#type-aliasesasyncoptionsmd)\<`Err`, `EmptyErr`\> & `object`

Configuration options with custom initial state

#### Returns

An extension function that can be applied to atoms or actions

> (`target`): `T` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `Params`, `Promise`\<`Payload`\>\> ? [`AsyncDataExt`](#interfacesasyncdataextmd)\<`Params`, `Payload`, `State` \| `Payload`, `Err` \| `EmptyErr`\> : `never`

##### Parameters

###### target

`T`

##### Returns

`T` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `Params`, `Promise`\<`Payload`\>\> ? [`AsyncDataExt`](#interfacesasyncdataextmd)\<`Params`, `Payload`, `State` \| `Payload`, `Err` \| `EmptyErr`\> : `never`

#### Param

Configuration options for the async data handling

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
userData.data()     // → the fetched user data
userData.error()    // → error if fetch failed
userData.ready()    // → false while loading, true when complete
```

### Call Signature

> **withAsyncData**\<`State`, `T`, `Err`, `EmptyErr`\>(`options`): (`target`) => `T` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `Params`, `Promise`\<`Payload`\>\> ? [`AsyncDataExt`](#interfacesasyncdataextmd)\<`Params`, `Payload`, `State`, `Err` \| `EmptyErr`\> : `never`

Defined in: [packages/core/src/async/withAsyncData.ts:157](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/async/withAsyncData.ts#L157)

Extension that adds async data management to atoms or actions that return promises.

This overload provides full control with a custom state type and payload mapping function.
Allows complete transformation of the payload into the desired state format.

#### Type Parameters

##### State

`State`

The custom state type

##### T

`T` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\>

The atom or action type

##### Err

`Err` = `Error`

The type of errors after parsing

##### EmptyErr

`EmptyErr` = `undefined`

The type of the empty error state

#### Parameters

##### options

[`AsyncOptions`](#type-aliasesasyncoptionsmd)\<`Err`, `EmptyErr`\> & `object`

Configuration options with custom initial state and payload mapper

#### Returns

An extension function that can be applied to atoms or actions

> (`target`): `T` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `Params`, `Promise`\<`Payload`\>\> ? [`AsyncDataExt`](#interfacesasyncdataextmd)\<`Params`, `Payload`, `State`, `Err` \| `EmptyErr`\> : `never`

##### Parameters

###### target

`T`

##### Returns

`T` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `Params`, `Promise`\<`Payload`\>\> ? [`AsyncDataExt`](#interfacesasyncdataextmd)\<`Params`, `Payload`, `State`, `Err` \| `EmptyErr`\> : `never`

#### Param

Configuration options for the async data handling

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
userData.data()     // → the fetched user data
userData.error()    // → error if fetch failed
userData.ready()    // → false while loading, true when complete
```


<a name="functionswithcallhookmd"></a>

## Function: withCallHook()

> **withCallHook**\<`Target`\>(`cb`): [`Ext`](#interfacesextmd)\<`Target`\>

Defined in: [packages/core/src/mixins/withChangeHook.ts:53](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/mixins/withChangeHook.ts#L53)

### Type Parameters

#### Target

`Target` *extends* [`Action`](#interfacesactionmd)\<`any`[], `any`\>

### Parameters

#### cb

(`payload`, `params`) => `void`

### Returns

[`Ext`](#interfacesextmd)\<`Target`\>


<a name="functionswithchangehookmd"></a>

## Function: withChangeHook()

> **withChangeHook**\<`Target`\>(`cb`): [`Ext`](#interfacesextmd)\<`Target`\>

Defined in: [packages/core/src/mixins/withChangeHook.ts:13](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/mixins/withChangeHook.ts#L13)

### Type Parameters

#### Target

`Target` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\>

### Parameters

#### cb

(`state`, `prevState`) => `void`

### Returns

[`Ext`](#interfacesextmd)\<`Target`\>


<a name="functionswithcomputedmd"></a>

## Function: withComputed()

> **withComputed**\<`Target`\>(`computed`, `tail?`): [`Ext`](#interfacesextmd)\<`Target`\>

Defined in: [packages/core/src/mixins/withComputed.ts:20](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/mixins/withComputed.ts#L20)

A middleware extension that enhances an atom with computed capabilities.

### Type Parameters

#### Target

`Target` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\>

The target atom or action type to be extended with computed functionality.

### Parameters

#### computed

(`state`) => [`AtomState`](#type-aliasesatomstatemd)\<`Target`\>

A function that computes the new state based on the current state.

#### tail?

`boolean` = `true`

Determines the order of the passed computed calling. ATTENTION: use `false` only for computed with fixed size of dependencies

### Returns

[`Ext`](#interfacesextmd)\<`Target`\>

The extended atom or action with computed functionality.


<a name="functionswithconnecthookmd"></a>

## Function: withConnectHook()

> **withConnectHook**\<`Target`\>(`cb`): [`Ext`](#interfacesextmd)\<`Target`\>

Defined in: [packages/core/src/mixins/withConnectHook.ts:21](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/mixins/withConnectHook.ts#L21)

### Type Parameters

#### Target

`Target` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\>

### Parameters

#### cb

(`target`) => `void`

### Returns

[`Ext`](#interfacesextmd)\<`Target`\>


<a name="functionswithdisconnecthookmd"></a>

## Function: withDisconnectHook()

> **withDisconnectHook**\<`Target`\>(`cb`): [`Ext`](#interfacesextmd)\<`Target`\>

Defined in: [packages/core/src/mixins/withConnectHook.ts:25](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/mixins/withConnectHook.ts#L25)

### Type Parameters

#### Target

`Target` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\>

### Parameters

#### cb

(`target`) => `void`

### Returns

[`Ext`](#interfacesextmd)\<`Target`\>


<a name="functionswithfieldmd"></a>

## Function: withField()

> **withField**\<`T`, `Value`\>(`options`): (`anAtom`) => `T` & [`FieldAtom`](#interfacesfieldatommd)\<[`AtomState`](#type-aliasesatomstatemd)\<`T`\>, `Value`\>

Defined in: [packages/core/src/form/src/reatomField.ts:463](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L463)

### Type Parameters

#### T

`T` *extends* [`Atom`](#interfacesatommd)\<`any`\>

#### Value

`Value` = [`AtomState`](#type-aliasesatomstatemd)\<`T`\>

### Parameters

#### options

`Omit`\<[`FieldOptions`](#interfacesfieldoptionsmd)\<[`AtomState`](#type-aliasesatomstatemd)\<`T`\>, `Value`\>, `"name"`\> = `{}`

### Returns

> (`anAtom`): `T` & [`FieldAtom`](#interfacesfieldatommd)\<[`AtomState`](#type-aliasesatomstatemd)\<`T`\>, `Value`\>

#### Parameters

##### anAtom

`T`

#### Returns

`T` & [`FieldAtom`](#interfacesfieldatommd)\<[`AtomState`](#type-aliasesatomstatemd)\<`T`\>, `Value`\>


<a name="functionswithinitmd"></a>

## Function: withInit()

> **withInit**\<`Target`\>(`init`): [`Ext`](#interfacesextmd)\<`Target`\>

Defined in: [packages/core/src/mixins/withInit.ts:11](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/mixins/withInit.ts#L11)

### Type Parameters

#### Target

`Target` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\>

### Parameters

#### init

[`AtomState`](#type-aliasesatomstatemd)\<`Target`\> | (`state`) => [`AtomState`](#type-aliasesatomstatemd)\<`Target`\>

### Returns

[`Ext`](#interfacesextmd)\<`Target`\>


<a name="functionswithinithookmd"></a>

## Function: withInitHook()

> **withInitHook**\<`Target`\>(`hook`): [`Ext`](#interfacesextmd)\<`Target`\>

Defined in: [packages/core/src/mixins/withInit.ts:34](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/mixins/withInit.ts#L34)

### Type Parameters

#### Target

`Target` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\>

### Parameters

#### hook

(`initState`) => `any`

### Returns

[`Ext`](#interfacesextmd)\<`Target`\>


<a name="functionswithlifecyclehookmd"></a>

## Function: withLifecycleHook()

> **withLifecycleHook**\<`Target`\>(`cb`, `hookName`): [`Ext`](#interfacesextmd)\<`Target`\>

Defined in: [packages/core/src/mixins/withConnectHook.ts:4](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/mixins/withConnectHook.ts#L4)

### Type Parameters

#### Target

`Target` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\>

### Parameters

#### cb

(`target`) => `void`

#### hookName

`"onConnect"` | `"onDisconnect"`

### Returns

[`Ext`](#interfacesextmd)\<`Target`\>


<a name="functionswithmemomd"></a>

## Function: withMemo()

> **withMemo**\<`Target`\>(`isEqual`): [`Ext`](#interfacesextmd)\<`Target`\>

Defined in: [packages/core/src/mixins/withMemo.ts:6](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/mixins/withMemo.ts#L6)

### Type Parameters

#### Target

`Target` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\>

### Parameters

#### isEqual

(`prevState`, `nextState`) => `boolean`

### Returns

[`Ext`](#interfacesextmd)\<`Target`\>


<a name="functionswithsearchparamspersistmd"></a>

## Function: withSearchParamsPersist()

### Call Signature

> **withSearchParamsPersist**\<`T`\>(`key`, `parse?`): \<`Target`\>(`target`) => `Target`

Defined in: [packages/core/src/web/url.ts:492](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/web/url.ts#L492)

Create an atom that synchronizes with a URL search parameter.

#### Type Parameters

##### T

`T` = `string`

#### Parameters

##### key

`string`

The parameter name to synchronize with

##### parse?

(`value?`) => `T`

Function to parse string value to desired type

#### Returns

> \<`Target`\>(`target`): `Target`

##### Type Parameters

###### Target

`Target` *extends* [`Atom`](#interfacesatommd)\<`T`\>

##### Parameters

###### target

`Target`

##### Returns

`Target`

### Call Signature

> **withSearchParamsPersist**\<`T`\>(`key`, `options`): \<`Target`\>(`target`) => `Target`

Defined in: [packages/core/src/web/url.ts:508](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/web/url.ts#L508)

Create an atom that synchronizes with a URL search parameter.

#### Type Parameters

##### T

`T` = `string`

#### Parameters

##### key

`string`

Parameter name

##### options

Configuration options for the lens

###### parse?

(`value?`) => `T`

Optional function to parse the parameter string value into the desired type

###### path?

`string`

Optional path to limit the scope of synchronization to specific URL paths

###### replace?

`boolean`

Optional boolean to specify if history entries should be replaced (default: false)

###### serialize?

(`value`) => `undefined` \| `string`

Optional function to serialize the value back into a string

#### Returns

> \<`Target`\>(`target`): `Target`

##### Type Parameters

###### Target

`Target` *extends* [`Atom`](#interfacesatommd)\<`T`\>

##### Parameters

###### target

`Target`

##### Returns

`Target`


<a name="functionswithsuspensemd"></a>

## Function: withSuspense()

> **withSuspense**\<`T`\>(`__namedParameters`): [`Ext`](#interfacesextmd)\<`T`, [`SuspenseExt`](#type-aliasessuspenseextmd)\<`T`\>\>

Defined in: [packages/core/src/mixins/withSuspense.ts:49](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/mixins/withSuspense.ts#L49)

### Type Parameters

#### T

`T` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> & `Partial`\<[`SuspenseExt`](#type-aliasessuspenseextmd)\<`T`\>\>

### Parameters

#### \_\_namedParameters

##### preserve?

`boolean` = `false`

### Returns

[`Ext`](#interfacesextmd)\<`T`, [`SuspenseExt`](#type-aliasessuspenseextmd)\<`T`\>\>


<a name="globalsmd"></a>

# @reatom/core

## Classes

- [ReatomError](#classesreatomerrormd)

## Interfaces

- [AbortAtom](#interfacesabortatommd)
- [AbortError](#interfacesaborterrormd)
- [AbortExt](#interfacesabortextmd)
- [AbortMethods](#interfacesabortmethodsmd)
- [AbortVar](#interfacesabortvarmd)
- [AbstractRender](#interfacesabstractrendermd)
- [Action](#interfacesactionmd)
- [ActionState](#interfacesactionstatemd)
- [ArrayAtom](#interfacesarrayatommd)
- [AssignerExt](#interfacesassignerextmd)
- [AsyncDataExt](#interfacesasyncdataextmd)
- [AsyncDataOptions](#interfacesasyncdataoptionsmd)
- [AsyncExt](#interfacesasyncextmd)
- [Atom](#interfacesatommd)
- [AtomLike](#interfacesatomlikemd)
- [AtomMeta](#interfacesatommetamd)
- [BaseFormOptions](#interfacesbaseformoptionsmd)
- [BooleanAtom](#interfacesbooleanatommd)
- [Computed](#interfacescomputedmd)
- [Context](#interfacescontextmd)
- [ContextAtom](#interfacescontextatommd)
- [ContextFrame](#interfacescontextframemd)
- [ContextMeta](#interfacescontextmetamd)
- [Effect](#interfaceseffectmd)
- [Ext](#interfacesextmd)
- [Extend](#interfacesextendmd)
- [FetchRequestInit](#interfacesfetchrequestinitmd)
- [FieldAtom](#interfacesfieldatommd)
- [FieldFocus](#interfacesfieldfocusmd)
- [FieldLikeAtom](#interfacesfieldlikeatommd)
- [FieldOptions](#interfacesfieldoptionsmd)
- [FieldSet](#interfacesfieldsetmd)
- [FieldValidation](#interfacesfieldvalidationmd)
- [Fn](#interfacesfnmd)
- [FocusAtom](#interfacesfocusatommd)
- [Form](#interfacesformmd)
- [FormFieldOptions](#interfacesformfieldoptionsmd)
- [FormOptionsWithoutSchema](#interfacesformoptionswithoutschemamd)
- [FormOptionsWithSchema](#interfacesformoptionswithschemamd)
- [Frame](#interfacesframemd)
- [GenericExt](#interfacesgenericextmd)
- [LazyAbortController](#interfaceslazyabortcontrollermd)
- [LinkedList](#interfaceslinkedlistmd)
- [LinkedListAtom](#interfaceslinkedlistatommd)
- [LinkedListDerivedAtom](#interfaceslinkedlistderivedatommd)
- [LinkedListDerivedState](#interfaceslinkedlistderivedstatemd)
- [LinkedListLikeAtom](#interfaceslinkedlistlikeatommd)
- [MapAtom](#interfacesmapatommd)
- [Newable](#interfacesnewablemd)
- [NumberAtom](#interfacesnumberatommd)
- [ParamsExt](#interfacesparamsextmd)
- [Queue](#interfacesqueuemd)
- [RecordAtom](#interfacesrecordatommd)
- [RouteAtom](#interfacesrouteatommd)
- [SearchParamsAtom](#interfacessearchparamsatommd)
- [SetAtom](#interfacessetatommd)
- [Store](#interfacesstoremd)
- [SubmitAction](#interfacessubmitactionmd)
- [Unsubscribe](#interfacesunsubscribemd)
- [UrlAtom](#interfacesurlatommd)
- [ValidationAtom](#interfacesvalidationatommd)
- [Variable](#interfacesvariablemd)

## Type Aliases

- [Actions](#type-aliasesactionsmd)
- [ActionsExt](#type-aliasesactionsextmd)
- [ArrayFieldItem](#type-aliasesarrayfielditemmd)
- [Assign](#type-aliasesassignmd)
- [AsyncOptions](#type-aliasesasyncoptionsmd)
- [AtomState](#type-aliasesatomstatemd)
- [Constructor](#type-aliasesconstructormd)
- [DeepPartial](#type-aliasesdeeppartialmd)
- [EnumAtom](#type-aliasesenumatommd)
- [EnumAtomOptions](#type-aliasesenumatomoptionsmd)
- [EnumFormat](#type-aliasesenumformatmd)
- [EventOfTarget](#type-aliaseseventoftargetmd)
- [Falsy](#type-aliasesfalsymd)
- [FieldValidateOption](#type-aliasesfieldvalidateoptionmd)
- [FormFieldArrayAtom](#type-aliasesformfieldarrayatommd)
- [FormFieldElement](#type-aliasesformfieldelementmd)
- [FormFields](#type-aliasesformfieldsmd)
- [FormInitState](#type-aliasesforminitstatemd)
- [FormPartialState](#type-aliasesformpartialstatemd)
- [FormState](#type-aliasesformstatemd)
- [FunctionSource](#type-aliasesfunctionsourcemd)
- [GenericAction](#type-aliasesgenericactionmd)
- [LLNode](#type-aliasesllnodemd)
- [Merge](#type-aliasesmergemd)
- [Middleware](#type-aliasesmiddlewaremd)
- [OmitValues](#type-aliasesomitvaluesmd)
- [OmitValuesKeys](#type-aliasesomitvalueskeysmd)
- [OverloadParameters](#type-aliasesoverloadparametersmd)
- [Overloads](#type-aliasesoverloadsmd)
- [ParseAtoms](#type-aliasesparseatomsmd)
- [PickValues](#type-aliasespickvaluesmd)
- [PickValuesKeys](#type-aliasespickvalueskeysmd)
- [Plain](#type-aliasesplainmd)
- [Rec](#type-aliasesrecmd)
- [Shallow](#type-aliasesshallowmd)
- [StringAtom](#type-aliasesstringatommd)
- [SuspenseExt](#type-aliasessuspenseextmd)
- [UndefinedToOptional](#type-aliasesundefinedtooptionalmd)
- [UrlSearchParamsInit](#type-aliasesurlsearchparamsinitmd)
- [Values](#type-aliasesvaluesmd)

## Variables

- [abortVar](#variablesabortvarmd)
- [action](#variablesactionmd)
- [assign](#variablesassignmd)
- [atom](#variablesatommd)
- [context](#variablescontextmd)
- [createAtom](#variablescreateatommd)
- [entries](#variablesentriesmd)
- [FetchRequest](#variablesfetchrequestmd)
- [fieldInitFocus](#variablesfieldinitfocusmd)
- [fieldInitValidation](#variablesfieldinitvalidationmd)
- [fieldInitValidationLess](#variablesfieldinitvalidationlessmd)
- [keys](#variableskeysmd)
- [LL\_NEXT](#variablesll_nextmd)
- [LL\_PREV](#variablesll_prevmd)
- [MAX\_SAFE\_TIMEOUT](#variablesmax_safe_timeoutmd)
- [merge](#variablesmergemd)
- [noop](#variablesnoopmd)
- [onEvent](#variablesoneventmd)
- [onLineAtom](#variablesonlineatommd)
- [peek](#variablespeekmd)
- [rAF](#variablesrafmd)
- [random](#variablesrandommd)
- [reatomString](#variablesreatomstringmd)
- [rollback](#variablesrollbackmd)
- [searchParamsAtom](#variablessearchparamsatommd)
- [setTimeout](#variablessettimeoutmd)
- [spawn](#variablesspawnmd)
- [STACK](#variablesstackmd)
- [transactionVar](#variablestransactionvarmd)
- [urlAtom](#variablesurlatommd)
- [variable](#variablesvariablemd)
- [withAsync](#variableswithasyncmd)
- [withMiddleware](#variableswithmiddlewaremd)
- [withParams](#variableswithparamsmd)
- [withRollback](#variableswithrollbackmd)
- [withTap](#variableswithtapmd)
- [wrap](#variableswrapmd)

## Functions

- [\_copy](#functionscopymd)
- [\_enqueue](#functionsenqueuemd)
- [\_isPubsChanged](#functionsispubschangedmd)
- [\_read](#functionsreadmd)
- [actions](#functionsactionsmd)
- [addCallHook](#functionsaddcallhookmd)
- [addChangeHook](#functionsaddchangehookmd)
- [assert](#functionsassertmd)
- [assertFn](#functionsassertfnmd)
- [bind](#functionsbindmd)
- [clearStack](#functionsclearstackmd)
- [computed](#functionscomputedmd)
- [computedParams](#functionscomputedparamsmd)
- [concatTree](#functionsconcattreemd)
- [connectLogger](#functionsconnectloggermd)
- [effect](#functionseffectmd)
- [experimental\_fieldArray](#functionsexperimental_fieldarraymd)
- [extend](#functionsextendmd)
- [getStackTrace](#functionsgetstacktracemd)
- [identity](#functionsidentitymd)
- [ifCalled](#functionsifcalledmd)
- [ifChanged](#functionsifchangedmd)
- [isAbort](#functionsisabortmd)
- [isAction](#functionsisactionmd)
- [isAtom](#functionsisatommd)
- [isBrowser](#functionsisbrowsermd)
- [isCausedBy](#functionsiscausedbymd)
- [isComputed](#functionsiscomputedmd)
- [isConnected](#functionsisconnectedmd)
- [isDeepEqual](#functionsisdeepequalmd)
- [isFieldAtom](#functionsisfieldatommd)
- [isLinkedListAtom](#functionsislinkedlistatommd)
- [isObject](#functionsisobjectmd)
- [isRec](#functionsisrecmd)
- [isShallowEqual](#functionsisshallowequalmd)
- [jsonClone](#functionsjsonclonemd)
- [mock](#functionsmockmd)
- [mockRandom](#functionsmockrandommd)
- [named](#functionsnamedmd)
- [nonNullable](#functionsnonnullablemd)
- [notify](#functionsnotifymd)
- [omit](#functionsomitmd)
- [parseAtoms](#functionsparseatomsmd)
- [pick](#functionspickmd)
- [reatomAbstractRender](#functionsreatomabstractrendermd)
- [reatomArray](#functionsreatomarraymd)
- [reatomBoolean](#functionsreatombooleanmd)
- [reatomEnum](#functionsreatomenummd)
- [reatomField](#functionsreatomfieldmd)
- [reatomFieldSet](#functionsreatomfieldsetmd)
- [reatomForm](#functionsreatomformmd)
- [reatomLinkedList](#functionsreatomlinkedlistmd)
- [reatomMap](#functionsreatommapmd)
- [reatomNumber](#functionsreatomnumbermd)
- [reatomRecord](#functionsreatomrecordmd)
- [reatomSet](#functionsreatomsetmd)
- [reatomTransaction](#functionsreatomtransactionmd)
- [run](#functionsrunmd)
- [settled](#functionssettledmd)
- [sleep](#functionssleepmd)
- [suspense](#functionssuspensemd)
- [take](#functionstakemd)
- [throwAbort](#functionsthrowabortmd)
- [throwIfAborted](#functionsthrowifabortedmd)
- [toAbortError](#functionstoaborterrormd)
- [top](#functionstopmd)
- [toStringKey](#functionstostringkeymd)
- [withAbort](#functionswithabortmd)
- [withAsyncData](#functionswithasyncdatamd)
- [withCallHook](#functionswithcallhookmd)
- [withChangeHook](#functionswithchangehookmd)
- [withComputed](#functionswithcomputedmd)
- [withConnectHook](#functionswithconnecthookmd)
- [withDisconnectHook](#functionswithdisconnecthookmd)
- [withField](#functionswithfieldmd)
- [withInit](#functionswithinitmd)
- [withInitHook](#functionswithinithookmd)
- [withLifecycleHook](#functionswithlifecyclehookmd)
- [withMemo](#functionswithmemomd)
- [withSearchParamsPersist](#functionswithsearchparamspersistmd)
- [withSuspense](#functionswithsuspensemd)

# Interfaces


<a name="interfacesabortatommd"></a>

## Interface: AbortAtom()

Defined in: [packages/core/src/methods/abort.ts:65](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/methods/abort.ts#L65)

Atom-like object that tracks abort state

 AbortAtom

### Extends

- [`AtomLike`](#interfacesatomlikemd)\<`null` \| [`AbortError`](#interfacesaborterrormd), \[\] \| \[`any`\]\>.[`AbortMethods`](#interfacesabortmethodsmd)

> **AbortAtom**(...`params`): `null` \| [`AbortError`](#interfacesaborterrormd)

Defined in: [packages/core/src/methods/abort.ts:65](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/methods/abort.ts#L65)

Atom-like object that tracks abort state

 AbortAtom

### Parameters

#### params

Parameters to pass to the atom

\[\] | \[`any`\]

### Returns

`null` \| [`AbortError`](#interfacesaborterrormd)

The atom's payload (typically its current state)

### Properties

#### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#interfacesatommetamd)

Defined in: [packages/core/src/core/atom.ts:99](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L99)

Reference to the atom's internal metadata.

##### Inherited from

[`AtomLike`](#interfacesatomlikemd).[`__reatom`](#__reatom)

***

#### actions

> **actions**: [`Actions`](#type-aliasesactionsmd)\<`AbortAtom`\>

Defined in: [packages/core/src/core/atom.ts:78](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L78)

Bind methods to the atom to extend its functionality.

##### Inherited from

[`AtomLike`](#interfacesatomlikemd).[`actions`](#actions)

***

#### extend

> **extend**: [`Extend`](#interfacesextendmd)\<`AbortAtom`\>

Defined in: [packages/core/src/core/atom.ts:84](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L84)

Extension system to add capabilities to atoms.
Allows adding middleware, methods, or other functionality to modify atom behavior.

##### Inherited from

[`AtomLike`](#interfacesatomlikemd).[`extend`](#extend)

***

#### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#interfacesunsubscribemd)

Defined in: [packages/core/src/core/atom.ts:94](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L94)

Subscribe to state changes, with the first call happening immediately.
When a subscriber is added, the callback is immediately invoked with the current state.
After that, it's called whenever the atom's state changes.

##### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it changes

##### Returns

[`Unsubscribe`](#interfacesunsubscribemd)

An unsubscribe function that removes the subscription when called

##### Inherited from

[`AtomLike`](#interfacesatomlikemd).[`subscribe`](#subscribe)

### Methods

#### getController()

> **getController**(`this`): [`LazyAbortController`](#interfaceslazyabortcontrollermd)

Defined in: [packages/core/src/methods/abort.ts:42](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/methods/abort.ts#L42)

Creates and returns an AbortController connected to this abort atom

##### Parameters

###### this

`AbortAtom`

##### Returns

[`LazyAbortController`](#interfaceslazyabortcontrollermd)

An AbortController that will be aborted when the atom is aborted

##### Inherited from

[`AbortMethods`](#interfacesabortmethodsmd).[`getController`](#getcontroller)

***

#### subscribeAbort()

> **subscribeAbort**(`this`, `cb`): [`Unsubscribe`](#interfacesunsubscribemd)

Defined in: [packages/core/src/methods/abort.ts:35](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/methods/abort.ts#L35)

Subscribes a callback to be executed when the atom transitions to aborted state

##### Parameters

###### this

`AbortAtom`

###### cb

(`error`) => `void`

Callback to execute when aborted

##### Returns

[`Unsubscribe`](#interfacesunsubscribemd)

Function to unsubscribe the callback

##### Inherited from

[`AbortMethods`](#interfacesabortmethodsmd).[`subscribeAbort`](#subscribeabort)

***

#### throwIfAborted()

> **throwIfAborted**(`this`): `void`

Defined in: [packages/core/src/methods/abort.ts:27](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/methods/abort.ts#L27)

Throws the current abort error if the atom is in aborted state

##### Parameters

###### this

`AbortAtom`

##### Returns

`void`

##### Throws

If the atom is in aborted state

##### Inherited from

[`AbortMethods`](#interfacesabortmethodsmd).[`throwIfAborted`](#throwifaborted)


<a name="interfacesaborterrormd"></a>

## Interface: AbortError

Defined in: [packages/core/src/utils.ts:623](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/utils.ts#L623)

Interface extending DOMException for abort-specific error handling.
Used to represent errors triggered by AbortController signal aborts.

### See

https://developer.mozilla.org/en-US/docs/Web/API/AbortController

### Extends

- `DOMException`

### Properties

#### name

> **name**: `"AbortError"`

Defined in: [packages/core/src/utils.ts:624](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/utils.ts#L624)

[MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMException/name)

##### Overrides

`DOMException.name`


<a name="interfacesabortextmd"></a>

## Interface: AbortExt

Defined in: [packages/core/src/mixins/withAbort.ts:6](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/mixins/withAbort.ts#L6)

### Extended by

- [`AsyncDataExt`](#interfacesasyncdataextmd)

### Properties

#### abort()

> **abort**: (`reason?`) => `void`

Defined in: [packages/core/src/mixins/withAbort.ts:7](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/mixins/withAbort.ts#L7)

##### Parameters

###### reason?

`any`

##### Returns

`void`


<a name="interfacesabortmethodsmd"></a>

## Interface: AbortMethods

Defined in: [packages/core/src/methods/abort.ts:21](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/methods/abort.ts#L21)

Interface containing methods for abort handling in Reatom

 AbortMethods

### Extended by

- [`AbortAtom`](#interfacesabortatommd)

### Methods

#### getController()

> **getController**(`this`): [`LazyAbortController`](#interfaceslazyabortcontrollermd)

Defined in: [packages/core/src/methods/abort.ts:42](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/methods/abort.ts#L42)

Creates and returns an AbortController connected to this abort atom

##### Parameters

###### this

[`AbortAtom`](#interfacesabortatommd)

##### Returns

[`LazyAbortController`](#interfaceslazyabortcontrollermd)

An AbortController that will be aborted when the atom is aborted

***

#### subscribeAbort()

> **subscribeAbort**(`this`, `cb`): [`Unsubscribe`](#interfacesunsubscribemd)

Defined in: [packages/core/src/methods/abort.ts:35](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/methods/abort.ts#L35)

Subscribes a callback to be executed when the atom transitions to aborted state

##### Parameters

###### this

[`AbortAtom`](#interfacesabortatommd)

###### cb

(`error`) => `void`

Callback to execute when aborted

##### Returns

[`Unsubscribe`](#interfacesunsubscribemd)

Function to unsubscribe the callback

***

#### throwIfAborted()

> **throwIfAborted**(`this`): `void`

Defined in: [packages/core/src/methods/abort.ts:27](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/methods/abort.ts#L27)

Throws the current abort error if the atom is in aborted state

##### Parameters

###### this

[`AbortAtom`](#interfacesabortatommd)

##### Returns

`void`

##### Throws

If the atom is in aborted state


<a name="interfacesabortvarmd"></a>

## Interface: AbortVar

Defined in: [packages/core/src/methods/abort.ts:75](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/methods/abort.ts#L75)

Interface for a global abort variable tied to the current frame

 AbortVar

### Extends

- [`Variable`](#interfacesvariablemd)\<\[`string` \| [`AbortAtom`](#interfacesabortatommd)\], [`AbortAtom`](#interfacesabortatommd)\>

### Methods

#### abort()

> **abort**(`reason?`): `void`

Defined in: [packages/core/src/methods/abort.ts:104](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/methods/abort.ts#L104)

Aborts the current frame with an optional reason

##### Parameters

###### reason?

`unknown`

Optional reason for aborting

##### Returns

`void`

***

#### find()

> **find**\<`T`\>(`cb?`, `frame?`): `undefined` \| `T`

Defined in: [packages/core/src/methods/variable.ts:48](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/methods/variable.ts#L48)

Traverses the frame tree to find and map the variable value.

##### Type Parameters

###### T

`T` = [`AbortAtom`](#interfacesabortatommd)

Return type of the callback

##### Parameters

###### cb?

(`value`) => `undefined` \| `T`

Optional transformation callback

###### frame?

[`Frame`](#interfacesframemd)\<`any`, `any`[], `any`\>

Optional frame to check (defaults to current top frame)

##### Returns

`undefined` \| `T`

The transformed value or undefined if not found

##### Inherited from

[`Variable`](#interfacesvariablemd).[`find`](#find)

***

#### get()

> **get**(`frame?`): [`AbortAtom`](#interfacesabortatommd)

Defined in: [packages/core/src/methods/variable.ts:22](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/methods/variable.ts#L22)

Gets the current value of the variable

##### Parameters

###### frame?

[`Frame`](#interfacesframemd)\<`any`, `any`[], `any`\>

Optional frame to check (defaults to current top frame)

##### Returns

[`AbortAtom`](#interfacesabortatommd)

The current value

##### Throws

If the variable is not found in the frame tree

##### Inherited from

[`Variable`](#interfacesvariablemd).[`get`](#get)

***

#### getController()

> **getController**(): `undefined` \| `AbortController`

Defined in: [packages/core/src/methods/abort.ts:97](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/methods/abort.ts#L97)

Creates and returns an AbortController connected to the current frame

##### Returns

`undefined` \| `AbortController`

An AbortController or undefined if no abort atom available

***

#### has()

> **has**(`frame?`): `boolean`

Defined in: [packages/core/src/methods/variable.ts:38](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/methods/variable.ts#L38)

Checks if the variable exists in the current stack

##### Parameters

###### frame?

[`Frame`](#interfacesframemd)\<`any`, `any`[], `any`\>

Optional frame to check (defaults to current top frame)

##### Returns

`boolean`

True if the variable exists in the context

##### Inherited from

[`Variable`](#interfacesvariablemd).[`has`](#has)

***

#### run()

> **run**\<`T`\>(`value`, `fn`): `T`

Defined in: [packages/core/src/methods/variable.ts:61](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/methods/variable.ts#L61)

Runs a function with new variable value

##### Type Parameters

###### T

`T`

Return type of the function

##### Parameters

###### value

[`AbortAtom`](#interfacesabortatommd)

The temporary value to set

###### fn

() => `T`

Function to execute with the temporary value

##### Returns

`T`

The result of the function

##### Inherited from

[`Variable`](#interfacesvariablemd).[`run`](#run)

***

#### set()

> **set**(...`params`): [`AbortAtom`](#interfacesabortatommd)

Defined in: [packages/core/src/methods/variable.ts:30](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/methods/variable.ts#L30)

Sets a new value for the variable

##### Parameters

###### params

...\[`string` \| [`AbortAtom`](#interfacesabortatommd)\]

Parameters passed to the setter function

##### Returns

[`AbortAtom`](#interfacesabortatommd)

The new value

##### Inherited from

[`Variable`](#interfacesvariablemd).[`set`](#set)

***

#### subscribeAbort()

> **subscribeAbort**(`cb`): `undefined` \| [`Unsubscribe`](#interfacesunsubscribemd)

Defined in: [packages/core/src/methods/abort.ts:90](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/methods/abort.ts#L90)

Subscribes a callback to be executed when the current frame is aborted

##### Parameters

###### cb

(`error`) => `void`

Callback to execute when aborted

##### Returns

`undefined` \| [`Unsubscribe`](#interfacesunsubscribemd)

Function to unsubscribe the callback or undefined if no abort atom available

***

#### throwIfAborted()

> **throwIfAborted**(): `void`

Defined in: [packages/core/src/methods/abort.ts:82](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/methods/abort.ts#L82)

Throws if the current frame is aborted

##### Returns

`void`

##### Throws

If the current frame is aborted


<a name="interfacesabstractrendermd"></a>

## Interface: AbstractRender\<Props, Result\>

Defined in: [packages/core/src/reatomAbstractRender.ts:13](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/reatomAbstractRender.ts#L13)

Interface representing an abstract renderer for connecting Reatom with other reactive systems.
Provides methods to render content with given props and manage the lifecycle through mounting.

### Type Parameters

#### Props

`Props`

The type of props/parameters that the renderer accepts

#### Result

`Result`

The type of result produced by the render operation

### Properties

#### mount()

> **mount**: () => [`Unsubscribe`](#interfacesunsubscribemd)

Defined in: [packages/core/src/reatomAbstractRender.ts:27](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/reatomAbstractRender.ts#L27)

Mounts the renderer, setting up subscriptions and event handling

##### Returns

[`Unsubscribe`](#interfacesunsubscribemd)

- Function to unmount and clean up resources

***

#### render()

> **render**: (`props`) => `object`

Defined in: [packages/core/src/reatomAbstractRender.ts:20](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/reatomAbstractRender.ts#L20)

Renders content using the provided props

##### Parameters

###### props

`Props`

The properties used for rendering

##### Returns

`object`

- Object containing the render result

###### result

> **result**: `Result`


<a name="interfacesactionmd"></a>

## Interface: Action()\<Params, Payload\>

Defined in: [packages/core/src/core/action.ts:18](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/action.ts#L18)

Logic container with atom features

### Extends

- [`AtomLike`](#interfacesatomlikemd)\<[`ActionState`](#interfacesactionstatemd)\<`Params`, `Payload`\>, `Params`, `Payload`\>

### Extended by

- [`SubmitAction`](#interfacessubmitactionmd)

### Type Parameters

#### Params

`Params` *extends* `any`[] = `any`[]

#### Payload

`Payload` = `any`

> **Action**(...`params`): `Payload`

Defined in: [packages/core/src/core/action.ts:18](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/action.ts#L18)

Logic container with atom features

### Parameters

#### params

...`Params`

Parameters to pass to the atom

### Returns

`Payload`

The atom's payload (typically its current state)

### Properties

#### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#interfacesatommetamd)

Defined in: [packages/core/src/core/atom.ts:99](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L99)

Reference to the atom's internal metadata.

##### Inherited from

[`AtomLike`](#interfacesatomlikemd).[`__reatom`](#__reatom)

***

#### actions

> **actions**: [`Actions`](#type-aliasesactionsmd)\<`Action`\<`Params`, `Payload`\>\>

Defined in: [packages/core/src/core/atom.ts:78](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L78)

Bind methods to the atom to extend its functionality.

##### Inherited from

[`AtomLike`](#interfacesatomlikemd).[`actions`](#actions)

***

#### extend

> **extend**: [`Extend`](#interfacesextendmd)\<`Action`\<`Params`, `Payload`\>\>

Defined in: [packages/core/src/core/atom.ts:84](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L84)

Extension system to add capabilities to atoms.
Allows adding middleware, methods, or other functionality to modify atom behavior.

##### Inherited from

[`AtomLike`](#interfacesatomlikemd).[`extend`](#extend)

***

#### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#interfacesunsubscribemd)

Defined in: [packages/core/src/core/atom.ts:94](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L94)

Subscribe to state changes, with the first call happening immediately.
When a subscriber is added, the callback is immediately invoked with the current state.
After that, it's called whenever the atom's state changes.

##### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it changes

##### Returns

[`Unsubscribe`](#interfacesunsubscribemd)

An unsubscribe function that removes the subscription when called

##### Inherited from

[`AtomLike`](#interfacesatomlikemd).[`subscribe`](#subscribe)


<a name="interfacesactionstatemd"></a>

## Interface: ActionState\<Params, Payload\>

Defined in: [packages/core/src/core/action.ts:14](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/action.ts#L14)

Autoclearable array of processed events

### Extends

- `Array`\<\{ `params`: `Params`; `payload`: `Payload`; \}\>

### Type Parameters

#### Params

`Params` *extends* `any`[] = `any`[]

#### Payload

`Payload` = `any`

### Indexable

\[`n`: `number`\]: `object`


<a name="interfacesarrayatommd"></a>

## Interface: ArrayAtom()\<T\>

Defined in: [packages/core/src/primitives/reatomArray.ts:3](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomArray.ts#L3)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

### Extends

- [`Atom`](#interfacesatommd)\<`T`[]\>

### Type Parameters

#### T

`T`

The type of state stored in the atom

### Call Signature

> **ArrayAtom**(`update`): `T`[]

Defined in: [packages/core/src/primitives/reatomArray.ts:3](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomArray.ts#L3)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Parameters

##### update

(`state`) => `T`[]

Function that takes the current state and returns a new state

#### Returns

`T`[]

The new state value

### Call Signature

> **ArrayAtom**(`newState`): `T`[]

Defined in: [packages/core/src/primitives/reatomArray.ts:3](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomArray.ts#L3)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Parameters

##### newState

`T`[]

The new state value

#### Returns

`T`[]

The new state value

### Call Signature

> **ArrayAtom**(...`params`): `T`[]

Defined in: [packages/core/src/primitives/reatomArray.ts:3](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomArray.ts#L3)

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

### Properties

#### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#interfacesatommetamd)

Defined in: [packages/core/src/core/atom.ts:99](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L99)

Reference to the atom's internal metadata.

##### Inherited from

[`Atom`](#interfacesatommd).[`__reatom`](#__reatom)

***

#### actions

> **actions**: [`Actions`](#type-aliasesactionsmd)\<`ArrayAtom`\<`T`\>\>

Defined in: [packages/core/src/core/atom.ts:78](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L78)

Bind methods to the atom to extend its functionality.

##### Inherited from

[`Atom`](#interfacesatommd).[`actions`](#actions)

***

#### extend

> **extend**: [`Extend`](#interfacesextendmd)\<`ArrayAtom`\<`T`\>\>

Defined in: [packages/core/src/core/atom.ts:84](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L84)

Extension system to add capabilities to atoms.
Allows adding middleware, methods, or other functionality to modify atom behavior.

##### Inherited from

[`Atom`](#interfacesatommd).[`extend`](#extend)

***

#### pop

> **pop**: [`Action`](#interfacesactionmd)\<\[\], `undefined` \| `T`\>

Defined in: [packages/core/src/primitives/reatomArray.ts:5](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomArray.ts#L5)

***

#### push

> **push**: [`Action`](#interfacesactionmd)\<`T`[], `number`\>

Defined in: [packages/core/src/primitives/reatomArray.ts:4](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomArray.ts#L4)

***

#### shift

> **shift**: [`Action`](#interfacesactionmd)\<\[\], `undefined` \| `T`\>

Defined in: [packages/core/src/primitives/reatomArray.ts:6](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomArray.ts#L6)

***

#### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#interfacesunsubscribemd)

Defined in: [packages/core/src/core/atom.ts:94](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L94)

Subscribe to state changes, with the first call happening immediately.
When a subscriber is added, the callback is immediately invoked with the current state.
After that, it's called whenever the atom's state changes.

##### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it changes

##### Returns

[`Unsubscribe`](#interfacesunsubscribemd)

An unsubscribe function that removes the subscription when called

##### Inherited from

[`Atom`](#interfacesatommd).[`subscribe`](#subscribe)

***

#### unshift

> **unshift**: [`Action`](#interfacesactionmd)\<`T`[], `number`\>

Defined in: [packages/core/src/primitives/reatomArray.ts:7](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomArray.ts#L7)


<a name="interfacesassignerextmd"></a>

## Interface: AssignerExt()\<Methods, Target\>

Defined in: [packages/core/src/core/extend.ts:39](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/extend.ts#L39)

Extension that assigns additional methods to an atom/action.

This extension type is used for adding methods or properties to atoms or actions
without modifying their core behavior.

### Type Parameters

#### Methods

`Methods` *extends* [`Rec`](#type-aliasesrecmd) = \{ \}

Record of methods/properties to be added to the target

#### Target

`Target` *extends* [`AtomLike`](#interfacesatomlikemd) = [`AtomLike`](#interfacesatomlikemd)

The type of atom or action the extension can be applied to

> **AssignerExt**\<`T`\>(`target`): `Methods`

Defined in: [packages/core/src/core/extend.ts:43](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/extend.ts#L43)

Extension that assigns additional methods to an atom/action.

This extension type is used for adding methods or properties to atoms or actions
without modifying their core behavior.

### Type Parameters

#### T

`T` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\>

### Parameters

#### target

`T`

### Returns

`Methods`


<a name="interfacesasyncdataextmd"></a>

## Interface: AsyncDataExt\<Params, Payload, State, Error\>

Defined in: [packages/core/src/async/withAsyncData.ts:16](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/async/withAsyncData.ts#L16)

Extension interface added by [withAsyncData](#functionswithasyncdatamd) to atoms or actions that return promises.
Extends [AsyncExt](#interfacesasyncextmd) with data storage and abort capabilities for managing async data fetching.

### Extends

- [`AsyncExt`](#interfacesasyncextmd)\<`Params`, `Payload`, `Error`\>.[`AbortExt`](#interfacesabortextmd)

### Type Parameters

#### Params

`Params` *extends* `any`[] = `any`[]

The parameter types of the original atom or action

#### Payload

`Payload` = `any`

The resolved value type of the promise

#### State

`State` = `any`

The type of the stored data

#### Error

`Error` = `any`

The type of errors that can be caught

### Properties

#### abort()

> **abort**: (`reason?`) => `void`

Defined in: [packages/core/src/mixins/withAbort.ts:7](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/mixins/withAbort.ts#L7)

##### Parameters

###### reason?

`any`

##### Returns

`void`

##### Inherited from

[`AbortExt`](#interfacesabortextmd).[`abort`](#abort)

***

#### data

> **data**: [`Atom`](#interfacesatommd)\<`State`\>

Defined in: [packages/core/src/async/withAsyncData.ts:27](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/async/withAsyncData.ts#L27)

Atom that stores the fetched data
Updated automatically when the async operation completes successfully

***

#### error

> **error**: [`Atom`](#interfacesatommd)\<`undefined` \| `Error`\>

Defined in: [packages/core/src/async/withAsync.ts:80](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/async/withAsync.ts#L80)

Atom containing the most recent error or undefined if no error has occurred

##### Inherited from

[`AsyncExt`](#interfacesasyncextmd).[`error`](#error-1)

***

#### onFulfill

> **onFulfill**: [`Action`](#interfacesactionmd)\<\[`Payload`, `Params`\], \{ `params`: `Params`; `payload`: `Payload`; \}\>

Defined in: [packages/core/src/async/withAsync.ts:45](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/async/withAsync.ts#L45)

Action that is called when the promise resolves successfully

##### Param

The resolved value from the promise

##### Param

The original parameters passed to the atom/action

##### Returns

An object containing the payload and parameters

##### Inherited from

[`AsyncExt`](#interfacesasyncextmd).[`onFulfill`](#onfulfill)

***

#### onReject

> **onReject**: [`Action`](#interfacesactionmd)\<\[`Error`, `Params`\], \{ `error`: `Error`; `params`: `Params`; \}\>

Defined in: [packages/core/src/async/withAsync.ts:56](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/async/withAsync.ts#L56)

Action that is called when the promise rejects with an error

##### Param

The error thrown by the promise

##### Param

The original parameters passed to the atom/action

##### Returns

An object containing the error and parameters

##### Inherited from

[`AsyncExt`](#interfacesasyncextmd).[`onReject`](#onreject)

***

#### onSettle

> **onSettle**: [`Action`](#interfacesactionmd)\<\[\{ `params`: `Params`; `payload`: `Payload`; \} \| \{ `error`: `Error`; `params`: `Params`; \}\], \{ `params`: `Params`; `payload`: `Payload`; \} \| \{ `error`: `Error`; `params`: `Params`; \}\>

Defined in: [packages/core/src/async/withAsync.ts:66](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/async/withAsync.ts#L66)

Action called after either successful resolution or rejection

##### Param

Either a payload+params object or an error+params object

##### Returns

The same result object that was passed in

##### Inherited from

[`AsyncExt`](#interfacesasyncextmd).[`onSettle`](#onsettle)

***

#### pending

> **pending**: [`Computed`](#interfacescomputedmd)\<`number`\>

Defined in: [packages/core/src/async/withAsync.ts:75](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/async/withAsync.ts#L75)

Computed atom tracking how many async operations are currently pending

##### Returns

Number of pending operations (0 when none are pending)

##### Inherited from

[`AsyncExt`](#interfacesasyncextmd).[`pending`](#pending)

***

#### ready

> **ready**: [`Computed`](#interfacescomputedmd)\<`boolean`\>

Defined in: [packages/core/src/async/withAsync.ts:37](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/async/withAsync.ts#L37)

Computed atom that indicates when no async operations are pending

##### Returns

Boolean indicating if all operations have completed (true) or some are still pending (false)

##### Inherited from

[`AsyncExt`](#interfacesasyncextmd).[`ready`](#ready)

***

#### retry

> **retry**: [`Action`](#interfacesactionmd)\<`Params`, `Promise`\<`Payload`\>\>

Defined in: [packages/core/src/async/withAsync.ts:82](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/async/withAsync.ts#L82)

##### Inherited from

[`AsyncExt`](#interfacesasyncextmd).[`retry`](#retry)


<a name="interfacesasyncdataoptionsmd"></a>

## Interface: AsyncDataOptions\<State, Params, Payload, Err, EmptyErr\>

Defined in: [packages/core/src/async/withAsyncData.ts:40](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/async/withAsyncData.ts#L40)

Configuration options for the [withAsyncData](#functionswithasyncdatamd) extension
Extends [AsyncOptions](#type-aliasesasyncoptionsmd) with options specific to data management

### Extends

- [`AsyncOptions`](#type-aliasesasyncoptionsmd)\<`Err`, `EmptyErr`\>

### Type Parameters

#### State

`State` = `any`

The type of data to store

#### Params

`Params` *extends* `any`[] = `any`[]

The parameter types of the original atom or action

#### Payload

`Payload` = `any`

The resolved value type of the promise

#### Err

`Err` = `Error`

The type of errors after parsing

#### EmptyErr

`EmptyErr` = `undefined`

The type of the empty error state

### Properties

#### emptyError?

> `optional` **emptyError**: `EmptyErr`

Defined in: [packages/core/src/async/withAsync.ts:102](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/async/withAsync.ts#L102)

Initial/reset value for the error atom

##### Inherited from

[`AsyncOptions`](#type-aliasesasyncoptionsmd).[`emptyError`](#emptyerror)

***

#### initState?

> `optional` **initState**: `State`

Defined in: [packages/core/src/async/withAsyncData.ts:50](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/async/withAsyncData.ts#L50)

Initial value for the data atom

***

#### mapPayload()?

> `optional` **mapPayload**: (`payload`, `params`, `state`) => `State`

Defined in: [packages/core/src/async/withAsyncData.ts:59](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/async/withAsyncData.ts#L59)

Function to transform the successful payload into the data state

##### Parameters

###### payload

`Payload`

The resolved value from the promise

###### params

`Params`

The original parameters passed to the atom/action

###### state

`State`

The current state of the data atom

##### Returns

`State`

The new state for the data atom

***

#### parseError()?

> `optional` **parseError**: (`error`) => `Err`

Defined in: [packages/core/src/async/withAsync.ts:97](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/async/withAsync.ts#L97)

Function to transform raw errors into a specific error type

##### Parameters

###### error

`unknown`

The caught error of unknown type

##### Returns

`Err`

A properly typed error object

##### Inherited from

[`AsyncOptions`](#type-aliasesasyncoptionsmd).[`parseError`](#parseerror)

***

#### resetError?

> `optional` **resetError**: `null` \| `"onCall"` \| `"onFulfill"`

Defined in: [packages/core/src/async/withAsync.ts:110](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/async/withAsync.ts#L110)

When to reset the error state
- 'onCall': Reset error when the async operation starts (default)
- 'onFulfill': Reset error only when the operation succeeds
- null: Never automatically reset errors

##### Inherited from

[`AsyncOptions`](#type-aliasesasyncoptionsmd).[`resetError`](#reseterror)


<a name="interfacesasyncextmd"></a>

## Interface: AsyncExt\<Params, Payload, Error\>

Defined in: [packages/core/src/async/withAsync.ts:28](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/async/withAsync.ts#L28)

Extension interface added by [withAsync](#variableswithasyncmd) to atoms or actions that return promises.
Provides utilities for tracking async state, handling errors, and responding to async events.

### Extended by

- [`AsyncDataExt`](#interfacesasyncdataextmd)

### Type Parameters

#### Params

`Params` *extends* `any`[] = `any`[]

The parameter types of the original atom or action

#### Payload

`Payload` = `any`

The resolved value type of the promise

#### Error

`Error` = `any`

The type of errors that can be caught

### Properties

#### error

> **error**: [`Atom`](#interfacesatommd)\<`undefined` \| `Error`\>

Defined in: [packages/core/src/async/withAsync.ts:80](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/async/withAsync.ts#L80)

Atom containing the most recent error or undefined if no error has occurred

***

#### onFulfill

> **onFulfill**: [`Action`](#interfacesactionmd)\<\[`Payload`, `Params`\], \{ `params`: `Params`; `payload`: `Payload`; \}\>

Defined in: [packages/core/src/async/withAsync.ts:45](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/async/withAsync.ts#L45)

Action that is called when the promise resolves successfully

##### Param

The resolved value from the promise

##### Param

The original parameters passed to the atom/action

##### Returns

An object containing the payload and parameters

***

#### onReject

> **onReject**: [`Action`](#interfacesactionmd)\<\[`Error`, `Params`\], \{ `error`: `Error`; `params`: `Params`; \}\>

Defined in: [packages/core/src/async/withAsync.ts:56](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/async/withAsync.ts#L56)

Action that is called when the promise rejects with an error

##### Param

The error thrown by the promise

##### Param

The original parameters passed to the atom/action

##### Returns

An object containing the error and parameters

***

#### onSettle

> **onSettle**: [`Action`](#interfacesactionmd)\<\[\{ `params`: `Params`; `payload`: `Payload`; \} \| \{ `error`: `Error`; `params`: `Params`; \}\], \{ `params`: `Params`; `payload`: `Payload`; \} \| \{ `error`: `Error`; `params`: `Params`; \}\>

Defined in: [packages/core/src/async/withAsync.ts:66](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/async/withAsync.ts#L66)

Action called after either successful resolution or rejection

##### Param

Either a payload+params object or an error+params object

##### Returns

The same result object that was passed in

***

#### pending

> **pending**: [`Computed`](#interfacescomputedmd)\<`number`\>

Defined in: [packages/core/src/async/withAsync.ts:75](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/async/withAsync.ts#L75)

Computed atom tracking how many async operations are currently pending

##### Returns

Number of pending operations (0 when none are pending)

***

#### ready

> **ready**: [`Computed`](#interfacescomputedmd)\<`boolean`\>

Defined in: [packages/core/src/async/withAsync.ts:37](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/async/withAsync.ts#L37)

Computed atom that indicates when no async operations are pending

##### Returns

Boolean indicating if all operations have completed (true) or some are still pending (false)

***

#### retry

> **retry**: [`Action`](#interfacesactionmd)\<`Params`, `Promise`\<`Payload`\>\>

Defined in: [packages/core/src/async/withAsync.ts:82](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/async/withAsync.ts#L82)


<a name="interfacesatommd"></a>

## Interface: Atom()\<State\>

Defined in: [packages/core/src/core/atom.ts:111](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L111)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

### Extends

- [`AtomLike`](#interfacesatomlikemd)\<`State`, \[\]\>

### Extended by

- [`FieldLikeAtom`](#interfacesfieldlikeatommd)
- [`ArrayAtom`](#interfacesarrayatommd)
- [`BooleanAtom`](#interfacesbooleanatommd)
- [`MapAtom`](#interfacesmapatommd)
- [`LinkedListLikeAtom`](#interfaceslinkedlistlikeatommd)
- [`NumberAtom`](#interfacesnumberatommd)
- [`RecordAtom`](#interfacesrecordatommd)
- [`SetAtom`](#interfacessetatommd)
- [`UrlAtom`](#interfacesurlatommd)

### Type Parameters

#### State

`State` = `any`

The type of state stored in the atom

### Call Signature

> **Atom**(`update`): `State`

Defined in: [packages/core/src/core/atom.ts:117](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L117)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Parameters

##### update

(`state`) => `State`

Function that takes the current state and returns a new state

#### Returns

`State`

The new state value

### Call Signature

> **Atom**(`newState`): `State`

Defined in: [packages/core/src/core/atom.ts:124](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L124)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Parameters

##### newState

`State`

The new state value

#### Returns

`State`

The new state value

### Call Signature

> **Atom**(...`params`): `State`

Defined in: [packages/core/src/core/atom.ts:111](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L111)

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

### Properties

#### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#interfacesatommetamd)

Defined in: [packages/core/src/core/atom.ts:99](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L99)

Reference to the atom's internal metadata.

##### Inherited from

[`AtomLike`](#interfacesatomlikemd).[`__reatom`](#__reatom)

***

#### actions

> **actions**: [`Actions`](#type-aliasesactionsmd)\<`Atom`\<`State`\>\>

Defined in: [packages/core/src/core/atom.ts:78](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L78)

Bind methods to the atom to extend its functionality.

##### Inherited from

[`AtomLike`](#interfacesatomlikemd).[`actions`](#actions)

***

#### extend

> **extend**: [`Extend`](#interfacesextendmd)\<`Atom`\<`State`\>\>

Defined in: [packages/core/src/core/atom.ts:84](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L84)

Extension system to add capabilities to atoms.
Allows adding middleware, methods, or other functionality to modify atom behavior.

##### Inherited from

[`AtomLike`](#interfacesatomlikemd).[`extend`](#extend)

***

#### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#interfacesunsubscribemd)

Defined in: [packages/core/src/core/atom.ts:94](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L94)

Subscribe to state changes, with the first call happening immediately.
When a subscriber is added, the callback is immediately invoked with the current state.
After that, it's called whenever the atom's state changes.

##### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it changes

##### Returns

[`Unsubscribe`](#interfacesunsubscribemd)

An unsubscribe function that removes the subscription when called

##### Inherited from

[`AtomLike`](#interfacesatomlikemd).[`subscribe`](#subscribe)


<a name="interfacesatomlikemd"></a>

## Interface: AtomLike()\<State, Params, Payload\>

Defined in: [packages/core/src/core/atom.ts:62](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L62)

Base atom interface for other userspace implementations.
This is the core interface that all atom-like objects implement,
providing the foundation for Reatom's reactivity system.

### Extended by

- [`Atom`](#interfacesatommd)
- [`Computed`](#interfacescomputedmd)
- [`ContextAtom`](#interfacescontextatommd)
- [`Action`](#interfacesactionmd)
- [`FocusAtom`](#interfacesfocusatommd)
- [`ValidationAtom`](#interfacesvalidationatommd)
- [`AbortAtom`](#interfacesabortatommd)

### Type Parameters

#### State

`State` = `any`

The type of state stored in the atom

#### Params

`Params` *extends* `any`[] = `any`[]

The parameter types the atom accepts when called

#### Payload

`Payload` = `State`

The return type when the atom is called

> **AtomLike**(...`params`): `Payload`

Defined in: [packages/core/src/core/atom.ts:73](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L73)

Base atom interface for other userspace implementations.
This is the core interface that all atom-like objects implement,
providing the foundation for Reatom's reactivity system.

### Parameters

#### params

...`Params`

Parameters to pass to the atom

### Returns

`Payload`

The atom's payload (typically its current state)

### Properties

#### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#interfacesatommetamd)

Defined in: [packages/core/src/core/atom.ts:99](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L99)

Reference to the atom's internal metadata.

***

#### actions

> **actions**: [`Actions`](#type-aliasesactionsmd)\<`AtomLike`\<`State`, `Params`, `Payload`\>\>

Defined in: [packages/core/src/core/atom.ts:78](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L78)

Bind methods to the atom to extend its functionality.

***

#### extend

> **extend**: [`Extend`](#interfacesextendmd)\<`AtomLike`\<`State`, `Params`, `Payload`\>\>

Defined in: [packages/core/src/core/atom.ts:84](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L84)

Extension system to add capabilities to atoms.
Allows adding middleware, methods, or other functionality to modify atom behavior.

***

#### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#interfacesunsubscribemd)

Defined in: [packages/core/src/core/atom.ts:94](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L94)

Subscribe to state changes, with the first call happening immediately.
When a subscriber is added, the callback is immediately invoked with the current state.
After that, it's called whenever the atom's state changes.

##### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it changes

##### Returns

[`Unsubscribe`](#interfacesunsubscribemd)

An unsubscribe function that removes the subscription when called


<a name="interfacesatommetamd"></a>

## Interface: AtomMeta

Defined in: [packages/core/src/core/atom.ts:11](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L11)

Metadata associated with an atom instance that controls its behavior and lifecycle.
This interface is used internally by the Reatom framework and should not be
accessed directly in application code.

### Properties

#### initState

> `readonly` **initState**: `any`

Defined in: [packages/core/src/core/atom.ts:21](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L21)

The initial state of the atom.

***

#### middlewares

> `readonly` **middlewares**: (`next`, ...`params`) => `any`[]

Defined in: [packages/core/src/core/atom.ts:26](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L26)

Array of middleware functions that intercept and potentially transform atom operations.

##### Parameters

###### next

[`Fn`](#interfacesfnmd)

###### params

...`any`[]

##### Returns

`any`

***

#### onConnect

> **onConnect**: `undefined` \| [`Fn`](#interfacesfnmd)

Defined in: [packages/core/src/core/atom.ts:45](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L45)

Function called when the atom gains its first subscriber.

***

#### onDisconnect

> **onDisconnect**: `undefined` \| [`Fn`](#interfacesfnmd)

Defined in: [packages/core/src/core/atom.ts:50](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L50)

Function called when the atom loses its last subscriber.

***

#### reactive

> `readonly` **reactive**: `boolean`

Defined in: [packages/core/src/core/atom.ts:16](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L16)

Indicates whether the atom is reactive.
Set to false for actions or the context atom.


<a name="interfacesbaseformoptionsmd"></a>

## Interface: BaseFormOptions

Defined in: [packages/core/src/form/src/reatomForm.ts:129](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L129)

### Extended by

- [`FormOptionsWithSchema`](#interfacesformoptionswithschemamd)
- [`FormOptionsWithoutSchema`](#interfacesformoptionswithoutschemamd)

### Properties

#### keepErrorDuringValidating?

> `optional` **keepErrorDuringValidating**: `boolean`

Defined in: [packages/core/src/form/src/reatomForm.ts:139](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L139)

Defines the default reset behavior of the validation state during async validation for all fields.

##### Default

```ts
false
```

***

#### keepErrorOnChange?

> `optional` **keepErrorOnChange**: `boolean`

Defined in: [packages/core/src/form/src/reatomForm.ts:146](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L146)

Defines the default reset behavior of the validation state on field change for all fields.
Useful if the validation is triggered on blur or submit only.

##### Default

```ts
!validateOnChange
```

***

#### name?

> `optional` **name**: `string`

Defined in: [packages/core/src/form/src/reatomForm.ts:130](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L130)

***

#### resetOnSubmit?

> `optional` **resetOnSubmit**: `boolean`

Defined in: [packages/core/src/form/src/reatomForm.ts:133](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L133)

Should reset the state after success submit?

##### Default

```ts
true
```

***

#### validateOnBlur?

> `optional` **validateOnBlur**: `boolean`

Defined in: [packages/core/src/form/src/reatomForm.ts:158](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L158)

Defines if the validation should be triggered on the field blur by default for all fields.

##### Default

```ts
false
```

***

#### validateOnChange?

> `optional` **validateOnChange**: `boolean`

Defined in: [packages/core/src/form/src/reatomForm.ts:152](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L152)

Defines if the validation should be triggered with every field change by default for all fields.

##### Default

```ts
false
```


<a name="interfacesbooleanatommd"></a>

## Interface: BooleanAtom()

Defined in: [packages/core/src/primitives/reatomBoolean.ts:3](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomBoolean.ts#L3)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

### Extends

- [`Atom`](#interfacesatommd)\<`boolean`\>

### Call Signature

> **BooleanAtom**(`update`): `boolean`

Defined in: [packages/core/src/primitives/reatomBoolean.ts:3](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomBoolean.ts#L3)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Parameters

##### update

(`state`) => `boolean`

Function that takes the current state and returns a new state

#### Returns

`boolean`

The new state value

### Call Signature

> **BooleanAtom**(`newState`): `boolean`

Defined in: [packages/core/src/primitives/reatomBoolean.ts:3](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomBoolean.ts#L3)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Parameters

##### newState

`boolean`

The new state value

#### Returns

`boolean`

The new state value

### Call Signature

> **BooleanAtom**(...`params`): `boolean`

Defined in: [packages/core/src/primitives/reatomBoolean.ts:3](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomBoolean.ts#L3)

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

### Properties

#### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#interfacesatommetamd)

Defined in: [packages/core/src/core/atom.ts:99](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L99)

Reference to the atom's internal metadata.

##### Inherited from

[`Atom`](#interfacesatommd).[`__reatom`](#__reatom)

***

#### actions

> **actions**: [`Actions`](#type-aliasesactionsmd)\<`BooleanAtom`\>

Defined in: [packages/core/src/core/atom.ts:78](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L78)

Bind methods to the atom to extend its functionality.

##### Inherited from

[`Atom`](#interfacesatommd).[`actions`](#actions)

***

#### extend

> **extend**: [`Extend`](#interfacesextendmd)\<`BooleanAtom`\>

Defined in: [packages/core/src/core/atom.ts:84](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L84)

Extension system to add capabilities to atoms.
Allows adding middleware, methods, or other functionality to modify atom behavior.

##### Inherited from

[`Atom`](#interfacesatommd).[`extend`](#extend)

***

#### reset

> **reset**: [`Action`](#interfacesactionmd)\<\[\], `boolean`\>

Defined in: [packages/core/src/primitives/reatomBoolean.ts:7](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomBoolean.ts#L7)

***

#### setFalse

> **setFalse**: [`Action`](#interfacesactionmd)\<\[\], `false`\>

Defined in: [packages/core/src/primitives/reatomBoolean.ts:6](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomBoolean.ts#L6)

***

#### setTrue

> **setTrue**: [`Action`](#interfacesactionmd)\<\[\], `true`\>

Defined in: [packages/core/src/primitives/reatomBoolean.ts:5](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomBoolean.ts#L5)

***

#### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#interfacesunsubscribemd)

Defined in: [packages/core/src/core/atom.ts:94](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L94)

Subscribe to state changes, with the first call happening immediately.
When a subscriber is added, the callback is immediately invoked with the current state.
After that, it's called whenever the atom's state changes.

##### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it changes

##### Returns

[`Unsubscribe`](#interfacesunsubscribemd)

An unsubscribe function that removes the subscription when called

##### Inherited from

[`Atom`](#interfacesatommd).[`subscribe`](#subscribe)

***

#### toggle

> **toggle**: [`Action`](#interfacesactionmd)\<\[\], `boolean`\>

Defined in: [packages/core/src/primitives/reatomBoolean.ts:4](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomBoolean.ts#L4)


<a name="interfacescomputedmd"></a>

## Interface: Computed()\<State\>

Defined in: [packages/core/src/core/atom.ts:136](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L136)

Derived state container.

A computed atom automatically tracks dependencies and recalculates only when
those dependencies change. The calculation is performed lazily, only when the
computed value is read AND subscribed to.

### Extends

- [`AtomLike`](#interfacesatomlikemd)\<`State`, \[\]\>

### Extended by

- [`Effect`](#interfaceseffectmd)
- [`RouteAtom`](#interfacesrouteatommd)
- [`SearchParamsAtom`](#interfacessearchparamsatommd)

### Type Parameters

#### State

`State` = `any`

The type of derived state

> **Computed**(...`params`): `State`

Defined in: [packages/core/src/core/atom.ts:136](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L136)

Derived state container.

A computed atom automatically tracks dependencies and recalculates only when
those dependencies change. The calculation is performed lazily, only when the
computed value is read AND subscribed to.

### Parameters

#### params

...\[\]

Parameters to pass to the atom

### Returns

`State`

The atom's payload (typically its current state)

### Properties

#### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#interfacesatommetamd)

Defined in: [packages/core/src/core/atom.ts:99](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L99)

Reference to the atom's internal metadata.

##### Inherited from

[`AtomLike`](#interfacesatomlikemd).[`__reatom`](#__reatom)

***

#### actions

> **actions**: [`Actions`](#type-aliasesactionsmd)\<`Computed`\<`State`\>\>

Defined in: [packages/core/src/core/atom.ts:78](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L78)

Bind methods to the atom to extend its functionality.

##### Inherited from

[`AtomLike`](#interfacesatomlikemd).[`actions`](#actions)

***

#### extend

> **extend**: [`Extend`](#interfacesextendmd)\<`Computed`\<`State`\>\>

Defined in: [packages/core/src/core/atom.ts:84](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L84)

Extension system to add capabilities to atoms.
Allows adding middleware, methods, or other functionality to modify atom behavior.

##### Inherited from

[`AtomLike`](#interfacesatomlikemd).[`extend`](#extend)

***

#### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#interfacesunsubscribemd)

Defined in: [packages/core/src/core/atom.ts:94](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L94)

Subscribe to state changes, with the first call happening immediately.
When a subscriber is added, the callback is immediately invoked with the current state.
After that, it's called whenever the atom's state changes.

##### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it changes

##### Returns

[`Unsubscribe`](#interfacesunsubscribemd)

An unsubscribe function that removes the subscription when called

##### Inherited from

[`AtomLike`](#interfacesatomlikemd).[`subscribe`](#subscribe)


<a name="interfacescontextmd"></a>

## Interface: Context

Defined in: [packages/core/src/core/atom.ts:284](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L284)

Reatom's execution context that manages reactive state.

The context handles tracking relationships between atoms, scheduling operations,
and maintaining the execution stack during Reatom operations.

### Properties

#### cleanup

> **cleanup**: [`Queue`](#interfacesqueuemd)

Defined in: [packages/core/src/core/atom.ts:308](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L308)

Queue for cleanup callbacks to be executed.

***

#### compute

> **compute**: [`Queue`](#interfacesqueuemd)

Defined in: [packages/core/src/core/atom.ts:303](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L303)

Queue for computation callbacks to be executed.

***

#### effect

> **effect**: [`Queue`](#interfacesqueuemd)

Defined in: [packages/core/src/core/atom.ts:313](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L313)

Queue for effect callbacks to be executed.

***

#### hook

> **hook**: [`Queue`](#interfacesqueuemd)

Defined in: [packages/core/src/core/atom.ts:298](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L298)

Queue for hook callbacks to be executed.

***

#### meta

> **meta**: [`ContextMeta`](#interfacescontextmetamd)

Defined in: [packages/core/src/core/atom.ts:293](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L293)

Additional metadata for this context.

***

#### store

> **store**: [`Store`](#interfacesstoremd)

Defined in: [packages/core/src/core/atom.ts:288](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L288)

Store that maps atoms to their frames in this context.

### Methods

#### pushQueue()

> **pushQueue**(`cb`, `queue`): `void`

Defined in: [packages/core/src/core/atom.ts:321](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L321)

Add a callback to a specific queue for later execution.

##### Parameters

###### cb

[`Fn`](#interfacesfnmd)

Callback function to schedule

###### queue

Queue to add the callback to

`"hook"` | `"compute"` | `"cleanup"` | `"effect"`

##### Returns

`void`


<a name="interfacescontextatommd"></a>

## Interface: ContextAtom()

Defined in: [packages/core/src/core/atom.ts:333](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L333)

Atom interface for the context atom.
Provides methods to start new isolated contexts.

### Extends

- [`AtomLike`](#interfacesatomlikemd)\<[`Context`](#interfacescontextmd), \[\], [`ContextFrame`](#interfacescontextframemd)\>

> **ContextAtom**(...`params`): [`ContextFrame`](#interfacescontextframemd)

Defined in: [packages/core/src/core/atom.ts:333](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L333)

Atom interface for the context atom.
Provides methods to start new isolated contexts.

### Parameters

#### params

...\[\]

Parameters to pass to the atom

### Returns

[`ContextFrame`](#interfacescontextframemd)

The atom's payload (typically its current state)

### Properties

#### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#interfacesatommetamd)

Defined in: [packages/core/src/core/atom.ts:99](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L99)

Reference to the atom's internal metadata.

##### Inherited from

[`AtomLike`](#interfacesatomlikemd).[`__reatom`](#__reatom)

***

#### actions

> **actions**: [`Actions`](#type-aliasesactionsmd)\<`ContextAtom`\>

Defined in: [packages/core/src/core/atom.ts:78](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L78)

Bind methods to the atom to extend its functionality.

##### Inherited from

[`AtomLike`](#interfacesatomlikemd).[`actions`](#actions)

***

#### extend

> **extend**: [`Extend`](#interfacesextendmd)\<`ContextAtom`\>

Defined in: [packages/core/src/core/atom.ts:84](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L84)

Extension system to add capabilities to atoms.
Allows adding middleware, methods, or other functionality to modify atom behavior.

##### Inherited from

[`AtomLike`](#interfacesatomlikemd).[`extend`](#extend)

***

#### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#interfacesunsubscribemd)

Defined in: [packages/core/src/core/atom.ts:94](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L94)

Subscribe to state changes, with the first call happening immediately.
When a subscriber is added, the callback is immediately invoked with the current state.
After that, it's called whenever the atom's state changes.

##### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it changes

##### Returns

[`Unsubscribe`](#interfacesunsubscribemd)

An unsubscribe function that removes the subscription when called

##### Inherited from

[`AtomLike`](#interfacesatomlikemd).[`subscribe`](#subscribe)

### Methods

#### start()

##### Call Signature

> **start**\<`T`\>(`cb`): `T`

Defined in: [packages/core/src/core/atom.ts:340](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L340)

Start a new isolated context and run a callback within it.

###### Type Parameters

####### T

`T`

###### Parameters

####### cb

() => `T`

Function to execute in the new context

###### Returns

`T`

The result of the callback

##### Call Signature

> **start**(): [`ContextFrame`](#interfacescontextframemd)

Defined in: [packages/core/src/core/atom.ts:347](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L347)

Start a new isolated context.

###### Returns

[`ContextFrame`](#interfacescontextframemd)

The new context frame


<a name="interfacescontextframemd"></a>

## Interface: ContextFrame

Defined in: [packages/core/src/core/atom.ts:327](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L327)

Special frame type for the context atom.

### Extends

- [`Frame`](#interfacesframemd)\<[`Context`](#interfacescontextmd), \[\], `ContextFrame`\>

### Properties

#### atom

> `readonly` **atom**: [`AtomLike`](#interfacesatomlikemd)\<[`Context`](#interfacescontextmd), \[\], `ContextFrame`\>

Defined in: [packages/core/src/core/atom.ts:166](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L166)

Reference to the atom itself

##### Inherited from

[`Frame`](#interfacesframemd).[`atom`](#atom)

***

#### error

> **error**: `null` \| \{ \}

Defined in: [packages/core/src/core/atom.ts:156](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L156)

Error that occurred during atom evaluation, or null if successful

##### Inherited from

[`Frame`](#interfacesframemd).[`error`](#error)

***

#### pubs

> **pubs**: \[`null` \| [`Frame`](#interfacesframemd)\<`any`, `any`[], `any`\>, `...dependencies: Frame<any, any[], any>[]`\]

Defined in: [packages/core/src/core/atom.ts:173](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L173)

Immutable list of dependencies.
The first element is actualization flag and an imperative write cause.
Subsequent elements are the atom's dependencies.

##### Inherited from

[`Frame`](#interfacesframemd).[`pubs`](#pubs)

***

#### state

> **state**: [`Context`](#interfacescontextmd)

Defined in: [packages/core/src/core/atom.ts:161](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L161)

Current state of the atom

##### Inherited from

[`Frame`](#interfacesframemd).[`state`](#state-1)

***

#### subs

> `readonly` **subs**: [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\>[]

Defined in: [packages/core/src/core/atom.ts:178](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L178)

Array of atoms that depend on this atom (subscribers).

##### Inherited from

[`Frame`](#interfacesframemd).[`subs`](#subs)

### Methods

#### run()

> **run**\<`I`, `O`\>(`fn`, ...`params`): `O`

Defined in: [packages/core/src/core/atom.ts:188](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L188)

Run the callback in this context.
DO NOT USE directly, use `wrap` instead to preserve context correctly.

##### Type Parameters

###### I

`I` *extends* `any`[]

###### O

`O`

##### Parameters

###### fn

(...`params`) => `O`

Function to execute in this context

###### params

...`I`

Parameters to pass to the function

##### Returns

`O`

The result of the function call

##### Inherited from

[`Frame`](#interfacesframemd).[`run`](#run)


<a name="interfacescontextmetamd"></a>

## Interface: ContextMeta

Defined in: [packages/core/src/core/atom.ts:244](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L244)

Metadata container for the Reatom context.
Stores various maps used for managing atoms and their relationships.

### Indexable

\[`key`: `string`\]: `WeakMap`\<`WeakKey`, `any`\>

Additional metadata entries that can be dynamically added.

### Properties

#### frames

> **frames**: `WeakMap`\<[`Atom`](#interfacesatommd)\<`any`\>, \{ `next`: [`Frame`](#interfacesframemd); `prev`: `null` \| [`Frame`](#interfacesframemd)\<`any`, `any`[], `any`\>; \}\>

Defined in: [packages/core/src/core/atom.ts:259](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L259)

Maps atoms to their previous and next frames for tracking frame transitions.

***

#### init

> **init**: `WeakMap`\<`WeakKey`, `any`\>

Defined in: [packages/core/src/core/atom.ts:248](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L248)

Stores initialization values for WeakKeys.

***

#### select

> **select**: `WeakMap`\<[`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\>, `Record`\<`string`, [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\>\>\>

Defined in: [packages/core/src/core/atom.ts:270](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L270)

Cache for memoized selectors, keyed by source function.

***

#### variable

> **variable**: `WeakMap`\<[`Frame`](#interfacesframemd)\<`any`, `any`[], `any`\>, `WeakMap`\<`WeakKey`, `any`\>\>

Defined in: [packages/core/src/core/atom.ts:252](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L252)

Maps frames to their associated variable maps.


<a name="interfaceseffectmd"></a>

## Interface: Effect()\<State\>

Defined in: [packages/core/src/methods/effect.ts:5](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/methods/effect.ts#L5)

Derived state container.

A computed atom automatically tracks dependencies and recalculates only when
those dependencies change. The calculation is performed lazily, only when the
computed value is read AND subscribed to.

### Extends

- [`Computed`](#interfacescomputedmd)\<`State`\>

### Type Parameters

#### State

`State`

The type of derived state

> **Effect**(...`params`): `State`

Defined in: [packages/core/src/methods/effect.ts:5](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/methods/effect.ts#L5)

Derived state container.

A computed atom automatically tracks dependencies and recalculates only when
those dependencies change. The calculation is performed lazily, only when the
computed value is read AND subscribed to.

### Parameters

#### params

...\[\]

Parameters to pass to the atom

### Returns

`State`

The atom's payload (typically its current state)

### Properties

#### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#interfacesatommetamd)

Defined in: [packages/core/src/core/atom.ts:99](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L99)

Reference to the atom's internal metadata.

##### Inherited from

[`Computed`](#interfacescomputedmd).[`__reatom`](#__reatom)

***

#### actions

> **actions**: [`Actions`](#type-aliasesactionsmd)\<`Effect`\<`State`\>\>

Defined in: [packages/core/src/core/atom.ts:78](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L78)

Bind methods to the atom to extend its functionality.

##### Inherited from

[`Computed`](#interfacescomputedmd).[`actions`](#actions)

***

#### extend

> **extend**: [`Extend`](#interfacesextendmd)\<`Effect`\<`State`\>\>

Defined in: [packages/core/src/core/atom.ts:84](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L84)

Extension system to add capabilities to atoms.
Allows adding middleware, methods, or other functionality to modify atom behavior.

##### Inherited from

[`Computed`](#interfacescomputedmd).[`extend`](#extend)

***

#### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#interfacesunsubscribemd)

Defined in: [packages/core/src/core/atom.ts:94](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L94)

Subscribe to state changes, with the first call happening immediately.
When a subscriber is added, the callback is immediately invoked with the current state.
After that, it's called whenever the atom's state changes.

##### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it changes

##### Returns

[`Unsubscribe`](#interfacesunsubscribemd)

An unsubscribe function that removes the subscription when called

##### Inherited from

[`Computed`](#interfacescomputedmd).[`subscribe`](#subscribe)

***

#### unsubscribe

> **unsubscribe**: [`Unsubscribe`](#interfacesunsubscribemd)

Defined in: [packages/core/src/methods/effect.ts:6](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/methods/effect.ts#L6)


<a name="interfacesextmd"></a>

## Interface: Ext()\<Target, Extension\>

Defined in: [packages/core/src/core/extend.ts:14](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/extend.ts#L14)

Extension function interface for modifying atoms and actions.

Extensions are functions that take an atom/action as input and return
either the same atom/action with modified behavior or an object with
additional properties to be assigned to the atom/action.

### Type Parameters

#### Target

`Target` *extends* [`AtomLike`](#interfacesatomlikemd) = [`AtomLike`](#interfacesatomlikemd)

The type of atom or action the extension can be applied to

#### Extension

`Extension` = `Target`

The type that will be returned after applying the extension

> **Ext**(`target`): `Extension`

Defined in: [packages/core/src/core/extend.ts:15](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/extend.ts#L15)

Extension function interface for modifying atoms and actions.

Extensions are functions that take an atom/action as input and return
either the same atom/action with modified behavior or an object with
additional properties to be assigned to the atom/action.

### Parameters

#### target

`Target`

### Returns

`Extension`


<a name="interfacesextendmd"></a>

## Interface: Extend()\<This\>

Defined in: [packages/core/src/core/extend.ts:71](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/extend.ts#L71)

Method signature for the extend functionality on atoms and actions.

This interface defines the overload signatures for the extend method,
supporting different numbers of extensions with proper type inference.

### Type Parameters

#### This

`This` *extends* [`AtomLike`](#interfacesatomlikemd)

The atom or action type being extended

### Call Signature

> **Extend**\<`T1`\>(`extension1`): `T1` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1`

Defined in: [packages/core/src/core/extend.ts:72](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/extend.ts#L72)

Method signature for the extend functionality on atoms and actions.

This interface defines the overload signatures for the extend method,
supporting different numbers of extensions with proper type inference.

#### Type Parameters

##### T1

`T1`

#### Parameters

##### extension1

[`Ext`](#interfacesextmd)\<`This`, `T1`\>

#### Returns

`T1` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1`

### Call Signature

> **Extend**\<`T1`, `T2`\>(`extension1`, `extension2`): `T2` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2`

Defined in: [packages/core/src/core/extend.ts:73](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/extend.ts#L73)

Method signature for the extend functionality on atoms and actions.

This interface defines the overload signatures for the extend method,
supporting different numbers of extensions with proper type inference.

#### Type Parameters

##### T1

`T1`

##### T2

`T2`

#### Parameters

##### extension1

[`Ext`](#interfacesextmd)\<`This`, `T1`\>

##### extension2

[`Ext`](#interfacesextmd)\<`T1` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1`, `T2`\>

#### Returns

`T2` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2`

### Call Signature

> **Extend**\<`T1`, `T2`, `T3`\>(`extension1`, `extension2`, `extension3`): `T3` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2` & `T3`

Defined in: [packages/core/src/core/extend.ts:74](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/extend.ts#L74)

Method signature for the extend functionality on atoms and actions.

This interface defines the overload signatures for the extend method,
supporting different numbers of extensions with proper type inference.

#### Type Parameters

##### T1

`T1`

##### T2

`T2`

##### T3

`T3`

#### Parameters

##### extension1

[`Ext`](#interfacesextmd)\<`This`, `T1`\>

##### extension2

[`Ext`](#interfacesextmd)\<`T1` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1`, `T2`\>

##### extension3

[`Ext`](#interfacesextmd)\<`T2` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2`, `T3`\>

#### Returns

`T3` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2` & `T3`

### Call Signature

> **Extend**\<`T1`, `T2`, `T3`, `T4`\>(`extension1`, `extension2`, `extension3`, `extension4`): `T4` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2` & `T3` & `T4`

Defined in: [packages/core/src/core/extend.ts:75](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/extend.ts#L75)

Method signature for the extend functionality on atoms and actions.

This interface defines the overload signatures for the extend method,
supporting different numbers of extensions with proper type inference.

#### Type Parameters

##### T1

`T1`

##### T2

`T2`

##### T3

`T3`

##### T4

`T4`

#### Parameters

##### extension1

[`Ext`](#interfacesextmd)\<`This`, `T1`\>

##### extension2

[`Ext`](#interfacesextmd)\<`T1` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1`, `T2`\>

##### extension3

[`Ext`](#interfacesextmd)\<`T2` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2`, `T3`\>

##### extension4

[`Ext`](#interfacesextmd)\<`T3` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2` & `T3`, `T4`\>

#### Returns

`T4` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2` & `T3` & `T4`

### Call Signature

> **Extend**\<`T1`, `T2`, `T3`, `T4`, `T5`\>(`extension1`, `extension2`, `extension3`, `extension4`, `extension5`): `T5` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T5`\<`T5`\> : `T4` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, ...[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2` & `T3` & `T4` & `T5`

Defined in: [packages/core/src/core/extend.ts:76](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/extend.ts#L76)

Method signature for the extend functionality on atoms and actions.

This interface defines the overload signatures for the extend method,
supporting different numbers of extensions with proper type inference.

#### Type Parameters

##### T1

`T1`

##### T2

`T2`

##### T3

`T3`

##### T4

`T4`

##### T5

`T5`

#### Parameters

##### extension1

[`Ext`](#interfacesextmd)\<`This`, `T1`\>

##### extension2

[`Ext`](#interfacesextmd)\<`T1` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1`, `T2`\>

##### extension3

[`Ext`](#interfacesextmd)\<`T2` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2`, `T3`\>

##### extension4

[`Ext`](#interfacesextmd)\<`T3` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2` & `T3`, `T4`\>

##### extension5

[`Ext`](#interfacesextmd)\<`T4` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2` & `T3` & `T4`, `T5`\>

#### Returns

`T5` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T5`\<`T5`\> : `T4` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, ...[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2` & `T3` & `T4` & `T5`

### Call Signature

> **Extend**\<`T1`, `T2`, `T3`, `T4`, `T5`, `T6`\>(`extension1`, `extension2`, `extension3`, `extension4`, `extension5`, `extension6`): `T6` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T6`\<`T6`\> : `T5` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T5`\<`T5`\> : `T4` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, ...[], `any`\> ? `T2`\<`T2`\> : ... *extends* ... ? ... : ... & `T2` & `T3` & `T4` & `T5` & `T6`

Defined in: [packages/core/src/core/extend.ts:77](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/extend.ts#L77)

Method signature for the extend functionality on atoms and actions.

This interface defines the overload signatures for the extend method,
supporting different numbers of extensions with proper type inference.

#### Type Parameters

##### T1

`T1`

##### T2

`T2`

##### T3

`T3`

##### T4

`T4`

##### T5

`T5`

##### T6

`T6`

#### Parameters

##### extension1

[`Ext`](#interfacesextmd)\<`This`, `T1`\>

##### extension2

[`Ext`](#interfacesextmd)\<`T1` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1`, `T2`\>

##### extension3

[`Ext`](#interfacesextmd)\<`T2` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2`, `T3`\>

##### extension4

[`Ext`](#interfacesextmd)\<`T3` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2` & `T3`, `T4`\>

##### extension5

[`Ext`](#interfacesextmd)\<`T4` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2` & `T3` & `T4`, `T5`\>

##### extension6

[`Ext`](#interfacesextmd)\<`T5` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T5`\<`T5`\> : `T4` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#interfacesatomlikemd)\<..., ..., ...\> ? `T1`\<...\> : ... & ... & `T2` & `T3` & `T4` & `T5`, `T6`\>

#### Returns

`T6` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T6`\<`T6`\> : `T5` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T5`\<`T5`\> : `T4` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, ...[], `any`\> ? `T2`\<`T2`\> : ... *extends* ... ? ... : ... & `T2` & `T3` & `T4` & `T5` & `T6`

### Call Signature

> **Extend**\<`T1`, `T2`, `T3`, `T4`, `T5`, `T6`, `T7`\>(`extension1`, `extension2`, `extension3`, `extension4`, `extension5`, `extension6`, `extension7`): `T7` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T7`\<`T7`\> : `T6` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T6`\<`T6`\> : `T5` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T5`\<`T5`\> : `T4` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, ...[], `any`\> ? `T3`\<`T3`\> : ... *extends* ... ? ... : ... & `T3` & `T4` & `T5` & `T6` & `T7`

Defined in: [packages/core/src/core/extend.ts:78](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/extend.ts#L78)

Method signature for the extend functionality on atoms and actions.

This interface defines the overload signatures for the extend method,
supporting different numbers of extensions with proper type inference.

#### Type Parameters

##### T1

`T1`

##### T2

`T2`

##### T3

`T3`

##### T4

`T4`

##### T5

`T5`

##### T6

`T6`

##### T7

`T7`

#### Parameters

##### extension1

[`Ext`](#interfacesextmd)\<`This`, `T1`\>

##### extension2

[`Ext`](#interfacesextmd)\<`T1` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1`, `T2`\>

##### extension3

[`Ext`](#interfacesextmd)\<`T2` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2`, `T3`\>

##### extension4

[`Ext`](#interfacesextmd)\<`T3` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2` & `T3`, `T4`\>

##### extension5

[`Ext`](#interfacesextmd)\<`T4` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2` & `T3` & `T4`, `T5`\>

##### extension6

[`Ext`](#interfacesextmd)\<`T5` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T5`\<`T5`\> : `T4` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#interfacesatomlikemd)\<..., ..., ...\> ? `T1`\<...\> : ... & ... & `T2` & `T3` & `T4` & `T5`, `T6`\>

##### extension7

[`Ext`](#interfacesextmd)\<`T6` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T6`\<`T6`\> : `T5` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T5`\<`T5`\> : `T4` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#interfacesatomlikemd)\<..., ..., ...\> ? `T2`\<...\> : ... & ... & `T3` & `T4` & `T5` & `T6`, `T7`\>

#### Returns

`T7` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T7`\<`T7`\> : `T6` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T6`\<`T6`\> : `T5` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T5`\<`T5`\> : `T4` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, ...[], `any`\> ? `T3`\<`T3`\> : ... *extends* ... ? ... : ... & `T3` & `T4` & `T5` & `T6` & `T7`

### Call Signature

> **Extend**\<`T1`, `T2`, `T3`, `T4`, `T5`, `T6`, `T7`, `T8`\>(`extension1`, `extension2`, `extension3`, `extension4`, `extension5`, `extension6`, `extension7`, `extension8`): `T8` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T8`\<`T8`\> : `T7` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T7`\<`T7`\> : `T6` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T6`\<`T6`\> : `T5` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T5`\<`T5`\> : `T4` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, ...[], `any`\> ? `T4`\<`T4`\> : ... *extends* ... ? ... : ... & `T4` & `T5` & `T6` & `T7` & `T8`

Defined in: [packages/core/src/core/extend.ts:79](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/extend.ts#L79)

Method signature for the extend functionality on atoms and actions.

This interface defines the overload signatures for the extend method,
supporting different numbers of extensions with proper type inference.

#### Type Parameters

##### T1

`T1`

##### T2

`T2`

##### T3

`T3`

##### T4

`T4`

##### T5

`T5`

##### T6

`T6`

##### T7

`T7`

##### T8

`T8`

#### Parameters

##### extension1

[`Ext`](#interfacesextmd)\<`This`, `T1`\>

##### extension2

[`Ext`](#interfacesextmd)\<`T1` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1`, `T2`\>

##### extension3

[`Ext`](#interfacesextmd)\<`T2` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2`, `T3`\>

##### extension4

[`Ext`](#interfacesextmd)\<`T3` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2` & `T3`, `T4`\>

##### extension5

[`Ext`](#interfacesextmd)\<`T4` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2` & `T3` & `T4`, `T5`\>

##### extension6

[`Ext`](#interfacesextmd)\<`T5` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T5`\<`T5`\> : `T4` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#interfacesatomlikemd)\<..., ..., ...\> ? `T1`\<...\> : ... & ... & `T2` & `T3` & `T4` & `T5`, `T6`\>

##### extension7

[`Ext`](#interfacesextmd)\<`T6` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T6`\<`T6`\> : `T5` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T5`\<`T5`\> : `T4` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#interfacesatomlikemd)\<..., ..., ...\> ? `T2`\<...\> : ... & ... & `T3` & `T4` & `T5` & `T6`, `T7`\>

##### extension8

[`Ext`](#interfacesextmd)\<`T7` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T7`\<`T7`\> : `T6` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T6`\<`T6`\> : `T5` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T5`\<`T5`\> : `T4` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#interfacesatomlikemd)\<..., ..., ...\> ? `T3`\<...\> : ... & ... & `T4` & `T5` & `T6` & `T7`, `T8`\>

#### Returns

`T8` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T8`\<`T8`\> : `T7` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T7`\<`T7`\> : `T6` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T6`\<`T6`\> : `T5` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T5`\<`T5`\> : `T4` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, ...[], `any`\> ? `T4`\<`T4`\> : ... *extends* ... ? ... : ... & `T4` & `T5` & `T6` & `T7` & `T8`

### Call Signature

> **Extend**\<`T1`, `T2`, `T3`, `T4`, `T5`, `T6`, `T7`, `T8`, `T9`\>(`extension1`, `extension2`, `extension3`, `extension4`, `extension5`, `extension6`, `extension7`, `extension8`, `extension9`): `T9` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T9`\<`T9`\> : `T8` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T8`\<`T8`\> : `T7` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T7`\<`T7`\> : `T6` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T6`\<`T6`\> : `T5` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, ...[], `any`\> ? `T5`\<`T5`\> : ... *extends* ... ? ... : ... & `T5` & `T6` & `T7` & `T8` & `T9`

Defined in: [packages/core/src/core/extend.ts:80](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/extend.ts#L80)

Method signature for the extend functionality on atoms and actions.

This interface defines the overload signatures for the extend method,
supporting different numbers of extensions with proper type inference.

#### Type Parameters

##### T1

`T1`

##### T2

`T2`

##### T3

`T3`

##### T4

`T4`

##### T5

`T5`

##### T6

`T6`

##### T7

`T7`

##### T8

`T8`

##### T9

`T9`

#### Parameters

##### extension1

[`Ext`](#interfacesextmd)\<`This`, `T1`\>

##### extension2

[`Ext`](#interfacesextmd)\<`T1` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1`, `T2`\>

##### extension3

[`Ext`](#interfacesextmd)\<`T2` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2`, `T3`\>

##### extension4

[`Ext`](#interfacesextmd)\<`T3` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2` & `T3`, `T4`\>

##### extension5

[`Ext`](#interfacesextmd)\<`T4` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2` & `T3` & `T4`, `T5`\>

##### extension6

[`Ext`](#interfacesextmd)\<`T5` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T5`\<`T5`\> : `T4` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#interfacesatomlikemd)\<..., ..., ...\> ? `T1`\<...\> : ... & ... & `T2` & `T3` & `T4` & `T5`, `T6`\>

##### extension7

[`Ext`](#interfacesextmd)\<`T6` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T6`\<`T6`\> : `T5` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T5`\<`T5`\> : `T4` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#interfacesatomlikemd)\<..., ..., ...\> ? `T2`\<...\> : ... & ... & `T3` & `T4` & `T5` & `T6`, `T7`\>

##### extension8

[`Ext`](#interfacesextmd)\<`T7` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T7`\<`T7`\> : `T6` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T6`\<`T6`\> : `T5` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T5`\<`T5`\> : `T4` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#interfacesatomlikemd)\<..., ..., ...\> ? `T3`\<...\> : ... & ... & `T4` & `T5` & `T6` & `T7`, `T8`\>

##### extension9

[`Ext`](#interfacesextmd)\<`T8` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T8`\<`T8`\> : `T7` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T7`\<`T7`\> : `T6` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T6`\<`T6`\> : `T5` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T5`\<`T5`\> : `T4` *extends* [`AtomLike`](#interfacesatomlikemd)\<..., ..., ...\> ? `T4`\<...\> : ... & ... & `T5` & `T6` & `T7` & `T8`, `T9`\>

#### Returns

`T9` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T9`\<`T9`\> : `T8` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T8`\<`T8`\> : `T7` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T7`\<`T7`\> : `T6` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T6`\<`T6`\> : `T5` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, ...[], `any`\> ? `T5`\<`T5`\> : ... *extends* ... ? ... : ... & `T5` & `T6` & `T7` & `T8` & `T9`

### Call Signature

> **Extend**\<`T1`, `T2`, `T3`, `T4`, `T5`, `T6`, `T7`, `T8`, `T9`, `T10`\>(`extension1`, `extension2`, `extension3`, `extension4`, `extension5`, `extension6`, `extension7`, `extension8`, `extension9`, `extension10`): `T10` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T10`\<`T10`\> : `T9` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T9`\<`T9`\> : `T8` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T8`\<`T8`\> : `T7` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T7`\<`T7`\> : `T6` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, ...[], `any`\> ? `T6`\<`T6`\> : ... *extends* ... ? ... : ... & `T6` & `T7` & `T8` & `T9` & `T10`

Defined in: [packages/core/src/core/extend.ts:81](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/extend.ts#L81)

Method signature for the extend functionality on atoms and actions.

This interface defines the overload signatures for the extend method,
supporting different numbers of extensions with proper type inference.

#### Type Parameters

##### T1

`T1`

##### T2

`T2`

##### T3

`T3`

##### T4

`T4`

##### T5

`T5`

##### T6

`T6`

##### T7

`T7`

##### T8

`T8`

##### T9

`T9`

##### T10

`T10`

#### Parameters

##### extension1

[`Ext`](#interfacesextmd)\<`This`, `T1`\>

##### extension2

[`Ext`](#interfacesextmd)\<`T1` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1`, `T2`\>

##### extension3

[`Ext`](#interfacesextmd)\<`T2` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2`, `T3`\>

##### extension4

[`Ext`](#interfacesextmd)\<`T3` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2` & `T3`, `T4`\>

##### extension5

[`Ext`](#interfacesextmd)\<`T4` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T1`\<`T1`\> : `This` & `T1` & `T2` & `T3` & `T4`, `T5`\>

##### extension6

[`Ext`](#interfacesextmd)\<`T5` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T5`\<`T5`\> : `T4` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T2`\<`T2`\> : `T1` *extends* [`AtomLike`](#interfacesatomlikemd)\<..., ..., ...\> ? `T1`\<...\> : ... & ... & `T2` & `T3` & `T4` & `T5`, `T6`\>

##### extension7

[`Ext`](#interfacesextmd)\<`T6` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T6`\<`T6`\> : `T5` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T5`\<`T5`\> : `T4` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T3`\<`T3`\> : `T2` *extends* [`AtomLike`](#interfacesatomlikemd)\<..., ..., ...\> ? `T2`\<...\> : ... & ... & `T3` & `T4` & `T5` & `T6`, `T7`\>

##### extension8

[`Ext`](#interfacesextmd)\<`T7` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T7`\<`T7`\> : `T6` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T6`\<`T6`\> : `T5` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T5`\<`T5`\> : `T4` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T4`\<`T4`\> : `T3` *extends* [`AtomLike`](#interfacesatomlikemd)\<..., ..., ...\> ? `T3`\<...\> : ... & ... & `T4` & `T5` & `T6` & `T7`, `T8`\>

##### extension9

[`Ext`](#interfacesextmd)\<`T8` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T8`\<`T8`\> : `T7` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T7`\<`T7`\> : `T6` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T6`\<`T6`\> : `T5` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T5`\<`T5`\> : `T4` *extends* [`AtomLike`](#interfacesatomlikemd)\<..., ..., ...\> ? `T4`\<...\> : ... & ... & `T5` & `T6` & `T7` & `T8`, `T9`\>

##### extension10

[`Ext`](#interfacesextmd)\<`T9` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T9`\<`T9`\> : `T8` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T8`\<`T8`\> : `T7` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T7`\<`T7`\> : `T6` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T6`\<`T6`\> : `T5` *extends* [`AtomLike`](#interfacesatomlikemd)\<..., ..., ...\> ? `T5`\<...\> : ... & ... & `T6` & `T7` & `T8` & `T9`, `T10`\>

#### Returns

`T10` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T10`\<`T10`\> : `T9` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T9`\<`T9`\> : `T8` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T8`\<`T8`\> : `T7` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> ? `T7`\<`T7`\> : `T6` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, ...[], `any`\> ? `T6`\<`T6`\> : ... *extends* ... ? ... : ... & `T6` & `T7` & `T8` & `T9` & `T10`

### Call Signature

> **Extend**\<`T`\>(...`extensions`): `object` & [`AtomLike`](#interfacesatomlikemd)\<`unknown`, `unknown`[], `unknown`\>

Defined in: [packages/core/src/core/extend.ts:82](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/extend.ts#L82)

Method signature for the extend functionality on atoms and actions.

This interface defines the overload signatures for the extend method,
supporting different numbers of extensions with proper type inference.

#### Type Parameters

##### T

`T` *extends* [`Ext`](#interfacesextmd)\<[`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\>, [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> \| [`Rec`](#type-aliasesrecmd)\>[]

#### Parameters

##### extensions

...`T`

#### Returns

`object` & [`AtomLike`](#interfacesatomlikemd)\<`unknown`, `unknown`[], `unknown`\>


<a name="interfacesfetchrequestinitmd"></a>

## Interface: FetchRequestInit\<Result, Params\>

Defined in: [packages/core/src/web/fetch.ts:5](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/web/fetch.ts#L5)

### Extends

- `RequestInit`

### Type Parameters

#### Result

`Result` = `unknown`

#### Params

`Params` *extends* `any`[] = `any`[]

### Properties

#### getInit()?

> `optional` **getInit**: (...`params`) => `object`

Defined in: [packages/core/src/web/fetch.ts:12](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/web/fetch.ts#L12)

##### Parameters

###### params

...`Params`

##### Returns

`object`

###### body?

> `optional` **body**: `any`[] \| `Record`\<`string`, `any`\> \| `BodyInit`

###### searchParams?

> `optional` **searchParams**: `string` \| `string`[][] \| `Record`\<`string`, `string`\> \| `URLSearchParams`

***

#### getResult()?

> `optional` **getResult**: (`response`) => `Result` \| `Promise`\<`Result`\>

Defined in: [packages/core/src/web/fetch.ts:16](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/web/fetch.ts#L16)

##### Parameters

###### response

`Response`

##### Returns

`Result` \| `Promise`\<`Result`\>

***

#### origin?

> `optional` **origin**: `string`

Defined in: [packages/core/src/web/fetch.ts:10](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/web/fetch.ts#L10)

***

#### transport()?

> `optional` **transport**: \{(`input`, `init?`): `Promise`\<`Response`\>; (`input`, `init?`): `Promise`\<`Response`\>; \}

Defined in: [packages/core/src/web/fetch.ts:11](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/web/fetch.ts#L11)

##### Call Signature

> (`input`, `init?`): `Promise`\<`Response`\>

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/fetch)

###### Parameters

####### input

`URL` | `RequestInfo`

####### init?

`RequestInit`

###### Returns

`Promise`\<`Response`\>

##### Call Signature

> (`input`, `init?`): `Promise`\<`Response`\>

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/fetch)

###### Parameters

####### input

`string` | `URL` | `Request`

####### init?

`RequestInit`

###### Returns

`Promise`\<`Response`\>

***

#### url?

> `optional` **url**: `string` \| `URL`

Defined in: [packages/core/src/web/fetch.ts:9](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/web/fetch.ts#L9)


<a name="interfacesfieldatommd"></a>

## Interface: FieldAtom()\<State, Value\>

Defined in: [packages/core/src/form/src/reatomField.ts:74](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L74)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

### Extends

- [`FieldLikeAtom`](#interfacesfieldlikeatommd)\<`State`\>

### Type Parameters

#### State

`State` = `any`

The type of state stored in the atom

#### Value

`Value` = `State`

### Call Signature

> **FieldAtom**(`update`): `State`

Defined in: [packages/core/src/form/src/reatomField.ts:74](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L74)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Parameters

##### update

(`state`) => `State`

Function that takes the current state and returns a new state

#### Returns

`State`

The new state value

### Call Signature

> **FieldAtom**(`newState`): `State`

Defined in: [packages/core/src/form/src/reatomField.ts:74](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L74)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Parameters

##### newState

`State`

The new state value

#### Returns

`State`

The new state value

### Call Signature

> **FieldAtom**(...`params`): `State`

Defined in: [packages/core/src/form/src/reatomField.ts:74](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L74)

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

### Properties

#### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#interfacesatommetamd)

Defined in: [packages/core/src/core/atom.ts:99](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L99)

Reference to the atom's internal metadata.

##### Inherited from

[`FieldLikeAtom`](#interfacesfieldlikeatommd).[`__reatom`](#__reatom)

***

#### \_\_reatomField

> **\_\_reatomField**: `true`

Defined in: [packages/core/src/form/src/reatomField.ts:71](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L71)

##### Inherited from

[`FieldLikeAtom`](#interfacesfieldlikeatommd).[`__reatomField`](#__reatomfield)

***

#### actions

> **actions**: [`Actions`](#type-aliasesactionsmd)\<`FieldAtom`\<`State`, `Value`\>\>

Defined in: [packages/core/src/core/atom.ts:78](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L78)

Bind methods to the atom to extend its functionality.

##### Inherited from

[`FieldLikeAtom`](#interfacesfieldlikeatommd).[`actions`](#actions)

***

#### change

> **change**: [`Action`](#interfacesactionmd)\<\[`Value`\], `Value`\>

Defined in: [packages/core/src/form/src/reatomField.ts:77](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L77)

Action for handling field changes, accepts the "value" parameter and applies it to `toState` option.

***

#### disabled

> **disabled**: [`BooleanAtom`](#interfacesbooleanatommd)

Defined in: [packages/core/src/form/src/reatomField.ts:95](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L95)

Atom that defines if the field is disabled

***

#### extend

> **extend**: [`Extend`](#interfacesextendmd)\<`FieldAtom`\<`State`, `Value`\>\>

Defined in: [packages/core/src/core/atom.ts:84](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L84)

Extension system to add capabilities to atoms.
Allows adding middleware, methods, or other functionality to modify atom behavior.

##### Inherited from

[`FieldLikeAtom`](#interfacesfieldlikeatommd).[`extend`](#extend)

***

#### focus

> **focus**: [`FocusAtom`](#interfacesfocusatommd)

Defined in: [packages/core/src/form/src/reatomField.ts:80](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L80)

Atom of an object with all related focus statuses.

***

#### initState

> **initState**: [`Atom`](#interfacesatommd)\<`State`\>

Defined in: [packages/core/src/form/src/reatomField.ts:83](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L83)

The initial state of the atom.

***

#### options

> **options**: [`RecordAtom`](#interfacesrecordatommd)\<\{ `keepErrorDuringValidating`: `undefined` \| `boolean`; `keepErrorOnChange`: `undefined` \| `boolean`; `shouldValidate`: `undefined` \| `boolean`; `validateOnBlur`: `undefined` \| `boolean`; `validateOnChange`: `undefined` \| `boolean`; \}\>

Defined in: [packages/core/src/form/src/reatomField.ts:97](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L97)

***

#### reset

> **reset**: [`Action`](#interfacesactionmd)\<\[\], `void`\>

Defined in: [packages/core/src/form/src/reatomField.ts:86](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L86)

Action to reset the state, the value, the validation, and the focus.

***

#### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#interfacesunsubscribemd)

Defined in: [packages/core/src/core/atom.ts:94](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L94)

Subscribe to state changes, with the first call happening immediately.
When a subscriber is added, the callback is immediately invoked with the current state.
After that, it's called whenever the atom's state changes.

##### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it changes

##### Returns

[`Unsubscribe`](#interfacesunsubscribemd)

An unsubscribe function that removes the subscription when called

##### Inherited from

[`FieldLikeAtom`](#interfacesfieldlikeatommd).[`subscribe`](#subscribe)

***

#### validation

> **validation**: [`ValidationAtom`](#interfacesvalidationatommd)

Defined in: [packages/core/src/form/src/reatomField.ts:89](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L89)

Atom of an object with all related validation statuses.

***

#### value

> **value**: [`Computed`](#interfacescomputedmd)\<`Value`\>

Defined in: [packages/core/src/form/src/reatomField.ts:92](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L92)

Atom with the "value" data, computed by the `fromState` option


<a name="interfacesfieldfocusmd"></a>

## Interface: FieldFocus

Defined in: [packages/core/src/form/src/reatomField.ts:29](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L29)

### Properties

#### active

> **active**: `boolean`

Defined in: [packages/core/src/form/src/reatomField.ts:31](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L31)

The field is focused.

***

#### dirty

> **dirty**: `boolean`

Defined in: [packages/core/src/form/src/reatomField.ts:34](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L34)

The field state is not equal to the initial state.

***

#### touched

> **touched**: `boolean`

Defined in: [packages/core/src/form/src/reatomField.ts:37](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L37)

The field has ever gained and lost focus.


<a name="interfacesfieldlikeatommd"></a>

## Interface: FieldLikeAtom()\<State\>

Defined in: [packages/core/src/form/src/reatomField.ts:70](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L70)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

### Extends

- [`Atom`](#interfacesatommd)\<`State`\>

### Extended by

- [`FieldAtom`](#interfacesfieldatommd)

### Type Parameters

#### State

`State` = `any`

The type of state stored in the atom

### Call Signature

> **FieldLikeAtom**(`update`): `State`

Defined in: [packages/core/src/form/src/reatomField.ts:70](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L70)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Parameters

##### update

(`state`) => `State`

Function that takes the current state and returns a new state

#### Returns

`State`

The new state value

### Call Signature

> **FieldLikeAtom**(`newState`): `State`

Defined in: [packages/core/src/form/src/reatomField.ts:70](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L70)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Parameters

##### newState

`State`

The new state value

#### Returns

`State`

The new state value

### Call Signature

> **FieldLikeAtom**(...`params`): `State`

Defined in: [packages/core/src/form/src/reatomField.ts:70](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L70)

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

### Properties

#### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#interfacesatommetamd)

Defined in: [packages/core/src/core/atom.ts:99](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L99)

Reference to the atom's internal metadata.

##### Inherited from

[`Atom`](#interfacesatommd).[`__reatom`](#__reatom)

***

#### \_\_reatomField

> **\_\_reatomField**: `true`

Defined in: [packages/core/src/form/src/reatomField.ts:71](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L71)

***

#### actions

> **actions**: [`Actions`](#type-aliasesactionsmd)\<`FieldLikeAtom`\<`State`\>\>

Defined in: [packages/core/src/core/atom.ts:78](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L78)

Bind methods to the atom to extend its functionality.

##### Inherited from

[`Atom`](#interfacesatommd).[`actions`](#actions)

***

#### extend

> **extend**: [`Extend`](#interfacesextendmd)\<`FieldLikeAtom`\<`State`\>\>

Defined in: [packages/core/src/core/atom.ts:84](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L84)

Extension system to add capabilities to atoms.
Allows adding middleware, methods, or other functionality to modify atom behavior.

##### Inherited from

[`Atom`](#interfacesatommd).[`extend`](#extend)

***

#### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#interfacesunsubscribemd)

Defined in: [packages/core/src/core/atom.ts:94](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L94)

Subscribe to state changes, with the first call happening immediately.
When a subscriber is added, the callback is immediately invoked with the current state.
After that, it's called whenever the atom's state changes.

##### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it changes

##### Returns

[`Unsubscribe`](#interfacesunsubscribemd)

An unsubscribe function that removes the subscription when called

##### Inherited from

[`Atom`](#interfacesatommd).[`subscribe`](#subscribe)


<a name="interfacesfieldoptionsmd"></a>

## Interface: FieldOptions\<State, Value\>

Defined in: [packages/core/src/form/src/reatomField.ts:134](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L134)

### Extended by

- [`FormFieldOptions`](#interfacesformfieldoptionsmd)

### Type Parameters

#### State

`State` = `any`

#### Value

`Value` = `State`

### Properties

#### contract()?

> `optional` **contract**: (`state`) => `unknown`

Defined in: [packages/core/src/form/src/reatomField.ts:172](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L172)

The callback to validate field contract.

##### Parameters

###### state

`State`

##### Returns

`unknown`

***

#### disabled?

> `optional` **disabled**: `boolean`

Defined in: [packages/core/src/form/src/reatomField.ts:178](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L178)

Defines if the field is disabled by default.

##### Default

```ts
false
```

***

#### filter()?

> `optional` **filter**: (`newValue`, `prevValue`) => `boolean`

Defined in: [packages/core/src/form/src/reatomField.ts:139](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L139)

The callback to filter "value" changes (from the 'change' action). It should return 'false' to skip the update.
By default, it always returns `true`.

##### Parameters

###### newValue

`Value`

###### prevValue

`Value`

##### Returns

`boolean`

***

#### fromState()?

> `optional` **fromState**: (`state`) => `Value`

Defined in: [packages/core/src/form/src/reatomField.ts:145](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L145)

The callback to compute the "value" data from the "state" data.
By default, it returns the "state" data without any transformations.

##### Parameters

###### state

`State`

##### Returns

`Value`

***

#### isDirty()?

> `optional` **isDirty**: (`newValue`, `prevValue`) => `boolean`

Defined in: [packages/core/src/form/src/reatomField.ts:151](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L151)

The callback used to determine whether the "value" has changed.
By default, it utilizes `isDeepEqual` from reatom/utils.

##### Parameters

###### newValue

`Value`

###### prevValue

`Value`

##### Returns

`boolean`

***

#### keepErrorDuringValidating?

> `optional` **keepErrorDuringValidating**: `boolean`

Defined in: [packages/core/src/form/src/reatomField.ts:184](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L184)

Defines the reset behavior of the validation state during async validation.

##### Default

```ts
false
```

***

#### keepErrorOnChange?

> `optional` **keepErrorOnChange**: `boolean`

Defined in: [packages/core/src/form/src/reatomField.ts:191](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L191)

Defines the reset behavior of the validation state on field change.
Useful if the validation is triggered on blur or submit only.

##### Default

```ts
!validateOnChange
```

***

#### name?

> `optional` **name**: `string`

Defined in: [packages/core/src/form/src/reatomField.ts:156](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L156)

The name of the field and all related atoms and actions.

***

#### toState()?

> `optional` **toState**: (`value`) => `State`

Defined in: [packages/core/src/form/src/reatomField.ts:162](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L162)

The callback to transform the "state" data from the "value" data from the `change` action.
By default, it returns the "value" data without any transformations.

##### Parameters

###### value

`Value`

##### Returns

`State`

***

#### validate?

> `optional` **validate**: [`FieldValidateOption`](#type-aliasesfieldvalidateoptionmd)\<`State`, `Value`\>

Defined in: [packages/core/src/form/src/reatomField.ts:167](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L167)

The callback to validate the field.

***

#### validateOnBlur?

> `optional` **validateOnBlur**: `boolean`

Defined in: [packages/core/src/form/src/reatomField.ts:203](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L203)

Defines if the validation should be triggered on the field blur.

##### Default

```ts
false
```

***

#### validateOnChange?

> `optional` **validateOnChange**: `boolean`

Defined in: [packages/core/src/form/src/reatomField.ts:197](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L197)

Defines if the validation should be triggered with every field change.

##### Default

```ts
false
```


<a name="interfacesfieldsetmd"></a>

## Interface: FieldSet\<T\>

Defined in: [packages/core/src/form/src/reatomFieldSet.ts:34](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomFieldSet.ts#L34)

### Extended by

- [`Form`](#interfacesformmd)

### Type Parameters

#### T

`T` *extends* [`FormInitState`](#type-aliasesforminitstatemd)

### Properties

#### fieldArraysList

> **fieldArraysList**: [`Computed`](#interfacescomputedmd)\<[`FormFieldArrayAtom`](#type-aliasesformfieldarrayatommd)[]\>

Defined in: [packages/core/src/form/src/reatomFieldSet.ts:42](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomFieldSet.ts#L42)

Computed list of all the field arrays from the fields tree

***

#### fields

> **fields**: [`FormFields`](#type-aliasesformfieldsmd)\<`T`\>

Defined in: [packages/core/src/form/src/reatomFieldSet.ts:36](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomFieldSet.ts#L36)

Fields from the init state

***

#### fieldsList

> **fieldsList**: [`Computed`](#interfacescomputedmd)\<[`FieldAtom`](#interfacesfieldatommd)\<`any`, `any`\>[]\>

Defined in: [packages/core/src/form/src/reatomFieldSet.ts:39](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomFieldSet.ts#L39)

Computed list of all the fields from the fields tree

***

#### fieldsState

> **fieldsState**: [`Computed`](#interfacescomputedmd)\<[`ParseAtoms`](#type-aliasesparseatomsmd)\<[`FormFields`](#type-aliasesformfieldsmd)\<`T`\>\>\>

Defined in: [packages/core/src/form/src/reatomFieldSet.ts:45](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomFieldSet.ts#L45)

Atom with the state of the fieldset, computed from all the fields in `fieldsList`

***

#### focus

> **focus**: [`Computed`](#interfacescomputedmd)\<[`FieldFocus`](#interfacesfieldfocusmd)\>

Defined in: [packages/core/src/form/src/reatomFieldSet.ts:48](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomFieldSet.ts#L48)

Atom with focus state of the fieldset, computed from all the fields in `fieldsList`

***

#### init

> **init**: [`Action`](#interfacesactionmd)\<\[[`DeepPartial`](#type-aliasesdeeppartialmd)\<[`ParseAtoms`](#type-aliasesparseatomsmd)\<[`FormFields`](#type-aliasesformfieldsmd)\<`T`\>\>, `unknown`[]\>\], `void`\>

Defined in: [packages/core/src/form/src/reatomFieldSet.ts:54](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomFieldSet.ts#L54)

Action to set initial values for each field or field array in the fieldset

***

#### reset

> **reset**: [`Action`](#interfacesactionmd)\<\[[`DeepPartial`](#type-aliasesdeeppartialmd)\<[`ParseAtoms`](#type-aliasesparseatomsmd)\<[`FormFields`](#type-aliasesformfieldsmd)\<`T`\>\>, `unknown`[]\>\], `void`\>

Defined in: [packages/core/src/form/src/reatomFieldSet.ts:57](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomFieldSet.ts#L57)

Action to reset the state, the value, the validation, and the focus states.

***

#### validation

> **validation**: [`Computed`](#interfacescomputedmd)\<[`FieldValidation`](#interfacesfieldvalidationmd)\>

Defined in: [packages/core/src/form/src/reatomFieldSet.ts:51](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomFieldSet.ts#L51)

Atom with validation state of the fieldset, computed from all the fields in `fieldsList`


<a name="interfacesfieldvalidationmd"></a>

## Interface: FieldValidation

Defined in: [packages/core/src/form/src/reatomField.ts:40](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L40)

### Properties

#### error

> **error**: `undefined` \| `string`

Defined in: [packages/core/src/form/src/reatomField.ts:42](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L42)

The field validation error text.

***

#### meta

> **meta**: `unknown`

Defined in: [packages/core/src/form/src/reatomField.ts:45](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L45)

The field validation meta.

***

#### triggered

> **triggered**: `boolean`

Defined in: [packages/core/src/form/src/reatomField.ts:48](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L48)

The validation actuality status.

***

#### validating

> **validating**: `boolean`

Defined in: [packages/core/src/form/src/reatomField.ts:51](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L51)

The field async validation status


<a name="interfacesfnmd"></a>

## Interface: Fn()

Defined in: [packages/core/src/utils.ts:7](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/utils.ts#L7)

Generic function type representing any function that takes any parameters and returns any value.
Used throughout Reatom for typing function parameters and callbacks.

> **Fn**(...`params`): `any`

Defined in: [packages/core/src/utils.ts:8](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/utils.ts#L8)

Generic function type representing any function that takes any parameters and returns any value.
Used throughout Reatom for typing function parameters and callbacks.

### Parameters

#### params

...`any`[]

### Returns

`any`


<a name="interfacesfocusatommd"></a>

## Interface: FocusAtom()

Defined in: [packages/core/src/form/src/reatomField.ts:54](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L54)

Base atom interface for other userspace implementations.
This is the core interface that all atom-like objects implement,
providing the foundation for Reatom's reactivity system.

### Extends

- [`AtomLike`](#interfacesatomlikemd)\<[`FieldFocus`](#interfacesfieldfocusmd)\>

> **FocusAtom**(...`params`): [`FieldFocus`](#interfacesfieldfocusmd)

Defined in: [packages/core/src/form/src/reatomField.ts:54](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L54)

Base atom interface for other userspace implementations.
This is the core interface that all atom-like objects implement,
providing the foundation for Reatom's reactivity system.

### Parameters

#### params

...`any`[]

Parameters to pass to the atom

### Returns

[`FieldFocus`](#interfacesfieldfocusmd)

The atom's payload (typically its current state)

### Properties

#### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#interfacesatommetamd)

Defined in: [packages/core/src/core/atom.ts:99](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L99)

Reference to the atom's internal metadata.

##### Inherited from

[`AtomLike`](#interfacesatomlikemd).[`__reatom`](#__reatom)

***

#### actions

> **actions**: [`Actions`](#type-aliasesactionsmd)\<`FocusAtom`\>

Defined in: [packages/core/src/core/atom.ts:78](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L78)

Bind methods to the atom to extend its functionality.

##### Inherited from

[`AtomLike`](#interfacesatomlikemd).[`actions`](#actions)

***

#### extend

> **extend**: [`Extend`](#interfacesextendmd)\<`FocusAtom`\>

Defined in: [packages/core/src/core/atom.ts:84](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L84)

Extension system to add capabilities to atoms.
Allows adding middleware, methods, or other functionality to modify atom behavior.

##### Inherited from

[`AtomLike`](#interfacesatomlikemd).[`extend`](#extend)

***

#### in

> **in**: [`Action`](#interfacesactionmd)\<\[\], [`FieldFocus`](#interfacesfieldfocusmd)\>

Defined in: [packages/core/src/form/src/reatomField.ts:56](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L56)

Action for handling field focus.

***

#### out

> **out**: [`Action`](#interfacesactionmd)\<\[\], [`FieldFocus`](#interfacesfieldfocusmd)\>

Defined in: [packages/core/src/form/src/reatomField.ts:59](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L59)

Action for handling field blur.

***

#### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#interfacesunsubscribemd)

Defined in: [packages/core/src/core/atom.ts:94](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L94)

Subscribe to state changes, with the first call happening immediately.
When a subscriber is added, the callback is immediately invoked with the current state.
After that, it's called whenever the atom's state changes.

##### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it changes

##### Returns

[`Unsubscribe`](#interfacesunsubscribemd)

An unsubscribe function that removes the subscription when called

##### Inherited from

[`AtomLike`](#interfacesatomlikemd).[`subscribe`](#subscribe)


<a name="interfacesformmd"></a>

## Interface: Form\<T\>

Defined in: [packages/core/src/form/src/reatomForm.ts:121](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L121)

### Extends

- [`FieldSet`](#interfacesfieldsetmd)\<`T`\>

### Type Parameters

#### T

`T` *extends* [`FormInitState`](#type-aliasesforminitstatemd)

### Properties

#### fieldArraysList

> **fieldArraysList**: [`Computed`](#interfacescomputedmd)\<[`FormFieldArrayAtom`](#type-aliasesformfieldarrayatommd)[]\>

Defined in: [packages/core/src/form/src/reatomFieldSet.ts:42](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomFieldSet.ts#L42)

Computed list of all the field arrays from the fields tree

##### Inherited from

[`FieldSet`](#interfacesfieldsetmd).[`fieldArraysList`](#fieldarrayslist)

***

#### fields

> **fields**: [`FormFields`](#type-aliasesformfieldsmd)\<`T`\>

Defined in: [packages/core/src/form/src/reatomFieldSet.ts:36](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomFieldSet.ts#L36)

Fields from the init state

##### Inherited from

[`FieldSet`](#interfacesfieldsetmd).[`fields`](#fields)

***

#### fieldsList

> **fieldsList**: [`Computed`](#interfacescomputedmd)\<[`FieldAtom`](#interfacesfieldatommd)\<`any`, `any`\>[]\>

Defined in: [packages/core/src/form/src/reatomFieldSet.ts:39](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomFieldSet.ts#L39)

Computed list of all the fields from the fields tree

##### Inherited from

[`FieldSet`](#interfacesfieldsetmd).[`fieldsList`](#fieldslist)

***

#### fieldsState

> **fieldsState**: [`Computed`](#interfacescomputedmd)\<[`ParseAtoms`](#type-aliasesparseatomsmd)\<[`FormFields`](#type-aliasesformfieldsmd)\<`T`\>\>\>

Defined in: [packages/core/src/form/src/reatomFieldSet.ts:45](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomFieldSet.ts#L45)

Atom with the state of the fieldset, computed from all the fields in `fieldsList`

##### Inherited from

[`FieldSet`](#interfacesfieldsetmd).[`fieldsState`](#fieldsstate)

***

#### focus

> **focus**: [`Computed`](#interfacescomputedmd)\<[`FieldFocus`](#interfacesfieldfocusmd)\>

Defined in: [packages/core/src/form/src/reatomFieldSet.ts:48](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomFieldSet.ts#L48)

Atom with focus state of the fieldset, computed from all the fields in `fieldsList`

##### Inherited from

[`FieldSet`](#interfacesfieldsetmd).[`focus`](#focus)

***

#### init

> **init**: [`Action`](#interfacesactionmd)\<\[[`DeepPartial`](#type-aliasesdeeppartialmd)\<[`ParseAtoms`](#type-aliasesparseatomsmd)\<[`FormFields`](#type-aliasesformfieldsmd)\<`T`\>\>, `unknown`[]\>\], `void`\>

Defined in: [packages/core/src/form/src/reatomFieldSet.ts:54](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomFieldSet.ts#L54)

Action to set initial values for each field or field array in the fieldset

##### Inherited from

[`FieldSet`](#interfacesfieldsetmd).[`init`](#init)

***

#### reset

> **reset**: [`Action`](#interfacesactionmd)\<\[[`DeepPartial`](#type-aliasesdeeppartialmd)\<[`ParseAtoms`](#type-aliasesparseatomsmd)\<[`FormFields`](#type-aliasesformfieldsmd)\<`T`\>\>, `unknown`[]\>\], `void`\>

Defined in: [packages/core/src/form/src/reatomFieldSet.ts:57](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomFieldSet.ts#L57)

Action to reset the state, the value, the validation, and the focus states.

##### Inherited from

[`FieldSet`](#interfacesfieldsetmd).[`reset`](#reset)

***

#### submit

> **submit**: [`SubmitAction`](#interfacessubmitactionmd)

Defined in: [packages/core/src/form/src/reatomForm.ts:123](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L123)

Submit async handler. It checks the validation of all the fields in `fieldsList`, calls the form's `validate` options handler, and then the `onSubmit` options handler. Check the additional options properties of async action: https://www.reatom.dev/package/async/.

***

#### submitted

> **submitted**: [`Computed`](#interfacescomputedmd)\<`boolean`\>

Defined in: [packages/core/src/form/src/reatomForm.ts:126](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L126)

Atom with submitted state of the form

***

#### validation

> **validation**: [`Computed`](#interfacescomputedmd)\<[`FieldValidation`](#interfacesfieldvalidationmd)\>

Defined in: [packages/core/src/form/src/reatomFieldSet.ts:51](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomFieldSet.ts#L51)

Atom with validation state of the fieldset, computed from all the fields in `fieldsList`

##### Inherited from

[`FieldSet`](#interfacesfieldsetmd).[`validation`](#validation)


<a name="interfacesformfieldoptionsmd"></a>

## Interface: FormFieldOptions\<State, Value\>

Defined in: [packages/core/src/form/src/reatomForm.ts:38](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L38)

### Extends

- [`FieldOptions`](#interfacesfieldoptionsmd)\<`State`, `Value`\>

### Type Parameters

#### State

`State` = `any`

#### Value

`Value` = `State`

### Properties

#### contract()?

> `optional` **contract**: (`state`) => `unknown`

Defined in: [packages/core/src/form/src/reatomField.ts:172](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L172)

The callback to validate field contract.

##### Parameters

###### state

`State`

##### Returns

`unknown`

##### Inherited from

[`FieldOptions`](#interfacesfieldoptionsmd).[`contract`](#contract)

***

#### disabled?

> `optional` **disabled**: `boolean`

Defined in: [packages/core/src/form/src/reatomField.ts:178](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L178)

Defines if the field is disabled by default.

##### Default

```ts
false
```

##### Inherited from

[`FieldOptions`](#interfacesfieldoptionsmd).[`disabled`](#disabled)

***

#### filter()?

> `optional` **filter**: (`newValue`, `prevValue`) => `boolean`

Defined in: [packages/core/src/form/src/reatomField.ts:139](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L139)

The callback to filter "value" changes (from the 'change' action). It should return 'false' to skip the update.
By default, it always returns `true`.

##### Parameters

###### newValue

`Value`

###### prevValue

`Value`

##### Returns

`boolean`

##### Inherited from

[`FieldOptions`](#interfacesfieldoptionsmd).[`filter`](#filter)

***

#### fromState()?

> `optional` **fromState**: (`state`) => `Value`

Defined in: [packages/core/src/form/src/reatomField.ts:145](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L145)

The callback to compute the "value" data from the "state" data.
By default, it returns the "state" data without any transformations.

##### Parameters

###### state

`State`

##### Returns

`Value`

##### Inherited from

[`FieldOptions`](#interfacesfieldoptionsmd).[`fromState`](#fromstate)

***

#### initState

> **initState**: `State`

Defined in: [packages/core/src/form/src/reatomForm.ts:40](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L40)

***

#### isDirty()?

> `optional` **isDirty**: (`newValue`, `prevValue`) => `boolean`

Defined in: [packages/core/src/form/src/reatomField.ts:151](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L151)

The callback used to determine whether the "value" has changed.
By default, it utilizes `isDeepEqual` from reatom/utils.

##### Parameters

###### newValue

`Value`

###### prevValue

`Value`

##### Returns

`boolean`

##### Inherited from

[`FieldOptions`](#interfacesfieldoptionsmd).[`isDirty`](#isdirty)

***

#### keepErrorDuringValidating?

> `optional` **keepErrorDuringValidating**: `boolean`

Defined in: [packages/core/src/form/src/reatomField.ts:184](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L184)

Defines the reset behavior of the validation state during async validation.

##### Default

```ts
false
```

##### Inherited from

[`FieldOptions`](#interfacesfieldoptionsmd).[`keepErrorDuringValidating`](#keeperrorduringvalidating)

***

#### keepErrorOnChange?

> `optional` **keepErrorOnChange**: `boolean`

Defined in: [packages/core/src/form/src/reatomField.ts:191](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L191)

Defines the reset behavior of the validation state on field change.
Useful if the validation is triggered on blur or submit only.

##### Default

```ts
!validateOnChange
```

##### Inherited from

[`FieldOptions`](#interfacesfieldoptionsmd).[`keepErrorOnChange`](#keeperroronchange)

***

#### name?

> `optional` **name**: `string`

Defined in: [packages/core/src/form/src/reatomField.ts:156](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L156)

The name of the field and all related atoms and actions.

##### Inherited from

[`FieldOptions`](#interfacesfieldoptionsmd).[`name`](#name)

***

#### toState()?

> `optional` **toState**: (`value`) => `State`

Defined in: [packages/core/src/form/src/reatomField.ts:162](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L162)

The callback to transform the "state" data from the "value" data from the `change` action.
By default, it returns the "value" data without any transformations.

##### Parameters

###### value

`Value`

##### Returns

`State`

##### Inherited from

[`FieldOptions`](#interfacesfieldoptionsmd).[`toState`](#tostate)

***

#### validate?

> `optional` **validate**: [`FieldValidateOption`](#type-aliasesfieldvalidateoptionmd)\<`State`, `Value`\>

Defined in: [packages/core/src/form/src/reatomField.ts:167](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L167)

The callback to validate the field.

##### Inherited from

[`FieldOptions`](#interfacesfieldoptionsmd).[`validate`](#validate)

***

#### validateOnBlur?

> `optional` **validateOnBlur**: `boolean`

Defined in: [packages/core/src/form/src/reatomField.ts:203](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L203)

Defines if the validation should be triggered on the field blur.

##### Default

```ts
false
```

##### Inherited from

[`FieldOptions`](#interfacesfieldoptionsmd).[`validateOnBlur`](#validateonblur)

***

#### validateOnChange?

> `optional` **validateOnChange**: `boolean`

Defined in: [packages/core/src/form/src/reatomField.ts:197](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L197)

Defines if the validation should be triggered with every field change.

##### Default

```ts
false
```

##### Inherited from

[`FieldOptions`](#interfacesfieldoptionsmd).[`validateOnChange`](#validateonchange)


<a name="interfacesformoptionswithschemamd"></a>

## Interface: FormOptionsWithSchema\<State\>

Defined in: [packages/core/src/form/src/reatomForm.ts:161](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L161)

### Extends

- [`BaseFormOptions`](#interfacesbaseformoptionsmd)

### Type Parameters

#### State

`State`

### Properties

#### keepErrorDuringValidating?

> `optional` **keepErrorDuringValidating**: `boolean`

Defined in: [packages/core/src/form/src/reatomForm.ts:139](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L139)

Defines the default reset behavior of the validation state during async validation for all fields.

##### Default

```ts
false
```

##### Inherited from

[`BaseFormOptions`](#interfacesbaseformoptionsmd).[`keepErrorDuringValidating`](#keeperrorduringvalidating)

***

#### keepErrorOnChange?

> `optional` **keepErrorOnChange**: `boolean`

Defined in: [packages/core/src/form/src/reatomForm.ts:146](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L146)

Defines the default reset behavior of the validation state on field change for all fields.
Useful if the validation is triggered on blur or submit only.

##### Default

```ts
!validateOnChange
```

##### Inherited from

[`BaseFormOptions`](#interfacesbaseformoptionsmd).[`keepErrorOnChange`](#keeperroronchange)

***

#### name?

> `optional` **name**: `string`

Defined in: [packages/core/src/form/src/reatomForm.ts:130](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L130)

##### Inherited from

[`BaseFormOptions`](#interfacesbaseformoptionsmd).[`name`](#name)

***

#### onSubmit()?

> `optional` **onSubmit**: (`state`) => `void` \| `Promise`\<`void`\>

Defined in: [packages/core/src/form/src/reatomForm.ts:163](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L163)

The callback to process valid form data, typed according to the schema

##### Parameters

###### state

`State`

##### Returns

`void` \| `Promise`\<`void`\>

***

#### resetOnSubmit?

> `optional` **resetOnSubmit**: `boolean`

Defined in: [packages/core/src/form/src/reatomForm.ts:133](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L133)

Should reset the state after success submit?

##### Default

```ts
true
```

##### Inherited from

[`BaseFormOptions`](#interfacesbaseformoptionsmd).[`resetOnSubmit`](#resetonsubmit)

***

#### schema

> **schema**: `StandardSchemaV1`\<`State`\>

Defined in: [packages/core/src/form/src/reatomForm.ts:169](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L169)

The schema which supports StandardSchemaV1 specification to validate form fields.

***

#### validate()?

> `optional` **validate**: (`state`) => `any`

Defined in: [packages/core/src/form/src/reatomForm.ts:166](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L166)

The callback to validate form fields, typed according to the schema

##### Parameters

###### state

`State`

##### Returns

`any`

***

#### validateOnBlur?

> `optional` **validateOnBlur**: `boolean`

Defined in: [packages/core/src/form/src/reatomForm.ts:158](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L158)

Defines if the validation should be triggered on the field blur by default for all fields.

##### Default

```ts
false
```

##### Inherited from

[`BaseFormOptions`](#interfacesbaseformoptionsmd).[`validateOnBlur`](#validateonblur)

***

#### validateOnChange?

> `optional` **validateOnChange**: `boolean`

Defined in: [packages/core/src/form/src/reatomForm.ts:152](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L152)

Defines if the validation should be triggered with every field change by default for all fields.

##### Default

```ts
false
```

##### Inherited from

[`BaseFormOptions`](#interfacesbaseformoptionsmd).[`validateOnChange`](#validateonchange)


<a name="interfacesformoptionswithoutschemamd"></a>

## Interface: FormOptionsWithoutSchema\<T\>

Defined in: [packages/core/src/form/src/reatomForm.ts:172](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L172)

### Extends

- [`BaseFormOptions`](#interfacesbaseformoptionsmd)

### Type Parameters

#### T

`T` *extends* [`FormInitState`](#type-aliasesforminitstatemd)

### Properties

#### keepErrorDuringValidating?

> `optional` **keepErrorDuringValidating**: `boolean`

Defined in: [packages/core/src/form/src/reatomForm.ts:139](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L139)

Defines the default reset behavior of the validation state during async validation for all fields.

##### Default

```ts
false
```

##### Inherited from

[`BaseFormOptions`](#interfacesbaseformoptionsmd).[`keepErrorDuringValidating`](#keeperrorduringvalidating)

***

#### keepErrorOnChange?

> `optional` **keepErrorOnChange**: `boolean`

Defined in: [packages/core/src/form/src/reatomForm.ts:146](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L146)

Defines the default reset behavior of the validation state on field change for all fields.
Useful if the validation is triggered on blur or submit only.

##### Default

```ts
!validateOnChange
```

##### Inherited from

[`BaseFormOptions`](#interfacesbaseformoptionsmd).[`keepErrorOnChange`](#keeperroronchange)

***

#### name?

> `optional` **name**: `string`

Defined in: [packages/core/src/form/src/reatomForm.ts:130](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L130)

##### Inherited from

[`BaseFormOptions`](#interfacesbaseformoptionsmd).[`name`](#name)

***

#### onSubmit()?

> `optional` **onSubmit**: (`state`) => `void` \| `Promise`\<`void`\>

Defined in: [packages/core/src/form/src/reatomForm.ts:175](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L175)

The callback to process valid form data, typed according to the raw form state

##### Parameters

###### state

[`ParseAtoms`](#type-aliasesparseatomsmd)\<[`FormFields`](#type-aliasesformfieldsmd)\<`T`\>\>

##### Returns

`void` \| `Promise`\<`void`\>

***

#### resetOnSubmit?

> `optional` **resetOnSubmit**: `boolean`

Defined in: [packages/core/src/form/src/reatomForm.ts:133](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L133)

Should reset the state after success submit?

##### Default

```ts
true
```

##### Inherited from

[`BaseFormOptions`](#interfacesbaseformoptionsmd).[`resetOnSubmit`](#resetonsubmit)

***

#### schema?

> `optional` **schema**: `undefined`

Defined in: [packages/core/src/form/src/reatomForm.ts:181](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L181)

Schema is explicitly disallowed or undefined in this variant

***

#### validate()?

> `optional` **validate**: (`state`) => `any`

Defined in: [packages/core/src/form/src/reatomForm.ts:178](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L178)

The callback to validate form fields, typed according to the raw form state

##### Parameters

###### state

[`ParseAtoms`](#type-aliasesparseatomsmd)\<[`FormFields`](#type-aliasesformfieldsmd)\<`T`\>\>

##### Returns

`any`

***

#### validateOnBlur?

> `optional` **validateOnBlur**: `boolean`

Defined in: [packages/core/src/form/src/reatomForm.ts:158](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L158)

Defines if the validation should be triggered on the field blur by default for all fields.

##### Default

```ts
false
```

##### Inherited from

[`BaseFormOptions`](#interfacesbaseformoptionsmd).[`validateOnBlur`](#validateonblur)

***

#### validateOnChange?

> `optional` **validateOnChange**: `boolean`

Defined in: [packages/core/src/form/src/reatomForm.ts:152](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L152)

Defines if the validation should be triggered with every field change by default for all fields.

##### Default

```ts
false
```

##### Inherited from

[`BaseFormOptions`](#interfacesbaseformoptionsmd).[`validateOnChange`](#validateonchange)


<a name="interfacesframemd"></a>

## Interface: Frame\<State, Params, Payload\>

Defined in: [packages/core/src/core/atom.ts:148](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L148)

Call stack snapshot for an atom or action execution.

Frames represent the execution context of an atom at a specific point in time,
tracking its current state, error status, and dependencies.

### Extended by

- [`ContextFrame`](#interfacescontextframemd)

### Type Parameters

#### State

`State` = `any`

The state type of the atom

#### Params

`Params` *extends* `any`[] = `any`[]

The parameter types the atom accepts

#### Payload

`Payload` = `State`

The return type when the atom is called

### Properties

#### atom

> `readonly` **atom**: [`AtomLike`](#interfacesatomlikemd)\<`State`, `Params`, `Payload`\>

Defined in: [packages/core/src/core/atom.ts:166](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L166)

Reference to the atom itself

***

#### error

> **error**: `null` \| \{ \}

Defined in: [packages/core/src/core/atom.ts:156](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L156)

Error that occurred during atom evaluation, or null if successful

***

#### pubs

> **pubs**: \[`null` \| `Frame`\<`any`, `any`[], `any`\>, `...dependencies: Frame<any, any[], any>[]`\]

Defined in: [packages/core/src/core/atom.ts:173](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L173)

Immutable list of dependencies.
The first element is actualization flag and an imperative write cause.
Subsequent elements are the atom's dependencies.

***

#### state

> **state**: `State`

Defined in: [packages/core/src/core/atom.ts:161](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L161)

Current state of the atom

***

#### subs

> `readonly` **subs**: [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\>[]

Defined in: [packages/core/src/core/atom.ts:178](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L178)

Array of atoms that depend on this atom (subscribers).

### Methods

#### run()

> **run**\<`I`, `O`\>(`fn`, ...`params`): `O`

Defined in: [packages/core/src/core/atom.ts:188](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L188)

Run the callback in this context.
DO NOT USE directly, use `wrap` instead to preserve context correctly.

##### Type Parameters

###### I

`I` *extends* `any`[]

###### O

`O`

##### Parameters

###### fn

(...`params`) => `O`

Function to execute in this context

###### params

...`I`

Parameters to pass to the function

##### Returns

`O`

The result of the function call


<a name="interfacesgenericextmd"></a>

## Interface: GenericExt()\<Target\>

Defined in: [packages/core/src/core/extend.ts:26](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/extend.ts#L26)

Extension that preserves the exact type of the target atom/action.

This specialized extension type ensures that when applied to an atom or action,
the complete original type information is preserved, including all generic parameters.

### Type Parameters

#### Target

`Target` *extends* [`AtomLike`](#interfacesatomlikemd) = [`AtomLike`](#interfacesatomlikemd)

The type of atom or action the extension can be applied to

> **GenericExt**\<`T`\>(`target`): `T`

Defined in: [packages/core/src/core/extend.ts:27](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/extend.ts#L27)

Extension that preserves the exact type of the target atom/action.

This specialized extension type ensures that when applied to an atom or action,
the complete original type information is preserved, including all generic parameters.

### Type Parameters

#### T

`T` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\>

### Parameters

#### target

`T`

### Returns

`T`


<a name="interfaceslazyabortcontrollermd"></a>

## Interface: LazyAbortController

Defined in: [packages/core/src/methods/abort.ts:51](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/methods/abort.ts#L51)

Extended AbortController with unsubscribe capability

 LazyAbortController

### Extends

- `AbortController`

### Properties

#### unsubscribe

> **unsubscribe**: [`Unsubscribe`](#interfacesunsubscribemd)

Defined in: [packages/core/src/methods/abort.ts:55](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/methods/abort.ts#L55)

Function to unsubscribe and clean up the controller


<a name="interfaceslinkedlistmd"></a>

## Interface: LinkedList\<Node\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:34](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L34)

### Extended by

- [`LinkedListDerivedState`](#interfaceslinkedlistderivedstatemd)

### Type Parameters

#### Node

`Node` *extends* [`LLNode`](#type-aliasesllnodemd) = [`LLNode`](#type-aliasesllnodemd)

### Properties

#### changes

> **changes**: `LLChanges`\<`Node`\>[]

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:39](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L39)

***

#### head

> **head**: `null` \| `Node`

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:35](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L35)

***

#### size

> **size**: `number`

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:37](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L37)

***

#### tail

> **tail**: `null` \| `Node`

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:36](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L36)

***

#### version

> **version**: `number`

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:38](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L38)


<a name="interfaceslinkedlistatommd"></a>

## Interface: LinkedListAtom()\<Params, Node, Key\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:49](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L49)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

### Extends

- [`LinkedListLikeAtom`](#interfaceslinkedlistlikeatommd)\<[`LinkedList`](#interfaceslinkedlistmd)\<[`LLNode`](#type-aliasesllnodemd)\<`Node`\>\>\>

### Type Parameters

#### Params

`Params` *extends* `any`[] = `any`[]

The type of state stored in the atom

#### Node

`Node` *extends* [`Rec`](#type-aliasesrecmd) = [`Rec`](#type-aliasesrecmd)

#### Key

`Key` *extends* keyof `Node` = `never`

### Call Signature

> **LinkedListAtom**(`update`): [`LinkedList`](#interfaceslinkedlistmd)

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:49](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L49)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Parameters

##### update

(`state`) => [`LinkedList`](#interfaceslinkedlistmd)

Function that takes the current state and returns a new state

#### Returns

[`LinkedList`](#interfaceslinkedlistmd)

The new state value

### Call Signature

> **LinkedListAtom**(`newState`): [`LinkedList`](#interfaceslinkedlistmd)

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:49](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L49)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Parameters

##### newState

[`LinkedList`](#interfaceslinkedlistmd)

The new state value

#### Returns

[`LinkedList`](#interfaceslinkedlistmd)

The new state value

### Call Signature

> **LinkedListAtom**(...`params`): [`LinkedList`](#interfaceslinkedlistmd)

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:49](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L49)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Parameters

##### params

...\[\]

Parameters to pass to the atom

#### Returns

[`LinkedList`](#interfaceslinkedlistmd)

The atom's payload (typically its current state)

### Properties

#### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#interfacesatommetamd)

Defined in: [packages/core/src/core/atom.ts:99](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L99)

Reference to the atom's internal metadata.

##### Inherited from

[`LinkedListLikeAtom`](#interfaceslinkedlistlikeatommd).[`__reatom`](#__reatom)

***

#### \_\_reatomLinkedList

> **\_\_reatomLinkedList**: `true`

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:44](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L44)

##### Inherited from

[`LinkedListLikeAtom`](#interfaceslinkedlistlikeatommd).[`__reatomLinkedList`](#__reatomlinkedlist)

***

#### actions

> **actions**: [`Actions`](#type-aliasesactionsmd)\<`LinkedListAtom`\<`Params`, `Node`, `Key`\>\>

Defined in: [packages/core/src/core/atom.ts:78](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L78)

Bind methods to the atom to extend its functionality.

##### Inherited from

[`LinkedListLikeAtom`](#interfaceslinkedlistlikeatommd).[`actions`](#actions)

***

#### array

> **array**: [`Atom`](#interfacesatommd)\<[`LLNode`](#type-aliasesllnodemd)\<`Node`\>[]\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:46](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L46)

##### Inherited from

[`LinkedListLikeAtom`](#interfaceslinkedlistlikeatommd).[`array`](#array)

***

#### batch

> **batch**: [`Action`](#interfacesactionmd)\<\[[`Fn`](#interfacesfnmd)\]\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:54](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L54)

***

#### clear

> **clear**: [`Action`](#interfacesactionmd)\<\[\], `void`\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:60](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L60)

***

#### create

> **create**: [`Action`](#interfacesactionmd)\<`Params`, [`LLNode`](#type-aliasesllnodemd)\<`Node`\>\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:56](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L56)

***

#### extend

> **extend**: [`Extend`](#interfacesextendmd)\<`LinkedListAtom`\<`Params`, `Node`, `Key`\>\>

Defined in: [packages/core/src/core/atom.ts:84](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L84)

Extension system to add capabilities to atoms.
Allows adding middleware, methods, or other functionality to modify atom behavior.

##### Inherited from

[`LinkedListLikeAtom`](#interfaceslinkedlistlikeatommd).[`extend`](#extend)

***

#### find()

> **find**: (`cb`) => `null` \| [`LLNode`](#type-aliasesllnodemd)\<`Node`\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:62](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L62)

##### Parameters

###### cb

(`node`) => `boolean`

##### Returns

`null` \| [`LLNode`](#type-aliasesllnodemd)\<`Node`\>

***

#### initiateFromSnapshot()

> **initiateFromSnapshot**: (`initSnapshot`) => [`LinkedList`](#interfaceslinkedlistmd)\<[`LLNode`](#type-aliasesllnodemd)\<`Node`\>\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:69](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L69)

##### Parameters

###### initSnapshot

`Params`[]

##### Returns

[`LinkedList`](#interfaceslinkedlistmd)\<[`LLNode`](#type-aliasesllnodemd)\<`Node`\>\>

***

#### initiateFromState()

> **initiateFromState**: (`initState`) => [`LinkedList`](#interfaceslinkedlistmd)\<[`LLNode`](#type-aliasesllnodemd)\<`Node`\>\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:68](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L68)

##### Parameters

###### initState

`Node`[]

##### Returns

[`LinkedList`](#interfaceslinkedlistmd)\<[`LLNode`](#type-aliasesllnodemd)\<`Node`\>\>

***

#### map

> **map**: `Key` *extends* `never` ? `never` : [`Atom`](#interfacesatommd)\<`Map`\<`State`\<`Node`\[`Key`\]\>, [`LLNode`](#type-aliasesllnodemd)\<`Node`\>\>\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:66](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L66)

This lazy map is useful for working with serializable identifier,
but it is not recommended to use it for large (thousands elements) lists

***

#### move

> **move**: [`Action`](#interfacesactionmd)\<\[[`LLNode`](#type-aliasesllnodemd)\<`Node`\>, `null` \| [`LLNode`](#type-aliasesllnodemd)\<`Node`\>\], `void`\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:59](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L59)

***

#### reatomMap()

> **reatomMap**: \<`T`\>(`cb`, `options?`) => [`LinkedListDerivedAtom`](#interfaceslinkedlistderivedatommd)\<[`LLNode`](#type-aliasesllnodemd)\<`Node`\>, [`LLNode`](#type-aliasesllnodemd)\<`T`\>\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:73](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L73)

##### Type Parameters

###### T

`T` *extends* [`Rec`](#type-aliasesrecmd)

##### Parameters

###### cb

(`node`) => `T`

###### options?

`string` | \{ `name?`: `string`; `onClear?`: (`lastState`) => `void`; `onCreate?`: (`node`) => `void`; `onMove?`: (`node`) => `void`; `onRemove?`: (`node`, `origin`) => `void`; `onSwap?`: (`payload`) => `void`; \}

##### Returns

[`LinkedListDerivedAtom`](#interfaceslinkedlistderivedatommd)\<[`LLNode`](#type-aliasesllnodemd)\<`Node`\>, [`LLNode`](#type-aliasesllnodemd)\<`T`\>\>

***

#### remove

> **remove**: [`Action`](#interfacesactionmd)\<\[[`LLNode`](#type-aliasesllnodemd)\<`Node`\>\], `boolean`\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:57](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L57)

***

#### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#interfacesunsubscribemd)

Defined in: [packages/core/src/core/atom.ts:94](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L94)

Subscribe to state changes, with the first call happening immediately.
When a subscriber is added, the callback is immediately invoked with the current state.
After that, it's called whenever the atom's state changes.

##### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it changes

##### Returns

[`Unsubscribe`](#interfacesunsubscribemd)

An unsubscribe function that removes the subscription when called

##### Inherited from

[`LinkedListLikeAtom`](#interfaceslinkedlistlikeatommd).[`subscribe`](#subscribe)

***

#### swap

> **swap**: [`Action`](#interfacesactionmd)\<\[[`LLNode`](#type-aliasesllnodemd)\<`Node`\>, [`LLNode`](#type-aliasesllnodemd)\<`Node`\>\], `void`\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:58](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L58)


<a name="interfaceslinkedlistderivedatommd"></a>

## Interface: LinkedListDerivedAtom()\<Node, T\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:110](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L110)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

### Extends

- [`LinkedListLikeAtom`](#interfaceslinkedlistlikeatommd)\<[`LinkedListDerivedState`](#interfaceslinkedlistderivedstatemd)\<`Node`, `T`\>\>

### Type Parameters

#### Node

`Node` *extends* [`LLNode`](#type-aliasesllnodemd)

The type of state stored in the atom

#### T

`T` *extends* [`LLNode`](#type-aliasesllnodemd)

### Call Signature

> **LinkedListDerivedAtom**(`update`): [`LinkedListDerivedState`](#interfaceslinkedlistderivedstatemd)

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:110](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L110)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Parameters

##### update

(`state`) => [`LinkedListDerivedState`](#interfaceslinkedlistderivedstatemd)

Function that takes the current state and returns a new state

#### Returns

[`LinkedListDerivedState`](#interfaceslinkedlistderivedstatemd)

The new state value

### Call Signature

> **LinkedListDerivedAtom**(`newState`): [`LinkedListDerivedState`](#interfaceslinkedlistderivedstatemd)

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:110](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L110)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Parameters

##### newState

[`LinkedListDerivedState`](#interfaceslinkedlistderivedstatemd)

The new state value

#### Returns

[`LinkedListDerivedState`](#interfaceslinkedlistderivedstatemd)

The new state value

### Call Signature

> **LinkedListDerivedAtom**(...`params`): [`LinkedListDerivedState`](#interfaceslinkedlistderivedstatemd)

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:110](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L110)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Parameters

##### params

...\[\]

Parameters to pass to the atom

#### Returns

[`LinkedListDerivedState`](#interfaceslinkedlistderivedstatemd)

The atom's payload (typically its current state)

### Properties

#### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#interfacesatommetamd)

Defined in: [packages/core/src/core/atom.ts:99](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L99)

Reference to the atom's internal metadata.

##### Inherited from

[`LinkedListLikeAtom`](#interfaceslinkedlistlikeatommd).[`__reatom`](#__reatom)

***

#### \_\_reatomLinkedList

> **\_\_reatomLinkedList**: `true`

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:44](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L44)

##### Inherited from

[`LinkedListLikeAtom`](#interfaceslinkedlistlikeatommd).[`__reatomLinkedList`](#__reatomlinkedlist)

***

#### actions

> **actions**: [`Actions`](#type-aliasesactionsmd)\<`LinkedListDerivedAtom`\<`Node`, `T`\>\>

Defined in: [packages/core/src/core/atom.ts:78](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L78)

Bind methods to the atom to extend its functionality.

##### Inherited from

[`LinkedListLikeAtom`](#interfaceslinkedlistlikeatommd).[`actions`](#actions)

***

#### array

> **array**: [`Atom`](#interfacesatommd)\<`T`[]\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:46](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L46)

##### Inherited from

[`LinkedListLikeAtom`](#interfaceslinkedlistlikeatommd).[`array`](#array)

***

#### extend

> **extend**: [`Extend`](#interfacesextendmd)\<`LinkedListDerivedAtom`\<`Node`, `T`\>\>

Defined in: [packages/core/src/core/atom.ts:84](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L84)

Extension system to add capabilities to atoms.
Allows adding middleware, methods, or other functionality to modify atom behavior.

##### Inherited from

[`LinkedListLikeAtom`](#interfaceslinkedlistlikeatommd).[`extend`](#extend)

***

#### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#interfacesunsubscribemd)

Defined in: [packages/core/src/core/atom.ts:94](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L94)

Subscribe to state changes, with the first call happening immediately.
When a subscriber is added, the callback is immediately invoked with the current state.
After that, it's called whenever the atom's state changes.

##### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it changes

##### Returns

[`Unsubscribe`](#interfacesunsubscribemd)

An unsubscribe function that removes the subscription when called

##### Inherited from

[`LinkedListLikeAtom`](#interfaceslinkedlistlikeatommd).[`subscribe`](#subscribe)


<a name="interfaceslinkedlistderivedstatemd"></a>

## Interface: LinkedListDerivedState\<Node, T\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:105](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L105)

### Extends

- [`LinkedList`](#interfaceslinkedlistmd)\<`T`\>

### Type Parameters

#### Node

`Node` *extends* [`LLNode`](#type-aliasesllnodemd)

#### T

`T` *extends* [`LLNode`](#type-aliasesllnodemd)

### Properties

#### changes

> **changes**: `LLChanges`\<`T`\>[]

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:39](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L39)

##### Inherited from

[`LinkedList`](#interfaceslinkedlistmd).[`changes`](#changes)

***

#### head

> **head**: `null` \| `T`

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:35](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L35)

##### Inherited from

[`LinkedList`](#interfaceslinkedlistmd).[`head`](#head)

***

#### map

> **map**: `WeakMap`\<`Node`, `T`\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:107](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L107)

***

#### size

> **size**: `number`

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:37](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L37)

##### Inherited from

[`LinkedList`](#interfaceslinkedlistmd).[`size`](#size)

***

#### tail

> **tail**: `null` \| `T`

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:36](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L36)

##### Inherited from

[`LinkedList`](#interfaceslinkedlistmd).[`tail`](#tail)

***

#### version

> **version**: `number`

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:38](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L38)

##### Inherited from

[`LinkedList`](#interfaceslinkedlistmd).[`version`](#version)


<a name="interfaceslinkedlistlikeatommd"></a>

## Interface: LinkedListLikeAtom()\<T\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:42](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L42)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

### Extends

- [`Atom`](#interfacesatommd)\<`T`\>

### Extended by

- [`LinkedListAtom`](#interfaceslinkedlistatommd)
- [`LinkedListDerivedAtom`](#interfaceslinkedlistderivedatommd)

### Type Parameters

#### T

`T` *extends* [`LinkedList`](#interfaceslinkedlistmd) = [`LinkedList`](#interfaceslinkedlistmd)

The type of state stored in the atom

### Call Signature

> **LinkedListLikeAtom**(`update`): `T`

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:42](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L42)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Parameters

##### update

(`state`) => `T`

Function that takes the current state and returns a new state

#### Returns

`T`

The new state value

### Call Signature

> **LinkedListLikeAtom**(`newState`): `T`

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:42](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L42)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Parameters

##### newState

`T`

The new state value

#### Returns

`T`

The new state value

### Call Signature

> **LinkedListLikeAtom**(...`params`): `T`

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:42](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L42)

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

### Properties

#### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#interfacesatommetamd)

Defined in: [packages/core/src/core/atom.ts:99](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L99)

Reference to the atom's internal metadata.

##### Inherited from

[`Atom`](#interfacesatommd).[`__reatom`](#__reatom)

***

#### \_\_reatomLinkedList

> **\_\_reatomLinkedList**: `true`

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:44](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L44)

***

#### actions

> **actions**: [`Actions`](#type-aliasesactionsmd)\<`LinkedListLikeAtom`\<`T`\>\>

Defined in: [packages/core/src/core/atom.ts:78](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L78)

Bind methods to the atom to extend its functionality.

##### Inherited from

[`Atom`](#interfacesatommd).[`actions`](#actions)

***

#### array

> **array**: [`Atom`](#interfacesatommd)\<`T` *extends* [`LinkedList`](#interfaceslinkedlistmd)\<`LLNode`\> ? `LLNode` : `never`[]\>

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:46](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L46)

***

#### extend

> **extend**: [`Extend`](#interfacesextendmd)\<`LinkedListLikeAtom`\<`T`\>\>

Defined in: [packages/core/src/core/atom.ts:84](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L84)

Extension system to add capabilities to atoms.
Allows adding middleware, methods, or other functionality to modify atom behavior.

##### Inherited from

[`Atom`](#interfacesatommd).[`extend`](#extend)

***

#### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#interfacesunsubscribemd)

Defined in: [packages/core/src/core/atom.ts:94](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L94)

Subscribe to state changes, with the first call happening immediately.
When a subscriber is added, the callback is immediately invoked with the current state.
After that, it's called whenever the atom's state changes.

##### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it changes

##### Returns

[`Unsubscribe`](#interfacesunsubscribemd)

An unsubscribe function that removes the subscription when called

##### Inherited from

[`Atom`](#interfacesatommd).[`subscribe`](#subscribe)


<a name="interfacesmapatommd"></a>

## Interface: MapAtom()\<Key, Value\>

Defined in: [packages/core/src/primitives/reatomMap.ts:4](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomMap.ts#L4)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

### Extends

- [`Atom`](#interfacesatommd)\<`Map`\<`Key`, `Value`\>\>

### Type Parameters

#### Key

`Key`

The type of state stored in the atom

#### Value

`Value`

### Call Signature

> **MapAtom**(`update`): `Map`

Defined in: [packages/core/src/primitives/reatomMap.ts:4](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomMap.ts#L4)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Parameters

##### update

(`state`) => `Map`

Function that takes the current state and returns a new state

#### Returns

`Map`

The new state value

### Call Signature

> **MapAtom**(`newState`): `Map`

Defined in: [packages/core/src/primitives/reatomMap.ts:4](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomMap.ts#L4)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Parameters

##### newState

`Map`

The new state value

#### Returns

`Map`

The new state value

### Call Signature

> **MapAtom**(...`params`): `Map`

Defined in: [packages/core/src/primitives/reatomMap.ts:4](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomMap.ts#L4)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Parameters

##### params

...\[\]

Parameters to pass to the atom

#### Returns

`Map`

The atom's payload (typically its current state)

### Properties

#### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#interfacesatommetamd)

Defined in: [packages/core/src/core/atom.ts:99](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L99)

Reference to the atom's internal metadata.

##### Inherited from

[`Atom`](#interfacesatommd).[`__reatom`](#__reatom)

***

#### actions

> **actions**: [`Actions`](#type-aliasesactionsmd)\<`MapAtom`\<`Key`, `Value`\>\>

Defined in: [packages/core/src/core/atom.ts:78](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L78)

Bind methods to the atom to extend its functionality.

##### Inherited from

[`Atom`](#interfacesatommd).[`actions`](#actions)

***

#### clear

> **clear**: [`Action`](#interfacesactionmd)\<\[\], `Map`\<`Key`, `Value`\>\>

Defined in: [packages/core/src/primitives/reatomMap.ts:8](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomMap.ts#L8)

***

#### delete

> **delete**: [`Action`](#interfacesactionmd)\<\[`Key`\], `Map`\<`Key`, `Value`\>\>

Defined in: [packages/core/src/primitives/reatomMap.ts:7](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomMap.ts#L7)

***

#### extend

> **extend**: [`Extend`](#interfacesextendmd)\<`MapAtom`\<`Key`, `Value`\>\>

Defined in: [packages/core/src/core/atom.ts:84](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L84)

Extension system to add capabilities to atoms.
Allows adding middleware, methods, or other functionality to modify atom behavior.

##### Inherited from

[`Atom`](#interfacesatommd).[`extend`](#extend)

***

#### getOrCreate()

> **getOrCreate**: (`key`, `creator`) => `Value`

Defined in: [packages/core/src/primitives/reatomMap.ts:5](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomMap.ts#L5)

##### Parameters

###### key

`Key`

###### creator

() => `Value`

##### Returns

`Value`

***

#### reset

> **reset**: [`Action`](#interfacesactionmd)\<\[\], `Map`\<`Key`, `Value`\>\>

Defined in: [packages/core/src/primitives/reatomMap.ts:9](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomMap.ts#L9)

***

#### set

> **set**: [`Action`](#interfacesactionmd)\<\[`Key`, `Value`\], `Map`\<`Key`, `Value`\>\>

Defined in: [packages/core/src/primitives/reatomMap.ts:6](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomMap.ts#L6)

***

#### size

> **size**: [`Computed`](#interfacescomputedmd)\<`number`\>

Defined in: [packages/core/src/primitives/reatomMap.ts:10](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomMap.ts#L10)

***

#### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#interfacesunsubscribemd)

Defined in: [packages/core/src/core/atom.ts:94](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L94)

Subscribe to state changes, with the first call happening immediately.
When a subscriber is added, the callback is immediately invoked with the current state.
After that, it's called whenever the atom's state changes.

##### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it changes

##### Returns

[`Unsubscribe`](#interfacesunsubscribemd)

An unsubscribe function that removes the subscription when called

##### Inherited from

[`Atom`](#interfacesatommd).[`subscribe`](#subscribe)


<a name="interfacesnewablemd"></a>

## Interface: Newable\<ReturnType\>

Defined in: [packages/core/src/utils.ts:81](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/utils.ts#L81)

Represents a constructor function that can be instantiated with the new operator.

### Type Parameters

#### ReturnType

`ReturnType`

The type of object that will be created when instantiated

### Constructors

#### Constructor

> **new Newable**(...`params`): `ReturnType`

Defined in: [packages/core/src/utils.ts:82](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/utils.ts#L82)

##### Parameters

###### params

...`any`[]

##### Returns

`ReturnType`


<a name="interfacesnumberatommd"></a>

## Interface: NumberAtom()

Defined in: [packages/core/src/primitives/reatomNumber.ts:4](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomNumber.ts#L4)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

### Extends

- [`Atom`](#interfacesatommd)\<`number`\>

### Call Signature

> **NumberAtom**(`update`): `number`

Defined in: [packages/core/src/primitives/reatomNumber.ts:4](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomNumber.ts#L4)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Parameters

##### update

(`state`) => `number`

Function that takes the current state and returns a new state

#### Returns

`number`

The new state value

### Call Signature

> **NumberAtom**(`newState`): `number`

Defined in: [packages/core/src/primitives/reatomNumber.ts:4](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomNumber.ts#L4)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Parameters

##### newState

`number`

The new state value

#### Returns

`number`

The new state value

### Call Signature

> **NumberAtom**(...`params`): `number`

Defined in: [packages/core/src/primitives/reatomNumber.ts:4](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomNumber.ts#L4)

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

### Properties

#### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#interfacesatommetamd)

Defined in: [packages/core/src/core/atom.ts:99](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L99)

Reference to the atom's internal metadata.

##### Inherited from

[`Atom`](#interfacesatommd).[`__reatom`](#__reatom)

***

#### actions

> **actions**: [`Actions`](#type-aliasesactionsmd)\<`NumberAtom`\>

Defined in: [packages/core/src/core/atom.ts:78](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L78)

Bind methods to the atom to extend its functionality.

##### Inherited from

[`Atom`](#interfacesatommd).[`actions`](#actions)

***

#### decrement

> **decrement**: [`Action`](#interfacesactionmd)\<\[`number`\], `number`\>

Defined in: [packages/core/src/primitives/reatomNumber.ts:6](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomNumber.ts#L6)

***

#### extend

> **extend**: [`Extend`](#interfacesextendmd)\<`NumberAtom`\>

Defined in: [packages/core/src/core/atom.ts:84](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L84)

Extension system to add capabilities to atoms.
Allows adding middleware, methods, or other functionality to modify atom behavior.

##### Inherited from

[`Atom`](#interfacesatommd).[`extend`](#extend)

***

#### increment

> **increment**: [`Action`](#interfacesactionmd)\<\[`number`\], `number`\>

Defined in: [packages/core/src/primitives/reatomNumber.ts:5](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomNumber.ts#L5)

***

#### random

> **random**: [`Action`](#interfacesactionmd)\<\[`number`, `number`\], `number`\>

Defined in: [packages/core/src/primitives/reatomNumber.ts:7](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomNumber.ts#L7)

***

#### reset

> **reset**: [`Action`](#interfacesactionmd)\<\[\], `number`\>

Defined in: [packages/core/src/primitives/reatomNumber.ts:8](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomNumber.ts#L8)

***

#### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#interfacesunsubscribemd)

Defined in: [packages/core/src/core/atom.ts:94](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L94)

Subscribe to state changes, with the first call happening immediately.
When a subscriber is added, the callback is immediately invoked with the current state.
After that, it's called whenever the atom's state changes.

##### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it changes

##### Returns

[`Unsubscribe`](#interfacesunsubscribemd)

An unsubscribe function that removes the subscription when called

##### Inherited from

[`Atom`](#interfacesatommd).[`subscribe`](#subscribe)


<a name="interfacesparamsextmd"></a>

## Interface: ParamsExt()\<Target, Params\>

Defined in: [packages/core/src/core/extend.ts:255](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/extend.ts#L255)

Extension for customizing parameter handling in atoms and actions.

This extension type allows transforming the parameters an atom or action
accepts, enabling custom parameter parsing, validation, or transformation.

### Type Parameters

#### Target

`Target` *extends* [`AtomLike`](#interfacesatomlikemd) = [`AtomLike`](#interfacesatomlikemd)

The atom or action type being extended

#### Params

`Params` *extends* `any`[] = `any`[]

The new parameter types the atom/action will accept

> **ParamsExt**(`target`): `Target` *extends* [`Action`](#interfacesactionmd)\<`ActionParams`, `Payload`\> ? `ActionParams` *extends* \[`any`\] ? [`Action`](#interfacesactionmd)\<`Params`, `Payload`\> : `object` & [`Action`](#interfacesactionmd)\<`unknown`[], `unknown`\> : [`AtomLike`](#interfacesatomlikemd)\<[`AtomState`](#type-aliasesatomstatemd)\<`Target`\>, \[\] \| `Params`, [`AtomState`](#type-aliasesatomstatemd)\<`Target`\>\> & \{ \[K in string \| number \| symbol\]: Target\[K\] \}

Defined in: [packages/core/src/core/extend.ts:259](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/extend.ts#L259)

Extension for customizing parameter handling in atoms and actions.

This extension type allows transforming the parameters an atom or action
accepts, enabling custom parameter parsing, validation, or transformation.

### Parameters

#### target

`Target`

### Returns

`Target` *extends* [`Action`](#interfacesactionmd)\<`ActionParams`, `Payload`\> ? `ActionParams` *extends* \[`any`\] ? [`Action`](#interfacesactionmd)\<`Params`, `Payload`\> : `object` & [`Action`](#interfacesactionmd)\<`unknown`[], `unknown`\> : [`AtomLike`](#interfacesatomlikemd)\<[`AtomState`](#type-aliasesatomstatemd)\<`Target`\>, \[\] \| `Params`, [`AtomState`](#type-aliasesatomstatemd)\<`Target`\>\> & \{ \[K in string \| number \| symbol\]: Target\[K\] \}


<a name="interfacesqueuemd"></a>

## Interface: Queue

Defined in: [packages/core/src/core/atom.ts:202](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L202)

Task queue for scheduled operations.

### Extends

- `Array`\<[`Fn`](#interfacesfnmd)\>

### Indexable

\[`n`: `number`\]: [`Fn`](#interfacesfnmd)


<a name="interfacesrecordatommd"></a>

## Interface: RecordAtom()\<T\>

Defined in: [packages/core/src/primitives/reatomRecord.ts:4](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomRecord.ts#L4)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

### Extends

- [`Atom`](#interfacesatommd)\<`T`\>

### Type Parameters

#### T

`T` *extends* [`Rec`](#type-aliasesrecmd)

The type of state stored in the atom

### Call Signature

> **RecordAtom**(`update`): `T`

Defined in: [packages/core/src/primitives/reatomRecord.ts:4](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomRecord.ts#L4)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Parameters

##### update

(`state`) => `T`

Function that takes the current state and returns a new state

#### Returns

`T`

The new state value

### Call Signature

> **RecordAtom**(`newState`): `T`

Defined in: [packages/core/src/primitives/reatomRecord.ts:4](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomRecord.ts#L4)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Parameters

##### newState

`T`

The new state value

#### Returns

`T`

The new state value

### Call Signature

> **RecordAtom**(...`params`): `T`

Defined in: [packages/core/src/primitives/reatomRecord.ts:4](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomRecord.ts#L4)

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

### Properties

#### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#interfacesatommetamd)

Defined in: [packages/core/src/core/atom.ts:99](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L99)

Reference to the atom's internal metadata.

##### Inherited from

[`Atom`](#interfacesatommd).[`__reatom`](#__reatom)

***

#### actions

> **actions**: [`Actions`](#type-aliasesactionsmd)\<`RecordAtom`\<`T`\>\>

Defined in: [packages/core/src/core/atom.ts:78](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L78)

Bind methods to the atom to extend its functionality.

##### Inherited from

[`Atom`](#interfacesatommd).[`actions`](#actions)

***

#### extend

> **extend**: [`Extend`](#interfacesextendmd)\<`RecordAtom`\<`T`\>\>

Defined in: [packages/core/src/core/atom.ts:84](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L84)

Extension system to add capabilities to atoms.
Allows adding middleware, methods, or other functionality to modify atom behavior.

##### Inherited from

[`Atom`](#interfacesatommd).[`extend`](#extend)

***

#### merge

> **merge**: [`Action`](#interfacesactionmd)\<\[`Partial`\<`T`\>\], `T`\>

Defined in: [packages/core/src/primitives/reatomRecord.ts:5](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomRecord.ts#L5)

***

#### omit

> **omit**: [`Action`](#interfacesactionmd)\<keyof `T`[], `T`\>

Defined in: [packages/core/src/primitives/reatomRecord.ts:6](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomRecord.ts#L6)

***

#### reset

> **reset**: [`Action`](#interfacesactionmd)\<keyof `T`[], `T`\>

Defined in: [packages/core/src/primitives/reatomRecord.ts:7](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomRecord.ts#L7)

***

#### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#interfacesunsubscribemd)

Defined in: [packages/core/src/core/atom.ts:94](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L94)

Subscribe to state changes, with the first call happening immediately.
When a subscriber is added, the callback is immediately invoked with the current state.
After that, it's called whenever the atom's state changes.

##### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it changes

##### Returns

[`Unsubscribe`](#interfacesunsubscribemd)

An unsubscribe function that removes the subscription when called

##### Inherited from

[`Atom`](#interfacesatommd).[`subscribe`](#subscribe)


<a name="interfacesrouteatommd"></a>

## Interface: RouteAtom()\<Path\>

Defined in: [packages/core/src/web/url.ts:42](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/web/url.ts#L42)

Derived state container.

A computed atom automatically tracks dependencies and recalculates only when
those dependencies change. The calculation is performed lazily, only when the
computed value is read AND subscribed to.

### Extends

- [`Computed`](#interfacescomputedmd)\<`null` \| `PathParams`\<`Path`\>\>

### Type Parameters

#### Path

`Path` *extends* `string` = `string`

The type of derived state

> **RouteAtom**(...`params`): `null` \| [`Plain`](#type-aliasesplainmd)\<`_PathParams`\<`Path`\>\>

Defined in: [packages/core/src/web/url.ts:42](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/web/url.ts#L42)

Derived state container.

A computed atom automatically tracks dependencies and recalculates only when
those dependencies change. The calculation is performed lazily, only when the
computed value is read AND subscribed to.

### Parameters

#### params

...\[\]

Parameters to pass to the atom

### Returns

`null` \| [`Plain`](#type-aliasesplainmd)\<`_PathParams`\<`Path`\>\>

The atom's payload (typically its current state)

### Properties

#### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#interfacesatommetamd)

Defined in: [packages/core/src/core/atom.ts:99](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L99)

Reference to the atom's internal metadata.

##### Inherited from

[`Computed`](#interfacescomputedmd).[`__reatom`](#__reatom)

***

#### actions

> **actions**: [`Actions`](#type-aliasesactionsmd)\<`RouteAtom`\<`Path`\>\>

Defined in: [packages/core/src/core/atom.ts:78](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L78)

Bind methods to the atom to extend its functionality.

##### Inherited from

[`Computed`](#interfacescomputedmd).[`actions`](#actions)

***

#### exact

> **exact**: [`Computed`](#interfacescomputedmd)\<`boolean`\>

Defined in: [packages/core/src/web/url.ts:57](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/web/url.ts#L57)

***

#### extend

> **extend**: [`Extend`](#interfacesextendmd)\<`RouteAtom`\<`Path`\>\>

Defined in: [packages/core/src/core/atom.ts:84](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L84)

Extension system to add capabilities to atoms.
Allows adding middleware, methods, or other functionality to modify atom behavior.

##### Inherited from

[`Computed`](#interfacescomputedmd).[`extend`](#extend)

***

#### go

> **go**: [`Action`](#interfacesactionmd)\<`Path` *extends* `` `${string}:${string}` `` ? \[[`Plain`](#type-aliasesplainmd)\<`_PathParams`\<`Path`\<`Path`\>\>\>, [`Rec`](#type-aliasesrecmd), `boolean`\] : \[`void`, [`Rec`](#type-aliasesrecmd), `boolean`\], `URL`\>

Defined in: [packages/core/src/web/url.ts:44](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/web/url.ts#L44)

***

#### path()

> **path**: (`params`) => `string`

Defined in: [packages/core/src/web/url.ts:53](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/web/url.ts#L53)

##### Parameters

###### params

`Path` *extends* `` `${string}:${string}` `` ? [`Plain`](#type-aliasesplainmd)\<`_PathParams`\<`Path`\<`Path`\>\>\> : `void`

##### Returns

`string`

***

#### pattern

> **pattern**: `Path`

Defined in: [packages/core/src/web/url.ts:51](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/web/url.ts#L51)

***

#### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#interfacesunsubscribemd)

Defined in: [packages/core/src/core/atom.ts:94](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L94)

Subscribe to state changes, with the first call happening immediately.
When a subscriber is added, the callback is immediately invoked with the current state.
After that, it's called whenever the atom's state changes.

##### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it changes

##### Returns

[`Unsubscribe`](#interfacesunsubscribemd)

An unsubscribe function that removes the subscription when called

##### Inherited from

[`Computed`](#interfacescomputedmd).[`subscribe`](#subscribe)


<a name="interfacessearchparamsatommd"></a>

## Interface: SearchParamsAtom()

Defined in: [packages/core/src/web/url.ts:133](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/web/url.ts#L133)

Interface for the search parameters atom.

### Extends

- [`Computed`](#interfacescomputedmd)\<`Record`\<`string`, `string`\>\>

> **SearchParamsAtom**(...`params`): `Record`

Defined in: [packages/core/src/web/url.ts:133](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/web/url.ts#L133)

Interface for the search parameters atom.

### Parameters

#### params

...\[\]

Parameters to pass to the atom

### Returns

`Record`

The atom's payload (typically its current state)

### Properties

#### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#interfacesatommetamd)

Defined in: [packages/core/src/core/atom.ts:99](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L99)

Reference to the atom's internal metadata.

##### Inherited from

[`Computed`](#interfacescomputedmd).[`__reatom`](#__reatom)

***

#### actions

> **actions**: [`Actions`](#type-aliasesactionsmd)\<`SearchParamsAtom`\>

Defined in: [packages/core/src/core/atom.ts:78](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L78)

Bind methods to the atom to extend its functionality.

##### Inherited from

[`Computed`](#interfacescomputedmd).[`actions`](#actions)

***

#### del

> **del**: [`Action`](#interfacesactionmd)\<\[`string`, `boolean`\], `void`\>

Defined in: [packages/core/src/web/url.ts:147](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/web/url.ts#L147)

Delete a search parameter.

##### Param

Parameter name to delete

##### Param

Whether to replace the current history entry

***

#### extend

> **extend**: [`Extend`](#interfacesextendmd)\<`SearchParamsAtom`\>

Defined in: [packages/core/src/core/atom.ts:84](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L84)

Extension system to add capabilities to atoms.
Allows adding middleware, methods, or other functionality to modify atom behavior.

##### Inherited from

[`Computed`](#interfacescomputedmd).[`extend`](#extend)

***

#### set

> **set**: [`Action`](#interfacesactionmd)\<\[`string`, `string`, `boolean`\], `void`\>

Defined in: [packages/core/src/web/url.ts:140](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/web/url.ts#L140)

Set a search parameter.

##### Param

Parameter name

##### Param

Parameter value

##### Param

Whether to replace the current history entry

***

#### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#interfacesunsubscribemd)

Defined in: [packages/core/src/core/atom.ts:94](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L94)

Subscribe to state changes, with the first call happening immediately.
When a subscriber is added, the callback is immediately invoked with the current state.
After that, it's called whenever the atom's state changes.

##### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it changes

##### Returns

[`Unsubscribe`](#interfacesunsubscribemd)

An unsubscribe function that removes the subscription when called

##### Inherited from

[`Computed`](#interfacescomputedmd).[`subscribe`](#subscribe)

### Methods

#### lens()

##### Call Signature

> **lens**\<`T`\>(`key`, `parse?`): [`Atom`](#interfacesatommd)\<`T`\>

Defined in: [packages/core/src/web/url.ts:154](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/web/url.ts#L154)

Create an atom that synchronizes with a specific search parameter.

###### Type Parameters

####### T

`T` = `string`

###### Parameters

####### key

`string`

Parameter name

####### parse?

(`value?`) => `T`

Function to parse parameter string value to desired type

###### Returns

[`Atom`](#interfacesatommd)\<`T`\>

##### Call Signature

> **lens**\<`T`\>(`key`, `options`): [`Atom`](#interfacesatommd)\<`T`\>

Defined in: [packages/core/src/web/url.ts:166](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/web/url.ts#L166)

Create an atom that synchronizes with a specific search parameter using advanced options.

###### Type Parameters

####### T

`T` = `string`

###### Parameters

####### key

`string`

Parameter name

####### options

Configuration options for the lens

####### name?

`string`

Optional name of the created atom

####### parse?

(`value?`) => `T`

Optional function to parse the parameter string value into the desired type

####### path?

`string`

Optional path to limit the scope of synchronization to specific URL paths

####### replace?

`boolean`

Optional boolean to specify if history entries should be replaced (default: false)

####### serialize?

(`value`) => `undefined` \| `string`

Optional function to serialize the value back into a string

###### Returns

[`Atom`](#interfacesatommd)\<`T`\>


<a name="interfacessetatommd"></a>

## Interface: SetAtom()\<T\>

Defined in: [packages/core/src/primitives/reatomSet.ts:10](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomSet.ts#L10)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

### Extends

- [`Atom`](#interfacesatommd)\<`Set`\<`T`\>\>

### Type Parameters

#### T

`T`

The type of state stored in the atom

### Call Signature

> **SetAtom**(`update`): `Set`

Defined in: [packages/core/src/primitives/reatomSet.ts:10](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomSet.ts#L10)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Parameters

##### update

(`state`) => `Set`

Function that takes the current state and returns a new state

#### Returns

`Set`

The new state value

### Call Signature

> **SetAtom**(`newState`): `Set`

Defined in: [packages/core/src/primitives/reatomSet.ts:10](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomSet.ts#L10)

Base changeable state container.

Atom is the core primitive for storing and updating mutable state in Reatom.
It can be called to retrieve its current state or update it with a new value
or update function.

#### Parameters

##### newState

`Set`

The new state value

#### Returns

`Set`

The new state value

### Call Signature

> **SetAtom**(...`params`): `Set`

Defined in: [packages/core/src/primitives/reatomSet.ts:10](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomSet.ts#L10)

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

### Properties

#### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#interfacesatommetamd)

Defined in: [packages/core/src/core/atom.ts:99](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L99)

Reference to the atom's internal metadata.

##### Inherited from

[`Atom`](#interfacesatommd).[`__reatom`](#__reatom)

***

#### actions

> **actions**: [`Actions`](#type-aliasesactionsmd)\<`SetAtom`\<`T`\>\>

Defined in: [packages/core/src/core/atom.ts:78](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L78)

Bind methods to the atom to extend its functionality.

##### Inherited from

[`Atom`](#interfacesatommd).[`actions`](#actions)

***

#### add

> **add**: [`Action`](#interfacesactionmd)\<\[`T`\], `Set`\<`T`\>\>

Defined in: [packages/core/src/primitives/reatomSet.ts:11](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomSet.ts#L11)

***

#### clear

> **clear**: [`Action`](#interfacesactionmd)\<\[\], `Set`\<`T`\>\>

Defined in: [packages/core/src/primitives/reatomSet.ts:14](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomSet.ts#L14)

***

#### delete

> **delete**: [`Action`](#interfacesactionmd)\<\[`T`\], `Set`\<`T`\>\>

Defined in: [packages/core/src/primitives/reatomSet.ts:12](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomSet.ts#L12)

***

#### extend

> **extend**: [`Extend`](#interfacesextendmd)\<`SetAtom`\<`T`\>\>

Defined in: [packages/core/src/core/atom.ts:84](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L84)

Extension system to add capabilities to atoms.
Allows adding middleware, methods, or other functionality to modify atom behavior.

##### Inherited from

[`Atom`](#interfacesatommd).[`extend`](#extend)

***

#### reset

> **reset**: [`Action`](#interfacesactionmd)\<\[\], `Set`\<`T`\>\>

Defined in: [packages/core/src/primitives/reatomSet.ts:15](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomSet.ts#L15)

***

#### size

> **size**: [`Computed`](#interfacescomputedmd)\<`number`\>

Defined in: [packages/core/src/primitives/reatomSet.ts:16](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomSet.ts#L16)

***

#### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#interfacesunsubscribemd)

Defined in: [packages/core/src/core/atom.ts:94](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L94)

Subscribe to state changes, with the first call happening immediately.
When a subscriber is added, the callback is immediately invoked with the current state.
After that, it's called whenever the atom's state changes.

##### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it changes

##### Returns

[`Unsubscribe`](#interfacesunsubscribemd)

An unsubscribe function that removes the subscription when called

##### Inherited from

[`Atom`](#interfacesatommd).[`subscribe`](#subscribe)

***

#### toggle

> **toggle**: [`Action`](#interfacesactionmd)\<\[`T`\], `Set`\<`T`\>\>

Defined in: [packages/core/src/primitives/reatomSet.ts:13](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomSet.ts#L13)


<a name="interfacesstoremd"></a>

## Interface: Store

Defined in: [packages/core/src/core/atom.ts:210](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L210)

Atom's state mappings for context.

The Store maps atoms to their frames in the current context,
allowing atoms to retrieve their state and dependencies.

### Extends

- `WeakMap`\<[`Atom`](#interfacesatommd), [`Frame`](#interfacesframemd)\>

### Methods

#### get()

> **get**\<`State`, `Params`, `Payload`\>(`target`): `undefined` \| [`Frame`](#interfacesframemd)\<`State`, `Params`, `Payload`\>

Defined in: [packages/core/src/core/atom.ts:217](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L217)

Get the frame for an atom in the current context.

##### Type Parameters

###### State

`State`

###### Params

`Params` *extends* `any`[]

###### Payload

`Payload`

##### Parameters

###### target

[`AtomLike`](#interfacesatomlikemd)\<`State`, `Params`, `Payload`\>

The atom to get the frame for

##### Returns

`undefined` \| [`Frame`](#interfacesframemd)\<`State`, `Params`, `Payload`\>

The frame for the atom, or undefined if not found

##### Overrides

`WeakMap.get`

***

#### set()

> **set**\<`State`, `Params`, `Payload`\>(`target`, `frame`): `this`

Defined in: [packages/core/src/core/atom.ts:228](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L228)

Set the frame for an atom in the current context.

##### Type Parameters

###### State

`State`

###### Params

`Params` *extends* `any`[]

###### Payload

`Payload`

##### Parameters

###### target

[`AtomLike`](#interfacesatomlikemd)\<`State`, `Params`, `Payload`\>

The atom to set the frame for

###### frame

[`Frame`](#interfacesframemd)\<`State`, `Params`, `Payload`\>

The frame to associate with the atom

##### Returns

`this`

This store instance

##### Overrides

`WeakMap.set`


<a name="interfacessubmitactionmd"></a>

## Interface: SubmitAction()

Defined in: [packages/core/src/form/src/reatomForm.ts:117](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L117)

Logic container with atom features

### Extends

- [`Action`](#interfacesactionmd)\<\[\], `Promise`\<`void`\>\>

> **SubmitAction**(...`params`): `Promise`

Defined in: [packages/core/src/form/src/reatomForm.ts:117](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L117)

Logic container with atom features

### Parameters

#### params

...\[\]

Parameters to pass to the atom

### Returns

`Promise`

The atom's payload (typically its current state)

### Properties

#### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#interfacesatommetamd)

Defined in: [packages/core/src/core/atom.ts:99](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L99)

Reference to the atom's internal metadata.

##### Inherited from

[`Action`](#interfacesactionmd).[`__reatom`](#__reatom)

***

#### actions

> **actions**: [`Actions`](#type-aliasesactionsmd)\<`SubmitAction`\>

Defined in: [packages/core/src/core/atom.ts:78](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L78)

Bind methods to the atom to extend its functionality.

##### Inherited from

[`Action`](#interfacesactionmd).[`actions`](#actions)

***

#### error

> **error**: [`Computed`](#interfacescomputedmd)\<`undefined` \| `Error`\>

Defined in: [packages/core/src/form/src/reatomForm.ts:118](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L118)

***

#### extend

> **extend**: [`Extend`](#interfacesextendmd)\<`SubmitAction`\>

Defined in: [packages/core/src/core/atom.ts:84](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L84)

Extension system to add capabilities to atoms.
Allows adding middleware, methods, or other functionality to modify atom behavior.

##### Inherited from

[`Action`](#interfacesactionmd).[`extend`](#extend)

***

#### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#interfacesunsubscribemd)

Defined in: [packages/core/src/core/atom.ts:94](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L94)

Subscribe to state changes, with the first call happening immediately.
When a subscriber is added, the callback is immediately invoked with the current state.
After that, it's called whenever the atom's state changes.

##### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it changes

##### Returns

[`Unsubscribe`](#interfacesunsubscribemd)

An unsubscribe function that removes the subscription when called

##### Inherited from

[`Action`](#interfacesactionmd).[`subscribe`](#subscribe)


<a name="interfacesunsubscribemd"></a>

## Interface: Unsubscribe()

Defined in: [packages/core/src/utils.ts:23](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/utils.ts#L23)

Function interface for unsubscribing from subscriptions.
Used consistently throughout Reatom for cleanup functions.

> **Unsubscribe**(): `void`

Defined in: [packages/core/src/utils.ts:24](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/utils.ts#L24)

Function interface for unsubscribing from subscriptions.
Used consistently throughout Reatom for cleanup functions.

### Returns

`void`


<a name="interfacesurlatommd"></a>

## Interface: UrlAtom()

Defined in: [packages/core/src/web/url.ts:69](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/web/url.ts#L69)

URL atom interface that extends the base Atom type.

### Extends

- [`Atom`](#interfacesatommd)\<`URL`\>

### Call Signature

> **UrlAtom**(`url`, `replace?`): `URL`

Defined in: [packages/core/src/web/url.ts:75](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/web/url.ts#L75)

URL atom interface that extends the base Atom type.

#### Parameters

##### url

`URL`

New URL to set

##### replace?

`boolean`

Whether to replace the current history entry

#### Returns

`URL`

### Call Signature

> **UrlAtom**(`update`, `replace?`): `URL`

Defined in: [packages/core/src/web/url.ts:82](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/web/url.ts#L82)

URL atom interface that extends the base Atom type.

#### Parameters

##### update

(`url`) => `URL`

Function that takes current URL and returns new URL

##### replace?

`boolean`

Whether to replace the current history entry

#### Returns

`URL`

### Call Signature

> **UrlAtom**(`update`): `URL`

Defined in: [packages/core/src/web/url.ts:69](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/web/url.ts#L69)

URL atom interface that extends the base Atom type.

#### Parameters

##### update

(`state`) => `URL`

Function that takes the current state and returns a new state

#### Returns

`URL`

The new state value

### Call Signature

> **UrlAtom**(`newState`): `URL`

Defined in: [packages/core/src/web/url.ts:69](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/web/url.ts#L69)

URL atom interface that extends the base Atom type.

#### Parameters

##### newState

`URL`

The new state value

#### Returns

`URL`

The new state value

### Call Signature

> **UrlAtom**(...`params`): `URL`

Defined in: [packages/core/src/web/url.ts:69](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/web/url.ts#L69)

URL atom interface that extends the base Atom type.

#### Parameters

##### params

...\[\]

Parameters to pass to the atom

#### Returns

`URL`

The atom's payload (typically its current state)

### Properties

#### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#interfacesatommetamd)

Defined in: [packages/core/src/core/atom.ts:99](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L99)

Reference to the atom's internal metadata.

##### Inherited from

[`Atom`](#interfacesatommd).[`__reatom`](#__reatom)

***

#### actions

> **actions**: [`Actions`](#type-aliasesactionsmd)\<`UrlAtom`\>

Defined in: [packages/core/src/core/atom.ts:78](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L78)

Bind methods to the atom to extend its functionality.

##### Inherited from

[`Atom`](#interfacesatommd).[`actions`](#actions)

***

#### catchLinks

> **catchLinks**: [`Atom`](#interfacesatommd)\<`boolean`\>

Defined in: [packages/core/src/web/url.ts:101](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/web/url.ts#L101)

Whether to intercept link clicks for SPA navigation.

##### Default

```ts
true
```

***

#### extend

> **extend**: [`Extend`](#interfacesextendmd)\<`UrlAtom`\>

Defined in: [packages/core/src/core/atom.ts:84](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L84)

Extension system to add capabilities to atoms.
Allows adding middleware, methods, or other functionality to modify atom behavior.

##### Inherited from

[`Atom`](#interfacesatommd).[`extend`](#extend)

***

#### go()

> **go**: (`path`, `replace?`) => `URL`

Defined in: [packages/core/src/web/url.ts:89](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/web/url.ts#L89)

Navigate to a new path.

##### Parameters

###### path

`string`

The path to navigate to

###### replace?

`boolean`

Whether to replace the current history entry

##### Returns

`URL`

***

#### init

> **init**: [`Action`](#interfacesactionmd)\<\[\], `URL`\> & [`AbortExt`](#interfacesabortextmd)

Defined in: [packages/core/src/web/url.ts:108](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/web/url.ts#L108)

This initialize DOM subscriptions and returns the current URL.
To prevent this action calling (in server on other environments without DOM),
just call `urlAtom` with your custom URL before it will be reded in other places.

***

#### match()

> **match**: (`path`) => [`Computed`](#interfacescomputedmd)\<`boolean`\>

Defined in: [packages/core/src/web/url.ts:95](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/web/url.ts#L95)

Create a computed atom that checks if the current path matches a given pattern.

##### Parameters

###### path

`string`

The path pattern to match against

##### Returns

[`Computed`](#interfacescomputedmd)\<`boolean`\>

***

#### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#interfacesunsubscribemd)

Defined in: [packages/core/src/core/atom.ts:94](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L94)

Subscribe to state changes, with the first call happening immediately.
When a subscriber is added, the callback is immediately invoked with the current state.
After that, it's called whenever the atom's state changes.

##### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it changes

##### Returns

[`Unsubscribe`](#interfacesunsubscribemd)

An unsubscribe function that removes the subscription when called

##### Inherited from

[`Atom`](#interfacesatommd).[`subscribe`](#subscribe)

***

#### sync

> **sync**: [`Atom`](#interfacesatommd)\<(`url`, `replace?`) => `void`\>

Defined in: [packages/core/src/web/url.ts:114](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/web/url.ts#L114)

Synchronization callback to push URL state updates to the `history`.
Replace with `noop` to disable syncing.

***

#### syncFromSource

> **syncFromSource**: [`Action`](#interfacesactionmd)\<\[`URL`, `boolean`\], `URL`\>

Defined in: [packages/core/src/web/url.ts:122](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/web/url.ts#L122)

For integrations use: put the new URL from the the source of truth to `urlAtom`,
without syncing it back (calling callback in `sync` Atom).

##### Param

The URL from the source

##### Param

Whether to replace the current history entry

### Methods

#### route()

> **route**\<`Path`\>(`pattern`): [`RouteAtom`](#interfacesrouteatommd)\<`Path`\>

Defined in: [packages/core/src/web/url.ts:127](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/web/url.ts#L127)

Create a computed atom representing a specific route pattern.

##### Type Parameters

###### Path

`Path` *extends* `string`

##### Parameters

###### pattern

`Path`

The route pattern (e.g., '/users/:userId')

##### Returns

[`RouteAtom`](#interfacesrouteatommd)\<`Path`\>


<a name="interfacesvalidationatommd"></a>

## Interface: ValidationAtom()

Defined in: [packages/core/src/form/src/reatomField.ts:62](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L62)

Base atom interface for other userspace implementations.
This is the core interface that all atom-like objects implement,
providing the foundation for Reatom's reactivity system.

### Extends

- [`AtomLike`](#interfacesatomlikemd)\<[`FieldValidation`](#interfacesfieldvalidationmd)\>

> **ValidationAtom**(...`params`): [`FieldValidation`](#interfacesfieldvalidationmd)

Defined in: [packages/core/src/form/src/reatomField.ts:62](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L62)

Base atom interface for other userspace implementations.
This is the core interface that all atom-like objects implement,
providing the foundation for Reatom's reactivity system.

### Parameters

#### params

...`any`[]

Parameters to pass to the atom

### Returns

[`FieldValidation`](#interfacesfieldvalidationmd)

The atom's payload (typically its current state)

### Properties

#### \_\_reatom

> **\_\_reatom**: [`AtomMeta`](#interfacesatommetamd)

Defined in: [packages/core/src/core/atom.ts:99](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L99)

Reference to the atom's internal metadata.

##### Inherited from

[`AtomLike`](#interfacesatomlikemd).[`__reatom`](#__reatom)

***

#### actions

> **actions**: [`Actions`](#type-aliasesactionsmd)\<`ValidationAtom`\>

Defined in: [packages/core/src/core/atom.ts:78](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L78)

Bind methods to the atom to extend its functionality.

##### Inherited from

[`AtomLike`](#interfacesatomlikemd).[`actions`](#actions)

***

#### extend

> **extend**: [`Extend`](#interfacesextendmd)\<`ValidationAtom`\>

Defined in: [packages/core/src/core/atom.ts:84](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L84)

Extension system to add capabilities to atoms.
Allows adding middleware, methods, or other functionality to modify atom behavior.

##### Inherited from

[`AtomLike`](#interfacesatomlikemd).[`extend`](#extend)

***

#### setError

> **setError**: [`Action`](#interfacesactionmd)\<\[`string`\], [`FieldValidation`](#interfacesfieldvalidationmd)\>

Defined in: [packages/core/src/form/src/reatomField.ts:67](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L67)

Action to set an error for the field

***

#### subscribe()

> **subscribe**: (`cb?`) => [`Unsubscribe`](#interfacesunsubscribemd)

Defined in: [packages/core/src/core/atom.ts:94](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L94)

Subscribe to state changes, with the first call happening immediately.
When a subscriber is added, the callback is immediately invoked with the current state.
After that, it's called whenever the atom's state changes.

##### Parameters

###### cb?

(`state`) => `any`

Callback function that receives the atom's state when it changes

##### Returns

[`Unsubscribe`](#interfacesunsubscribemd)

An unsubscribe function that removes the subscription when called

##### Inherited from

[`AtomLike`](#interfacesatomlikemd).[`subscribe`](#subscribe)

***

#### trigger

> **trigger**: [`Action`](#interfacesactionmd)\<\[\], [`FieldValidation`](#interfacesfieldvalidationmd)\> & [`AbortExt`](#interfacesabortextmd)

Defined in: [packages/core/src/form/src/reatomField.ts:64](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L64)

Action to trigger field validation.


<a name="interfacesvariablemd"></a>

## Interface: Variable\<Params, Payload\>

Defined in: [packages/core/src/methods/variable.ts:14](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/methods/variable.ts#L14)

Interface for context variables in Reatom

Variables maintain values within the context of a computation tree,
allowing for context-aware state similar to React's Context API but
with more granular control and integration with Reatom's reactive system.

### Extended by

- [`AbortVar`](#interfacesabortvarmd)

### Type Parameters

#### Params

`Params` *extends* `any`[] = `any`[]

Types of parameters accepted by the setter function

#### Payload

`Payload` = `any`

Type of the stored value

### Methods

#### find()

> **find**\<`T`\>(`cb?`, `frame?`): `undefined` \| `T`

Defined in: [packages/core/src/methods/variable.ts:48](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/methods/variable.ts#L48)

Traverses the frame tree to find and map the variable value.

##### Type Parameters

###### T

`T` = `Payload`

Return type of the callback

##### Parameters

###### cb?

(`value`) => `undefined` \| `T`

Optional transformation callback

###### frame?

[`Frame`](#interfacesframemd)\<`any`, `any`[], `any`\>

Optional frame to check (defaults to current top frame)

##### Returns

`undefined` \| `T`

The transformed value or undefined if not found

***

#### get()

> **get**(`frame?`): `Payload`

Defined in: [packages/core/src/methods/variable.ts:22](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/methods/variable.ts#L22)

Gets the current value of the variable

##### Parameters

###### frame?

[`Frame`](#interfacesframemd)\<`any`, `any`[], `any`\>

Optional frame to check (defaults to current top frame)

##### Returns

`Payload`

The current value

##### Throws

If the variable is not found in the frame tree

***

#### has()

> **has**(`frame?`): `boolean`

Defined in: [packages/core/src/methods/variable.ts:38](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/methods/variable.ts#L38)

Checks if the variable exists in the current stack

##### Parameters

###### frame?

[`Frame`](#interfacesframemd)\<`any`, `any`[], `any`\>

Optional frame to check (defaults to current top frame)

##### Returns

`boolean`

True if the variable exists in the context

***

#### run()

> **run**\<`T`\>(`value`, `fn`): `T`

Defined in: [packages/core/src/methods/variable.ts:61](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/methods/variable.ts#L61)

Runs a function with new variable value

##### Type Parameters

###### T

`T`

Return type of the function

##### Parameters

###### value

`Payload`

The temporary value to set

###### fn

() => `T`

Function to execute with the temporary value

##### Returns

`T`

The result of the function

***

#### set()

> **set**(...`params`): `Payload`

Defined in: [packages/core/src/methods/variable.ts:30](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/methods/variable.ts#L30)

Sets a new value for the variable

##### Parameters

###### params

...`Params`

Parameters passed to the setter function

##### Returns

`Payload`

The new value

# Type Aliases


<a name="type-aliasesactionsmd"></a>

## Type Alias: Actions()\<Target\>

> **Actions**\<`Target`\> = \{\<`Methods`\>(`create`): `Target` & [`ActionsExt`](#type-aliasesactionsextmd)\<`Methods`\>; \<`Methods`\>(`methods`): `Target` & [`ActionsExt`](#type-aliasesactionsextmd)\<`Methods`\>; \}

Defined in: [packages/core/src/core/actions.ts:30](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/actions.ts#L30)

Binding function type to add methods to an atom or action.

Accepts either a record of methods or a function that creates methods
given the target atom/action, and returns the target extended with those methods
converted to actions.

### Type Parameters

#### Target

`Target` *extends* [`AtomLike`](#interfacesatomlikemd)

The atom or action being extended

### Call Signature

> \<`Methods`\>(`create`): `Target` & [`ActionsExt`](#type-aliasesactionsextmd)\<`Methods`\>

Add methods created by a factory function that receives the target

#### Type Parameters

##### Methods

`Methods` *extends* [`Rec`](#type-aliasesrecmd)\<[`Fn`](#interfacesfnmd)\>

#### Parameters

##### create

(`target`) => `Methods`

Function that receives the target and returns methods to add

#### Returns

`Target` & [`ActionsExt`](#type-aliasesactionsextmd)\<`Methods`\>

The target with the methods added as actions

### Call Signature

> \<`Methods`\>(`methods`): `Target` & [`ActionsExt`](#type-aliasesactionsextmd)\<`Methods`\>

Add a record of methods directly to the target

#### Type Parameters

##### Methods

`Methods` *extends* [`Rec`](#type-aliasesrecmd)\<[`Fn`](#interfacesfnmd)\>

#### Parameters

##### methods

`Methods`

Record of methods to add

#### Returns

`Target` & [`ActionsExt`](#type-aliasesactionsextmd)\<`Methods`\>

The target with the methods added as actions


<a name="type-aliasesactionsextmd"></a>

## Type Alias: ActionsExt\<Methods\>

> **ActionsExt**\<`Methods`\> = `{ [K in keyof Methods]: Methods[K] extends (params: infer Params) => infer Payload ? Action<Params, Payload> : never }`

Defined in: [packages/core/src/core/actions.ts:12](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/actions.ts#L12)

Type representing a set of methods converted to Reatom actions.

This type maps each method in the original record to a corresponding Reatom action
with the same parameter and return types.

### Type Parameters

#### Methods

`Methods` *extends* [`Rec`](#type-aliasesrecmd)\<[`Fn`](#interfacesfnmd)\>

Record of functions to be converted to actions


<a name="type-aliasesarrayfielditemmd"></a>

## Type Alias: ArrayFieldItem\<T\>

> **ArrayFieldItem**\<`T`\> = `T` *extends* [`LinkedListLikeAtom`](#interfaceslinkedlistlikeatommd)\<infer \_Node\> ? [`AtomState`](#type-aliasesatomstatemd)\<`T`\[`"array"`\]\>\[`number`\] : `never`

Defined in: [packages/core/src/form/src/reatomForm.ts:320](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L320)

### Type Parameters

#### T

`T`


<a name="type-aliasesassignmd"></a>

## Type Alias: Assign\<T1, T2, T3, T4\>

> **Assign**\<`T1`, `T2`, `T3`, `T4`\> = [`Plain`](#type-aliasesplainmd)\<`T1` *extends* (...`params`) => infer O ? (...`params`) => `O` : `object` & `Omit`\<`T1`, keyof `T2` \| keyof `T3` \| keyof `T4`\> & `Omit`\<`T2`, keyof `T3` \| keyof `T4`\> & `Omit`\<`T3`, keyof `T4`\> & `T4`\>

Defined in: [packages/core/src/utils.ts:348](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/utils.ts#L348)

Type utility for merging up to four types with proper type safety.
Properties from later types override properties from earlier types.
Preserves function signatures from T1 if it's a function type.

### Type Parameters

#### T1

`T1`

First type to merge

#### T2

`T2`

Second type to merge, overrides T1 properties

#### T3

`T3` = \{ \}

Optional third type to merge, overrides T1 and T2 properties

#### T4

`T4` = \{ \}

Optional fourth type to merge, overrides T1, T2, and T3 properties


<a name="type-aliasesasyncoptionsmd"></a>

## Type Alias: AsyncOptions\<Err, EmptyErr\>

> **AsyncOptions**\<`Err`, `EmptyErr`\> = `object`

Defined in: [packages/core/src/async/withAsync.ts:91](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/async/withAsync.ts#L91)

Configuration options for the [withAsync](#variableswithasyncmd) extension

### Extended by

- [`AsyncDataOptions`](#interfacesasyncdataoptionsmd)

### Type Parameters

#### Err

`Err` = `Error`

The type of errors after parsing

#### EmptyErr

`EmptyErr` = `undefined`

The type of the empty error state (default: undefined)

### Properties

#### emptyError?

> `optional` **emptyError**: `EmptyErr`

Defined in: [packages/core/src/async/withAsync.ts:102](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/async/withAsync.ts#L102)

Initial/reset value for the error atom

***

#### parseError()?

> `optional` **parseError**: (`error`) => `Err`

Defined in: [packages/core/src/async/withAsync.ts:97](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/async/withAsync.ts#L97)

Function to transform raw errors into a specific error type

##### Parameters

###### error

`unknown`

The caught error of unknown type

##### Returns

`Err`

A properly typed error object

***

#### resetError?

> `optional` **resetError**: `null` \| `"onCall"` \| `"onFulfill"`

Defined in: [packages/core/src/async/withAsync.ts:110](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/async/withAsync.ts#L110)

When to reset the error state
- 'onCall': Reset error when the async operation starts (default)
- 'onFulfill': Reset error only when the operation succeeds
- null: Never automatically reset errors


<a name="type-aliasesatomstatemd"></a>

## Type Alias: AtomState\<T\>

> **AtomState**\<`T`\> = `T` *extends* [`AtomLike`](#interfacesatomlikemd)\<infer State, `any`, `any`\> ? `State` : `never`

Defined in: [packages/core/src/core/atom.ts:196](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L196)

Helper type to extract the state type from an atom-like object.

### Type Parameters

#### T

`T`

The atom-like type to extract the state from


<a name="type-aliasesconstructormd"></a>

## Type Alias: Constructor()\<T\>

> **Constructor**\<`T`\> = (...`args`) => `T`

Defined in: [packages/core/src/utils.ts:735](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/utils.ts#L735)

Represents a constructor function that can be instantiated with the new operator.

### Type Parameters

#### T

`T`

The type of object that will be created when instantiated

### Parameters

#### args

...`any`[]

### Returns

`T`


<a name="type-aliasesdeeppartialmd"></a>

## Type Alias: DeepPartial\<T, Skip\>

> **DeepPartial**\<`T`, `Skip`\> = `{ [K in keyof T]?: T[K] extends Skip ? T[K] : T[K] extends Rec ? DeepPartial<T[K], Skip> : T[K] }`

Defined in: [packages/core/src/form/src/reatomForm.ts:107](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L107)

### Type Parameters

#### T

`T`

#### Skip

`Skip` = `never`


<a name="type-aliasesenumatommd"></a>

## Type Alias: EnumAtom\<T, Format\>

> **EnumAtom**\<`T`, `Format`\> = [`Atom`](#interfacesatommd)\<`T`\> & `EnumVariantSetters`\<`T`, `Format`\> & `object`

Defined in: [packages/core/src/primitives/reatomEnum.ts:14](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomEnum.ts#L14)

### Type declaration

#### enum

> **enum**: `{ [K in T]: K }`

#### reset

> **reset**: [`Action`](#interfacesactionmd)\<\[\], `T`\>

### Type Parameters

#### T

`T` *extends* `string`

#### Format

`Format` *extends* [`EnumFormat`](#type-aliasesenumformatmd) = `"camelCase"`


<a name="type-aliasesenumatomoptionsmd"></a>

## Type Alias: EnumAtomOptions\<T, Format\>

> **EnumAtomOptions**\<`T`, `Format`\> = `object`

Defined in: [packages/core/src/primitives/reatomEnum.ts:23](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomEnum.ts#L23)

### Type Parameters

#### T

`T` *extends* `string`

#### Format

`Format` *extends* [`EnumFormat`](#type-aliasesenumformatmd) = `"camelCase"`

### Properties

#### format?

> `optional` **format**: `Format`

Defined in: [packages/core/src/primitives/reatomEnum.ts:28](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomEnum.ts#L28)

***

#### initState?

> `optional` **initState**: `T`

Defined in: [packages/core/src/primitives/reatomEnum.ts:29](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomEnum.ts#L29)

***

#### name?

> `optional` **name**: `string`

Defined in: [packages/core/src/primitives/reatomEnum.ts:27](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomEnum.ts#L27)


<a name="type-aliasesenumformatmd"></a>

## Type Alias: EnumFormat

> **EnumFormat** = `"camelCase"` \| `"snake_case"`

Defined in: [packages/core/src/primitives/reatomEnum.ts:4](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomEnum.ts#L4)


<a name="type-aliaseseventoftargetmd"></a>

## Type Alias: EventOfTarget\<Target, Type\>

> **EventOfTarget**\<`Target`, `Type`\> = `Target` *extends* `Record`\<`` `on${Type}` ``, infer Cb\> ? `Parameters`\<`Cb`\>\[`0`\] : `Target` *extends* `Record`\<`"onEvent"`, (`type`, `cb`) => `any`\> ? `Parameters`\<`Cb`\>\[`0`\] : `never`

Defined in: [packages/core/src/web/onEvent.ts:4](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/web/onEvent.ts#L4)

### Type Parameters

#### Target

`Target` *extends* `EventTarget`

#### Type

`Type` *extends* `string`


<a name="type-aliasesfalsymd"></a>

## Type Alias: Falsy

> **Falsy** = `false` \| `0` \| `""` \| `null` \| `undefined`

Defined in: [packages/core/src/utils.ts:42](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/utils.ts#L42)

Union type of all JavaScript falsy values except for NaN.
Includes: false, 0, empty string, null, and undefined.

### See

https://stackoverflow.com/a/51390763


<a name="type-aliasesfieldvalidateoptionmd"></a>

## Type Alias: FieldValidateOption()\<State, Value\>

> **FieldValidateOption**\<`State`, `Value`\> = (`meta`) => `any`

Defined in: [packages/core/src/form/src/reatomField.ts:127](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L127)

### Type Parameters

#### State

`State` = `any`

#### Value

`Value` = `State`

### Parameters

#### meta

##### focus

[`FieldFocus`](#interfacesfieldfocusmd)

##### state

`State`

##### validation

[`FieldValidation`](#interfacesfieldvalidationmd)

##### value

`Value`

### Returns

`any`


<a name="type-aliasesformfieldarrayatommd"></a>

## Type Alias: FormFieldArrayAtom\<Param, Node\>

> **FormFieldArrayAtom**\<`Param`, `Node`\> = [`LinkedListAtom`](#interfaceslinkedlistatommd)\<\[`ExtractFieldArray`\<`Param`\>\], [`FormFieldElement`](#type-aliasesformfieldelementmd)\<`Node`\>\> & `object`

Defined in: [packages/core/src/form/src/reatomForm.ts:69](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L69)

### Type declaration

#### initState

> **initState**: [`Atom`](#interfacesatommd)\<[`LinkedList`](#interfaceslinkedlistmd)\<[`LLNode`](#type-aliasesllnodemd)\<[`FormFieldElement`](#type-aliasesformfieldelementmd)\<`Node`\>\>\>\>

#### reset

> **reset**: [`Action`](#interfacesactionmd)\<\[\], [`AtomState`](#type-aliasesatomstatemd)\<`FormFieldArrayAtom`\<`Param`, `Node`\>\>\>

### Type Parameters

#### Param

`Param` = `any`

#### Node

`Node` *extends* `FormInitStateElement` = `FormInitStateElement`


<a name="type-aliasesformfieldelementmd"></a>

## Type Alias: FormFieldElement\<T\>

> **FormFieldElement**\<`T`\> = `T` *extends* [`FieldLikeAtom`](#interfacesfieldlikeatommd) ? `T` : `T` *extends* `Date` ? [`FieldAtom`](#interfacesfieldatommd)\<`T`\> : `T` *extends* infer Item[] ? `Item` *extends* `FormInitStateElement` ? [`FormFieldArrayAtom`](#type-aliasesformfieldarrayatommd)\<`Item`, `Item`\> : `never` : `T` *extends* `FormFieldArray`\<infer Param, infer Node\> ? [`FormFieldArrayAtom`](#type-aliasesformfieldarrayatommd)\<`Param`, `Node`\> : `T` *extends* [`FieldOptions`](#interfacesfieldoptionsmd) & `object` ? `T` *extends* [`FieldOptions`](#interfacesfieldoptionsmd)\<`State`, `State`\> ? [`FieldAtom`](#interfacesfieldatommd)\<`State`\> : `T` *extends* [`FieldOptions`](#interfacesfieldoptionsmd)\<`State`, infer Value\> ? [`FieldAtom`](#interfacesfieldatommd)\<`State`, `Value`\> : `never` : `T` *extends* [`Rec`](#type-aliasesrecmd) ? `{ [K in keyof T]: FormFieldElement<T[K]> }` : [`FieldAtom`](#interfacesfieldatommd)\<`T`\>

Defined in: [packages/core/src/form/src/reatomForm.ts:77](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L77)

### Type Parameters

#### T

`T` *extends* `FormInitStateElement` = `FormInitStateElement`


<a name="type-aliasesformfieldsmd"></a>

## Type Alias: FormFields\<T\>

> **FormFields**\<`T`\> = `{ [K in keyof T]: FormFieldElement<T[K]> }`

Defined in: [packages/core/src/form/src/reatomForm.ts:99](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L99)

### Type Parameters

#### T

`T` *extends* [`FormInitState`](#type-aliasesforminitstatemd) = [`FormInitState`](#type-aliasesforminitstatemd)


<a name="type-aliasesforminitstatemd"></a>

## Type Alias: FormInitState

> **FormInitState** = `object`

Defined in: [packages/core/src/form/src/reatomForm.ts:59](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L59)

### Index Signature

\[`key`: `string`\]: `FormInitState` \| `FormInitStateElement`


<a name="type-aliasesformpartialstatemd"></a>

## Type Alias: FormPartialState\<T\>

> **FormPartialState**\<`T`\> = [`DeepPartial`](#type-aliasesdeeppartialmd)\<[`FormState`](#type-aliasesformstatemd)\<`T`\>, `unknown`[]\>

Defined in: [packages/core/src/form/src/reatomForm.ts:114](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L114)

### Type Parameters

#### T

`T` *extends* [`FormInitState`](#type-aliasesforminitstatemd) = [`FormInitState`](#type-aliasesforminitstatemd)


<a name="type-aliasesformstatemd"></a>

## Type Alias: FormState\<T\>

> **FormState**\<`T`\> = [`ParseAtoms`](#type-aliasesparseatomsmd)\<[`FormFields`](#type-aliasesformfieldsmd)\<`T`\>\>

Defined in: [packages/core/src/form/src/reatomForm.ts:103](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomForm.ts#L103)

### Type Parameters

#### T

`T` *extends* [`FormInitState`](#type-aliasesforminitstatemd) = [`FormInitState`](#type-aliasesforminitstatemd)


<a name="type-aliasesfunctionsourcemd"></a>

## Type Alias: FunctionSource

> **FunctionSource** = `string`

Defined in: [packages/core/src/core/atom.ts:238](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L238)

Type representing the source of a function as a string.
Used for caching and identification purposes.


<a name="type-aliasesgenericactionmd"></a>

## Type Alias: GenericAction\<T\>

> **GenericAction**\<`T`\> = `T` & [`Action`](#interfacesactionmd)\<`Parameters`\<`T`\>, `ReturnType`\<`T`\>\>

Defined in: [packages/core/src/core/action.ts:21](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/action.ts#L21)

### Type Parameters

#### T

`T` *extends* [`Fn`](#interfacesfnmd)


<a name="type-aliasesllnodemd"></a>

## Type Alias: LLNode\<T\>

> **LLNode**\<`T`\> = `T` & `object`

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:22](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L22)

Linked List is reusing the model reference to simplify the reference sharing and using it as a key of LL methods.
Btw, symbols works fine with serialization and will not add a garbage to an output.

### Type declaration

#### \[LL\_NEXT\]

> **\[LL\_NEXT\]**: `null` \| `LLNode`\<`T`\>

#### \[LL\_PREV\]

> **\[LL\_PREV\]**: `null` \| `LLNode`\<`T`\>

### Type Parameters

#### T

`T` *extends* [`Rec`](#type-aliasesrecmd) = [`Rec`](#type-aliasesrecmd)


<a name="type-aliasesmergemd"></a>

## Type Alias: Merge\<Target, Extensions\>

> **Merge**\<`Target`, `Extensions`\> = `Extensions` *extends* \[\] ? `Target` : `Extensions` *extends* \[infer E, `...(infer Rest extends any[])`\] ? `Merge`\<`E` *extends* [`AtomLike`](#interfacesatomlikemd) ? `E` : `Target` & `E`, `Rest`\> : `never`

Defined in: [packages/core/src/core/extend.ts:54](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/extend.ts#L54)

Helper type for merging an atom/action with a series of extensions.

This type recursively merges a target with each extension in an array.

### Type Parameters

#### Target

`Target` *extends* [`AtomLike`](#interfacesatomlikemd)

The base atom or action type

#### Extensions

`Extensions` *extends* `any`[]

Array of extension results to merge with the target


<a name="type-aliasesmiddlewaremd"></a>

## Type Alias: Middleware()\<Target\>

> **Middleware**\<`Target`\> = (`next`, ...`params`) => [`AtomState`](#type-aliasesatomstatemd)\<`Target`\>

Defined in: [packages/core/src/core/extend.ts:139](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/extend.ts#L139)

Type representing a middleware function for atoms and actions.

Middleware functions intercept atom/action calls, allowing for custom behavior
to be applied before or after the normal execution. They receive the next middleware
function in the chain and the parameters passed to the atom/action.

### Type Parameters

#### Target

`Target` *extends* [`AtomLike`](#interfacesatomlikemd) = [`AtomLike`](#interfacesatomlikemd)

The atom or action type the middleware applies to

### Parameters

#### next

(...`params`) => [`AtomState`](#type-aliasesatomstatemd)\<`Target`\>

The next middleware function in the chain or the original atom/action handler

#### params

...[`OverloadParameters`](#type-aliasesoverloadparametersmd)\<`Target`\>

The parameters passed to the atom/action

### Returns

[`AtomState`](#type-aliasesatomstatemd)\<`Target`\>

The state resulting from the atom/action execution


<a name="type-aliasesomitvaluesmd"></a>

## Type Alias: OmitValues\<T, V\>

> **OmitValues**\<`T`, `V`\> = `{ [K in OmitValuesKeys<T, V>]: T[K] }`

Defined in: [packages/core/src/utils.ts:108](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/utils.ts#L108)

Creates a type with all properties from T except those with values extending V.

### Type Parameters

#### T

`T`

The object type to filter properties from

#### V

`V`

The value type to exclude


<a name="type-aliasesomitvalueskeysmd"></a>

## Type Alias: OmitValuesKeys\<T, V\>

> **OmitValuesKeys**\<`T`, `V`\> = [`Values`](#type-aliasesvaluesmd)\<`{ [K in keyof T]: T[K] extends V ? never : K }`\>

Defined in: [packages/core/src/utils.ts:98](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/utils.ts#L98)

Extracts keys from type T where the corresponding value does not extend type V.

### Type Parameters

#### T

`T`

The object type to extract keys from

#### V

`V`

The value type to exclude


<a name="type-aliasesoverloadparametersmd"></a>

## Type Alias: OverloadParameters\<T\>

> **OverloadParameters**\<`T`\> = `Parameters`\<[`Overloads`](#type-aliasesoverloadsmd)\<`T`\>\>

Defined in: [packages/core/src/utils.ts:163](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/utils.ts#L163)

Extracts the parameters type from an overloaded function.
Returns a union of all possible parameter tuples.

### Type Parameters

#### T

`T`

The overloaded function type to extract parameters from


<a name="type-aliasesoverloadsmd"></a>

## Type Alias: Overloads\<T\>

> **Overloads**\<`T`\> = `T` *extends* \{(...`params`): `Return1`; (...`params`): `Return2`; (...`params`): `Return3`; (...`params`): `Return4`; (...`params`): `Return5`; \} ? (...`params`) => `Return1` \| `Return2` \| `Return3` \| `Return4` \| `Return5` : `never`

Defined in: [packages/core/src/utils.ts:140](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/utils.ts#L140)

Flattens a function type with up to 5 overloads into a single function signature.
This creates a union of the parameter types and return types.

Useful for generic type handling of overloaded functions.

### Type Parameters

#### T

`T`

The overloaded function type to flatten


<a name="type-aliasesparseatomsmd"></a>

## Type Alias: ParseAtoms\<T\>

> **ParseAtoms**\<`T`\> = `T` *extends* [`Action`](#interfacesactionmd) ? `T` : `T` *extends* [`LinkedListLikeAtom`](#interfaceslinkedlistlikeatommd)\<infer T\> ? `T` *extends* [`LinkedList`](#interfaceslinkedlistmd)\<[`LLNode`](#type-aliasesllnodemd)\<infer T\>\> ? `ParseAtoms`\<`T`\>[] : `never` : `T` *extends* [`Atom`](#interfacesatommd)\<infer T\> ? `ParseAtoms`\<`T`\> : `T` *extends* `Map`\<infer K, infer T\> ? `Map`\<`K`, `ParseAtoms`\<`T`\>\> : `T` *extends* `Set`\<infer T\> ? `Set`\<`ParseAtoms`\<`T`\>\> : `T` *extends* infer T[] ? `ParseAtoms`\<`T`\>[] : `T` *extends* `Primitive` \| `Builtin` ? `T` : `T` *extends* `object` ? `{ [K in keyof T]: ParseAtoms<(...)[(...)]> }` : `T`

Defined in: [packages/core/src/methods/parseAtoms.ts:23](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/methods/parseAtoms.ts#L23)

Type utility that recursively unwraps atom types to their state types

This complex type recursively traverses a type structure, unwrapping atoms
to their contained state types. It handles various container types like
arrays, maps, sets, and objects.

### Type Parameters

#### T

`T`

The type to unwrap

### Returns

Unwrapped version of the type with atoms replaced by their state types


<a name="type-aliasespickvaluesmd"></a>

## Type Alias: PickValues\<T, V\>

> **PickValues**\<`T`, `V`\> = `{ [K in PickValuesKeys<T, V>]: T[K] }`

Defined in: [packages/core/src/utils.ts:128](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/utils.ts#L128)

Creates a type with only properties from T with values extending V.

### Type Parameters

#### T

`T`

The object type to filter properties from

#### V

`V`

The value type to include


<a name="type-aliasespickvalueskeysmd"></a>

## Type Alias: PickValuesKeys\<T, V\>

> **PickValuesKeys**\<`T`, `V`\> = [`Values`](#type-aliasesvaluesmd)\<`{ [K in keyof T]: T[K] extends V ? K : never }`\>

Defined in: [packages/core/src/utils.ts:118](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/utils.ts#L118)

Extracts keys from type T where the corresponding value extends type V.

### Type Parameters

#### T

`T`

The object type to extract keys from

#### V

`V`

The value type to include


<a name="type-aliasesplainmd"></a>

## Type Alias: Plain\<Intersection\>

> **Plain**\<`Intersection`\> = `Intersection` *extends* (...`params`) => infer O ? (...`params`) => `O` & `{ [Key in keyof Intersection]: Intersection[Key] }` : `Intersection` *extends* (...`params`) => `any` ? `Intersection` : `Intersection` *extends* `object` ? `{ [Key in keyof Intersection]: Intersection[Key] }` : `Intersection`

Defined in: [packages/core/src/utils.ts:52](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/utils.ts#L52)

Removes named generics to produce a plain type representation.
Preserves function signatures and object structure while eliminating generic parameter names.

This is useful for presenting cleaner types in documentation and error messages.

### Type Parameters

#### Intersection

`Intersection`

The type to convert to a plain representation


<a name="type-aliasesrecmd"></a>

## Type Alias: Rec\<T\>

> **Rec**\<`T`\> = `Record`\<`string`, `T`\>

Defined in: [packages/core/src/utils.ts:17](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/utils.ts#L17)

Type alias for Record<string, T> for brevity.
Represents an object with string keys and values of type T.

### Type Parameters

#### T

`T` = `any`

The type of values in the record (defaults to any)


<a name="type-aliasesshallowmd"></a>

## Type Alias: Shallow\<T\>

> **Shallow**\<`T`\> = `{ [K in keyof T]: T[K] }` & `object`

Defined in: [packages/core/src/utils.ts:72](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/utils.ts#L72)

Creates a shallow clone type of T.
Useful for creating a new type that has the same shape but is a distinct type.

### Type Parameters

#### T

`T`

The type to create a shallow clone of


<a name="type-aliasesstringatommd"></a>

## Type Alias: StringAtom\<T\>

> **StringAtom**\<`T`\> = [`Atom`](#interfacesatommd)\<`T`\> & `object`

Defined in: [packages/core/src/primitives/reatomString.ts:3](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomString.ts#L3)

### Type declaration

#### reset

> **reset**: [`Action`](#interfacesactionmd)\<\[\], `T`\>

### Type Parameters

#### T

`T` *extends* `string` = `string`


<a name="type-aliasessuspenseextmd"></a>

## Type Alias: SuspenseExt\<Target\>

> **SuspenseExt**\<`Target`\> = `object`

Defined in: [packages/core/src/mixins/withSuspense.ts:44](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/mixins/withSuspense.ts#L44)

### Type Parameters

#### Target

`Target` *extends* [`AtomLike`](#interfacesatomlikemd)

### Properties

#### suspended

> **suspended**: [`Computed`](#interfacescomputedmd)\<`Awaited`\<[`AtomState`](#type-aliasesatomstatemd)\<`Target`\>\>\>

Defined in: [packages/core/src/mixins/withSuspense.ts:45](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/mixins/withSuspense.ts#L45)


<a name="type-aliasesundefinedtooptionalmd"></a>

## Type Alias: UndefinedToOptional\<T\>

> **UndefinedToOptional**\<`T`\> = `Partial`\<`T`\> & [`PickValues`](#type-aliasespickvaluesmd)\<`T`, \{ \} \| `null`\>

Defined in: [packages/core/src/utils.ts:33](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/utils.ts#L33)

Utility type that converts properties with undefined values to optional properties.
Makes properties with object or null values required, while making other properties optional.

### Type Parameters

#### T

`T` *extends* `object`

The object type to transform


<a name="type-aliasesurlsearchparamsinitmd"></a>

## Type Alias: UrlSearchParamsInit

> **UrlSearchParamsInit** = `ConstructorParameters`\<*typeof* `URLSearchParams`\>\[`0`\]

Defined in: [packages/core/src/web/fetch.ts:1](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/web/fetch.ts#L1)


<a name="type-aliasesvaluesmd"></a>

## Type Alias: Values\<T\>

> **Values**\<`T`\> = `T`\[keyof `T`\]

Defined in: [packages/core/src/utils.ts:90](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/utils.ts#L90)

Extracts the union type of all values in an object type.

### Type Parameters

#### T

`T`

The object type to extract values from

# Variables


<a name="variablesfetchrequestmd"></a>

## Variable: FetchRequest

> **FetchRequest**: *typeof* `FetchRequest`

Defined in: [packages/core/src/web/fetch.ts:19](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/web/fetch.ts#L19)


<a name="variablesll_nextmd"></a>

## Variable: LL\_NEXT

> `const` **LL\_NEXT**: *typeof* `LL_NEXT`

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:17](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L17)


<a name="variablesll_prevmd"></a>

## Variable: LL\_PREV

> `const` **LL\_PREV**: *typeof* `LL_PREV`

Defined in: [packages/core/src/primitives/reatomLinkedList.ts:16](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomLinkedList.ts#L16)


<a name="variablesmax_safe_timeoutmd"></a>

## Variable: MAX\_SAFE\_TIMEOUT

> `const` **MAX\_SAFE\_TIMEOUT**: `number`

Defined in: [packages/core/src/utils.ts:728](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/utils.ts#L728)

Maximum safe integer value for setTimeout delay.
Any timeout value larger than this may cause overflow issues in some browsers.

### See

https://developer.mozilla.org/en-US/docs/Web/API/setTimeout#maximum_delay_value


<a name="variablesstackmd"></a>

## Variable: STACK

> **STACK**: [`Frame`](#interfacesframemd)[] = `[]`

Defined in: [packages/core/src/core/atom.ts:1025](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L1025)


<a name="variablesabortvarmd"></a>

## Variable: abortVar

> **abortVar**: [`AbortVar`](#interfacesabortvarmd)

Defined in: [packages/core/src/methods/abort.ts:133](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/methods/abort.ts#L133)

Global abort variable that creates abort atoms coupled to the current frame.

The abortVar is computed from all other abort atoms in the current frame tree,
which allows for propagation of abortion signals through the computation hierarchy.
This is a critical component for cancellation handling in Reatom's async operations.

### Example

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


<a name="variablesactionmd"></a>

## Variable: action()

> **action**: \{\<`Params`, `Payload`\>(`cb`, `name?`): [`Action`](#interfacesactionmd)\<`Params`, `Payload`\>; \<`T`\>(`cb`, `name?`): [`GenericAction`](#type-aliasesgenericactionmd)\<`T`\>; \}

Defined in: [packages/core/src/core/action.ts:79](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/action.ts#L79)

Creates a logic and side effect container.

Actions are used to encapsulate complex logic, perform side effects (like API calls),
and orchestrate multiple state updates. Unlike atoms, actions are meant to be called
with parameters and can return values.

Actions also have atom-like features (subscribe, extend) and track their call history.

### Call Signature

> \<`Params`, `Payload`\>(`cb`, `name?`): [`Action`](#interfacesactionmd)\<`Params`, `Payload`\>

#### Type Parameters

##### Params

`Params` *extends* `any`[] = `any`[]

##### Payload

`Payload` = `any`

#### Parameters

##### cb

(...`params`) => `Payload`

##### name?

`string`

#### Returns

[`Action`](#interfacesactionmd)\<`Params`, `Payload`\>

### Call Signature

> \<`T`\>(`cb`, `name?`): [`GenericAction`](#type-aliasesgenericactionmd)\<`T`\>

#### Type Parameters

##### T

`T` *extends* [`Fn`](#interfacesfnmd)

#### Parameters

##### cb

`T`

##### name?

`string`

#### Returns

[`GenericAction`](#type-aliasesgenericactionmd)\<`T`\>

### Template

The parameter types the action accepts

### Template

The return type of the action

### Param

The function containing the action's logic

### Param

Optional name for debugging purposes

### Returns

An action instance that can be called with the specified parameters

### Example

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


<a name="variablesassignmd"></a>

## Variable: assign()

> `const` **assign**: \{\<`T1`, `T2`\>(`a1`, `a2`): [`Plain`](#type-aliasesplainmd)\<`T1` *extends* (...`params`) => `O` ? (...`params`) => `O` : `object` & `Omit`\<`T1`, keyof `T2`\> & `Omit`\<`T2`, `never`\> & `Omit`\<\{ \}, `never`\>\>; \<`T1`, `T2`, `T3`\>(`a1`, `a2`, `a3?`): [`Plain`](#type-aliasesplainmd)\<`T1` *extends* (...`params`) => `O` ? (...`params`) => `O` : `object` & `Omit`\<`T1`, keyof `T2` \| keyof `T3`\> & `Omit`\<`T2`, keyof `T3`\> & `Omit`\<`T3`, `never`\>\>; \<`T1`, `T2`, `T3`, `T4`\>(`a1`, `a2`, `a3?`, `a4?`): [`Plain`](#type-aliasesplainmd)\<`T1` *extends* (...`params`) => `O` ? (...`params`) => `O` : `object` & `Omit`\<`T1`, keyof `T2` \| keyof `T3` \| keyof `T4`\> & `Omit`\<`T2`, keyof `T3` \| keyof `T4`\> & `Omit`\<`T3`, keyof `T4`\> & `T4`\>; \} = `Object.assign`

Defined in: [packages/core/src/utils.ts:368](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/utils.ts#L368)

Type-safe version of Object.assign that properly handles type merging.
Unlike standard Object.assign typing, properties with the same name are replaced
rather than becoming a union type.

### Call Signature

> \<`T1`, `T2`\>(`a1`, `a2`): [`Plain`](#type-aliasesplainmd)\<`T1` *extends* (...`params`) => `O` ? (...`params`) => `O` : `object` & `Omit`\<`T1`, keyof `T2`\> & `Omit`\<`T2`, `never`\> & `Omit`\<\{ \}, `never`\>\>

#### Type Parameters

##### T1

`T1`

##### T2

`T2`

#### Parameters

##### a1

`T1`

##### a2

`T2`

#### Returns

[`Plain`](#type-aliasesplainmd)\<`T1` *extends* (...`params`) => `O` ? (...`params`) => `O` : `object` & `Omit`\<`T1`, keyof `T2`\> & `Omit`\<`T2`, `never`\> & `Omit`\<\{ \}, `never`\>\>

### Call Signature

> \<`T1`, `T2`, `T3`\>(`a1`, `a2`, `a3?`): [`Plain`](#type-aliasesplainmd)\<`T1` *extends* (...`params`) => `O` ? (...`params`) => `O` : `object` & `Omit`\<`T1`, keyof `T2` \| keyof `T3`\> & `Omit`\<`T2`, keyof `T3`\> & `Omit`\<`T3`, `never`\>\>

#### Type Parameters

##### T1

`T1`

##### T2

`T2`

##### T3

`T3` = \{ \}

#### Parameters

##### a1

`T1`

##### a2

`T2`

##### a3?

`T3`

#### Returns

[`Plain`](#type-aliasesplainmd)\<`T1` *extends* (...`params`) => `O` ? (...`params`) => `O` : `object` & `Omit`\<`T1`, keyof `T2` \| keyof `T3`\> & `Omit`\<`T2`, keyof `T3`\> & `Omit`\<`T3`, `never`\>\>

### Call Signature

> \<`T1`, `T2`, `T3`, `T4`\>(`a1`, `a2`, `a3?`, `a4?`): [`Plain`](#type-aliasesplainmd)\<`T1` *extends* (...`params`) => `O` ? (...`params`) => `O` : `object` & `Omit`\<`T1`, keyof `T2` \| keyof `T3` \| keyof `T4`\> & `Omit`\<`T2`, keyof `T3` \| keyof `T4`\> & `Omit`\<`T3`, keyof `T4`\> & `T4`\>

#### Type Parameters

##### T1

`T1`

##### T2

`T2`

##### T3

`T3` = \{ \}

##### T4

`T4` = \{ \}

#### Parameters

##### a1

`T1`

##### a2

`T2`

##### a3?

`T3`

##### a4?

`T4`

#### Returns

[`Plain`](#type-aliasesplainmd)\<`T1` *extends* (...`params`) => `O` ? (...`params`) => `O` : `object` & `Omit`\<`T1`, keyof `T2` \| keyof `T3` \| keyof `T4`\> & `Omit`\<`T2`, keyof `T3` \| keyof `T4`\> & `Omit`\<`T3`, keyof `T4`\> & `T4`\>

### Template

Type of the target object

### Template

Type of the first source object

### Template

Type of the optional second source object

### Template

Type of the optional third source object

### Returns

A new object with merged properties


<a name="variablesatommd"></a>

## Variable: atom()

> **atom**: \{\<`T`\>(`createState`, `name?`): [`Atom`](#interfacesatommd)\<`T`\>; \<`T`\>(`initState`, `name?`): [`Atom`](#interfacesatommd)\<`T`\>; \}

Defined in: [packages/core/src/core/atom.ts:885](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L885)

Creates a mutable state container.

The atom is the core primitive for storing and updating mutable state in Reatom.
Atoms can be called as functions to read their current value or to update the value.

### Call Signature

> \<`T`\>(`createState`, `name?`): [`Atom`](#interfacesatommd)\<`T`\>

#### Type Parameters

##### T

`T`

#### Parameters

##### createState

() => `T`

##### name?

`string`

#### Returns

[`Atom`](#interfacesatommd)\<`T`\>

### Call Signature

> \<`T`\>(`initState`, `name?`): [`Atom`](#interfacesatommd)\<`T`\>

#### Type Parameters

##### T

`T`

#### Parameters

##### initState

`T`

##### name?

`string`

#### Returns

[`Atom`](#interfacesatommd)\<`T`\>

### Template

The type of state stored in the atom

### Param

A function that returns the initial state, or the initial state value directly

### Param

Optional name for the atom (useful for debugging)

### Returns

An atom instance containing the state

### Example

```ts
// Create with initial value
const counter = atom(0, 'counter')

// Read current value
const value = counter() // -> 0

// Update with new value
counter(5) // Sets value to 5

// Update with a function
counter(prev => prev + 1) // Sets value to 6
```


<a name="variablescontextmd"></a>

## Variable: context

> **context**: [`ContextAtom`](#interfacescontextatommd)

Defined in: [packages/core/src/core/atom.ts:948](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L948)

Core context object that manages the reactive state context in Reatom.

The context is responsible for tracking dependencies between atoms, managing
computation stacks, and ensuring proper reactivity. It serves as the foundation
for Reatom's reactivity system and provides access to the current context frame.

### Returns

The current context frame

### Throws

If called outside a valid context (broken async stack)


<a name="variablescreateatommd"></a>

## Variable: createAtom()

> **createAtom**: \{\<`State`\>(`setup`, `name?`): [`Atom`](#interfacesatommd)\<`State`\>; \<`State`\>(`setup`, `name?`): [`Atom`](#interfacesatommd)\<`State`\>; \}

Defined in: [packages/core/src/core/atom.ts:696](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/atom.ts#L696)

### Call Signature

> \<`State`\>(`setup`, `name?`): [`Atom`](#interfacesatommd)\<`State`\>

#### Type Parameters

##### State

`State`

#### Parameters

##### setup

###### computed

(`prev`) => `State`

###### initState

`State` \| () => `State`

##### name?

`string`

#### Returns

[`Atom`](#interfacesatommd)\<`State`\>

### Call Signature

> \<`State`\>(`setup`, `name?`): [`Atom`](#interfacesatommd)\<`State`\>

#### Type Parameters

##### State

`State`

#### Parameters

##### setup

###### computed?

() => `State` \| (`state?`) => `State`

###### initState?

`State` \| () => `State`

##### name?

`string`

#### Returns

[`Atom`](#interfacesatommd)\<`State`\>


<a name="variablesentriesmd"></a>

## Variable: entries()

> `const` **entries**: \<`T`\>(`thing`) => \[keyof `T`, `T`\[keyof `T`\]\][] = `Object.entries`

Defined in: [packages/core/src/utils.ts:412](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/utils.ts#L412)

Type-safe version of Object.entries that preserves key and value type information.
Returns an array of key-value pairs with correct types.

### Type Parameters

#### T

`T` *extends* `object`

The object type

### Parameters

#### thing

`T`

The object to get entries from

### Returns

\[keyof `T`, `T`\[keyof `T`\]\][]

An array of [key, value] pairs with proper typing


<a name="variablesfieldinitfocusmd"></a>

## Variable: fieldInitFocus

> `const` **fieldInitFocus**: [`FieldFocus`](#interfacesfieldfocusmd)

Defined in: [packages/core/src/form/src/reatomField.ts:206](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L206)


<a name="variablesfieldinitvalidationmd"></a>

## Variable: fieldInitValidation

> `const` **fieldInitValidation**: [`FieldValidation`](#interfacesfieldvalidationmd)

Defined in: [packages/core/src/form/src/reatomField.ts:212](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L212)


<a name="variablesfieldinitvalidationlessmd"></a>

## Variable: fieldInitValidationLess

> `const` **fieldInitValidationLess**: [`FieldValidation`](#interfacesfieldvalidationmd)

Defined in: [packages/core/src/form/src/reatomField.ts:219](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/form/src/reatomField.ts#L219)


<a name="variableskeysmd"></a>

## Variable: keys()

> `const` **keys**: \<`T`\>(`thing`) => keyof `T`[] = `Object.keys`

Defined in: [packages/core/src/utils.ts:400](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/utils.ts#L400)

Type-safe version of Object.keys that preserves the key type information.
Returns an array of keys with the correct type for the object.

### Type Parameters

#### T

`T` *extends* `object`

The object type

### Parameters

#### thing

`T`

The object to get keys from

### Returns

keyof `T`[]

An array of the object's keys with proper typing


<a name="variablesmergemd"></a>

## Variable: merge

> `const` **merge**: *typeof* [`assign`](#variablesassignmd)

Defined in: [packages/core/src/utils.ts:389](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/utils.ts#L389)

Creates a new object with merged properties from all provided objects.
Similar to Object.assign but always creates a new object rather than mutating the first argument.

### Returns

A new object with all properties from the provided objects

### Example

```ts
// Creates a new object: { a: 1, b: 2, c: 3 }
const obj = merge({ a: 1 }, { b: 2 }, { c: 3 });
```


<a name="variablesnoopmd"></a>

## Variable: noop()

> `const` **noop**: (...`params`) => `any`

Defined in: [packages/core/src/utils.ts:197](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/utils.ts#L197)

No-operation function that accepts any parameters and returns undefined.
Useful as a default callback or for stubbing functionality.

### Parameters

#### params

...`any`[]

### Returns

`any`


<a name="variablesoneventmd"></a>

## Variable: onEvent()

> `const` **onEvent**: \{\<`Target`, `Type`\>(`target`, `type`): `Promise`\<[`EventOfTarget`](#type-aliaseseventoftargetmd)\<`Target`, `Type`\>\>; \<`Event`\>(`target`, `type`): `Promise`\<`Event`\>; \<`Target`, `Type`\>(`target`, `type`, `cb`, `options?`): [`Unsubscribe`](#interfacesunsubscribemd); \<`Event`\>(`target`, `type`, `cb`, `options?`): [`Unsubscribe`](#interfacesunsubscribemd); \}

Defined in: [packages/core/src/web/onEvent.ts:14](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/web/onEvent.ts#L14)

### Call Signature

> \<`Target`, `Type`\>(`target`, `type`): `Promise`\<[`EventOfTarget`](#type-aliaseseventoftargetmd)\<`Target`, `Type`\>\>

#### Type Parameters

##### Target

`Target` *extends* `EventTarget`

##### Type

`Type` *extends* `string`

#### Parameters

##### target

`Target`

##### type

`Type`

#### Returns

`Promise`\<[`EventOfTarget`](#type-aliaseseventoftargetmd)\<`Target`, `Type`\>\>

### Call Signature

> \<`Event`\>(`target`, `type`): `Promise`\<`Event`\>

#### Type Parameters

##### Event

`Event`

#### Parameters

##### target

`EventTarget`

##### type

`string`

#### Returns

`Promise`\<`Event`\>

### Call Signature

> \<`Target`, `Type`\>(`target`, `type`, `cb`, `options?`): [`Unsubscribe`](#interfacesunsubscribemd)

#### Type Parameters

##### Target

`Target` *extends* `EventTarget`

##### Type

`Type` *extends* `string`

#### Parameters

##### target

`Target`

##### type

`Type`

##### cb

(`value`) => `any`

##### options?

`AddEventListenerOptions`

#### Returns

[`Unsubscribe`](#interfacesunsubscribemd)

### Call Signature

> \<`Event`\>(`target`, `type`, `cb`, `options?`): [`Unsubscribe`](#interfacesunsubscribemd)

#### Type Parameters

##### Event

`Event`

#### Parameters

##### target

`EventTarget`

##### type

`string`

##### cb

(`value`) => `any`

##### options?

`AddEventListenerOptions`

#### Returns

[`Unsubscribe`](#interfacesunsubscribemd)


<a name="variablesonlineatommd"></a>

## Variable: onLineAtom

> **onLineAtom**: `OnlineAtom`

Defined in: [packages/core/src/web/onLineAtom.ts:15](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/web/onLineAtom.ts#L15)

### See

https://issues.chromium.org/issues/338514113


<a name="variablespeekmd"></a>

## Variable: peek

> **peek**: [`Frame`](#interfacesframemd)\[`"run"`\]

Defined in: [packages/core/src/methods/peek.ts:22](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/methods/peek.ts#L22)

Executes a callback in the current context without tracking dependencies

The peek function allows you to access the current context and execute code within it
without establishing reactive dependencies. This is useful for read operations that
should not cause subscriptions or reactivity.

### Param

The callback function to execute in the current context

### Param

Parameters to pass to the callback function

### Returns

The result of the callback function

### Example

```ts
// Read an atom's value without establishing a dependency
const currentCount = peek(() => counter());
console.log(`Current count is ${currentCount} (without subscribing)`);
```


<a name="variablesrafmd"></a>

## Variable: rAF

> **rAF**: [`Atom`](#interfacesatommd)\<\{ `delta`: `number`; `timestamp`: `number`; \}\>

Defined in: [packages/core/src/web/rAF.ts:4](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/web/rAF.ts#L4)


<a name="variablesrandommd"></a>

## Variable: random

> `const` **random**: *typeof* `_random`

Defined in: [packages/core/src/utils.ts:490](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/utils.ts#L490)

Generates a random integer between min and max (inclusive).

### Param

The minimum integer value (defaults to 0)

### Param

The maximum integer value (defaults to Number.MAX_SAFE_INTEGER - 1)

### Returns

A random integer between min and max


<a name="variablesreatomstringmd"></a>

## Variable: reatomString()

> `const` **reatomString**: \{(`init?`, `name?`): [`StringAtom`](#type-aliasesstringatommd); \<`T`\>(`init`, `name?`): [`StringAtom`](#type-aliasesstringatommd)\<`T`\>; \}

Defined in: [packages/core/src/primitives/reatomString.ts:7](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/primitives/reatomString.ts#L7)

### Call Signature

> (`init?`, `name?`): [`StringAtom`](#type-aliasesstringatommd)

#### Parameters

##### init?

`string`

##### name?

`string`

#### Returns

[`StringAtom`](#type-aliasesstringatommd)

### Call Signature

> \<`T`\>(`init`, `name?`): [`StringAtom`](#type-aliasesstringatommd)\<`T`\>

#### Type Parameters

##### T

`T` *extends* `string`

#### Parameters

##### init

`T`

##### name?

`string`

#### Returns

[`StringAtom`](#type-aliasesstringatommd)\<`T`\>


<a name="variablesrollbackmd"></a>

## Variable: rollback

> **rollback**: [`Action`](#interfacesactionmd)\<\[`any`\], `void`\>

Defined in: [packages/core/src/methods/transaction.ts:111](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/methods/transaction.ts#L111)


<a name="variablessearchparamsatommd"></a>

## Variable: searchParamsAtom

> `const` **searchParamsAtom**: [`SearchParamsAtom`](#interfacessearchparamsatommd)

Defined in: [packages/core/src/web/url.ts:449](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/web/url.ts#L449)

Create an atom that represents search parameters from the URL.


<a name="variablessettimeoutmd"></a>

## Variable: setTimeout

> `const` **setTimeout**: `SetTimeout`

Defined in: [packages/core/src/utils.ts:710](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/utils.ts#L710)

Enhanced version of the global setTimeout function.
Ensures consistent behavior across different environments by handling both numeric
and object timeout IDs. Adds a toJSON method to object timeout IDs for serialization.

### Param

The function to call after the timeout

### Param

The time in milliseconds to wait before calling the handler

### Param

Optional arguments to pass to the handler function

### Returns

A timeout ID that can be used with clearTimeout


<a name="variablesspawnmd"></a>

## Variable: spawn

> **spawn**: [`GenericAction`](#type-aliasesgenericactionmd)\<\<`Params`, `Payload`\>(`cb`, ...`params`) => `Payload`\>

Defined in: [packages/core/src/methods/abort.ts:234](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/methods/abort.ts#L234)

This utility allow you to start a function which will NOT follow the async abort context.

### Example

but don't want to abort the fetch when the subscription is lost to save the data anyway.

```ts
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


<a name="variablestransactionvarmd"></a>

## Variable: transactionVar

> **transactionVar**: `TransactionVariable`

Defined in: [packages/core/src/methods/transaction.ts:109](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/methods/transaction.ts#L109)


<a name="variablesurlatommd"></a>

## Variable: urlAtom

> **urlAtom**: [`UrlAtom`](#interfacesurlatommd)

Defined in: [packages/core/src/web/url.ts:181](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/web/url.ts#L181)

Create the URL atom with the new Reatom API.


<a name="variablesvariablemd"></a>

## Variable: variable()

> **variable**: \{\<`T`\>(`name?`): [`Variable`](#interfacesvariablemd)\<\[`T`\], `T`\>; \<`Params`, `Payload`\>(`set`, `name?`): [`Variable`](#interfacesvariablemd)\<`Params`, `Payload`\>; \}

Defined in: [packages/core/src/methods/variable.ts:101](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/methods/variable.ts#L101)

Creates a new context variable with getter and setter functionality

This implementation provides a similar capability to the proposed TC39 AsyncContextVariable,
allowing you to maintain values that are specific to a particular execution context.
Variables created with this function can be accessed and modified within their frame context.

### Call Signature

> \<`T`\>(`name?`): [`Variable`](#interfacesvariablemd)\<\[`T`\], `T`\>

#### Type Parameters

##### T

`T`

#### Parameters

##### name?

`string`

#### Returns

[`Variable`](#interfacesvariablemd)\<\[`T`\], `T`\>

### Call Signature

> \<`Params`, `Payload`\>(`set`, `name?`): [`Variable`](#interfacesvariablemd)\<`Params`, `Payload`\>

#### Type Parameters

##### Params

`Params` *extends* `any`[]

##### Payload

`Payload`

#### Parameters

##### set

(...`params`) => `Payload`

##### name?

`string`

#### Returns

[`Variable`](#interfacesvariablemd)\<`Params`, `Payload`\>

### See

[https://github.com/tc39/proposal-async-context?tab=readme-ov-file#asynccontextvariable](https://github.com/tc39/proposal-async-context?tab=readme-ov-file#asynccontextvariable)

### Template

The type of the simple variable (when used with just a name)

### Template

Types of parameters for the setter function

### Template

The type of the stored value

### Example

```ts
// Simple variable with string values
const currentUser = variable<string>('currentUser');

// Set the value
currentUser.set('Alice');

// Get the value
console.log(currentUser.get()); // 'Alice'

// Run code with a different value
currentUser.run('Bob', () => {
  console.log(currentUser.get()); // 'Bob'
});

// Advanced variable with custom setter logic
const userRole = variable((role: string, permissions: string[]) => {
  return { role, permissions };
}, 'userRole');

userRole.set('admin', ['read', 'write', 'delete']);
```


<a name="variableswithasyncmd"></a>

## Variable: withAsync()

> **withAsync**: \<`Err`, `EmptyErr`\>(`options?`) => \<`T`\>(`target`) => `T` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `Params`, `Promise`\<`Payload`\>\> ? `T`\<`T`\> & [`AsyncExt`](#interfacesasyncextmd)\<`Params`, `Payload`, `Err` \| `EmptyErr`\> : `never`

Defined in: [packages/core/src/async/withAsync.ts:136](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/async/withAsync.ts#L136)

Extension that adds async state tracking to atoms or actions that return promises.
Manages pending state, errors, and provides lifecycle actions for async operations.

This extension preserves Reatom context across async operations, ensuring that
the async operation's results properly update Reatom state.

### Type Parameters

#### Err

`Err` = `Error`

The type of errors after parsing

#### EmptyErr

`EmptyErr` = `undefined`

The type of the empty error state

### Parameters

#### options?

Configuration options for error handling

`null` | [`AsyncOptions`](#type-aliasesasyncoptionsmd)\<`Err`, `EmptyErr`\>

### Returns

An extension function that can be applied to atoms or actions

> \<`T`\>(`target`): `T` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `Params`, `Promise`\<`Payload`\>\> ? `T`\<`T`\> & [`AsyncExt`](#interfacesasyncextmd)\<`Params`, `Payload`, `Err` \| `EmptyErr`\> : `never`

#### Type Parameters

##### T

`T` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\>

#### Parameters

##### target

`T`

#### Returns

`T` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `Params`, `Promise`\<`Payload`\>\> ? `T`\<`T`\> & [`AsyncExt`](#interfacesasyncextmd)\<`Params`, `Payload`, `Err` \| `EmptyErr`\> : `never`

### Example

```ts
// Basic usage with an action:
const fetchUser = action(async (userId: string) => {
  const response = await wrap(fetch(`/api/users/${userId}`))
  return await wrap(response.json())
}, 'fetchUser').extend(withAsync())

// Can then access:
fetchUser.error()   // → latest error if any
fetchUser.ready()   // → are all operations complete?
```


<a name="variableswithmiddlewaremd"></a>

## Variable: withMiddleware()

> **withMiddleware**: \{\<`Target`\>(`cb`, `tail?`): [`GenericExt`](#interfacesgenericextmd)\<`Target`\>; \<`Target`, `Result`\>(`cb`, `tail?`): [`Ext`](#interfacesextmd)\<`Target`, `Result`\>; \}

Defined in: [packages/core/src/core/extend.ts:174](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/extend.ts#L174)

Creates an extension that adds middleware to an atom or action.

Middleware allows intercepting and modifying the execution flow of atoms and actions.
This is the fundamental mechanism for creating behavior extensions in Reatom.

### Call Signature

> \<`Target`\>(`cb`, `tail?`): [`GenericExt`](#interfacesgenericextmd)\<`Target`\>

#### Type Parameters

##### Target

`Target` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\>

#### Parameters

##### cb

(`target`) => [`Middleware`](#type-aliasesmiddlewaremd)\<`Target`\>

##### tail?

`boolean`

#### Returns

[`GenericExt`](#interfacesgenericextmd)\<`Target`\>

### Call Signature

> \<`Target`, `Result`\>(`cb`, `tail?`): [`Ext`](#interfacesextmd)\<`Target`, `Result`\>

#### Type Parameters

##### Target

`Target` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\>

##### Result

`Result` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\> = `Target`

#### Parameters

##### cb

(`target`) => [`Middleware`](#type-aliasesmiddlewaremd)\<`Target`\>

##### tail?

`boolean`

#### Returns

[`Ext`](#interfacesextmd)\<`Target`, `Result`\>

### Template

The type of atom or action the middleware will be applied to

### Template

The resulting type after applying the middleware

### Param

A function that receives the target and returns a middleware function

### Param

Whether to add the middleware at the end (true) or beginning (false) of the middleware chain

### Returns

An extension that applies the middleware when used with .extend()

### Example

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


<a name="variableswithparamsmd"></a>

## Variable: withParams()

> **withParams**: \<`Target`, `Params`\>(`parse`) => [`ParamsExt`](#interfacesparamsextmd)\<`Target`, `Params`\>

Defined in: [packages/core/src/core/extend.ts:299](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/extend.ts#L299)

Creates an extension that transforms parameters before they reach the atom or action.

This utility lets you change how parameters are processed when an atom or action
is called, enabling custom parameter handling, validation, or transformation.

### Type Parameters

#### Target

`Target` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\>

The type of atom or action being extended

#### Params

`Params` *extends* `any`[]

The parameter types that will be accepted by the extended atom/action

### Parameters

#### parse

(...`parse`) => [`OverloadParameters`](#type-aliasesoverloadparametersmd)\<`Target`\>\[`0`\]

Function that transforms the new parameters into what the atom/action expects

### Returns

[`ParamsExt`](#interfacesparamsextmd)\<`Target`, `Params`\>

An extension that applies the parameter transformation

### Example

```ts
// Convert from any unit to meters
const length = atom(0, 'length').extend(
  withParams((value: number, unit: 'cm' | 'm' | 'km') => {
    switch (unit) {
      case 'cm': return value / 100
      case 'm': return value
      case 'km': return value * 1000
    }
  })
)

length(5, 'km') // Sets value to 5000 meters
```


<a name="variableswithrollbackmd"></a>

## Variable: withRollback()

> **withRollback**: () => [`GenericExt`](#interfacesgenericextmd)

Defined in: [packages/core/src/methods/transaction.ts:110](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/methods/transaction.ts#L110)

Extension to follow rollback context.
For atoms it adds prev state restoration when relative `rollback()` appears.
For actions it adds error handling and call `rollback()` automatically.

### Returns

[`GenericExt`](#interfacesgenericextmd)


<a name="variableswithtapmd"></a>

## Variable: withTap()

> **withTap**: \{(`cb`): [`GenericExt`](#interfacesgenericextmd); \<`Target`\>(`cb`): [`Ext`](#interfacesextmd)\<`Target`, `Target`\>; \}

Defined in: [packages/core/src/core/extend.ts:221](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/core/extend.ts#L221)

Creates an extension that allows observing state changes without modifying them.

This extension adds a middleware that calls the provided callback function
whenever the atom's state changes, passing the target atom, new state, and previous state.
This is useful for side effects like logging, analytics, or debugging.

### Call Signature

> (`cb`): [`GenericExt`](#interfacesgenericextmd)

#### Parameters

##### cb

(`target`, `state`, `prevState`) => `void`

#### Returns

[`GenericExt`](#interfacesgenericextmd)

### Call Signature

> \<`Target`\>(`cb`): [`Ext`](#interfacesextmd)\<`Target`, `Target`\>

#### Type Parameters

##### Target

`Target` *extends* [`AtomLike`](#interfacesatomlikemd)\<`any`, `any`[], `any`\>

#### Parameters

##### cb

(`target`, `state`, `prevState`) => `void`

#### Returns

[`Ext`](#interfacesextmd)\<`Target`, `Target`\>

### Param

Callback function that receives the target, new state, and previous state

### Returns

An extension that can be applied to atoms or actions

### Example

```ts
const counter = atom(0, 'counter').extend(
  withTap((target, state, prevState) => {
    console.log(`${target.name} changed from ${prevState} to ${state}`)
  })
)
```


<a name="variableswrapmd"></a>

## Variable: wrap()

> **wrap**: \{\<`Params`, `Payload`\>(`target`, `frame?`): (...`params`) => `Payload`; \<`T`\>(`target`, `frame?`): `T`; \}

Defined in: [packages/core/src/methods/wrap.ts:39](https://github.com/artalar/reatom/blob/233aa4756128ddab9f4e01665766be5a24d58bc2/packages/core/src/methods/wrap.ts#L39)

Preserves Reatom's reactive context across async boundaries or function calls.

This is a CRITICAL function in Reatom that ensures proper context tracking across
asynchronous operations like Promises, setTimeout, event handlers, and more. Without
proper wrapping, atoms would lose their context after async operations, leading to
"Missed context" errors when attempting to update state.

Wrap handles two scenarios:
1. Function wrapping: Returns a new function that preserves context when called
2. Promise wrapping: Returns a new promise that preserves context through its chain

### Call Signature

> \<`Params`, `Payload`\>(`target`, `frame?`): (...`params`) => `Payload`

#### Type Parameters

##### Params

`Params` *extends* `any`[]

##### Payload

`Payload`

#### Parameters

##### target

(...`params`) => `Payload`

##### frame?

[`Frame`](#interfacesframemd)\<`any`, `any`[], `any`\>

#### Returns

> (...`params`): `Payload`

##### Parameters

###### params

...`Params`

##### Returns

`Payload`

### Call Signature

> \<`T`\>(`target`, `frame?`): `T`

#### Type Parameters

##### T

`T` *extends* `Promise`\<`any`\>

#### Parameters

##### target

`T`

##### frame?

[`Frame`](#interfacesframemd)\<`any`, `any`[], `any`\>

#### Returns

`T`

### Template

The parameter types when wrapping a function

### Template

The return type when wrapping a function

### Template

The promise type when wrapping a promise

### Param

The function or promise to wrap with context preservation

### Param

The frame to use (defaults to the current top frame)

### Returns

A wrapped function or promise that preserves reactive context

### Example

```ts
// Wrapping a function (e.g., an event handler)
button.addEventListener('click', wrap(() => {
  counter(prev => prev + 1) // Works, context preserved
}))

// Wrapping async operations
action(async () => {
  const response = await wrap(fetch('/api/data'))
  const data = await wrap(response.json())
  results(data) // Works, context preserved
})
```
