import { type Plain, type Rec } from '../'
import type { Action, Atom, AtomState, Computed } from '../core'
import {
  _enqueue,
  action,
  atom,
  computed,
  named,
  STACK,
  top,
  withMiddleware,
  withParams,
} from '../core'
import { ifChanged, peek } from '../methods'
import { _getPrevFrame } from '../methods/context'
import type { AbortExt } from '../mixins'
import { withAbort, withChangeHook, withComputed, withInit } from '../mixins'
import { onEvent } from './onEvent'

type _PathParams<Path extends string = string> =
  Path extends `:${infer Param}/${infer Rest}`
    ? { [key in Param]: string } & _PathParams<Rest>
    : Path extends `:${infer Param}?`
      ? { [key in Param]?: string }
      : Path extends `:${infer Param}`
        ? { [key in Param]: string }
        : Path extends `${string}/${infer Rest}`
          ? _PathParams<Rest>
          : {}
type PathParams<Path extends string = string> = Plain<_PathParams<Path>>

export interface RouteAtom<Path extends string = string>
  extends Computed<null | PathParams<Path>> {
  go: Action<
    Path extends `${string}:${string}`
      ? [pathParams: PathParams<Path>, searchParams?: Rec, replace?: boolean]
      : [pathParams?: void, searchParams?: Rec, replace?: boolean],
    URL // Changed return type from void to URL
  >

  pattern: Path

  path: (
    params: Path extends `${string}:${string}` ? PathParams<Path> : void,
  ) => string

  exact: Computed<boolean>
}

const getPatternName = (part: string) => {
  const start = part.startsWith(':') ? 1 : 0
  const end = part.endsWith('?') ? -1 : undefined
  return start || end ? part.slice(start, end) : part
}

/**
 * URL atom interface that extends the base Atom type.
 */
export interface UrlAtom extends Atom<URL> {
  /**
   * Update the URL atom with a new URL.
   * @param url New URL to set
   * @param replace Whether to replace the current history entry
   */
  (url: URL, replace?: boolean): URL

  /**
   * Update the URL with a function that receives the current URL.
   * @param update Function that takes current URL and returns new URL
   * @param replace Whether to replace the current history entry
   */
  (update: (url: URL) => URL, replace?: boolean): URL

  /**
   * Navigate to a new path.
   * @param path The path to navigate to
   * @param replace Whether to replace the current history entry
   */
  go: (path: string, replace?: boolean) => URL

  /**
   * Create a computed atom that checks if the current path matches a given pattern.
   * @param path The path pattern to match against
   */
  match: (path: string) => Computed<boolean>

  /**
   * Whether to intercept link clicks for SPA navigation.
   * @default true
   */
  catchLinks: Atom<boolean>

  /**
   * This initialize DOM subscriptions and returns the current URL.
   * To prevent this action calling (in server on other environments without DOM),
   * just call `urlAtom` with your custom URL before it will be reded in other places.
   */
  init: Action<[], URL> & AbortExt

  /**
   * Synchronization callback to push URL state updates to the `history`.
   * Replace with `noop` to disable syncing.
   */
  sync: Atom<(url: URL, replace?: boolean) => void>

  /**
   * For integrations use: put the new URL from the the source of truth to `urlAtom`,
   * without syncing it back (calling callback in `sync` Atom).
   * @param url The URL from the source
   * @param replace Whether to replace the current history entry
   */
  syncFromSource: Action<[url: URL, replace?: boolean], URL>
  /**
   * Create a computed atom representing a specific route pattern.
   * @param pattern The route pattern (e.g., '/users/:userId')
   */
  route<Path extends string>(pattern: Path): RouteAtom<Path>
}

/**
 * Interface for the search parameters atom.
 */
export interface SearchParamsAtom extends Computed<Record<string, string>> {
  /**
   * Set a search parameter.
   * @param key Parameter name
   * @param value Parameter value
   * @param replace Whether to replace the current history entry
   */
  set: Action<[key: string, value: string, replace?: boolean], void>

  /**
   * Delete a search parameter.
   * @param key Parameter name to delete
   * @param replace Whether to replace the current history entry
   */
  del: Action<[key: string, replace?: boolean], void>

  /**
   * Create an atom that synchronizes with a specific search parameter.
   * @param key Parameter name
   * @param parse Function to parse parameter string value to desired type
   */
  lens<T = string>(key: string, parse?: (value?: string) => T): Atom<T>

