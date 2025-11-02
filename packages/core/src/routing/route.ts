import type { StandardSchemaV1 } from '@standard-schema/spec'

import {
  abortVar,
  type AsyncDataExt,
  identity,
  isDeepEqual,
  noop,
  type Plain,
  type Rec,
  withAsyncData,
  wrap,
} from '../'
import type { Action, Computed } from '../core'
import { action, computed, ReatomError } from '../core'
import { urlAtom } from '../web/url'

type MaybeVoid<T> = {} extends T ? T | void : T

export type PathParams<Path extends string = string> =
  Path extends `:${infer Param}/${infer Rest}`
    ? { [key in Param]: string } & PathParams<Rest>
    : Path extends `:${infer MaybeOptionalParam}`
      ? MaybeOptionalParam extends `${infer OptionalParam}?`
        ? { [key in OptionalParam]?: string }
        : { [key in MaybeOptionalParam]: string }
      : Path extends `${string}/${infer Rest}`
        ? PathParams<Rest>
        : {}

export type PathKeys<Path extends string> = Record<keyof PathParams<Path>, any>

/** Redeclare this type for your framework */
export interface RouteChild {}

export interface RouteOptions<
  Path extends string = '',
  Params extends PathKeys<Path> = PathParams<Path>,
  Search extends Partial<Rec<string>> = {},
  ParamsOutput = Params,
  SearchOutput = Search,
  LoaderParams = Plain<ParamsOutput & SearchOutput>,
  Payload = LoaderParams,
> {
  path?: Path

  params?: StandardSchemaV1<Params, ParamsOutput>

  search?: StandardSchemaV1<Search, SearchOutput>

  loader?: (params: LoaderParams) => Promise<Payload>

  child?: (children: RouteAtom['children']) => RouteChild
}

export interface RouteMixin<
  Path extends string,
  Params extends PathKeys<Path> = PathParams<Path>,
> {
  /**
   * Create a sub-route by appending a path pattern to the current route.
   *
   * @example
   *   const usersRoute = reatomRoute('users') // Creates /users route
   *   const userRoute = usersRoute.reatomRoute(':userId') // Creates /users/:userId route
   *
   * @param path The sub-path pattern to append (e.g., 'users', ':userId',
   *   'posts/:postId?')
   * @returns A new RouteAtom for the combined path pattern
   */
  reatomRoute<SubPath extends string>(
    path: SubPath,
    name?: string,
  ): RouteAtom<
    `${Path}/${SubPath}`,
    // @ts-expect-error TODO
    Plain<Params & PathParams<SubPath>>,
    {},
    {}
  >

  /**
   * Create a sub-route with validation schemas for parameters and search
   * params.
   *
   * @example
   *   import { z } from 'zod'
   *
   *   const userRoute = reatomRoute({
   *     path: 'user/:id',
   *     params: z.object({ id: z.number() }), // Should match the path
   *     search: z.object({ sort: z.enum(['asc', 'desc']).optional() }),
   *   })
   *
   *   // Navigate with validated params
   *   userRoute.go({ id: 123, tab: 'profile' })
   *
   * @param options Route configuration object or just a path string
   * @param options.path The sub-path pattern to append
   * @param options.params Optional schema to validate the path parameters
   * @param options.search Optional schema to validate search parameters. Each
   *   param should be optional!
   * @returns A new RouteAtom for the combined path with validation
   */
  reatomRoute<
    SubPath extends string = '',
    SubParams extends PathKeys<SubPath> = PathParams<SubPath>,
    SubSearch extends Partial<Rec<string>> = {},
    SubParamsOutput = SubParams,
    SubSearchOutput = SubSearch,
    LoaderParams = Plain<Params & SubParamsOutput & SubSearchOutput>,
    Payload = LoaderParams,
  >(
    options: RouteOptions<
      SubPath,
      SubParams,
      SubSearch,
      SubParamsOutput,
      SubSearchOutput,
      LoaderParams,
      Payload
    >,
    name?: string,
  ): RouteAtom<
    `${Path extends `${infer Path}?` ? Path : Path}/${SubPath}`,
    // @ts-expect-error TODO
    Plain<Params & SubParamsOutput>,
    Plain<SubSearchOutput>,
    Payload,
    Plain<Params & SubParams>,
    Plain<SubSearch>
  >

  /** @deprecated Use `reatomRoute` instead */
  route: this['reatomRoute']
}

