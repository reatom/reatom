import type { Action, Atom, Computed } from '../core'
import {
  _enqueue,
  action,
  atom,
  computed,
  isAtom,
  named,
  ReatomError,
  top,
  withTap,
} from '../core'
import { withChangeHook } from '../extensions/withChangeHook'
import { withFromJson } from '../extensions/withFromJson'
import { withToJson } from '../extensions/withToJson'
import { peek } from '../methods'
import type { Fn, Rec } from '../utils'
import { isObject } from '../utils'
import {
  changesSince,
  isLinkedListBatching,
  LL_BASE,
  nextVersion,
  registerLinkedListSource,
  setLinkedListBatching,
} from './linkedListBatching'

export { changesSince } from './linkedListBatching'

type State<T> = T extends Atom<infer Value> ? Value : T

declare const LL_PREV: unique symbol
export type LL_PREV = typeof LL_PREV
declare const LL_NEXT: unique symbol
export type LL_NEXT = typeof LL_NEXT

export type LLNode<T extends Rec = Rec> = T & {
  [LL_PREV]: null | LLNode<T>
  [LL_NEXT]: null | LLNode<T>
}

export type LinkedListSymbols = {
  readonly LL_PREV: LL_PREV
  readonly LL_NEXT: LL_NEXT
}

/**
 * One step of a commit. `insert` links a run after `after` (`null` is the
 * head), so `create` and `createMany` record the tail they append to. `move`
 * relinks a contiguous run the same way.
 */
export type LLChanges<Node extends LLNode> = Readonly<
  | { kind: 'insert'; nodes: readonly Node[]; after: null | Node }
  | { kind: 'remove'; nodes: readonly Node[] }
  | { kind: 'move'; nodes: readonly Node[]; after: null | Node }
  | { kind: 'swap'; a: Node; b: Node }
  | { kind: 'clear' }
>

export interface LinkedList<
  Node extends LLNode = LLNode,
> extends LinkedListSymbols {
  head: null | Node
  tail: null | Node
  size: number
  /**
   * Unique across lists: `changesSince` tells whether `changes` continue a
   * state.
   */
  version: number
  changes: Array<LLChanges<Node>>
}

/** Readonly root, mapped, or filtered linked-list source. */
export interface LinkedListSource<
  Node extends LLNode = LLNode,
  Value extends LinkedList = LinkedList<Node>,
>
  extends Computed<Value>, LinkedListSymbols {
  array: Computed<Node[]>
  __reatomLinkedList: true
  /** Current membership, including singleton lists. */
  has: (node: Node) => boolean
  /** Compare present nodes in this sequence; throws for nonmembers. */
  compare: (a: Node, b: Node) => -1 | 0 | 1
  reatomMap: <T extends Rec>(
    cb: (node: Node) => T,
    options?: string | LinkedListMapOptions<Node, LLNode<T>>,
  ) => LinkedListSource<LLNode<T>>
  /**
   * A plain predicate is static. A computed predicate tracks configuration and
   * returns a new predicate to invalidate membership. Row evaluation is
   * untracked.
   */
  reatomFilter: (
    predicate: ((node: Node) => boolean) | Computed<(node: Node) => boolean>,
    name?: string,
  ) => LinkedListSource<Node>
  /** Pure incremental fold. Callbacks must not mutate a published accumulator. */
  reatomReduce: <T>(
    options: LinkedListReduceOptions<Node, T>,
    name?: string,
  ) => Computed<{ readonly state: T; readonly version: number }>
}

export interface LinkedListMapOptions<Node extends LLNode, T extends LLNode> {
  name?: string
  /** Membership entry, including a cached model returning after removal. */
  onCreate?: (node: T) => void
  /** Membership exit; cached allocation is retained weakly. */
  onRemove?: (node: T, origin: Node) => void
  onSwap?: (payload: { a: T; b: T }) => void
  onMove?: (node: T) => void
  /**
   * A replayed `clear`, before the models are dropped. A source this map did
   * not follow is reconciled with `onRemove` and `onCreate` instead.
   */
  onClear?: (state: LinkedList<T>) => void
}

export interface LinkedListReduceOptions<Node extends LLNode, T> {
  init: () => T
  apply: (
    previous: Readonly<T>,
    change: Readonly<LLChanges<Node>>,
    source: Readonly<LinkedList<Node>>,
  ) => T
  rebuild: (
    previous: Readonly<T> | undefined,
    source: Readonly<LinkedList<Node>>,
  ) => T
}

export type LinkedListLikeAtom<T extends LinkedList = LinkedList> = Atom<T> &
  LinkedListSource<T extends LinkedList<infer Node> ? Node : never, T>

export interface LinkedListAtom<
  Params extends any[] = any[],
  Node extends Rec = Rec,
  Key extends keyof Node = never,
> extends LinkedListLikeAtom<LinkedList<LLNode<Node>>> {
  /**
   * Applies all mutations of `cb` as one update. Inside `cb`, `find` walks the
   * in-progress state. Mutators relink nodes in place, so `list()`, `array` and
   * `map` mix the old and the new state until `cb` returns, and `reatomMap` and
   * `reatomView` throw when they have to recompute. A throw restores this
   * list's links and committed state. Nested batches join this transaction.
   * External side effects and other lists are not rolled back.
   */
  batch: Action<[cb: Fn]>

  create: Action<Params, LLNode<Node>>
  createMany: Action<[Array<Params>], Array<LLNode<Node>>>
  remove: Action<[LLNode<Node>], boolean>
  removeMany: Action<[Array<LLNode<Node>>], number>
  swap: Action<[a: LLNode<Node>, b: LLNode<Node>], void>
  move: Action<[node: LLNode<Node>, after: null | LLNode<Node>], void>
  clear: Action<[], void>

  find: (cb: (node: LLNode<Node>) => boolean) => null | LLNode<Node>

  /**
   * This lazy map is useful for working with serializable identifier, but it is
   * not recommended to use it for large (thousands elements) lists
   */
  map: Key extends never ? never : Atom<Map<State<Node[Key]>, LLNode<Node>>>

  initiateFromState: (initState: Array<Node>) => LinkedList<LLNode<Node>>
  initiateFromSnapshot: (
    initSnapshot: Array<Params>,
  ) => LinkedList<LLNode<Node>>

  /** Insert absent nodes after an anchor, or at the head for null. */
  insertMany: Action<
    [nodes: readonly Node[], after: null | LLNode<Node>],
    LLNode<Node>[]
  >
  /** Move a contiguous run without recreating its nodes. */
  moveMany: Action<
    [nodes: readonly LLNode<Node>[], after: null | LLNode<Node>],
    void
  >
}

