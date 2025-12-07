import {
  action,
  assert,
  type Frame,
  named,
  notify,
  reatomAbstractRender,
  ReatomError,
  type Rec,
  STACK,
  top,
  wrap,
} from '@reatom/core'
import type { ComponentChildren, ComponentClass } from 'preact'
import { Component, createContext } from 'preact'
import { useContext, useEffect, useMemo } from 'preact/hooks'

export let _getComponentDebugName = (fallback?: string): string => {
  let name = fallback
  return name || named('Component')
}

export let reatomContext = createContext<null | Frame>(null)

export let useFrame = (): Frame => {
  let frame = useContext(reatomContext) ?? STACK[0]

  assert(
    frame,
    'the root is not set, you probably forgot to specify the  provider',
    ReatomError,
  )

  return frame
}

export const useWrap = <Params extends any[], Payload>(
  callback: (...params: Params) => Payload,
  name?: string,
): ((...params: Params) => Payload) => {
  let frame = useFrame()

  let ref: {
    stableFn: (...args: Params) => Payload
    callback: (...args: Params) => Payload
  } = useMemo(
    () => ({
      callback,
      stableFn: wrap(
        action((...params) => {
          try {
            return ref.callback(...params)
          } finally {
            notify()
          }
        }, _getComponentDebugName(name)),
        frame,
      ),
    }),
    [],
  )

  useEffect(() => {
    ref.callback = callback
  })

  return ref.stableFn
}

export let isSuspense = (thing: unknown) =>
  thing instanceof Promise ||
  (thing instanceof Error && thing.message.startsWith('Suspense Exception'))

export let reatomComponent = <Props extends Rec = {}>(
  UserComponent: (props: Props) => ComponentChildren,
  name?: string,
): ComponentClass<Props> => {
  name ||= named('Component', UserComponent.name)

  return class ReatomComponent extends Component<Props> {
    static override displayName = name
    static override contextType = reatomContext

    _render!: (props: Props) => { result: ComponentChildren }
    _unmount!: () => void

    constructor(props: Props) {
      super(props)

      let frame = this.context ?? STACK[0]

      assert(
        frame,
        'the root is not set, you probably forgot to specify the provider',
        ReatomError,
      )

      let { render, mount } = reatomAbstractRender({
        frame,
        render: (props: Props) => {
          try {
            return UserComponent(props)
          } catch (error) {
            if (isSuspense(error)) {
              return error as never
            }
            throw error
          }
        },
        rerender: () => this.forceUpdate(),
        name: name!,
      })

      this._render = render
      this._unmount = mount()
    }

    override componentWillUnmount() {
      this._unmount()
    }

    override render() {
      let { result } = this._render(this.props)
      if (isSuspense(result)) throw result
      return result
    }
  }
}

export let reatomFactoryComponent = <Props extends Rec = {}>(
  init: (initProps: Props) => (props: Props) => ComponentChildren,
  name?: string,
): ComponentClass<Props> => {
  name ||= named('Component', (init as { name?: string }).name)

  return class ReatomFactoryComponent extends Component<Props> {
    static override displayName = name
    static override contextType = reatomContext

    _render!: (props: Props) => { result: ComponentChildren }
    _unmount!: () => void
    _userRender: ((props: Props) => ComponentChildren) | null = null

    constructor(props: Props) {
      super(props)

      let frame = this.context ?? STACK[0]

      assert(
        frame,
        'the root is not set, you probably forgot to specify the provider',
        ReatomError,
      )

      let { render, mount } = reatomAbstractRender({
        frame,
        render: (props: Props) => {
          try {
            if (!this._userRender) {
              let currentFrame = top()
              try {
                // @ts-expect-error internals
                currentFrame.atom.__reatom.linking = false
                this._userRender = init(props)
              } finally {
                // @ts-expect-error internals
                currentFrame.atom.__reatom.linking = true
              }
            }
            return this._userRender(props)
          } catch (error) {
            if (isSuspense(error)) {
              return error as never
            }
            throw error
          }
        },
        rerender: () => this.forceUpdate(),
        name: name!,
      })

      this._render = render
      this._unmount = mount()
    }

    override componentWillUnmount() {
      this._unmount()
    }

    override render() {
      let { result } = this._render(this.props)
      if (isSuspense(result)) throw result
      return result
    }
  }
}
