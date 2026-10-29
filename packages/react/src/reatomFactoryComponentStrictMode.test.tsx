import type { AtomLike } from '@reatom/core'
import {
  atom,
  clearStack,
  context,
  effect,
  rAF,
  sleep,
  take,
  top,
  wrap,
} from '@reatom/core'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import { reatomComponent, reatomContext, reatomFactoryComponent } from './'

clearStack()

const tick = async () => {
  await wrap(take(rAF))
  await wrap(take(rAF))
}

const settle = async () => {
  await wrap(sleep())
  await wrap(tick())
}

beforeEach(() => {
  const root = document.createElement('div')
  root.id = 'root'
  document.body.append(root)
})

afterEach(() => {
  document.getElementById('root')?.remove()
})

const setup = () => {
  let inits = 0
  let effectCalls = 0

  const Mirror = reatomFactoryComponent<{
    source: AtomLike<number>
    id?: string
    label?: string
  }>(
    ({ source }) => {
      inits++
      const doubled = atom(source() * 2, 'doubled')

      effect(() => {
        effectCalls++
        doubled.set(source() * 2)
      })

      return ({ label = '' }) => (
        <div data-testid="doubled">
          {label}
          {doubled()}
        </div>
      )
    },
    { name: 'Mirror', deps: ['id'] },
  )

  return {
    Mirror,
    getInits: () => inits,
    getEffectCalls: () => effectCalls,
    getText: () =>
      document.querySelector('[data-testid="doubled"]')?.textContent,
  }
}

const renderApp = (
  App: (props: {}) => React.ReactNode,
  strictMode: boolean,
) => {
  const app = (
    <reatomContext.Provider value={top()}>
      <App />
    </reatomContext.Provider>
  )
  const root = ReactDOM.createRoot(document.getElementById('root')!)
  root.render(strictMode ? <React.StrictMode>{app}</React.StrictMode> : app)
  return root
}

describe('reatomFactoryComponent effects in StrictMode', () => {
  const scenario = async (strictMode: boolean) => {
    const source = atom(1, 'source')
    const { Mirror, getEffectCalls, getText } = setup()

    const root = renderApp(() => <Mirror source={source} />, strictMode)

    await wrap(tick())
    expect(getText()).toBe('2')

    const effectCallsAfterMount = getEffectCalls()

    source.set(21)
    await wrap(settle())

    expect(getEffectCalls() - effectCallsAfterMount).toBe(1)
    expect(getText()).toBe('42')

    const effectCallsBeforeUnmount = getEffectCalls()
    root.unmount()
    await wrap(tick())

    source.set(100)
    await wrap(settle())
    expect(getEffectCalls()).toBe(effectCallsBeforeUnmount)
  }

  test('control: effect updates the component without StrictMode', () =>
    context.start(() => scenario(false)))

  test('effect updates the component in StrictMode', () =>
    context.start(() => scenario(true)))
})

describe.each([
  ['without StrictMode', false],
  ['in StrictMode', true],
])('reatomFactoryComponent lifecycle %s', (_, strictMode) => {
  test('deps change aborts the previous init', () =>
    context.start(async () => {
      const source = atom(1, 'source')
      const id = atom('a', 'id')
      const { Mirror, getEffectCalls, getText } = setup()

      const App = reatomComponent(
        () => <Mirror source={source} id={id()} />,
        'App',
      )
      const root = renderApp(App, strictMode)
      await wrap(tick())

      id.set('b')
      await wrap(settle())

      const effectCallsAfterDepsChange = getEffectCalls()
      source.set(5)
      await wrap(settle())
      expect(getEffectCalls() - effectCallsAfterDepsChange).toBe(1)
      expect(getText()).toBe('10')

      root.unmount()
    }))

  test('hidden Activity stops effects and showing it resumes updates', () =>
    context.start(async () => {
      const source = atom(1, 'source')
      const visible = atom(true, 'visible')
      const { Mirror, getEffectCalls, getText } = setup()

      const App = reatomComponent(
        () => (
          <React.Activity mode={visible() ? 'visible' : 'hidden'}>
            <Mirror source={source} />
          </React.Activity>
        ),
        'App',
      )
      const root = renderApp(App, strictMode)
      await wrap(tick())

      visible.set(false)
      await wrap(settle())

      const effectCallsWhileHidden = getEffectCalls()
      source.set(3)
      await wrap(settle())
      expect(getEffectCalls()).toBe(effectCallsWhileHidden)

      visible.set(true)
      await wrap(settle())
      expect(getText()).toBe('6')

      const effectCallsAfterShow = getEffectCalls()
      source.set(4)
      await wrap(settle())
      expect(getEffectCalls() - effectCallsAfterShow).toBe(1)
      expect(getText()).toBe('8')

      root.unmount()
    }))

  test('hidden Activity rerender does not restart init effects', () =>
    context.start(async () => {
      const source = atom(1, 'source')
      const visible = atom(true, 'visible')
      const mounted = atom(true, 'mounted')
      const label = atom('a', 'label')
      const { Mirror, getInits, getEffectCalls, getText } = setup()

      const App = reatomComponent(
        () =>
          mounted() && (
            <React.Activity mode={visible() ? 'visible' : 'hidden'}>
              <Mirror source={source} label={label()} />
            </React.Activity>
          ),
        'App',
      )
      const root = renderApp(App, strictMode)
      await wrap(tick())

      visible.set(false)
      await wrap(settle())
      const initsWhileHidden = getInits()

      label.set('b')
      await wrap(settle())
      expect(getInits()).toBe(initsWhileHidden)

      const effectCallsWhileHidden = getEffectCalls()
      source.set(3)
      await wrap(settle())
      expect(getEffectCalls()).toBe(effectCallsWhileHidden)

      mounted.set(false)
      await wrap(settle())
      source.set(4)
      await wrap(settle())
      expect(getEffectCalls()).toBe(effectCallsWhileHidden)

      mounted.set(true)
      visible.set(true)
      await wrap(settle())
      expect(getText()).toBe('b8')

      root.unmount()
    }))
})
