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

/**
 * A special logging action for debugging Reatom applications.
 *
 * `log` provides an enhanced logging experience with automatic tracing and
 * production-safe output. It forwards all arguments to the native `console.log`
 * while providing additional context about the call stack and dependencies.
 *
 * ## Key Benefits
 *
 * - **Short and handy name** - Easy to type and use throughout your codebase
 * - **Automatic stack tracing** - Shows the relative call stack each time it's
 *   called
 * - **Use it everywhere** - Logs are only visible when `connectLogger()` is
 *   active
 * - **Production-safe** - Logs won't appear in production builds when logger is
 *   not connected
 * - **Context-aware** - Integrates with Reatom's dependency tracking system
 * - **Extendable** - You can extend it with other extensions to add custom
 *   behavior
 *
 * @example
 *   import { log } from '@reatom/core'
 *
 *   // Make LOG available globally (recommended)
 *   declare global {
 *     var LOG: typeof log
 *   }
 *   globalThis.LOG = log
 *
 *   // Use anywhere in your code
 *   const myAtom = atom((ctx) => {
 *     const value = ctx.spy(someAtom)
 *     LOG('Current value:', value)
 *     return value * 2
 *   })
 *
 * @example
 *   // In actions
 *   const myAction = action((ctx, payload) => {
 *     LOG('Action called with:', payload)
 *     // ... action logic
 *   })
 *
 * @example
 *   // Multiple arguments like console.log
 *   LOG('Debug info:', { foo: 'bar' }, [1, 2, 3])
 *
 * @example
 *   // Extend LOG with custom behavior using withCallHook
 *   import { withCallHook } from '@reatom/core'
 *
 *   LOG.extend(
 *     withCallHook((ctx, params) => {
 *       // Send logs to a remote service
 *       sendToAnalytics({ level: 'debug', args: params })
 *     }),
 *   )
 *
 * @see {@link connectLogger} - Must be called to enable logging output
 */
export let log = /* @__PURE__ */ (() => {
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
          if (target === log && !error) {
            console.log(...payload)
          } else {
            console.log(error ?? payload)
          }
        }
        cb()
        if (!isNodeEnv && target !== log) console.log('frame:', top())
        const stack = getStackTrace()
        if (stack && stack.includes('\n')) {
          console.log(stack)
        }
        console.groupEnd()

        if (!isNodeEnv) {
          if (target === log && !error) {
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
                    logStack(call.payload, error, () => {
                      if (target !== log) {
                        call.params.forEach((param, i) =>
                          console.log(`param ${i + 1}:`, param),
                        )
                      }
                    })
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

  log.extend(logExt)
}
