import {
  _enqueue,
  _read,
  atom,
  bind,
  computed,
  type Frame,
  ReatomError,
  top,
} from './core'
import { type AbortSubscription, abortVar, variable } from './methods'
import { _getPrevFrame } from './methods/context'
import type { Unsubscribe } from './utils'

/**
 * Interface representing an abstract renderer for connecting Reatom with other
 * reactive systems. Provides methods to render content with given props and
 * manage the lifecycle through mounting.
 *
 * @template Props - The type of props/parameters that the renderer accepts
 * @template Result - The type of result produced by the render operation
 */
export interface AbstractRender<Props, Result> {
  /**
   * Renders content using the provided props
   *
   * @param {Props} props - The properties used for rendering
   * @returns {{ result: Result }} - Object containing the render result
   */
  render: (props: Props) => { result: Result }

  /**
   * Mounts the renderer, setting up subscriptions and event handling
   *
   * @returns {Unsubscribe} - Function to unmount and clean up resources
   */
  mount: () => Unsubscribe
}

/**
 * Creates a low-level renderer that connects Reatom with other reactive
 * systems. This function decorates computed rendering to prevent extra or
 * outdated rerenders, allowing a user render function to run only in the
 * context of the adapted reactive system.
 *
 * The renderer maintains proper reactivity by coordinating state updates
 * between Reatom's atom/computed system and the target rendering system.
 *
 * @example
 *   // Creating a React renderer
 *   const reactRenderer = reatomAbstractRender({
 *     frame,
 *     render: (props) => React.createElement(Component, props),
 *     rerender: ({ result }) => setElement(result),
 *     name: 'ReactRenderer',
 *   })
 *
 *   // Usage
 *   const unmount = reactRenderer.mount()
 *   reactRenderer.render({ prop1: 'value1' })
 *
 *   // Later cleanup
 *   unmount()
 *
 * @template Props - The type of props/parameters that the renderer accepts
 * @template Result - The type of result produced by the render operation
 * @param {Object} options - Configuration options for the abstract renderer
 * @param {Frame} options.frame - The Reatom frame/context in which the
 *   rendering occurs
 * @param {function} options.render - Function that renders content with the
 *   given props
 * @param {function} options.rerender - Function called when a rerender is
 *   needed
 * @param {function} [options.mount] - Optional function called when mounting
 *   the renderer
 * @param {string} options.name - Name identifier for debugging purposes
 * @returns {AbstractRender<Props, Result>} An object with render and mount
 *   methods
 */
export let reatomAbstractRender = <Props, Result>({
  frame,
  render: adapterRender,
  rerender,
  name,
  abortOnUnmount,
}: {
  frame: Frame
  render: (props: Props) => Result
  // Exclude for correct type inference
  rerender: (param: { result: Exclude<Result, never> }) => any
  name: string
  abortOnUnmount: boolean
}): AbstractRender<Props, Result> => {
  let renderer = new RenderAdapter(
    reatomRenderSubscription(frame, name, abortOnUnmount),
    adapterRender,
    rerender,
  )
  return {
    render: renderer.render.bind(renderer),
    mount: renderer.mount.bind(renderer),
  }
}

class RenderAdapter<Props, Result> {
  result!: Result

  constructor(
    private subscription: ReturnType<typeof reatomRenderSubscription>,
    private adapterRender: (props: Props) => Result,
    private rerender: (param: { result: Result }) => unknown,
  ) {}

  render(props: Props) {
    let failure: { error: unknown } | undefined
    this.subscription.render(() => {
      try {
        let render = this.adapterRender
        this.result = render({ ...props })
      } catch (error) {
        failure = { error: error ?? new ReatomError('Unknown error') }
      }
    })
    if (failure) throw failure.error
    return { result: this.result }
  }

  mount() {
    return this.subscription.mount(() => {
      let rerender = this.rerender
      rerender({ result: this.result })
    })
  }
}

let reatomRenderSubscription = (
  frame: Frame,
  name: string,
  abortOnUnmount: boolean,
) =>
  frame.run(() => {
    let rendering: undefined | (() => void)

    let changedVar = variable<boolean>()

    let _props = atom(0, `_${name}.props`)

    let abortSubscription: AbortSubscription

    let recheckAbort = (targetFrame: Frame) => {
      abortSubscription ??= abortVar.subscribe()
      // Related to react remounts of `StrictMode` and `Activity`.
      if (abortSubscription.controller.signal.aborted) {
        abortSubscription.unsubscribe()
        abortVar.set()
        abortSubscription = abortVar.subscribe()
      }

      // TODO: sure?
      abortSubscription.controller.spawned = true

      targetFrame['var#abort'] = abortSubscription.controller
    }

    let _render = computed((state = 0): number => {
      let frame = top()
      let pubs = _getPrevFrame(frame)?.pubs ?? [null]

      _enqueue(() => (pubs.length = 1), 'cleanup')

      _props()

      if (rendering) {
        recheckAbort(frame)
        rendering()

        return state + 1
      }

      changedVar.set(true)

      // do not drop subscriptions from the render
      for (
        // skip actualization pub and `_props`
        let i = 2;
        i < pubs.length;
        i++
      ) {
        pubs[i]!.atom()
      }

      return state + 1
    }, `_${name}`)

    let render = bind((callback: () => void) => {
      try {
        rendering = callback
        _props.set((version) => version + 1)
        _render()
      } finally {
        rendering = undefined
      }
    }, frame)

    let mount = bind((rerender: undefined | (() => void)) => {
      recheckAbort(_read(_render)!)

      let unsubscribe = _render.subscribe(() => {
        let deps = 0
        if (
          changedVar.find((changed) =>
            ++deps === 2 ? (changed ?? false) : changed,
          )
        ) {
          changedVar.set(false)
          rerender?.()
        }
      })

      return bind(() => {
        rerender = undefined
        unsubscribe()
        if (abortOnUnmount) {
          abortSubscription.controller.abort('unmount')
        } else {
          abortSubscription?.unsubscribe()
        }
      })
    }, frame)

    return { render, mount }
  })
