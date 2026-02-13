import type { Action, Atom, AtomLike, Computed } from '../core'
import { action, atom, computed, isAtom, named, ReatomError } from '../core'
import { peek } from '../methods'
import type { Fn, Rec } from '../utils'
import { isObject } from '../utils'

type State<T> = T extends Atom<infer Value>
  ? Value
  : T extends Computed<infer Value>
    ? Value
    : T
type ViewState<T> = T | (() => T)

/** @private */
export const LL_PREV = /* @__PURE__ */ Symbol('Reatom linked list prev')
/** @private */
export const LL_NEXT = /* @__PURE__ */ Symbol('Reatom linked list next')

/**
 * Linked List is reusing the model reference to simplify the reference sharing
 * and using it as a key of LL methods. Btw, symbols works fine with
 * serialization and will not add a garbage to an output.
 */
export type LLNode<T extends Rec = Rec> = T & {
  [LL_PREV]: null | LLNode<T>
  [LL_NEXT]: null | LLNode<T>
}

type LLChanges<Node extends LLNode> =
  | { kind: 'create'; node: Node }
  | { kind: 'createMany'; nodes: Node[] }
  | { kind: 'remove'; node: Node }
  | { kind: 'removeMany'; nodes: Node[] }
  | { kind: 'swap'; a: Node; b: Node }
  | { kind: 'move'; node: Node; after: null | Node }
  | { kind: 'clear' }

export interface LinkedList<Node extends LLNode = LLNode> {
  head: null | Node
  tail: null | Node
  size: number
  version: number
  changes: Array<LLChanges<Node>>
}

export interface LinkedListViewOptions {
  from?: ViewState<number>
  to?: ViewState<number>
  size?: ViewState<number>
}

export type LinkedListViewOptionsSource =
  | LinkedListViewOptions
  | (() => LinkedListViewOptions)

export interface LinkedListViewState<Node extends LLNode = LLNode> {
  from: number
  to: number
  size: number
  total: number
  hasPrev: boolean
  hasNext: boolean
  head: null | Node
  tail: null | Node
  version: number
  sourceVersion: number
}

export interface LinkedListViewAtom<Node extends LLNode = LLNode>
  extends Computed<LinkedListViewState<Node>> {
  array: Computed<Array<Node>>
}

export type LinkedListViewFactory<Node extends LLNode = LLNode> = (
  options?: string | LinkedListViewOptionsSource,
  name?: string,
) => LinkedListViewAtom<Node>

export interface LinkedListLikeAtom<
  T extends LinkedList = LinkedList,
> extends Atom<T> {
  array: Computed<Array<T extends LinkedList<infer LLNode> ? LLNode : never>>

  __reatomLinkedList: true
}

export interface LinkedListAtom<
  Params extends any[] = any[],
  Node extends Rec = Rec,
  Key extends keyof Node = never,
> extends LinkedListLikeAtom<LinkedList<LLNode<Node>>> {
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

  reatomMap: <T extends Rec>(
    cb: (node: LLNode<Node>) => T,
    options?:
      | string
      | {
          name?: string
          onCreate?: (node: LLNode<T>) => void
          onRemove?: (node: LLNode<T>, origin: LLNode<Node>) => void
          onSwap?: (payload: { a: LLNode<T>; b: LLNode<T> }) => void
          onMove?: (node: LLNode<T>) => void
          onClear?: (
            lastState: LinkedListDerivedState<LLNode<Node>, LLNode<T>>,
          ) => void
        },
  ) => LinkedListDerivedAtom<LLNode<Node>, LLNode<T>>

  reatomView: LinkedListViewFactory<LLNode<Node>>

  // reatomFilter: (
  //   cb: (node: Node) => any,
  //   name?: string,
  // ) => Atom<ListType<Node>>

  // reatomReduce: <T>(
  //   options: {
  //     init: T
  //     add: (acc: T, node: LLNode<Node>) => T
  //     del: (acc: T, node: LLNode<Node>) => T
  //   },
  //   name?: string,
  // ) => Atom<T>
}

// TODO rename to `DerivedLinkedList`
export interface LinkedListDerivedState<
  Node extends LLNode,
  T extends LLNode,
> extends LinkedList<T> {
  map: WeakMap<Node, T>
}

