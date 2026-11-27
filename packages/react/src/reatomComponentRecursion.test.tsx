import { atom, clearStack, context, rAF, take, top, wrap } from '@reatom/core'
import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import { reatomComponent, reatomContext, reatomFactoryComponent } from './'

clearStack()

const tick = async () => {
  await wrap(take(rAF))
  await wrap(take(rAF))
}

beforeEach(() => {
  const root = document.createElement('div')
  root.id = 'root'
  document.body.append(root)
})

afterEach(() => {
  document.getElementById('root')?.remove()
})

const text = () => document.querySelector('[data-testid="view"]')?.textContent

const click = () =>
  (document.querySelector('[data-testid="view"]') as HTMLButtonElement).click()

/**
 * A component whose render writes an atom it has ALREADY read: `source` is read
 * first, then `writer` is read, and reading `writer` for the first time sets
 * `source`. That is what a lazily restored cache does when its init normalizes
 * embedded entities into a map the component read a moment ago. Reatom re-runs
 * the render computed when that happens, and the component's hooks are the ones
 * at stake.
 */
const setup = (name: string) => {
  const source = atom(0, `${name}.source`)
  const writer = atom(() => {
    source.set((state) => state + 1)
    return 'ready'
  }, `${name}.writer`)

  return { source, writer }
}

const mount = (element: React.ReactNode, strict: boolean) => {
  const errors: unknown[] = []
  const root = ReactDOM.createRoot(document.getElementById('root')!, {
    onUncaughtError: (error) => errors.push(error),
    onCaughtError: (error) => errors.push(error),
    onRecoverableError: (error) => errors.push(error),
  })

  const tree = (
    <reatomContext.Provider value={top()}>{element}</reatomContext.Provider>
  )

  root.render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree)

  return { errors, root }
}

describe.each([false, true])('recursion during render, strict=%s', (strict) => {
  test('a write during the FIRST render keeps the hook count stable', () =>
    context.start(async () => {
      const name = `recursion.mount.${strict}`
      const { source, writer } = setup(name)

      const View = reatomComponent(() => {
        const read = source()
        const [local, setLocal] = useState(0)
        const status = writer()

        return (
          <button data-testid="view" onClick={() => setLocal((n) => n + 1)}>
            {`${read}:${local}:${status}`}
          </button>
        )
      }, `${name}.View`)

      const { errors, root } = mount(<View />, strict)

      await wrap(tick())
      expect(errors).toEqual([])
      expect(text()).toBe('1:0:ready')

      // The first update after that mount is where a doubled hook list broke:
      // "Rendered fewer hooks than expected".
      click()
      await wrap(tick())
      expect(errors).toEqual([])
      expect(text()).toBe('1:1:ready')

      root.unmount()
    }))

  test('a write during an UPDATE render keeps the hook count stable', () =>
    context.start(async () => {
      const name = `recursion.update.${strict}`
      const { source, writer } = setup(name)

      const View = reatomComponent(() => {
        const read = source()
        const [local, setLocal] = useState(0)
        const status = local > 0 ? writer() : 'idle'

        return (
          <button data-testid="view" onClick={() => setLocal((n) => n + 1)}>
            {`${read}:${local}:${status}`}
          </button>
        )
      }, `${name}.View`)

      const { errors, root } = mount(<View />, strict)

      await wrap(tick())
      expect(text()).toBe('0:0:idle')

      // Subscribed by now, so the recursion is marked through `_mark`, and a
      // second body run would call more hooks than the previous render did.
      click()
      await wrap(tick())
      expect(errors).toEqual([])
      expect(text()).toBe('1:1:ready')

      click()
      await wrap(tick())
      expect(errors).toEqual([])
      expect(text()).toBe('1:2:ready')

      root.unmount()
    }))

  test('the render that recursed is not committed twice', () =>
    context.start(async () => {
      const name = `recursion.commits.${strict}`
      const { source, writer } = setup(name)
      const commits: string[] = []

      const View = reatomComponent(() => {
        const read = source()
        const status = writer()
        const value = `${read}:${status}`

        React.useLayoutEffect(() => {
          commits.push(value)
        })

        return <div data-testid="view">{value}</div>
      }, `${name}.View`)

      const { errors, root } = mount(<View />, strict)

      await wrap(tick())
      expect(errors).toEqual([])
      expect(text()).toBe('1:ready')
      // No stale '0:ready' ever reaches the screen, and nothing re-renders
      // after the commit on its own.
      expect(commits.every((value) => value === '1:ready')).toBe(true)
      expect(commits.length).toBe(strict ? 2 : 1)

      root.unmount()
    }))

  test('reatomFactoryComponent keeps its hooks and instance', () =>
    context.start(async () => {
      const name = `recursion.factory.${strict}`
      const { source, writer } = setup(name)
      let inits = 0

      const View = reatomFactoryComponent(() => {
        inits++
        return () => {
          const read = source()
          const [local, setLocal] = useState(0)
          const status = writer()

          return (
            <button data-testid="view" onClick={() => setLocal((n) => n + 1)}>
              {`${read}:${local}:${status}`}
            </button>
          )
        }
      }, `${name}.View`)

      const { errors, root } = mount(<View />, strict)

      await wrap(tick())
      expect(errors).toEqual([])
      expect(text()).toBe('1:0:ready')

      click()
      await wrap(tick())
      expect(errors).toEqual([])
      expect(text()).toBe('1:1:ready')
      expect(inits).toBe(strict ? 2 : 1)

      root.unmount()
    }))
})

test('server render shows the value written during it', () =>
  context.start(() => {
    const name = 'recursion.ssr'
    const { source, writer } = setup(name)

    const View = reatomComponent(() => {
      const read = source()
      const [local] = useState(0)
      const status = writer()

      return <div>{`${read}:${local}:${status}`}</div>
    }, `${name}.View`)

    const html = renderToString(
      <reatomContext.Provider value={top()}>
        <View />
      </reatomContext.Provider>,
    )

    expect(html).toBe('<div>1:0:ready</div>')
  }))
