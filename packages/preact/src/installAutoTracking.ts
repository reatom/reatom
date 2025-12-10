import { type ComponentClass, type ComponentType, options } from 'preact'

import { reatomComponent } from './reatomComponent'

export const installAutoTracking = () => {
  const { vnode } = options

  options.vnode = (node) => {
    let type = node.type as (ComponentType<any> | ComponentClass<any>) & {
      reatomComponent?: ComponentClass<any>
    }
    if (typeof type === 'function' && !type.reatomComponent) {
      node.type = type.reatomComponent = reatomComponent(type)
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
