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
import type { Action, Atom, Computed } from '../core'
import {
  action,
  atom,
  computed,
  named,
  ReatomError,
  withMiddleware,
} from '../core'
import { type UrlAtom, urlAtom } from '../web/url'

type MaybeVoid<T> = {} extends T ? T | void : T

/**
 * Extracts parameter types from a route path pattern string.
 *
 * Extracts parameter names from path patterns like `:userId`, `:postId?`, etc.
 * and creates a type mapping parameter names to their types.
 *
 * @example
 *   type Params = PathParams<'users/:userId/posts/:postId?'>
 *   // Params = { userId: string; postId?: string }
 *
 * @example
 *   type Params = PathParams<':id'>
 *   // Params = { id: string }
 */
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

/**
 * Type representing a rendered route component/child.
 *
 * Redeclare this type in your framework module to enable type-safe route
 * rendering. This allows you to use framework-specific types (like JSX.Element,
 * VNode, TemplateResult) as route children.
 *
 * @example
 *   // For React/Preact
 *   declare module '@reatom/core' {
 *     interface RouteChild extends JSX.Element {}
 *   }
 *
 * @example
 *   // For Vue
 *   declare module '@reatom/core' {
 *     interface RouteChild extends VNode {}
 *   }
 *
 * @example
 *   // For Lit
 *   declare module '@reatom/core' {
 *     interface RouteChild extends TemplateResult {}
 *   }
 */
export interface RouteChild {}

/**
 * Configuration options for creating a route.
 *
 * Routes can be created with just a path string, or with a full configuration
 * object that includes validation schemas, data loaders, and render functions.
 *
 * @example
 *   // Simple path-only route
 *   const route = reatomRoute('users/:userId')
 *
 * @example
 *   // Route with validation and loader
 *   const route = reatomRoute({
 *     path: 'users/:userId',
 *     params: z.object({
 *       userId: z.string().regex(/^\d+$/).transform(Number),
 *     }),
 *     search: z.object({ tab: z.enum(['posts', 'comments']).optional() }),
 *     async loader(params) {
 *       return fetch(`/api/users/${params.userId}`).then((r) => r.json())
 *     },
 *   })
 *
 * @example
 *   // Search-only route (no path, preserves current pathname)
 *   const dialogRoute = reatomRoute({
 *     search: z.object({ dialog: z.enum(['login', 'signup']).optional() }),
 *   })
 */
export interface RouteOptions<
  Path extends string = '',
  ParamsInput extends PathKeys<Path> = PathParams<Path>,
  SearchInput extends Partial<Rec<string>> = {},
  ParamsOutput extends Rec = ParamsInput,
  SearchOutput extends Rec = SearchInput,
  LoaderParams = Plain<ParamsOutput & SearchOutput>,
  Payload = LoaderParams,
> {
  /**
   * Path pattern string. Use `:paramName` for required parameters and
   * `:paramName?` for optional parameters.
   *
   * @example
   *   'users/:userId'
   *
   * @example
   *   'posts/:postId?'
   *
   * @example
   *   'api/products/:productId/settings'
   */
  path?: Path

  /**
   * Schema to validate and transform path parameters. Uses Standard Schema
   * (compatible with Zod, Valibot, etc.).
   *
   * URL parameters are always strings, so validation schemas should accept
   * strings and transform them to the desired types.
   *
   * @example
   *   params: z.object({
   *     userId: z.string().regex(/^\d+$/).transform(Number),
   *   })
   */
  params?:
    | StandardSchemaV1<ParamsInput, ParamsOutput>
    | ((params: ParamsInput) => null | ParamsOutput)

  /**
   * Schema to validate and transform search/query parameters. Uses Standard
   * Schema (compatible with Zod, Valibot, etc.).
   *
   * Note: All search parameters should be optional in the schema.
   *
   * @example
   *   search: z.object({
   *     sort: z.enum(['asc', 'desc']).optional(),
   *     page: z.string().transform(Number).default('1'),
   *   })
   */
  search?: StandardSchemaV1<SearchInput, SearchOutput>

  /**
   * Async function that loads data when the route becomes active.
   *
   * Receives validated parameters (path + search params combined).
   * Automatically aborted when navigating away from the route.
   *
   * @example
   *   async loader({ userId, tab }) {
   *   const user = await fetch(`/api/users/${userId}`).then(r => r.json())
   *   return user
   *   }
   */
  loader?: (params: LoaderParams) => Promise<Payload>

  /**
   * Function that renders the route component. Receives the whole route object
   * with non-nullable state and all route properties (outlet, loader, etc.).
   *
   * This enables framework-agnostic component composition where routes define
   * their own components that are automatically composed hierarchically.
   *
   * @example
   *   render(self) {
   *   // self() returns params (non-nullable when render is called)
   *   // self.outlet() returns active child route components
   *   // self.loader for data loading state
   *   return html`<div>
   *   <header>My App</header>
   *   <main>${self.outlet().map(child => child)}</main>
   *   </div>`
   *   }
   */
  render?: (
    options: Computed<Plain<ParamsOutput & SearchOutput>> &
      RouteExt<
        string,
        ParamsOutput,
        SearchOutput,
        Payload,
        ParamsInput,
        SearchInput
      >,
  ) => RouteChild

  /**
   * When `true`, the route's `render` function only fires on exact URL matches.
   * When the route matches partially (a child route is active), `render`
   * returns `null` and children propagate through the outlet chain to the
   * nearest layout ancestor.
   *
   * Defaults to `false` (layout behavior — render fires on any match). Set to
   * `true` for feature/leaf routes where child routes should replace the parent
   * content rather than be wrapped by it.
   *
   * @default false
   * @see RouteExt.exact
   */
  exactRender?: boolean
}

