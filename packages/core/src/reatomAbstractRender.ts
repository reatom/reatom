import { _enqueue, atom, bind, computed, type Frame } from './core'
import type { AbortAtom } from './methods'
import { abortVar, peek, variable, wrap } from './methods'
import { _getPrevFrame } from './methods/context'
import type { Unsubscribe } from './utils'
import { toAbortError } from './utils'

/**
 * Interface representing an abstract renderer for connecting Reatom with other reactive systems.
 * Provides methods to render content with given props and manage the lifecycle through mounting.
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
 * Creates a low-level renderer that connects Reatom with other reactive systems.
 * This function decorates computed rendering to prevent extra or outdated rerenders,
 * allowing a user render function to run only in the context of the adapted reactive system.
 *
 * The renderer maintains proper reactivity by coordinating state updates between
 * Reatom's atom/computed system and the target rendering system.
 *
 * @template Props - The type of props/parameters that the renderer accepts
 * @template Result - The type of result produced by the render operation
 *
 * @param {Object} options - Configuration options for the abstract renderer
 * @param {Frame} options.frame - The Reatom frame/context in which the rendering occurs
 * @param {function} options.render - Function that renders content with the given props
 * @param {function} options.rerender - Function called when a rerender is needed
 * @param {function} [options.mount] - Optional function called when mounting the renderer
 * @param {string} options.name - Name identifier for debugging purposes
 *
 * @returns {AbstractRender<Props, Result>} An object with render and mount methods
 *
 * @example
 * // Creating a React renderer
 * const reactRenderer = reatomAbstractRender({
 *   frame: ctx,
 *   render: (props) => React.createElement(Component, props),
 *   rerender: ({ result }) => setElement(result),
 *   name: 'ReactRenderer'
 * });
 *
 * // Usage
 * const unmount = reactRenderer.mount();
 * reactRenderer.render({ prop1: 'value1' });
 *
 * // Later cleanup
 * unmount();
 */
export let reatomAbstractRender = <Props, Result>({
  frame,
  render: adapterRender,
  rerender,
  mount: adapterMount,
  name,
}: {
  frame: Frame
  render: (props: Props) => Result
  // Exclude for correct type inference
  rerender: (param: { result: Exclude<Result, never> }) => any
  mount?: () => void
  name: string
}): AbstractRender<Props, Result> =>
  frame.run(() => {
    let rendering = false

    let changedVar = variable<boolean>()

    let _props = atom({} as Props, `${name}._props`)

    let abortAtom: AbortAtom

    let _render = computed((state?: { result: Result }): { result: Result } => {
      let pubs = _getPrevFrame()?.pubs ?? [null]

      _enqueue(() => (pubs.length = 1), 'cleanup')

      let props = _props()

      if (rendering) {
        abortAtom = abortVar.set(abortAtom ?? `${name}._abort`)
        // Related to react remounts of `StrictMode` and `Activity`.
        if (peek(abortAtom) !== null) {
          abortAtom.set(null)
        }

        return { result: adapterRender(props) }
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

      return { result: state?.result as Result }
    }, `${name}._render`)

    let render = bind((props: Props) => {
      try {
        rendering = true
        _props.set({ ...props })
        return _render()
      } finally {
        rendering = false
      }
    }, frame) as (props: Props) => { result: Result }

    let mount = wrap(() => {
      adapterMount?.()
      let unsubscribe = _render.subscribe((state) => {
        let deps = 0
        if (
          changedVar.find((changed) =>
            ++deps === 2 ? (changed ?? false) : changed,
          )
        ) {
          changedVar.set(false)
          rerender(state)
        }
      })

      return wrap(() => {
        unsubscribe()
        abortAtom.set(toAbortError('unmount ' + name))
      })
    }, frame)

    return { render, mount }
  })
