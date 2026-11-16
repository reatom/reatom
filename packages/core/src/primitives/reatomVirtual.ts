import type { Action, Atom, AtomLike, Computed } from '../core'
import { action, atom, computed, isAtom, named, ReatomError } from '../core'
import { withConnectHook } from '../extensions'
import { effect, peek, wrap } from '../methods'
import type { Rec, Unsubscribe } from '../utils'
import { isObject } from '../utils'
import { isLinkedListBatching } from './linkedListBatching'
import type {
  LinkedList,
  LinkedListDerivedAtom,
  LLNode,
} from './reatomLinkedList'
import { isLinkedListAtom, reatomLinkedList } from './reatomLinkedList'
import type { LinkedListViewSource, ViewAtom } from './reatomView'
import { reatomView } from './reatomView'

/** Where `scrollToIndex` puts the item, like `scrollIntoView({ block })`. */
export type VirtualAlign = 'start' | 'center' | 'end' | 'nearest'

export interface VirtualOptions<Item> {
  /**
   * Size of an item along the scroll axis, in the units of `scrollOffset`
   * (usually CSS pixels). A number or number atom makes every item the same
   * size; an ordinary function estimates each item. `measure` corrects both.
   */
  itemSize: number | AtomLike<number, []> | ((item: Item) => number)
  /** Items rendered beyond each edge of the viewport. Defaults to `1`. */
  overscan?: number
  /**
   * Initial `viewportSize`, for a first render before `bindScroller`. Defaults
   * to `0`.
   */
  viewportSize?: number
  /**
   * Keeps the viewport at the end while `true`. A supplied atom also resumes
   * following on a native return to the bottom. Defaults to an own paused
   * atom.
   */
  stickToEnd?: Atom<boolean>
}

/** Sizes of the spacers that stand in for the items outside the window. */
export interface VirtualPadding {
  before: number
  after: number
}

export interface VirtualSlot<Item> {
  item: Item
}

export type VirtualMapAtom<Item, T extends Rec> = LinkedListDerivedAtom<
  LLNode<VirtualSlot<Item>>,
  LLNode<T>
>

export interface VirtualAtom<Item> extends ViewAtom<Item> {
  /**
   * Distance from the start of the content to the start of the viewport.
   * Clamped to the scrollable range like `element.scrollTop`, so a shrink keeps
   * the clamped value. Pinned to the end while `stickToEnd` is `true`, and
   * turning it off keeps that position.
   */
  scrollOffset: Computed<number>
  /**
   * Scrolls to `offset`, like `element.scrollTo({ top })`, and returns the
   * clamped `scrollOffset`. `bindScroller` calls it on every scroll event.
   */
  scrollTo: Action<[offset: number], number>
  /** Size of the visible area along the scroll axis. */
  viewportSize: Atom<number>
  /**
   * Pins `scrollOffset` to the end, for live logs and chats. A user scroll away
   * from the end through `bindScroller`, or a `scrollToIndex` before the end,
   * sets it to `false`. With a supplied `options.stickToEnd`, a native scroll
   * down to the bottom resumes it; model navigation to the bottom does not
   * resume a paused list.
   */
  stickToEnd: Atom<boolean>
  /** Size of the whole content. */
  totalSize: Computed<number>
  /** Spacer sizes before and after the rendered items. */
  padding: Computed<VirtualPadding>
  /**
   * The `top` and `bottom` of a `position: sticky` element that wraps the
   * rendered items: `viewportSize - renderedSize`, at most `0`. The rendered
   * block then sticks to an edge of the viewport instead of scrolling away
   * while the window is being updated, so a fast scroll never shows a blank
   * area.
   */
  stickyInset: Computed<number>
  /**
   * Records the real size of an item, for example from a `ResizeObserver`. When
   * the item starts above the viewport, `scrollOffset` moves by the difference,
   * so the visible items stay in place. The layout is rebuilt once for all the
   * measurements of an update.
   */
  measure: Action<[item: Item, size: number], void>
  /** Scrolls to the item at `index`. `align` defaults to `start`. */
  scrollToIndex: Action<[index: number, align?: VirtualAlign], void>
  /**
   * A linked list of `render(item)` for the window items. An item keeps its
   * rendered node while it stays in the window, so `@reatom/jsx` moves DOM
   * nodes instead of recreating them on every scroll step. The list syncs while
   * it has a subscriber and empties without one.
   */
  reatomMap: <T extends Rec>(
    render: (item: Item) => T,
    name?: string,
  ) => VirtualMapAtom<Item, T>
  /**
   * Connects a vertical scroll container: its scroll position and height feed
   * the model, and programmatic changes of `scrollOffset` scroll it. Sets
   * `overflow-anchor: none`, because the model anchors the content itself.
   * Returns the cleanup, so it fits a JSX `ref` directly.
   */
  bindScroller: (scroller: HTMLElement) => Unsubscribe
}

