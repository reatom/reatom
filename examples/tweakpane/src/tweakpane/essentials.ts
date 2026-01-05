import { type AtomLike } from '@reatom/core'
import type { BaseInputParams } from '@tweakpane/core'
import type { FpsGraphBladeApi } from '@tweakpane/plugin-essentials/dist/types/fps-graph/api/fps-graph'
import type { BaseBladeParams } from 'tweakpane'

import { withBinding } from './bindings'
import { withBlade } from './blades'
import { type BladeRackApi, reatomDisposable,rootPane } from './core'

export type RadioGridParams = {
  groupName: string
  size: [number, number]
  cells: (x: number, y: number) => { title: string; value: unknown }
  label: string
} & BaseInputParams

/**
 * Creates a 2D grid of radio buttons.
 *
 * @param params - Grid configuration (group name, size, cells, etc.)
 * @param parent - Parent blade rack
 */
export const withRadioGrid = <T>(
  params: RadioGridParams,
  parent: AtomLike<BladeRackApi> = rootPane,
) => withBinding<T>({ view: 'radiogrid', ...params }, parent)

export type ButtonGridParams = {
  size: [number, number]
  cells: (x: number, y: number) => { title: string; [key: string]: any }
  label: string
} & BaseBladeParams

/**
 * Creates a 2D grid of buttons.
 *
 * @param params - Grid configuration
 * @param parent - Parent blade rack
 */
export const withButtonGrid = (
  params: ButtonGridParams,
  parent: AtomLike<BladeRackApi> = rootPane,
) => withBlade({ view: 'buttongrid', ...params }, parent)

export type CubicBezierParams = {
  expanded?: boolean
  picker?: 'inline' | 'popup'
  label?: string
} & BaseBladeParams

/**
 * Creates a cubic bezier curve editor.
 *
 * @param params - Editor configuration
 * @param parent - Parent blade rack
 */
export const withCubicBezier = (
  params: CubicBezierParams,
  parent: AtomLike<BladeRackApi> = rootPane,
) => withBlade({ view: 'cubicbezier', ...params, value: [0, 0, 1, 1] }, parent)

export type FpsGraphParams = {
  rows?: number
  max?: number
  min?: number
  interval?: number
  label?: string
} & BaseBladeParams

/**
 * Creates a performance monitoring graph.
 *
 * @param params - Graph configuration
 * @param parent - Parent blade rack
 */
/**
 * Creates a performance monitoring graph.
 *
 * @param params - Graph configuration
 * @param parent - Parent blade rack
 */
export const reatomFpsGraph = (
  params: FpsGraphParams,
  parent: AtomLike<BladeRackApi> = rootPane,
) =>
  reatomDisposable(
    () =>
      parent().addBlade({
        view: 'fpsgraph',
        ...params,
      }) as unknown as FpsGraphBladeApi,
    `${parent.name}.fpsGraph`,
  )
