import {
  atom,
  clearStack,
  context,
  effect,
  isAbort,
  isConnected,
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

const getRootElement = () => {
  const rootElement = document.getElementById('root')
  if (!rootElement) {
    throw new Error('root element is not found')
  }
  return rootElement
}

const getInputElement = (testId: string) => {
  const element = document.querySelector(`[data-testid="${testId}"]`)
  if (!(element instanceof HTMLInputElement)) {
    throw new Error(`input "${testId}" is not found`)
  }
  return element
}

const inputText = async (inputElement: HTMLInputElement, value: string) => {
  const valueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )?.set
  if (!valueSetter) {
    throw new Error('input value setter is not found')
  }

  await sleep()
  valueSetter.call(inputElement, value)
  inputElement.dispatchEvent(new Event('input', { bubbles: true }))
}

beforeEach(() => {
  const body = document.querySelector('body')
  if (!body) {
    throw new Error('body element is not found')
  }

  const root = document.createElement('div')
  root.id = 'root'
  body.append(root)
})

afterEach(() => {
  document.getElementById('root')?.remove()
})

describe('StrictMode input sync', () => {
  test('reatomComponent keeps input and atom in sync', () =>
    context.start(async () => {
      const textAtom = atom('hello', 'textAtom')

      const TextInput = reatomComponent(() => {
        return (
          <input
            data-testid="reatom-component-input"
            value={textAtom()}
            onChange={wrap((event: React.ChangeEvent<HTMLInputElement>) =>
              textAtom.set(event.currentTarget.value),
            )}
          />
        )
      }, 'TextInput')

      const reactRoot = ReactDOM.createRoot(getRootElement())
      reactRoot.render(
        <React.StrictMode>
          <reatomContext.Provider value={top()}>
            <TextInput />
          </reatomContext.Provider>
        </React.StrictMode>,
      )

      await wrap(tick())
      expect(getInputElement('reatom-component-input').value).toBe('hello')
      expect(textAtom()).toBe('hello')

      await wrap(
        inputText(getInputElement('reatom-component-input'), 'strict mode'),
      )
      await wrap(tick())

      expect(textAtom()).toBe('strict mode')
      expect(getInputElement('reatom-component-input').value).toBe(
        'strict mode',
      )

      textAtom.set('external update')
      await wrap(tick())
      expect(getInputElement('reatom-component-input').value).toBe(
        'external update',
      )

      reactRoot.unmount()
    }))

  test('reatomFactoryComponent keeps input and atom in sync', () =>
    context.start(async () => {
      const textAtom = atom('factory', 'factoryTextAtom')

      const TextInput = reatomFactoryComponent(() => {
        return () => {
          return (
            <input
              data-testid="reatom-factory-input"
              value={textAtom()}
              onChange={wrap((event: React.ChangeEvent<HTMLInputElement>) =>
                textAtom.set(event.currentTarget.value),
              )}
            />
          )
        }
      }, 'FactoryTextInput')

      const reactRoot = ReactDOM.createRoot(getRootElement())
      reactRoot.render(
        <React.StrictMode>
          <reatomContext.Provider value={top()}>
            <TextInput />
          </reatomContext.Provider>
        </React.StrictMode>,
      )

      await wrap(tick())
      expect(getInputElement('reatom-factory-input').value).toBe('factory')
      expect(textAtom()).toBe('factory')

      await wrap(inputText(getInputElement('reatom-factory-input'), 'reatom'))
      await wrap(tick())

      expect(textAtom()).toBe('reatom')
      expect(getInputElement('reatom-factory-input').value).toBe('reatom')

      textAtom.set('factory external update')
      await wrap(tick())
      expect(getInputElement('reatom-factory-input').value).toBe(
        'factory external update',
      )

      reactRoot.unmount()
    }))
})

