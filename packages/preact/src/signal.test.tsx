import '@preact/signals'
import {
  atom,
  clearStack,
  computed,
  context,
  rAF,
  take,
  top,
  wrap,
} from '@reatom/core'
import { render } from 'preact'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import { toPreact, withPreact } from './signal'

// TODO
// clearStack()

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

describe('toPreact in JSX without reatomComponent', () => {
  test('renders atom value in JSX using toPreact', () =>
    context.start(async () => {
      const countAtom = atom(42, 'count')

      const App = () => {
        return <div data-testid="counter">{toPreact(countAtom)}</div>
      }

      render(<App />, document.getElementById('root')!)

      await wrap(tick())

      const counterElement = document.querySelector('[data-testid="counter"]')
      expect(counterElement?.textContent).toBe('42')
    }))

  test('updates JSX when atom changes', () =>
    context.start(async () => {
      const countAtom = atom(0, 'count')

      const App = () => {
        return <div data-testid="counter">Count: {toPreact(countAtom)}</div>
      }

      render(<App />, document.getElementById('root')!)

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

  test('renders computed atom in JSX', () =>
    context.start(async () => {
      const countAtom = atom(5, 'count')
      const doubleAtom = computed(() => countAtom() * 2, 'double')

      const App = () => {
        return (
          <div>
            <span data-testid="count">{toPreact(countAtom)}</span>
            <span data-testid="double">{toPreact(doubleAtom)}</span>
          </div>
        )
      }

      render(<App />, document.getElementById('root')!)

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

  test('uses withPreact extension in JSX', () =>
    context.start(async () => {
      const nameAtom = atom('World', 'name').extend(withPreact())

      const App = () => {
        return <div data-testid="greeting">Hello, {nameAtom.preact}!</div>
      }

      render(<App />, document.getElementById('root')!)

      await wrap(tick())

      const greetingElement = document.querySelector('[data-testid="greeting"]')
      expect(greetingElement?.textContent).toBe('Hello, World!')

      nameAtom.set('Reatom')
      await wrap(tick())
      expect(greetingElement?.textContent).toBe('Hello, Reatom!')
    }))

  test('multiple atoms in single component', () =>
    context.start(async () => {
      const firstNameAtom = atom('John', 'firstName')
      const lastNameAtom = atom('Doe', 'lastName')
      const ageAtom = atom(30, 'age')

      const App = () => {
        return (
          <div data-testid="person">
            {toPreact(firstNameAtom)} {toPreact(lastNameAtom)}, age{' '}
            {toPreact(ageAtom)}
          </div>
        )
      }

      render(<App />, document.getElementById('root')!)

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

  test('signal value in input element', () =>
    context.start(async () => {
      const inputAtom = atom('initial', 'input')
      const inputSignal = toPreact(inputAtom)

      const App = () => {
        return (
          <input
            data-testid="input"
            value={inputSignal}
            onInput={(e) => {
              inputSignal.value = (e.target as HTMLInputElement).value
            }}
          />
        )
      }

      render(<App />, document.getElementById('root')!)

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

  test('nested components with toPreact', () =>
    context.start(async () => {
      const countAtom = atom(0, 'count')

      const Counter = () => {
        return <span data-testid="nested-counter">{toPreact(countAtom)}</span>
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

      render(<App />, document.getElementById('root')!)

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

  test('conditional rendering with signal in text content', () =>
    context.start(async () => {
      const messageAtom = atom('Hello', 'message')

      const Message = () => {
        return <span data-testid="message">{toPreact(messageAtom)}</span>
      }

      const App = () => {
        return (
          <div data-testid="container">
            <Message />
          </div>
        )
      }

      render(<App />, document.getElementById('root')!)

      await wrap(tick())

      expect(
        document.querySelector('[data-testid="message"]')?.textContent,
      ).toBe('Hello')

      messageAtom.set('Updated')
      await wrap(tick())
      expect(
        document.querySelector('[data-testid="message"]')?.textContent,
      ).toBe('Updated')

      messageAtom.set('Final')
      await wrap(tick())
      expect(
        document.querySelector('[data-testid="message"]')?.textContent,
      ).toBe('Final')
    }))

  test('derived computed atoms in JSX', () =>
    context.start(async () => {
      const nameAtom = atom('John', 'name')
      const ageAtom = atom(30, 'age')
      const greetingAtom = computed(
        () => `Hello, ${nameAtom()}! You are ${ageAtom()} years old.`,
        'greeting',
      )

      const App = () => {
        return <div data-testid="greeting">{toPreact(greetingAtom)}</div>
      }

      render(<App />, document.getElementById('root')!)

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

  test('computed with multiple dependencies in JSX', () =>
    context.start(async () => {
      const priceAtom = atom(100, 'price')
      const quantityAtom = atom(2, 'quantity')
      const discountAtom = atom(0.1, 'discount')
      const totalAtom = computed(() => {
        const subtotal = priceAtom() * quantityAtom()
        return subtotal - subtotal * discountAtom()
      }, 'total')

      const App = () => {
        return (
          <div>
            <span data-testid="price">${toPreact(priceAtom)}</span>
            <span data-testid="quantity">x{toPreact(quantityAtom)}</span>
            <span data-testid="total">= ${toPreact(totalAtom)}</span>
          </div>
        )
      }

      render(<App />, document.getElementById('root')!)

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

  test('signal directly in text node updates without re-render', () =>
    context.start(async () => {
      const countAtom = atom(0, 'count')
      let renderCount = 0

      const Counter = () => {
        renderCount++
        return (
          <div>
            <span data-testid="count">{toPreact(countAtom)}</span>
            <span data-testid="renders">{renderCount}</span>
          </div>
        )
      }

      render(<Counter />, document.getElementById('root')!)

      await wrap(tick())

      expect(document.querySelector('[data-testid="count"]')?.textContent).toBe(
        '0',
      )
      expect(
        document.querySelector('[data-testid="renders"]')?.textContent,
      ).toBe('1')

      countAtom.set(1)
      await wrap(tick())

      expect(document.querySelector('[data-testid="count"]')?.textContent).toBe(
        '1',
      )
      expect(
        document.querySelector('[data-testid="renders"]')?.textContent,
      ).toBe('1')

      countAtom.set(2)
      countAtom.set(3)
      await wrap(tick())

      expect(document.querySelector('[data-testid="count"]')?.textContent).toBe(
        '3',
      )
      expect(
        document.querySelector('[data-testid="renders"]')?.textContent,
      ).toBe('1')
    }))
})
