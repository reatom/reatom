import type { StandardSchemaV1 } from '@standard-schema/spec'

import {
  abortVar,
  identity,
  isDeepEqual,
  noop,
  type Rec,
  withAsyncData,
  wrap,
} from '../'
import type { Action, Atom } from '../core'
import {
  action,
  atom,
  computed,
  named,
  ReatomError,
  withMiddleware,
} from '../core'
import { type UrlAtom, urlAtom } from '../web/url'
import type {
  Codec,
  RouteAtom,
  RouteChild,
  RouteExt,
  RouteLoader,
  RouteMixin,
  RouteOptions,
} from './route.types'

export type * from './route.types'

function assertPromise<T>(value: T): asserts value is Exclude<T, Promise<any>> {
  if (value instanceof Promise) {
    throw new Error('Async search validation is not supported')
  }
}

/**
 * Runtime check for {@link Codec} — returns `true` when the value has both
 * `parse` and `serialize` methods and is NOT a Standard Schema (which also
 * exposes `parse` but lacks `serialize`).
 */
const isCodec = (v: unknown): v is Codec<any, any> =>
  typeof v === 'object' && v !== null && 'parse' in v && 'serialize' in v

const validateParams = <Input, Output>(
  validator:
    | StandardSchemaV1<Input, Output>
    | ((params: Input) => null | Output),
  params: Input,
  name: string,
): Output | null => {
  if (typeof validator === 'function') {
    return validator(params)
  }

  const validation = validator['~standard'].validate(params)

  assertPromise(validation)

  if (validation.issues) {
    throw new Error(
      `Invalid ${name}: ${JSON.stringify(validation.issues, null, 2)}`,
    )
  }

  return validation.value
}

const validate = (schema: StandardSchemaV1<any>, params: any, name: string) => {
  const validation = schema['~standard'].validate(params)

  assertPromise(validation)

  if (validation.issues) {
    throw new Error(
      `Invalid ${name}: ${JSON.stringify(validation.issues, null, 2)}`,
    )
  }

  return validation.value
}

const getPatternName = (part: string) => {
  const start = part.startsWith(':') ? 1 : 0
  const end = part.endsWith('?') ? -1 : undefined
  return start || end ? part.slice(start, end) : part
}

const getParentCachedParams = (
  parent: RouteAtom | UrlAtom | null,
): Atom<null | {}> | null => {
  if (!parent) return null
  if ('cachedParams' in parent && parent.cachedParams)
    return parent.cachedParams
  return parent === urlAtom
    ? null
    : // @ts-expect-error
      getParentCachedParams(parent.parent)
}

const setAllParentCachedParams = (
  parent: RouteAtom | UrlAtom | null,
  params: any,
  exclude: Atom<null | {}> | null,
): void => {
  if (!parent || parent === urlAtom) return
  if (
    'cachedParams' in parent &&
    parent.cachedParams &&
    parent.cachedParams !== exclude
  ) {
    parent.cachedParams.set(params)
  }
  if ('parent' in parent && parent.parent) {
    setAllParentCachedParams(parent.parent, params, exclude)
  }
}