// Links live on the node objects, so a list can hold a node in one context
// only. A node keeps the number of its context under the owner symbol of the
// list (a number, so a node never retains a context), and every state carries
// that symbol, the number of its own context and the undo log.
const LL_OWNER = Symbol('Reatom linked list owner')
const LL_ROOT = Symbol('Reatom linked list root')
const LL_UNDO = Symbol('Reatom linked list undo')
/**
 * `inverse, state, a, b` records of the operations of the update in progress. A
 * failed batch or derivation calls them back to restore the links with its atom
 * state.
 */
type Undo = { log: undefined | unknown[] }
type ListMeta = {
  [LL_OWNER]: symbol
  [LL_ROOT]: number
  [LL_UNDO]: Undo
  [LL_BASE]?: number
}
const metaOf = (state: LinkedListSymbols) =>
  state as LinkedListSymbols & ListMeta

const rootIds = new WeakMap<object, number>()
let rootCount = 0

/** A `base` list shares its owner and undo log: they change together. */
const createLinks = (
  label: string,
  base?: LinkedListSymbols,
): LinkedListSymbols =>
  ({
    LL_PREV: Symbol(`Reatom linked list ${label}prev`),
    LL_NEXT: Symbol(`Reatom linked list ${label}next`),
    [LL_OWNER]: base
      ? metaOf(base)[LL_OWNER]
      : Symbol(`Reatom linked list ${label}owner`),
    [LL_UNDO]: base ? metaOf(base)[LL_UNDO] : { log: undefined },
  }) as LinkedListSymbols & ListMeta

const emptyList = <Node extends LLNode>(
  links: LinkedListSymbols,
): LinkedList<Node> => {
  const { root } = top()
  let rootId = rootIds.get(root)
  if (!rootId) rootIds.set(root, (rootId = ++rootCount))
  return {
    ...links,
    [LL_ROOT]: rootId,
    head: null,
    tail: null,
    size: 0,
    version: nextVersion(),
    changes: [],
  } as LinkedList<Node>
}

/** The next state of an update, its changes apply to `state`. */
const nextState = <State extends LinkedList<any>>(state: State): State => ({
  ...state,
  [LL_BASE]: state.version,
  version: nextVersion(),
  changes: [],
})

const journalLinks = <T>(cb: () => T, list: LinkedListSymbols): T => {
  const undo = metaOf(list)[LL_UNDO]
  // A nested update of the same list joins the outer one, it is not a savepoint.
  if (undo.log) return cb()
  const log: unknown[] = (undo.log = [])
  try {
    return cb()
  } catch (error) {
    undo.log = undefined
    for (let i = log.length; i > 0; i -= 4) {
      ;(log[i - 4] as Fn)(log[i - 3], log[i - 2], log[i - 1])
    }
    throw error
  } finally {
    undo.log = undefined
  }
}

// A member is linked back by the list, so a copy of a node is not a member.
const containsLL = <Node extends LLNode>(
  state: LinkedList<Node>,
  node: Node,
): boolean => {
  if (!node) return false
  const meta = metaOf(state)
  const prev = node[state.LL_PREV]
  return (
    (prev ? prev[state.LL_NEXT] : state.head) === node &&
    (node as Record<symbol, unknown>)[meta[LL_OWNER]] === meta[LL_ROOT]
  )
}

const addLL = <Node extends LLNode>(
  _state: LinkedList<Node>,
  _node: Node | Omit<Node, keyof LLNode>,
  _after: null | Node,
) => {
  const state: LinkedList = _state as any
  const node: LLNode = _node as any
  const after: null | LLNode = _after as any
  const LL_PREV: LL_PREV = state.LL_PREV as any
  const LL_NEXT: LL_NEXT = state.LL_NEXT as any

  if (node === after) return

  const meta = metaOf(state)
  const owner = (node as Record<symbol, unknown>)[meta[LL_OWNER]]
  if (owner !== meta[LL_ROOT]) {
    if (owner)
      throw new ReatomError(
        'A linked list node cannot be shared across contexts. Create a fresh node per context.',
      )
    ;(node as Record<symbol, unknown>)[meta[LL_OWNER]] = meta[LL_ROOT]
  }

  if (after) {
    const nextNode = after[LL_NEXT]
    node[LL_PREV] = after
    node[LL_NEXT] = nextNode
    after[LL_NEXT] = node
    if (nextNode) {
      nextNode[LL_PREV] = node
    }
    if (state.tail === after) {
      state.tail = node
    }
  } else {
    node[LL_PREV] = null
    node[LL_NEXT] = state.head
    if (state.head) {
      state.head[LL_PREV] = node
    }
    if (!state.tail) {
      state.tail = node
    }
    state.head = node
  }
  state.size++
}

