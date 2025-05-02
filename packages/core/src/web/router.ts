/* eslint-disable @typescript-eslint/ban-types */

import {
  action,
  type Rec,
  type Action,
  type Atom,
  atom,
  isShallowEqual,
  type Ctx,
  type Unsubscribe,
  withInit,
  abortCauseContext,
  toAbortError,
  __count,
  type Plain,
  throwReatomError,
} from '../';
import { urlAtom } from './';

type RoutePattern = `${'' | ':'}${string}${'' | '?'}`;

interface RouteConfig {
  [key: RoutePattern]: RouteConfig;
  // Route?: never;
}

type _PathParams<Path extends string = string> =
  Path extends `:${infer Param}/${infer Rest}`
    ? { [key in Param]: string } & _PathParams<Rest>
    : Path extends `:${infer Param}?`
      ? { [key in Param]?: string }
      : Path extends `:${infer Param}`
        ? { [key in Param]: string }
        : Path extends `${string}/${infer Rest}`
          ? _PathParams<Rest>
          : {};
type PathParams<Path extends string = string> = Plain<_PathParams<Path>>;

interface Route<Path extends string = string>
  extends Atom<null | PathParams<Path>> {
  go: Action<
    Path extends `${string}:${string}`
      ? [pathParams: PathParams<Path>, searchParams?: Rec]
      : [pathParams?: void, searchParams?: Rec],
    void
  >;

  onMatch: (
    cb: (
      ctx: Ctx,
      params: PathParams<Path>,
    ) => void | Unsubscribe | Promise<any>,
  ) => Unsubscribe;

  pattern: Path;

  path: (
    params: Path extends `${string}:${string}` ? PathParams<Path> : void,
  ) => string;

  exact: Atom<boolean>;
}

type Routes<T extends RouteConfig = RouteConfig, Parent extends string = ''> = {
  [K in keyof T]: K extends RoutePattern
    ? Routes<T[K], `${Parent}/${K}`> & { Route: Route<`${Parent}/${K}`> }
    : never;
} & {};

const getPatternName = (part: string) => {
  const start = part.startsWith(':') ? 1 : 0;
  const end = part.endsWith('?') ? -1 : undefined;
  return start || end ? part.slice(start, end) : part;
};

const urlPaths = atom((ctx, state: Array<string> = []) => {
  const pathname = ctx.spy(urlAtom).pathname.slice(1);
  return pathname === state.join('/') ? state : pathname.split('/');
}, '_urlPaths');

const reatomRoute = <Path extends string = string>(
  pattern: Path,
  config: RouteConfig,
): Route<Path> => {
  const name = `_route#${pattern}`;

  const patternPaths = pattern.split('/').slice(1);
  const patternPathsLength = patternPaths[patternPaths.length - 1]?.endsWith(
    '?',
  )
    ? patternPaths.length - 1
    : patternPaths.length;

  const path = ((params: Rec = {}) => {
    let path = '';
    for (const part of patternPaths) {
      if (part.startsWith(':')) {
        const paramName = getPatternName(part);
        const isOptional = part.endsWith('?');
        if (paramName in params) {
          path += `/${params[paramName]}`;
        } else if (!isOptional) {
          throw new TypeError(`Missing param "${paramName}"`);
        }
      } else {
        path += `/${part}`;
      }
    }
    return path;
  }) as Route['path'];

  const go = action((ctx, params = {} as any, searchParams = {} as any) => {
    urlAtom(ctx, (url) => {
      const newUrl = new URL(path(params), url);
      Object.entries(searchParams).forEach(([key, value]) => {
        newUrl.searchParams.set(key, value);
      });
      return newUrl;
    });
  }, `${name}.go`) as Route['go'];

  const route = atom((ctx, state?: Rec) => {
    const paths = ctx.spy(urlPaths);

    if (paths.length < patternPathsLength) return null;

    const params = {} as Rec;
    for (let i = 0; i < patternPaths.length; i++) {
      const part = patternPaths[i];
      const name = getPatternName(part);
      const path = paths[i];
      if (part.startsWith(':')) {
        if (path in config) {
          return null;
        }
        params[name] = path;
      } else if (name !== path) {
        return null;
      }
    }

    return isShallowEqual(state, params) ? state : params;
  }, name);
  // Make the atom hot to allow hooking it with `onChange` without subscription.
  urlAtom.onChange((ctx) => ctx.get(route));

  const exact = atom((ctx) => {
    const params = ctx.spy(route);
    if (!params) return false;
    const paths = ctx.spy(urlPaths);
    return (
      paths.length === patternPathsLength ||
      paths.length === patternPaths.length
    );
  }, `${name}.exact`);

  // TODO @artalar handle multiple ctx
  let lastCtx: Ctx;
  route.pipe(withInit((ctx, init) => init((lastCtx = ctx))));
  const onMatch = ((cb) => {
    const handler = action(
      (ctx, params) => {
        if (params) {
          const controller = new AbortController();
          abortCauseContext.set(ctx.cause, controller);
          const cleanup = cb(ctx, params);

          const un = route.onChange((ctx, params) => {
            if (!params) {
              un();

              // FIXME @artalar remove the condition after release and always do the abort
              if (typeof cleanup === 'function' || cleanup instanceof Promise) {
                controller.abort(toAbortError(`route "${name}" unmount`));
              }

              if (typeof cleanup === 'function') {
                cleanup();
              }
            }
          });
        }
      },
      __count(`${route.__reatom.name}._onMatch`),
    );

    if (lastCtx) handler(lastCtx, lastCtx.get(route));

    return route.onChange(handler);
  }) as Route['onMatch'];

  return Object.assign(route, { go, onMatch, path, pattern, exact }) as any;
};

const mapRoutes = (config: RouteConfig, parent: string): Routes => {
  const routes = {} as Routes;

  for (const [pattern, value] of Object.entries(config)) {
    throwReatomError(pattern === 'Route', `Pattern "Route" is reserved`);

    // @ts-expect-error TODO
    routes[pattern] = Object.assign(mapRoutes(value, `${parent}/${pattern}`), {
      Route: reatomRoute(`${parent}/${pattern}`, config),
    });
  }

  return routes as Rec as Routes;
};

export const reatomRoutes = <T extends RouteConfig>(
  config: T,
  // for eslint
  name?: string,
): Routes<T> & { Root: Route<'/'> } =>
  ({
    ...mapRoutes(config, ''),
    Root: reatomRoute('/', {}),
  }) as Routes<T> & { Root: Route<'/'> };
