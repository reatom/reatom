import {
  action,
  assert,
  bind,
  type Fn,
  type Frame,
  named,
  notify,
  reatomAbstractRender,
  ReatomError,
  type Rec,
  STACK,
  withAbort,
  wrap,
} from '@reatom/core'
import React, { useEffect } from 'react'

// https://github.com/webpack/webpack/issues/12960#issuecomment-1086272918
let {
  __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: oldInternals,
  __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE: newInternals,
} = React as any

/** @private */
export let _getComponentDebugName = (fallback?: string): string => {
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
  options?:
    | string
    | {
        deps?: Array<string>
        name?: string
        abortOnUnmount?: boolean
      },
): ((props: Props) => React.ReactNode) => {
  let deps: Array<string> = []
  let name: string | undefined
  let abortOnUnmount: boolean = false
  if (typeof options === 'object') {
    deps = options.deps ?? []
    name = options.name
    abortOnUnmount = options.abortOnUnmount ?? false
  } else {
    name = options
  }
  name ||= named('Component', Component.name)

  function render(props: Props): React.ReactNode {
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
          rerender,
          name: name!,
          abortOnUnmount,
        }),
      [frame, ...deps.map((dep) => props[dep])],
    )

    React.useEffect(mount, [mount, ...deps.map((dep) => props[dep])])

    let { result } = render(props)
    if (isSuspense(result)) {
      // @ts-ignore it's ok
      if (React.use && result instanceof Promise) React.use(result)
      throw result
    }
    return result
  }

  Object.defineProperty(render, 'name', { value: name })

  return render
}

export let reatomFactoryComponent = <Props extends Rec = {}>(
  init: (
    initProps: Props,
    options: { name: string },
  ) => (props: Props) => React.ReactNode,
  options?: string | { deps?: Array<string>; name?: string },
): ((props: Props) => React.ReactNode) => {
  const deps = typeof options === 'object' ? (options.deps ?? []) : []
  const name = typeof options === 'object' ? options.name : options

  const Component: Fn = reatomComponent(
    (props: Props) => {
      const { abort, render } = React.useMemo(
        () => {
          const initAction = action(init, `${Component.name}._init`).extend(
            withAbort(),
          )

          return {
            abort: bind(initAction.abort),
            render: initAction(props, { name: Component.name }),
          }
        },
        deps.map((dep) => props[dep]),
      )

      useEffect(() => abort, [])

      return render(props)
    },
    { deps, name, abortOnUnmount: false },
  )

  return Component
}
