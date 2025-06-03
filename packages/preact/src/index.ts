import type {
  Frame,
  Rec} from '@reatom/core';
import {
  action,
  assert,
  named,
  reatomAbstractRender,
  ReatomError,
  STACK,
  wrap,
} from '@reatom/core'
import type { ComponentChild } from 'preact'
import { createContext } from 'preact'
import {
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'preact/hooks'

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
  // name?: string,
): ((...params: Params) => Payload) => {
  let frame = useFrame()

  let ref: {
    stableFn: (...args: Params) => Payload
    callback: (...args: Params) => Payload
  } = useMemo(
    () => ({
      callback,
      stableFn: wrap(
        action(
          (...params: Params) => ref.callback(...params),
          // TODO
          // getComponentDebugName(name),
        ),
        frame,
      ),
    }),
    [],
  )

  useLayoutEffect(() => {
    ref.callback = callback
  })

  return ref.stableFn
}

export let isSuspense = (thing: unknown) =>
  thing instanceof Promise ||
  (thing instanceof Error && thing.message.startsWith('Suspense Exception'))

export let reatomComponent = <Props extends Rec>(
  Component: (props: Props) => ComponentChild,
  name?: string,
): ((props: Props) => ComponentChild) => {
  name ||= Component.name || named('Component')

  return {
    [name](props: Props): ComponentChild {
      let frame = useFrame()

      let [, rerender] = useState({ result: null as ComponentChild })

      let { render, mount } = useMemo(
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

      useEffect(mount, [mount])

      let { result } = render(props)
      if (isSuspense(result)) throw result
      return result
    },
  }[name]!
}

export let reatomFactoryComponent = <Props extends Rec>(
  init: (initProps: Props) => (props: Props) => ComponentChild,
  name?: string,
): ((props: Props) => ComponentChild) =>
  reatomComponent((props) => useMemo(() => init(props), [])(props), name)