interface VirtualLayout {
  count: number
  total: number
  /** Start of the item at `index`; `startOf(count)` is the total size. */
  startOf: (index: number) => number
  /** How many items end at or before `offset`: the first index visible there. */
  countEndedBy: (offset: number) => number
  /** How many items start before `offset`. */
  countStartedBefore: (offset: number) => number
}

interface MeasuredSizes {
  objects: WeakMap<object, number>
  primitives: Map<unknown, number>
  hasUniformDelta: boolean
}

interface VirtualWindow {
  offset: number
  limit: number
}

interface ScrollRequest {
  offset: number
}

interface ScrollState {
  offset: number
  request: ScrollRequest
  /** Inputs of the anchor: it is comparable only for the same source state. */
  source: unknown
  sizes: MeasuredSizes
  /** Index and start of the first item that starts at or after `offset`. */
  anchor: number
  anchorStart: number
}

const uniformLayout = (count: number, size: number): VirtualLayout => ({
  count,
  total: count * size,
  startOf: (index) => index * size,
  countEndedBy: (offset) => Math.min(count, Math.floor(offset / size)),
  countStartedBefore: (offset) => Math.min(count, Math.ceil(offset / size)),
})

const variableLayout = (starts: Float64Array): VirtualLayout => {
  const count = starts.length - 1
  const firstIndexAbove = (offset: number, isInclusive: boolean) => {
    let low = 0
    let high = count + 1
    while (low < high) {
      const middle = (low + high) >>> 1
      const start = starts[middle]!
      if (isInclusive ? start <= offset : start < offset) low = middle + 1
      else high = middle
    }
    return low
  }
  return {
    count,
    total: starts[count]!,
    startOf: (index) => starts[index]!,
    countEndedBy: (offset) =>
      Math.min(count, firstIndexAbove(offset, true) - 1),
    countStartedBefore: (offset) =>
      Math.min(count, firstIndexAbove(offset, false)),
  }
}

const measuredSizesOf = (
  sizes: MeasuredSizes,
  item: unknown,
): {
  get: (item: unknown) => undefined | number
  set: (item: unknown, size: number) => unknown
} =>
  isObject(item) || typeof item === 'function'
    ? (sizes.objects as WeakMap<any, number>)
    : sizes.primitives

const isSize = (value: unknown): value is number =>
  typeof value === 'number' && value >= 0 && value !== Infinity

const isSameWindow = (
  prevWindow: undefined | VirtualWindow,
  offset: number,
  limit: number,
): prevWindow is VirtualWindow =>
  prevWindow?.offset === offset && prevWindow.limit === limit

