import type { Action, Atom, Computed } from '../core'
import { action, atom, computed, named } from '../core'
import type { AsyncExt } from '../async'
import { withAsync } from '../async'
import { wrap } from '../methods'
import type { Rec } from '../utils'
import type {
  LinkedListAtom,
  LinkedListViewAtom,
  LinkedListViewState,
  LLNode,
} from './reatomLinkedList'

export interface InfinityListAtom<Node extends LLNode> {
  offset: Atom<number>
  limit: Atom<number>

  view: LinkedListViewAtom<Node>
  items: Computed<Array<Node>>

  topCount: Computed<number>
  bottomCount: Computed<number>
  totalSize: Computed<number>

  hasMore: Atom<boolean>
  isEnd: Computed<boolean>
}

export interface InfinityListFetcherAtom<Node extends LLNode>
  extends InfinityListAtom<Node> {
  loadMore: Action<[], Promise<void>> & AsyncExt<[], void>
  isLoading: Computed<boolean>
}

export function reatomInfinityList<
  Params extends any[],
  Node extends Rec,
  Key extends keyof Node,
>(
  list: LinkedListAtom<Params, Node, Key>,
  options?: {
    limit?: number
    name?: string
  },
): InfinityListAtom<LLNode<Node>>

export function reatomInfinityList<
  Params extends any[],
  Node extends Rec,
  Key extends keyof Node,
>(
  list: LinkedListAtom<Params, Node, Key>,
  options: {
    limit?: number
    name?: string
    fetcher: (offset: number, limit: number) => Promise<Array<Params>>
  },
): InfinityListFetcherAtom<LLNode<Node>>

export function reatomInfinityList<
  Params extends any[],
  Node extends Rec,
  Key extends keyof Node,
>(
  list: LinkedListAtom<Params, Node, Key>,
  options: {
    limit?: number
    name?: string
    fetcher?: (offset: number, limit: number) => Promise<Array<Params>>
  } = {},
): InfinityListAtom<LLNode<Node>> | InfinityListFetcherAtom<LLNode<Node>> {
  const _name = options.name ?? named('infinityList')
  const initialLimit = options.limit ?? 20
  const userFetcher = options.fetcher

  const offset = atom(0, `${_name}.offset`)
  const limit = atom(initialLimit, `${_name}.limit`)

  const view = list.reatomView(
    () => ({ offset: offset(), limit: limit() }),
    `${_name}.view`,
  )

  const items = view.items

  const topCount = computed(
    () => view().offset,
    `${_name}.topCount`,
  )

  const bottomCount = computed(
    () => {
      const viewState = view()
      return viewState.totalSize - viewState.offset - viewState.items.length
    },
    `${_name}.bottomCount`,
  )

  const totalSize = computed(
    () => view().totalSize,
    `${_name}.totalSize`,
  )

  const hasMore = atom(true, `${_name}.hasMore`)

  const isEnd = computed(() => {
    const viewState = view()
    const viewportEnd = viewState.offset + viewState.items.length
    const reachedListEnd = viewportEnd >= viewState.totalSize
    return !hasMore() && reachedListEnd
  }, `${_name}.isEnd`)

  const base: InfinityListAtom<LLNode<Node>> = {
    offset,
    limit,
    view,
    items,
    topCount,
    bottomCount,
    totalSize,
    hasMore,
    isEnd,
  }

  if (!userFetcher) return base

  const loadMore = action(async (): Promise<void> => {
    if (!hasMore()) return

    const currentSize = list().size
    const currentLimit = limit()
    const fetchedParams = await wrap(userFetcher(currentSize, currentLimit))

    list.createMany(fetchedParams)

    if (fetchedParams.length < currentLimit) {
      hasMore.set(false)
    }
  }, `${_name}.loadMore`).extend(withAsync())

  const isLoading = computed(
    () => !loadMore.ready(),
    `${_name}.isLoading`,
  )

  return {
    ...base,
    loadMore,
    isLoading,
  } satisfies InfinityListFetcherAtom<LLNode<Node>>
}