const removeLL = <Node extends LLNode>(
  _state: LinkedList<Node>,
  _node: Node,
) => {
  const state: LinkedList = _state as any
  const node: LLNode = _node as any
  const LL_PREV: LL_PREV = state.LL_PREV as any
  const LL_NEXT: LL_NEXT = state.LL_NEXT as any

  if (state.head === node) {
    state.head = node[LL_NEXT]
  } else if (node[LL_PREV] !== null) {
    node[LL_PREV][LL_NEXT] = node[LL_NEXT]
  }

  if (state.tail === node) {
    state.tail = node[LL_PREV]
  } else if (node[LL_NEXT] !== null) {
    node[LL_NEXT][LL_PREV] = node[LL_PREV]
  }

  node[LL_PREV] = null
  node[LL_NEXT] = null

  state.size--
}

const swapLL = <Node extends LLNode>(
  _state: LinkedList<Node>,
  _a: Node,
  _b: Node,
): void => {
  const state: LinkedList = _state as any
  const a: LLNode = _a as any
  const b: LLNode = _b as any
  const LL_PREV: LL_PREV = state.LL_PREV as any
  const LL_NEXT: LL_NEXT = state.LL_NEXT as any

  if (a === b) return

  if (state.head === b) return swapLL(state, b, a)

  metaOf(state)[LL_UNDO].log?.push(swapLL, state, a, b)

  const prevA = a[LL_PREV]
  const nextA = a[LL_NEXT]
  const prevB = b[LL_PREV]
  const nextB = b[LL_NEXT]

  if (nextA === b) {
    a[LL_NEXT] = nextB
    b[LL_PREV] = prevA
    b[LL_NEXT] = a
    a[LL_PREV] = b

    if (nextB) nextB[LL_PREV] = a
    if (prevA) prevA[LL_NEXT] = b
  } else if (nextB === a) {
    b[LL_NEXT] = nextA
    a[LL_PREV] = prevB
    a[LL_NEXT] = b
    b[LL_PREV] = a

    if (nextA) nextA[LL_PREV] = b
    if (prevB) prevB[LL_NEXT] = a
  } else {
    if (prevA) prevA[LL_NEXT] = b
    if (nextA) nextA[LL_PREV] = b
    if (prevB) prevB[LL_NEXT] = a
    if (nextB) nextB[LL_PREV] = a

    a[LL_PREV] = prevB
    a[LL_NEXT] = nextB
    b[LL_PREV] = prevA
    b[LL_NEXT] = nextA
  }

  if (state.head === a) {
    state.head = b
  } else if (state.head === b) {
    state.head = a
  }

  if (state.tail === a) {
    state.tail = b
  } else if (state.tail === b) {
    state.tail = a
  }
}

const clearLL = <Node extends LLNode>(state: LinkedList<Node>) => {
  const LL_PREV: LL_PREV = state.LL_PREV as any
  const LL_NEXT: LL_NEXT = state.LL_NEXT as any
  metaOf(state)[LL_UNDO].log?.push(addRun, state, toArray(state), null)
  let node: null | LLNode = state.head
  state.head = null
  state.tail = null
  state.size = 0
  while (node) {
    const next = node[LL_NEXT]
    node[LL_PREV] = null
    node[LL_NEXT] = null
    node = next
  }
}

// The link operations log their inverse per run, not per node or per write:
// the log is the main cost of a big update.
const addRun = <Node extends LLNode>(
  state: LinkedList<Node>,
  nodes: readonly Node[],
  after: null | Node,
) => {
  metaOf(state)[LL_UNDO].log?.push(dropRun, state, nodes, 0)
  for (const node of nodes) {
    addLL(state, node, after)
    after = node
  }
}

/** Undo of an added run, which could fail and link only its leading nodes. */
const dropRun = <Node extends LLNode>(
  state: LinkedList<Node>,
  nodes: readonly Node[],
) => {
  for (const node of nodes) if (containsLL(state, node)) removeLL(state, node)
}

const removeRun = <Node extends LLNode>(
  state: LinkedList<Node>,
  nodes: readonly Node[],
) => {
  const prevs: Array<null | Node> = []
  metaOf(state)[LL_UNDO].log?.push(restoreRun, state, nodes, prevs)
  for (const node of nodes) {
    prevs.push(node[state.LL_PREV] as null | Node)
    removeLL(state, node)
  }
}

const restoreRun = <Node extends LLNode>(
  state: LinkedList<Node>,
  nodes: readonly Node[],
  prevs: ReadonlyArray<null | Node>,
) => {
  for (let i = prevs.length; i--;) addLL(state, nodes[i]!, prevs[i]!)
}

/** Apply a change record: mutators, derived lists and shadows share it. */
const replayLL = <Node extends LLNode>(
  state: LinkedList<Node>,
  change: LLChanges<Node>,
) => {
  switch (change.kind) {
    case 'insert':
      return addRun(state, change.nodes, change.after)
    case 'move':
      removeRun(state, change.nodes)
      return addRun(state, change.nodes, change.after)
    case 'remove':
      return removeRun(state, change.nodes)
    case 'swap':
      return swapLL(state, change.a, change.b)
    case 'clear':
      return clearLL(state)
  }
}

const recordLL = <Node extends LLNode>(
  state: LinkedList<Node>,
  change: LLChanges<Node>,
) => {
  replayLL(state, change)
  state.changes.push(change)
}

const mapChange = <Node extends LLNode, T extends LLNode>(
  change: LLChanges<Node>,
  get: (node: Node) => T,
): LLChanges<T> => {
  switch (change.kind) {
    case 'swap':
      return { kind: 'swap', a: get(change.a), b: get(change.b) }
    case 'clear':
      return change
    case 'remove':
      return { kind: 'remove', nodes: change.nodes.map((node) => get(node)) }
    default:
      return {
        kind: change.kind,
        nodes: change.nodes.map((node) => get(node)),
        after: change.after && get(change.after),
      }
  }
}

