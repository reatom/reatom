import type { StandardSchemaV1 } from '@standard-schema/spec'

import {
  type AsyncDataExt,
  identity,
  noop,
  type Plain,
  type Rec,
  withAsyncData,
} from '../'
import type { Action, Computed } from '../core'
import { action, computed } from '../core'
import { peek } from '../methods'
import { urlAtom } from './url'

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

export interface RouteOptions<
  Path extends string,
  Params extends PathKeys<Path> = PathParams<Path>,
  Search extends Partial<Rec<string>> = {},
  LoaderParams = Plain<Params & Search>,
  Payload = LoaderParams,
> {
  path: Path

  params?: StandardSchemaV1<Params>

  search?: StandardSchemaV1<Search>

  loader?: (params: LoaderParams) => Promise<Payload>
}

export interface RouteMixin<
  Path extends string,
  Params extends PathKeys<Path> = PathParams<Path>,
> {
  /**
   * Create a sub-route by appending a path pattern to the current route.
   *
   * @example
   *   const usersRoute = route('users') // Creates /users route
   *   const userRoute = usersRoute.route(':userId') // Creates /users/:userId route
   *
   * @param path The sub-path pattern to append (e.g., 'users', ':userId',
   *   'posts/:postId?')
   * @returns A new RouteAtom for the combined path pattern
   */
  route<SubPath extends string>(
    path: SubPath,
  ): RouteAtom<
    `${Path}/${SubPath}`,
    // @ts-expect-error TODO
    Plain<Params & PathParams<SubPath>>,
    {}
  >

  /**
   * Create a sub-route with validation schemas for parameters and search
   * params.
   *
   * @example
   *   import { z } from 'zod'
   *
   *   const userRoute = urlAtom.route({
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
  route<
    SubPath extends string,
    SubParams extends PathKeys<SubPath> = PathParams<SubPath>,
    SubSearch extends Partial<Rec<string>> = {},
    Payload = Plain<Params & SubParams> &
      Plain<{} extends SubSearch ? SubSearch : never>,
  >(
    options: RouteOptions<
      SubPath,
      SubParams,
      SubSearch,
      Plain<Params & SubParams & SubSearch>,
      Payload
    >,
  ): RouteAtom<
    `${Path extends `${infer Path}?` ? Path : Path}/${SubPath}`,
    // @ts-expect-error TODO
    Plain<Params & SubParams>,
    Plain<{} extends SubSearch ? SubSearch : never>,
    Payload
  >
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
> extends Computed<null | Plain<Params & Search>>,
    RouteMixin<Path, Params> {
  go: Action<
    [params: MaybeVoid<Params & Search>, replace?: boolean], // Updated signature: single optional object argument
    URL
  >

  loader: RouteLoader<Plain<Params & Search>, Payload>

  exact: Computed<boolean>

  pattern: Path

  path: (params: MaybeVoid<Params & Search>) => string
}

const getPatternName = (part: string) => {
  const start = part.startsWith(':') ? 1 : 0
  const end = part.endsWith('?') ? -1 : undefined
  return start || end ? part.slice(start, end) : part
}

const createRouteFactory = (
  parent: Computed & { pattern: string; loader?: RouteLoader },
) => {
  return function route(
    pathOrOptions: string | RouteOptions<string, any, any, any>,
  ): RouteAtom<string> {
    const options =
      typeof pathOrOptions === 'string'
        ? { path: pathOrOptions }
        : pathOrOptions

    const {
      path: subPath,
      params: paramsSchema,
      search: searchSchema,
      loader: optionsLoader = identity,
    } = options

    if (subPath.startsWith('/')) {
      throw new Error(
        'Subpath should not start with "/", it included automatically',
      )
    }

    let parentPattern = parent.pattern

    for (const restricted of ['/', '?']) {
      if (parentPattern.endsWith(restricted)) {
        parentPattern = parentPattern.slice(0, -1)
      }
    }

    const pattern = `${parentPattern}/${subPath}`

    const name = `route#${pattern}`

    const hasOptionalPart = pattern.endsWith('?')

    const patternParts = pattern.split('/').filter(Boolean)

    const pathParamsCount = patternParts.filter((part) =>
      part.startsWith(':'),
    ).length

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

      // will be aborted after the route change
      if (!params) return new Promise(noop)

      const promise = optionsLoader(params)

      if (parent.loader) {
        await parent.loader()
      }

      const result = await promise
      return result
    }, `${name}.loader`).extend(withAsyncData()) as unknown as RouteLoader

    const exact = computed(() => {
      const params = routeAtom()

      if (params === null) return false

      const pathname = urlAtom().pathname || '/'

      if (!pathParamsCount && pattern === pathname) return true

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
      const newPath = getPath(params)

      return urlAtom.set((url) => new URL(newPath, url), replace)
    }, `${name}.go`)

    const routeAtom = computed((): null | Rec => {
      if (parent() === null) return null

      const url = peek(urlAtom)
      const pathname = url.pathname
      const params: Rec = {}

      const paths = pathname.split('/').filter(Boolean)

      for (let i = 0; i < patternParts.length; i++) {
        const part = patternParts[i]!
        const name = getPatternName(part)
        const pathPart = paths[i]

        if (i > paths.length || (i === paths.length && !hasOptionalPart)) {
          return null
        }

        if (part.startsWith(':')) {
          params[name] = pathPart
        } else if (name !== pathPart) {
          return null
        }
      }

      const result: Rec = {}

      try {
        if (paramsSchema) {
          Object.assign(result, validate(paramsSchema, params, 'params'))
        } else {
          Object.assign(result, params)
        }
        if (searchSchema) {
          const searchParams = Object.fromEntries(url.searchParams)
          Object.assign(result, validate(searchSchema, searchParams, 'search'))
        }
      } catch {
        return null
      }

      return result
    }, name).extend((target) => ({
      go,
      loader,
      exact,
      pattern,
      path: getPath,
      route: createRouteFactory(target as RouteAtom),
    })) as RouteAtom

    return routeAtom
  }
}

export let route = createRouteFactory(urlAtom as any) as RouteMixin<''>['route']
