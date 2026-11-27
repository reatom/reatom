import {
  _read,
  action,
  assert,
  atom,
  type AtomLike,
  bind,
  changesSince,
  computed,
  type Fn,
  isAbort,
  isAction,
  isAtom,
  isLinkedListAtom,
  isObject,
  type LinkedList,
  type LLNode,
  log,
  peek,
  ReatomError,
  type Rec,
  top,
  type Unsubscribe,
} from '@reatom/core'

import {
  booleanAttributes,
  noisyDomEvents,
  propertiesAsAttributes,
} from './constants'
import { jsxError, type JsxErrorPayload, type JsxErrorPhase } from './error'
import {
  type BoundaryHandle,
  DOM,
  jsxBoundary,
  jsxHName,
  jsxInlineStyles,
  metaSymbol,
  stylesheet,
} from './global'
import type {
  AttributesAtomMaybe,
  FieldModelBinding,
  FormModelBinding,
  JSX,
  LinkedListJSXAtom,
} from './jsx'
import { reatomClassName } from './utils'

declare type JSXElement = JSX.Element

export type FC<Props = {}> = (
  props: Props & { children?: JSXElement },
) => JSXElement

export type { JSX, JSXElement }

export { jsxError, type JsxErrorPayload, type JsxErrorPhase }
export { DOM, stylesheet } from './global'
export { cssVar, type CssVar } from './cssVar'
export { reatomClassName } from './utils'
export { instance } from '@reatom/core'

type DomApis = Pick<
  typeof window,
  | 'document'
  | 'Node'
  | 'Text'
  | 'Element'
  | 'MutationObserver'
  | 'HTMLElement'
  | 'HTMLInputElement'
  | 'DocumentFragment'
>

export let DEBUG = atom(true, 'jsx.DEBUG')

let jsxElementKey = (element: Node, key: string) =>
  `${jsxHName.current}.${element.nodeName.toLowerCase()}._${key}`

let eventActionName = (
  component: string,
  element: Node,
  eventKey: string,
  handler: Fn,
) => {
  let elementPart = element.nodeName.toLowerCase()
  let base = component ? `${component}.${elementPart}` : elementPart
  let segment =
    handler.name && handler.name !== `on:${eventKey}` ? handler.name : eventKey
  let hideFromLogs = noisyDomEvents.has(eventKey)
  return `${base}${hideFromLogs ? '._' : '.'}${segment}`
}

export let jsxEvent = action(
  (name: string, event: Event, node: Node, handler: Fn) => {
    if (!/\._/.test(name)) log.label(name, event, node)
    try {
      let result = handler(event)
      ;(result as PromiseLike<unknown>)?.then?.(undefined, (error: unknown) => {
        reportJsxError(error, 'event', name, node)
      })
      return result
    } catch (error) {
      reportJsxError(error, 'event', name, node)
      throw error
    }
  },
  'jsx._event',
)

interface Meta {
  boundary: BoundaryHandle | undefined
  /** Created on the first subscription: most meta nodes have none. */
  subscribes: undefined | (() => Unsubscribe)[]
  unsubscribes: undefined | Unsubscribe[]
  mount: ((element: Node) => ((element: Node) => void) | undefined) | undefined
  unmount: ((element: Node) => void) | undefined
  /**
   * Whether the node is currently connected. Keeps ref-only nodes mounted when
   * a DOM move reports both removal and addition (`unsubscribes.length` cannot
   * identify those nodes) and marks never-connected nodes so cleanup preserves
   * their subscribe thunks for a future append.
   */
  mounted: boolean
  /**
   * A node torn down after a real removal: its subscriptions are off and its
   * `on:*` listeners ignore events until it is connected again, which
   * resubscribes it and runs its ref again.
   */
  suspended: boolean
}
/**
 * Adds an item to a lazily created array. A one-item literal has room for one
 * item; an empty literal grows to 17 slots on its first push.
 */
let add = <T>(array: undefined | T[], item: T): T[] =>
  array ? (array.push(item), array) : [item]
let createMeta = (subscribes?: Meta['subscribes']): Meta => ({
  boundary: undefined,
  subscribes,
  unsubscribes: undefined,
  mount: undefined,
  unmount: undefined,
  mounted: false,
  suspended: false,
})
let ensureMeta = (node: Node): Meta =>
  ((node as any)[metaSymbol()] ??= createMeta())
export let findBoundary = (node: Node): BoundaryHandle | undefined => {
  let symbol = metaSymbol()
  let current: Node | null = node
  while (current) {
    let boundary = ((current as any)[symbol] as Meta | undefined)?.boundary
    if (boundary) return boundary
    current = current.parentNode
  }
  return undefined
}
let reportJsxError = (
  error: unknown,
  phase: JsxErrorPhase,
  name: string,
  node?: Node,
): Element | undefined => {
  if (isAbort(error)) return undefined

  jsxError({ error, phase, name, node })

  let boundary = (node && findBoundary(node)) || jsxBoundary.current
  if (boundary) {
    boundary(error)
  } else if (!(error instanceof Promise) && node) {
    let ElementConstructor = node.ownerDocument?.defaultView?.Element
    let host =
      ElementConstructor && node instanceof ElementConstructor
        ? node
        : node.parentElement
    host?.setAttribute('data-reatom-error', '')
    return host ?? undefined
  }
  return undefined
}
let clearJsxError = (marked?: Element): undefined =>
  void marked?.removeAttribute('data-reatom-error')

