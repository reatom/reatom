import type { StandardSchemaV1 } from '@standard-schema/spec'

import type { AsyncDataExt, Plain, Rec } from '../'
import type { Action, Atom, Computed } from '../core'

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
   * Schema to validate and transform path parameters.
   *
   * Accepts one of:
   *
   * - **Standard Schema** (Zod, Valibot, etc.) — one-directional validation.
   *   `go()` accepts raw string params, the schema parses them on URL read.
   * - **Function** `(params) => result | null` — custom validator, return `null`
   *   to unmatch the route.
   * - **{@link Codec}** `{ decode, encode }` — bidirectional transform. `go()`
   *   accepts typed (Output) params, `encode` writes URL strings, `decode`
   *   reads them back. Decode errors cause unmatch.
   *
   * @example
   *   // Standard Schema
   *   params: z.object({
   *     userId: z.string().regex(/^\d+$/).transform(Number),
   *   })
   *
   * @example
   *   // Codec — go() accepts numbers, encode converts to strings
   *   params: {
   *   decode: (input) => ({ id: Number(input.id) }),
   *   encode: (output) => ({ id: String(output.id) }),
   *   }
   */
  params?:
    | StandardSchemaV1<ParamsInput, ParamsOutput>
    | ((params: ParamsInput) => null | ParamsOutput)
    | Codec<ParamsInput, ParamsOutput>

  /**
   * Schema to validate and transform search/query parameters.
   *
   * Accepts one of:
   *
   * - **Standard Schema** (Zod, Valibot, etc.) — one-directional validation.
   *   `go()` accepts raw string params, the schema parses them on URL read.
   * - **{@link Codec}** `{ decode, encode }` — bidirectional transform. `go()`
   *   accepts typed (Output) params, `encode` writes URL strings, `decode`
   *   reads them back. Decode errors cause unmatch.
   *
   * Note: All search parameters should be optional in the schema.
   *
   * @example
   *   // Standard Schema
   *   search: z.object({
   *     sort: z.enum(['asc', 'desc']).optional(),
   *     page: z.string().transform(Number).default('1'),
   *   })
   *
   * @example
   *   // Codec — go() accepts numbers, encode converts to strings
   *   search: {
   *   decode: (input) => ({ page: Number(input.page) }),
   *   encode: (output) => ({ page: String(output.page) }),
   *   }
   */
  search?:
    | StandardSchemaV1<SearchInput, SearchOutput>
    | Codec<SearchInput, SearchOutput>

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
   * When `true`, the route acts as a **layout** — its `render` fires on any
   * match (partial or exact) and wraps children through `outlet()`.
   *
   * When `false` (default), the route acts as a **feature/leaf** — `render`
   * only fires on exact URL matches. When a child route is active, `render`
   * returns `null` and children propagate through the outlet chain to the
   * nearest layout ancestor.
   *
   * @default false
   * @see RouteExt.exact
   */
  layout?: boolean

  /**
   * @deprecated Use `layout` instead (with inverted logic: `exactRender: true`
   *   = `layout: false`).
   */
  exactRender?: boolean
}

/**
 * Bidirectional transformer for route parameters.
 *
 * Unlike one-directional Standard Schema transforms, a Codec defines both
 * directions: raw URL strings to typed values (`decode`) and back (`encode`).
 *
 * When `decode` throws, the route is treated as unmatched (returns `null`).
 * Navigation tries `encode` first; if it throws on a Standard Schema (e.g. Zod
 * one-way `.transform()`), validation is used for path segments and search
 * keeps the `go()` argument keys. On a plain codec object, `encode` errors
 * propagate.
 *
 * @example
 *   // Inline codec for base64-encoded JSON in a path segment
 *   reatomRoute({
 *     path: 'data/:payload',
 *     params: {
 *       decode: (input) => ({
 *         payload: JSON.parse(atob(input.payload)),
 *       }),
 *       encode: (output) => ({
 *         payload: btoa(JSON.stringify(output.payload)),
 *       }),
 *     },
 *   })
 *
 * @example
 *   reatomRoute({
 *     path: 'items/:id',
 *     params: z.object({ id: z.stringbool() }),
 *   })
 */
export type Codec<Input, Output> = {
  decode: (input: Input) => Output
  encode: (output: Output) => Input
}

export type TrimPath<Path extends string> = Path extends `//${infer Path}`
  ? TrimPath<`/${Path}`>
  : Path