/** Reconcile a reset/predicate edit without removing retained members. */
const reconcileLL = <Node extends LLNode>(
  state: LinkedList<Node>,
  desired: Node[],
) => {
  const wanted = new Set(desired)
  if (wanted.size !== desired.length)
    throw new ReatomError('A derived list must contain distinct nodes.')
  const removed: Node[] = []
  for (let node = state.head; node; node = node[state.LL_NEXT] as Node | null)
    if (!wanted.has(node)) removed.push(node)
  if (removed.length) recordLL(state, { kind: 'remove', nodes: removed })
  let after: Node | null = null
  for (let i = 0; i < desired.length; i++) {
    const node = desired[i]!
    if ((after ? after[state.LL_NEXT] : state.head) === node) {
      // already in place
    } else if (containsLL(state, node)) {
      recordLL(state, { kind: 'move', nodes: [node], after })
    } else {
      const nodes = [node]
      while (i + 1 < desired.length && !containsLL(state, desired[i + 1]!))
        nodes.push(desired[++i]!)
      recordLL(state, { kind: 'insert', nodes, after })
    }
    after = desired[i]!
  }
}

export const toArray = <T extends Rec>(
  { head, LL_NEXT }: LinkedList<LLNode<T>>,
  prev?: Array<LLNode<T>>,
): Array<LLNode<T>> => {
  let arr: Array<LLNode<T>> = []
  let i = 0
  while (head) {
    if (prev !== undefined && prev[i] !== head) prev = undefined
    arr.push(head)
    head = head[LL_NEXT as LL_NEXT]
    i++
  }
  return arr.length === prev?.length ? prev : arr
}

/**
 * Creates a reactive linked list for collections where inserts, removals, and
 * reordering are part of the main workflow.
 *
 * @remarks
 *   Each item becomes a node with hidden prev/next links, so you can `move` or
 *   `swap` existing items without rebuilding the whole collection. You can
 *   start from existing nodes, a node factory, or a config with `initState` /
 *   `initSnapshot`. Use `array()` when rendering with normal array helpers,
 *   `key` when you need lookup by a stable id, and `batch()` when importing or
 *   reordering many nodes at once.
 * @example
 *   // Build a reorderable upload queue
 *   const uploads = reatomLinkedList(
 *     {
 *       create: (fileName: string) => ({
 *         fileName,
 *         progress: atom(0),
 *       }),
 *       key: 'fileName',
 *     },
 *     'uploads',
 *   )
 *
 *   uploads.create('cover.png')
 *   const hero = uploads.create('hero.png')
 *
 *   uploads.move(hero, null)
 *   uploads.map().get('cover.png')?.progress.set(100)
 *
 *   uploads.array().map((upload) => ({
 *     fileName: upload.fileName,
 *     progress: upload.progress(),
 *   }))
 *   // [
 *   //   { fileName: 'hero.png', progress: 0 },
 *   //   { fileName: 'cover.png', progress: 100 },
 *   // ]
 *
 * @example
 *   // Keep derived row state in sync with the source order
 *   const backlog = reatomLinkedList(
 *     (title: string) => ({ title }),
 *     'backlog',
 *   )
 *   const rows = backlog.reatomMap(
 *     (task) => ({
 *       title: task.title,
 *       expanded: atom(false),
 *     }),
 *     'backlogRows',
 *   )
 *
 *   const docsTask = backlog.create('Write docs')
 *   backlog.create('Ship release')
 *
 *   rows.array()[0].expanded.set(true)
 *   backlog.remove(docsTask)
 *
 *   rows.array().map((row) => ({
 *     title: row.title,
 *     expanded: row.expanded(),
 *   }))
 *   // [{ title: 'Ship release', expanded: false }]
 */
export function reatomLinkedList<
  Node extends Rec,
  Params extends any[] = [Node],
  Key extends keyof Node = never,
>(initState: Array<Node>, name?: string): LinkedListAtom<Params, Node, Key>

export function reatomLinkedList<
  Params extends any[],
  Node extends Rec,
  Key extends keyof Node = never,
>(
  initState: (...params: Params) => Node,
  name?: string,
): LinkedListAtom<Params, Node, Key>

export function reatomLinkedList<
  Params extends any[],
  Node extends Rec,
  Key extends keyof Node = never,
>(
  initState: {
    create: (...params: Params) => Node
    initState?: Array<Node>
    key?: Key
  },
  name?: string,
): LinkedListAtom<Params, Node, Key>

export function reatomLinkedList<
  Params extends any[],
  Node extends Rec,
  Key extends keyof Node = never,
>(
  initState: {
    create?: (...params: Params) => Node
    initState: Array<Node>
    key?: Key
  },
  name?: string,
): LinkedListAtom<Params, Node, Key>

export function reatomLinkedList<
  Params extends any[],
  Node extends Rec,
  Key extends keyof Node = never,
>(
  initSnapshot: {
    create: (...params: Params) => Node
    initSnapshot?: Array<Params>
    key?: Key
  },
  name?: string,
): LinkedListAtom<Params, Node, Key>

export function reatomLinkedList<
  Params extends any[],
  Node extends Rec,
  Key extends keyof Node = never,
