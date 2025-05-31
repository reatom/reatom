/**
 * TypeScript type representation of the standard `setTimeout` function.
 *
 * This type is isolated in a separate file to avoid referencing the global `setTimeout`
 * directly in the main bundle, which would automatically add a Node.js reference
 * (`/// <reference types="node" />`) to the bundle.
 *
 * @remarks
 * The separation is necessary because using `typeof setTimeout` in the same file where
 * `setTimeout` is referenced as a variable in the module scope would cause TypeScript
 * to add Node.js type references, potentially creating issues in non-Node environments.
 *
 * @see {@link https://github.com/reatom/reatom/issues/983} for the original issue and discussion
 *
 * @example
 * // How to use this type
 * import { SetTimeout } from '@reatom/core';
 *
 * function setupTimer(customTimeout: SetTimeout) {
 *   return customTimeout(() => console.log('Timer fired'), 1000);
 * }
 *
 * @public
 */
export type SetTimeout = typeof setTimeout