let unlink = (node: Node, subscribe: () => () => void) => {
  let symbol = metaSymbol()
  let meta = (node as any)[symbol] as Meta | undefined
  if (meta === undefined) (node as any)[symbol] = meta = createMeta([subscribe])
  else meta.subscribes = add(meta.subscribes, subscribe)
  if (node.isConnected) meta.unsubscribes = add(meta.unsubscribes, subscribe())
}

let lifecycle = (phase: 'ref' | 'mount', node: Node, cb: () => void) => {
  try {
    cb()
  } catch (error) {
    reportJsxError(error, phase, node.nodeName.toLowerCase(), node)
  }
}

/**
 * Subscribe parent-first (pre-order) so boundaries exist before descendants
 * initialize, then mount refs in post-order: children before their parent,
 * siblings in document order. For `<A><B><C/></B><D/></A>` refs run C, B, D, A.
 * Cleanup reverses the subscription order below.
 *
 * The walk follows the real DOM pointers with an explicit stack. A subscription
 * may emit synchronously and rewrite the following content (live fragment
 * update, primitive Text upgrade), so after each child the walk re-checks it:
 * when the child was detached (`replaceWith`), it resumes after the last child
 * still in place, keeping the replacement content and the following siblings in
 * the traversal. Emissions only rewrite content after their own node, so
 * earlier siblings stay valid anchors. (`NodeIterator` would give this liveness
 * for free, but live iterators tax every later DOM mutation of the document.)
 */
let connectNode = (node: Node, symbol: symbol) => {
  let toMount: Node[] = []
  // Pairs of an open node and, before it, the last child still in place of
  // its parent.
  let stack: (Node | null)[] = []
  let prev: Node | null = null
  let next: Node | null = node
  for (;;) {
    if (next) {
      let meta = (next as any)[symbol] as Meta | undefined
      if (meta && !meta.unsubscribes?.length) {
        meta.suspended = false
        // Inlined `lifecycle`: no closure per subscription on every mount.
        if (meta.subscribes)
          for (let subscribe of meta.subscribes) {
            try {
              meta.unsubscribes = add(meta.unsubscribes, subscribe())
            } catch (error) {
              reportJsxError(error, 'mount', next.nodeName.toLowerCase(), next)
            }
          }
      }
      stack.push(prev, next)
      prev = null
      next = next.firstChild
      continue
    }
    let done = stack.pop()!
    prev = stack.pop()!
    if ((done as any)[symbol]?.mounted === false) toMount.push(done)
    let parent = stack[stack.length - 1]
    if (!parent) break
    if (done.parentNode === parent) prev = done
    next = prev ? prev.nextSibling : parent.firstChild
  }

  for (let node of toMount) {
    let meta = (node as any)[symbol] as Meta
    // The `mounted` re-check dedupes nodes queued twice by a mid-walk restart.
    if (meta.mounted) continue
    meta.mounted = true
    lifecycle('ref', node, () => {
      let unmount = meta.mount?.(node)
      if (typeof unmount === 'function') meta.unmount = unmount
    })
  }
}

/**
 * Unmount refs in pre-order (parent before its children, siblings in document
 * order), then unsubscribe the batch in reverse DOM order. The latter mirrors
 * normal parent-first registration so shared core pubs can use their
 * `pub.subs.pop()` path. Takes over `nodes` as the walk stack.
 */
let cleanupNodes = (nodes: Node[], symbol: symbol) => {
  let metaNodes: Node[] = []
  let node: Node | null | undefined
  nodes.reverse()
  while ((node = nodes.pop())) {
    let meta = (node as any)[symbol] as Meta | undefined
    if (meta) {
      metaNodes.push(node)
      let unmount = meta.unmount
      if (unmount) {
        meta.unmount = undefined
        lifecycle('ref', node, () => unmount(node!))
      }
    }
    // The children are read after the ref ran, so a ref that changes its
    // removed subtree does not disturb the walk.
    for (node = node.lastChild; node; node = node.previousSibling)
      nodes.push(node)
  }

  while ((node = metaNodes.pop())) {
    let meta = (node as any)[symbol] as Meta

    // A node that was never connected (appended and removed in the same tick,
    // or fresh content inside a removed ancestor) keeps its subscribe thunks
    // for a future append.
    if (!meta.mounted && !meta.unsubscribes?.length) continue

    // Popping walks the array in reverse and empties it without a `length`
    // write, which is a slow path.
    let unsubscribe: Unsubscribe | undefined
    while ((unsubscribe = meta.unsubscribes?.pop()))
      lifecycle('mount', node, unsubscribe)

    // The subscribe thunks stay: a node connected again resubscribes, e.g. a
    // cached list row shown again. They are collected with the node.
    meta.mounted = false
    meta.suspended = true
  }
}

let isSkipped = (value: unknown): value is boolean | '' | null | undefined =>
  typeof value === 'boolean' || value === '' || value == null

/**
 * `LiveDocumentFragment` is part of the runtime children union (fragments are
 * appended as regular nodes) but is not representable in `ElementChildren`
 * (`DocumentFragment` is not a `ChildNode`), so it is spelled out explicitly.
 */
type ChildrenValue = JSX.ElementChildren | LiveDocumentFragment
type WalkChildren = ChildrenValue | LinkedListJSXAtom

