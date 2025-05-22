import { test, expect, describe, beforeEach, afterEach, vi } from 'vitest'
import ReactDOM from 'react-dom/client'
import React from 'react'
import {
  atom,
  clearStack,
  context,
  top,
  wrap,
  rAF,
  take,
  effect,
  sleep,
  action,
} from '@reatom/core'
import { reatomContext, reatomFactoryComponent, reatomComponent } from './index'

clearStack()

const tick = async () => {
  await wrap(take(rAF))
  await wrap(take(rAF))
}

beforeEach(() => {
  let body = document.querySelector('body')!

  const root = document.createElement('div')
  root.id = 'root'

  body.append(root)
})

afterEach(() => {
  // Clean up after each test
  document.getElementById('root')?.remove()
})

describe('reatomFactoryComponent', () => {
  test('creates component with factory initialization', () =>
    context.start(async () => {
      // Factory component that creates its own local state
      const Counter = reatomFactoryComponent(
        (props: { initialCount: number }) => {
          const count = atom(props.initialCount, 'localCount').actions(
            (target) => ({
              inc: () => target.set((prev) => prev + 1),
            }),
          )

          return () => (
            <div>
              <div data-testid="count">{count()}</div>
              <button data-testid="increment" onClick={wrap(count.inc)}>
                Increment
              </button>
            </div>
          )
        },
        'Counter',
      )

      const root = ReactDOM.createRoot(document.getElementById('root')!)

      root.render(
        <reatomContext.Provider value={top()}>
          <Counter initialCount={5} />
        </reatomContext.Provider>,
      )

      // Wait for initial render
      await wrap(tick())

      // Check initial render
      expect(document.querySelector('[data-testid="count"]')?.textContent).toBe(
        '5',
      )

      // Simulate click on increment button
      const button = document.querySelector(
        '[data-testid="increment"]',
      ) as HTMLButtonElement
      button.click()

      // Wait for rerender
      await wrap(tick())

      // Check updated render
      expect(document.querySelector('[data-testid="count"]')?.textContent).toBe(
        '6',
      )
    }))

  test('factory init phase is not recalled on external atom change', () =>
    context.start(async () => {
      const externalAtom = atom(0, 'externalAtom')
      const initTracker = vi.fn()
      const renderTracker = vi.fn()

      const FactoryComponent = reatomFactoryComponent(() => {
        initTracker()
        // Call atom in init phase - this value is captured at init time
        const initialExternalValueAtInit = externalAtom()

        // The returned function is the actual render component.
        return () => {
          renderTracker()
          // This now uses the value captured during init, not subscribing to changes.
          return (
            <div data-testid="factory-output">
              External: {initialExternalValueAtInit}
            </div>
          )
        }
      }, 'FactoryComponent')

      const root = ReactDOM.createRoot(document.getElementById('root')!)
      root.render(
        <reatomContext.Provider value={top()}>
          <FactoryComponent />
        </reatomContext.Provider>,
      )

      await wrap(tick()) // Initial render

      expect(initTracker).toHaveBeenCalledTimes(1)
      expect(renderTracker).toHaveBeenCalledTimes(1)
      expect(
        document.querySelector('[data-testid="factory-output"]')?.textContent?.trim(),
      ).toBe('External: 0')

      externalAtom.set(1) // Change the external atom
      await wrap(tick()) // Wait for potential re-render

      // Factory (init phase) should NOT be called again
      expect(initTracker).toHaveBeenCalledTimes(1)
      // Render function should NOT be called again as it doesn't subscribe to externalAtom
      expect(renderTracker).toHaveBeenCalledTimes(1)
      // The component's output should NOT change
      expect(
        document.querySelector('[data-testid="factory-output"]')?.textContent?.trim(),
      ).toBe('External: 0')

      externalAtom.set(2)
      await wrap(tick())
      expect(initTracker).toHaveBeenCalledTimes(1)
      expect(renderTracker).toHaveBeenCalledTimes(1)
      expect(
        document.querySelector('[data-testid="factory-output"]')?.textContent?.trim(),
      ).toBe('External: 0')
    }))

  test('effects autocancel', () =>
    context.start(async () => {
      let event = action(() => {})
      let pooling = 0

      const Counter = reatomFactoryComponent(() => {
        const count = atom(0, 'count')

        effect(async () => {
          while (true) {
            await wrap(take(event))
            count.set(++pooling)
          }
        })

        return () => <div data-testid="count">{count()}</div>
      }, 'Counter')

      const active = atom(true, 'active')
      const Controller = reatomComponent(
        () => (active() ? <Counter /> : null),
        'Controller',
      )

      const root = ReactDOM.createRoot(document.getElementById('root')!)
      root.render(
        <reatomContext.Provider value={top()}>
          <Controller />
        </reatomContext.Provider>,
      )

      const tickEvent = async () => {
        event()
        await wrap(sleep())
        await wrap(tick())
      }

      await wrap(tick())
      await wrap(tickEvent())
      await wrap(tickEvent())
      expect(pooling).toBe(2)
      expect(document.querySelector('[data-testid="count"]')?.textContent).toBe(
        '2',
      )

      active.set(false)
      await wrap(tick())
      await wrap(tickEvent())
      await wrap(tickEvent())
      expect(pooling).toBe(2)
    }))
}) 
