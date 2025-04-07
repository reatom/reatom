import { _read, atom, computed, root, STACK, type Frame } from './core'
import { getPrevPubs } from './core/context'
import { AbortAtom, reatomAbort, findVar, variable, wrap } from './methods'
import { Fn, toAbortError, Unsubscribe } from './utils'

export interface AbstractRender<Props, Result> {
  render: (props: Props) => { result: Result }
  mount: () => Unsubscribe
  abort: AbortAtom
}

/** This is a low-level reatom renderer which helped to connect two different reactive systems.
 * To archive a user render function running only in a context of adapted reactive system,
 * this method decorate computed render to prevent extra rerenders or outdated rerenders.
 */
export let reatomAbstractRender = <Props, Result>({
  frame,
  render,
  rerender,
  mount,
  name,
}: {
  frame: Frame
  render: (props: Props) => Result
  // Exclude for correct type inference
  rerender: (param: { result: Exclude<Result, never> }) => any
  mount?: () => void
  name: string
}): AbstractRender<Props, Result> => {
  let rootFrame =
    STACK.length !== 0
      ? STACK[0]!
      : findVar((frame) => (frame.atom === root ? frame : undefined), frame)!

  STACK.push(rootFrame, frame)

  let rendering = false

  let abort = reatomAbort(`${name}.abort`, frame)

  let changedVar = variable<boolean>()

  let propsAtom = atom({} as Exclude<Props, Fn>, `${name}._propsAtom`)

  let renderAtom = computed((state?: { result: Result }): { result: Result } => {
    let pubs = getPrevPubs()

    let props = propsAtom()

    if (rendering) {
      abort.set()
      return { result: render(props) }
    }

    changedVar.set(true)

    // do not drop subscriptions from the render
    for (
      // skip actualization pub and `propsAtom`
      let i = 2;
      i < pubs.length;
      i++
    ) {
      pubs[i]!.atom()
    }

    return { result: state!.result }
  }, `${name}._renderAtom`)

  let _render = (props: Props) => {
    try {
      STACK.push(rootFrame, frame)
      rendering = true
      propsAtom({ ...props })
      return renderAtom()
    } finally {
      rendering = false
      STACK.pop()
      STACK.pop()
    }
  }

  let _mount = wrap(() => {
    mount?.()
    let unsubscribe = renderAtom.subscribe((state) => {
      if (changedVar.read()) {
        changedVar.set(false)
        rerender(state)
      }
    })

    return wrap(() => {
      unsubscribe()
      abort(toAbortError('unmount ' + name))
    })
  })

  STACK.pop()
  STACK.pop()

  return { render: _render, mount: _mount, abort }
}