function assertPromise<T>(value: T): asserts value is Exclude<T, Promise<any>> {
  if (value instanceof Promise) {
    throw new Error('Async search validation is not supported')
  }
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

export interface RouteLoader<Params extends Rec = Rec, Payload = any>
  extends Computed<Promise<Payload>>,
    AsyncDataExt<[Params], Payload, undefined | Payload, Error | undefined> {}

export interface RouteAtom<
  Path extends string = string,
  Params extends PathKeys<Path> = PathParams<Path>,
  Search extends Rec<string> = {},
  Payload = Plain<Params & Search>,
  InputParams = Params,
  InputSearch = Search,
> extends Computed<null | Plain<Params & Search>>,
    RouteMixin<Path, Params> {
  go: Action<
    [params: MaybeVoid<InputParams & InputSearch>, replace?: boolean], // Updated signature: single optional object argument
    URL
  >

  loader: RouteLoader<Plain<Params & Search>, Payload>

  exact: Computed<boolean>

  pattern: Path

  path: (params: MaybeVoid<InputParams & InputSearch>) => string

  routes: Rec<RouteAtom>

  children: Computed<RouteChild[]>

  child: Computed<null | RouteChild>
}

const getPatternName = (part: string) => {
  const start = part.startsWith(':') ? 1 : 0
  const end = part.endsWith('?') ? -1 : undefined
  return start || end ? part.slice(start, end) : part
}

const createRouteFactory = (
  parent: Computed & {
    pattern: string
    routes: Rec<RouteAtom>
    loader?: RouteLoader
  },
  name?: string,
) => {
  return function reatomRoute(
    pathOrOptions: string | RouteOptions<string, any, any, any>,
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
      child: childFn,
    } = options

    if (subPath.startsWith('/')) {
      throw new Error(
        'Subpath should not start with "/", it included automatically',
      )
    }

    const isSearchOnlyRoute = !subPath && searchSchema

    let parentPattern = parent.pattern

    for (const restricted of ['/', '?']) {
      if (parentPattern.endsWith(restricted)) {
        parentPattern = parentPattern.slice(0, -1)
      }
    }

    const pattern = `${parentPattern}/${subPath}`

    name ||= `route#${pattern}`

    const hasOptionalPart = pattern.endsWith('?')

    const patternParts = pattern.split('/').filter(Boolean)

    const paramsNames = patternParts.filter((part) => part.startsWith(':'))

    const hasParams = paramsNames.length > 0

    const getPath = (params: void | Rec = {}): string => {
      let pathParams = paramsSchema
        ? validate(paramsSchema, params, 'params')
        : params
      let searchParams = searchSchema
        ? validate(searchSchema, params, 'search')
        : null

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
          urlSearchParams.set(key, String(value))
        }
        path += '?' + urlSearchParams.toString()
      }

      return path
    }

    const loader = computed(async () => {
      let params = routeAtom()

      if (!params) {
        let controller = abortVar.first()!
        controller.abort('unmatch')
        throw controller.signal.reason
      }

      const promise = optionsLoader(params)

      if (parent.loader) {
        if (promise instanceof Promise) promise.catch(noop)
        await wrap(parent.loader())
      }

      const result = await promise
      return result
    }, `${name}.loader`).extend(withAsyncData()) as unknown as RouteLoader

    const exact = computed(() => {
      const params = routeAtom()

      if (params === null) return false

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

    const go = action((params: void | any, replace = false) => {
      return urlAtom.set((url) => {
        const newUrl = new URL(getPath(params), url)
        if (isSearchOnlyRoute && url.pathname.startsWith(newUrl.pathname)) {
          newUrl.pathname = url.pathname
        }
        return newUrl
      }, replace)
    }, `${name}.go`)

    const routeAtom = computed((state?: null | Rec): null | Rec => {
      if (parent() === null) return null

      const url = urlAtom()
      const pathname = url.pathname
      const params: Rec = {}

      const parts = pathname.split('/').filter(Boolean)

      for (let i = 0; i < patternParts.length; i++) {
        if (i > parts.length || (i === parts.length && !hasOptionalPart)) {
          return null
        }

        const part = patternParts[i]!
        const name = getPatternName(part)
        const pathPart = parts[i]

        if (part.startsWith(':')) {
          params[name] = pathPart
        } else if (name !== pathPart) {
          return null
        }
      }

      let validatedParams: Rec
      let validatedSearch: undefined | Rec

      try {
        validatedParams = paramsSchema
          ? validate(paramsSchema, params, 'params')
          : params

        if (searchSchema) {
          const searchParams = Object.fromEntries(url.searchParams)
          validatedSearch = validate(searchSchema, searchParams, 'search')
        }
      } catch {
        return null
      }

      let result = { ...validatedParams }

      if (validatedSearch) {
        for (const key in validatedSearch) {
          if (key in result) {
            throw new ReatomError(
              `Params collision for "${key}" in route ${pattern}`,
            )
          }
          result[key] = validatedSearch[key]
        }
      }

      return isDeepEqual(state, result) ? state! : result
    }, name).extend((target) => {
      const reatomRoute = createRouteFactory(target as RouteAtom)

      const routes: RouteAtom['routes'] = {}

      const children = computed(() => {
        const result: RouteChild[] = []
        for (let pattern in routes) {
          let child = routes[pattern]!.child()
          if (child) {
            result.push(child)
          }
        }
        return result
      }, `${name}._children`)

      const child = computed(() => {
        // FIXME memo route patch, do not subscribe to params changes
        return childFn && routeAtom() ? childFn(children) : null
      }, `${name}._child`)

      return {
        go,
        loader,
        exact,
        pattern,
        path: getPath,
        routes,
        children,
        child,
        reatomRoute,
        route: reatomRoute,
      }
    }) as RouteAtom

    parent.routes[pattern] = urlAtom.routes[pattern] = routeAtom

    return routeAtom
  }
}

export let reatomRoute = /* @__PURE__ */ (() =>
  createRouteFactory(urlAtom as any) as RouteMixin<''>['reatomRoute'])()

/** @deprecated Use `reatomRoute` instead */
export let route = reatomRoute

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
