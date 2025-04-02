import {
  action,
  assert,
  type AtomLike,
  type Atom,
  type Fn,
  isAtom,
  random,
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

let isSkipped = (value: unknown): value is boolean | '' | null | undefined =>
  typeof value === 'boolean' || value === '' || value == null

let unsubscribesMap = new WeakMap<Node, Array<Fn>>()
let unlink = (parent: Node, un: Unsubscribe) => {
  // check the connection in the next tick
  // to give the user (programmer) an ability
  // to put the created element in the dom
  Promise.resolve().then(() => {
    if (!parent.isConnected) un()
    else {
      while (
        parent.parentElement &&
        !unsubscribesMap.get(parent)?.push(() => parent.isConnected || un())
      ) {
        parent = parent.parentElement
      }
    }
  })
}

// TODO Should use `wrap`?
let walkLinkedList = (
  DOM: DomApis,
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

          appendBatch ??= DOM.document.createDocumentFragment()

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

  unlink(el, list.subscribe(cb))
  cb(list())
}

type LiveDocumentFragment = DocumentFragment & {
  __reatomFragment: {
    start: Comment
    end: Comment
    update: (element?: JSX.ElementPrimitiveChildren) => void
  }
}

// TODO optimize
let isLiveFragment = (node: Node): node is LiveDocumentFragment => {
  return (
    String(node) === '[object DocumentFragment]' && '__reatomFragment' in node
  )
}
let throwNativeFragment = (element: JSX.Element) => {
  assert(
    String(element) !== '[object DocumentFragment]' || '__reatomFragment' in element,
    'native fragment is not supported',
    ReatomError,
  )
}

let createLiveFragment = (
  DOM: DomApis,
  name: string,
): LiveDocumentFragment => {
  let fragment = DOM.document.createDocumentFragment()
  let start = DOM.document.createComment(name)
  let end = start.cloneNode() as Comment
  fragment.append(start, end)

  let update = (element?: JSX.ElementPrimitiveChildren) => {
    while (start.nextSibling && start.nextSibling !== end) {
      start.nextSibling!.remove?.()
    }

    if (element instanceof DOM.Node) {
      start.after(element)
    } else if (!isSkipped(element)) {
      let node = isAtom(element)
        ? walkAtom(DOM, element)
        : DOM.document.createTextNode(String(element))
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

// TODO Should use `wrap`?
let walkAtom = (
  DOM: DomApis,
  anAtom: AtomLike<JSX.ElementPrimitiveChildren>,
): DocumentFragment => {
  let fragment = createLiveFragment(DOM, anAtom.name)
  let un = anAtom.subscribe(fragment.__reatomFragment.update)

  unsubscribesMap.set(fragment.__reatomFragment.start, [])
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

export let reatomJsx = (
  DOM: DomApis = globalThis.window,
  {
    stylesheetContainer = DOM.document.head,
  }: {
    /**
     * The container to which the styles will be added.
     * @default DOM.document.head
     */
    stylesheetContainer?: Node
  } = {},
) => {
  let styles: Rec<string> = {}
  let stylesheet = (stylesheetContainer ?? DOM.document.head).appendChild(
    DOM.document.createElement('style'),
  )
  let name = ''

  let set = (element: JSX.Element, key: string, val: any) => {
    if (key.startsWith('on:')) {
      key = key.slice(3)
      // only for logging purposes
      val = action(val, `${name}.${element.nodeName.toLowerCase()}._${key}`)
      element.addEventListener(key, val)
    } else if (key.startsWith('css:')) {
      key = '--' + key.slice(4)
      if (val == null) element.style.removeProperty(key)
      else element.style.setProperty(key, String(val))
    } else if (key === 'css') {
      let prefix = name ? name + '_' : ''
      let styleKey = prefix + val
      let styleId = styles[styleKey]
      if (!styleId) {
        styleId = styles[styleKey] = prefix + random(0, 1e6).toString()
        stylesheet.innerText += '[data-reatom="' + styleId + '"]{' + val + '}\n'
      }
      /** @see https://measurethat.net/Benchmarks/Show/11819 */
      element.setAttribute('data-reatom', styleId)
    } else if (key === 'style' && typeof val === 'object') {
      for (let key in val) patchStyleProperty(element.style, key, val[key])
    } else if (key.startsWith('style:')) {
      key = key.slice(6)
      patchStyleProperty(element.style, key, val)
    } else if (key.startsWith('prop:')) {
      // @ts-expect-error
      element[key.slice(5)] = val
    } else {
      if (key.startsWith('attr:')) {
        key = key.slice(5)
      }
      if (key === 'className') key = 'class'
      if (val == null || val === false) element.removeAttribute(key)
      else {
        val = val === true ? '' : String(val)
        /**
         * @see https://measurethat.net/Benchmarks/Show/54
         * @see https://measurethat.net/Benchmarks/Show/31249
         */
        if (key === 'class' && element instanceof HTMLElement)
          element.className = val
        else element.setAttribute(key, val)
      }
    }
  }

  let h = wrap((tag: any, props: Rec, ...children: any[]) => {
    if (isAtom(tag)) {
      return walkAtom(DOM, tag)
    }

    if (tag === hf) {
      // needed for `walkLinkedList`
      let fragment = createLiveFragment(DOM, '')
      for (let i = 0; i < children.length; i++) {
        let child = children[i]
        fragment.append(isAtom(child) ? walkAtom(DOM, child) : child)
      }
      fragment.append(fragment.__reatomFragment.end)
      return fragment
    }

    props ??= {}

    let element: JSX.Element

    if (typeof tag === 'function') {
      if (tag === Bind) {
        element = props.element
        props.element = undefined
      } else {
        if (children.length) {
          props.children = children
        }

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
        ? DOM.document.createElementNS(
            'http://www.w3.org/2000/svg',
            tag.slice(4),
          )
        : DOM.document.createElement(tag)
    }

    if ('children' in props) children = props.children

    for (let k in props) {
      if (k !== 'children' && k !== 'element') {
        let prop = props[k]
        if (k === 'ref') {
          // TODO Double check, most likely incorrect.
          wrap(Promise.resolve().then(() => {
            let cleanup = prop(element)
            if (typeof cleanup === 'function') {
              let list = unsubscribesMap.get(element)
              if (!list) unsubscribesMap.set(element, (list = []))
              unlink(element, () => cleanup(element))
            }
          }))
        } else if (isAtom(prop) && !isAction(prop)) {
          if (k.startsWith('model:')) {
            let name = (k = k.slice(6)) as 'value' | 'valueAsNumber' | 'checked'
            set(element, 'on:input', (event: any) => {
              ;(prop as Atom)(
                name === 'valueAsNumber'
                  ? +event.target.value
                  : event.target[name],
              )
            })
            if (k === 'valueAsNumber') {
              k = 'value'
              set(element, 'type', 'number')
            }
            if (k === 'checked') {
              set(element, 'type', 'checkbox')
            }
            k = 'prop:' + k
          }
          // TODO handle unsubscribe!
          let un: undefined | Unsubscribe
          un = prop.subscribe((v) =>
            !un || element.isConnected
              ? k === '$spread'
                ? Object.entries(v).forEach(([k, v]) => set(element, k, v))
                : set(element, k, v)
              : un(),
          )

          unlink(element, un)
        } else {
          set(element, k, prop)
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
        walkLinkedList(DOM, element, child)
      } else if (isAtom(child)) {
        element.append(walkAtom(DOM, child))
      } else if (!isSkipped(child)) {
        element.append(child as Node | string)
      }
    }

    for (let i = 0; i < children.length; i++) {
      walk(children[i])
    }

    return element
  })

  /**
   * Fragment.
   * @todo Describe a function as a component.
   */
  let hf = wrap(() => {})

  let mount = wrap((target: Element, child: Element) => {
    // TODO fix
    // target.append(...[child].flat(Infinity))
    target.append(child)

    /**
     * @note The moved node creates two mutations: deletion then addition.
     */
    new DOM.MutationObserver((mutationsList) => {
      let removedNodes = new Set<Node>()

      for (let mutation of mutationsList) {
        for (let node of mutation.removedNodes) removedNodes.add(node)
        for (let node of mutation.addedNodes) removedNodes.delete(node)
      }

      for (let removedNode of removedNodes) {
        /**
         * @see https://stackoverflow.com/a/64551276
         * @note A custom NodeFilter function slows down performance by 1.5 times.
         */
        let walker = DOM.document.createTreeWalker(removedNode, 1 | 128)

        do {
          unsubscribesMap.get(walker.currentNode)?.forEach((fn) => fn())
          unsubscribesMap.delete(walker.currentNode)
        } while (walker.nextNode())
      }
    }).observe(target.parentElement!, {
      childList: true,
      subtree: true,
    })
  })

  return { h, hf, mount }
}

export let { h, hf, mount } = reatomJsx()

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