type NestedParamsOutput<
  ParentParams extends Rec,
  ChildParamsOutput extends Rec,
> = Plain<ParentParams & ChildParamsOutput>

export interface RouteMixin<
  Path extends string,
  Params extends PathKeys<Path> = PathParams<Path>,
  GoParams = Params,
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
    Plain<GoParams & PathParams<SubPath>>,
    {},
    PathParams<SubPath>,
    {}
  >

  /**
   * Create a sub-route with **{@link Codec}** for both params and search.
   *
   * `go()` and `path()` accept the codec's **Output** types — `encode` writes
   * URL-safe strings automatically.
   *
   * @example
   *   const route = parentRoute.reatomRoute({
   *     path: 'items/:id',
   *     params: {
   *       decode: (input) => ({ id: Number(input.id) }),
   *       encode: (output) => ({ id: String(output.id) }),
   *     },
   *     search: {
   *       decode: (input) => ({ page: Number(input.page) }),
   *       encode: (output) => ({ page: String(output.page) }),
   *     },
   *   })
   *   route.go({ id: 42, page: 3 })
   */
  reatomRoute<
    SubPath extends string = '',
    SubParamsInput extends PathKeys<SubPath> = PathParams<SubPath>,
    SubSearchInput extends Partial<Rec<string>> = {},
    SubParamsOutput extends Rec = SubParamsInput,
    SubSearchOutput extends Rec = SubSearchInput,
    LoaderParams = Plain<
      NestedParamsOutput<Params, SubParamsOutput> & SubSearchOutput
    >,
    Payload = LoaderParams,
  >(
    options: RouteOptions<
      SubPath,
      SubParamsInput,
      SubSearchInput,
      SubParamsOutput,
      SubSearchOutput,
      LoaderParams,
      Payload
    > & {
      params: Codec<SubParamsInput, SubParamsOutput>
      search: Codec<SubSearchInput, SubSearchOutput>
    },
    name?: string,
  ): RouteAtom<
    TrimPath<`${Path extends `${infer Path}?` ? Path : Path}/${SubPath}`>,
    // @ts-expect-error TODO
    Plain<NestedParamsOutput<Params, SubParamsOutput>>,
    Plain<SubSearchOutput>,
    Payload,
    Plain<GoParams & SubParamsOutput>,
    Plain<SubSearchOutput>,
    Plain<SubParamsOutput>,
    Plain<SubSearchOutput>
  >

  /** Create a sub-route with a **params {@link Codec}**. */
  reatomRoute<
    SubPath extends string = '',
    SubParamsInput extends PathKeys<SubPath> = PathParams<SubPath>,
    SubSearchInput extends Partial<Rec<string>> = {},
    SubParamsOutput extends Rec = SubParamsInput,
    SubSearchOutput extends Rec = SubSearchInput,
    LoaderParams = Plain<
      NestedParamsOutput<Params, SubParamsOutput> & SubSearchOutput
    >,
    Payload = LoaderParams,
  >(
    options: RouteOptions<
      SubPath,
      SubParamsInput,
      SubSearchInput,
      SubParamsOutput,
      SubSearchOutput,
      LoaderParams,
      Payload
    > & { params: Codec<SubParamsInput, SubParamsOutput> },
    name?: string,
  ): RouteAtom<
    TrimPath<`${Path extends `${infer Path}?` ? Path : Path}/${SubPath}`>,
    // @ts-expect-error TODO
    Plain<NestedParamsOutput<Params, SubParamsOutput>>,
    Plain<SubSearchOutput>,
    Payload,
    Plain<GoParams & SubParamsOutput>,
    Plain<SubSearchInput>,
    Plain<SubParamsOutput>,
    Plain<SubSearchInput>
  >

  /** Create a sub-route with a **search {@link Codec}**. */
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
    > & { search: Codec<SubSearchInput, SubSearchOutput> },
    name?: string,
  ): RouteAtom<
    TrimPath<`${Path extends `${infer Path}?` ? Path : Path}/${SubPath}`>,
    // @ts-expect-error TODO
    Plain<SubParamsOutput>,
    Plain<SubSearchOutput>,
    Payload,
    Plain<GoParams & SubParamsInput>,
    Plain<SubSearchOutput>,
    Plain<SubParamsInput>,
    Plain<SubSearchOutput>
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
   *     params: z.object({ id: z.number() }),
   *     search: z.object({ sort: z.enum(['asc', 'desc']).optional() }),
   *   })
   *
   *   userRoute.go({ id: 123, tab: 'profile' })
   */
  reatomRoute<
    SubPath extends string = '',
    SubParamsInput extends PathKeys<SubPath> = PathParams<SubPath>,
    SubSearchInput extends Partial<Rec<string>> = {},
    SubParamsOutput extends Rec = SubParamsInput,
    SubSearchOutput extends Rec = SubSearchInput,
    LoaderParams = Plain<
      NestedParamsOutput<Params, SubParamsOutput> & SubSearchOutput
    >,
    Payload = LoaderParams,
  >(
    options: RouteOptions<
      SubPath,
      SubParamsInput,
      SubSearchInput,
      SubParamsOutput,
      SubSearchOutput,
      LoaderParams,
      Payload
    > & {
      params: StandardSchemaV1<SubParamsInput, SubParamsOutput>
    },
    name?: string,
  ): RouteAtom<
    TrimPath<`${Path extends `${infer Path}?` ? Path : Path}/${SubPath}`>,
    // @ts-expect-error TODO
    Plain<NestedParamsOutput<Params, SubParamsOutput>>,
    Plain<SubSearchOutput>,
    Payload,
    Plain<GoParams & SubParamsOutput>,
    Plain<SubSearchInput>,
    Plain<SubParamsOutput>,
    Plain<SubSearchInput>
  >

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
    > & {
      params: (params: Params & SubParamsInput) => null | SubParamsOutput
    },
    name?: string,
  ): RouteAtom<
    TrimPath<`${Path extends `${infer Path}?` ? Path : Path}/${SubPath}`>,
    // @ts-expect-error TODO
    Plain<SubParamsOutput>,
    Plain<SubSearchOutput>,
    Payload,
    Plain<GoParams & SubParamsInput>,
    Plain<SubSearchInput>,
    Plain<SubParamsInput>,
    Plain<SubSearchInput>
  >

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
    Plain<GoParams & SubParamsInput>,
    Plain<SubSearchInput>,
    Plain<SubParamsInput>,
    Plain<SubSearchInput>
  >
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