const createRouteFactory = (parent: RouteAtom | UrlAtom) => {
  return function reatomRoute(
    pathOrOptions: string | RouteOptions<string, any, any, any>,
    name?: string,
  ): RouteAtom<string> {
    const options =
      typeof pathOrOptions === 'string'
        ? { path: pathOrOptions }
        : pathOrOptions

    const {
      path: subPath = '',
      params: paramsSchema,
      search: searchSchema,
      loader: optionsLoader = identity,
      render: renderFn,
      layout: optionLayout,
      exactRender: optionExactRender,
    } = options

    const paramsIsCodec = isCodec(paramsSchema)
    const searchIsCodec = isCodec(searchSchema)

    const layout = optionLayout ?? optionExactRender === false

    if (subPath.startsWith('/')) {
      throw new Error(
        'Subpath should not start with "/", it included automatically',
      )
    }

    const hasNoExplicitPath = !('path' in options)

    let parentPattern = parent.pattern

    for (const restricted of ['/', '?']) {
      if (parentPattern.endsWith(restricted)) {
        parentPattern = parentPattern.slice(0, -1)
      }
    }

    const pattern = `${parentPattern}/${subPath}`

    name = named(name || `route.${pattern}`)

    const hasOptionalPart = pattern.endsWith('?')

    const patternParts = pattern.split('/').filter(Boolean)

    const paramsNames = patternParts.filter((part) => part.startsWith(':'))

    const hasParams = paramsNames.length > 0
    const pathParamNames = new Set(paramsNames.map(getPatternName))

    const getPath = (params: void | Rec = {}): string => {
      let pathParams: Rec
      if (!paramsSchema) {
        pathParams = params || {}
      } else if (paramsIsCodec) {
        pathParams = paramsSchema.serialize(params)
      } else {
        pathParams = validateParams(paramsSchema, params as any, 'params')
        if (pathParams === null) {
          if (cachedParams) pathParams = {}
          else throw new Error(`Invalid params for route ${pattern}`)
        }
      }
      let searchParams: Rec | null = null
      if (searchSchema) {
        searchParams = searchIsCodec ? searchSchema.serialize(params) : params
        if (!searchIsCodec) validate(searchSchema, params, 'search')
      }

      let path = ''

      for (let i = 0; i < patternParts.length; i++) {
        const part = patternParts[i]!
        if (part.startsWith(':')) {
          const paramName = getPatternName(part)
          const isOptional = hasOptionalPart && i === patternParts.length - 1
          if (paramName in pathParams) {
            path += `/${pathParams[paramName]}`
          } else if (!isOptional) {
            throw new Error(`Missing param "${paramName}" for route ${pattern}`)
          }
        } else {
          path += `/${part}`
        }
      }

      path ||= '/'

      if (searchParams) {
        const urlSearchParams = new URLSearchParams()
        for (const [key, value] of Object.entries(searchParams)) {
          if (pathParamNames.has(key) || value == null) continue
          urlSearchParams.set(key, String(value))
        }
        const search = urlSearchParams.toString()
        if (search) path += `?${search}`
      }

      return path
    }

    const getUrl = (url: URL, params: void | Rec = {}): URL => {
      const newUrl = new URL(getPath(params), url)
      const isPathlessRelativeNavigation = hasNoExplicitPath

      if (
        isPathlessRelativeNavigation &&
        url.pathname.startsWith(newUrl.pathname)
      ) {
        newUrl.pathname = url.pathname
      }

      if (
        isPathlessRelativeNavigation &&
        !searchSchema &&
        newUrl.pathname === url.pathname &&
        newUrl.search === ''
      ) {
        newUrl.search = url.search
      }

      return newUrl
    }

    let parentCachedParams = getParentCachedParams(parent)
    let cachedParams =
      typeof paramsSchema === 'function' || paramsIsCodec
        ? atom(null, `${name}._cachedParams`)
        : parentCachedParams

    const loader = computed(async () => {
      let params = routeAtom()

      if (!params) {
        let controller = abortVar.first()!
        controller.abort('unmatch')
        throw controller.signal.reason
      }

      const promise = optionsLoader(params)

      if ('loader' in parent) {
        if (promise instanceof Promise) promise.catch(noop)
        await wrap(parent.loader())
      }

      const result = await promise
      return result
    }, `${name}.loader`).extend(
      withAsyncData({ status: true }),
    ) as unknown as RouteLoader

    const exact = computed(() => {
      const params = routeAtom()

      if (params === null) return false

      if (patternParts.length === 0 && hasNoExplicitPath) return true

      const pathname = urlAtom().pathname || '/'

      if (hasParams && pattern === pathname) return true

      const parts = pathname.split('/').filter(Boolean)

      const isLengthCorrect =
        parts.length === patternParts.length ||
        (hasOptionalPart && parts.length === patternParts.length - 1)

      if (!isLengthCorrect) return false

      return patternParts.every((patternPart, i) => {
        if (patternPart.startsWith(':')) return true

        return getPatternName(patternPart) === parts[i]
      })
    }, `${name}.exact`)

    const go = action((params: any, replace = false) => {
      return urlAtom.set((url) => {
        cachedParams?.set(params)
        if (cachedParams !== parentCachedParams) {
          setAllParentCachedParams(parent, params, cachedParams)
        }
        return getUrl(url, params)
      }, replace)
    }, `${name}.go`) as Action as RouteExt['go']

    const routeAtom = computed((state?: null | Rec): null | Rec => {
      if ('match' in parent && !parent.match!()) return null

      let url = urlAtom()
      let pathname = url.pathname
      let cachedParamsState =
        typeof paramsSchema === 'function' ? (cachedParams?.() ?? null) : null
      let params: null | Rec = cachedParamsState ?? null

      if (!params) {
        params = {}
        let parts = pathname.split('/').filter(Boolean)

        for (let i = 0; i < patternParts.length; i++) {
          if (i > parts.length || (i === parts.length && !hasOptionalPart)) {
            return null
          }

          let part = patternParts[i]!
          let name = getPatternName(part)
          let pathPart = parts[i]

          if (part.startsWith(':')) {
            params[name] = pathPart
          } else if (name !== pathPart) {
            return null
          }
        }
      }

      const parentParams =
        parent !== urlAtom && 'match' in parent ? parent() : null
      if (parentParams) {
        params = { ...parentParams, ...params }
      }

      let validatedParams: Rec
      let validatedSearch: undefined | Rec

      try {
        if (!paramsSchema) {
          validatedParams = params
        } else if (paramsIsCodec) {
          validatedParams = cachedParamsState
            ? params
            : paramsSchema.parse(params as any)
        } else {
          validatedParams = validateParams(
            paramsSchema,
            params as any,
            'params',
          )
          if (validatedParams === null) return null
        }

        if (searchSchema) {
          let searchParams = Object.fromEntries(url.searchParams)
          validatedSearch = searchIsCodec
            ? searchSchema.parse(searchParams)
            : validate(searchSchema, searchParams, 'search')
        }
      } catch {
        return null
      }

      let result = validatedParams

      if (validatedSearch) {
        result = { ...validatedParams }
        for (let key in validatedSearch) {
          if (
            key in result &&
            !(cachedParamsState && key in cachedParamsState)
          ) {
            throw new ReatomError(
              `Params collision for "${key}" in route ${pattern}`,
            )
          }
          result[key] = validatedSearch[key]
        }
      }

      return isDeepEqual(state, result) ? state! : result
    }, name).extend((target) => {
      let reatomRoute = createRouteFactory(target as RouteAtom)

      let routes: RouteAtom['routes'] = {}

      let match = computed(() => routeAtom() !== null, `${name}.match`)

      let outlet = computed(() => {
        let result: RouteChild[] = []
        for (let name in routes) {
          let childRoute = routes[name]!
          let render = childRoute.render()
          if (render != null) {
            result.push(render)
          } else if (!childRoute.layout && childRoute.match()) {
            result.push(...childRoute.outlet())
          }
        }
        return result
      }, `${name}._outlet`)

      let render = computed(() => {
        if (renderFn) {
          return (layout ? match() : exact()) ? renderFn(routeAtom) : null
        }

        // subscribe params
        match()
        return null
      }, `${name}._render`)

      return {
        go,
        loader,
        exact,
        layout,
        exactRender: !layout,
        match,
        pattern,
        path: getPath,
        routes,
        outlet,
        render,
        parent,
        cachedParams:
          cachedParams ??
          ('cachedParams' in parent ? parent.cachedParams : undefined),
        reatomRoute,
      } as RouteExt
    }) as RouteAtom

    parent.routes[name] = urlAtom.routes[name] = routeAtom

    if (cachedParams && cachedParams !== parentCachedParams) {
      routeAtom.extend(
        withMiddleware(() => (next, ...params) => {
          let state
          try {
            return (state = next(...params))
          } catch (error) {
            state = null
            throw error
          } finally {
            if (state === null && cachedParams() !== null) {
              cachedParams.set(null)
            }
          }
        }),
      )
    }

    return routeAtom
  }
}

