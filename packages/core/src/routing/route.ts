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
import type { Atom } from '../core'
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
  RouteGo,
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

const isStandardSchema = (
  v: unknown,
): v is StandardSchemaV1<unknown, unknown> =>
  v !== null && typeof v === 'object' && '~standard' in v

const isCodec = (v: unknown): v is Codec<any, any> =>
  typeof v === 'object' && v !== null && 'decode' in v && 'encode' in v

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

const validateParams = <Input, Output>(
  validator:
    | StandardSchemaV1<Input, Output>
    | ((params: Input) => null | Output),
  params: Input,
  name: string,
): Output | null => {
  return typeof validator === 'function'
    ? validator(params)
    : validate(validator, params, name)
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

const pathnameAtOrBelowBase = (pathname: string, base: string): boolean => {
  if (base === '' || base === '/') return true
  return pathname === base || pathname.startsWith(`${base}/`)
}

type PathSegment = {
  name: string
  param: boolean
  optional: boolean
}

type PathMatch = {
  exact: boolean
  params: Rec
}

const memo = <Argument, Result>(compute: (argument: Argument) => Result) => {
  let lastArgument: Argument | typeof compute = compute
  let lastResult!: Result

  return (argument: Argument): Result => {
    if (lastArgument !== compute && lastArgument === argument) {
      return lastResult
    }
    lastArgument = argument
    lastResult = compute(argument)
    return lastResult
  }
}

const splitPath = memo((path: string) => path.split('/').filter(Boolean))

const createPathSegments = (path: string): Array<PathSegment> =>
  splitPath(path).map((part, index, parts) => {
    const param = part.startsWith(':')
    return {
      name: getPatternName(part),
      param,
      optional: param && part.endsWith('?') && index === parts.length - 1,
    }
  })

const getPathParamNames = (segments: Array<PathSegment>): Set<string> =>
  new Set(
    segments.filter((segment) => segment.param).map((segment) => segment.name),
  )

const matchPath = (
  segments: Array<PathSegment>,
  pathname: string,
  hasNoExplicitPath: boolean,
): PathMatch | null => {
  const parts = splitPath(pathname)
  const optionalLastSegment = segments.at(-1)?.optional === true
  if (parts.length < segments.length - (optionalLastSegment ? 1 : 0)) {
    return null
  }

  const params: Rec = {}
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]!
    const pathPart = parts[i]
    if (pathPart === undefined && segment.optional) continue
    if (pathPart === undefined) return null
    if (segment.param) {
      try {
        params[segment.name] = decodeURIComponent(pathPart)
      } catch {
        return null
      }
    } else if (segment.name !== pathPart) return null
  }

  const exact =
    hasNoExplicitPath && segments.length === 0
      ? true
      : parts.length === segments.length ||
        (optionalLastSegment && parts.length === segments.length - 1)

  return { exact, params }
}

const buildPath = (
  segments: Array<PathSegment>,
  params: Rec,
  pattern: string,
) => {
  let path = ''
  for (const { name, optional, param } of segments) {
    if (!param) {
      path += `/${name}`
      continue
    }

    const value = params[name]
    const present = value !== undefined && value !== null
    if (present) path += `/${encodeURIComponent(String(value))}`
    else if (!optional) {
      throw new Error(`Missing param "${name}" for route ${pattern}`)
    }
  }

  return path
}