>(
  options:
    | Array<Node>
    | ((...params: Params) => Node)
    | {
        create?: (...params: Params) => Node
        initState?: Array<Node>
        key?: Key
      }
    | {
        create: (...params: Params) => Node
        initSnapshot?: Array<Params>
        key?: Key
      },
  name: string = named('linkedListAtom'),
): LinkedListAtom<Params, Node, Key> {
  const links = createLinks('')
  const LL_PREV: LL_PREV = links.LL_PREV
  const LL_NEXT: LL_NEXT = links.LL_NEXT

  const {
    create: userCreate = (...params: Params) => params[0],
    key = undefined,
    ...restOptions
  } = typeof options === 'function'
    ? {
        create: options,
      }
    : Array.isArray(options)
      ? {
          create: (...params: Params) => params[0],
          initState: options,
        }
      : options

  // for batching
  let STATE: null | LinkedList<LLNode<Node>> = null
  let batchRoot: object | null = null
  let batchFailure: { error: unknown } | null = null

  const isInList = (node: Node): boolean =>
    containsLL(STATE!, node as LLNode<Node>)

  /** The batch state for its own context, the committed one otherwise. */
  const inProgress = (committed: LinkedList<LLNode<Node>>) =>
    batchRoot === top().root ? (STATE ?? committed) : committed

  const throwPresent = (
    state: LinkedList<LLNode<Node>>,
    node: LLNode<Node>,
  ) => {
    if (!isObject(node) && typeof node !== 'function')
      throw new ReatomError(
        `reatomLinkedList can operate only with objects or functions, received "${node}".`,
      )
    if (containsLL(state, node))
      throw new ReatomError('The data is already in a linked list.')
  }

  const throwPresentRun = (
    state: LinkedList<LLNode<Node>>,
    nodes: readonly LLNode<Node>[],
  ) => {
    if (new Set(nodes).size !== nodes.length)
      throw new ReatomError('Duplicate nodes in a linked list run.')
    for (const node of nodes) throwPresent(state, node)
  }

  const throwNotModel = (node: Node) => {
    if (!node || !(LL_PREV in node) || !(LL_NEXT in node))
      throw new ReatomError('The passed data is not a linked list node.')
  }

  const linkedList = atom(() => {
    if ('initState' in restOptions)
      return createLinkedListFromState(restOptions.initState ?? [])
    else if ('initSnapshot' in restOptions)
      return createLinkedListFromSnapshot(restOptions.initSnapshot ?? [])
    else return createLinkedListFromState([])
  }, name)

  /** `current` is the list to keep: its members can't be relinked. */
  const createLinkedListFromState = (
    initState: Node[],
    current?: LinkedList<LLNode<Node>>,
  ): LinkedList<LLNode<Node>> => {
    const state = emptyList<LLNode<Node>>(links)
    const nodes = initState as LLNode<Node>[]
    throwPresentRun(current ?? state, nodes)
    journalLinks(() => addRun(state, nodes, null), links)
    return state
  }

  const createLinkedListFromSnapshot = (
    initSnapshot: Params[],
    current?: LinkedList<LLNode<Node>>,
  ): LinkedList<LLNode<Node>> =>
    createLinkedListFromState(
      initSnapshot.map((params) => userCreate(...params)),
      current,
    )

  const batchFn = <T>(cb: Fn): T => {
    if (STATE) {
      if (batchRoot !== top().root)
        throw new ReatomError('A linked list batch cannot span contexts.')
      try {
        return cb()
      } catch (error) {
        // Joined operations are not savepoints. Even if user code catches
        // the error, a partially completed operation cannot be committed
        // without its change payload.
        batchFailure ??= { error }
        throw error
      }
    }

    let result: T
    const committed = peek(linkedList)
    try {
      journalLinks(
        () =>
          linkedList.set((state) => {
            STATE = nextState(state)
            batchRoot = top().root
            setLinkedListBatching(linkedList, true)

            try {
              result = cb()
              if (batchFailure) throw batchFailure.error
              // Nothing changed: keep the state, so nothing is notified.
              return STATE.changes.length ? STATE : state
            } finally {
              STATE = null
              batchRoot = null
              batchFailure = null
              setLinkedListBatching(linkedList, false)
            }
          }),
        links,
      )
    } catch (error) {
      // A throwing updater leaves the atom failed; put the committed state back.
      linkedList.set(committed)
      throw error
    }

    return result!
  }

  const batch = action(batchFn, `${name}._batch`)

  const createNodes = (paramsArray: Array<Params>): Array<LLNode<Node>> => {
    const nodes: Array<LLNode<Node>> = []
    // The change and the undo record hold the array being filled. Each node is
    // linked before the next factory call, so a factory can `find` its
    // predecessors.
    if (paramsArray.length)
      STATE!.changes.push({ kind: 'insert', nodes, after: STATE!.tail })
    metaOf(STATE!)[LL_UNDO].log!.push(dropRun, STATE, nodes, 0)
    for (const params of paramsArray) {
      const node = userCreate(...params) as LLNode<Node>
      throwPresent(STATE!, node)
      addLL(STATE!, node, STATE!.tail)
      nodes.push(node)
    }
    return nodes
  }

  const create = action(
    (...params: Params): LLNode<Node> =>
      batchFn(() => createNodes([params])[0]!),
    `${name}.create`,
  )

  const createMany = action(
    (paramsArray: Array<Params>): Array<LLNode<Node>> =>
      batchFn(() => createNodes(paramsArray)),
    `${name}.createMany`,
  )

  const remove = action((node: LLNode<Node>): boolean => {
    return batchFn(() => {
      throwNotModel(node)
      const result = isInList(node)
      if (result) recordLL(STATE!, { kind: 'remove', nodes: [node] })
      return result
    })
  }, `${name}.remove`)

  const removeMany = action((nodes: Array<LLNode<Node>>): number => {
    return batchFn(() => {
      nodes.forEach(throwNotModel)
      const removedNodes = [...new Set(nodes)].filter(isInList)
      if (removedNodes.length > 0) {
        recordLL(STATE!, { kind: 'remove', nodes: removedNodes })
      }
      return removedNodes.length
    })
  }, `${name}.removeMany`)

  const swap = action((a: LLNode<Node>, b: LLNode<Node>): void => {
    return batchFn(() => {
      throwNotModel(a)
      throwNotModel(b)
      if (!isInList(a) || !isInList(b))
        throw new ReatomError('Swap requires present nodes.')

      if (a !== b) recordLL(STATE!, { kind: 'swap', a, b })
    })
  }, `${name}.swap`)

  const move = action(
    (node: LLNode<Node>, after: null | LLNode<Node>): void => {
      return batchFn(() => {
        throwNotModel(node)
        if (!isInList(node) || (after && !isInList(after)))
          throw new ReatomError('Move requires present nodes and anchor.')

        if (node !== after && node[LL_PREV] !== after)
          recordLL(STATE!, { kind: 'move', nodes: [node], after })
      })
    },
    `${name}.move`,
  )

  const clear = action((): void => {
    return batchFn(() => recordLL(STATE!, { kind: 'clear' }))
  }, `${name}.clear`)

  const find = (cb: (node: LLNode<Node>) => boolean): null | LLNode<Node> => {
    // read the atom anyway to keep the dependency of a calling computed
    for (let { head } = inProgress(linkedList()); head; head = head[LL_NEXT]) {
      if (cb(head)) return head
    }
    return null
  }

  const array: LinkedListAtom<Params, Node, Key>['array'] = computed(
    (state: Array<LLNode<Node>> = []) => toArray(linkedList(), state),
    `${name}.array`,
  )

  const map = key
    ? (computed(
        () =>
          new Map(
            // use array as it already memoized and simplifies the order tracking
            array().map((node) => {
              const keyValue = node[key]
              return [isAtom(keyValue) ? keyValue() : keyValue, node] as const
            }),
          ),
        `${name}.map`,
      ) as LinkedListAtom<Params, Node, Key>['map'])
    : (undefined as never)

  const insertMany = action(
    (input: readonly Node[], after: null | LLNode<Node>) =>
      batchFn(() => {
        const nodes = [...input] as LLNode<Node>[]
        if (after && !isInList(after))
          throw new ReatomError('Insert anchor is not in this list.')
        throwPresentRun(STATE!, nodes)
        if (nodes.length) recordLL(STATE!, { kind: 'insert', nodes, after })
        return nodes
      }),
    `${name}.insertMany`,
  )

  const moveMany = action(
    (input: readonly LLNode<Node>[], after: null | LLNode<Node>) =>
      batchFn(() => {
        const nodes = [...input]
        if (after && !isInList(after))
          throw new ReatomError('Move anchor is not in this list.')
        if (!nodes.length) return
        if (new Set(nodes).size !== nodes.length || nodes.includes(after!))
          throw new ReatomError('Invalid move run or anchor.')
        for (let i = 0; i < nodes.length; i++) {
          if (
            !isInList(nodes[i]!) ||
            (i && nodes[i - 1]![LL_NEXT] !== nodes[i])
          )
            throw new ReatomError('Move requires a contiguous ordered run.')
        }
        if (nodes[0]![LL_PREV] !== after)
          recordLL(STATE!, { kind: 'move', nodes, after })
      }),
    `${name}.moveMany`,
  )

  return linkedList.extend(
    () => ({
      LL_PREV,
      LL_NEXT,
      batch,
      create,
      createMany,
      remove,
      removeMany,
      swap,
      move,
      clear,

      find,

      array,
      map,
      initiateFromState: (initState: Node[]) =>
        createLinkedListFromState(initState, inProgress(peek(linkedList))),
      initiateFromSnapshot: (initSnapshot: Params[]) =>
        createLinkedListFromSnapshot(
          initSnapshot,
          inProgress(peek(linkedList)),
        ),

      ...linkedListDerivations(
        linkedList as LinkedListSource<LLNode<Node>>,
        name,
      ),
      insertMany,
      moveMany,

      __reatomLinkedList: true as const,
    }),
    // A replaced list leaves its nodes linked to each other, so they would
    // still pass as members: unlink the ones the new state dropped.
    withTap((_, prev, state) => {
      if (prev && state !== prev && metaOf(state)[LL_BASE] !== prev.version) {
        // Links can't tell the lists apart, so membership is by identity.
        const kept = new Set(toArray(state))
        for (let node = prev.head; node;) {
          const next: null | LLNode<Node> = node[LL_NEXT]
          if (!kept.has(node)) node[LL_PREV] = node[LL_NEXT] = null
          node = next
        }
      }
    }),
    withChangeHook((_, prev) => {
      if (prev) {
        _enqueue(() => {
          prev.changes = []
        }, 'cleanup')
      }
    }),
    withFromJson((snapshot) => {
      if (!Array.isArray(snapshot)) {
        throw new ReatomError('Linked list snapshot should be an array.')
      }

      return createLinkedListFromSnapshot(
        snapshot.map((value) => [value] as Params),
      )
    }),
    withToJson((state) => toArray(state)),
  ) as LinkedListAtom<Params, Node, Key>
}

