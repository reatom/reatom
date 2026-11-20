import { atom, clearStack, context, rAF, take, top, wrap } from '@reatom/core'
import { render } from 'preact'
import { useLayoutEffect, useState } from 'preact/hooks'
import { afterEach, beforeEach, expect, test } from 'vitest'

import { reatomComponent, reatomContext } from './'

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

/** `source` is read first; the first read of `writer` sets it. */
const setup = (name: string) => {
  const source = atom(0, `${name}.source`)
  const writer = atom(() => {
    source.set((state) => state + 1)
    return 'ready'
  }, `${name}.writer`)

  return { source, writer }
}

/**
 * Preact reports no hook-count mismatch: a second body run in one render takes
 * fresh hook slots instead, so the output reads a reset state and a setter from
 * it writes a slot the next render never reads — lost clicks, no error.
 */
const mountView = (name: string, writeOnMount: boolean) => {
  const { source, writer } = setup(name)
  const commits: string[] = []

  const View = reatomComponent(() => {
    const read = source()
    const [local, setLocal] = useState(0)
    const status = writeOnMount || local > 0 ? writer() : 'idle'
    const value = `${read}:${local}:${status}`

    useLayoutEffect(() => {
      commits.push(value)
    })

    return (
      <button data-testid="view" onClick={() => setLocal((n) => n + 1)}>
        {value}
      </button>
    )
  }, `${name}.View`)

  render(
    <reatomContext.Provider value={top()}>
      <View />
    </reatomContext.Provider>,
    document.getElementById('root')!,
  )

  return commits
}

test('a write during the first render keeps every click', () =>
  context.start(async () => {
    const commits = mountView('preact.recursion.mount', true)

    await wrap(tick())
    expect(text()).toBe('1:0:ready')

    click()
    await wrap(tick())
    expect(text()).toBe('1:1:ready')

    click()
    await wrap(tick())
    expect(text()).toBe('1:2:ready')
    expect(commits).toEqual(['1:0:ready', '1:1:ready', '1:2:ready'])
  }))

test('a write during an update render keeps local state', () =>
  context.start(async () => {
    const commits = mountView('preact.recursion.update', false)

    await wrap(tick())
    expect(text()).toBe('0:0:idle')

    click()
    await wrap(tick())
    expect(text()).toBe('1:1:ready')

    click()
    await wrap(tick())
    expect(text()).toBe('1:2:ready')
    expect(commits).toEqual(['0:0:idle', '1:1:ready', '1:2:ready'])
  }))