export interface RouteMixin<
  Path extends string,
  Params extends PathKeys<Path> = PathParams<Path>,
  InputParams = Params,
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
    {},
    Plain<InputParams & PathParams<SubPath>>
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
    SubParamsInput extends PathKeys<SubPath> = PathParams<SubPath>,
    SubSearchInput extends Partial<Rec<string>> = {},
    SubParamsOutput extends Rec = SubParamsInput,
    SubSearchOutput extends Rec = SubSearchInput,
    LoaderParams = Plain<Params & SubParamsOutput & SubSearchOutput>,
    Payload = LoaderParams,
  >(
    options: RouteOptions<
      SubPath,
      Params & SubParamsInput,
      SubSearchInput,
      SubParamsOutput,
      SubSearchOutput,
      LoaderParams,
      Payload
    >,
    name?: string,
  ): RouteAtom<
    TrimPath<`${Path extends `${infer Path}?` ? Path : Path}/${SubPath}`>,
    // @ts-expect-error TODO
    Plain<SubParamsOutput>,
    Plain<SubSearchOutput>,
    Payload,
    Plain<InputParams & SubParamsInput>,
    Plain<SubSearchInput>
  >
}

export type TrimPath<Path extends string> = Path extends `//${infer Path}`
  ? TrimPath<`/${Path}`>
  : Path

function assertPromise<T>(value: T): asserts value is Exclude<T, Promise<any>> {
  if (value instanceof Promise) {
    throw new Error('Async search validation is not supported')
  }
}

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

/**
 * Route loader interface describing async data loading capabilities, mostly
 * crafted from `withAsyncData` extension, see `loader` property of a route for
 * examples.
 */
export interface RouteLoader<Params extends Rec = Rec, Payload = any>
  extends
    Computed<Promise<Payload>>,
    AsyncDataExt<[Params], Payload, Payload, undefined, Error | undefined> {}

/** Route extension interface for route computed atom. */
export interface RouteExt<
  Path extends string = string,
  Params extends PathKeys<Path> = PathParams<Path>,
  Search extends Rec<string> = {},
  Payload = Plain<Params & Search>,
  InputParams = Params,
  InputSearch = Search,
