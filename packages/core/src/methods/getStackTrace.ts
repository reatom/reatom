import type { AtomLike, Frame } from '../core'
import { context, top, _createGlobal } from '../core'

export let isSkip = (target: AtomLike) =>
  target.name.startsWith('_') || /\._/.test(target.name)

let stackTraceGlobals = _createGlobal('stackTraceGlobals', () => ({
  serialCount: 0,
  serialNumbers: new WeakMap<Frame, string>(),
}))

export let getSerial = (frame = top()) => {
  if (isSkip(frame.atom)) return ''

  let serial = stackTraceGlobals.serialNumbers.get(frame)
  if (serial === undefined) {
    let next = ++stackTraceGlobals.serialCount
    stackTraceGlobals.serialNumbers.set(
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
 * @private
 */
export let getStackTrace = (frame = top()): string => {
  return concatTree('', '─', ' ', prepareFrameStack(frame))
}
