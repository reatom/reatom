import {
  action,
  assert,
  type AtomLike,
  type Atom,
  isAtom,
  type Rec,
  type Unsubscribe,
  wrap,
  isAction,
  ReatomError,
  isLinkedListAtom,
  LL_NEXT,
  type LinkedList,
  type LinkedListLikeAtom,
  type LLNode,
  noop,
  addChangeHook,
  isObject,
  atom,
  context,
  computed,
} from '@reatom/core'
import type { AttributesAtomMaybe, JSX } from './jsx'

declare type JSXElement = JSX.Element

export type FC<Props = {}> = (
  props: Props & { children?: JSXElement },
) => JSXElement

export type { JSXElement, JSX }

export { type ClassNameValue, cn } from './utils'

type DomApis = Pick<
  typeof window,
  | 'document'
  | 'Node'
  | 'Text'
  | 'Element'
  | 'MutationObserver'
  | 'HTMLElement'
  | 'DocumentFragment'
>

export let DOM = atom(globalThis.window, 'jsx.DOM')

export let DEBUG = atom(true, 'jsx.DEBUG')

let stylesCount = 0
let styles: Rec<string> = {}
/**
 * @note Create style tag for support oldest browser.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleSheet/CSSStyleSheet
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Document/adoptedStyleSheets
 * @see https://measurethat.net/Benchmarks/Show/5920
 */
export let stylesheet = atom(() => DOM().document.head.appendChild(DOM().document.createElement('style')).sheet!, 'jsx.stylesheet')
let name = ''

interface Meta {
  subscribes: (() => Unsubscribe)[]
  unsubscribes: Unsubscribe[]
  mount: ((element: Node) => ((element: Node) => void) | undefined) | undefined
  unmount: ((element: Node) => void) | undefined
}
let metaSymbol = atom(() => Symbol())
let ensureMeta = (node: Node): Meta => {
  return ((node as any)[metaSymbol()] ??= {
    subscribes: [],
    unsubscribes: [],
    mount: undefined,
    unmount: undefined,
  })
}
let unlink = (node: Node, subscribe: () => () => void) => {
  ensureMeta(node).subscribes.push(subscribe)
}

/**
 * @see https://github.com/preactjs/preact/blob/d16a34e275e31afd6738a9f82b5ba2fb9dbf032b/src/diff/props.js#L107
 * @see https://www.measurethat.net/Benchmarks/Show/7818
 */
let propertiesAsAttributes = new Set([
  /**
   * Numeric attributes with a default value other than 0.
   */
  'height',
  'high',
  'low',
  'optimum',
  'results',
  'size',
  'span',
  'start',
  'width',

  /**
   * Numeric properties with a default value other than 0.
   */
  // 'colspan',
  // 'rowspan',
  // 'maxlength',
  // 'minlength',
  // 'tabindex',

  /**
   * Properties with value HTMLElement.
   */
  'form',
  'list',

  /**
   * Setting the value to an empty string must be explicit.
   */
  'download',
  'href',
  'role',
])
/**
 * @see https://developer.mozilla.org/en-US/docs/Glossary/Boolean/HTML
 */
let booleanAttributes = new Set([
  'allowfullscreen',
  'allowpaymentrequest',
  'async',
  'attributionsrc',
  'autofocus',
  'autoplay',
  'browsingtopics',
  'capture',
  'checked',
  'compact',
  'controls',
  'credentialless',
  'crossorigin',
  'declare',
  'default',
  'defer',
  'disabled',
  'disablepictureinpicture',
  'disableremoteplayback',
  'formnovalidate',
  'hidden',
  'inert',
  'ismap',
  'itemscope',
  'loop',
  'multiple',
  'muted',
  'nomodule',
  'novalidate',
  'open',
  'playsinline',
  'readonly',
  'required',
  'reversed',
  'scoped',
  'selected',
  'shadowrootclonable',
  'shadowrootdelegatesfocus',
  'shadowrootserializable',
  'virtualkeyboardpolicy',
  'webkitdirectory',
])

let isSkipped = (value: unknown): value is boolean | '' | null | undefined =>
  typeof value === 'boolean' || value === '' || value == null

/**
 * @todo Explore adding elements to a DocumentFragment before adding them to a Document.
 * @see https://www.measurethat.net/Benchmarks/Show/13274
 */
let walk = (
  dom: DomApis,
  el: JSX.Element,
  child: JSX.DOMAttributes<JSX.Element>['children'],
) => {
  if (Array.isArray(child)) {
    for (let i = 0; i < child.length; i++) walk(dom, el, child[i])
  } else if (isLinkedListAtom(child)) {
    walkLinkedList(dom, el, child as any)
  } else if (isAtom(child)) {
    el.append(walkAtom(dom, child))
  } else if (!isSkipped(child)) {
    el.append(child as Node | string)
  }
}

