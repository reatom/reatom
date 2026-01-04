import {
  type Action,
  type AtomLike,
  computed,
  isAction,
  isWritableAtom,
  withConnectHook,
  wrap,
} from '@reatom/core'
import type { BladeApi } from '@tweakpane/core'
import type { BaseBladeParams, ButtonParams } from 'tweakpane'

import {
  type BladeRackApi,
  type Disposable,
  rootPane,
  withDisposable,
} from './core'

/**
 * Extends an action to be triggered by a Tweakpane button.
 *
 * NOTE: You must subscribe to the action (e.g., using `getCalls` in an effect)
 * to ensure the binding is created and active.
 *
 * @example
 *   const doThing = action(() => ...).extend(
 *   withButton({ title: 'Do Thing' })
 *   )
 *   // Required to activate the binding:
 *   effect(() => getCalls(doThing))
 *
 * @param params - Button configuration
 * @param parent - Parent blade rack
 */
export const withButton =
  (params: ButtonParams, parent: AtomLike<BladeRackApi> = rootPane) =>
  <T extends Action>(target: T) => {
    const buttonAtom = computed(() => {
      const btnApi = parent().addButton(params)
      btnApi.on('click', wrap(target))
      return btnApi
    }, `${parent.name}.${target.name}.button`).extend(withDisposable())

    target.extend(withConnectHook(() => buttonAtom.subscribe()))

    return { button: buttonAtom }
  }

/**
 * Generic extension to add any Tweakpane blade.
 *
 * @param params - Blade definition
 * @param parent - Parent blade rack
 */
export const withBlade =
  <Api extends Disposable = BladeApi>(
    params: BaseBladeParams,
    parent: AtomLike<BladeRackApi> = rootPane,
  ) =>
  <T extends AtomLike<any> | Action<any>>(target: T) => {
    const bladeAtom = computed(() => {
      const parentApi = parent()
      const bladeApi = parentApi.addBlade(params) as any

      if (isAction(target)) {
        bladeApi.on('click', wrap(target))
      } else if (isWritableAtom(target)) {
        bladeApi.on(
          'change',
          wrap((ev: any) => target.set(ev.value)),
        )
      }

      return bladeApi as Api
    }, `${parent.name}.${target.name}.blade`).extend(withDisposable())

    target.extend(withConnectHook(() => bladeAtom.subscribe()))

    return { blade: bladeAtom }
  }
