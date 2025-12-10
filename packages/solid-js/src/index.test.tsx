import {
  action,
  atom,
  clearStack,
  computed,
  context,
  effect,
  getCalls,
  rAF,
  sleep,
  take,
  top,
  withActions,
  wrap,
} from '@reatom/core'
import { render } from 'solid-js/web'
import { createEffect, createSignal, onCleanup, Show } from 'solid-js'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { reatomContext, useAtom, useFrame, withSolid } from './'

clearStack()

const tick = async () => {
  await wrap(take(rAF))
  await wrap(take(rAF))
}

let rootElement: HTMLDivElement
let dispose: () => void

beforeEach(() => {
  const body = document.querySelector('body')!
  rootElement = document.createElement('div')
  rootElement.id = 'root'
  body.append(rootElement)
})

afterEach(() => {
  dispose?.()
  rootElement?.remove()
})

describe('useAtom', () => {
  test('renders atom value', () =>
    context.start(async () => {
      const countAtom = atom(42, 'count')

      const App = () => {
        const [count] = useAtom(countAtom)
        return <div data-testid="counter">{count()}</div>
      }

      dispose = render(
        () => (
          <reatomContext.Provider value={top()}>
            <App />
          </reatomContext.Provider>
        ),
        rootElement,
      )

      await wrap(tick())

      const counterElement = document.querySelector('[data-testid="counter"]')
      expect(counterElement?.textContent).toBe('42')
    }))

  test('updates when atom changes', () =>
    context.start(async () => {
      const countAtom = atom(0, 'count')

      const App = () => {
        const [count] = useAtom(countAtom)
        return <div data-testid="counter">Count: {count()}</div>
      }

      dispose = render(
        () => (
          <reatomContext.Provider value={top()}>
            <App />
          </reatomContext.Provider>
        ),
        rootElement,
      )

      await wrap(tick())

      const counterElement = document.querySelector('[data-testid="counter"]')
      expect(counterElement?.textContent).toBe('Count: 0')

      countAtom.set(1)
      await wrap(tick())
      expect(counterElement?.textContent).toBe('Count: 1')

      countAtom.set(100)
      await wrap(tick())
      expect(counterElement?.textContent).toBe('Count: 100')
    }))

  test('renders computed atom', () =>
    context.start(async () => {
      const countAtom = atom(5, 'count')
      const doubleAtom = computed(() => countAtom() * 2, 'double')

      const App = () => {
        const [count] = useAtom(countAtom)
        const [double] = useAtom(doubleAtom)
        return (
          <div>
            <span data-testid="count">{count()}</span>
            <span data-testid="double">{double()}</span>
          </div>
        )
      }

      dispose = render(
        () => (
          <reatomContext.Provider value={top()}>
            <App />
          </reatomContext.Provider>
        ),
        rootElement,
      )

      await wrap(tick())

      expect(document.querySelector('[data-testid="count"]')?.textContent).toBe(
        '5',
      )
      expect(
        document.querySelector('[data-testid="double"]')?.textContent,
      ).toBe('10')

      countAtom.set(10)
      await wrap(tick())

      expect(document.querySelector('[data-testid="count"]')?.textContent).toBe(
        '10',
      )
      expect(
        document.querySelector('[data-testid="double"]')?.textContent,
      ).toBe('20')
    }))

  test('uses setState from useAtom', () =>
    context.start(async () => {
      const countAtom = atom(0, 'count')

      const App = () => {
        const [count, setCount] = useAtom(countAtom)
        return (
          <div>
            <div data-testid="count">{count()}</div>
            <button
              data-testid="increment"
              onClick={() => setCount!(count() + 1)}
            >
              Increment
            </button>
          </div>
        )
      }

      dispose = render(
        () => (
          <reatomContext.Provider value={top()}>
            <App />
          </reatomContext.Provider>
        ),
        rootElement,
      )

      await wrap(tick())

      expect(document.querySelector('[data-testid="count"]')?.textContent).toBe(
        '0',
      )

      const button = document.querySelector(
        '[data-testid="increment"]',
      ) as HTMLButtonElement
      button.click()

      await wrap(tick())

      expect(document.querySelector('[data-testid="count"]')?.textContent).toBe(
        '1',
      )
    }))

  test('multiple atoms in single component', () =>
    context.start(async () => {
      const firstNameAtom = atom('John', 'firstName')
      const lastNameAtom = atom('Doe', 'lastName')
      const ageAtom = atom(30, 'age')

      const App = () => {
        const [firstName] = useAtom(firstNameAtom)
        const [lastName] = useAtom(lastNameAtom)
        const [age] = useAtom(ageAtom)
        return (
          <div data-testid="person">
            {firstName()} {lastName()}, age {age()}
          </div>
        )
      }

      dispose = render(
        () => (
          <reatomContext.Provider value={top()}>
            <App />
          </reatomContext.Provider>
        ),
        rootElement,
      )

      await wrap(tick())

      const personElement = document.querySelector('[data-testid="person"]')
      expect(personElement?.textContent).toBe('John Doe, age 30')

      firstNameAtom.set('Jane')
      await wrap(tick())
      expect(personElement?.textContent).toBe('Jane Doe, age 30')

      lastNameAtom.set('Smith')
      ageAtom.set(25)
      await wrap(tick())
      expect(personElement?.textContent).toBe('Jane Smith, age 25')
    }))

  test('nested components with useAtom', () =>
    context.start(async () => {
      const countAtom = atom(0, 'count')

      const Counter = () => {
        const [count] = useAtom(countAtom)
        return <span data-testid="nested-counter">{count()}</span>
      }

      const App = () => {
        return (
          <div>
            <Counter />
            <button
              data-testid="increment"
              onClick={() => countAtom.set(countAtom() + 1)}
            >
              +
            </button>
          </div>
        )
      }

      dispose = render(
        () => (
          <reatomContext.Provider value={top()}>
            <App />
          </reatomContext.Provider>
        ),
        rootElement,
      )

      await wrap(tick())

      const counterElement = document.querySelector(
        '[data-testid="nested-counter"]',
      )
      expect(counterElement?.textContent).toBe('0')

      const button = document.querySelector(
        '[data-testid="increment"]',
      ) as HTMLButtonElement
      button.click()
      await wrap(tick())
      expect(counterElement?.textContent).toBe('1')

      button.click()
      button.click()
      await wrap(tick())
      expect(counterElement?.textContent).toBe('3')
    }))

  test('derived computed atoms', () =>
    context.start(async () => {
      const nameAtom = atom('John', 'name')
      const ageAtom = atom(30, 'age')
      const greetingAtom = computed(
        () => `Hello, ${nameAtom()}! You are ${ageAtom()} years old.`,
        'greeting',
      )

      const App = () => {
        const [greeting] = useAtom(greetingAtom)
        return <div data-testid="greeting">{greeting()}</div>
      }

      dispose = render(
        () => (
          <reatomContext.Provider value={top()}>
            <App />
          </reatomContext.Provider>
        ),
        rootElement,
      )

      await wrap(tick())

      expect(
        document.querySelector('[data-testid="greeting"]')?.textContent,
      ).toBe('Hello, John! You are 30 years old.')

      nameAtom.set('Jane')
      await wrap(tick())
      expect(
        document.querySelector('[data-testid="greeting"]')?.textContent,
      ).toBe('Hello, Jane! You are 30 years old.')

      ageAtom.set(25)
      await wrap(tick())
      expect(
        document.querySelector('[data-testid="greeting"]')?.textContent,
      ).toBe('Hello, Jane! You are 25 years old.')
    }))

  test('computed with multiple dependencies', () =>
    context.start(async () => {
      const priceAtom = atom(100, 'price')
      const quantityAtom = atom(2, 'quantity')
      const discountAtom = atom(0.1, 'discount')
      const totalAtom = computed(() => {
        const subtotal = priceAtom() * quantityAtom()
        return subtotal - subtotal * discountAtom()
      }, 'total')

      const App = () => {
        const [price] = useAtom(priceAtom)
        const [quantity] = useAtom(quantityAtom)
        const [total] = useAtom(totalAtom)
        return (
          <div>
            <span data-testid="price">${price()}</span>
            <span data-testid="quantity">x{quantity()}</span>
            <span data-testid="total">= ${total()}</span>
          </div>
        )
      }

      dispose = render(
        () => (
          <reatomContext.Provider value={top()}>
            <App />
          </reatomContext.Provider>
        ),
        rootElement,
      )

      await wrap(tick())

      expect(document.querySelector('[data-testid="price"]')?.textContent).toBe(
        '$100',
      )
      expect(
        document.querySelector('[data-testid="quantity"]')?.textContent,
      ).toBe('x2')
      expect(document.querySelector('[data-testid="total"]')?.textContent).toBe(
        '= $180',
      )

      quantityAtom.set(5)
      await wrap(tick())
      expect(document.querySelector('[data-testid="total"]')?.textContent).toBe(
        '= $450',
      )

      discountAtom.set(0.2)
      await wrap(tick())
      expect(document.querySelector('[data-testid="total"]')?.textContent).toBe(
        '= $400',
      )
    }))
})

