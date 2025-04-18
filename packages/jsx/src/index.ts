import {
  action,
  assert,
  type AtomLike,
  type Atom,
  type Fn,
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
  withInit,
  context,
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
export let stylesheet = atom<HTMLElement>(null as any, 'jsx.stylesheet').extend(
  withInit(
    (state) =>
      state ?? // could be initialized with different element
      DOM().document.head.appendChild(DOM().document.createElement('style')),
  ),
)
let name = ''

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

let unsubscribesMap = atom(() => new WeakMap<Node, Array<Fn>>(), 'unsubscribesMap')
let unlink = (parent: Node, un: Unsubscribe) => {
  let unsubscribes = unsubscribesMap()
  // check the connection in the next tick
  // to give the user (programmer) an ability
  // to put the created element in the dom
  Promise.resolve().then(wrap(() => {
    if (!parent.isConnected) un()
    else {
      while (
        parent.parentElement &&
        !unsubscribes.get(parent)?.push(() => parent.isConnected || un())
      ) {
        parent = parent.parentElement
      }
    }
  }))
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

  // it's critical to not use not a last state, but the each state.
  const unSubscribe = list.subscribe(noop)
  const rootFrame = context()
  const unChange = addChangeHook(list, (state) => {
    if (rootFrame === context()) cb(state)
  })

  let state = list()
  // check if change hook wasn't called by initialization
  if (lastVersion === -1) cb(state)

  unlink(el, () => {
    unSubscribe()
    unChange()
  })
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
  let fragment = dom.document.createDocumentFragment()
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

  return Object.assign(fragment, {
    __reatomFragment: {
      start,
      end,
      update,
    },
  })
}

let walkAtom = (
  dom: DomApis,
  anAtom: AtomLike<JSX.ElementPrimitiveChildren>,
): DocumentFragment => {
  let fragment = createLiveFragment(dom, anAtom.name)
  let un = anAtom.subscribe(fragment.__reatomFragment.update)

  unsubscribesMap().set(fragment.__reatomFragment.start, [])
  unlink(fragment.__reatomFragment.start, un)

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
      stylesheet().innerText += `[data-reatom-style="${styleId}"]{${val}}\n`
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
    const isBool = booleanAttributes.has(key)
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

  for (let k in props) {
    if (k !== 'children' && k !== 'element') {
      let prop = props[k]
      if (k === 'ref') {
        Promise.resolve().then(wrap(() => {
          let cleanup = prop(element)
          if (typeof cleanup === 'function') {
            let unsubscribes = unsubscribesMap()
            if (!unsubscribes.has(element)) unsubscribes.set(element, [])
            unlink(element, () => cleanup(element))
          }
        }))
      } else if (isAtom(prop) && !isAction(prop)) {
        if (k.startsWith('model:')) {
          let name = (k = k.slice(6)) as 'value' | 'valueAsNumber' | 'checked'
          set(dom, element, 'on:input', (event: any) => {
            ;(prop as Atom)(
              name === 'valueAsNumber'
                ? +event.target.value
                : event.target[name],
            )
          })
          if (k === 'valueAsNumber') {
            k = 'value'
            set(dom, element, 'type', 'number')
          }
          if (k === 'checked') {
            set(dom, element, 'type', 'checkbox')
          }
          k = 'prop:' + k
        }

        let un: undefined | Unsubscribe
        un = prop.subscribe((v) =>
          !un || element.isConnected
            ? k === '$spread'
              ? Object.entries(v).forEach(([k, v]) => set(dom, element, k, v))
              : set(dom, element, k, v)
            : un(),
        )

        unlink(element, un)
      } else {
        set(dom, element, k, prop)
      }
    }
  }

  /**
   * @todo Explore adding elements to a DocumentFragment before adding them to a Document.
   * @see https://www.measurethat.net/Benchmarks/Show/13274
   */
  let walk = (child: JSX.DOMAttributes<JSX.Element>['children']) => {
    if (Array.isArray(child)) {
      for (let i = 0; i < child.length; i++) walk(child[i])
    } else if (isLinkedListAtom(child)) {
      walkLinkedList(
        dom,
        element,
        child as LinkedListLikeAtom<LinkedList<LLNode<any>>>,
      )
    } else if (isAtom(child)) {
      element.append(walkAtom(dom, child))
    } else if (!isSkipped(child)) {
      element.append(child as Node | string)
    }
  }

  for (let i = 0; i < children.length; i++) {
    walk(children[i])
  }

  return element
}

/**
 * Fragment.
 * @todo Describe a function as a component.
 */
export let hf = () => {}

export let mount = (target: Element, child: Element): void => {
  let dom = DOM()
  // TODO fix
  // target.append(...[child].flat(Infinity))
  target.append(child)

  let unsubscribes = unsubscribesMap()
  /**
   * @note The moved node creates two mutations: deletion then addition.
   * @todo Call `observer.disconnect()` after unmounting the application.
   */
  let observer = new dom.MutationObserver(
    wrap((mutationsList) => {
      let removedNodes = new Set<Node>()

      for (let mutation of mutationsList) {
        // @ts-ignore TODO
        for (let node of mutation.removedNodes) removedNodes.add(node)
        // @ts-ignore TODO
        for (let node of mutation.addedNodes) removedNodes.delete(node)
      }

      for (let removedNode of removedNodes) {
        /**
         * @see https://stackoverflow.com/a/64551276
         * @note A custom NodeFilter function slows down performance by 1.5 times.
         */
        let walker = dom.document.createTreeWalker(removedNode, 1 | 128)

        do {
          unsubscribes.get(walker.currentNode)?.forEach((un) => un())
          unsubscribes.delete(walker.currentNode)
        } while (walker.nextNode())
      }
    }),
  )
  observer.observe(target.parentElement!, {
    childList: true,
    subtree: true,
  })
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
