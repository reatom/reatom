import type { ActionState, AtomLike, Frame } from '../core'
import {
  _enqueue,
  action,
  bind,
  context,
  isConnected,
  top,
  withMiddleware,
} from '../core'
import type { Fn } from '../utils'
import { isBrowser } from '../utils'

export let LOG = /* @__PURE__ */ (() => {
  return action<any[]>((...args) => args, 'LOG')
})()

let isSkip = (target: AtomLike) =>
  target.name.startsWith('_') || /\._/.test(target.name)

let serialCount = 0
let serialNumbers = new WeakMap<Frame, string>()

let getSerial = (frame = top()) => {
  if (isSkip(frame.atom)) return ''

  let serial = serialNumbers.get(frame)
  if (serial === undefined) {
    let next = ++serialCount
    serialNumbers.set(
      frame,
      (serial = next + (next < 1e4 ? '' : (next - 1e4).toString(32))),
    )
  }

  return `[#${serial}]`
}

type Node = { name: string; children: Node[]; pubs: Frame['pubs'] }
// use BFS to touch duplicates as earlier as possible to reduce the log width
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
 * @example
 *   // For a node with children, might produce something like:
 *   // myNode ┬─ child1 ─ grandChild
 *   //        └─ child2
 *
 * @param {string} acc - The accumulator string that holds the current tree
 *   representation
 * @param {string} steps - Indentation padding string for proper alignment
 * @param {Node} node - The current node to process and display in the tree
 * @returns {string} A formatted string representation of the tree structure
 */
export let concatTree = (acc: string, steps: string, node: Node): string => {
  // if (steps.length > 200) return acc + ' [...]'

  let { name, children } = node
  acc += name
  steps += ' '.repeat(acc.length)

  for (let i = 0; i < children.length; i++) {
    let child = children[i]!
    if (i === 0) {
      let hasMore = children.length > 1
      acc += concatTree(hasMore ? ' ┬─ ' : ' ─ ', steps, child)
    } else {
      let isLast = i === children.length - 1
      acc += '\n' + steps + ' │\n' + steps
      acc += concatTree(isLast ? ' └─ ' : ' ├─ ', steps, child)
    }
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
 * @example
 *   // Might produce output like:
 *   // ─ counter ┬─ doubleCounter
 *   //           └─ displayValue
 *
 * @param {string} [acc='─ '] - Initial accumulator string for the result.
 *   Default is `'─ '`
 * @param {string} [steps=''] - Initial indentation padding for proper
 *   alignment. Default is `''`
 * @param {Frame} [frame=top()] - The starting frame to trace from (defaults to
 *   current top frame). Default is `top()`
 * @returns {string} A formatted string representation of the stack trace
 */
export let getStackTrace = (acc = '─ ', steps = '', frame = top()): string => {
  return concatTree(acc, steps, prepareFrameStack(frame))
}

let isNewLogStack = true

/**
 * Sets up and connects a logger to the Reatom system for debugging and tracing.
 *
 * This function enhances all non-private atoms and actions with logging
 * capabilities. When an atom's value changes or an action is called, it logs
 * the event with relevant information to the console including:
 *
 * - Previous and current state for atoms
 * - Parameters and return values for actions
 * - Complete dependency stack traces
 * - Error information when exceptions occur
 *
 * The logger adapts to the environment, using different formatting for browser
 * and Node.js. Private atoms (those with names starting with '_' or containing
 * '._') are not logged.
 *
 * @example
 *   // Connect the logger at application startup
 *   import { connectLogger } from '@reatom/core'
 *
 *   connectLogger()
 *
 * @returns {void}
 */
export let connectLogger = () => {
  let isNodeEnv = !isBrowser()

  let logExt = <T extends AtomLike>(target: T): T => {
    if (isSkip(target)) return target

    let title = `%c ${target.name}`
    let style = ''
    if (isNodeEnv) {
      let nodeReactiveStyle = '\x1b[44m\x1b[37m' // blue background, white text
      let nodeActionStyle = '\x1b[43m\x1b[30m' // yellow background, black text
      let nodeResetStyle = '\x1b[0m'
      title = `${target.__reatom.reactive ? nodeReactiveStyle : nodeActionStyle} ${target.name} ${nodeResetStyle}`
    } else {
      let color = target.__reatom.reactive
        ? 'background: #151134; color: white;'
        : 'background: #ffff80; color: #151134;'
      style = `${color}font-size: 12px; font-weight: 600; padding: 0.15em;  padding-right: 1ch;`
    }

    let logStack = (payload: any, error: any, cb: Fn) => {
      try {
        if (isNewLogStack) {
          isNewLogStack = false
          setTimeout(() => {
            isNewLogStack = true
          })
          console.log('--- ' + new Date().toISOString() + ' ----')
        }
        console.groupCollapsed(
          `${title}${getSerial()}`,
          style + (error ? 'color: red;' : ''),
        )
        if (isNodeEnv) {
          if (target === LOG && !error) {
            console.log(...payload)
          } else {
            console.log(error ?? payload)
          }
        }
        cb()
        const stack = getStackTrace()
        if (stack) {
          console.groupCollapsed('stack:')
          console.log(stack)
          console.groupEnd()
        }
        if (!isNodeEnv && target !== LOG) console.log('frame:', top())
        console.groupEnd()

        if (!isNodeEnv) {
          if (target === LOG && !error) {
            console.log(...payload)
          } else {
            console.log(error ?? payload)
          }
        }
      } catch (error) {
        console.log('Reatom log error:', error)
      }
    }

    let initKey = {}

    return target.extend(
      withMiddleware(
        () =>
          function logger(next, ...params) {
            // enqueue log BEFORE `next` call to arrange logs with the order of atoms and actions call
            _enqueue(
              bind(() => {
                if (target.__reatom.reactive) {
                  if (Object.is(prevState, state)) return

                  let inits = top().root.inits
                  if (!inits.has(initKey)) {
                    inits.set(initKey, null)
                    if (params.length === 0) return
                  }

                  logStack(state, error, () => {
                    console.log('prev:', prevState)
                    console.log('connected:', isConnected(target))
                  })
                } else {
                  let call = (state as ActionState)[state.length - 1]

                  if (error) {
                    logStack(undefined, error, () =>
                      params.forEach((param, i) =>
                        console.log(`param ${i + 1}:`, param),
                      ),
                    )
                  } else if (call) {
                    logStack(call.payload, error, () =>
                      call.params.forEach((param, i) =>
                        console.log(`param ${i + 1}:`, param),
                      ),
                    )
                  }
                }
              }),
              'hook',
            )

            let prevState = top().state
            let state: typeof prevState
            let error: any

            try {
              state = next(...params)
            } catch (e) {
              error = e ?? new Error('unknown error')
              throw e
            }

            return state
          },
      ),
    )
  }

  // @ts-ignore TODO
  globalThis.__REATOM.push(logExt)

  LOG.extend(logExt)
}
