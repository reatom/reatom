import {
  action,
  atom,
  clearStack,
  context,
  effect,
  ifCalled,
  rAF,
  sleep,
  take,
  top,
  withActions,
  wrap,
} from '@reatom/core'
import { render } from 'preact'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { reatomComponent, reatomContext, reatomFactoryComponent } from './'

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
  document.getElementById('root')?.remove()
})

describe('reatomFactoryComponent', () => {
  test('creates component with factory initialization', () =>
    context.start(async () => {
      const Counter = reatomFactoryComponent(
        (props: { initialCount: number }) => {
          const count = atom(props.initialCount, 'localCount').extend(
            withActions((target) => ({
              inc: () => target.set((prev) => prev + 1),
            })),
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

      render(
        <reatomContext.Provider value={top()}>
          <Counter initialCount={5} />
        </reatomContext.Provider>,
        document.getElementById('root')!,
      )

      await wrap(tick())

      expect(document.querySelector('[data-testid="count"]')?.textContent).toBe(
        '5',
      )

      const button = document.querySelector(
        '[data-testid="increment"]',
      ) as HTMLButtonElement
      button.click()

      await wrap(tick())

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
        const initialExternalValueAtInit = externalAtom()

        return () => {
          renderTracker()
          return (
            <div data-testid="factory-output">
              External: {initialExternalValueAtInit}
            </div>
          )
        }
      }, 'FactoryComponent')

      render(
        <reatomContext.Provider value={top()}>
          <FactoryComponent />
        </reatomContext.Provider>,
        document.getElementById('root')!,
      )

      await wrap(tick())

      expect(initTracker).toHaveBeenCalledTimes(1)
      expect(renderTracker).toHaveBeenCalledTimes(1)
      expect(
        document
          .querySelector('[data-testid="factory-output"]')
          ?.textContent?.trim(),
      ).toBe('External: 0')

      externalAtom.set(1)
      await wrap(tick())

      expect(initTracker).toHaveBeenCalledTimes(1)
      expect(renderTracker).toHaveBeenCalledTimes(1)
      expect(
        document
          .querySelector('[data-testid="factory-output"]')
          ?.textContent?.trim(),
      ).toBe('External: 0')

      externalAtom.set(2)
      await wrap(tick())
      expect(initTracker).toHaveBeenCalledTimes(1)
      expect(renderTracker).toHaveBeenCalledTimes(1)
      expect(
        document
          .querySelector('[data-testid="factory-output"]')
          ?.textContent?.trim(),
      ).toBe('External: 0')
    }))

  test('effects autocancel', () =>
    context.start(async () => {
      let event = action(() => {})
      let poolingLoop = 0
      let poolingTrack = 0

      const Counter = reatomFactoryComponent(() => {
        const count = atom(0, 'count')

        effect(async () => {
          while (true) {
            await wrap(take(event))
            count.set(++poolingLoop)
          }
        })

        effect(() => {
          ifCalled(event, () => {
            ++poolingTrack
          })
        })

        return () => <div data-testid="count">{count()}</div>
      }, 'Counter')

      const active = atom(true, 'active')
      const Controller = reatomComponent(
        () => (active() ? <Counter /> : null),
        'Controller',
      )

      render(
        <reatomContext.Provider value={top()}>
          <Controller />
        </reatomContext.Provider>,
        document.getElementById('root')!,
      )

      const tickEvent = async () => {
        event()
        await wrap(sleep())
        await wrap(tick())
      }

      await wrap(tick())
      await wrap(tickEvent())
      await wrap(tickEvent())
      expect(poolingLoop).toBe(2)
      expect(poolingTrack).toBe(2)
      expect(document.querySelector('[data-testid="count"]')?.textContent).toBe(
        '2',
      )

      active.set(false)
      await wrap(tick())
      await wrap(tickEvent())
      await wrap(tickEvent())
      expect(poolingLoop).toBe(2)
      expect(poolingTrack).toBe(2)
    }))
})

