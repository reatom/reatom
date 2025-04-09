import { AtomLike, Frame, isConnected, root, top } from './core/atom'
import { withCallHook, withChangeHook } from './mixins'
import { isBrowser } from './utils'

let isSkip = (target: AtomLike) =>
  target.name.startsWith('_') || /\._/.test(target.name)

let serialCount = 0
let serialNumbers = new WeakMap<Frame, number>()

let getSerial = (frame = top()) => {
  if (isSkip(frame.atom)) return ''

  let serial = serialNumbers.get(frame)
  if (serial === undefined) {
    serialNumbers.set(frame, (serial = ++serialCount))
  }

  return ` [#${serial}]`
}

export let getStackTrace = (acc = '', indent = '\n', frame = top()): string => {
  if (acc.length > 500) throw new Error('RECURSION')

  let cause = frame.pubs.find((pub: Frame | null) => pub && pub.atom !== root)

  if (!cause) return acc ? acc : `${indent}<-- root`

  return getStackTrace(
    `${acc}${indent}<-- ${cause.atom.name}${getSerial(cause)}`,
    indent,
    cause,
  )
}

export let connectLogger = () => {
  let isNodeEnv = !isBrowser()

  globalThis.__REATOM.push((target) => {
    if (isSkip(target)) return {}

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

    return target.__reatom.reactive
      ? withChangeHook((state, prevState) => {
          console.groupCollapsed(`${title}${getSerial()}`, style)
          if (isNodeEnv) console.log(state)
          console.log('prev:', prevState)
          console.log('stack:', getStackTrace('', isNodeEnv ? ' ' : '\n'))
          console.log('connected:', isConnected(target))
          if (!isNodeEnv) console.log('frame:', top())
          console.groupEnd()
          if (!isNodeEnv) console.log(state)
        })(target)
      : withCallHook((payload, params) => {
          console.groupCollapsed(`${title}${getSerial()}`, style)
          if (isNodeEnv) console.log(payload)
          params.forEach((param, i) => console.log(`param ${i + 1}:`, param))
          console.log('stack:', getStackTrace('', isNodeEnv ? ' ' : '\n'))
          if (!isNodeEnv) console.log('frame:', top())
          console.groupEnd()
          if (!isNodeEnv) console.log(payload)
        })(target)
  })
}