export interface LinkedListDerivedAtom<
  Node extends LLNode,
  T extends LLNode,
> extends Computed<LinkedListDerivedState<Node, T>> {
  array: Computed<Array<T extends LinkedList<infer LLNode> ? LLNode : never>>
  reatomView: LinkedListViewFactory<T>

  __reatomLinkedList: true
}

const addLL = <Node extends LLNode>(
  state: LinkedList<Node>,
  node: Node | Omit<Node, keyof LLNode>,
  after: null | Node,
) => {
  if (node === after) return

  if (after) {
    const nextNode = after[LL_NEXT]
    ;(node as Node)[LL_PREV] = after
    ;(node as Node)[LL_NEXT] = nextNode
    after[LL_NEXT] = node as Node
    if (nextNode) {
      nextNode[LL_PREV] = node as Node
    }
    if (state.tail === after) {
      state.tail = node as Node
    }
  } else {
    ;(node as Node)[LL_PREV] = null
    ;(node as Node)[LL_NEXT] = state.head
    if (state.head) {
      state.head[LL_PREV] = node as Node
    }
    if (!state.tail) {
      state.tail = node as Node
    }
    state.head = node as Node
  }
  state.size++
}

const removeLL = <Node extends LLNode>(state: LinkedList<Node>, node: Node) => {
  if (state.head === node) {
    state.head = node[LL_NEXT] as Node
  } else if (node[LL_PREV] !== null) {
    node[LL_PREV][LL_NEXT] = node[LL_NEXT]
  }

  if (state.tail === node) {
    state.tail = node[LL_PREV] as Node
  } else if (node[LL_NEXT] !== null) {
    node[LL_NEXT][LL_PREV] = node[LL_PREV]
  }

  node[LL_PREV] = null
  node[LL_NEXT] = null

  state.size--
}

