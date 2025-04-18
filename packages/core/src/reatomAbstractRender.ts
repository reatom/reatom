import { _read, atom, computed, type Frame, enqueue } from './core'
import { getPrevPubs } from './methods/context'
import { AbortAtom, abortVar, variable, wrap } from './methods'
import { toAbortError, Unsubscribe } from './utils'

export interface AbstractRender<Props, Result> {
  render: (props: Props) => { result: Result }
  mount: () => Unsubscribe
}

/** This is a low-level reatom renderer which helped to connect two different reactive systems.
 * To archive a user render function running only in a context of adapted reactive system,
 * this method decorate computed render to prevent extra rerenders or outdated rerenders.
 */
export let reatomAbstractRender = <Props, Result>({
  frame,
  render: adapterRender,
  rerender,
  mount: adapterMount,
  name,
}: {
  frame: Frame
  render: (props: Props) => Result
  // Exclude for correct type inference
  rerender: (param: { result: Exclude<Result, never> }) => any
  mount?: () => void
  name: string
}): AbstractRender<Props, Result> =>
  frame.run(() => {
    let rendering = false

    let changedVar = variable<boolean>()

    let _props = atom({} as Props, `${name}._props`)

    let abortAtom: AbortAtom

    let _render = computed((state?: { result: Result }): { result: Result } => {
      let pubs = getPrevPubs()

      enqueue(() => (pubs.length = 1), 'cleanup')

      let props = _props()

      if (rendering) {
        abortAtom = abortVar.set(abortAtom ?? `${name}.abort`)
        return { result: adapterRender(props) }
      }

      changedVar.set(true)

      // do not drop subscriptions from the render
      for (
        // skip actualization pub and `_props`
        let i = 2;
        i < pubs.length;
        i++
      ) {
        pubs[i]!.atom()
      }


      return { result: state?.result as Result }
    }, `${name}._render`)

    let render = frame.run.bind(frame, (props: Props) => {
      try {
        rendering = true
        _props({ ...props })
        return _render()
      } finally {
        rendering = false
      }
    }) as (props: Props) => { result: Result }

    let mount = wrap(() => {
      adapterMount?.()
      let unsubscribe = _render.subscribe((state) => {
        if (changedVar.read()) {
          changedVar.set(false)
          rerender(state)
        }
      })

      return wrap(() => {
        unsubscribe()
        abortAtom(toAbortError('unmount ' + name))
      })
    })

    return { render, mount }
  })