let walkLinkedList = (
  dom: DomApis,
  el: JSX.Element,
  list: LinkedListLikeAtom<LinkedList<LLNode<JSX.Element>>>,
) => {
  let lastVersion = -1

  let cb = (state: LinkedList<LLNode<JSX.Element>>) => {
    if (state.version - 1 > lastVersion) {
      el.innerHTML = ''
      for (let { head } = state; head; head = head[LL_NEXT]) {
        throwNativeFragment(head)
        el.append(head)
      }
    } else {
      let appendBatch: undefined | DocumentFragment
      for (let change of state.changes) {
        if (change.kind === 'create') {
          throwNativeFragment(change.node)

          appendBatch ??= dom.document.createDocumentFragment()

          appendBatch.append(change.node)
        } else if (appendBatch) {
          el.append(appendBatch)
          appendBatch = undefined
        }

        if (change.kind === 'remove') {
          if (isLiveFragment(change.node)) {
            let fragment = change.node.__reatomFragment
            fragment.update()
            fragment.start.remove()
            fragment.end.remove()
          } else {
            el.removeChild(change.node)
          }
        }
        // TODO support fragments
        else if (change.kind === 'swap') {
          let [aNext, bNext] = [change.a.nextSibling, change.b.nextSibling]
          if (bNext) {
            el.insertBefore(change.a, bNext)
          } else {
            el.append(change.a)
          }

          if (aNext) {
            el.insertBefore(change.b, aNext)
          } else {
            el.append(change.b)
          }
        }
        // TODO support fragments
        else if (change.kind === 'move') {
          if (change.after) {
            change.after.insertAdjacentElement('afterend', change.node)
          } else {
            el.append(change.node)
          }
        } else if (change.kind === 'clear') {
          el.innerHTML = ''
        }
      }

      if (appendBatch) el.append(appendBatch)
    }
    lastVersion = state.version
  }

  unlink(el, () => {
    // it's critical to not use not a last state, but the each state.
    let unSubscribe = list.subscribe(noop)
    let rootFrame = context()
    let unChange = addChangeHook(list, (state) => {
      if (rootFrame === context()) cb(state)
    })

    return () => {
      unSubscribe()
      unChange()
    }
  })

  let state = list()
  // check if change hook wasn't called by initialization
  if (lastVersion === -1) cb(state)
}

interface LiveDocumentFragment extends DocumentFragment {
  __reatomFragment: {
    start: Comment
    end: Comment
    update: (element?: JSX.ElementPrimitiveChildren) => void
  }
}

let isLiveFragment = (node: Node): node is LiveDocumentFragment =>
  !!node && '__reatomFragment' in node

let throwNativeFragment = (element: JSX.Element) => {
  assert(
    // TODO improve perf
    String(element) !== '[object DocumentFragment]' ||
      '__reatomFragment' in element,
    'native fragment is not supported',
    ReatomError,
  )
}

let createLiveFragment = (dom: DomApis, name: string): LiveDocumentFragment => {
  let fragment = dom.document.createDocumentFragment() as LiveDocumentFragment
  let start = dom.document.createComment(name)
  let end = start.cloneNode() as Comment
  fragment.append(start, end)

  let update = (element?: JSX.ElementPrimitiveChildren) => {
    while (start.nextSibling && start.nextSibling !== end) {
      start.nextSibling!.remove?.()
    }

    if (element instanceof dom.Node) {
      start.after(element)
    } else if (!isSkipped(element)) {
      let node = isAtom(element)
        ? walkAtom(dom, element)
        : dom.document.createTextNode(String(element))
      start.after(node)
    }
  }

  fragment.__reatomFragment = {
    start,
    end,
    update,
  }

  return fragment
}

let walkAtom = (
  dom: DomApis,
  anAtom: AtomLike<JSX.ElementPrimitiveChildren>,
): DocumentFragment => {
  let fragment = createLiveFragment(dom, anAtom.name)

  unlink(
    fragment.__reatomFragment.start,
    () => anAtom.subscribe(fragment.__reatomFragment.update),
  )

  return fragment
}

let patchStyleProperty = (
  style: CSSStyleDeclaration,
  key: string,
  value: any,
): void => {
  if (value == null) style.removeProperty(key)
  else style.setProperty(key, value)
}

let set = (dom: DomApis, element: JSX.Element, key: string, val: any) => {
  if (key.startsWith('on:')) {
    key = key.slice(3)

    element.addEventListener(
      key,
      wrap(
        // only for logging purposes
        action(val, `${name}.${element.nodeName.toLowerCase()}._${key}`),
      ),
    )
  } else if (key.startsWith('css:')) {
    patchStyleProperty(
      element.style,
      '--' + key.slice(4),
      val == null ? val : String(val),
    )
  } else if (key === 'css') {
    let styleId = styles[val]
    if (!styleId) {
      styleId = styles[val] = '' + ++stylesCount
      stylesheet().insertRule(`[data-reatom-style="${styleId}"]{${val}}`)
    }

    /** @see https://measurethat.net/Benchmarks/Show/11819 */
    element.setAttribute('data-reatom-style', styleId)
  } else if (key === 'style') {
    if (isObject(val)) {
      for (let key in val) patchStyleProperty(element.style, key, val[key])
    } else {
      for (let key in element.style) element.style.removeProperty(key)
    }
  } else if (key.startsWith('style:')) {
    patchStyleProperty(element.style, key.slice(6), val)
  } else if (key.startsWith('prop:')) {
    // @ts-expect-error
    element[key.slice(5)] = val
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

    /**
     * @todo Support for properties values null | undefined.
     * @example
     * ```ts
     * if (key === 'valueAsDate') element[key] = val
     * else if (key === 'valueAsNumber') element[key] = key ?? NaN
     * ```
     */

    // @ts-ignore
    element[key] = val == null ? '' : val
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
    if (val == null || (isBool && val === false)) element.removeAttribute(key)
    else element.setAttribute(key, isBool && val === true ? '' : val)
  }
}