const swapLL = <Node extends LLNode>(
  state: LinkedList<Node>,
  a: Node,
  b: Node,
): void => {
  if (a === b) return

  // If b is the head, swap a and b to make a the head
  if (state.head === b) return swapLL(state, b, a)

  const prevA = a[LL_PREV]
  const nextA = a[LL_NEXT]
  const prevB = b[LL_PREV]
  const nextB = b[LL_NEXT]

  // Check if they are adjacent
  if (nextA === b) {
    // a is before b
    a[LL_NEXT] = nextB
    b[LL_PREV] = prevA
    b[LL_NEXT] = a
    a[LL_PREV] = b

    if (nextB) nextB[LL_PREV] = a
    if (prevA) prevA[LL_NEXT] = b
  } else if (nextB === a) {
    // b is before a
    b[LL_NEXT] = nextA
    a[LL_PREV] = prevB
    a[LL_NEXT] = b
    b[LL_PREV] = a

    if (nextA) nextA[LL_PREV] = b
    if (prevB) prevB[LL_NEXT] = a
  } else {
    // Non-adjacent nodes, just swap them
    if (prevA) prevA[LL_NEXT] = b
    if (nextA) nextA[LL_PREV] = b
    if (prevB) prevB[LL_NEXT] = a
    if (nextB) nextB[LL_PREV] = a

    a[LL_PREV] = prevB
    a[LL_NEXT] = nextB
    b[LL_PREV] = prevA
    b[LL_NEXT] = nextA
  }

  // Update head and tail pointers if necessary
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

const moveLL = <Node extends LLNode>(
  state: LinkedList<Node>,
  node: Node,
  after: null | Node,
) => {
  removeLL(state, node)
  addLL(state, node, after)
}

const clearLL = <Node extends LLNode>(state: LinkedList<Node>) => {
  while (state.tail) removeLL(state, state.tail)
}

const toArray = <T extends Rec>(
  head: null | LLNode<T>,
  prev?: Array<LLNode<T>>,
): Array<LLNode<T>> => {
  const arr: Array<LLNode<T>> = []
  let i = 0
  while (head) {
    if (prev !== undefined && prev[i] !== head) prev = undefined
    arr.push(head)
    head = head[LL_NEXT]
    i++
  }
  return arr.length === prev?.length ? prev : arr
}

const toArraySize = <T extends Rec>(
  head: null | LLNode<T>,
  size: number,
  prev?: Array<LLNode<T>>,
): Array<LLNode<T>> => {
  const arr: Array<LLNode<T>> = []
  let i = 0
  while (head && i < size) {
    if (prev !== undefined && prev[i] !== head) prev = undefined
    arr.push(head)
    head = head[LL_NEXT]
    i++
  }
  return arr.length === prev?.length ? prev : arr
}

const readViewState = <T>(
  value: ViewState<T> | undefined,
  fallback: T,
): T => {
  if (value === undefined) return fallback
  if (typeof value === 'function') return value()
  return value
}

const normalizeSliceIndex = (
  value: number | undefined,
  size: number,
  fallback: number,
): number => {
  if (value === undefined) return fallback
  if (!Number.isFinite(value)) return value < 0 ? 0 : size

  const normalizedValue = Math.trunc(value)
  if (normalizedValue < 0) return Math.max(size + normalizedValue, 0)

  return Math.min(normalizedValue, size)
}

const normalizeSliceSize = (value: number | undefined, maxSize: number): number => {
  if (value === undefined) return maxSize
  if (!Number.isFinite(value)) return value <= 0 ? 0 : maxSize

  const normalizedValue = Math.trunc(value)
  return Math.min(Math.max(normalizedValue, 0), maxSize)
}

const getNodeByIndex = <Node extends LLNode>(
  state: LinkedList<Node>,
  index: number,
): null | Node => {
  if (index < 0 || index >= state.size) return null

  const distanceFromHead = index
  const distanceFromTail = state.size - index - 1

  if (distanceFromHead <= distanceFromTail) {
    let node = state.head
    let cursor = 0
    while (node && cursor < distanceFromHead) {
      node = node[LL_NEXT] as null | Node
      cursor++
    }
    return node
  }

  let node = state.tail
  let cursor = 0
  while (node && cursor < distanceFromTail) {
    node = node[LL_PREV] as null | Node
    cursor++
  }
  return node
}

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

  const _name = name

  const isLL = (node: Node): node is LLNode<Node> =>
    !!node && LL_NEXT in node && LL_PREV in node

  const throwModel = (node: Node) => {
    if (isLL(node))
      throw new ReatomError('The data is already in a linked list.')
  }
  const throwNotModel = (node: Node) => {
    if (!isLL(node))
      throw new ReatomError('The passed data is not a linked list node.')
  }

  // for batching
  let STATE: null | LinkedList<LLNode<Node>> = null

  const linkedList = atom(() => {
    try {
      if ('initState' in restOptions)
        return createLinkedListFromState(restOptions.initState ?? [])
      else if ('initSnapshot' in restOptions)
        return createLinkedListFromSnapshot(restOptions.initSnapshot ?? [])
      else return createLinkedListFromState([])
    } finally {
      STATE = null
    }
  }, name)

  const createLinkedListFromState = (
    initState: Node[],
  ): LinkedList<LLNode<Node>> => {
    const state = {
      size: 0,
      version: 1,
      changes: [],
      head: null,
      tail: null,
    }

    for (const node of initState) {
      throwModel(node)
      addLL(state, node, state.tail)
    }

    return state
  }

  const createLinkedListFromSnapshot = (
    initSnapshot: Params[],
  ): LinkedList<LLNode<Node>> => {
    const initState = initSnapshot.map((params) => userCreate(...params))
    const state = {
      size: 0,
      version: 1,
      changes: [],
      head: null,
      tail: null,
    }

    for (const node of initState) {
      throwModel(node)
      addLL(state, node, state.tail)
    }

    return state
  }

  const batchFn = <T>(cb: Fn): T => {
    if (STATE) return cb()

    STATE = linkedList.set(({ head, tail, size, version }) => ({
      size,
      version: version + 1,
      changes: [],
      head,
      tail,
    }))

    try {
      return cb()
    } finally {
      STATE = null
    }
  }

  const batch = action(batchFn, `${name}._batch`)

  const addNode = (params: Params): LLNode<Node> => {
    const node = userCreate(...params) as LLNode<Node>

    if (!isObject(node) && typeof node !== 'function')
      throw new ReatomError(
        `reatomLinkedList can operate only with objects or functions, received "${node}".`,
      )

    throwModel(node)

    addLL(STATE!, node, STATE!.tail)

    return node
  }

  const delNode = (node: LLNode<Node>): boolean => {
    throwNotModel(node)

    if (
      node[LL_PREV] === null &&
      node[LL_NEXT] === null &&
      STATE!.tail !== node
    )
      return false

    removeLL(STATE!, node)

    return true
  }

  const create = action((...params: Params): LLNode<Node> => {
    return batchFn(() => {
      const node = addNode(params)
      STATE!.changes.push({ kind: 'create', node })
      return node
    })
  }, `${name}.create`)

  const createMany = action(
    (paramsArray: Array<Params>): Array<LLNode<Node>> => {
      return batchFn(() => {
        const nodes: Array<LLNode<Node>> = []

        for (const params of paramsArray) {
          nodes.push(addNode(params))
        }

        STATE!.changes.push({ kind: 'createMany', nodes })

        return nodes
      })
    },
    `${name}.createMany`,
  )

  const remove = action((node: LLNode<Node>): boolean => {
    return batchFn(() => {
      const result = delNode(node)
      if (result) STATE!.changes.push({ kind: 'remove', node })
      return result
    })
  }, `${name}.remove`)

  const removeMany = action((nodes: Array<LLNode<Node>>): number => {
    return batchFn(() => {
      const removedNodes: Array<LLNode<Node>> = []

      for (const node of nodes) {
        if (delNode(node)) {
          removedNodes.push(node)
        }
      }

      if (removedNodes.length > 0) {
        STATE!.changes.push({ kind: 'removeMany', nodes: removedNodes })
      }

      return removedNodes.length
    })
  }, `${name}.removeMany`)

  const swap = action((a: LLNode<Node>, b: LLNode<Node>): void => {
    return batchFn(() => {
      throwNotModel(a)
      throwNotModel(b)

      if (a === b) return

      swapLL(STATE!, a, b)

      STATE!.changes.push({ kind: 'swap', a, b })
    })
  }, `${name}.swap`)

  const move = action(
    (node: LLNode<Node>, after: null | LLNode<Node>): void => {
      return batchFn(() => {
        throwNotModel(node)

        moveLL(STATE!, node, after)

        STATE!.changes.push({ kind: 'move', node, after })
      })
    },
    `${name}.move`,
  )

  const clear = action((): void => {
    return batchFn(() => {
      clearLL(STATE!)

      STATE!.changes.push({ kind: 'clear' })
    })
  }, `${name}.clear`)

  const find = (cb: (node: LLNode<Node>) => boolean): null | LLNode<Node> => {
    for (let { head } = linkedList(); head; head = head[LL_NEXT]) {
      if (cb(head)) return head
    }
    return null
  }

  const array: LinkedListAtom<Params, Node, Key>['array'] = computed(
    (state: Array<LLNode<Node>> = []) => toArray(linkedList().head, state),
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
      ) as LinkedListAtom<Params, Node, Key>['map'])
    : (undefined as never)

  const createReatomView = <ViewNode extends LLNode>(
    source: AtomLike<LinkedList<ViewNode>, [], LinkedList<ViewNode>>,
    sourceName: string,
    checkBatching?: () => void,
  ): LinkedListViewFactory<ViewNode> => {
    return (
      options: string | LinkedListViewOptionsSource = {},
      maybeName?: string,
    ): LinkedListViewAtom<ViewNode> => {
      let optionsSource: LinkedListViewOptionsSource
      let viewName: string

      if (typeof options === 'string') {
        optionsSource = {}
        viewName = options
      } else {
        optionsSource = options
        viewName = maybeName ?? named(`${sourceName}.reatomView`)
      }

      const view = computed((state?: LinkedListViewState<ViewNode>) => {
        checkBatching?.()

        const linkedState = source()
        const viewOptions =
          typeof optionsSource === 'function' ? optionsSource() : optionsSource

        const from = normalizeSliceIndex(
          readViewState(viewOptions.from, 0),
          linkedState.size,
          0,
        )
        const boundedTo = normalizeSliceIndex(
          readViewState(viewOptions.to, linkedState.size),
          linkedState.size,
          linkedState.size,
        )
        const maxSize = Math.max(0, boundedTo - from)
        const size = normalizeSliceSize(
          readViewState(viewOptions.size, maxSize),
          maxSize,
        )
        const to = from + size
        const head = size === 0 ? null : getNodeByIndex(linkedState, from)

        let tail = head
        let tailShift = size - 1
        while (tail && tailShift > 0) {
          tail = tail[LL_NEXT] as null | ViewNode
          tailShift--
        }

        const hasPrev = from > 0
        const hasNext = to < linkedState.size
        const isViewChanged =
          !state ||
          state.from !== from ||
          state.to !== to ||
          state.size !== size ||
          state.head !== head ||
          state.tail !== tail

        const version = isViewChanged ? (state?.version ?? 0) + 1 : state.version

        if (
          state &&
          !isViewChanged &&
          state.total === linkedState.size &&
          state.hasPrev === hasPrev &&
          state.hasNext === hasNext &&
          state.sourceVersion === linkedState.version
        ) {
          return state
        }

        return {
          from,
          to,
          size,
          total: linkedState.size,
          hasPrev,
          hasNext,
          head,
          tail,
          version,
          sourceVersion: linkedState.version,
        }
      }, viewName)

      const array: LinkedListViewAtom<ViewNode>['array'] = computed(
        (state: Array<ViewNode> = []) => {
          const currentView = view()
          return toArraySize(currentView.head, currentView.size, state)
        },
        `${viewName}.array`,
      )

      return Object.assign(view, { array })
    }
  }

  const reatomView = createReatomView(linkedList, _name, () => {
    if (STATE) {
      throw new ReatomError(
        `Can't compute the view of the linked list inside the batching.`,
      )
    }
  })

  const reatomMap = <T extends Rec>(
    cb: (node: LLNode<Node>) => T,
    options:
      | string
      | {
          name?: string
          onCreate?: (node: LLNode<T>) => void
          onRemove?: (node: LLNode<T>, origin: LLNode<Node>) => void
          onSwap?: (payload: { a: LLNode<T>; b: LLNode<T> }) => void
          onMove?: (node: LLNode<T>) => void
          onClear?: (
            lastState: LinkedListDerivedState<LLNode<Node>, LLNode<T>>,
          ) => void
        } = {},
  ): LinkedListDerivedAtom<LLNode<Node>, LLNode<T>> => {
    const { name = named(`${_name}.reatomMap`), ...hooks } =
      typeof options === 'string' ? { name: options } : options

    type State = LinkedListDerivedState<LLNode<Node>, LLNode<T>>

    const mapList = computed((mapList?: State): State => {
      if (STATE) {
        throw new ReatomError(
          `Can't compute the map of the linked list inside the batching.`,
        )
      }

      const ll = linkedList()

      if (
        !mapList ||
        /* some update was missed */ ll.version - 1 > mapList.version
      ) {
        if (mapList) hooks.onClear?.(mapList)

        mapList = {
          size: ll.size,
          version: ll.version,
          changes: [],
          head: null,
          tail: null,
          map: new WeakMap(),
        }

        for (let head = ll.head; head; head = head[LL_NEXT]) {
          const node = peek(() => cb(head)) as LLNode<T>
          addLL(mapList, node, mapList.tail)
          mapList.map.set(head, node)
          hooks.onCreate?.(node)
        }
        // cover extra size changes from `addLL`
        mapList.size = ll.size
      } else {
        mapList = {
          head: mapList.head,
          tail: mapList.tail,
          size: mapList.size,
          version: ll.version,
          changes: [],
          map: mapList.map,
        }

        for (const change of ll.changes) {
          switch (change.kind) {
            case 'create': {
              const node = cb(change.node) as LLNode<T>
              addLL(mapList, node, mapList.tail)
              mapList.map.set(change.node, node)
              mapList.changes.push({ kind: 'create', node })
              hooks.onCreate?.(node)
              break
            }
            case 'createMany': {
              const nodes: Array<LLNode<T>> = []
              for (const originNode of change.nodes) {
                const node = cb(originNode) as LLNode<T>
                addLL(mapList, node, mapList.tail)
                mapList.map.set(originNode, node)
                nodes.push(node)
                hooks.onCreate?.(node)
              }
              mapList.changes.push({ kind: 'createMany', nodes })
              break
            }
            case 'remove': {
              const node = mapList.map.get(change.node)!
              removeLL(mapList, node)
              mapList.map.delete(change.node)
              mapList.changes.push({ kind: 'remove', node })
              hooks.onRemove?.(node, change.node)
              break
            }
            case 'removeMany': {
              const nodes: Array<LLNode<T>> = []
              for (const originNode of change.nodes) {
                const node = mapList.map.get(originNode)!
                removeLL(mapList, node)
                mapList.map.delete(originNode)
                nodes.push(node)
                hooks.onRemove?.(node, originNode)
              }
              mapList.changes.push({ kind: 'removeMany', nodes })
              break
            }
            case 'swap': {
              const a = mapList.map.get(change.a)!
              const b = mapList.map.get(change.b)!
              swapLL(mapList, a, b)
              mapList.changes.push({ kind: 'swap', a, b })
              hooks.onSwap?.({ a, b })
              break
            }
            case 'move': {
              const node = mapList.map.get(change.node)!
              const after = change.after ? mapList.map.get(change.after)! : null
              moveLL(mapList, node, after)
              mapList.changes.push({ kind: 'move', node, after })
              hooks.onMove?.(node)
              break
            }
            case 'clear': {
              hooks.onClear?.(mapList)
              clearLL(mapList)
              mapList.changes.push({ kind: 'clear' })
              break
            }
            default: {
              const kind: never = change
              const error = new Error(`Unhandled linked list change "${kind}"`)
              throw error
            }
          }
        }
      }

      if (mapList.size !== ll.size)
        throw new ReatomError(
          "Inconsistent linked list, is's a bug, please report an issue",
        )

      return mapList
    }, name)

    // @ts-ignore
    const array: LinkedListDerivedAtom<LLNode<Node>, LLNode<T>>['array'] =
      computed(
        (state: Array<LLNode<T>> = []) => toArray(mapList().head, state),
        `${name}.array`,
      )

    const reatomView = createReatomView(mapList, name)

    return Object.assign(mapList, {
      array,
      reatomView,
      __reatomLinkedList: true as const,
    })
  }

  // TODO there is a bug with `del` logic
  // const reatomReduce = <T>(
  //   {
  //     init,
  //     add,
  //     del,
  //   }: {
  //     init: T
  //     add: (ctx: CtxSpy, acc: T, node: LLNode<Node>) => T
  //     del: (acc: T, node: LLNode<Node>) => T
  //   },
  //   name = named(`${_name}.reatomReduce`),
  // ): Atom<T> => {
  //   const acc = atom(init, `${name}._acc`)
  //   const controllers = reatomMap(
  //     (node) =>
  //       atom(
  //         (ctx) => {
  //           acc((state) =>
  //             add(
  //               ctx,
  //               /* is the first calc */ ctx.cause.listeners.size
  //                 ? del(state, node)
  //                 : state,
  //               node,
  //             ),
  //           )
  //         },
  //         named(`${name}._controllers`),
  //       ).extend(
  //         (target) => ({
  //           unsubscribe: ctx.subscribe(target, noop),
  //         }),
  //       ),
  //     {
  //       name: `${name}._controllers`,
  //       onRemove(node, origin) {
  //         acc((state) => del(state, origin))
  //         node.unsubscribe()
  //       },
  //       onClear(mapList) {
  //         for (let head = mapList.head; head; head = head[LL_NEXT]) {
  //           head.unsubscribe()
  //         }
  //         acc(() => init)
  //       },
  //     },
  //   )

  //   onDisconnect(controllers, (ctx) => {
  //     for (let head = ctx.get(controllers).head; head; head = head[LL_NEXT]) {
  //       head.unsubscribe()
  //     }
  //   })

  //   return atom((ctx) => {
  //     ctx.spy(controllers)
  //     return ctx.spy(acc)
  //   }, name)
  // }

  return Object.assign(linkedList, {
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
    initiateFromState: createLinkedListFromState,
    initiateFromSnapshot: createLinkedListFromSnapshot,

    reatomMap,
    reatomView,
    // reatomFilter,
    // reatomReduce,

    __reatomLinkedList: true as const,
  })
  // .extend(readonly) TODO: fix errors because of this line in the tests
}

export const isLinkedListAtom = (thing: any): thing is LinkedListLikeAtom =>
  thing?.__reatomLinkedList === true
