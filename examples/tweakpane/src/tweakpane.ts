import {
  type Action,
  type Atom,
  type AtomLike,
  bind,
  type Computed,
  computed,
  type Frame,
  isAction,
  isWritableAtom,
  retryComputed,
  top,
  withChangeHook,
  withConnectHook,
  wrap,
} from '@reatom/core'
import type {
  BaseParams,
  BladeApi,
  Controller,
  EventListenable,
  RackApi,
  TabPageApi,
  TpChangeEvent,
  TpMouseEvent,
} from '@tweakpane/core'
import * as EssentialsPlugin from '@tweakpane/plugin-essentials'
import type { FolderApi } from 'tweakpane'
import {
  type BaseBladeParams,
  type BindingParams,
  type ButtonParams,
  type FolderParams,
  Pane,
  type TabParams,
} from 'tweakpane'

// types that may work as containers for other blades
type BladeRackApi = FolderApi | RackApi | TabPageApi

type Disposable = { dispose: () => void; controller: Controller }

const withDisposable = <T extends Disposable>() =>
  withConnectHook((target: Computed<T>) => {
    if (target().controller.viewProps.get('disposed')) {
      retryComputed(target)
    }
    return () => target().dispose()
  })

type PaneConfig = ConstructorParameters<typeof Pane>[0]
export const reatomPane = (params: PaneConfig & { name: string }) =>
  computed(() => {
    const pane = new Pane(params)
    pane.registerPlugin(EssentialsPlugin)
    return pane
  }, `tweakpane.pane.${params.name}`).extend(withDisposable())

export const rootPane = reatomPane({ name: 'rootPane' })

export const reatomPaneFolder = (
  params: FolderParams,
  parent: AtomLike<BladeRackApi> = rootPane,
) =>
  computed(
    () => parent().addFolder(params),
    `${parent.name}.${params.title}`,
  ).extend(withDisposable())

export const reatomPaneTab = (
  params: TabParams,
  parent: AtomLike<BladeRackApi> = rootPane,
) =>
  computed(() => parent().addTab(params), `${parent.name}.tabs`) //
    .extend(withDisposable(), (target) => ({
      pages: params.pages.map((_, i) =>
        computed(() => target().pages[i], `${target.name}.page.${i}`) //
          .extend(withDisposable()),
      ),
    }))

export const reatomPaneSeparator = (
  params: BaseParams,
  parent: AtomLike<BladeRackApi> = rootPane,
) =>
  computed(
    () => parent().addBlade({ view: 'separator', ...params }),
    `${parent.name}.separator`,
  ).extend(withDisposable())

const toBindingObject = <T>(target: Atom<T>, ctx: Frame) => ({
  get value() {
    return bind(() => target(), ctx)()
  },
  set value(v: T) {
    bind(() => target.set(v), ctx)()
  },
})

export const withBinding =
  <T>(
    bindingParams: BindingParams,
    parent: AtomLike<BladeRackApi> = rootPane,
  ) =>
  (target: Atom<T>) => {
    const bindingAtom = computed(() => {
      const parentApi = parent()

      const bindingObject = toBindingObject(target, top().root.frame)
      const bindingApi = parentApi.addBinding(
        bindingObject,
        'value',
        bindingParams,
      )
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
    }, `${parent.name}.${target.name}.binding`).extend(withDisposable())

    target.extend(
      withConnectHook(() => bindingAtom.subscribe()),
      withChangeHook(() => void bindingAtom().refresh()),
    )

    return { binding: bindingAtom }
  }

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

type BladeEvents = EventListenable<{
  click: TpMouseEvent<unknown>
  change: TpChangeEvent<unknown>
}>

export const withBlade =
  (params: BaseBladeParams, parent: AtomLike<BladeRackApi> = rootPane) =>
  <T extends AtomLike<any> | Action<[TpChangeEvent<unknown>]>>(target: T) => {
    const bladeAtom = computed(() => {
      const parentApi = parent()
      const bladeApi = parentApi.addBlade(params) as BladeApi & BladeEvents

      if (isAction(target)) {
        bladeApi.on('click', wrap(target))
      } else if (isWritableAtom(target)) {
        bladeApi.on(
          'change',
          wrap((ev) => target.set(ev.value)),
        )
      }

      return bladeApi
    }, `${parent.name}.${target.name}.blade`).extend(withDisposable())

    target.extend(withConnectHook(() => bladeAtom.subscribe()))

    return { blade: bladeAtom }
  }
