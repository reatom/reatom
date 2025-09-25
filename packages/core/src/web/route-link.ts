import { action, atom, computed, withParams } from '../core'
import { abortVar, effect, take, wrap } from '../methods'
import { withAbort, withMemo } from '../mixins'
import { noop, sleep, throwAbort } from '../utils'
import type { RouteAtom } from './route'

export type RouteLinkPreload = 'intent' | 'render' | 'viewport' | 'none'

export interface RouterLinkActiveOptions {
  exact?: boolean
}

export interface RouteLinkOptions {
  route: RouteAtom
  elementRef: Element
  preload?: RouteLinkPreload
  disabled?: boolean
  activeOptions?: RouterLinkActiveOptions
}

export const reatomRouteLink = (options: RouteLinkOptions, name: string) => {
  const { route } = options

  const createPreload = (type: RouteLinkPreload) => {
    if (type === 'intent') {
      const startIntent = action(async () => {
        if (disabled()) return

        await wrap(sleep(50))

        route.loader().catch(noop)
      }, `${name}._mouseEnter`).extend(withAbort())

      const cancelIntent = action(() => {
        if (!disabled()) startIntent.abort()
      }, `${name}._mouseLeave`)

      return {
        type,
        mouseEnter: startIntent,
        mouseLeave: cancelIntent,
        touchStart: startIntent,
        focus: startIntent,
        blur: cancelIntent,
      }
    } else if (type === 'render') {
      return {
        type,
        render: action(async () => {
          await wrap(take(disabled, (disabled) => !disabled || throwAbort()))
          route.loader().catch(noop)
        }).extend(withAbort()),
      }
    } else if (type === 'viewport') {
      effect(() => {
        if (disabled()) return

        const observer = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue

              route.loader().catch(noop)
              observer.disconnect()
            }
          },
          {
            rootMargin: '100px',
          },
        )

        observer.observe(elementRef())

        abortVar.subscribeAbort(observer.disconnect)
      }, `${name}._intersectionObserver`)

      return { type }
    } else return { type }
  }

  const preload = atom(
    createPreload(options.preload || 'none'),
    `${name}._preload`,
  ).extend(
    withParams((preload: RouteLinkPreload) => createPreload(preload)),
    withAbort(),
  )

  const elementRef = atom(options.elementRef, `${name}._elementRef`)
  const disabled = atom(options.disabled || false, `${name}._disabled`)

  const activeOptions = atom(
    options.activeOptions ?? {},
    `${name}._activeOptions`,
  ).extend(withMemo())

  const active = computed(() => {
    const { exact = false } = activeOptions()
    return exact ? route.exact() : route() !== null
  }, `${name}._active`)

  return {
    route,
    preload,
    disabled,
    elementRef,
    activeOptions,
    active,
  }
}