/**
 * Creates a new route atom with the given path pattern or configuration.
 *
 * Routes automatically sync with the browser URL and provide type-safe
 * navigation, parameter validation, data loading, and component rendering.
 *
 * @example
 *   // Simple path route
 *   const homeRoute = reatomRoute('')
 *   const aboutRoute = reatomRoute('about')
 *   const userRoute = reatomRoute('users/:userId')
 *
 * @example
 *   // Route with validation schemas
 *   import { z } from 'zod'
 *
 *   const userRoute = reatomRoute({
 *     path: 'users/:userId',
 *     params: z.object({
 *       userId: z.string().regex(/^\d+$/).transform(Number),
 *     }),
 *     search: z.object({
 *       tab: z.enum(['posts', 'comments']).optional(),
 *     }),
 *   })
 *
 *   userRoute() // null
 *   userRoute.go({ userId: '123', tab: 'posts' })
 *   // URL: /users/123?tab=posts
 *   userRoute() // { userId: 123, tab: 'posts' }
 *
 * @example
 *   // Route with loader
 *   const userRoute = reatomRoute({
 *     path: 'users/:userId',
 *     async loader({ userId }) {
 *       const user = await fetch(`/api/users/${userId}`).then((r) =>
 *         r.json(),
 *       )
 *       return user
 *     },
 *   })
 *
 * @example
 *   // Search-only route (preserves pathname)
 *   const dialogRoute = reatomRoute({
 *     search: z.object({
 *       dialog: z.enum(['login', 'signup']).optional(),
 *     }),
 *   })
 *
 * @example
 *   // Route with component rendering
 *   const layoutRoute = reatomRoute({
 *     render(self) {
 *       return html`<div>
 *         <header>My App</header>
 *         <main>${self.outlet().map((child) => child)}</main>
 *       </div>`
 *     },
 *   })
 *
 * @param pathOrOptions - Either a path pattern string or a route configuration
 *   object
 * @param name - Optional name for the route atom (for debugging)
 * @returns A new RouteAtom instance
 */
export let reatomRoute = /* @__PURE__ */ (() =>
  createRouteFactory(urlAtom) as RouteMixin<''>['reatomRoute'])()

/**
 * A computed atom that indicates whether the current URL matches any defined
 * routes.
 *
 * Returns `true` when no routes match the current URL (404 scenario), and
 * `false` when at least one route matches.
 *
 * This is useful for implementing fallback UI, displaying "page not found"
 * messages, or redirecting users when they navigate to non-existent pages.
 *
 * @returns A boolean indicating whether the current URL is not matched by any
 *   route
 */
export const is404 = /* @__PURE__ */ (() =>
  computed(
    () => Object.values(urlAtom.routes).every((route) => !route()),
    'is404',
  ))()

export const isSomeLoaderPending = /* @__PURE__ */ (() =>
  computed(
    () =>
      Object.values(urlAtom.routes).some((route) => route.loader.pending() > 0),
    'isSomeLoaderPending',
  ))()
