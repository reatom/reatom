import React from 'react'
import {
  assert,
  type Frame,
  named,
  ReatomError,
  reatomAbstractRender,
  type Rec,
  STACK,
  wrap,
  action,
  top,
} from '@reatom/core'

// https://github.com/webpack/webpack/issues/12960#issuecomment-1086272918
let {
  __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: oldInternals,
  __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE: newInternals,
} = React as any

export let getComponentDebugName = (fallback?: string): string => {
  let Component =
    oldInternals?.ReactCurrentOwner?.current?.type ??
    newInternals?.A?.getOwner?.()?.type

  let name = (Component?.displayName ?? Component?.name) || fallback
  return name || named('Component')
}

export let reatomContext = React.createContext<null | Frame>(null)

export let useFrame = (): Frame => {
  let frame = React.useContext(reatomContext) ?? STACK[0]

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
  } = React.useMemo(
    () => ({
      callback,
      stableFn: wrap(
        action(
          (...params) => ref.callback(...params),
          getComponentDebugName(name),
        ),
        frame,
      ),
    }),
    [],
  )

  ;(
    React.useInsertionEffect ??
    (typeof document !== 'undefined' ? React.useLayoutEffect : React.useEffect)
  )(() => {
    ref.callback = callback
  })

  return ref.stableFn
}

export let isSuspense = (thing: unknown) =>
  thing instanceof Promise ||
  (thing instanceof Error && thing.message.startsWith('Suspense Exception'))

export let reatomComponent = <Props extends Rec = {}>(
  Component: (props: Props) => React.ReactNode,
  name?: string,
): ((props: Props) => React.ReactNode) => {
  name ||= Component.name || named('Component')

  return {
    [name](props: Props): React.ReactNode {
      let frame = useFrame()

      let [, rerender] = React.useState({ result: null as React.ReactNode })

      let { render, mount } = React.useMemo(
        () =>
          reatomAbstractRender({
            frame,
            render(props: Props) {
              try {
                return Component(props)
              } catch (error) {
                if (isSuspense(error)) {
                  return error as never
                }
                throw error
              }
            },
            // mount() {
            //   // reset abort in case if remount (StrictMode and so on) appears
            //   abortVar.read()?.(null)
            // },
            rerender,
            name,
          }),
        [frame],
      )

      React.useEffect(mount, [mount])

      let { result } = render(props)
      if (isSuspense(result)) throw result
      return result
    },
  }[name]!
}

export let reatomFactoryComponent = <Props extends Rec = {}>(
  init: (initProps: Props) => (props: Props) => React.ReactNode,
  name?: string,
): ((props: Props) => React.ReactNode) =>
  reatomComponent(
    (props) =>
      React.useMemo(() => {
        const frame = top()
        try {
          // @ts-expect-error internals
          frame.atom.__reatom.linking = false
          return init(props)
        } finally {
          // @ts-expect-error internals
          frame.atom.__reatom.linking = true
        }
      }, [])(props),
    name,
  )