const pickParams = (params: Rec, names: Set<string>): Rec =>
  Object.fromEntries(
    [...names].filter((key) => key in params).map((key) => [key, params[key]]),
  )

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

    const patternSegments = createPathSegments(pattern)
    const ownSegments = createPathSegments(subPath)
    const pathParamNames = getPathParamNames(patternSegments)
    const ownPathParamNames = getPathParamNames(ownSegments)

    let parentCachedParams = getParentCachedParams(parent)
    let cachedParams =
      typeof paramsSchema === 'function'
        ? atom(null, `${name}._cachedParams`)
        : parentCachedParams

    const validatePathParams = (routeParams: Rec): Rec => {
      if (!paramsSchema) return routeParams
      if (isCodec(paramsSchema) && !isStandardSchema(paramsSchema)) {
        throw new Error(`Invalid params for route ${pattern}`)
      }

      const validated = validateParams(
        paramsSchema,
        routeParams as any,
        'params',
      )

      if (validated === null) {
        if (cachedParams) return {}
        throw new Error(`Invalid params for route ${pattern}`)
      }

      return validated as Rec
    }

    const encodePathParams = (routeParams: Rec): Rec => {
      if (!paramsSchema) return routeParams

      if (!paramsIsCodec) return validatePathParams(routeParams)

      try {
        return paramsSchema.encode(
          pickParams(routeParams, ownPathParamNames),
        ) as Rec
      } catch (encodeError) {
        if (!isStandardSchema(paramsSchema)) throw encodeError
        return validatePathParams(routeParams)
      }
    }

    const buildLocalPathnameSegments = (routeParams: void | Rec): string => {
      if (ownSegments.length === 0) return ''

      const routeParamsObj = (routeParams ?? {}) as Rec
      return buildPath(ownSegments, encodePathParams(routeParamsObj), pattern)
    }

    const pathnameBuilder = (routeParams: Rec): string => {
      const local = buildLocalPathnameSegments(routeParams)
      if (parent === urlAtom) {
        return local || '/'
      }
      const parentRoute = parent as RouteAtom
      const base = parentRoute.pathnameBuilder(routeParams)
      if (local === '') {
        return base
      }
      if (base === '/') {
        return local
      }
      return `${base.replace(/\/$/, '')}${local}`
    }

    const encodeSearchParams = (routeParams: Rec): Rec | null => {
      if (!searchSchema) return null

      if (!searchIsCodec) {
        validate(searchSchema, routeParams, 'search')
        return routeParams
      }

      try {
        return searchSchema.encode(routeParams) as Rec
      } catch (encodeError) {
        if (!isStandardSchema(searchSchema)) throw encodeError
        validate(searchSchema, routeParams, 'search')
        return routeParams
      }
    }

    const appendSearch = (path: string, searchParams: Rec | null): string => {
      if (!searchParams) return path

      const urlSearchParams = new URLSearchParams()

      for (const [key, value] of Object.entries(searchParams)) {
        if (pathParamNames.has(key) || value == null) continue
        urlSearchParams.set(key, String(value))
      }

      const search = urlSearchParams.toString()
      return search ? `${path}?${search}` : path
    }

    const getPath = (params: void | Rec = {}): string => {
      const routeParams = (params ?? {}) as Rec
      return appendSearch(
        pathnameBuilder(routeParams),
        encodeSearchParams(routeParams),
      )
    }

    const getUrl = (url: URL, params: void | Rec = {}): URL => {
      const newUrl = new URL(getPath(params), url)
      const isPathlessRelativeNavigation = hasNoExplicitPath

      if (
        isPathlessRelativeNavigation &&
        pathnameAtOrBelowBase(url.pathname, newUrl.pathname)
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

    const loader = computed(async () => {
      let params = routeAtom()

      if (!params) {
        let controller = abortVar.first()!
        controller.abort('unmatch')
        throw controller.signal.reason
      }

      // start before parent to load all route in parallel
      const promise = optionsLoader(params)

      // expose the current result only
      // after the parent loader settles successfully.
      if ('loader' in parent) {
        if (promise instanceof Promise) promise.catch(noop)
        await wrap(parent.loader())
      }

      const result = await promise
      return result
    }, `${name}.loader`).extend(
      withAsyncData({ status: true }),
    ) as unknown as RouteLoader

    const routeMatch = computed(
      (state?: null | PathMatch): null | PathMatch => {
        if ('match' in parent && !parent.match()) return null

        const url = urlAtom()
        const pathMatch = matchPath(
          patternSegments,
          url.pathname,
          hasNoExplicitPath,
        )

        if (!pathMatch) return null

        let params = pathMatch.params

        const parentParams =
          parent !== urlAtom && 'match' in parent ? parent() : null
        if (parentParams) {
          params = { ...parentParams, ...params }
        }

        const cachedParamsState =
          typeof paramsSchema === 'function' ? (cachedParams?.() ?? null) : null
        if (cachedParamsState) {
          params = { ...cachedParamsState, ...params }
        }

        let resultParams: Rec
        let searchParams: Rec | undefined

        try {
          if (!paramsSchema) {
            resultParams = params
          } else if (paramsIsCodec) {
            resultParams = paramsSchema.decode(params as any) as Rec
          } else {
            const validatedParams = validateParams(
              paramsSchema,
              params as any,
              'params',
            )
            if (validatedParams === null) return null
            resultParams = validatedParams as Rec
          }

          if (searchSchema) {
            const rawSearchParams = Object.fromEntries(url.searchParams)
            searchParams = searchIsCodec
              ? (searchSchema.decode(rawSearchParams) as Rec)
              : validate(searchSchema, rawSearchParams, 'search')
          }
        } catch {
          return null
        }

        if (searchParams) {
          const mergedParams = { ...resultParams }
          for (const key in searchParams) {
            if (
              key in mergedParams &&
              !(cachedParamsState && key in cachedParamsState)
            ) {
              throw new ReatomError(
                `Params collision for "${key}" in route ${pattern}`,
              )
            }
            mergedParams[key] = searchParams[key]
          }
          resultParams = mergedParams
        }

        const stableParams =
          state?.params && isDeepEqual(state.params, resultParams)
            ? state.params
            : resultParams

        return state?.exact === pathMatch.exact && state.params === stableParams
          ? state
          : { exact: pathMatch.exact, params: stableParams }
      },
      `${name}._match`,
    )

    const exact = computed(
      () => routeAtom() !== null && (routeMatch()?.exact ?? false),
      `${name}.exact`,
    )

    const go = action((params: any, replace = false) => {
      return urlAtom.set((url) => {
        cachedParams?.set(params)
        if (cachedParams !== parentCachedParams) {
          setAllParentCachedParams(parent, params, cachedParams)
        }
        return getUrl(url, params)
      }, replace)
    }, `${name}.go`).extend((target) => ({
      relative: action((relParams: any, replace = false) => {
        if (parent === urlAtom) {
          return target(relParams, replace)
        }
        const parentRoute = parent as RouteAtom
        if (!parentRoute.match() || parentRoute() === null) {
          throw new ReatomError(
            'Cannot navigate relative: parent route is not matched',
          )
        }
        const parentSnapshot = { ...parentRoute() } as Rec
        const rel = { ...(relParams ?? {}) } as Rec
        for (const key of Object.keys(parentSnapshot)) {
          if (Object.prototype.hasOwnProperty.call(rel, key)) {
            delete rel[key]
          }
        }
        return target({ ...parentSnapshot, ...rel }, replace)
      }, `${name}.go.relative`),
    })) as RouteGo

    const routeAtom = computed((state?: null | Rec): null | Rec => {
      const match = routeMatch()
      if (!match) return null

      return isDeepEqual(state, match.params) ? state! : match.params
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
        pathnameBuilder,
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
