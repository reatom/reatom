import { action, atom, computed, named, withParams } from '../core'
import { abortVar, effect, take, wrap } from '../methods'
import { withAbort, withMemo } from '../mixins'
import { reatomBoolean, reatomRecord } from '../primitives'
import { noop, sleep, throwAbort } from '../utils'
import { type RouteLoader } from './route'
import { urlAtom } from './url'

export type RouteLinkPreload = 'intent' | 'render' | 'viewport' | 'none'

export interface RouterLinkActiveOptions {
  exact?: boolean
  includeSearch?: boolean
}

interface RouterLikeAtom<Params> {
  path: (params: Params) => string
  loader: RouteLoader<any>
}

export interface RouteLinkOptions<Params, RouteAtom extends RouterLikeAtom<Params>> {
  route: RouteAtom
  params: Params
  elementRef: Element
  preload?: RouteLinkPreload
  disabled?: boolean
  activeOptions?: RouterLinkActiveOptions
}

export const reatomRouteLink = <
  Params,
  RouteAtom extends RouterLikeAtom<Params>
>(
  options: RouteLinkOptions<Params, RouteAtom>,
  name = named('routeLink'),
) => {
  const { route } = options

  const createPreload = (type: RouteLinkPreload) => {
    if (type === 'intent') {
      const startIntent = action(async () => {
        if (disabled()) return

        await wrap(sleep(50))

        if (!disabled()) route.loader().catch(noop)
      }, `${name}._startIntent`).extend(withAbort())

      const cancelIntent = action(() => {
        if (!disabled()) startIntent.abort()
      }, `${name}._cancelIntent`)

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

  const params = atom(options.params, `${name}._params`)
  const elementRef = atom(options.elementRef, `${name}._elementRef`)
  const disabled = reatomBoolean(options.disabled || false, `${name}._disabled`)

  const activeOptions = reatomRecord(
    options.activeOptions ?? {},
    `${name}._activeOptions`,
  ).extend(withMemo())

  const active = computed(() => {
    const currentUrl = urlAtom()
    const targetUrl = new URL(route.path(params()), currentUrl)
    const { exact = false, includeSearch = false } = activeOptions()

    const currentPathname = stripTrailingSlash(targetUrl.pathname)
    const targetPathname = stripTrailingSlash(currentUrl.pathname)

    if (exact) {
      if (currentPathname !== targetPathname) {
        return false
      }
    } else {
      if (
        !currentPathname.startsWith(targetPathname) ||
        !(
          currentPathname.length === targetPathname.length ||
          currentPathname[targetPathname.length] === '/'
        )
      )
        return false
    }

    if (includeSearch) {
      for (const [key, value] of targetUrl.searchParams.entries()) {
        const paramEqual = currentUrl.searchParams.get(key) !== value

        if (exact) {
          if (!paramEqual) return false
        } else {
          if (paramEqual) return true
        }
      }
    }

    return true
  }, `${name}._active`)

  return {
    route,
    preload,
    disabled,
    elementRef,
    params,
    activeOptions,
    active,
  }
}

const stripTrailingSlash = (str: string) =>
  str.endsWith('/') && str !== '/' ? str.slice(0, -1) : str
