import { AtomLike, Frame, isConnected, context, top } from './core'
import { withCallHook, withChangeHook } from './mixins'
import { Fn, isBrowser } from './utils'

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

export let getStackTrace = (acc = '─ ', steps = '', frame = top()): string => {
  return concatTree(acc, steps, prepareFrameStack(frame))
}

export let connectLogger = () => {
  let isNodeEnv = !isBrowser()

  globalThis.__REATOM.push(<T extends AtomLike>(target: T): T => {
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

    let logStack = (payload: any, cb: Fn) => {
      console.groupCollapsed(`${title}${getSerial()}`, style)
      if (isNodeEnv) console.log(payload)
      cb()
      console.log('stack:')
      console.log(getStackTrace())
      if (!isNodeEnv) console.log('frame:', top())
      console.groupEnd()
      if (!isNodeEnv) console.log(payload)
    }

    return target.__reatom.reactive
      ? withChangeHook<T>((state, prevState) => {
          logStack(state, () => {
            console.log('prev:', prevState)
            console.log('connected:', isConnected(target))
          })
        })(target)
      : withCallHook<T>((payload, params) => {
          logStack(payload, () => {
            params.forEach((param, i) => console.log(`param ${i + 1}:`, param))
          })
        })(target)
  })
}