/**
 * Checks whether a value is a linked list atom or a linked-list derivative
 * created by `reatomLinkedList`.
 *
 * @example
 *   // Enable drag-and-drop only for linked lists
 *   const canReorder = (value: unknown) =>
 *     isLinkedListAtom(value) && value().size > 1
 */
export const isLinkedListAtom = (thing: any): thing is LinkedListSource =>
  thing?.__reatomLinkedList === true

const guardList = (source: object) => {
  if (isLinkedListBatching(source))
    throw new ReatomError(
      "Can't compute a linked list derivation inside batching.",
    )
}

const attachList = <Node extends LLNode, Value extends LinkedList<Node>>(
  target: Computed<Value>,
  links: LinkedListSymbols,
  source: object,
): LinkedListSource<Node, Value> => {
  registerLinkedListSource(target, source)
  return Object.assign(
    target,
    {
      LL_PREV: links.LL_PREV as LL_PREV,
      LL_NEXT: links.LL_NEXT as LL_NEXT,
      array: computed(
        (previous?: Node[]) => toArray(target(), previous) as Node[],
        `${target.name}.array`,
      ),
      __reatomLinkedList: true as const,
    },
    linkedListDerivations(target as LinkedListSource<Node, Value>, target.name),
  )
}

/**
 * A derivation step: replays or rebuilds `previous` into its next state, or
 * keeps `previous` when nothing changed, so consumers see no new version.
 */