/**
 * Virtualized rendering state over a sequence: a `reatomView` window driven by
 * scroll geometry instead of raw indexes.
 *
 * @remarks
 *   The result is the view itself (`virtual()` is `{ items, offset, size }`,
 *   `virtual.items` notifies only when the rendered items change) plus the
 *   geometry to render it: spacer `padding`, `totalSize`, and `stickyInset` for
 *   the inverse sticky technique. The source is the same as for `reatomView`: a
 *   `reatomLinkedList`, a `reatomMap` list, or an atom of an array.
 *
 *   Sizes start from `itemSize` and are corrected by `measure`. With a number or
 *   number atom and no measured differences, every lookup is O(1) arithmetic
 *   and a source change costs nothing beyond the view. Otherwise a source or
 *   size change rebuilds a prefix-sum array in O(n), and a scroll costs O(log
 *   n). Measured sizes are kept per item identity, so they survive filtering
 *   and reordering.
 *
 *   The model owns scroll anchoring: a size change above the viewport moves
 *   `scrollOffset` by the same amount. `bindScroller` turns off the browser's
 *   own anchoring, which cannot tell which of the swapped nodes to keep in
 *   place.
 *
 *   Read it outside `list.batch()` of a linked list source, like `reatomView`.
 * @example
 *   const rows = computed(() => flattenTree(tree(), expanded()), 'rows')
 *   const virtual = reatomVirtual(rows, { itemSize: 24, overscan: 6 }, 'rows')
 *
 *   const Rows = () => (
 *   <div ref={virtual.bindScroller} css="overflow-y: auto; height: 100%;">
 *   <div style:height={() => `${virtual.padding().before}px`} />
 *   <div
 *   css="position: sticky;"
 *   style:top={() => `${virtual.stickyInset()}px`}
 *   style:bottom={() => `${virtual.stickyInset()}px`}
 *   >
 *   {virtual.reatomMap(({ item }) => <Row row={item} />)}
 *   </div>
 *   <div style:height={() => `${virtual.padding().after}px`} />
 *   </div>
 *   )
 *
 * @example
 *   // Variable sizes: estimate, then measure what was rendered
 *   const messages = reatomVirtual(
 *     chat.messages,
 *     { itemSize: (message) => (message.text.length > 200 ? 120 : 48) },
 *     'messages',
 *   )
 *   const observer = new ResizeObserver(
 *     wrap((entries) => {
 *       for (const entry of entries) {
 *         messages.measure(messageOf(entry.target), entry.contentRect.height)
 *       }
 *     }),
 *   )
 */
export function reatomVirtual<Node extends LLNode>(
  source: LinkedListViewSource<Node>,
  options: VirtualOptions<Node>,
  name?: string,
): VirtualAtom<Node>

export function reatomVirtual<Item>(
  source: Computed<ReadonlyArray<Item>>,
  options: VirtualOptions<Item>,
  name?: string,
): VirtualAtom<Item>