  /**
   * Create an atom that synchronizes with a specific search parameter using advanced options.
   * @param key Parameter name
   * @param options Configuration options for the lens
   * @param options.parse Optional function to parse the parameter string value into the desired type
   * @param options.serialize Optional function to serialize the value back into a string
   * @param options.replace Optional boolean to specify if history entries should be replaced (default: false)
   * @param options.path Optional path to limit the scope of synchronization to specific URL paths
   * @param options.name Optional name of the created atom
   */
  lens<T = string>(
    key: string,
    options: {
      parse?: (value?: string) => T
      serialize?: (value: T) => undefined | string
      replace?: boolean
      path?: string
      name?: string
    },
  ): Atom<T>
}

/**
 * Create the URL atom with the new Reatom API.
 */
export let urlAtom: UrlAtom = /* @__PURE__ */ (() =>
  atom(null as any as URL, 'urlAtom')
    .extend(
      withMiddleware(
        () =>
          (next, ...params) =>
            next(...params) ?? urlAtom.init(),
      ),

      withParams((update: URL | ((state: URL) => URL), replace = false) => {
        let frame = top()

        let url = frame.state as null | URL
        let newUrl =
          typeof update === 'function' ? update(url ?? urlAtom.init()) : update

        // TODO check `href`, instead of instance?
        if (
          url !== newUrl &&
          STACK[STACK.length - 2]?.atom !== urlAtom.syncFromSource
        ) {
          urlAtom.sync()(newUrl, replace)
        }

        return newUrl
      }),

      () => ({
        catchLinks: atom(true, 'urlAtom.catchLinks'),

        init: action(() => {
          onEvent(window, 'popstate', () =>
            urlAtom.syncFromSource(new URL(window.location.href), true),
          )

          onEvent(window.document.body, 'click', (event) => {
            if (!urlAtom.catchLinks()) return

            let link: HTMLAnchorElement | null =
              event.target instanceof Element ? event.target.closest('a') : null

            if (
              link &&
              event.button === 0 && // Left mouse button
              link.target !== '_blank' && // Not for new tab
              link.origin === window.location.origin && // Not external link
              link.rel !== 'external' && // Not external link
              link.rel !== 'nofollow' && // Not for search engines only
              !link.download && // Not download link
              !event.altKey && // Not download link by user
              !event.metaKey && // Not open in new tab by user
              !event.ctrlKey && // Not open in new tab by user
              !event.shiftKey // Not open in new window by user
            ) {
              event.preventDefault()

              let { hash, href } = urlAtom.syncFromSource(new URL(link.href))
              history.pushState({}, '', href)

              if (window.location.hash !== hash) {
                _enqueue(() => {
                  window.location.hash = hash
                  if (href === '' || href === '#') {
                    window.dispatchEvent(new HashChangeEvent('hashchange'))
                  }
                }, 'effect')
              }
            }
          })

          return new URL(window.location.href)
        }, 'urlAtom.init').extend(withAbort()),

        sync: atom(
          () => (url: URL, replace?: boolean) => {
            // TODO why `setTimeout`?
            setTimeout(() => {
              if (replace) {
                history.replaceState({}, '', url.href)
              } else {
                history.pushState({}, '', url.href)
              }
            }, 0)
          },
          'urlAtom.sync',
        ),
      }),
    )

    .actions((target) => ({
      go(path: string, replace?: boolean) {
        return target.set((url) => new URL(path, url), replace)
      },

      match(path: string) {
        return computed(
          () => target().pathname.startsWith(path),
          `urlAtom.match[${path}]`,
        )
      },

      syncFromSource(url: URL, replace?: boolean) {
        return urlAtom(url, replace)
      },
      route: <Path extends string>(pattern: Path): RouteAtom<Path> => {
        const name = `urlAtom.route[${pattern}]`
        const patternPaths = pattern.split('/').slice(1)
        const patternPathsLength = patternPaths[
          patternPaths.length - 1
        ]?.endsWith('?')
          ? patternPaths.length - 1
          : patternPaths.length

        const pathFn = (
          params: Path extends `${string}:${string}` ? PathParams<Path> : void,
        ): string => {
          let path = ''
          const p = (params ?? {}) as Rec
          for (const part of patternPaths) {
            if (part.startsWith(':')) {
              const paramName = getPatternName(part)
              const isOptional = part.endsWith('?')
              if (paramName in p) {
                path += `/${p[paramName]}`
              } else if (!isOptional) {
                // TODO: Add better error handling/logging?
                console.error(
                  `Missing param "${paramName}" for route "${pattern}"`,
                )
                path += '/undefined' // Or throw?
              }
            } else {
              path += `/${part}`
            }
          }
          // Ensure root path ('/') is handled correctly when patternPaths is empty
          return path || '/'
        }

        const routeAtom = computed<null | PathParams<Path>>(() => {
          const currentUrl = target()
          const currentPathname = currentUrl.pathname
          // Handle root path explicitly
          if (pattern === '/') {
            // Root always matches as a prefix
            return {} as PathParams<Path>
          }

          const paths = currentPathname.slice(1).split('/')
          // Handle case where pathname is '/' -> paths is ['']
          if (
            paths.length === 1 &&
            paths[0] === '' &&
            patternPaths.length > 0
          ) {
            return null // Root URL ('/') cannot match non-root patterns
          }

          // Check if URL is potentially long enough for the non-optional part
          if (paths.length < patternPathsLength) return null

          const params = {} as Rec
          let i = 0 // Use i to track matched segments count
          for (; i < patternPaths.length; i++) {
            const part = patternPaths[i]!
            const paramName = getPatternName(part)
            const pathSegment = paths[i]
            const isOptional = part.endsWith('?')

            // If pathSegment is undefined (we ran out of URL segments)
            if (pathSegment === undefined) {
              if (isOptional) {
                // Optional segment missing, valid match up to this point
                break
              } else {
                // Required segment missing, no match
                return null
              }
            }

            if (part.startsWith(':')) {
              params[paramName] = pathSegment
            } else if (paramName !== pathSegment) {
              // Static segment mismatch
              return null
            }
          }

          // Check if we matched at least the required non-optional segments
          if (i < patternPathsLength) {
            return null
          }

          // If the loop finished, it means the pattern matches the start of the URL.
          // The `exact` atom handles the distinction between prefix and exact matches.
          // Return the collected params.

          return params as PathParams<Path>
        }, name)

        const exact = computed(() => {
          const params = routeAtom()
          if (!params) return false
          const currentPathname = target().pathname
          // Handle root explicitly
          if (pattern === '/') return currentPathname === '/'

          const paths = currentPathname.slice(1).split('/')
          // Handle case where pathname is '/' -> paths is ['']
          if (paths.length === 1 && paths[0] === '') return false // Root URL only matches '/' pattern exactly

          // Exact match requires the number of segments to match the pattern length
          // (considering optional segment)
          return (
            paths.length === patternPaths.length ||
            (paths.length === patternPathsLength &&
              patternPaths[patternPaths.length - 1]?.endsWith('?'))
          )
        }, `${name}.exact`)

        // Define go action with signature matching RouteAtom['go']
        const go = action(
          (
            ...args: Path extends `${string}:${string}`
              ? [
                  pathParams: PathParams<Path>,
                  searchParams?: Rec,
                  replace?: boolean,
                ]
              : [pathParams?: void, searchParams?: Rec, replace?: boolean]
          ) => {
            // Extract params, searchParams, replace based on args
            const [paramsOrVoid, searchParams = {}, replace = false] = args
            // Cast params for pathFn call (needed because of conditional type)
            const pathParams =
              paramsOrVoid as Path extends `${string}:${string}`
                ? PathParams<Path>
                : void
            const newPath = pathFn(pathParams)
            return target.set((url) => {
              const newUrl = new URL(newPath, url)
              Object.entries(searchParams).forEach(([key, value]) => {
                newUrl.searchParams.set(key, String(value))
              })
              return newUrl
            }, replace)
          },
          `${name}.go`,
        )

        // Augment the computed atom with methods
        return Object.assign(routeAtom, {
          go,
          path: pathFn,
          exact,
          pattern,
        }) as RouteAtom<Path>
      },
    })))()