describe('StrictMode lifecycle', () => {
  test('reatomComponent keeps reacting to atom updates after remount', () =>
    context.start(async () => {
      const countAtom = atom(0, 'strictCount')
      const Counter = reatomComponent(() => {
        return <div data-testid="count">{countAtom()}</div>
      }, 'Counter')

      const reactRoot = ReactDOM.createRoot(getRootElement())
      reactRoot.render(
        <React.StrictMode>
          <reatomContext.Provider value={top()}>
            <Counter />
          </reatomContext.Provider>
        </React.StrictMode>,
      )

      await wrap(tick())
      expect(document.querySelector('[data-testid="count"]')?.textContent).toBe(
        '0',
      )
      expect(isConnected(countAtom)).toBe(true)

      countAtom.set(1)
      await wrap(tick())
      expect(document.querySelector('[data-testid="count"]')?.textContent).toBe(
        '1',
      )

      countAtom.set(2)
      await wrap(tick())
      expect(document.querySelector('[data-testid="count"]')?.textContent).toBe(
        '2',
      )
      expect(isConnected(countAtom)).toBe(true)

      reactRoot.unmount()
    }))

  test('reatomComponent default: render-time wrap works after StrictMode remount', () =>
    context.start(async () => {
      const statusAtom = atom('idle', 'statusDefault')

      const Probe = reatomComponent(() => {
        const onRun = wrap(async () => {
          statusAtom.set('pending')
          await wrap(sleep(20))
          statusAtom.set('done')
        })

        return (
          <button data-testid="run-default" onClick={onRun}>
            {statusAtom()}
          </button>
        )
      }, 'ProbeDefault')

      const reactRoot = ReactDOM.createRoot(getRootElement())
      reactRoot.render(
        <React.StrictMode>
          <reatomContext.Provider value={top()}>
            <Probe />
          </reatomContext.Provider>
        </React.StrictMode>,
      )

      await wrap(tick())
      ;(
        document.querySelector(
          '[data-testid="run-default"]',
        ) as HTMLButtonElement
      ).click()
      await wrap(sleep(40))
      await wrap(tick())

      expect(statusAtom()).toBe('done')
      reactRoot.unmount()
    }))

  test('reatomComponent abortOnUnmount: render-time wrap works after StrictMode remount', () =>
    context.start(async () => {
      const statusAtom = atom('idle', 'status')
      let clickError: unknown
      let taskAborted = false

      const Probe = reatomComponent(
        () => {
          const onRun = wrap(async () => {
            statusAtom.set('pending')
            try {
              await wrap(sleep(20))
              statusAtom.set('done')
            } catch (error) {
              taskAborted = isAbort(error)
              statusAtom.set(isAbort(error) ? 'aborted' : 'error')
            }
          })

          return (
            <button
              data-testid="run"
              onClick={() => {
                try {
                  onRun()
                } catch (error) {
                  clickError = error
                  statusAtom.set(isAbort(error) ? 'aborted' : 'error')
                }
              }}
            >
              {statusAtom()}
            </button>
          )
        },
        { name: 'Probe', abortOnUnmount: true },
      )

      const reactRoot = ReactDOM.createRoot(getRootElement())
      reactRoot.render(
        <React.StrictMode>
          <reatomContext.Provider value={top()}>
            <Probe />
          </reatomContext.Provider>
        </React.StrictMode>,
      )

      await wrap(tick())
      const button = document.querySelector(
        '[data-testid="run"]',
      ) as HTMLButtonElement
      button.click()
      await wrap(sleep(40))
      await wrap(tick())

      expect(isAbort(clickError)).toBe(false)
      expect(statusAtom()).toBe('done')
      expect(button.textContent).toBe('done')

      button.click()
      expect(statusAtom()).toBe('pending')
      reactRoot.unmount()
      // The scope is aborted now; wait outside it to observe cancellation.
      await sleep(40)
      expect(taskAborted).toBe(true)
    }))

  test('reatomComponent abortOnUnmount: wrap recovers after a reactive re-render', () =>
    context.start(async () => {
      const statusAtom = atom('idle', 'statusRecover')
      const bumpAtom = atom(0, 'bump')
      let clickError: unknown

      const Probe = reatomComponent(
        () => {
          bumpAtom()
          const onRun = wrap(async () => {
            statusAtom.set('pending')
            try {
              await wrap(sleep(20))
              statusAtom.set('done')
            } catch (error) {
              statusAtom.set(isAbort(error) ? 'aborted' : 'error')
            }
          })

          return (
            <button
              data-testid="run-recover"
              onClick={() => {
                try {
                  onRun()
                } catch (error) {
                  clickError = error
                  statusAtom.set(isAbort(error) ? 'aborted' : 'error')
                }
              }}
            >
              {statusAtom()}
            </button>
          )
        },
        { name: 'ProbeRecover', abortOnUnmount: true },
      )

      const reactRoot = ReactDOM.createRoot(getRootElement())
      reactRoot.render(
        <React.StrictMode>
          <reatomContext.Provider value={top()}>
            <Probe />
          </reatomContext.Provider>
        </React.StrictMode>,
      )

      await wrap(tick())

      // Force a render after StrictMode settle so wrap rebinds to a live abort.
      bumpAtom.set(1)
      await wrap(tick())

      const button = document.querySelector(
        '[data-testid="run-recover"]',
      ) as HTMLButtonElement
      button.click()
      await wrap(sleep(40))
      await wrap(tick())

      expect(isAbort(clickError)).toBe(false)
      expect(statusAtom()).toBe('done')

      reactRoot.unmount()
    }))

  test('reatomFactoryComponent effects keep running under StrictMode', () =>
    context.start(async () => {
      let effectAborts = 0
      const ticks = atom(0, 'effectTicks')

      const Probe = reatomFactoryComponent(() => {
        effect(async () => {
          try {
            while (true) {
              await wrap(sleep(10))
              ticks.set((state) => state + 1)
            }
          } catch (error) {
            if (isAbort(error)) effectAborts++
            throw error
          }
        }, 'strictPolling')

        return () => <div data-testid="ticks">{ticks()}</div>
      }, 'Probe')

      const reactRoot = ReactDOM.createRoot(getRootElement())
      reactRoot.render(
        <React.StrictMode>
          <reatomContext.Provider value={top()}>
            <Probe />
          </reatomContext.Provider>
        </React.StrictMode>,
      )

      await wrap(sleep(50))
      await wrap(tick())

      // React 19 StrictMode remounts and re-runs useMemo, so a second effect can
      // start. The first abort from `useEffect(() => abort, [])` is expected;
      // after settle, polling must still advance.
      expect(ticks()).toBeGreaterThan(0)
      expect(
        document.querySelector('[data-testid="ticks"]')?.textContent,
      ).not.toBe('0')

      const ticksAfterSettle = ticks()
      await wrap(sleep(40))
      await wrap(tick())
      expect(ticks()).toBeGreaterThan(ticksAfterSettle)
      expect(effectAborts).toBeLessThanOrEqual(1)

      reactRoot.unmount()
    }))

  test('reatomFactoryComponent init abort from StrictMode does not leak into render handlers', () =>
    context.start(async () => {
      const statusAtom = atom('idle', 'factoryStatus')
      let clickError: unknown

      const Probe = reatomFactoryComponent(() => {
        return () => {
          const onRun = wrap(async () => {
            statusAtom.set('pending')
            try {
              await wrap(sleep(20))
              statusAtom.set('done')
            } catch (error) {
              statusAtom.set(isAbort(error) ? 'aborted' : 'error')
            }
          })

          return (
            <button
              data-testid="factory-run"
              onClick={() => {
                try {
                  onRun()
                } catch (error) {
                  clickError = error
                  statusAtom.set(isAbort(error) ? 'aborted' : 'error')
                }
              }}
            >
              {statusAtom()}
            </button>
          )
        }
      }, 'FactoryProbe')

      const reactRoot = ReactDOM.createRoot(getRootElement())
      reactRoot.render(
        <React.StrictMode>
          <reatomContext.Provider value={top()}>
            <Probe />
          </reatomContext.Provider>
        </React.StrictMode>,
      )

      await wrap(tick())
      const button = document.querySelector(
        '[data-testid="factory-run"]',
      ) as HTMLButtonElement
      button.click()
      await wrap(sleep(40))
      await wrap(tick())

      expect(isAbort(clickError)).toBe(false)
      expect(statusAtom()).toBe('done')
      expect(button.textContent).toBe('done')

      reactRoot.unmount()
    }))

  test('reatomFactoryComponent local atom updates after StrictMode remount', () =>
    context.start(async () => {
      const Probe = reatomFactoryComponent(() => {
        const count = atom(0, 'localCount')
        return () => (
          <button
            data-testid="inc"
            onClick={wrap(() => count.set((state) => state + 1))}
          >
            {count()}
          </button>
        )
      }, 'Probe')

      const reactRoot = ReactDOM.createRoot(getRootElement())
      reactRoot.render(
        <React.StrictMode>
          <reatomContext.Provider value={top()}>
            <Probe />
          </reatomContext.Provider>
        </React.StrictMode>,
      )

      await wrap(tick())
      const button = document.querySelector(
        '[data-testid="inc"]',
      ) as HTMLButtonElement
      expect(button.textContent).toBe('0')

      button.click()
      await wrap(tick())
      expect(button.textContent).toBe('1')

      button.click()
      await wrap(tick())
      expect(button.textContent).toBe('2')

      reactRoot.unmount()
    }))

  test('reatomComponent notices atom change between StrictMode mount cleanup and remount', () =>
    context.start(async () => {
      const countAtom = atom(0, 'gapCount')
      const rootFrame = top()
      let cleanups = 0

      const Counter = reatomComponent(() => {
        return <div data-testid="count">{countAtom()}</div>
      }, 'Counter')

      const Parent = () => {
        React.useLayoutEffect(() => {
          return () => {
            cleanups++
            // Child mount already unsubscribed; mutate before remount subscribe.
            if (cleanups === 1) {
              rootFrame.run(() => countAtom.set(7))
            }
          }
        }, [])

        return <Counter />
      }

      const reactRoot = ReactDOM.createRoot(getRootElement())
      reactRoot.render(
        <React.StrictMode>
          <reatomContext.Provider value={rootFrame}>
            <Parent />
          </reatomContext.Provider>
        </React.StrictMode>,
      )

      await wrap(tick())
      expect(cleanups).toBeGreaterThanOrEqual(1)
      expect(countAtom()).toBe(7)
      expect(document.querySelector('[data-testid="count"]')?.textContent).toBe(
        '7',
      )

      reactRoot.unmount()
    }))
})