> extends RouteMixin<Path, Params, InputParams> {
  /**
   * Navigate to this route with the given parameters.
   *
   * Updates the browser URL and triggers route matching. For search-only
   * routes, preserves the current pathname and only updates search parameters.
   *
   * @example
   *   userRoute.go({ userId: '123' })
   *   // Navigates to /users/123
   *
   * @example
   *   searchRoute.go({ q: 'reatom', page: 2 }, true)
   *   // Navigates to /search?q=reatom&page=2 and replaces history entry
   *
   * @example
   *   homeRoute.go() // Navigate without parameters
   *   // Navigates to /
   *
   * @param params - Route parameters (path + search). Can be omitted if route
   *   has no required parameters.
   * @param replace - If `true`, replaces current history entry instead of
   *   creating a new one. Defaults to `false`.
   * @returns The new URL object
   */
  go: Action<
    [params: MaybeVoid<InputParams & InputSearch>, replace?: boolean],
    URL
  >

  /**
   * Async loader for fetching route data.
   *
   * Automatically executes when the route becomes active. Extended with
   * `withAsyncData` extension, which provides loading state, error handling,
   * and retry functionality, automatically rerun (and abort prev run) on params
   * change, or just abort when navigating away.
   *
   * @example
   *   const ready = userRoute.loader.ready()
   *   const user = userRoute.loader.data()
   *   const error = userRoute.loader.error()
   *   userRoute.loader.retry()
   */
  loader: RouteLoader<Plain<Params & Search>, Payload>

  /**
   * Computed atom indicating if the current URL exactly matches this route.
   *
   * Returns `true` only when the URL is an exact match (not a partial match).
   * Useful for conditional rendering that should only appear on the exact
   * route.
   *
   * @example
   *   // At URL: /users/123
   *   usersRoute.exact() // false (partial match)
   *   userRoute.exact() // true (exact match)
   *
   * @example
   *   // Only show component on exact route
   *   {userRoute.exact() && <UserDetails />}
   */
  exact: Computed<boolean>

  exactRender: boolean

  /**
   * Computed atom indicating if the current URL matches this route (partial or
   * exact).
   *
   * Returns `true` when the route matches, `false` otherwise. More permissive
   * than `exact()` - returns true for both exact and partial matches.
   *
   * Helpful to track the route active state, and to create a route model with
   * memoization.
   *
   * Used under the hood of the `outlet` computed.
   *
   * @example
   *   // At URL: /users/123/edit
   *   usersRoute.match() // true (partial match)
   *   userRoute.match() // true (partial match)
   *   userEditRoute.match() // true (exact match)
   */
  match: Computed<boolean>

  /**
   * The path pattern string for this route.
   *
   * Helpful for matching links or other route-related logic.
   *
   * @example
   *   '/users/:userId'
   *
   * @example
   *   '/posts/:postId?'
   */
  pattern: Path

  /**
   * Builds a URL path string for this route without navigating.
   *
   * Useful for creating links or programmatically constructing URLs. Includes
   * search parameters if the route has a search schema.
   *
   * @example
   *   userRoute.path({ userId: '123' })
   *   // Returns: '/users/123'
   *
   * @example
   *   searchRoute.path({ q: 'reatom', page: 2 })
   *   // Returns: '/search?q=reatom&page=2'
   *
   * @example
   *   // Use in links
   *   <a href={userRoute.path({ userId: '123' })}>View User</a>
   *
   * @param params - Route parameters (path + search). Can be omitted if route
   *   has no required parameters.
   * @returns The URL path string (including search params if applicable)
   */
  path: (params: MaybeVoid<InputParams & InputSearch>) => string

  /**
   * Registry of all child routes created from this route.
   *
   * Routes are automatically registered here when created via `.reatomRoute()`.
   * Useful for accessing all child routes or implementing global route logic.
   *
   * @example
   *   const layoutRoute = reatomRoute('dashboard')
   *   const usersRoute = layoutRoute.reatomRoute('users')
   *   const postsRoute = layoutRoute.reatomRoute('posts')
   *
   *   // Access all child routes
   *   layoutRoute.routes // { 'dashboard/users': usersRoute, 'dashboard/posts': postsRoute }
   */
  routes: Rec<RouteAtom>

  /**
   * Computed atom returning an array of all active child route components.
   *
   * Contains the rendered output from all child routes that are currently
   * matched. Used in parent route `render` functions to compose child
   * components.
   *
   * @example
   *   const layoutRoute = reatomRoute({
   *     render(self) {
   *       return html`<div>
   *         <main>${self.outlet().map((child) => child)}</main>
   *       </div>`
   *     },
   *   })
   */
  outlet: Computed<RouteChild[]>

  /**
   * Computed atom returning the rendered component for this route, or `null`.
   *
   * Returns the result of the route's `render` function when the route matches,
   * `null` otherwise. Used to render route components in a component tree.
   *
   * @example
   *   const App = reatomComponent(() => {
   *     return layoutRoute.render() // Returns the rendered component or null
   *   })
   */
  render: Computed<null | RouteChild>

  parent: RouteAtom | null

  inputParams: Atom<null | InputParams>
}

/**
 * A route atom that matches URLs and provides navigation, loading, and
 * rendering.
 *
 * Routes are computed atoms that return route parameters when matched, or
 * `null` when not matched. They also provide navigation actions, data loading,
 * and component rendering capabilities.
 *
 * Routes can be created with `reatomRoute()` and nested using `.reatomRoute()`.
 *
 * @example
 *   // Create a route
 *   const userRoute = reatomRoute('users/:userId')
 *
 *   // Use as computed atom
 *   const params = userRoute() // { userId: '123' } or null
 *
 *   // Navigate
 *   userRoute.go({ userId: '456' })
 *
 *   // Create nested route
 *   const userEditRoute = userRoute.reatomRoute('edit')
 *   // Full path: /users/:userId/edit
 *
 * @example
 *   // Route with validation and loader
 *   const userRoute = reatomRoute({
 *     path: 'users/:userId',
 *     params: z.object({ userId: z.string().transform(Number) }),
 *     async loader({ userId }) {
 *       return fetch(`/api/users/${userId}`).then((r) => r.json())
 *     },
 *   })
 */
