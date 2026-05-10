import { _enqueue, isAction, top } from '../core'
import { schedule } from './schedule'

/**
 * Request the result of the current atom or action function as a promise.
 *
 * Returns a promise that resolves to the current execution frame's state
 * (action payload or atom state). Use it to catch errors from subsequent
 * operations in a cleaner way than traditional try-catch. Use `finally` to
 * clean up resources and so on. This method respects wrap and abortVar
 * policies.
 *
 * Inspired by TC39 explicit resource management proposal, but simpler and
 * coupled to Reatom's async stack for an ergonomic usage.
 *
 * @example
 *   export const processPayment = action(async (orderId: string) => {
 *     framePromise().catch((error) => showErrorNotification(error))
 *
 *     let order = await wrap(fetchOrder(orderId))
 *     await wrap(validateInventory(order))
 *     await wrap(chargeCustomer(order))
 *     await wrap(updateOrderStatus(order, 'completed'))
 *
 *     return order
 *   })
 *
 * @example
 *   // Classic approach - boilerplate with try-catch
 *   export const doSome = action(async () => {
 *     try {
 *       await wrap(fetchUser())
 *       await wrap(updateProfile())
 *       await wrap(syncData())
 *     } catch (error) {
 *       toast(error)
 *     }
 *   })
 *
 *   // native using - no try-catch and no "finally" logic
 *   // only resource management with extra variables
 *   // you can adapt `toast`, but without the payload / error data
 *   export const doSome = action(async () => {
 *     using _ = toast
 *     await wrap(fetchUser())
 *     await wrap(updateProfile())
 *     await wrap(syncData())
 *   })
 *
 *   // With our framePromise() - clean and declarative
 *   export const doSome = action(async () => {
 *     framePromise().catch((error) => toast(error))
 *     await wrap(fetchUser())
 *     await wrap(updateProfile())
 *     await wrap(syncData())
 *   })
 *
 * @example
 *   // Native using works only within the current function scope=*
 *   export const processOrder = action(async (orderId: string) => {
 *     withErrorLogging() // Impossible with native using
 *     await wrap(fetchOrder(orderId))
 *   })
 *
 *   // But framePromise works with the current action/atom frame!
 *   // Helper functions can use parent's framePromise - powerful composition!
 *   let withErrorLogging = () => {
 *     framePromise().catch((error) => logger.error(error))
 *   }
 *   export const processOrder = action(async (orderId: string) => {
 *     withErrorLogging() // Helper uses the SAME action frame!
 *     await wrap(fetchOrder(orderId))
 *   })
 *
 * @returns Promise that resolves with the current frame's state
 * @see {@link https://github.com/tc39/proposal-explicit-resource-management}
 */
export let framePromise = (): Promise<unknown> => {
  let frame = top()
  let state: unknown

  // enqueue separate hook to get an actions state before cleanup
  _enqueue(() => {
    state = isAction(frame.atom) ? frame.state.at(-1)?.payload : frame.state
  }, 'hook')

  return schedule(() => {
    return state
  }, 'effect')
}
