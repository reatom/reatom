import type { AtomLike } from '@reatom/core'
import { _enqueue, context, urlAtom } from '@reatom/core'

import type { OtlpAttrValue } from '../toOtlpValue.ts'
import { createChildContext } from '../traceContext.ts'

export type RootKind = 'route' | 'mount' | 'action' | 'atom'

export const DEFAULT_ROOTS: readonly RootKind[] = [
  'route',
  'mount',
  'action',
  'atom',
]

export type RouteMode = 'child' | 'link'

export type TracePair = { traceId: string; spanId: string }

export type OtlpSpanLink = {
  traceId: string
  spanId: string
  attributes?: Record<string, OtlpAttrValue>
}

export const ROUTE_PAGE_LINK_REASON = 'route.page'

export const routePageLink = (page: TracePair): OtlpSpanLink => ({
  traceId: page.traceId,
  spanId: page.spanId,
  attributes: { 'reatom.link.reason': ROUTE_PAGE_LINK_REASON },
})

export type RouteLike = AtomLike & {
  name: string
  pattern: string
  match: () => boolean
  loader: {
    ready: {
      (): boolean
      subscribe: (cb: () => void) => () => void
    }
  }
  go: unknown
  parent?: unknown
}

export const isRouteAtom = (target: unknown): target is RouteLike => {
  if (
    target === null ||
    (typeof target !== 'object' && typeof target !== 'function')
  ) {
    return false
  }
  return 'pattern' in target && 'loader' in target && 'go' in target
}

const sameSet = (left: Set<RouteLike>, right: Set<RouteLike>) => {
  if (left.size !== right.size) return false
  for (const route of left) if (!right.has(route)) return false
  return true
}

const parentOf = (route: RouteLike): unknown =>
  'parent' in route ? route.parent : undefined

const boundingDepth = (route: RouteLike): number => {
  let depth = 0
  let current = parentOf(route)
  while (
    current &&
    current !== urlAtom &&
    typeof current === 'object' &&
    'parent' in current
  ) {
    depth++
    current = (current as { parent?: unknown }).parent
  }
  return depth
}

const leafOf = (routes: readonly RouteLike[]): RouteLike =>
  routes.reduce((best, route) => {
    const depth = boundingDepth(route)
    const bestDepth = boundingDepth(best)
    if (depth > bestDepth) return route
    if (depth === bestDepth && route.pattern.length > best.pattern.length) {
      return route
    }
    return best
  })

