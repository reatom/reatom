import type { Action, Atom, AtomLike, Computed } from '../core'
import {
  action,
  atom,
  computed,
  isAtom,
  named,
  ReatomError,
  top,
} from '../core'
import { effect, wrap } from '../methods'
import type { Rec, Unsubscribe } from '../utils'
import { isObject } from '../utils'
import { isAppendOnly, isLinkedListBatching } from './linkedListBatching'
import type { LinkedList, LinkedListSource, LLNode } from './reatomLinkedList'
import { _reatomArrayLinkedList, isLinkedListAtom } from './reatomLinkedList'
import type { LinkedListViewSource, ViewAtom } from './reatomView'
import { reatomView } from './reatomView'

/** Where `scrollToIndex` puts the item, like `scrollIntoView({ block })`. */
export type VirtualAlign = 'start' | 'center' | 'end' | 'nearest'

export interface VirtualOptions<Item> {
  /**
   * Size of an item along the scroll axis, in the units of `scrollOffset`
   * (usually CSS pixels). A number or number atom makes every item the same
   * size; an ordinary function estimates each item. `measure` corrects both.
   * The estimate of an item is kept while the items before it are the same,
   * unless the function reads atoms: then it is called for every item on every
   * change.
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
   * so the visible items stay in place. A rendered item only moves the starts
   * of the items after it, once for all the measurements of an update; an item
   * outside the rendered window rebuilds the layout.
   */
  measure: Action<[item: Item, size: number], void>
  /** Scrolls to the item at `index`. `align` defaults to `start`. */
  scrollToIndex: Action<[index: number, align?: VirtualAlign], void>
  /**
   * A linked list of `render(item)` for the window items. An item keeps its
   * rendered node while it stays in the window, so `@reatom/jsx` moves DOM
   * nodes instead of recreating them on every scroll step. An item that leaves
   * the window and comes back is rendered again.
   */
  reatomMap: <T extends Rec>(
    render: (item: Item) => T,
    name?: string,
  ) => LinkedListSource<LLNode<T>>
  /**
   * Connects a vertical scroll container: its scroll position and height feed
   * the model, and programmatic changes of `scrollOffset` scroll it. Sets
   * `overflow-anchor: none`, because the model anchors the content itself.
   * Returns the cleanup, so it fits a JSX `ref` directly.
   */
  bindScroller: (scroller: HTMLElement) => Unsubscribe
}

/** Item geometry: uniform arithmetic, or the prefix sums of the sizes. */
interface VirtualLayout {
  count: number
  total: number
  /** The size of the unmeasured items, when they all have the same one. */
  uniformSize: undefined | number
  /** Starts by index, `starts[count]` is the total. A uniform layout has none. */
  starts: undefined | Float64Array
}

/** Sizes and starts by index, with spare capacity for appended items. */
interface SizeCache {
  sizes: Float64Array
  starts: Float64Array
}

/** A layout with what the next one continues from. */
interface LayoutState extends VirtualLayout {
  source: unknown
  /** The source of the previous layout and how many leading items it shares. */
  base: unknown
  kept: number
  /** A uniform layout has none. The next layout takes it over. */
  cache: undefined | SizeCache
  /**
   * An estimate function that reads atoms has to see every item on every change
   * of them, so only the results of a pure one are kept by index.
   */
  isPureEstimate: boolean
}

interface RenderedItems {
  source: unknown
  offset: number
  items: ReadonlyArray<unknown>
  sizes: undefined | Float64Array
}

interface MeasuredSizes {
  objects: WeakMap<object, number>
  primitives: Map<unknown, number>
  hasUniformDelta: boolean
  /** Where the rendered items are, to find the index of a measured one. */
  rendered: undefined | RenderedItems
  /**
   * `index, size` pairs of the measurements that the layout has not applied
   * yet. It takes them, so the array is shared by every state. A measurement of
   * an item that is not rendered has no index: `-1`.
   */
  patches: number[]
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
  /** The source that the anchor index belongs to. */
  source: unknown
  /** Index and start of the first item that starts at or after `offset`. */
  anchor: number
  anchorStart: number
}

/** Start of the item at `index`; `startOf(layout, count)` is the total. */
const startOf = ({ starts, uniformSize }: VirtualLayout, index: number) =>
  starts ? starts[index]! : index * uniformSize!