const deriveList = <Node extends LLNode, Value extends LinkedList<Node>>(
  links: LinkedListSymbols,
  previous: undefined | Value,
  bookkeeping: Omit<Value, keyof LinkedList>,
  derive: (state: Value) => void,
): Value =>
  journalLinks(() => {
    const state = Object.assign(
      previous ? nextState(previous) : emptyList<Node>(links),
      bookkeeping,
    ) as Value
    derive(state)
    return previous && !state.changes.length
      ? Object.assign(previous, bookkeeping)
      : state
  }, links)

const ensureNode = <T>(node: T): T => {
  if (!isObject(node) && typeof node !== 'function')
    throw new ReatomError(
      'A linked list mapper must return an object or function.',
    )
  return node
}

/**
 * Derives a linked list of `create(item)` for the items of an array atom. A
 * node is kept while its item stays, a new or repeated item gets a new one.
 *
 * @private
 */
export const _reatomArrayLinkedList = <Item, T extends Rec>(
  items: Computed<ReadonlyArray<Item>>,
  create: (item: Item) => T,
  name: string,
): LinkedListSource<LLNode<T>> => {
  const links = createLinks('array ')
  type Value = LinkedList<LLNode<T>> & { items: ReadonlyArray<Item> }
  const target = computed((previous?: Value): Value => {
    const next = items()
    return deriveList(links, previous, { items: next }, (state) => {
      const kept = new Map<Item, LLNode<T>>()
      let node = previous?.head ?? null
      for (const item of previous?.items ?? []) {
        if (!kept.has(item)) kept.set(item, node!)
        node = node![links.LL_NEXT as LL_NEXT] as LLNode<T> | null
      }
      reconcileLL(
        state,
        next.map((item) => {
          const node = kept.get(item)
          if (!node) return ensureNode(peek(create, item)) as LLNode<T>
          kept.delete(item)
          return node
        }),
      )
    })
  }, name)
  return attachList(target, links, items)
}

/** Distance between the order labels of appended nodes. */
const LABEL_GAP = 1024

