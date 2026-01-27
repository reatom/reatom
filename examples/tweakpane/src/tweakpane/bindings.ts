import {
  type Atom,
  type AtomLike,
  type EnumAtom,
  type Frame,
  top,
  withChangeHook,
  withConnectHook,
  wrap,
} from '@reatom/core'
import type { Formatter } from '@tweakpane/core'
import type { BindingParams, ListParamsOptions } from 'tweakpane'

import { type BladeRackApi, reatomDisposable, rootPane } from './core'

const isEnumAtom = (target: Atom<unknown>): target is EnumAtom<string> =>
  'enum' in target && typeof target.enum === 'object' && target.enum !== null

const toBindingObject = <T>(target: Atom<T>, frame: Frame) => ({
  get value() {
    return frame.run(target)
  },
  set value(v: T) {
    frame.run(target.set, v)
  },
})

/**
 * Extends an atom with a two-way binding to a Tweakpane control.
 *
 * Automatically detects `atom.enum` property to create dropdown lists.
 *
 * This relies on Tweakpane's internal matching algorithms to determine the view
 * type (color, point, number, string, boolean, etc) based on the atom's initial
 * value.
 *
 * @example
 *   const speed = atom(0.5).extend(
 *     withBinding({ label: 'Speed', min: 0, max: 1 }),
 *   )
 *
 * @param bindingParams - Tweakpane binding configuration
 * @param parent - The parent blade rack (defaults to rootPane)
 */
export const withBinding =
  <T>(
    bindingParams: Omit<BindingParams, 'options' | 'format'> & {
      options?: ListParamsOptions<T>
      format?: Formatter<T>
    },
    parent: AtomLike<BladeRackApi> = rootPane,
  ) =>
  (target: Atom<T>) => {
    // Auto-detect enum atoms and generate options
    const params: BindingParams = isEnumAtom(target)
      ? { options: target.enum, ...bindingParams }
      : bindingParams

    const bindingAtom = reatomDisposable(() => {
      const parentApi = parent()

      const bindingObject = toBindingObject(target, top().root.frame)
      const bindingApi = parentApi.addBinding(bindingObject, 'value', params)
      bindingApi.on(
        'change',
        wrap(({ value }) => {
          // tweakpane mutates properties of binding object
          // so we need to create a new object in order to trigger reatom update
          if (typeof value === 'object') {
            target.set({ ...value })
          }
        }),
      )
      return bindingApi
    }, `${parent.name}.${target.name}.binding`)

    target.extend(
      withConnectHook(() => bindingAtom.subscribe()),
      withChangeHook(() => void bindingAtom().refresh()),
    )

    return { binding: bindingAtom }
  }