describe('withSolid extension', () => {
  test('uses withSolid extension', () =>
    context.start(async () => {
      const nameAtom = atom('World', 'name').extend(withSolid())

      const App = () => {
        return <div data-testid="greeting">Hello, {nameAtom.solid()}!</div>
      }

      dispose = render(
        () => (
          <reatomContext.Provider value={top()}>
            <App />
          </reatomContext.Provider>
        ),
        rootElement,
      )

      await wrap(tick())

      const greetingElement = document.querySelector('[data-testid="greeting"]')
      expect(greetingElement?.textContent).toBe('Hello, World!')

      nameAtom.set('Reatom')
      await wrap(tick())
      expect(greetingElement?.textContent).toBe('Hello, Reatom!')
    }))

  test('withSolid with computed atom', () =>
    context.start(async () => {
      const countAtom = atom(5, 'count')
      const doubleAtom = computed(() => countAtom() * 2, 'double').extend(
        withSolid(),
      )

      const App = () => {
        return <div data-testid="double">{doubleAtom.solid()}</div>
      }

      dispose = render(
        () => (
          <reatomContext.Provider value={top()}>
            <App />
          </reatomContext.Provider>
        ),
        rootElement,
      )

      await wrap(tick())

      expect(
        document.querySelector('[data-testid="double"]')?.textContent,
      ).toBe('10')

      countAtom.set(10)
      await wrap(tick())
      expect(
        document.querySelector('[data-testid="double"]')?.textContent,
      ).toBe('20')
    }))
})

