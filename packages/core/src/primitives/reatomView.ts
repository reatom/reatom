import type { Computed } from '../core'
import { computed, named, ReatomError } from '../core'
import { epochOf, isLinkedListBatching } from './linkedListBatching'
import type {
  LinkedList,
  LinkedListSymbols,
  LL_NEXT,
  LL_PREV,
  LLNode,
} from './reatomLinkedList'
import { isLinkedListAtom } from './reatomLinkedList'

/**
 * Atoms that drive a view window. Both fields are required and must be atoms,
 * so a forgotten field or a plain number read once is a type error.
 */
export interface ViewLens {
  /** Index of the first item. Floored to an integer, clamped to `[0, size]`. */
  offset: Computed<number>
  /** Maximum count of items. Floored to an integer, `Infinity` takes the rest. */
  limit: Computed<number>
}

export interface ViewState<Item> {
  /** Items of the window in source order, reused while their identity holds. */
  items: ReadonlyArray<Item>
  /** Normalized and clamped offset, the source index of `items[0]`. */
  offset: number
  /** Size of the whole source. */
  size: number
}

export interface ViewAtom<Item> extends Computed<ViewState<Item>> {
  /** Notifies only when the window items change, not on `size` or `offset`. */
  items: Computed<ReadonlyArray<Item>>
}

export type LinkedListViewSource<Node extends LLNode = LLNode> = Computed<
  LinkedList<Node>
> &
  LinkedListSymbols & { __reatomLinkedList: true }

interface LinkedListCursor {
  list: LinkedList
  offset: number
  node: null | LLNode
}

const linkedListCursors = new WeakMap<ViewState<unknown>, LinkedListCursor>()

const normalizeLensValue = (
  value: unknown,
  field: keyof ViewLens,
  viewName: string,
): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new ReatomError(
      `The "${field}" of the view "${viewName}" should be a number, received "${String(value)}".`,
    )
  }
  return value > 0 ? Math.floor(value) : 0
}

// A replaced list restarts its versions, so the epoch has to match as well.
const isAppendOnlyUpdate = (previous: LinkedList, next: LinkedList) =>
  epochOf(next) === epochOf(previous) &&
  next.version === previous.version + 1 &&
  next.changes.every(({ kind }) => kind === 'create' || kind === 'createMany')

const isCursorReusable = (
  cursor: undefined | LinkedListCursor,
  list: LinkedList,
): cursor is LinkedListCursor & { node: LLNode } =>
  cursor !== undefined &&
  cursor.node !== null &&
  (cursor.list === list || isAppendOnlyUpdate(cursor.list, list))

const findLinkedListNode = (
  list: LinkedList,
  index: number,
  cursor: undefined | LinkedListCursor,
): null | LLNode => {
  if (index >= list.size) return null

  const LL_NEXT: LL_NEXT = list.LL_NEXT
  const LL_PREV: LL_PREV = list.LL_PREV
  const stepsFromHead = index
  const stepsFromTail = list.size - 1 - index
  const isCursorValid = isCursorReusable(cursor, list)
  const stepsFromCursor = isCursorValid
    ? Math.abs(index - cursor.offset)
    : Infinity

  let node: LLNode
  let position: number
  if (stepsFromCursor <= stepsFromHead && stepsFromCursor <= stepsFromTail) {
    node = cursor!.node!
    position = cursor!.offset
  } else if (stepsFromHead <= stepsFromTail) {
    node = list.head!
    position = 0
  } else {
    node = list.tail!
    position = list.size - 1
  }

  while (position < index) {
    node = node[LL_NEXT]!
    position++
  }
  while (position > index) {
    node = node[LL_PREV]!
    position--
  }

  return node
}

const collectLinkedListItems = (
  list: LinkedList,
  startNode: null | LLNode,
  limit: number,
): Array<LLNode> => {
  const items: Array<LLNode> = []
  for (
    let node = startNode;
    node !== null && items.length < limit;
    node = node[list.LL_NEXT]
  ) {
    items.push(node)
  }
  return items
}

const isSameItems = (
  prevItems: ReadonlyArray<unknown>,
  nextItems: ReadonlyArray<unknown>,
): boolean =>
  prevItems.length === nextItems.length &&
  prevItems.every((item, index) => item === nextItems[index])

