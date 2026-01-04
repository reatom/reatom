import {
  type AtomLike,
  type Computed,
  computed,
  retryComputed,
  withConnectHook,
} from '@reatom/core'
import type {
  BaseParams,
  Controller,
  FolderApi,
  RackApi,
  TabPageApi,
} from '@tweakpane/core'
import * as EssentialsPlugin from '@tweakpane/plugin-essentials'
import { type FolderParams, Pane, type TabParams } from 'tweakpane'

// types that may work as containers for other blades
export type BladeRackApi = FolderApi | RackApi | TabPageApi

export type Disposable = { dispose: () => void; controller: Controller }

/**
 * Helper extension to invoke the `dispose` method of a Tweakpane controller
 * when the computed atom is recomputed or unmounted.
 */
export const withDisposable = <T extends Disposable>() =>
  withConnectHook((target: Computed<T>) => {
    if (target().controller.viewProps.get('disposed')) {
      retryComputed(target)
    }
    return () => target().dispose()
  })

export type PaneConfig = ConstructorParameters<typeof Pane>[0]

/**
 * Creates a reactive Tweakpane instance.
 *
 * This atom manages the lifecycle of the Pane: creating it on connection and
 * disposing it when the atom is no longer subscribed to.
 *
 * @param params - Configuration options for the Pane
 * @param params.name - Unique debugging name for the atom
 */
export const reatomPane = (params: PaneConfig & { name: string }) =>
  computed(() => {
    const pane = new Pane(params)
    pane.registerPlugin(EssentialsPlugin)
    return pane
  }, `tweakpane.pane.${params.name}`).extend(withDisposable())

/** Global default Tweakpane instance */
export const rootPane = reatomPane({ name: 'rootPane' })

/**
 * Creates a reactive folder associated with a parent blade rack.
 *
 * @param params - Folder configuration (title, expanded, etc.)
 * @param parent - The parent atom (defaults to rootPane)
 */
export const reatomPaneFolder = (
  params: FolderParams,
  parent: AtomLike<BladeRackApi> = rootPane,
) =>
  computed(
    () => parent().addFolder(params),
    `${parent.name}.${params.title}`,
  ).extend(withDisposable())

/**
 * Creates a tab interface with multiple pages.
 *
 * @example
 *   const tabs = reatomPaneTab(['General', 'Advanced'])
 *   // Access pages via the .pages extension
 *   const generalPage = tabs.pages[0]
 *
 * @param params - Tab configuration or simple array of page titles
 * @param parent - The parent atom (defaults to rootPane)
 */
export const reatomPaneTab = (
  params:
    | string[]
    | (Omit<TabParams, 'pages'> & { pages: string[] | TabParams['pages'] }),
  parent: AtomLike<BladeRackApi> = rootPane,
) => {
  const normalizedParams: TabParams = Array.isArray(params)
    ? { pages: params.map((title) => ({ title })) }
    : {
        ...params,
        pages: params.pages.map((p) =>
          typeof p === 'string' ? { title: p } : p,
        ),
      }
  return computed(
    () => parent().addTab(normalizedParams),
    `${parent.name}.tabs`,
  ).extend(withDisposable(), (target) => ({
    pages: normalizedParams.pages.map((_, i) =>
      computed(() => target().pages[i], `${target.name}.page.${i}`).extend(
        withDisposable(),
      ),
    ),
  }))
}

/**
 * Adds a visual separator to organize controls.
 *
 * @param params - Separator configuration
 * @param parent - The parent atom (defaults to rootPane)
 */
export const reatomPaneSeparator = (
  params: BaseParams,
  parent: AtomLike<BladeRackApi> = rootPane,
) =>
  computed(
    () => parent().addBlade({ view: 'separator', ...params }),
    `${parent.name}.separator`,
  ).extend(withDisposable())