/**
 * @see https://www.measurethat.net/Benchmarks/Show/13274
 * @todo Explore adding elements to a DocumentFragment before adding them to a
 *   Document.
 */
let walk = (
  dom: DomApis,
  element: JSX.Element | DocumentFragment,
  children: WalkChildren,
) => {
  if (Array.isArray(children)) {
    for (let i = 0; i < children.length; i++) walk(dom, element, children[i])
  } else if (isLinkedListAtom(children)) {
    walkLinkedList(dom, element as JSX.Element, children as any)
  } else if (isAtom(children)) {
    element.append(walkAtom(dom, children as AtomLike<JSX.ElementChildren>))
  } else if (typeof children === 'function') {
    walk(
      dom,
      element,
      computed(children as () => any, jsxElementKey(element, 'children')),
    )
  } else if (!isSkipped(children)) {
    element.append(children as Node | string)
  }
}

/** Non-skipped string/number/bigint — safe for a single Text node (no markers). */
let isPrimitiveText = (value: unknown): value is string | number | bigint =>
  (typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'bigint') &&
  !isSkipped(value)

let walkAtom = (dom: DomApis, anAtom: AtomLike<ChildrenValue>): Node => {
  let state: ChildrenValue
  try {
    state = peek(anAtom)
  } catch (error) {
    return walkAtomFragment(dom, anAtom, undefined, error)
  }

  /**
   * Fast path for label-like atoms: one Text node instead of a live fragment
   * with comment markers. Only when the _initial_ value is a non-skipped
   * primitive — skipped values (boolean / '' / null / undefined) and complex
   * children keep the fragment path for correct empty/marker semantics.
   */
  if (isPrimitiveText(state)) {
    let textNode = dom.document.createTextNode(String(state))
    let marked: Element | undefined
    let onError = (error: unknown) => {
      marked = reportJsxError(error, 'children', anAtom.name, textNode)
    }

    unlink(textNode, () =>
      anAtom.subscribe((newState) => {
        marked = clearJsxError(marked)
        if (Object.is(state, (state = newState))) return
        if (
          typeof newState === 'string' ||
          typeof newState === 'number' ||
          typeof newState === 'bigint'
        ) {
          textNode.data = String(newState)
        } else if (isSkipped(newState)) {
          textNode.data = ''
        } else {
          // Upgrade to the live-fragment path: complex children (elements,
          // arrays, nested atoms) need markers and full `walk` rendering.
          // Replacing the Text node lets the MutationObserver tear down this
          // subscription and connect the fragment's one; the fragment renders
          // `newState` eagerly, so nothing is missed in between.
          textNode.replaceWith(walkAtomFragment(dom, anAtom, newState))
        }
      }, onError),
    )

    return textNode
  }

  return walkAtomFragment(dom, anAtom, state)
}

let walkAtomFragment = (
  dom: DomApis,
  anAtom: AtomLike<ChildrenValue>,
  state?: ChildrenValue,
  peekError?: unknown,
): LiveDocumentFragment => {
  let fragment = createLiveFragment(dom, anAtom.name)
  let { start, end, update } = fragment.__reatomFragment
  let marked: Element | undefined

  let onError = (error: unknown) => {
    marked = reportJsxError(error, 'children', anAtom.name, start)
  }

  /**
   * Render the current state eagerly while the fragment is detached, so the
   * whole tree (including nested reactive children) is built before `mount`
   * appends it, avoiding a wave of live-DOM insertions per nesting level.
   * `update` cannot be used here: `start.after(fragment)` would insert the
   * fragment into itself, so the content goes through a buffer instead. Reads
   * that throw (suspense Promise, abort, errors) leave the fragment empty; the
   * error is reported and a boundary may render a fallback.
   */
  if (peekError !== undefined) {
    onError(peekError)
  } else {
    try {
      if (state === undefined) state = peek(anAtom)
      let initialContent = dom.document.createDocumentFragment()
      walk(dom, initialContent, state)
      end.before(initialContent)
    } catch (error) {
      onError(error)
    }
  }

  /**
   * `subscribe` emits synchronously on every (re)connect. Skipping states that
   * match the last rendered one covers both the first mount (eagerly rendered
   * above) and re-append of an unchanged node, while a state changed while
   * disconnected still re-renders.
   */
  unlink(start, () =>
    anAtom.subscribe((newState) => {
      marked = clearJsxError(marked)
      if (!Object.is(state, (state = newState))) update(newState)
    }, onError),
  )

  return fragment
}