export function reatomVirtual(
  source: LinkedListViewSource | Computed<ReadonlyArray<unknown>>,
  options: VirtualOptions<unknown>,
  name: string = named(`${source.name}.virtual`),
): VirtualAtom<unknown> {
  const { itemSize, overscan: overscanOption = 1 } = options
  const isUniform = typeof itemSize === 'number' || isAtom(itemSize)

  const readUniformSize = (): number => {
    const size = isAtom(itemSize) ? itemSize() : itemSize
    if (typeof size !== 'number' || !(size > 0 && size !== Infinity))
      throw new ReatomError(
        `The "itemSize" of the virtual "${name}" should be a positive number, received "${String(size)}".`,
      )
    return size
  }
  // Preserve eager numeric validation without reading a reactive size outside
  // the layout computed, which owns its dependency and context.
  if (typeof itemSize === 'number') readUniformSize()
  if (typeof overscanOption !== 'number' || !(overscanOption >= 0)) {
    throw new ReatomError(
      `The "overscan" of the virtual "${name}" should be a non-negative number, received "${overscanOption}".`,
    )
  }
  const overscan = Math.floor(overscanOption)

  const estimateSize = (item: unknown): number =>
    isUniform ? readUniformSize() : itemSize(item)

  const readNumber = (value: unknown, field: string): number => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      throw new ReatomError(
        `The "${field}" of the virtual "${name}" should be a number, received "${String(value)}".`,
      )
    }
    return value > 0 ? value : 0
  }

  const isLinkedListSource = isLinkedListAtom(source)

  const measured = atom(
    (): MeasuredSizes => ({
      objects: new WeakMap(),
      primitives: new Map(),
      hasUniformDelta: false,
    }),
    `${name}._measured`,
  )

  const layout = computed((): VirtualLayout => {
    const sourceState = source()
    const sizes = measured()

    if (isLinkedListSource && isLinkedListBatching(source)) {
      throw new ReatomError(
        `Can't compute the virtual "${name}" inside the batching of its linked list.`,
      )
    }

    const count = isLinkedListSource
      ? (sourceState as LinkedList).size
      : (sourceState as ReadonlyArray<unknown>).length

    const uniformSize = isUniform ? readUniformSize() : undefined
    if (uniformSize !== undefined && !sizes.hasUniformDelta) {
      return uniformLayout(count, uniformSize)
    }

    const starts = new Float64Array(count + 1)
    let index = 0
    const addItem = (item: unknown) => {
      const size =
        measuredSizesOf(sizes, item).get(item) ??
        uniformSize ??
        estimateSize(item)
      if (!isSize(size)) {
        throw new ReatomError(
          `The size of the item ${index} in the virtual "${name}" should be a non-negative finite number, received "${String(size)}".`,
        )
      }
      starts[index + 1] = starts[index]! + size
      index++
    }
    if (isLinkedListSource) {
      const list = sourceState as LinkedList
      for (let node = list.head; node !== null; node = node[list.LL_NEXT]) {
        addItem(node)
      }
    } else {
      for (const item of sourceState as ReadonlyArray<unknown>) addItem(item)
    }
    return variableLayout(starts)
  }, `${name}._layout`)

  const totalSize = computed(() => layout().total, `${name}.totalSize`)

  const viewportSize = atom(options.viewportSize ?? 0, `${name}.viewportSize`)
  const readViewportSize = () => readNumber(viewportSize(), 'viewportSize')

  const stickToEnd = options.stickToEnd ?? atom(false, `${name}.stickToEnd`)

  const maxScrollOffset = computed(
    () => Math.max(0, totalSize() - readViewportSize()),
    `${name}._maxScrollOffset`,
  )

  const requestedScrollOffset = atom<ScrollRequest>(
    { offset: 0 },
    `${name}._requestedScrollOffset`,
  )

  const scrollState = computed((prevState?: ScrollState): ScrollState => {
    const request = requestedScrollOffset()
    const sourceState = source()
    const sizes = measured()
    const { startOf, countStartedBefore } = layout()
    const max = maxScrollOffset()
    let offset = max
    if (!stickToEnd()) {
      offset = request.offset
      if (prevState?.request === request) {
        offset = prevState.offset
        // Scroll anchoring: measurements above the viewport move it by the
        // same amount, so the visible items stay in place.
        if (prevState.sizes !== sizes && prevState.source === sourceState) {
          offset += startOf(prevState.anchor) - prevState.anchorStart
        }
      }
      offset = Math.min(Math.max(0, offset), max)
    }
    const anchor = countStartedBefore(offset)
    return {
      offset,
      request,
      source: sourceState,
      sizes,
      anchor,
      anchorStart: startOf(anchor),
    }
  }, `${name}._scrollState`)

  const scrollOffset = computed(
    () => scrollState().offset,
    `${name}.scrollOffset`,
  )

  const scrollTo = action((offset: number) => {
    requestedScrollOffset.set({ offset: readNumber(offset, 'offset') })
    return scrollOffset()
  }, `${name}.scrollTo`)

  const virtualWindow = computed(
    (prevWindow?: VirtualWindow): VirtualWindow => {
      const { count, countEndedBy, countStartedBefore } = layout()
      const position = scrollOffset()
      const firstVisible = countEndedBy(position)
      const lastVisible = Math.max(
        firstVisible,
        countStartedBefore(position + readViewportSize()),
      )
      const offset = Math.max(0, firstVisible - overscan)
      const limit = Math.min(count, lastVisible + overscan) - offset
      return isSameWindow(prevWindow, offset, limit)
        ? prevWindow
        : { offset, limit }
    },
    `${name}._window`,
  )

  const view = reatomView(
    source as Computed<ReadonlyArray<unknown>>,
    {
      offset: computed(() => virtualWindow().offset, `${name}._offset`),
      limit: computed(() => virtualWindow().limit, `${name}._limit`),
    },
    name,
  )

  const renderedRange = () => {
    const { offset, items } = view()
    const { startOf } = layout()
    return { start: startOf(offset), end: startOf(offset + items.length) }
  }

  const padding = computed((prevPadding?: VirtualPadding): VirtualPadding => {
    const { start, end } = renderedRange()
    const before = start
    const after = totalSize() - end
    return prevPadding?.before === before && prevPadding.after === after
      ? prevPadding
      : { before, after }
  }, `${name}.padding`)

  const stickyInset = computed(() => {
    const { start, end } = renderedRange()
    return Math.min(0, readViewportSize() - (end - start))
  }, `${name}.stickyInset`)

  const measure = action((item: unknown, size: number) => {
    if (!isSize(size)) {
      throw new ReatomError(
        `The measured size in the virtual "${name}" should be a non-negative finite number, received "${String(size)}".`,
      )
    }
    const sizes = measured()
    const itemSizes = measuredSizesOf(sizes, item)
    const estimatedSize = estimateSize(item)
    if ((itemSizes.get(item) ?? estimatedSize) === size) return

    // A measured size is a fact about the item, not a state to roll back, so
    // the maps are shared by every state instead of copied per measurement.
    // The new state only invalidates the layout, which is rebuilt once for all
    // the measurements of an update.
    itemSizes.set(item, size)
    measured.set({
      ...sizes,
      hasUniformDelta:
        sizes.hasUniformDelta || (isUniform && size !== estimatedSize),
    })
  }, `${name}.measure`)

  const scrollToIndex = action(
    (index: number, align: VirtualAlign = 'start') => {
      const { count, startOf } = layout()
      if (count === 0) return
      const targetIndex = Math.min(
        count - 1,
        Math.floor(readNumber(index, 'index')),
      )
      const itemStart = startOf(targetIndex)
      const itemEnd = startOf(targetIndex + 1)
      const viewport = readViewportSize()
      const position = scrollOffset()

      let target: number
      if (align === 'start') target = itemStart
      else if (align === 'end') target = itemEnd - viewport
      else if (align === 'center') target = (itemStart + itemEnd - viewport) / 2
      else if (itemStart < position) target = itemStart
      else if (itemEnd > position + viewport) {
        target = Math.min(itemStart, itemEnd - viewport)
      } else return

      const max = maxScrollOffset()
      const clampedTarget = Math.min(Math.max(0, target), max)
      if (clampedTarget < max && stickToEnd()) stickToEnd.set(false)
      scrollTo(clampedTarget)
    },
    `${name}.scrollToIndex`,
  )

  const reatomMap = <T extends Rec>(
    render: (item: unknown) => T,
    mapName: string = named(`${name}.reatomMap`),
  ): VirtualMapAtom<unknown, T> => {
    const slots = reatomLinkedList<VirtualSlot<unknown>>(
      [],
      `${mapName}._slots`,
    )

    const isSameOrder = (windowItems: ReadonlyArray<unknown>) => {
      let slot = peek(slots).head
      for (const item of windowItems) {
        if (slot === null || slot.item !== item) return false
        slot = slot[slots.LL_NEXT]
      }
      return slot === null
    }

    const syncSlots = (windowItems: ReadonlyArray<unknown>) => {
      if (isSameOrder(windowItems)) return

      const slotByItem = new Map<unknown, LLNode<VirtualSlot<unknown>>>()
      const leavingSlots: Array<LLNode<VirtualSlot<unknown>>> = []
      const windowItemSet = new Set(windowItems)
      for (
        let slot = peek(slots).head;
        slot !== null;
        slot = slot[slots.LL_NEXT]
      ) {
        if (windowItemSet.has(slot.item) && !slotByItem.has(slot.item)) {
          slotByItem.set(slot.item, slot)
        } else {
          leavingSlots.push(slot)
        }
      }

      slots.batch(() => {
        if (leavingSlots.length > 0) slots.removeMany(leavingSlots)
        let previousSlot: null | LLNode<VirtualSlot<unknown>> = null
        for (const item of windowItems) {
          let slot = slotByItem.get(item)
          if (slot === undefined) {
            slot = slots.insertMany([{ item }], previousSlot)[0]!
          } else {
            // A repeated item takes the kept slot once.
            slotByItem.delete(item)
            if (slot[slots.LL_PREV] !== previousSlot) {
              slots.move(slot, previousSlot)
            }
          }
          previousSlot = slot
        }
      })
    }

    slots.extend(
      withConnectHook(() => {
        effect(() => syncSlots(view.items()), `${mapName}._sync`)
        return () => slots.clear()
      }),
    )

    return slots.reatomMap(({ item }) => render(item), mapName)
  }

  const bindScroller = (scroller: HTMLElement): Unsubscribe => {
    const previousOverflowAnchor = scroller.style.overflowAnchor
    scroller.style.overflowAnchor = 'none'

    let reportedOffset = scroller.scrollTop
    let alignFrame = 0

    const readViewport = wrap(() => {
      const height = scroller.clientHeight
      if (height > 0 && height !== viewportSize()) viewportSize.set(height)
    })

    const readScroll = wrap(() => {
      const offset = scroller.scrollTop
      // A native event can acknowledge our last write after newer content has
      // changed the scroll range. Only a changed DOM position is new input;
      // an acknowledgement must not cancel following or a pending model scroll.
      if (offset === reportedOffset) return
      const towardEnd = offset > reportedOffset
      reportedOffset = offset
      const domMaxOffset = scroller.scrollHeight - scroller.clientHeight
      const atEnd = reportedOffset >= domMaxOffset - 1
      if (stickToEnd() && !atEnd) {
        stickToEnd.set(false)
      } else if (options.stickToEnd && !stickToEnd() && atEnd && towardEnd) {
        // A shrinking scroll range clamps upward too; it must not resume a
        // paused list. A changed position toward the end is new native input.
        stickToEnd.set(true)
      }
      if (reportedOffset !== scrollOffset()) scrollTo(reportedOffset)
    })

    // Waits for the frame so spacers rendered in the same update already
    // have their size, otherwise the browser clamps the new scrollTop.
    const alignScroller = wrap(() => {
      const target = scrollOffset()
      if (Math.abs(target - reportedOffset) < 1) return
      scroller.scrollTop = target
      reportedOffset = scroller.scrollTop
    })

    readViewport()
    const resizeObserver = new ResizeObserver(readViewport)
    resizeObserver.observe(scroller)
    scroller.addEventListener('scroll', readScroll, { passive: true })

    const alignEffect = effect(() => {
      scrollOffset()
      cancelAnimationFrame(alignFrame)
      alignFrame = requestAnimationFrame(alignScroller)
    }, `${name}._bindScroller`)

    return () => {
      cancelAnimationFrame(alignFrame)
      alignEffect.unsubscribe()
      resizeObserver.disconnect()
      scroller.removeEventListener('scroll', readScroll)
      scroller.style.overflowAnchor = previousOverflowAnchor
    }
  }

  return view.extend(() => ({
    scrollOffset,
    scrollTo,
    viewportSize,
    stickToEnd,
    totalSize,
    padding,
    stickyInset,
    measure,
    scrollToIndex,
    reatomMap,
    bindScroller,
  })) as VirtualAtom<unknown>
}