const isSubpath = (currentPath: string, targetPath: string) =>
  !targetPath || targetPath[targetPath.length - 1] === '*'
    ? `${currentPath}/`.startsWith(targetPath.slice(0, -1))
    : `${currentPath}/` === targetPath

/**
 * Create an atom that represents search parameters from the URL.
 */
export const searchParamsAtom: SearchParamsAtom = /* @__PURE__ */ (() =>
  computed(() => Object.fromEntries(urlAtom().searchParams), 'searchParamsAtom')
    .extend((target) =>
      Object.assign(target, {
        set: action((key: string, value: string, replace = false) => {
          const url = urlAtom()
          const newUrl = new URL(url.href)
          newUrl.searchParams.set(key, value)
          urlAtom(newUrl, replace)
        }, 'searchParamsAtom.set'),
      }),
    )
    .actions(() => ({
      del: (key: string, replace = false) => {
        const url = urlAtom()
        const newUrl = new URL(url.href)
        newUrl.searchParams.delete(key)
        urlAtom(newUrl, replace)
      },
    }))
    .extend(
      () =>
        ({
          lens(key, options) {
            let { parse = () => '', name = named('searchParamsAtom') } =
              typeof options === 'function'
                ? { parse: options }
                : (options ?? {})

            return atom(parse(), name).extend(
              // @ts-expect-error
              withSearchParamsPersist(key, options),
            )
          },
        }) satisfies Pick<SearchParamsAtom, 'lens'>,
    ))()