let walkLinkedList = (
  dom: DomApis,
  element: JSX.Element,
  list: LinkedListJSXAtom,
) => {
  let lastState: undefined | LinkedList<LLNode<JSX.Element>>
  let mounted = new Set<JSX.Element>()
  const first = (node: JSX.Element): Node =>
    isLiveFragment(node) ? node.__reatomFragment.start : node
  const last = (node: JSX.Element): Node =>
    isLiveFragment(node) ? node.__reatomFragment.end : node
  const remove = (node: JSX.Element) => {
    if (isLiveFragment(node)) {
      const range = node.__reatomFragment
      range.update()
      range.start.remove()
      range.end.remove()
    } else if (node.parentNode === element) element.removeChild(node)
    mounted.delete(node)
  }
  const place = (nodes: readonly JSX.Element[], anchor: Node | null) => {
    const fragment = dom.document.createDocumentFragment()
    for (const node of nodes) {
      throwNativeFragment(node)
      let current: Node | null = first(node)
      const end = last(node)
      while (current) {
        const next: Node | null = current.nextSibling
        fragment.appendChild(current)
        if (current === end) break
        current = next
      }
      mounted.add(node)
    }
    element.insertBefore(fragment, anchor)
  }
  const cb = (state: LinkedList<LLNode<JSX.Element>>) => {
    if (lastState === state) return
    const focused = dom.document.activeElement as HTMLInputElement | null
    const selection =
      focused && 'selectionStart' in focused
        ? ([
            focused.selectionStart,
            focused.selectionEnd,
            focused.selectionDirection,
          ] as const)
        : null
    const changes = changesSince(lastState?.version, state)
    if (!changes) {
      const desired: JSX.Element[] = []
      for (let node = state.head; node; node = node[state.LL_NEXT] ?? null)
        desired.push(node)
      const wanted = new Set(desired)
      for (const node of mounted) if (!wanted.has(node)) remove(node)
      let anchor = element.firstChild
      for (const node of desired) {
        if (first(node) !== anchor) place([node], anchor)
        anchor = last(node).nextSibling
      }
    } else
      for (const change of changes) {
        switch (change.kind) {
          case 'insert':
          case 'move':
            place(
              change.nodes,
              change.after
                ? last(change.after).nextSibling
                : element.firstChild,
            )
            break
          case 'remove':
            for (const node of change.nodes) remove(node)
            break
          case 'clear':
            // When the rows are all the children (a live fragment adds its
            // markers to the count), empty the element at once: one DOM
            // operation and one mutation record instead of one per row.
            if (mounted.size === element.childNodes.length) {
              element.textContent = ''
              mounted.clear()
            } else for (const node of mounted) remove(node)
            break
          case 'swap': {
            const a = change.a,
              b = change.b
            const aNext = last(a).nextSibling,
              bNext = last(b).nextSibling
            if (aNext === first(b)) place([b], first(a))
            else if (bNext === first(a)) place([a], first(b))
            else {
              place([a], bNext)
              place([b], aNext)
            }
            break
          }
        }
      }
    if (focused?.isConnected && dom.document.activeElement !== focused) {
      focused.focus({ preventScroll: true })
      if (selection && selection[0] !== null)
        focused.setSelectionRange(
          selection[0],
          selection[1],
          selection[2] ?? undefined,
        )
    }
    lastState = state
  }
  unlink(element, () =>
    list.subscribe((state) => cb(state as LinkedList<LLNode<JSX.Element>>)),
  )
  if (!lastState) cb(peek(list) as LinkedList<LLNode<JSX.Element>>)
}

interface LiveDocumentFragment extends DocumentFragment {
  __reatomFragment: {
    start: Comment
    end: Comment
    update: (children?: WalkChildren) => void
    /**
     * Original JSX children of a `<>...</>` (`hf`) fragment. Rendering empties
     * a `DocumentFragment`, so `ErrorBoundary` rebuilds it from the recipe:
     * function and atom children run again, element children are re-attached as
     * they are.
     */
    recipe?: JSX.ElementChildren
  }
}

let isLiveFragment = (node: Node): node is LiveDocumentFragment =>
  !!node && '__reatomFragment' in node

/** A `<>...</>` fragment created by `h(hf, ...)` — it carries a recipe. */
let isHfFragment = <T>(children: T): children is T & LiveDocumentFragment =>
  isObject(children) &&
  '__reatomFragment' in children &&
  'recipe' in (children as unknown as LiveDocumentFragment).__reatomFragment

/** Builds a `<>...</>` live fragment from its JSX children. */
let materializeHf = (
  dom: DomApis,
  recipe: JSX.ElementChildren,
): LiveDocumentFragment => {
  let fragment = createLiveFragment(dom, '')
  fragment.__reatomFragment.recipe = recipe
  walk(dom, fragment, recipe)
  fragment.append(fragment.__reatomFragment.end)
  return fragment
}

/**
 * Replaces rendered (and so emptied) `<>...</>` fragments with fresh ones built
 * from their recipes, nested fragments included. Fragments that were not
 * rendered yet and all other children are returned as they are.
 */
let rebuildConsumedFragments = <T>(dom: DomApis, children: T): T => {
  if (Array.isArray(children)) {
    return children.map((child) => rebuildConsumedFragments(dom, child)) as T
  }
  if (isHfFragment(children) && !children.firstChild) {
    let recipe = rebuildConsumedFragments(dom, children.__reatomFragment.recipe)
    return materializeHf(dom, recipe) as T
  }
  return children
}

/**
 * Whether children hold DOM nodes built in advance, `<>...</>` recipes
 * included.
 */
let hasEagerNode = (dom: DomApis, children: unknown): boolean => {
  if (Array.isArray(children)) {
    return children.some((child) => hasEagerNode(dom, child))
  }
  if (isHfFragment(children)) {
    return hasEagerNode(dom, children.__reatomFragment.recipe)
  }
  return children instanceof dom.Node
}

let throwNativeFragment = (element: JSX.Element) => {
  // Elements (nodeType 1) are never native fragments — skip assert in createMany.
  if (element.nodeType === 1) return
  assert(
    // DocumentFragment.nodeType === 11; avoid String(element) allocation
    element.nodeType !== 11 || '__reatomFragment' in element,
    'native fragment is not supported',
    ReatomError,
  )
}