/**
 * Creates a reactive window over a sequence: the items from `offset`, at most
 * `limit` of them.
 *
 * @remarks
 *   The source is a `reatomLinkedList`, a derived list from `reatomMap`, or any
 *   atom of an array (for example a computed of flattened rows). The view never
 *   copies the source: `items` holds the same node objects, so a row keeps its
 *   identity while the window slides.
 *
 *   Lens values are floored to integers and clamped: a negative value becomes
 *   `0`, an offset past the end becomes `size`, and an `Infinity` limit takes
 *   the rest. `NaN` throws. `items` reuses the previous array while the nodes
 *   in the window are the same, so an append below the fold does not notify
 *   `view.items`.
 *
 *   For linked lists, finding the first node walks from the nearest of the head,
 *   the tail, or the previous window start, so scrolling costs the scroll
 *   distance and a tail window costs its own length. The previous window start
 *   stays usable while the list is unchanged or only appended to by one update
 *   (`create`, `createMany`), the usual pattern of a log feed. After any other
 *   change it is O(min(offset, size - offset)) link hops. It is not a time or
 *   key index: map a time range to an index in the model that owns the order.
 *
 *   For scroll-driven windows with pixel geometry, overscan, and scroll
 *   anchoring, use `reatomVirtual`, which drives a view from scroll state.
 *
 *   Recomputing a view of a linked list inside `list.batch()` throws, like
 *   `reatomMap`, because the links are mutated in place until the batch ends.
 * @example
 *   const logs = reatomLinkedList((message: string) => ({ message }), 'logs')
 *   const firstRow = atom(0, 'firstRow')
 *   const rowsPerScreen = atom(20, 'rowsPerScreen')
 *   const visibleLogs = reatomView(
 *     logs,
 *     { offset: firstRow, limit: rowsPerScreen },
 *     'visibleLogs',
 *   )
 *
 *   effect(() => render(visibleLogs.items()))
 *   firstRow.set(Math.floor(scrollTop / rowHeight))
 *
 *   const { offset, size, items } = visibleLogs()
 *   const rowsBelow = size - offset - items.length
 *
 * @example
 *   // Window over a derived row sequence without a second store
 *   const expandedRows = computed(() => flattenTree(tree(), expanded()))
 *   const visibleRows = reatomView(expandedRows, {
 *     offset: firstRow,
 *     limit: rowsPerScreen,
 *   })
 */
export function reatomView<Node extends LLNode>(
  source: LinkedListViewSource<Node>,
  lens: ViewLens,
  name?: string,
): ViewAtom<Node>

export function reatomView<Item>(
  source: Computed<ReadonlyArray<Item>>,
  lens: ViewLens,
  name?: string,
): ViewAtom<Item>

export function reatomView(
  source: LinkedListViewSource | Computed<ReadonlyArray<unknown>>,
  lens: ViewLens,
  name: string = named(`${source.name}.view`),
): ViewAtom<unknown> {
  const isLinkedListSource = isLinkedListAtom(source)

  const view = computed(
    (prevState?: ViewState<unknown>): ViewState<unknown> => {
      const sourceState = source()
      const offsetValue = lens.offset()
      const limitValue = lens.limit()

      if (isLinkedListSource && isLinkedListBatching(source)) {
        throw new ReatomError(
          `Can't compute the view "${name}" inside the batching of its linked list.`,
        )
      }

      const requestedOffset = normalizeLensValue(offsetValue, 'offset', name)
      const limit = normalizeLensValue(limitValue, 'limit', name)

      let size: number
      let offset: number
      let items: ReadonlyArray<unknown>
      let cursor: undefined | LinkedListCursor

      if (isLinkedListSource) {
        const list = sourceState as LinkedList
        size = list.size
        offset = Math.min(requestedOffset, size)
        const prevCursor = prevState && linkedListCursors.get(prevState)
        const startNode = findLinkedListNode(list, offset, prevCursor)
        items = collectLinkedListItems(list, startNode, limit)
        cursor = { list, offset, node: startNode }
      } else {
        const array = sourceState as ReadonlyArray<unknown>
        size = array.length
        offset = Math.min(requestedOffset, size)
        items = array.slice(offset, offset + limit)
      }

      let state: ViewState<unknown> = { items, offset, size }
      if (prevState && isSameItems(prevState.items, items)) {
        state =
          prevState.offset === offset && prevState.size === size
            ? prevState
            : { items: prevState.items, offset, size }
      }

      if (cursor) linkedListCursors.set(state, cursor)

      return state
    },
    name,
  )

  const items = computed(() => view().items, `${name}.items`)

  return view.extend(() => ({ items }))
}
