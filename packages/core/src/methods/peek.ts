import { context, Frame } from '../core'

/**
 * Executes a callback in the current context without tracking dependencies
 *
 * The peek function allows you to access the current context and execute code within it
 * without establishing reactive dependencies. This is useful for read operations that
 * should not cause subscriptions or reactivity.
 *
 * @type {Frame['run']} - Function signature matching the context frame's run method
 * @param {Function} cb - The callback function to execute in the current context
 * @param {...any} params - Parameters to pass to the callback function
 * @returns {any} The result of the callback function
 *
 * @example
 * ```ts
 * // Read an atom's value without establishing a dependency
 * const currentCount = peek(() => counter());
 * console.log(`Current count is ${currentCount} (without subscribing)`);
 * ```
 */
export let peek: Frame['run'] = (cb, ...params) => context().run(cb, ...params)