let createLiveFragment = (dom: DomApis, name: string): LiveDocumentFragment => {
  let fragment = dom.document.createDocumentFragment() as LiveDocumentFragment
  let start = dom.document.createComment(name)
  let end = start.cloneNode() as Comment
  let marked: Element | undefined
  let update = (children?: WalkChildren) => {
    if (start.nextSibling && start.nextSibling !== end) {
      let staleRange = dom.document.createRange()
      staleRange.setStartAfter(start)
      staleRange.setEndBefore(end)
      staleRange.deleteContents()
    }

    try {
      walk(dom, fragment, children)
      start.after(fragment)
      marked = clearJsxError(marked)
    } catch (error) {
      marked = reportJsxError(error, 'children', name, start)
    }
  }
  fragment.__reatomFragment = {
    start,
    end,
    update,
  }
  fragment.append(start, end)
  return fragment
}

type RefCallback = (
  element: Node,
) => void | ((element: Node) => void) | undefined

let setProps = (dom: DomApis, element: JSX.Element, props: Rec) => {
  let fieldUserRef =
    props['model:field'] != null && typeof props.ref === 'function'
      ? (props.ref as RefCallback)
      : undefined

  for (let key in props) {
    if (key === 'ref' && fieldUserRef !== undefined) continue
    if (key === 'model:field') {
      bindFieldModel(dom, element, props[key], fieldUserRef)
      continue
    }
    setProp(dom, element, key, props[key])
  }
}

let bindFormModel = (
  dom: DomApis,
  element: JSX.Element,
  form: FormModelBinding,
) => {
  let el = element as HTMLElement
  setProp(dom, element, 'on:submit', (event: Event) => {
    event.preventDefault()
    form.submit()
  })

  let sync = () => {
    let submitting = !form.submit.ready()
    el.toggleAttribute('data-submitting', submitting)
    el.classList.toggle('is-submitting', submitting)
    let submitted = form.submitted()
    el.toggleAttribute('data-submitted', submitted)
    el.classList.toggle('is-submitted', submitted)
    let hasError = !!form.submit.error()
    el.toggleAttribute('data-submit-error', hasError)
    el.classList.toggle('has-submit-error', hasError)
  }
  unlink(element, () => {
    let un1 = form.submit.ready.subscribe(sync)
    let un2 = form.submitted.subscribe(sync)
    let un3 = form.submit.error.subscribe(sync)
    return () => {
      un1()
      un2()
      un3()
    }
  })
  sync()
}

let bindFieldModel = (
  dom: DomApis,
  element: JSX.Element,
  field: FieldModelBinding,
  userRef?: RefCallback,
) => {
  let value = peek(field.value)
  let kind =
    typeof value === 'boolean'
      ? 'checkbox'
      : typeof value === 'number'
        ? 'number'
        : 'text'

  if (element instanceof dom.HTMLInputElement) {
    if (kind === 'checkbox') set(dom, element, 'attr:type', 'checkbox')
    else if (kind === 'number') set(dom, element, 'attr:type', 'number')
  }

  setProp(dom, element, 'on:input', (event: Event) => {
    let target = event.target as HTMLInputElement
    if (target.validity?.badInput) return
    if (kind === 'checkbox') field.change(target.checked)
    else if (kind === 'number') {
      let num = target.valueAsNumber
      field.change(Number.isNaN(num) ? undefined : num)
    } else field.change(target.value)
  })
  setProp(dom, element, 'on:blur', field.focus.out)
  setProp(dom, element, 'on:focus', field.focus.in)

  unlink(element, () =>
    field.value.subscribe((val) =>
      kind === 'checkbox'
        ? set(dom, element, 'checked', val)
        : set(dom, element, 'value', val == null ? '' : val),
    ),
  )
  unlink(element, () =>
    field.disabled.subscribe((disabled) =>
      set(dom, element, 'prop:disabled', disabled),
    ),
  )

  ensureMeta(element).mount = () => {
    field.elementRef.set(element as HTMLElement)
    let userCleanup = userRef?.(element)
    return (el) => {
      field.elementRef.set(undefined)
      if (typeof userCleanup === 'function') userCleanup(el)
    }
  }
}

/**
 * @todo Show warning if isAction(value).
 *
 * @todo Revert previous value.
 */
/** Inside a reactive `$spread` record, whose `on:*` handlers are replaceable. */
let spreadDepth = 0

let bindSpread = (dom: DomApis, element: JSX.Element, value: any) => {
  let isReactive = typeof value === 'function' || isAtom(value)
  if (!isReactive) {
    setProps(dom, element, value)
    return
  }

  let stale: Unsubscribe[] = []
  let dispose = () => {
    for (let i = stale.length - 1; i >= 0; i--) stale[i]!()
    stale = []
  }
  /**
   * `unlink` is the only writer of the meta arrays, so everything appended
   * during `setProps` belongs to the current spread record: the subscribe
   * thunks are dropped (this subscription is the single re-entry point on
   * reconnect) and the unsubscribes are taken over to be disposed before the
   * next record is applied. Nested spreads splice their own additions first,
   * leaving only their subscription for the parent to own — disposal cascades.
   */
  let marked: Element | undefined
  let spread = (val: any) => {
    marked = clearJsxError(marked)
    dispose()
    let meta = ensureMeta(element)
    let subscribesCount = meta.subscribes?.length ?? 0
    let unsubscribesCount = meta.unsubscribes?.length ?? 0
    spreadDepth++
    try {
      setProps(dom, element, val)
    } finally {
      spreadDepth--
    }
    if (meta.subscribes) meta.subscribes.length = subscribesCount
    stale = meta.unsubscribes?.splice(unsubscribesCount) ?? []
  }
  unlink(element, () => {
    let source = isAtom(value)
      ? value
      : computed(value, jsxElementKey(element, '$spread'))
    let unsubscribe = source.subscribe(spread, (error) => {
      marked = reportJsxError(
        error,
        'prop',
        jsxElementKey(element, '$spread'),
        element,
      )
    })
    return () => {
      dispose()
      unsubscribe()
    }
  })
}