const linkedListDerivations = <Node extends LLNode>(
  source: LinkedListSource<Node>,
  name: string,
) => {
  // Order maintenance for `compare`: increasing labels with gaps, so a commit
  // relabels only the runs it touched. Labels are private per-context cache
  // data, never persistent event identities.
  const order = computed(
    (previous?: { version: number; labels: WeakMap<Node, number> }) => {
      guardList(source)
      const state = source()
      const LL_PREV: LL_PREV = state.LL_PREV
      const LL_NEXT: LL_NEXT = state.LL_NEXT
      const { version } = state
      if (previous?.version === version) return previous
      const changes = changesSince(previous?.version, state)
      const labels = changes ? previous!.labels : new WeakMap<Node, number>()
      let isReplayed = !!changes
      if (changes) {
        const touched = changes.flatMap((change) =>
          change.kind === 'clear'
            ? []
            : change.kind === 'swap'
              ? [change.a, change.b]
              : change.nodes,
        )
        for (const node of touched) labels.delete(node)
        for (const node of touched) {
          if (labels.has(node) || !containsLL(state, node)) continue
          // Every present node but the touched ones has a label, so the
          // unlabeled run around the node ends at labeled neighbors.
          let first = node
          let last = node
          let count = 1
          for (
            let prev: Node | null;
            (prev = first[LL_PREV] as Node | null) && !labels.has(prev);
            first = prev
          )
            count++
          for (
            let next: Node | null;
            (next = last[LL_NEXT] as Node | null) && !labels.has(next);
            last = next
          )
            count++
          const prev = first[LL_PREV] as Node | null
          const next = last[LL_NEXT] as Node | null
          const left = prev ? labels.get(prev)! : 0
          const right = next
            ? labels.get(next)!
            : left + LABEL_GAP * (count + 1)
          const gap = (right - left) / (count + 1)
          if (gap < 1 || right > Number.MAX_SAFE_INTEGER) {
            isReplayed = false
            break
          }
          for (let i = 1; i <= count; i++) {
            labels.set(first, left + gap * i)
            first = first[LL_NEXT] as Node
          }
        }
      }
      if (!isReplayed) {
        let label = 0
        for (let node = state.head; node; node = node[LL_NEXT] as Node | null)
          labels.set(node, (label += LABEL_GAP))
      }
      return { version, labels }
    },
    `${name}._order`,
  )

  return {
    has: (node: Node) => {
      guardList(source)
      return containsLL(source(), node)
    },
    compare: (a: Node, b: Node): -1 | 0 | 1 => {
      guardList(source)
      const state = source()
      if (!containsLL(state, a) || !containsLL(state, b))
        throw new ReatomError(
          `Comparison in "${name}" requires two present linked list nodes.`,
        )
      const { labels } = order()
      return a === b ? 0 : labels.get(a)! < labels.get(b)! ? -1 : 1
    },
    reatomMap: <T extends Rec>(
      cb: (node: Node) => T,
      options: string | LinkedListMapOptions<Node, LLNode<T>> = {},
    ): LinkedListSource<LLNode<T>> => {
      const { name: mapName = named(`${name}.reatomMap`), ...hooks } =
        typeof options === 'string' ? { name: options } : options
      const links = createLinks('map ')
      // A model is cached on its origin, and remembers the origin and the
      // generation it was made for: a weak map costs more than the mapping.
      // A clear starts a new generation, so it drops every cached model.
      const LL_MODEL = Symbol('Reatom linked list map model')
      const LL_ORIGIN = Symbol('Reatom linked list map origin')
      const LL_GENERATION = Symbol('Reatom linked list map generation')
      type Tagged = Record<symbol, any>
      type Value = LinkedList<LLNode<T>> & {
        sourceVersion: number
        generation: object
      }
      const target = computed((previous?: Value): Value => {
        guardList(source)
        const input = source()
        if (previous?.sourceVersion === input.version) return previous
        const changes = changesSince(previous?.sourceVersion, input)
        // Only the changes after the last clear survive the commit.
        let from = changes?.length ?? 0
        while (from && changes![from - 1]!.kind !== 'clear') from--
        const generation = from || !previous ? {} : previous.generation
        const bookkeeping = { sourceVersion: input.version, generation }
        return deriveList(links, previous, bookkeeping, (state) => {
          const get = (origin: Node): LLNode<T> => {
            let node: undefined | LLNode<T> = (origin as Tagged)[LL_MODEL]
            // A copy of an origin carries the model of the original.
            if (
              !node ||
              (node as Tagged)[LL_ORIGIN] !== origin ||
              (node as Tagged)[LL_GENERATION] !== generation
            ) {
              node = ensureNode(peek(cb, origin) as LLNode<T>)
              if ((node as Tagged)[LL_GENERATION] === generation)
                throw new ReatomError(
                  'A linked list mapper must return distinct nodes.',
                )
              ;(origin as Tagged)[LL_MODEL] = node
              ;(node as Tagged)[LL_ORIGIN] = origin
              ;(node as Tagged)[LL_GENERATION] = generation
            }
            return node
          }
          if (!changes) reconcileLL(state, (toArray(input) as Node[]).map(get))
          else {
            if (from) {
              hooks.onClear?.(state)
              if (state.size) recordLL(state, { kind: 'clear' })
            }
            for (let i = from; i < changes.length; i++)
              recordLL(state, mapChange(changes[i]!, get))
          }

          for (const change of state.changes) {
            if (change.kind === 'swap') hooks.onSwap?.(change)
            else if (change.kind !== 'clear')
              for (const node of change.nodes) {
                if (change.kind === 'move') hooks.onMove?.(node)
                else if (change.kind === 'remove')
                  hooks.onRemove?.(node, (node as Tagged)[LL_ORIGIN])
                else hooks.onCreate?.(node)
              }
          }
        })
      }, mapName)
      return attachList(target, links, source)
    },
    reatomFilter: (
      predicate: ((node: Node) => boolean) | Computed<(node: Node) => boolean>,
      filterName: string = named(`${name}.reatomFilter`),
    ): LinkedListSource<Node> => {
      const links = createLinks('filter ')
      // Replay against our own copy of the source order. The source links
      // already describe the final commit and cannot locate an old or removed
      // anchor. The copy is updated in place, the undo log restores it.
      const shadowLinks = createLinks('filter source ', links)
      type Value = LinkedList<Node> & {
        sourceVersion: number
        shadow: LinkedList<Node>
        predicate: (node: Node) => boolean
      }
      const target = computed((previous?: Value): Value => {
        guardList(source)
        const input = source()
        const test = isAtom(predicate) ? predicate() : predicate
        if (
          previous?.sourceVersion === input.version &&
          previous.predicate === test
        )
          return previous
        const shadow = previous?.shadow ?? emptyList<Node>(shadowLinks)
        const bookkeeping = {
          sourceVersion: input.version,
          shadow,
          predicate: test,
        }
        return deriveList(links, previous, bookkeeping, (state) => {
          const isVisible = (node: Node) => containsLL(state, node)
          const isPassed = (node: Node) => peek(test, node)
          /** The nearest visible node at or before the source node. */
          const visibleAt = (node: Node | null): Node | null => {
            while (node && !isVisible(node))
              node = node[shadowLinks.LL_PREV] as Node | null
            return node
          }

          const changes =
            previous?.predicate === test &&
            changesSince(previous.sourceVersion, input)
          if (!changes) {
            const nodes = toArray(input) as Node[]
            replayLL(shadow, { kind: 'clear' })
            replayLL(shadow, { kind: 'insert', nodes, after: null })
            return reconcileLL(state, nodes.filter(isPassed))
          }
          for (const change of changes) {
            switch (change.kind) {
              case 'insert': {
                const after = visibleAt(change.after)
                replayLL(shadow, change)
                const nodes = change.nodes.filter(isPassed)
                if (nodes.length)
                  recordLL(state, { kind: 'insert', nodes, after })
                break
              }
              case 'remove':
              case 'move': {
                const nodes = change.nodes.filter(isVisible)
                replayLL(shadow, change)
                if (!nodes.length) break
                if (change.kind === 'remove')
                  recordLL(state, { kind: 'remove', nodes })
                else {
                  const after = visibleAt(change.after)
                  if (nodes[0]![links.LL_PREV] !== after)
                    recordLL(state, { kind: 'move', nodes, after })
                }
                break
              }
              case 'swap': {
                const { a, b } = change
                replayLL(shadow, change)
                if (isVisible(a) && isVisible(b)) recordLL(state, change)
                else if (isVisible(a) || isVisible(b)) {
                  const node = isVisible(a) ? a : b
                  const after = visibleAt(
                    node[shadowLinks.LL_PREV] as Node | null,
                  )
                  if (node[links.LL_PREV] !== after)
                    recordLL(state, { kind: 'move', nodes: [node], after })
                }
                break
              }
              case 'clear':
                replayLL(shadow, change)
                if (state.size) recordLL(state, change)
                break
            }
          }
        })
      }, filterName)
      return attachList(target, links, source)
    },
    reatomReduce: <T>(
      options: LinkedListReduceOptions<Node, T>,
      reduceName: string = named(`${name}.reatomReduce`),
    ) => {
      type Value = { state: T; version: number; sourceVersion: number }
      return computed((previous?: Value): Value => {
        guardList(source)
        const input = source()
        if (previous?.sourceVersion === input.version) return previous
        const changes = changesSince(previous?.sourceVersion, input)
        let state: T
        if (!changes)
          state = peek(
            options.rebuild,
            previous ? previous.state : peek(options.init),
            input,
          )
        else {
          state = previous!.state
          for (const change of changes)
            state = peek(options.apply, state, change, input)
        }
        if (previous && state === previous.state) {
          previous.sourceVersion = input.version
          return previous
        }
        return {
          state,
          version: (previous?.version ?? 0) + 1,
          sourceVersion: input.version,
        }
      }, reduceName)
    },
  }
}
