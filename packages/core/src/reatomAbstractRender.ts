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

type Produced<Result> = { result: Result }

type RenderProducer<Props, Result> = (
  props: Props,
) => undefined | Produced<Result>

/**
 * Creates a low-level renderer that connects Reatom with other reactive
 * systems. This function decorates computed rendering to prevent extra or
 * outdated rerenders, allowing a user render function to run only in the
 * context of the adapted reactive system.
 *
 * The renderer maintains proper reactivity by coordinating state updates
 * between Reatom's atom/computed system and the target rendering system.
 *
 * Props and rendered values written into renderer frames are cleared on the
 * cleanup queue after unmount, and after a render that never mounts. A
 * render-time write can keep those frames reachable from a long-lived atom, so
 * the frames must not be what keeps the UI alive. The latest result stays with
 * the caller for as long as the caller holds this renderer, which keeps
 * remounts (including delayed ones) working.
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
  render: renderCallback,
  rerender: rerenderCallback,
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
  // Caller-owned. Renderer frames must not be the long-term owner of these
  // values: a causal link from a render-time write would keep them forever.
  let storedResult: undefined | Produced<Result>
  let subscription = createAbstractRenderSubscription<Props, Result>({
    frame,
    name,
    abortOnUnmount,
  })

  return {
    render(props: Props) {
      let failure: { error: unknown } | undefined
      let produced: undefined | Produced<Result>
      subscription.render(props, (snapshot) => {
        try {
          let render = renderCallback
          produced = { result: render(snapshot) }
        } catch (error) {
          failure = { error: error ?? new ReatomError('Unknown error') }
        }
        return produced
      })
      if (failure) throw failure.error
      if (!produced) {
        if (storedResult) return storedResult
        throw new ReatomError('Missing render result')
      }
      storedResult = { result: produced.result }
      return storedResult
    },
    mount() {
      return subscription.mount(() => {
        if (!storedResult) return
        let rerender = rerenderCallback
        rerender(storedResult)
      })
    },
  }
}

/**
 * Frame subscription for {@link reatomAbstractRender}.
 *
 * Kept separate so adapter callbacks and the cached result are not closed over
 * by the computed that a causal write can retain.
 */
let createAbstractRenderSubscription = <Props, Result>({
  frame,
  name,
  abortOnUnmount,
}: {
  frame: Frame
  name: string
  abortOnUnmount: boolean
}) =>
  frame.run(() => {
    let mounted = false
    let rendering: undefined | RenderProducer<Props, Result>
    let onRerender: undefined | (() => void)
    let renderFrames: Array<Frame> = []
    let propsFrames: Array<Frame> = []
    let propsStates: Array<object> = []
    // `_copy` shares `frame.state` by reference. Replacing `frame.state` on the
    // frame we still hold leaves every older copy, including the one a
    // render-time write keeps as its cause, pointing at the previous object.
    let resultShells: Array<Produced<undefined | Result>> = []

    let changedVar = variable<boolean>()

    let _props = atom({} as Props, `_${name}.props`)

    let abortSubscription: AbortSubscription

    let rememberPropsState = (state: unknown) => {
      if (state !== null && typeof state === 'object') propsStates.push(state)
    }

    let blankPropsFrame = (propsFrame: Frame) => {
      rememberPropsState(propsFrame.state)
      propsFrame.error = null
      propsFrame.state = {}
    }

    let trackRenderFrame = (renderFrame: Frame) => {
      renderFrames.push(renderFrame)
    }

    let trackPropsFrame = (propsFrame: undefined | Frame) => {
      if (!propsFrame) return
      rememberPropsState(propsFrame.state)
      propsFrames.push(propsFrame)
    }

    let clearPropsState = (state: object) => {
      for (let key of Object.keys(state)) Reflect.deleteProperty(state, key)
    }

    let retainResult = (
      result: undefined | Result,
    ): Produced<undefined | Result> => {
      let shell: Produced<undefined | Result> = { result }
      resultShells.push(shell)
      return shell
    }

    let previousResult = (
      state: undefined | Produced<undefined | Result>,
    ): undefined | Result => state?.result

    /**
     * Drops props, results, and errors left on renderer frames after the UI is
     * gone. Skipped when a remount wins the race against this cleanup tick.
     */
    let releaseRenderData = () => {
      if (mounted) return

      rendering = undefined
      onRerender = undefined

      for (let shell of resultShells) shell.result = undefined
      resultShells = []

      for (let renderFrame of renderFrames) {
        renderFrame.error = null
        let pubs = renderFrame.pubs
        for (let i = 0; i < pubs.length; i++) {
          let pub = pubs[i]
          if (pub?.atom === _props) blankPropsFrame(pub)
        }
      }
      renderFrames = []

      let currentRenderFrame = _read(_render)
      if (currentRenderFrame) currentRenderFrame.error = null

      for (let propsFrame of propsFrames) blankPropsFrame(propsFrame)
      propsFrames = []

      let currentPropsFrame = _read(_props)
      if (currentPropsFrame) {
        blankPropsFrame(currentPropsFrame)
        let previousPropsFrame = _getPrevFrame(currentPropsFrame)
        if (previousPropsFrame) blankPropsFrame(previousPropsFrame)
      }

      for (let propsState of propsStates) clearPropsState(propsState)
      propsStates = []
    }

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

    let _render = computed(
      (state?: Produced<undefined | Result>): Produced<undefined | Result> => {
        let renderFrame = top()
        let previousRenderFrame = _getPrevFrame(renderFrame)
        let pubs = previousRenderFrame?.pubs ?? [null]

        trackRenderFrame(renderFrame)

        _enqueue(() => (pubs.length = 1), 'cleanup')

        let props = _props()
        trackPropsFrame(_read(_props))

        if (rendering) {
          recheckAbort(renderFrame)

          let produce = rendering
          let produced = produce(props)
          if (produced) return retainResult(produced.result)
        } else {
          changedVar.set(true)
        }

        // do not drop subscriptions from the render
        for (
          // skip actualization pub and `_props`
          let i = 2;
          i < pubs.length;
          i++
        ) {
          pubs[i]!.atom()
        }

        return retainResult(previousResult(state))
      },
      `_${name}`,
    )

    let render = bind(
      (props: Props, produce: RenderProducer<Props, Result>) => {
        try {
          rendering = produce
          let propsState = { ...props }
          rememberPropsState(propsState)
          _props.set(propsState)
          trackPropsFrame(_read(_props))
          return _render()
        } finally {
          rendering = undefined
          if (!mounted) _enqueue(releaseRenderData, 'cleanup')
        }
      },
      frame,
    )

    let mount = bind((rerender: () => void) => {
      mounted = true
      onRerender = rerender

      recheckAbort(_read(_render)!)

      let unsubscribe = _render.subscribe(() => {
        let deps = 0
        if (
          changedVar.find((changed) =>
            ++deps === 2 ? (changed ?? false) : changed,
          )
        ) {
          changedVar.set(false)
          onRerender?.()
        }
      })

      return bind(() => {
        mounted = false
        onRerender = undefined
        unsubscribe()
        _enqueue(releaseRenderData, 'cleanup')
        if (abortOnUnmount) {
          abortSubscription.controller.abort('unmount')
        } else {
          abortSubscription?.unsubscribe()
        }
      }, frame)
    }, frame)

    return { render, mount }
  })