export let h = (tag: any, props: Rec, ...children: any[]): JSX.Element => {
  let dom = DOM()

  if (isAtom(tag)) {
    // FIXME we need types refactoring
    return walkAtom(dom, tag) as any
  }

  if (tag === hf) {
    // needed for `walkLinkedList`
    let fragment = createLiveFragment(dom, '')
    for (let i = 0; i < children.length; i++) {
      let child = children[i]
      fragment.append(isAtom(child) ? walkAtom(dom, child) : child)
    }
    fragment.append(fragment.__reatomFragment.end)
    // FIXME we need types refactoring
    return fragment as any
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
      let _name = name
      try {
        name = tag.name
        return tag(props)
      } finally {
        name = _name
      }
    }
  } else {
    element = tag.startsWith('svg:')
      ? dom.document.createElementNS('http://www.w3.org/2000/svg', tag.slice(4))
      : dom.document.createElement(tag)

    // For debug
    if (name && DEBUG()) element.setAttribute('data-reatom-name', name)
  }

  if ('children' in props) children = props.children

  for (let key in props) {
    if (key !== 'children' && key !== 'element') {
      let value = props[key]
      if (key === 'ref') {
        ensureMeta(element).mount = () => value(element)
      } else if (isAtom(value) && !isAction(value)) {
        if (key.startsWith('model:')) {
          let k = key = key.slice(6) as 'value' | 'valueAsNumber' | 'checked'
          let listener = key === 'valueAsNumber'
            ? (event: any) => value(+event.target.value)
            : (event: any) => value(event.target[k])
          set(dom, element, 'on:input', listener)
          if (key === 'valueAsNumber') {
            key = 'value'
            set(dom, element, 'type', 'number')
          } else if (key === 'checked') {
            set(dom, element, 'type', 'checkbox')
          }
          key = 'prop:' + key
        }

        unlink(element, () => value.subscribe(key === '$spread'
          ? (val) => {for (let k in val) set(dom, element, k, val[k])}
          : (val) => set(dom, element, key, val)))
      } else if (typeof value === 'function') {
        unlink(element, () => computed(value, `${name}.${element.nodeName.toLowerCase()}._${key}`)
          .subscribe((val) => set(dom, element, key, val)))
      } else {
        set(dom, element, key, value)
      }
    }
  }

  walk(dom, element, children)

  return element
}

/**
 * Fragment.
 * @todo Describe a function as a component.
 */
export let hf = () => {}

export let mount = (target: Element, child: Element): void => {
  let dom = DOM()
  let symbol = metaSymbol()

  /**
   * @note The moved node creates two mutations: deletion then addition.
   * @todo Moving an node in the DOM unsubscribes and resubscribes to atoms.
   * @todo Call `observer.disconnect()` after unmounting the application.
   */
  let observer = new dom.MutationObserver(
    wrap((mutationsList) => {
      for (let mutation of mutationsList) {
        mutation.addedNodes.forEach((addedNode) => {
          let iterator = dom.document.createNodeIterator(addedNode, 1 | 128)
          while (iterator.nextNode()) {
            let meta = (iterator.referenceNode as any)[symbol] as Meta | undefined
            meta?.subscribes.forEach((subscribe) => meta.unsubscribes.push(subscribe()))
          }
          while (iterator.previousNode()) {
            let meta = (iterator.referenceNode as any)[symbol] as Meta | undefined
            if (meta) {
              let unmount = meta.mount?.(iterator.referenceNode)
              if (typeof unmount === 'function') meta.unmount = unmount
            }
          }
        })
        mutation.removedNodes.forEach((removedNode) => {
          let iterator = dom.document.createNodeIterator(removedNode, 1 | 128)
          while (iterator.nextNode()) {
            let meta = (iterator.referenceNode as any)[symbol] as Meta | undefined
            if (meta) {
              if (meta.unsubscribes.length > 0) {
                meta.unsubscribes.forEach((unsubscribe) => unsubscribe())
                meta.unsubscribes = []
              }
              meta.unmount?.(iterator.referenceNode)
            }
          }
        })
      }
    }),
  )
  observer.observe(target.parentElement!, {
    childList: true,
    subtree: true,
  })

  // TODO fix
  // target.append(...[child].flat(Infinity))
  target.append(child)
}

/**
 * This simple utility needed only for syntax highlighting and it just concatenates all passed strings.
 * Falsy values are ignored, except for `0`.
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