export interface RouteAtom<
  Path extends string = string,
  ParamsOutput extends PathKeys<Path> = PathParams<Path>,
  SearchOutput extends Rec<string> = {},
  Payload = Plain<ParamsOutput & SearchOutput>,
  ParamsInput = ParamsOutput,
  SearchInput = SearchOutput,
>
  extends
    Computed<null | Plain<ParamsOutput & SearchOutput>>,
    RouteExt<
      Path,
      ParamsOutput,
      SearchOutput,
      Payload,
      ParamsInput,
      SearchInput
    > {}

const getPatternName = (part: string) => {
  const start = part.startsWith(':') ? 1 : 0
  const end = part.endsWith('?') ? -1 : undefined
  return start || end ? part.slice(start, end) : part
}

const getParentInputParams = (
  parent: RouteAtom | UrlAtom | null,
): Atom<null | {}> | null => {
  if (!parent) return null
  if ('inputParams' in parent && parent.inputParams) return parent.inputParams
  return parent === urlAtom
    ? null
    : // @ts-expect-error
      getParentInputParams(parent.parent)
}

const setAllParentInputParams = (
  parent: RouteAtom | UrlAtom | null,
  params: any,
  exclude: Atom<null | {}> | null,
): void => {
  if (!parent || parent === urlAtom) return
  if (
    'inputParams' in parent &&
    parent.inputParams &&
    parent.inputParams !== exclude
  ) {
    parent.inputParams.set(params)
  }
  if ('parent' in parent && parent.parent) {
    setAllParentInputParams(parent.parent, params, exclude)
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
      exactRender = false,
    } = options

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

    const getPath = (params: void | Rec = {}): string => {
      let pathParams: Rec
      if (!paramsSchema) {
        pathParams = params || {}
      } else {
        pathParams = validateParams(paramsSchema, params as any, 'params')
        if (pathParams === null) {
          if (inputParams) pathParams = {}
          else throw new Error(`Invalid params for route ${pattern}`)
        }
      }
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

    let parentInputParams = getParentInputParams(parent)
    let inputParams =
      typeof paramsSchema === 'function'
        ? atom(null, `${name}._inputParams`)
        : parentInputParams

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
        inputParams?.set(params)
        if (inputParams !== parentInputParams) {
          setAllParentInputParams(parent, params, inputParams)
        }
        const newUrl = new URL(getPath(params), url)
        if (hasNoExplicitPath && url.pathname.startsWith(newUrl.pathname)) {
          newUrl.pathname = url.pathname
        }
        return newUrl
      }, replace)
    }, `${name}.go`) as Action as RouteExt['go']

    const routeAtom = computed((state?: null | Rec): null | Rec => {
      if ('match' in parent && !parent.match!()) return null

      let url = urlAtom()
      let pathname = url.pathname
      let inputParamsState = inputParams?.() ?? null
      let params: null | Rec = inputParamsState ?? null

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
          validatedSearch = validate(searchSchema, searchParams, 'search')
        }
      } catch {
        return null
      }

      let result = validatedParams

      if (validatedSearch) {
        result = { ...validatedParams }
        for (let key in validatedSearch) {
          if (key in result && !(inputParamsState && key in inputParamsState)) {
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
          } else if (childRoute.exactRender && childRoute.match()) {
            result.push(...childRoute.outlet())
          }
        }
        return result
      }, `${name}._outlet`)

      let render = computed(() => {
        if (renderFn) {
          return (exactRender ? exact() : match()) ? renderFn(routeAtom) : null
        }

        // subscribe params
        match()
        return null
      }, `${name}._render`)

      return {
        go,
        loader,
        exact,
        exactRender,
        match,
        pattern,
        path: getPath,
        routes,
        outlet,
        render,
        parent,
        inputParams:
          inputParams ??
          ('inputParams' in parent ? parent.inputParams : undefined),
        reatomRoute,
      } as RouteExt
    }) as RouteAtom

    parent.routes[name] = urlAtom.routes[name] = routeAtom

    if (inputParams && inputParams !== parentInputParams) {
      routeAtom.extend(
        withMiddleware(() => (next, ...params) => {
          let state
          try {
            return (state = next(...params))
          } catch (error) {
            state = null
            throw error
          } finally {
            if (state === null && inputParams() !== null) {
              inputParams.set(null)
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