/** The first index that starts after `offset`, or at it unless `isInclusive`. */
const firstIndexAbove = (
  { count, starts, uniformSize }: VirtualLayout,
  offset: number,
  isInclusive: boolean,
): number => {
  if (!starts) {
    const index = offset / uniformSize!
    return isInclusive ? Math.floor(index) + 1 : Math.ceil(index)
  }
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

/** How many items end at or before `offset`: the first index visible there. */
const countEndedBy = (layout: VirtualLayout, offset: number) =>
  Math.min(layout.count, firstIndexAbove(layout, offset, true) - 1)

/** How many items start before `offset`. */
const countStartedBefore = (layout: VirtualLayout, offset: number) =>
  Math.min(layout.count, firstIndexAbove(layout, offset, false))

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
 *   and a source change costs nothing beyond the view. Otherwise the sizes are
 *   kept as prefix sums: a scroll costs O(log n), and a change recomputes the
 *   sums after the first changed item, so an append and a measurement of a
 *   rendered item are cheap. Only the items after the first changed one are
 *   estimated again; for a linked list that is an append, any other change
 *   estimates all of them. Measured sizes are kept per item identity, so they
 *   survive filtering and reordering.
 *
 *   The model owns scroll anchoring: while the items before the first visible one
 *   are the same, a change of their sizes moves `scrollOffset` by the same
 *   amount. `bindScroller` turns off the browser's own anchoring, which cannot
 *   tell which of the swapped nodes to keep in place.
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
 *   {virtual.reatomMap((row) => <Row row={row} />)}
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
      rendered: undefined,
      patches: [],
    }),
    `${name}._measured`,
  )

  const layout = computed((prevLayout?: LayoutState): LayoutState => {
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

    // The arrays move to the next layout, so a failed rebuild cannot leave
    // them half-written in a remembered one.
    let cache = prevLayout?.cache
    if (cache) prevLayout!.cache = undefined

    let kept = 0
    if (prevLayout === undefined) {
      // nothing to continue from
    } else if (prevLayout.source === sourceState) {
      kept = count
    } else if (isLinkedListSource) {
      if (
        isAppendOnly(prevLayout.source as LinkedList, sourceState as LinkedList)
      )
        kept = prevLayout.count
    } else if (cache) {
      const prevItems = prevLayout.source as ReadonlyArray<unknown>
      const items = sourceState as ReadonlyArray<unknown>
      const max = Math.min(prevLayout.count, count)
      while (kept < max && prevItems[kept] === items[kept]) kept++
    }

    // The count of leading sizes that are still right, and the first start to
    // recompute: a measurement of a rendered item only patches its size.
    let isPureEstimate = prevLayout?.isPureEstimate ?? true
    let from =
      cache && isPureEstimate && prevLayout!.uniformSize === uniformSize
        ? kept
        : 0
    let first = from
    const { rendered, patches } = sizes
    for (let i = 0; i < patches.length; i += 2) {
      const index = patches[i]!
      if (index < 0 || rendered!.source !== prevLayout?.source) {
        from = first = 0
      } else if (index < from) {
        cache!.sizes[index] = patches[i + 1]!
        first = Math.min(first, index)
      }
    }
    patches.length = 0

    const state = {
      source: sourceState,
      base: prevLayout?.source,
      kept,
      count,
      uniformSize,
    }

    if (uniformSize !== undefined && !sizes.hasUniformDelta) {
      return {
        ...state,
        total: count * uniformSize,
        starts: undefined,
        cache: undefined,
        isPureEstimate,
      }
    }

    if (!cache || cache.sizes.length < count) {
      const capacity = cache ? count + (count >> 1) : count
      const grown = {
        sizes: new Float64Array(capacity),
        starts: new Float64Array(capacity + 1),
      }
      if (cache) {
        grown.sizes.set(cache.sizes.subarray(0, from))
        grown.starts.set(cache.starts.subarray(0, first + 1))
      }
      cache = grown
    }
    const { sizes: itemSizes, starts } = cache

    let index = from
    const { pubs } = top()
    const dependencies = pubs.length
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
      itemSizes[index++] = size
    }
    if (!isLinkedListSource) {
      const items = sourceState as ReadonlyArray<unknown>
      while (index < count) addItem(items[index])
    } else if (from < count) {
      const list = sourceState as LinkedList
      // The kept nodes of a list are the whole previous one, so the new nodes
      // follow its tail.
      let node = from
        ? (prevLayout!.source as LinkedList).tail![list.LL_NEXT]
        : list.head
      for (; node !== null; node = node[list.LL_NEXT]) addItem(node)
    }
    if (pubs.length !== dependencies) isPureEstimate = false
    for (let i = first; i < count; i++) {
      starts[i + 1] = starts[i]! + itemSizes[i]!
    }

    return { ...state, total: starts[count]!, starts, cache, isPureEstimate }
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
    const current = layout()
    const { source: sourceState, base, kept, count } = current
    const max = maxScrollOffset()
    let offset = max
    if (!stickToEnd()) {
      offset = request.offset
      if (prevState?.request === request) {
        offset = prevState.offset
        // Scroll anchoring: while the items before the first visible one are
        // the same, a change of their sizes moves the offset by the same
        // amount, so the visible items stay in place.
        const keptItems =
          prevState.source === sourceState
            ? count
            : prevState.source === base
              ? kept
              : 0
        if (prevState.anchor <= keptItems) {
          offset += startOf(current, prevState.anchor) - prevState.anchorStart
        }
      }
      offset = Math.min(Math.max(0, offset), max)
    }
    const anchor = countStartedBefore(current, offset)
    return {
      offset,
      request,
      source: sourceState,
      anchor,
      anchorStart: startOf(current, anchor),
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
      const current = layout()
      const position = scrollOffset()
      const firstVisible = countEndedBy(current, position)
      const lastVisible = Math.max(
        firstVisible,
        countStartedBefore(current, position + readViewportSize()),
      )
      const offset = Math.max(0, firstVisible - overscan)
      const limit = Math.min(current.count, lastVisible + overscan) - offset
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

  const padding = computed((prevPadding?: VirtualPadding): VirtualPadding => {
    const { offset, items } = view()
    const current = layout()
    const before = startOf(current, offset)
    const after = current.total - startOf(current, offset + items.length)
    return prevPadding?.before === before && prevPadding.after === after
      ? prevPadding
      : { before, after }
  }, `${name}.padding`)

  const stickyInset = computed(() => {
    const { before, after } = padding()
    const renderedSize = totalSize() - before - after
    return Math.min(0, readViewportSize() - renderedSize)
  }, `${name}.stickyInset`)

  const measure = action((item: unknown, size: number) => {
    if (!isSize(size)) {
      throw new ReatomError(
        `The measured size in the virtual "${name}" should be a non-negative finite number, received "${String(size)}".`,
      )
    }
    const sizes = measured()
    const { patches } = sizes
    const itemSizes = measuredSizesOf(sizes, item)
    const knownSize = itemSizes.get(item) ?? estimateSize(item)

    // The view gives the index of a rendered item. Only the first measurement
    // of an update reads it: after that the layout waits for its patches, and
    // a read would rebuild it for every measurement.
    const sourceState = source()
    let { rendered } = sizes
    if (!patches.length || rendered!.source !== sourceState) {
      const { offset, items } = view()
      rendered = {
        source: sourceState,
        offset,
        items,
        sizes: layout().cache?.sizes,
      }
    }

    // The layout is compared too: a repeated item has one measured size, but
    // each of its places is patched when it is rendered.
    const pending = patches.length
    const isChanged = knownSize !== size
    let isRendered = false
    for (let i = 0; i < rendered!.items.length; i++) {
      if (rendered!.items[i] === item) {
        const index = rendered!.offset + i
        isRendered = true
        if (isChanged || (rendered!.sizes && rendered!.sizes[index] !== size)) {
          patches.push(index, size)
        }
      }
    }
    if (isChanged && !isRendered) patches.push(-1, size)
    if (patches.length === pending) return

    // A measured size is a fact about the item, not a state to roll back, so
    // the maps are shared by every state instead of copied per measurement.
    itemSizes.set(item, size)
    measured.set({
      ...sizes,
      rendered,
      hasUniformDelta:
        sizes.hasUniformDelta || (isUniform && size !== readUniformSize()),
    })
  }, `${name}.measure`)

  const scrollToIndex = action(
    (index: number, align: VirtualAlign = 'start') => {
      const current = layout()
      if (current.count === 0) return
      const targetIndex = Math.min(
        current.count - 1,
        Math.floor(readNumber(index, 'index')),
      )
      const itemStart = startOf(current, targetIndex)
      const itemEnd = startOf(current, targetIndex + 1)
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
  ) => _reatomArrayLinkedList(view.items, render, mapName)

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