describe('useFrame', () => {
  test('useFrame returns the context frame', () =>
    context.start(async () => {
      let capturedFrame: ReturnType<typeof useFrame> | null = null
      const expectedFrame = top()

      const App = () => {
        capturedFrame = useFrame()
        return <div>Test</div>
      }

      dispose = render(
        () => (
          <reatomContext.Provider value={expectedFrame}>
            <App />
          </reatomContext.Provider>
        ),
        rootElement,
      )

      await wrap(tick())

      expect(capturedFrame).toBe(expectedFrame)
    }))
})

describe('conditional rendering', () => {
  test('conditional rendering with Show', () =>
    context.start(async () => {
      const visibleAtom = atom(true, 'visible')
      const messageAtom = atom('Hello', 'message')

      const App = () => {
        const [visible] = useAtom(visibleAtom)
        const [message] = useAtom(messageAtom)
        return (
          <div data-testid="container">
            <Show when={visible()}>
              <span data-testid="message">{message()}</span>
            </Show>
          </div>
        )
      }

      dispose = render(
        () => (
          <reatomContext.Provider value={top()}>
            <App />
          </reatomContext.Provider>
        ),
        rootElement,
      )

      await wrap(tick())

      expect(
        document.querySelector('[data-testid="message"]')?.textContent,
      ).toBe('Hello')

      messageAtom.set('Updated')
      await wrap(tick())
      expect(
        document.querySelector('[data-testid="message"]')?.textContent,
      ).toBe('Updated')

      visibleAtom.set(false)
      await wrap(tick())
      expect(document.querySelector('[data-testid="message"]')).toBeNull()

      visibleAtom.set(true)
      await wrap(tick())
      expect(
        document.querySelector('[data-testid="message"]')?.textContent,
      ).toBe('Updated')
    }))
})

