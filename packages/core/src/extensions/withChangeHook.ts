import type { Action, AtomLike, AtomState, Ext } from '../core'
import { _enqueue, ReatomError, top, withMiddleware } from '../core'
import type { OverloadParameters, Unsubscribe } from '../utils'

/**
 * Executes a callback whenever the target atom's state changes.
 *
 * This extension is essential for creating stable, declarative connections
 * between independent modules or features. The hook fires in the "Hooks" phase
 * of Reatom's lifecycle (after Updates, before Computations), making it perfect
 * for triggering side effects or synchronizing state across module boundaries.
 *
 * **When to use:**
 *
 * - Creating stable connections between features that shouldn't depend on each
 *   other directly
 * - Triggering validation when a field's value or state changes
 * - Syncing derived state in response to source state changes
 * - Managing side effects like DOM updates or analytics based on state changes
 * - Coordinating behavior across module boundaries without coupling them
 *
 * **When NOT to use:**
 *
 * - In dynamic features, like from computed factories (use `take` or `effect` and
 *   `ifChanged` instead)
 * - When a regular computed dependency would suffice
 * - For connection/disconnection events (use `withConnectHook` instead)
 *
 * The callback receives the new state and previous state. It only fires when
 * the state actually changes (referential inequality check via `Object.is`).
 * The callback executes within the same reactive context, so you can safely
 * call other atoms and actions.
 *
 * @example
 *   // Basic usage: React to atom state changes
 *   const theme = reatomEnum(['light', 'dark', 'system']).extend(
 *     withChangeHook((state, prevState) => {
 *       document.body.classList.remove(prevState)
 *       document.body.classList.add(state)
 *     }),
 *   )
 *
 * @example
 *   // Stable feature connection: Analytics tracking
 *   // In userModule.ts
 *   export const userAtom = atom({ id: null, name: '' }, 'user')
 *
 *   // In analyticsModule.ts
 *   import { userAtom } from './userModule'
 *   userAtom.extend(
 *     withChangeHook((user, prevUser) => {
 *       if (user.id !== prevUser?.id) {
 *         analytics.identify(user.id, { name: user.name })
 *       }
 *     }),
 *   )
 *
 * @template Target - The atom type being extended
 * @param cb - Callback fired when state changes. Receives:
 *
 *   - `state` - The new state value
 *   - `prevState` - The previous state value (undefined on first change)
 *
 * @returns Extension function to be used with `.extend()`
 * @throws {ReatomError} If callback is not a function
 * @see {@link addChangeHook} For dynamically adding/removing change hooks
 * @see {@link withCallHook} For reacting to action calls instead of state changes
 * @see {@link withConnectHook} For reacting to connection lifecycle events
 */
export let withChangeHook = <Target extends AtomLike>(
  cb: (
    state: AtomState<Target>,
    prevState: undefined | AtomState<Target>,
  ) => void,
): Ext<Target> => {
  if (typeof cb !== 'function') {
    throw new ReatomError('function expected')
  }

  return withMiddleware<Target>(
    () =>
      function withChangeHook(next, ...params) {
        let frame = top()
        let prevState = frame.state
        let update = { state: prevState as AtomState<Target> }

        // enqueue before next call for better predictable logs
        _enqueue(() => {
          if (!Object.is(prevState, update.state)) {
            frame.run(cb, update.state, prevState)
          }
        }, 'hook')

        // @ts-ignore
        update.state = next(...params)
        return update.state
      },
  )
}

/**
 * Dynamically adds a change hook to an existing atom and returns a function to
 * remove it.
 *
 * Unlike `withChangeHook` which is applied at atom definition time,
 * `addChangeHook` allows you to add and remove hooks at runtime. This is useful
 * for temporary subscriptions or when you need conditional hook behavior that
 * can be enabled/disabled dynamically.
 *
 * This feature is rarely needed, you should prefer using `effect` with
 * `ifChanged` or `take` instead.
 *
 * @template T - The atom type
 * @param target - The atom to attach the hook to
 * @param cb - Callback fired when state changes
 * @returns Unsubscribe function to remove this specific hook
 * @see {@link withChangeHook} For adding hooks at atom definition time
 */
export let addChangeHook = <T extends AtomLike>(
  target: T,
  cb: (state: AtomState<T>, prevState?: AtomState<T>) => void,
): Unsubscribe => {
  let { middlewares } = target.extend(withChangeHook(cb)).__reatom

  let hook = middlewares[middlewares.length - 1]!
  return () => {
    let index = middlewares.indexOf(hook)
    if (index !== -1) {
      middlewares.splice(index, 1)
    }
  }
}

