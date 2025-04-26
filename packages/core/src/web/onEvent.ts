import { abortVar, wrap } from '../methods'
import { Fn, Unsubscribe } from '../utils'

export type EventOfTarget<Target extends EventTarget, Type extends string> =
  Target extends Record<`on${Type}`, infer Cb>
    ? // @ts-expect-error `Cb extends Fn` broke the inference for some reason
      Parameters<Cb>[0] // correct type
    : Target extends Record<'onEvent', (type: Type, cb: infer Cb) => any>
      ? // @ts-expect-error `Cb extends Fn` broke the inference for some reason
        Parameters<Cb>[0] // general type
      : never

// @ts-ignore
export const onEvent: {
  <
    Target extends EventTarget,
    Type extends Target extends Record<`on${infer Type}`, Fn> ? Type : string,
  >(
    target: Target,
    type: Type,
  ): Promise<EventOfTarget<Target, Type>>
  <Event>(target: EventTarget, type: string): Promise<Event>
  <
    Target extends EventTarget,
    Type extends Target extends Record<`on${infer Type}`, Fn> ? Type : string,
  >(
    target: Target,
    type: Type,
    cb: (value: EventOfTarget<Target, Type>) => any,
    options?: AddEventListenerOptions,
  ): Unsubscribe
  <Event>(
    target: EventTarget,
    type: string,
    cb: (value: Event) => any,
    options?: AddEventListenerOptions,
  ): Unsubscribe
} = (target: EventTarget, type: string, listener: Fn) => {
  if (!listener) {
    return new Promise((resolve) => {
      let un = onEvent(target, type, (event) => {
        un()
        resolve(event)
      })
    })
  }

  listener = wrap(listener)

  let un = () => {
    target.removeEventListener(type, listener)
    unAbort?.()
  }

  target.addEventListener(type, listener)

  let unAbort = abortVar.read()?.subscribeAbort(un)

  return un
}

// export const withEvent: {
//   <
//     A extends AtomMut,
//     Type extends Target extends Record<`on${infer Type}`, Fn> ? Type : string,
//     Target extends EventTarget,
//   >(
//     type: Type,
//     target: Target,
//     map: (
//
//       event: EventOfTarget<Target, Type>,
//       state: AtomState<A>,
//     ) => AtomState<A>,
//   ): (anAtom: A) => A
// } = (type, target, map) => (anAtom) => {
//   onConnect(anAtom, () =>
//     onEvent(target, type, (event) => {
//       // @ts-expect-error
//       anAtom((state) => map(event, state))
//     }),
//   )
//   return anAtom
// }

// export const reatomEvent: {
//   <
//     Type extends Target extends Record<`on${infer Type}`, Fn> ? Type : string,
//     Target extends EventTarget = Window,
//   >(
//     type: Type,
//     target?: Target,
//     filter?: (event: EventOfTarget<Target, Type>) => boolean,
//   ): Action<[EventOfTarget<Target, Type>], EventOfTarget<Target, Type>>
// } = (type, target, filter = () => true) => {
//   const event = action(`event.${type}`)
//   onConnect(event, () =>
//     onEvent(target ?? window, type, (e) => {
//       if (filter(e)) event(e)
//     }),
//   )
//   return event
// }