/**
 * Create an atom that synchronizes with a URL search parameter.
 *
 * @param key The parameter name to synchronize with
 * @param parse Function to parse string value to desired type
 */
export function withSearchParamsPersist<T = string>(
  key: string,
  parse?: (value?: string) => T,
): <Target extends Atom<T>>(target: Target) => Target

/**
 * Create an atom that synchronizes with a URL search parameter.
 *
 * @param key Parameter name
 * @param options Configuration options for the lens
 * @param options.parse Optional function to parse the parameter string value into the desired type
 * @param options.serialize Optional function to serialize the value back into a string
 * @param options.replace Optional boolean to specify if history entries should be replaced (default: false)
 * @param options.path Optional path to limit the scope of synchronization to specific URL paths
 * @param options.name Optional name of the created atom
 */
export function withSearchParamsPersist<T = string>(
  key: string,
  options: {
    parse?: (value?: string) => T
    serialize?: (value: T) => undefined | string
    replace?: boolean
    path?: string
  },
): <Target extends Atom<T>>(target: Target) => Target

export function withSearchParamsPersist<T = string>(
  key: string,
  options?:
    | ((value?: string) => T)
    | {
        parse?: (value?: string) => T
        serialize?: (value: T) => undefined | string
        replace?: boolean
        path?: string
      },
) {
  let {
    parse = (value = '') => value as unknown as T,
    serialize = (value: T) => String(value) as string,
    replace = false,
    path = '',
  } = typeof options === 'function' ? { parse: options } : (options ?? {})

  // Normalize path ending
  const pathEnd = path[path.length - 1]
  if (path && pathEnd !== '/' && pathEnd !== '*') {
    path += '/'
  }

  return <Target extends Atom<T>>(target: Target): Target =>
    target.extend(
      withInit((state) => {
        const currentPath = urlAtom().pathname
        const sp = searchParamsAtom()

        return key in sp && isSubpath(currentPath, path)
          ? (parse(sp[key]) as AtomState<Target>)
          : state
      }),
      withComputed((state) => {
        let currentPath = peek(urlAtom).pathname
        let pubs = _getPrevFrame()?.pubs
        let { initState } = target.__reatom

        ifChanged(searchParamsAtom, (next, prev) => {
          // init, already parsed in `withInit`
          if (!prev) return

          let prevSearchParamsFrame = pubs![1]!
          let prevUrlFrame = prevSearchParamsFrame.pubs[1]!
          const prevUrl = prevUrlFrame.state as URL

          if (!isSubpath(currentPath, path)) {
            if (key in prev && isSubpath(prevUrl.pathname, path)) {
              state = typeof initState === 'function' ? initState() : initState
            }
            return
          }

          if (key in next) {
            if (next[key] !== prev[key])
              state = parse(next[key]) as AtomState<Target>
          } else {
            if (path === '' && currentPath !== prevUrl.pathname) {
              state = typeof initState === 'function' ? initState() : initState
              return
            }

            const prevState = serialize(state)
            if (prevState !== undefined) {
              _enqueue(() => {
                searchParamsAtom.set(key, prevState, true)
              }, 'hook')
            }
          }
        })

        return state
      }, false),
      withChangeHook((state) => {
        let frame = top()
        let prevFrame = _getPrevFrame(frame)
        if (
          // process only the last update
          frame === frame.root.store.get(target) &&
          // process only mutation or computed update
          frame.pubs[1]?.state === prevFrame?.pubs[1]?.state &&
          isSubpath(urlAtom().pathname, path)
        ) {
          const value = serialize(state)
          const sp = searchParamsAtom()
          if (value === undefined) {
            if (key in sp) searchParamsAtom.del(key, replace)
          } else if (sp[key] !== value) {
            searchParamsAtom.set(key, value, replace)
          }
        }
        target()
      }),
    )
}
