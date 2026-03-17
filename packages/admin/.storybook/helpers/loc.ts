import type { JSX } from '@reatom/jsx'
import { within as withinElement } from 'storybook/test'

export type Canvas = ReturnType<typeof withinElement>

export type Locator = (
  canvas: Canvas,
) => HTMLElement | null | Promise<HTMLElement | null>
export type DefiniteLocator = (
  canvas: Canvas,
) => HTMLElement | Promise<HTMLElement>
export type ArrayLocator = (
  canvas: Canvas,
) => Array<HTMLElement> | Promise<Array<HTMLElement>>
export type AnyLocator = Locator | DefiniteLocator | ArrayLocator

export type WithinScope = HTMLElement | DefiniteLocator | 'global'

type NameOption = string | RegExp

export type ByRoleOptions = NonNullable<Parameters<Canvas['getByRole']>[1]>
export type ByTextOptions = NonNullable<Parameters<Canvas['getByText']>[1]>

type OptsMap = {
  role: ByRoleOptions
  text: ByTextOptions
}

export interface BaseFluentLocator {
  within(element: WithinScope): this
  __within?: WithinScope
  // TODO: can we make it type safe?
  options(opts: any): this
}

export interface FluentWaitAllLocator extends BaseFluentLocator {
  (canvas: Canvas): Promise<HTMLElement[]>
}

export interface FluentWaitLocator extends BaseFluentLocator {
  (canvas: Canvas): Promise<HTMLElement>
  all(): FluentWaitAllLocator
}

export interface FluentAllLocator extends BaseFluentLocator {
  (canvas: Canvas): HTMLElement[]
  wait(): FluentWaitAllLocator
}

export interface FluentMaybeLocator extends BaseFluentLocator {
  (canvas: Canvas): HTMLElement | null
  wait(): never
  all(): never
}

export interface FluentLocator extends BaseFluentLocator {
  (canvas: Canvas): HTMLElement
  wait(): FluentWaitLocator
  maybe(): FluentMaybeLocator
  all(): FluentAllLocator
}

type QueryType = 'role' | 'text'

type Modifiers = {
  isWait?: boolean
  isMaybe?: boolean
  isAll?: boolean
  options?: any
  scope?: WithinScope
}

function createFluentLocator<T extends QueryType>(
  type: T,
  arg1: any,
  initialOptions?: OptsMap[T],
  mods: Modifiers = {},
): any {
  const locator = (canvas: Canvas) => {
    if (mods.isMaybe && mods.isWait) {
      throw new Error('Cannot call .wait() after .maybe()')
    }

    const mergedOptions = { ...initialOptions, ...mods.options }

    let prefix = 'get'
    if (mods.isWait) prefix = 'find'
    else if (mods.isMaybe) prefix = 'query'

    const methodTarget = mods.isAll ? `${prefix}AllBy` : `${prefix}By`

    const methodName =
      `${methodTarget}${type === 'role' ? 'Role' : 'Text'}` as keyof Canvas

    const fn = canvas[methodName] as Function
    return fn.call(
      canvas,
      arg1,
      Object.keys(mergedOptions).length > 0 ? mergedOptions : undefined,
    )
  }

  locator.__within = mods.scope

  locator.within = (scope: WithinScope) =>
    createFluentLocator(type, arg1, initialOptions, { ...mods, scope })

  locator.wait = () => {
    if (mods.isMaybe) throw new Error('Cannot call .wait() after .maybe()')
    return createFluentLocator(type, arg1, initialOptions, {
      ...mods,
      isWait: true,
    })
  }

  locator.maybe = () =>
    createFluentLocator(type, arg1, initialOptions, { ...mods, isMaybe: true })

  locator.all = () =>
    createFluentLocator(type, arg1, initialOptions, { ...mods, isAll: true })

  locator.options = (opts: OptsMap[T]) =>
    createFluentLocator(type, arg1, initialOptions, {
      ...mods,
      options: { ...mods.options, ...opts },
    })

  return locator
}

export const role = (
  role: JSX.Element['role'] | (string & {}),
  name?: NameOption,
) =>
  createFluentLocator(
    'role',
    role,
    name ? { name } : undefined,
  ) as FluentLocator

export const text = (value: NameOption) =>
  createFluentLocator('text', value) as FluentLocator

export const heading = (name?: NameOption) => role('heading', name)
export const button = (name?: NameOption) => role('button', name)
export const link = (name?: NameOption) => role('link', name)