const leafName = (route: RouteLike): string => {
  const raw = typeof route.name === 'string' ? route.name.trim() : ''
  const stripped = raw.replace(/#[^.#]+/g, '')
  return stripped.length > 0 ? stripped : route.pattern
}

const isMatched = (route: RouteLike): boolean => {
  try {
    return route.match()
  } catch {
    return false
  }
}

const loadersReady = (routes: readonly RouteLike[]): boolean =>
  routes.every((route) => {
    try {
      return route.loader.ready()
    } catch {
      return true
    }
  })

export type RouteSpanCommit = {
  context: TracePair
  parent?: TracePair
  name: string
  startTimeMs: number
  endTimeMs: number
  attributes?: Record<string, OtlpAttrValue>
}

export interface CreateRouteRootMachineInput {
  isActive: () => boolean
  isEnabled: () => boolean
  optionsOf: (target: AtomLike) => { boundary?: boolean } | undefined
  sessionContext: TracePair
  mintPageTrace: (name: string) => TracePair
  setTrace: (context: TracePair) => void
  commitSpan: (span: RouteSpanCommit) => void
}

export const createRouteRootMachine = ({
  isActive,
  isEnabled,
  optionsOf,
  sessionContext,
  mintPageTrace,
  setTrace,
  commitSpan,
}: CreateRouteRootMachineInput) => {
  const known = new Set<RouteLike>()
  let boundingSet = new Set<RouteLike>()
  let overlaySet = new Set<RouteLike>()
  let pageTrace: TracePair | undefined
  let pending:
    | {
        context: TracePair
        name: string
        startTimeMs: number
        bounding: RouteLike[]
        unsubs: Array<() => void>
        committed: boolean
      }
    | undefined
  let urlUnsub: (() => void) | undefined
  let syncing = false
  let started = false

  const isBounding = (route: RouteLike): boolean =>
    optionsOf(route)?.boundary !== false

  const commitPending = () => {
    if (!pending || pending.committed) return
    pending.committed = true
    for (const unsub of pending.unsubs) unsub()
    pending.unsubs = []
    const endTimeMs = Date.now()
    commitSpan({
      context: pending.context,
      name: pending.name,
      startTimeMs: pending.startTimeMs,
      endTimeMs,
      attributes: {
        'reatom.kind': 'route',
        'reatom.parent.reason': 'root',
      },
    })
  }

  const watchLoaders = () => {
    if (!pending || pending.committed) return
    const bounding = pending.bounding
    const check = () => {
      if (!pending || pending.committed) return
      if (loadersReady(bounding)) commitPending()
    }
    for (const route of bounding) {
      try {
        pending.unsubs.push(route.loader.ready.subscribe(check))
      } catch {
        // ready() may be missing on a duck-typed target.
      }
    }
    _enqueue(check, 'hook')
  }

  const emitOverlay = (route: RouteLike) => {
    const parent = pageTrace ?? sessionContext
    const child = createChildContext(parent)
    const now = Date.now()
    commitSpan({
      context: child,
      parent,
      name: `route ${leafName(route)}`,
      startTimeMs: now,
      endTimeMs: now,
      attributes: {
        'reatom.kind': 'route',
        'reatom.parent.reason': pageTrace ? 'route' : 'session',
      },
    })
  }

  const cutPage = (bounding: RouteLike[], previous: Set<RouteLike>) => {
    commitPending()
    const newly = bounding.filter((route) => !previous.has(route))
    const leaf = leafOf(newly.length > 0 ? newly : bounding)
    const name = `route ${leafName(leaf)}`
    const context = mintPageTrace(name)
    pageTrace = context
    try {
      setTrace(context)
    } catch {
      // No frame yet; instance pageTrace still serves later top-level actions.
    }
    pending = {
      context,
      name,
      startTimeMs: Date.now(),
      bounding: [...bounding],
      unsubs: [],
      committed: false,
    }
    watchLoaders()
  }

  const sync = () => {
    if (!isActive() || !isEnabled() || syncing) return
    syncing = true
    try {
      start()
      for (const route of Object.values(urlAtom.routes)) {
        if (isRouteAtom(route)) known.add(route)
      }
      const bounding: RouteLike[] = []
      const overlays: RouteLike[] = []
      for (const route of known) {
        if (!isMatched(route)) continue
        if (isBounding(route)) bounding.push(route)
        else overlays.push(route)
      }
      const nextBounding = new Set(bounding)
      if (bounding.length > 0 && !sameSet(nextBounding, boundingSet)) {
        cutPage(bounding, boundingSet)
      }
      boundingSet = nextBounding
      const nextOverlays = new Set(overlays)
      for (const route of overlays) {
        if (!overlaySet.has(route)) emitOverlay(route)
      }
      overlaySet = nextOverlays
    } finally {
      syncing = false
    }
  }

  const discover = (target: AtomLike) => {
    if (!isRouteAtom(target)) return
    known.add(target)
  }

  const closePendingIfReady = () => {
    if (!pending || pending.committed) return
    if (loadersReady(pending.bounding)) commitPending()
  }

  const start = () => {
    if (started) return
    started = true
    const listen = () => {
      urlUnsub = urlAtom.subscribe(() => {
        if (!syncing) sync()
      })
    }
    try {
      listen()
    } catch {
      try {
        context.start(listen)
      } catch {
        urlUnsub = undefined
        started = false
      }
    }
  }

  const dispose = () => {
    urlUnsub?.()
    urlUnsub = undefined
    started = false
    syncing = false
    commitPending()
    known.clear()
    boundingSet = new Set()
    overlaySet = new Set()
    pageTrace = undefined
    pending = undefined
  }

  return {
    discover,
    sync,
    closePendingIfReady,
    pageTrace: () => pageTrace,
    start,
    dispose,
  }
}