describe('component with local state and atoms', () => {
  test('component with factory-like initialization using withActions', () =>
    context.start(async () => {
      const Counter = () => {
        const localCount = atom(0, 'localCount').extend(
          withActions((target) => ({
            inc: () => target.set((prev) => prev + 1),
          })),
        )
        const [count] = useAtom(localCount)

        return (
          <div>
            <div data-testid="count">{count()}</div>
            <button data-testid="increment" onClick={wrap(localCount.inc)}>
              Increment
            </button>
          </div>
        )
      }

      dispose = render(
        () => (
          <reatomContext.Provider value={top()}>
            <Counter />
          </reatomContext.Provider>
        ),
        rootElement,
      )

      await wrap(tick())

      expect(document.querySelector('[data-testid="count"]')?.textContent).toBe(
        '0',
      )

      const button = document.querySelector(
        '[data-testid="increment"]',
      ) as HTMLButtonElement
      button.click()

      await wrap(tick())

      expect(document.querySelector('[data-testid="count"]')?.textContent).toBe(
        '1',
      )
    }))

  test('external atom changes do not re-run component factory', () =>
    context.start(async () => {
      const externalAtom = atom(0, 'externalAtom')
      const initTracker = vi.fn()
      let renderCount = 0

      const FactoryComponent = () => {
        initTracker()
        const initialExternalValue = externalAtom()
        const [external] = useAtom(externalAtom)

        return (
          <div>
            <div data-testid="factory-output">
              Initial: {initialExternalValue}, Current: {external()}
            </div>
            <div data-testid="renders">{++renderCount}</div>
          </div>
        )
      }

      dispose = render(
        () => (
          <reatomContext.Provider value={top()}>
            <FactoryComponent />
          </reatomContext.Provider>
        ),
        rootElement,
      )

      await wrap(tick())

      expect(initTracker).toHaveBeenCalledTimes(1)
      expect(
        document
          .querySelector('[data-testid="factory-output"]')
          ?.textContent?.trim(),
      ).toBe('Initial: 0, Current: 0')

      externalAtom.set(1)
      await wrap(tick())

      expect(initTracker).toHaveBeenCalledTimes(1)
      expect(
        document
          .querySelector('[data-testid="factory-output"]')
          ?.textContent?.trim(),
      ).toBe('Initial: 0, Current: 1')
    }))
})

describe('input handling', () => {
  test('controlled input with atom', () =>
    context.start(async () => {
      const inputAtom = atom('initial', 'input')

      const App = () => {
        const [value, setValue] = useAtom(inputAtom)
        return (
          <input
            data-testid="input"
            value={value()}
            onInput={(e) => setValue!(e.currentTarget.value)}
          />
        )
      }

      dispose = render(
        () => (
          <reatomContext.Provider value={top()}>
            <App />
          </reatomContext.Provider>
        ),
        rootElement,
      )

      await wrap(tick())

      const inputElement = document.querySelector(
        '[data-testid="input"]',
      ) as HTMLInputElement
      expect(inputElement.value).toBe('initial')

      inputAtom.set('updated from atom')
      await wrap(tick())
      expect(inputElement.value).toBe('updated from atom')

      inputElement.value = 'typed value'
      inputElement.dispatchEvent(new Event('input', { bubbles: true }))
      await wrap(tick())
      expect(inputAtom()).toBe('typed value')
    }))
})

describe('cleanup and effects', () => {
  test('subscription cleanup on unmount', () =>
    context.start(async () => {
      const countAtom = atom(0, 'count')
      const visibleAtom = atom(true, 'visible')
      let subscriptionActive = false

      const originalSubscribe = countAtom.subscribe.bind(countAtom)
      countAtom.subscribe = (cb) => {
        subscriptionActive = true
        const unsub = originalSubscribe(cb)
        return () => {
          subscriptionActive = false
          unsub()
        }
      }

      const Counter = () => {
        const [count] = useAtom(countAtom)
        return <div data-testid="count">{count()}</div>
      }

      const App = () => {
        const [visible] = useAtom(visibleAtom)
        return (
          <div>
            <Show when={visible()}>
              <Counter />
            </Show>
          </div>
        )
      }

      dispose = render(
        () => (
          <reatomContext.Provider value={top()}>
            <App />
          </reatomContext.Provider>
        ),
        rootElement,
      )

      await wrap(tick())

      expect(subscriptionActive).toBe(true)
      expect(document.querySelector('[data-testid="count"]')?.textContent).toBe(
        '0',
      )

      visibleAtom.set(false)
      await wrap(tick())

      expect(subscriptionActive).toBe(false)
      expect(document.querySelector('[data-testid="count"]')).toBeNull()
    }))
})
