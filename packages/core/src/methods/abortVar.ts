import { bind, type Frame, top } from '../core'
import type { AbortError, Unsubscribe } from '../utils'
import { isAbort, throwIfAborted, toAbortError } from '../utils'
import { Variable } from './variable'

/**
 * Version of abort controller with explicit name for better debugging.
 *
 * May control variable propagation by setting the `spawned` flag (used
 * internally to handle abort boundaries).
 *
 * @param name - The name of the abort controller
 * @param spawned - Whether to traverse the frame tree beyond the current frame
 *   (default: `false`)
 */
export class ReatomAbortController extends AbortController {
  constructor(
    public name: string,
    public spawned: boolean = false,
  ) {
    super()
  }
  override abort(reason?: any) {
    super.abort(
      isAbort(reason) ? reason : toAbortError(`${this.name} ${String(reason)}`),
    )
  }
}

export interface AbortSubscription {
  controller: ReatomAbortController
  unsubscribe: Unsubscribe
  [Symbol.dispose]: Unsubscribe
  [Symbol.asyncDispose]: Unsubscribe
  /**
   * Controller that managed the subscribtion itself, mostly for internal usage.
   *
   * @private
   */
  listenerController: AbortController
}

export class AbortVariable extends Variable<
  ReatomAbortController,
  [AbortController?]
> {
  protected override _findReactiveStartIndex = 1

  override find<Result = ReatomAbortController>(
    cb?: (payload: undefined | ReatomAbortController) => undefined | Result,
    frame?: Frame,
  ): undefined | Result {
    let result: undefined | Result

    super.find((controller) => {
      result = cb?.(controller)
      return result !== undefined || controller?.spawned ? true : undefined
    }, frame)

    return result
  }

  constructor() {
    super({
      name: 'abort',
      create: (controller) => {
        let namedController = new ReatomAbortController(top().atom.name)
        return controller instanceof ReatomAbortController
          ? controller
          : controller instanceof AbortController
            ? Object.assign(controller, {
                name: namedController.name,
                abort: namedController.abort,
                spawned: false,
              })
            : namedController
      },
    })
  }

  /**
   * Subscribes to abortion events from parent context tree (including current
   * frame).
   *
   * Creates a subscription that listens for abort signals from any parent
   * AbortController in the context tree. When an abort occurs, the callback is
   * invoked with the abort error and the subscription automatically cleans up.
   *
   * It is IMPORTANT to clean up the subscription when it is no longer needed,
   * otherwise a memory leak will occur. You can use the `unsubscribe` function
   * returned by this method or `using` statement.
   *
   * @example
   *   const myResource = computed(async () => {
   *     const { controller, unsubscribe } = abortVar.subscribe()
   *     const { signal } = controller
   *
   *     try {
   *       const response = await fetch('/api/my-resource', { signal })
   *       return await response.json()
   *     } finally {
   *       unsubscribe()
   *     }
   *   }).extend(withAsyncData())
   *
   * @example
   *   const myResource = computed(async () => {
   *   using { controller } = abortVar.subscribe()
   *   const { signal } = controller
   *
   *   const response = await fetch('/api/my-resource', { signal })
   *   return await response.json()
   *   }).extend(withAsyncData())
   *
   * @param {(error: AbortError) => void} cb - Callback invoked when abortion
   *   occurs
   * @returns {Object} Subscription object
   * @returns {AbortController} Controller - The AbortController for the current
   *   context
   * @returns {Function} Unsubscribe - Function to unsubscribe from abort events
   */
  subscribe(cb?: (error: AbortError) => void): AbortSubscription {
    let frame = top()
    let controller = frame['var#abort'] ?? this.set()

    let listenerController = new AbortController()

    let unsubscribe = () => listenerController.abort()

    let listener = bind(function listener(signal: AbortSignal) {
      unsubscribe()
      controller.abort(signal.reason)
      cb?.(signal.reason)
    }, frame)

    this.find((parentController) => {
      if (parentController?.signal.aborted) {
        listener(parentController.signal)
        // console.log(
        //   new Error('ATTENTION, throw during abortVar subscribe find'),
        // )
        throw controller.signal.reason
      }

      parentController?.signal.addEventListener(
        'abort',
        (event) => {
          listener(event.target as AbortSignal)
        },
        listenerController,
      )

      /* return nothing to continue the traverse */
    })

    return {
      controller,
      unsubscribe,
      [Symbol.dispose]: unsubscribe,
      [Symbol.asyncDispose]: unsubscribe,
      listenerController,
    }
  }

  /**
   * NOTE: this method already used in `wrap`, that you should use in your code
   * instead.
   *
   * Throws if any AbortController in the parent context (frame) tree, including
   * the current frame, is aborted.
   *
   * @throws {AbortError}
   */
  throwIfAborted() {
    this.find(throwIfAborted)
  }
}

/**
 * Global abort variable that precess AbortController's coupled to the current
 * frame stack.
 *
 * The abortVar is computed from all other abort atoms in the current frame
 * tree, which allows for propagation of abortion signals through the
 * computation hierarchy. This is a critical component for cancellation handling
 * in Reatom's async operations.
 *
 * @example
 *   // Trigger abortion of the current frame
 *   abortVar.abortCurrent('Operation cancelled')
 *
 * @example
 *   // Trigger abortion of the current frame stack
 *   abortVar.get()?.abort('Operation cancelled')
 *
 * @example
 *   // Check if current operation (the whole frame stack) is aborted
 *   abortVar.throwIfAborted()
 *   // continue operation...
 *
 * @example
 *   // Get AbortController for fetch API
 *   const { controller, unsubscribe } = abortVar.subscribe()
 *   await fetch('/api/data', { signal: controller.signal })
 *   unsubscribe()
 *
 * @type {AbortVariable}
 */
export let abortVar = /* @__PURE__ */ (() => new AbortVariable())()

/** @deprecated Use `abortVar.spawn` instead */
export let spawn: AbortVariable['spawn'] = /* @__PURE__ */ (() =>
  abortVar.spawn)()
