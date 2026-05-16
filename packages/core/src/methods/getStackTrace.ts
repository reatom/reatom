import type { AtomLike, Frame } from '../core'
import { context, REATOM_CORE_VERSION, top } from '../core'
import {
  getReatomGlobal,
  type ReatomGlobalPackage,
  ReatomError,
} from '../global'

export let isSkip = (target: AtomLike) =>
  target.name.startsWith('_') || /\._/.test(target.name)

interface ReatomStackTraceGlobalState {
  serialCount: number
  serialNumbers: WeakMap<Frame, string>
}

declare global {
  interface ReatomGlobalPackages {
    '@reatom/core/methods/getStackTrace': ReatomGlobalPackage<ReatomStackTraceGlobalState>
  }
}

let reatomGlobal = getReatomGlobal()
let reatomStackTracePackage =
  reatomGlobal.packages['@reatom/core/methods/getStackTrace']
if (reatomStackTracePackage === undefined) {
  reatomStackTracePackage = reatomGlobal.packages[
    '@reatom/core/methods/getStackTrace'
  ] = {
    version: REATOM_CORE_VERSION,
    state: { serialCount: 0, serialNumbers: new WeakMap() },
  }
} else if (reatomStackTracePackage.version !== REATOM_CORE_VERSION) {
  throw new ReatomError('package duplication')
}
let reatomStackTraceGlobal = reatomStackTracePackage.state

export let getSerial = (frame = top()) => {
  if (isSkip(frame.atom)) return ''

  let serial = reatomStackTraceGlobal.serialNumbers.get(frame)
  if (serial === undefined) {
    let next = ++reatomStackTraceGlobal.serialCount
    reatomStackTraceGlobal.serialNumbers.set(
      frame,
      (serial = next + (next < 1e4 ? '' : (next - 1e4).toString(32))),
    )
  }

  return `[#${serial}]`
}

type Node = { name: string; children: Node[]; pubs: Frame['pubs'] }

let prepareFrameStack = (frame: Frame): Node => {
  let node: Node = {
    name: frame.atom.name + getSerial(frame),
    children: [],
    pubs: frame.pubs,
  }
  let queue = [node]
  let touched = new Set<Frame>()

  for (let i = 0; i < queue.length; i++) {
    let node = queue[i]!
    for (let i = 0; i < node.pubs.length; i++) {
      let pub = node.pubs[i]!
      if (pub !== null && pub.atom !== context) {
        let child: Node = {
          name: pub.atom.name + getSerial(pub),
          children: [],
          pubs: pub.pubs,
        }
        node.children.push(child)
        if (!touched.has(pub)) {
          touched.add(pub)
          queue.push(child)
        }
      }
    }
  }

  return node
}

/**
 * Concatenates a tree structure representation into a string format.
 *
 * This function recursively builds a formatted ASCII/Unicode tree
 * representation of a Node structure with proper branch indentation and
 * connections.
 *
 * @private
 * @example
 *   // For a node with children, might produce something like:
 *   // myNode
 *   //  ├─ child1
 *   //  │  └─ grandChild
 *   //  └─ child2
 *
 * @param {string} acc - The accumulator string that holds the current tree
 *   representation
 * @param {string} prefix - The prefix string for the current line (indentation
 *   and tree characters)
 * @param {string} indent - The indentation string for child lines
 * @param {Node} node - The current node to process and display in the tree
 * @returns {string} A formatted string representation of the tree structure
 */
export let concatTree = (
  acc: string,
  prefix: string,
  indent: string,
  node: Node,
): string => {
  acc += prefix + node.name

  let { children } = node

  for (let i = 0; i < children.length; i++) {
    let child = children[i]!
    let isLast = i === children.length - 1
    let childPrefix = '\n' + indent + (isLast ? '└─ ' : '├─ ')
    let childIndent = indent + (isLast ? '   ' : '│  ')
    acc = concatTree(acc, childPrefix, childIndent, child)
  }

  return acc
}

/**
 * Generates a formatted stack trace string based on the current execution
 * context.
 *
 * Creates a visual representation of the dependency tree from the current frame
 * up through its publishers, using ASCII/Unicode characters to show
 * relationships.
 *
 * @private
 * @example
 *   // Might produce output like:
 *   // ─counter
 *   //  ├─ doubleCounter
 *   //  └─ displayValue
 *
 * @param {Frame} [frame=top()] - The starting frame to trace from (defaults to
 *   current top frame). Default is `top()`
 * @returns {string} A formatted string representation of the stack trace
 */
export let getStackTrace = (frame = top()): string => {
  return concatTree('', '─', ' ', prepareFrameStack(frame))
}
