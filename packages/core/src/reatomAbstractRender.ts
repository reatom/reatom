import { _enqueue, _read, atom, bind, computed, type Frame, top } from './core'
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
  let session: RenderSession<Props, Result> = { render: null, rerender: null }
  let owner: RenderOwner<Props, Result> = {
    render: adapterRender,
    rerender,
    rendered: null,
    session,
    graph: reatomRenderGraph(frame, name, abortOnUnmount, session),
  }
  // Bound functions keep the owner out of closure contexts which a minifier
  // could merge with the graph callbacks, so frames never reach it.
  return {
    render: (ownerRender<Props, Result>).bind(null, owner),
    mount: (ownerMount<Props, Result>).bind(null, owner),
  }
}

/**
 * Adapter values which the reactive graph can reach. They are armed by the
 * owner and wiped by the scheduled cleanup after unmount.
 */
interface RenderSession<Props, Result> {
  render: null | ((props: Props) => Result)
  rerender: null | (() => void)
}

/** Renderer-owned state, retained only by the adapter holding the renderer. */
interface RenderOwner<Props, Result> {
  render: (props: Props) => Result
  rerender: (param: { result: Result }) => unknown
  rendered: null | { result: Result }
  session: RenderSession<Props, Result>
  graph: RenderGraph<Props, Result>
}

type RenderGraph<Props, Result> = ReturnType<
  typeof reatomRenderGraph<Props, Result>
>

function ownerRender<Props, Result>(
  owner: RenderOwner<Props, Result>,
  props: Props,
): { result: Result } {
  owner.session.render = owner.render
  let { result } = owner.graph.render(props)
  owner.rendered = { result }
  return owner.rendered
}

function ownerRerender<Props, Result>(owner: RenderOwner<Props, Result>) {
  let { rerender, rendered } = owner
  if (rendered) rerender(rendered)
}

function ownerMount<Props, Result>(
  owner: RenderOwner<Props, Result>,
): Unsubscribe {
  owner.session.render = owner.render
  owner.session.rerender = (ownerRerender<Props, Result>).bind(null, owner)
  return owner.graph.mount()
}

let reatomRenderGraph = <Props, Result>(
  frame: Frame,
  name: string,
  abortOnUnmount: boolean,
  session: RenderSession<Props, Result>,
) =>
  frame.run(() => {
    let rendering = false

    let mounts = 0

    let cleanupVersion = 0

    let dataFrames = new Set<Frame>()

    let changedVar = variable<boolean>()

    let _props = atom({} as Props, `_${name}.props`)

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

    let _render = computed((state?: { result: Result }): { result: Result } => {
      let frame = top()
      let pubs = _getPrevFrame(frame)?.pubs ?? [null]

      _enqueue(() => (pubs.length = 1), 'cleanup')

      let props = _props()

      if (rendering) {
        recheckAbort(frame)

        let adapterRender = session.render!
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
    }, `_${name}`)

    let getCurrentDataFrames = () =>
      [_read(_render), _read(_props)].filter((dataFrame) => !!dataFrame)

    // Causal links (`pubs[0]`) of long-lived atoms written during a render keep
    // these frames reachable, so their props, result and error are wiped.
    let releaseDataFrame = (dataFrame: Frame) => {
      dataFrame.state = undefined
      dataFrame.error = null
    }

    // Frames are copied by renders, reads and subscriptions, and the copies
    // may be captured by subscription closures or abort reasons stacks.
    let rememberDataFrames = () => {
      for (let dataFrame of getCurrentDataFrames()) dataFrames.add(dataFrame)
    }

    let releaseStaleDataFrames = () => {
      let currentDataFrames = getCurrentDataFrames()
      for (let dataFrame of dataFrames) {
        if (!currentDataFrames.includes(dataFrame)) releaseDataFrame(dataFrame)
      }
      dataFrames = new Set(currentDataFrames)
    }

    let release = () => {
      session.render = null
      session.rerender = null
      rememberDataFrames()
      dataFrames.forEach(releaseDataFrame)
      dataFrames.clear()
    }

    // Scheduled instead of immediate to survive synchronous remounts
    // (`StrictMode`, `Activity`); a mount in between cancels it.
    let scheduleCleanup = () => {
      let scheduledVersion = ++cleanupVersion
      _enqueue(() => {
        let isCancelled = scheduledVersion !== cleanupVersion || mounts !== 0
        if (!isCancelled) release()
      }, 'cleanup')
    }

    let render = bind((props: Props) => {
      try {
        rendering = true
        _props.set({ ...props })
        return _render()
      } finally {
        rendering = false
        releaseStaleDataFrames()
        // an abandoned render never gets an unmount
        if (mounts === 0) scheduleCleanup()
      }
    }, frame) as (props: Props) => { result: Result }

    let mount = bind(() => {
      mounts++
      cleanupVersion++

      recheckAbort(_read(_render)!)

      let unsubscribe = _render.subscribe(() => {
        rememberDataFrames()
        let deps = 0
        if (
          changedVar.find((changed) =>
            ++deps === 2 ? (changed ?? false) : changed,
          )
        ) {
          changedVar.set(false)
          session.rerender?.()
        }
      })

      rememberDataFrames()

      let isUnmounted = false

      return bind(() => {
        if (isUnmounted) return
        isUnmounted = true
        mounts--
        rememberDataFrames()
        unsubscribe()
        if (abortOnUnmount) {
          abortSubscription.controller.abort('unmount')
        } else {
          abortSubscription?.unsubscribe()
        }
        if (mounts === 0) scheduleCleanup()
      })
    }, frame)

    return { render, mount }
  })
