import { describe, expect, test } from 'test'

import { atom, notify, top } from './core'
import { withConnectHook } from './extensions'
import { reatomAbstractRender } from './reatomAbstractRender'
import type { Rec } from './utils'

/**
 * `source` is read first; the first read of `writer` sets it. That is a render
 * writing an atom it has already read, which re-runs the render computed.
 */
const setup = (name: string) => {
  const source = atom(0, `${name}.source`)
  const writer = atom(() => {
    source.set((state) => state + 1)
    return 'ready'
  }, `${name}.writer`)

  return { source, writer }
}

const reatomView = (name: string, view: () => string) => {
  const log = { renders: 0, rerenders: [] as string[] }

  const abstract = reatomAbstractRender<Rec, string>({
    frame: top(),
    render: () => {
      log.renders++
      return view()
    },
    rerender: ({ result }) => log.rerenders.push(result),
    name,
    abortOnUnmount: false,
  })

  return { ...abstract, log }
}

describe('reatomAbstractRender recursion', () => {
  test('a write during the first render renders once and asks for another', () => {
    const name = 'abstractRender.recursion.first'
    const { source, writer } = setup(name)
    const view = reatomView(name, () => `${source()}:${writer()}`)

    const first = view.render({})

    expect(view.log.renders).toBe(1)
    // The stale result is handed back, and the host is asked to render again.
    expect(first.result).toBe('0:ready')
    expect(view.log.rerenders).toEqual(['0:ready'])

    const second = view.render({})

    expect(view.log.renders).toBe(2)
    expect(second.result).toBe('1:ready')
    expect(view.log.rerenders).toEqual(['0:ready'])
  })

  test('a write during a subscribed render renders once and asks for another', () => {
    const name = 'abstractRender.recursion.update'
    const { source, writer } = setup(name)
    const withWriter = atom(false, `${name}.withWriter`)
    const view = reatomView(
      name,
      () => `${source()}:${withWriter() ? writer() : 'idle'}`,
    )

    expect(view.render({}).result).toBe('0:idle')
    const unmount = view.mount()

    withWriter.set(true)
    notify()
    // The reatom-driven change: the subscription asks for a render.
    expect(view.log.rerenders).toEqual(['0:idle'])
    expect(view.log.renders).toBe(1)

    const stale = view.render({})
    expect(view.log.renders).toBe(2)
    expect(stale.result).toBe('0:ready')
    // A host that re-renders asynchronously lets the queue run in between:
    // the subscription must not ask a second time for the same stale render.
    notify()
    expect(view.log.rerenders).toEqual(['0:idle', '0:ready'])

    const fresh = view.render({})
    notify()
    expect(view.log.renders).toBe(3)
    expect(fresh.result).toBe('1:ready')
    // Once for the reatom change, once for the recursion; the subscription
    // adds nothing after the fresh render.
    expect(view.log.rerenders).toEqual(['0:idle', '0:ready'])

    source.set(5)
    notify()
    expect(view.log.rerenders).toEqual(['0:idle', '0:ready', '1:ready'])
    expect(view.render({}).result).toBe('5:ready')

    unmount()
  })

  test('a render without a write asks for nothing', () => {
    const name = 'abstractRender.recursion.none'
    const source = atom(0, `${name}.source`)
    const view = reatomView(name, () => `${source()}`)

    view.render({})
    const unmount = view.mount()
    view.render({})
    notify()

    expect(view.log.renders).toBe(2)
    expect(view.log.rerenders).toEqual([])

    unmount()
  })

  test('the recursion keeps a subscribed render connected to what it read', () => {
    const name = 'abstractRender.recursion.connections'
    const { source, writer } = setup(name)
    const log: string[] = []
    const watched = atom('watched', `${name}.watched`).extend(
      withConnectHook(() => {
        log.push('connect')
        return () => log.push('disconnect')
      }),
    )
    const withWriter = atom(false, `${name}.withWriter`)
    // `watched` is first read by the render that recurses.
    const view = reatomView(name, () =>
      withWriter() ? `${source()}:${watched()}:${writer()}` : 'idle',
    )

    view.render({})
    const unmount = view.mount()
    withWriter.set(true)
    notify()

    view.render({}) // recursion
    notify()
    expect(log).toEqual(['connect'])

    expect(view.render({}).result).toBe('1:watched:ready') // the host's fresh render
    notify()
    expect(log).toEqual(['connect'])

    unmount()
    notify()
    expect(log).toEqual(['connect', 'disconnect'])
  })
})