let setProp = (dom: DomApis, element: JSX.Element, key: string, value: any) => {
  if (key === 'children' || key === 'element' || value === undefined) return

  /**
   * @todo Show warning if isAtom(value) && !isAction(value).
   *
   * @todo Convert to named action.
   */
  if (key === 'ref') {
    ensureMeta(element).mount = () => value(element)
    return
  }

  /** @todo Show warning if isAtom(value) && !isAction(value). */
  if (key.startsWith('on:')) {
    key = key.slice(3)
    // The action name is built on the first event, from the component name
    // captured now: most listeners never fire.
    let name: string
    let component = jsxHName.current
    let meta = ensureMeta(element)
    // Run in the root frame, not `top()`. Row render often runs inside
    // `reatomMap`'s computed; capturing that frame would pin its pre-`_copy`
    // state (createMany `nodes` / head→tail) for as long as the listener
    // lives, which is the 25_run-clear-memory leak. Calling `run` directly
    // saves the bound function `bind` would allocate per listener.
    let { frame } = top().root
    let listener = (event: Event) => {
      if (!meta.suspended)
        frame.run(
          jsxEvent,
          (name ??= eventActionName(component, element, key, value)),
          event,
          element,
          value,
        )
    }
    /**
     * Registered once, so it works before the first mount. A removed node keeps
     * the listener, collected with the node, instead of paying a
     * `removeEventListener` per element on unmount; `suspended` keeps it inert
     * until the node is connected again. Only a reactive `$spread` record
     * replaces its handlers, so only it unlinks them.
     */
    element.addEventListener(key, listener)
    if (spreadDepth > 0)
      unlink(element, () => {
        element.addEventListener(key, listener)
        return () => element.removeEventListener(key, listener)
      })
    return
  }

  if (key === '$spread') {
    bindSpread(dom, element, value)
    return
  }

  // A static value is set once: no closures to keep it updated.
  if (
    typeof value !== 'function' &&
    typeof value !== 'object' &&
    !key.startsWith('model:')
  ) {
    try {
      set(dom, element, key, value)
    } catch (error) {
      if (key === 'innerHTML' || key === 'prop:innerHTML') throw error
      reportJsxError(error, 'prop', jsxElementKey(element, key), element)
    }
    return
  }

  let marked: Element | undefined
  let onPropError = (error: unknown) => {
    marked = reportJsxError(error, 'prop', jsxElementKey(element, key), element)
  }
  let setter = (val: unknown) => {
    try {
      set(dom, element, key, val)
      marked = clearJsxError(marked)
    } catch (error) {
      if (key === 'innerHTML' || key === 'prop:innerHTML') throw error
      onPropError(error)
    }
  }

  if (key === 'class' || key === 'className') {
    if (typeof value === 'object' || typeof value === 'function') {
      unlink(element, () =>
        reatomClassName(value).subscribe(setter, onPropError),
      )
    } else {
      setter(value)
    }
    return
  }

  if (key === 'model' && element.nodeName.toUpperCase() === 'FORM') {
    bindFormModel(dom, element, value)
    return
  }

  if (key.startsWith('model:')) {
    key = key.slice(6)
    if (key === 'checked') {
      if (
        element instanceof dom.HTMLInputElement &&
        !element.hasAttribute('type')
      ) {
        set(dom, element, 'attr:type', 'checkbox')
      }
      let setChecked = setter
      setter = (val) => {
        setChecked(val)
        set(dom, element, 'aria-checked', val)
      }
    }
    setProp(dom, element, 'on:input', (event: any) => {
      if (!event.target.validity.badInput) {
        let val = event.target[key]
        value.set(val == null || Number.isNaN(val) ? undefined : val)
      }
    })
  }

  if (isAtom(value) && !isAction(value)) {
    unlink(element, () => value.subscribe(setter, onPropError))
  } else if (typeof value === 'function') {
    unlink(element, () =>
      computed(value, jsxElementKey(element, key)).subscribe(
        setter,
        onPropError,
      ),
    )
  } else {
    setter(value)
  }
}

let styleSheetsSeen = (sheet: CSSStyleSheet) => {
  let sheets = (jsxInlineStyles.sheets ??= new WeakMap())
  let seen = sheets.get(sheet)
  if (seen) return seen

  seen = new Set<string>()
  sheets.set(sheet, seen)
  for (let index = 0; index < sheet.cssRules.length; index++) {
    let rule = sheet.cssRules.item(index)
    let match = rule?.cssText.match(/data-reatom-style="([^"]+)"/)
    if (match?.[1]) seen.add(match[1])
  }
  return seen
}