/**
 * Executes a callback whenever the target action is called.
 *
 * This extension enables you to react to action invocations, making it
 * invaluable for creating stable connections between independent features. The
 * hook fires in the "Hooks" phase (after Updates, before Computations) and
 * receives both the action's return value and its parameters.
 *
 * **When to use:**
 *
 * - Creating stable cross-module connections that react to specific actions
 * - Tracking action calls for analytics, logging, or debugging
 * - Triggering side effects in response to action completions
 * - Coordinating behavior between independent features without coupling them
 * - Implementing event-driven communication patterns
 *
 * **When NOT to use:**
 *
 * - In dynamic features, like from computed factories (`take` or `effect` and
 *   `getCalls` instead)
 * - When you can achieve the same goal with direct action composition
 *
 * For actions extended with `withAsync`, you can also hook into `.onFulfill`,
 * `.onReject`, or `.onSettle` to react to async completion events.
 *
 * @example
 *   // Cross-module coordination: Analytics tracking
 *   // In checkoutModule.ts
 *   export const submitOrder = action(async (order) => {
 *     const result = await api.submitOrder(order)
 *     return result
 *   }, 'submitOrder')
 *
 *   // In analyticsModule.ts
 *   import { submitOrder } from './checkoutModule'
 *   submitOrder.extend(
 *     withCallHook((promise, params) => {
 *       const [order] = params
 *       analytics.track('new_order', {
 *         orderId: order.id,
 *         total: order.total,
 *       })
 *     }),
 *   )
 *
 * @example
 *   // Stable feature connection: Form submission tracking
 *   const fetch = action(async (param: number) => {
 *     const data = await api.fetch(param)
 *     return data
 *   }, 'fetch').extend(withAsync())
 *
 *   fetch.onFulfill.extend(
 *     withCallHook((call) => {
 *       console.log('Fetch completed', call.payload)
 *     }),
 *   )
 *
 * @template Target - The action type being extended
 * @param cb - Callback fired when action is called. Receives:
 *
 *   - `payload` - The return value of the action
 *   - `params` - The parameters passed to the action as an array
 *
 * @returns Extension function to be used with `.extend()`
 * @throws {ReatomError} If callback is not a function
 * @throws {ReatomError} If applied to an atom instead of an action
 * @see {@link addCallHook} For dynamically adding/removing call hooks
 * @see {@link withChangeHook} For reacting to atom state changes instead
 * @see {@link withAsync} For async action lifecycle hooks (onFulfill, onReject, onSettle)
 */
export let withCallHook = <Target extends Action>(
  cb: (payload: ReturnType<Target>, params: OverloadParameters<Target>) => void,
): Ext<Target> => {
  if (typeof cb !== 'function') {
    throw new ReatomError('function expected')
  }

  return withMiddleware<Target>((target) => {
    if (target.__reatom.reactive) {
      throw new ReatomError('withCallHook can be used only with actions')
    }

    return function withCallHook(next, ...params) {
      let frame = top()
      let prevState = frame.state
      let update = { state: prevState as AtomState<Target> }

      // enqueue before next call for better predictable logs
      _enqueue(() => {
        if (!Object.is(prevState, update.state)) {
          for (let i = prevState?.length ?? 0; i < update.state.length; i++) {
            let { params, payload } = update.state[i]!
            frame.run(cb, payload, params as OverloadParameters<Target>)
          }
        }
      }, 'hook')

      // @ts-ignore
      update.state = next(...params)

      return update.state
    }
  })
}

/**
 * Dynamically adds a call hook to an existing action and returns a function to
 * remove it.
 *
 * Unlike `withCallHook` which is applied at action definition time,
 * `addCallHook` allows you to add and remove hooks at runtime. This is useful
 * for temporary subscriptions, conditional hook behavior, or when integrating
 * with external systems that need to be connected and disconnected
 * dynamically.
 *
 * This feature is rarely needed, you should prefer using `effect` with
 * `getCalls` or `take` instead.
 *
 * @template Target - The action type
 * @param target - The action to attach the hook to
 * @param cb - Callback fired when the action is called
 * @returns Unsubscribe function to remove this specific hook
 * @see {@link withCallHook} For adding hooks at action definition time
 */
export let addCallHook = <Target extends Action>(
  target: Target,
  cb: (payload: ReturnType<Target>, params: OverloadParameters<Target>) => void,
): Unsubscribe => {
  let { middlewares } = target.extend(withCallHook(cb)).__reatom

  let hook = middlewares[middlewares.length - 1]!
  return () => {
    let index = middlewares.indexOf(hook)
    if (index !== -1) {
      middlewares.splice(index, 1)
    }
  }
}
