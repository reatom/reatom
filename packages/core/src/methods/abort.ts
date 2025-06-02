import type { Atom, GenericAction } from '../core'
import {
  action,
  bind,
  computed,
  createAtom,
  isAtom,
  named,
  top,
  withParams,
} from '../core'
import type { AbortError, Fn, Unsubscribe } from '../utils'
import { noop, toAbortError } from '../utils'
import type { Variable } from './variable'
import { variable } from './variable'

/**
 * Interface containing methods for abort handling in Reatom
 *
 * @interface AbortMethods
 */
export interface AbortMethods {
  /**
   * Throws the current abort error if the atom is in aborted state
   *
   * @throws {AbortError} If the atom is in aborted state
   */
  throwIfAborted(this: AbortAtom): void

  /**
   * Subscribes a callback to be executed when the atom transitions to aborted state
   *
   * @param {(error: AbortError) => void} cb - Callback to execute when aborted
   * @returns {Unsubscribe} Function to unsubscribe the callback
   */
  subscribeAbort(this: AbortAtom, cb: (error: AbortError) => void): Unsubscribe

  /**
   * Creates and returns an AbortController connected to this abort atom
   *
   * @returns {LazyAbortController} An AbortController that will be aborted when the atom is aborted
   */
  getController(this: AbortAtom): LazyAbortController
}

/**
 * Extended AbortController with unsubscribe capability
 *
 * @interface LazyAbortController
 * @extends {AbortController}
 */
export interface LazyAbortController extends AbortController {
  /**
   * Function to unsubscribe and clean up the controller
   */
  unsubscribe: Unsubscribe
}

/**
 * Atom-like object that tracks abort state
 *
 * @interface AbortAtom
 * @extends {Atom<null | AbortError, [] | [reason: any]>}
 * @extends {AbortMethods}
 */
export interface AbortAtom
  extends Atom<null | AbortError, [] | [reason: any]>,
    AbortMethods {}

/**
 * Interface for a global abort variable tied to the current frame
 *
 * @interface AbortVar
 * @extends {Variable<[option: string | AbortAtom], AbortAtom>}
 */
export interface AbortVar
  extends Variable<[option: string | AbortAtom], AbortAtom> {
  /**
   * Throws if the current frame is aborted
   *
   * @throws {AbortError} If the current frame is aborted
   */
  throwIfAborted(): void

  /**
   * Subscribes a callback to be executed when the current frame is aborted
   *
   * @param {(error: AbortError) => void} cb - Callback to execute when aborted
   * @returns {undefined | Unsubscribe} Function to unsubscribe the callback or undefined if no abort atom available
   */
  subscribeAbort(cb: (error: AbortError) => void): undefined | Unsubscribe

  /**
   * Creates and returns an AbortController connected to the current frame
   *
   * @returns {undefined | AbortController} An AbortController or undefined if no abort atom available
   */
  getController(): undefined | AbortController

  /**
   * Aborts the current frame with an optional reason
   *
   * @param {unknown} [reason] - Optional reason for aborting
   */
  abort(reason?: unknown): void
}

/**
 * Global abort variable that creates abort atoms coupled to the current frame.
 *
 * The abortVar is computed from all other abort atoms in the current frame tree,
 * which allows for propagation of abortion signals through the computation hierarchy.
 * This is a critical component for cancellation handling in Reatom's async operations.
 *
 * @type {AbortVar}
 * @example
 * ```ts
 * // Check if current operation is aborted
 * try {
 *   abortVar.throwIfAborted()
 *   // continue operation...
 * } catch (e) {
 *   // Handle abortion
 * }
 *
 * // Trigger abortion
 * abortVar.abort('Operation cancelled')
 *
 * // Get AbortController for fetch API
 * const controller = abortVar.getController()
 * fetch('/api/data', { signal: controller?.signal })
 * ```
 */
export let abortVar: AbortVar = /* @__PURE__ */ (() =>
  Object.assign(
    variable((option: string | AbortAtom): AbortAtom => {
      if (isAtom(option)) return option

      let frame = top()
      return createAtom<null | AbortError>(
        {
          initState: null,
          computed: (state) =>
            state ??
            abortVar.find((maybeAbortAtom) => maybeAbortAtom?.(), frame) ??
            null,
        },
        option,
      ).extend(
        withParams((value?: any) => toAbortError(value || `${option} abort`)),
        () =>
          ({
            throwIfAborted() {
              let error = this()
              if (error != null) throw error
            },
            subscribeAbort(cb) {
              return computed(() => {
                let state = this()
                if (state !== null) cb(state)
              }, `${this.name}._subscribeAbort`).subscribe()
            },
            getController() {
              let controller = Object.assign(new AbortController(), {
                unsubscribe() {
                  controller.signal.removeEventListener('abort', listener)
                  unsubscribeAtom()
                },
              })

              let listener = noop

              let unsubscribeAtom = computed(
                () => {
                  let error = this()
                  if (error) {
                    controller.abort(error)
                  }
                },
                named(`${this.name}._controller`),
              ).subscribe()

              if (controller.signal.aborted) unsubscribeAtom()
              else {
                listener = bind((error: any) => {
                  if (error !== this()) this.set(error)
                  controller.unsubscribe()
                })
                controller.signal.addEventListener('abort', listener)
              }

              return controller
            },
          }) satisfies AbortMethods,
      )
    }),
    {
      abort(reason?: any) {
        abortVar.find()?.set(reason)
      },
      throwIfAborted() {
        abortVar.find()?.throwIfAborted()
      },
      subscribeAbort(cb: (error: AbortError) => void) {
        return abortVar.find()?.subscribeAbort(cb)
      },
      getController() {
        return abortVar.find()?.getController()
      },
    },
  ))()

/**
 * This utility allow you to start a function which will NOT follow the async abort context.
 *
 * @example If you want to start a fetch when the atom gets a subscription,
 * but don't want to abort the fetch when the subscription is lost to save the data anyway.
 *
 * ```ts
 * const some = atom('...').extend(
 *   withConnectHook((target) => {
 *     spawn(async () => {
 *       // here `wrap` doesn't follow the connection abort
 *       const data = await wrap(api.getSome())
 *       some(data)
 *     })
 *   }),
 * )
 * ```
 */
export let spawn: GenericAction<
  <Params extends any[], Payload>(
    cb: (...params: Params) => Payload,
    ...params: Params
  ) => Payload
> = action((cb: Fn, ...params: any[]): ReturnType<Fn> => {
  let abort = abortVar.set('spawn')
  abort.set(new AbortController())
  return cb(...params)
}, 'spawn')