/**
 * Inserts `value` into the stylesheet of the current root. The style id is
 * shared, but each sheet gets its own rule so a later shadow sheet or a sheet
 * created after `context.reset()` still matches `data-reatom-style`.
 */
let ensureStyleRule = (value: string) => {
  let styleId = jsxInlineStyles.ids[value]
  if (!styleId) {
    styleId = jsxInlineStyles.ids[value] = '_' + ++jsxInlineStyles.count
  }

  let sheet = stylesheet()
  let seen = styleSheetsSeen(sheet)
  if (!seen.has(styleId)) {
    seen.add(styleId)
    sheet.insertRule(`[data-reatom-style="${styleId}"]{${value}}`)
  }
  return styleId
}

let set = (dom: DomApis, element: JSX.Element, key: string, value: any) => {
  if (key.startsWith('css:')) {
    setStyleProp(
      element.style,
      '--' + key.slice(4),
      value == null ? value : String(value),
    )
  } else if (key === 'css') {
    /** @todo Should support record? */
    element.setAttribute('data-reatom-style', ensureStyleRule(value))
  } else if (key === 'style') {
    if (isObject(value)) {
      for (let key in value) setStyleProp(element.style, key, value[key])
    } else if (typeof value === 'string') {
      element.style.cssText = value
    } else {
      element.removeAttribute('style')
    }
  } else if (key.startsWith('style:')) {
    setStyleProp(element.style, key.slice(6), value)
  } else if (key.startsWith('class:')) {
    element.classList.toggle(key.slice(6), !!value)
  } else if (key.startsWith('prop:')) {
    if (key === 'prop:innerHTML' && element.childElementCount) {
      throw new ReatomError('Can only set one of `children` or `innerHTML`.')
    }
    // @ts-expect-error
    element[key.slice(5)] = value
  } else if (
    !propertiesAsAttributes.has(key) &&
    element instanceof dom.HTMLElement &&
    (key in element || key === 'class')
  ) {
    /**
     * @see https://measurethat.net/Benchmarks/Show/54
     * @see https://measurethat.net/Benchmarks/Show/31249
     */
    if (key === 'class') key = 'className'
    /** @note element.valueAsNumber = '' // element.value === '0' */ else if (
      key === 'valueAsNumber'
    )
      key = 'value'

    // TODO this is the most slow part
    /** @note element.valueAsDate = '' // Uncaught TypeError: Failed to convert value to 'object'. */
    if (key === 'innerHTML' && element.childElementCount) {
      throw new ReatomError('Can only set one of `children` or `innerHTML`.')
    }
    // @ts-ignore
    element[key] = value == null && key !== 'valueAsDate' ? '' : value
  } else {
    if (key === 'className') key = 'class'
    else if (key.startsWith('attr:')) key = key.slice(5)

    /**
     * @note aria- and data- attributes have no boolean representation.
     * A `false` value is different from the attribute not being
     * present, so we can't remove it. For non-boolean aria
     * attributes we could treat false as a removal, but the
     * amount of exceptions would cost too many bytes. On top of
     * that other frameworks generally stringify `false`.
     */
    let isBool = booleanAttributes.has(key)
    if (value == null || (isBool && value === false))
      element.removeAttribute(key)
    else element.setAttribute(key, isBool && value === true ? '' : value)
  }
}

let setStyleProp = (
  style: CSSStyleDeclaration,
  key: string,
  value: any,
): void => {
  if (value == null) style.removeProperty(key)
  else style.setProperty(key, value)
}

/**
 * The environment of the component being rendered: `h` reads `DOM` and `DEBUG`
 * once per component instead of once per element. Elements created outside a
 * component read them directly.
 */
let renderDom: undefined | typeof globalThis.window
let renderDebug = false

export let h = (tag: any, props: Rec, ...children: any[]): JSX.Element => {
  let dom = renderDom ?? _read(DOM)?.state ?? peek(DOM)

  if (isAtom(tag)) {
    // FIXME we need types refactoring
    return walkAtom(dom, tag) as any
  }

  if (tag === hf) {
    // needed for `walkLinkedList`
    // FIXME we need types refactoring
    return materializeHf(
      dom,
      children.length === 1 ? children[0] : children,
    ) as any
  }

  props ??= {}

  let element: JSX.Element

  if (typeof tag === 'function') {
    if (children.length) {
      props.children = children
    }

    if (tag === Bind) {
      element = props.element
      props.element = undefined
    } else {
      let prev = jsxHName.current
      let prevDom = renderDom
      let prevDebug = renderDebug
      try {
        jsxHName.current = tag.name
        renderDom = dom
        renderDebug = prevDom
          ? prevDebug
          : !!(_read(DEBUG)?.state ?? peek(DEBUG))
        return tag(props)
      } finally {
        jsxHName.current = prev
        renderDom = prevDom
        renderDebug = prevDebug
      }
    }
  } else {
    element = tag.startsWith('svg:')
      ? dom.document.createElementNS('http://www.w3.org/2000/svg', tag.slice(4))
      : dom.document.createElement(tag)

    // For debug
    if (
      jsxHName.current &&
      (renderDom ? renderDebug : (_read(DEBUG)?.state ?? peek(DEBUG)))
    )
      element.setAttribute('data-reatom-name', jsxHName.current)
  }

  if ('children' in props) children = props.children

  walk(dom, element, children)

  setProps(dom, element, props)

  return element
}

/**
 * Fragment.
 *
 * @todo Describe a function as a component.
 */