/** Route navigation: `route.go(params)` and `route.go.relative(...)`. */
export interface RouteGo<
  GoParams = {},
  GoSearch = {},
  RelativeGoParams = GoParams,
  RelativeGoSearch = GoSearch,
> extends Action<
  [params: MaybeVoid<GoParams & GoSearch>, replace?: boolean],
  URL
> {
  relative: RouteGoRelative<RelativeGoParams, RelativeGoSearch>
}

/**
 * Relative navigation: `route.go.relative(params)` merges current parent params
 * then calls `go`. Accepts only this route's own path/search args (no parent
 * keys).
 */
export interface RouteGoRelative<
  RelativeGoParams = {},
  RelativeGoSearch = {},
> extends Action<
  [params?: MaybeVoid<RelativeGoParams & RelativeGoSearch>, replace?: boolean],
  URL
> {}

/** Route extension interface for route computed atom. */
export interface RouteExt<
  Path extends string = string,
  Params extends PathKeys<Path> = PathParams<Path>,
  Search extends Rec<string> = {},
  Payload = Plain<Params & Search>,
  GoParams = Params,
  GoSearch = Search,
  RelativeGoParams = GoParams,
  RelativeGoSearch = GoSearch,
> extends RouteMixin<Path, Params, GoParams> {
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
  go: RouteGo<GoParams, GoSearch, RelativeGoParams, RelativeGoSearch>

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

  layout: boolean

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
  path: (params: MaybeVoid<GoParams & GoSearch>) => string

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

  cachedParams: Atom<null | GoParams>

  /**
   * Builds only the pathname for this route branch (no search string).
   *
   * @internal
   */
  pathnameBuilder: (params: Rec) => string
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
  GoParams = ParamsOutput,
  GoSearch = SearchOutput,
  RelativeGoParams = GoParams,
  RelativeGoSearch = GoSearch,
>
  extends
    Computed<null | Plain<ParamsOutput & SearchOutput>>,
    RouteExt<
      Path,
      ParamsOutput,
      SearchOutput,
      Payload,
      GoParams,
      GoSearch,
      RelativeGoParams,
      RelativeGoSearch
    > {}
