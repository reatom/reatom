import {
  getReatomGlobal,
  type ReatomGlobalPackage,
  ReatomError,
  type Rec,
} from '@reatom/core'
import { type ComponentChildren, options } from 'preact'

import { reatomComponent } from './reatomComponent'

type AutoTrackedComponent = (props: Rec) => ComponentChildren

const REATOM_PREACT_VERSION = '1000.0.0'

interface ReatomPreactAutoGlobalState {
  trackedComponents: WeakMap<AutoTrackedComponent, AutoTrackedComponent>
}

declare global {
  interface ReatomGlobalPackages {
    '@reatom/preact/installAutoTracking': ReatomGlobalPackage<ReatomPreactAutoGlobalState>
  }
}

let reatomGlobal = getReatomGlobal()
let reatomPreactAutoPackage =
  reatomGlobal.packages['@reatom/preact/installAutoTracking']
if (reatomPreactAutoPackage === undefined) {
  reatomPreactAutoPackage = reatomGlobal.packages[
    '@reatom/preact/installAutoTracking'
  ] = {
    version: REATOM_PREACT_VERSION,
    state: { trackedComponents: new WeakMap() },
  }
} else if (reatomPreactAutoPackage.version !== REATOM_PREACT_VERSION) {
  throw new ReatomError('package duplication')
}
let reatomPreactAutoGlobal = reatomPreactAutoPackage.state

let hasMethod = (value: unknown, methodName: string): boolean =>
  typeof value === 'object' &&
  value !== null &&
  typeof Reflect.get(value, methodName) === 'function'

let isClassLikeComponent = (value: unknown): boolean =>
  hasMethod(value, 'render') ||
  hasMethod(value, 'getChildContext') ||
  hasMethod(value, 'componentDidMount') ||
  hasMethod(value, 'componentWillUnmount') ||
  hasMethod(value, 'shouldComponentUpdate')

let isPreactContextProvider = (value: unknown): boolean =>
  typeof value === 'function' &&
  Reflect.has(value, '__c') &&
  Reflect.has(value, 'Consumer') &&
  Reflect.has(value, 'Provider')

let isPreactRender = (value: unknown): value is AutoTrackedComponent =>
  typeof value === 'function' &&
  !isPreactContextProvider(value) &&
  !isClassLikeComponent(Reflect.get(value, 'prototype'))

export const installAutoTracking = () => {
  const { vnode } = options

  options.vnode = (node) => {
    let type = node.type
    if (isPreactRender(type)) {
      let trackedComponent = reatomPreactAutoGlobal.trackedComponents.get(type)
      if (!trackedComponent) {
        trackedComponent = reatomComponent(type)
        reatomPreactAutoGlobal.trackedComponents.set(type, trackedComponent)
      }
      node.type = trackedComponent
    }
    vnode?.(node)
  }

  // options.event = (e) => {
  //   const dom = e.currentTarget as any
  //   const vnode = dom._children

  //   // reatomContext._id is something like "__cC0"
  //   const contextId = (reatomContext as any)._id
  //   let frame: Frame | null = null

  //   // Traverse up to find a component with _globalContext
  //   let current = vnode
  //   while (current) {
  //     const component = current._component
  //     if (component?._globalContext) {
  //       const provider = component._globalContext[contextId]
  //       if (provider) {
  //         // Now you have the Frame!
  //         const frame = provider.props.value
  //         if (frame) {
  //           STACK.push(frame)
  //           queueMicrotask(() => STACK.pop())
  //         }
  //         break
  //       }
  //     }
  //     current = current._parent
  //   }

  //   return event?.(e) ?? e
  // }

  // options.requestAnimationFrame = (cb) => {
  //   requestAnimationFrame?.(cb)
  // }
}