export let hf = () => {}

export let mount = (
  target: Element,
  child: Element,
): { unmount: Unsubscribe } => {
  let dom = DOM()
  let symbol = metaSymbol()

  /**
   * @note A DOM move (insertBefore/append of an already-attached node) creates
   * two mutations: deletion then addition. After records are delivered the node
   * is already `isConnected`, so we skip teardown/resubscribe and keep atom
   * subscriptions alive (critical for linked-list swap/move).
   */
  let processMutations = (mutationsList: MutationRecord[]) => {
    // Indexed loops: `for...of` over a `NodeList` costs about twice as much,
    // which shows when a clear removes thousands of rows at once.
    let removedNodes: Node[] = []
    for (let mutation of mutationsList) {
      let nodes = mutation.removedNodes
      for (let i = 0; i < nodes.length; i++)
        if (!nodes[i]!.isConnected) removedNodes.push(nodes[i]!)
    }
    cleanupNodes(removedNodes, symbol)

    for (let mutation of mutationsList) {
      let nodes = mutation.addedNodes
      // Skip nodes that were appended and removed within the same batch:
      // they never really appeared, so connecting them would run orphan
      // ref hooks and leak subscriptions with no removal record to come.
      for (let i = 0; i < nodes.length; i++)
        if (nodes[i]!.isConnected) connectNode(nodes[i]!, symbol)
    }
  }
  let observer = new dom.MutationObserver(bind(processMutations))
  observer.observe(target.parentElement!, {
    childList: true,
    subtree: true,
  })

  // TODO fix
  // target.append(...[child].flat(Infinity))
  target.append(child)

  return {
    unmount: bind(() => {
      processMutations(observer.takeRecords())
      observer.disconnect()
      cleanupNodes([child], symbol)
      child.remove()
    }),
  }
}

/**
 * This simple utility needed only for syntax highlighting and it just
 * concatenates all passed strings. Falsy values are ignored, except for `0`.
 */
export let css = (strings: TemplateStringsArray, ...values: any[]) => {
  let result = ''
  for (let i = 0; i < strings.length; i++) {
    result += strings[i] + (values[i] || values[i] === 0 ? values[i] : '')
  }
  return result
}

export let Bind = <T extends Element>(
  props: { element: T } & AttributesAtomMaybe<
    Partial<Omit<T, 'children'>> & JSX.DOMAttributes<T>
  >,
): T => props.element

export interface ErrorBoundaryProps {
  fallback: (error: unknown, retry: () => void) => JSX.ElementChildren
  pending?: JSX.ElementChildren
  onError?: (error: unknown) => void
  children?: JSX.ElementChildren
}

/**
 * Catches reactive render errors (and construction errors from lazy children)
 * inside its wrapper. Boundary ownership follows the node's current DOM
 * ancestors, so an element inserted under this boundary is adopted
 * automatically.
 *
 * Prefer lazy children `{() => <Child />}` so construction-time throws are
 * caught and `retry` rebuilds the subtree; eagerly created element children ran
 * before this component. A `<>...</>` child runs its function and atom children
 * again on `retry`, but re-attaches its elements as they are.
 */
export let ErrorBoundary = (props: ErrorBoundaryProps): JSX.Element => {
  let failure = atom<null | { error: unknown }>(null, 'jsx.ErrorBoundary')
  let retry = action(() => failure.set(null), 'jsx.ErrorBoundary.retry')

  let handle: BoundaryHandle = (error) => {
    props.onError?.(error)
    if (error instanceof Promise) {
      // Ignore settles of a promise that is no longer the current failure.
      error.then(
        bind(() => failure()?.error === error && retry()),
        bind((reason: unknown) => failure()?.error === error && handle(reason)),
      )
    }
    failure.set({ error })
  }

  // `h` stores varargs children as an array — unwrap the single-child case.
  let child =
    Array.isArray(props.children) && props.children.length === 1
      ? props.children[0]
      : props.children
  // A linked list atom returns list state when called; only `walk` renders it.
  let isLazyChild = typeof child === 'function' && !isLinkedListAtom(child)
  let dom = _read(DOM)?.state ?? peek(DOM)

  if (peek(DEBUG) && hasEagerNode(dom, child)) {
    console.warn(
      'ErrorBoundary: prefer lazy children `{() => <Child />}` so construction-time errors are caught and retry rebuilds elements',
    )
  }

  let content = computed(() => {
    if (!failure()) {
      let prev = jsxBoundary.current
      jsxBoundary.current = handle
      try {
        let result = isLazyChild
          ? (child as () => JSX.ElementChildren)()
          : rebuildConsumedFragments(dom, child)
        // Nested walkAtom may have reported into this boundary during the call.
        if (!failure()) return result
      } catch (error) {
        // `jsxBoundary.current` is still `handle` here, so this both tracks
        // the error and delivers it to this boundary.
        reportJsxError(error, 'children', 'ErrorBoundary')
      } finally {
        jsxBoundary.current = prev
      }
    }
    let current = failure()
    if (!current) return undefined
    return current.error instanceof Promise
      ? rebuildConsumedFragments(dom, props.pending)
      : props.fallback(current.error, retry)
  }, 'jsx.ErrorBoundary.content')

  let element = dom.document.createElement('span')
  element.style.display = 'contents'
  ensureMeta(element).boundary = handle
  element.append(walkAtom(dom, content))
  return element
}
