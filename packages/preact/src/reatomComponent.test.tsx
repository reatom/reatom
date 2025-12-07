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
import { useState } from 'preact/hooks'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import { reatomComponent, reatomContext } from './'

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

describe('reatomComponent', () => {
  test('renders component and updates with atom changes', () =>
    context.start(async () => {
      const countAtom = atom(0, 'count')
      const Counter = reatomComponent(() => {
        const count = countAtom()
        return <div data-testid="counter">Count: {count}</div>
      })

      render(
        <reatomContext.Provider value={top()}>
          <Counter />
        </reatomContext.Provider>,
        document.getElementById('root')!,
      )

      await wrap(tick())
      const counterElement = document.querySelector('[data-testid="counter"]')
      expect(counterElement?.textContent).toBe('Count: 0')

      countAtom.set(1)
      await wrap(tick())
      expect(counterElement?.textContent).toBe('Count: 1')
    }))

  test('component with multiple atoms', () =>
    context.start(async () => {
      const nameAtom = atom('John', 'name')
      const ageAtom = atom(25, 'age')
      const totalAtom = computed(
        () => `${nameAtom()}, ${ageAtom()} years old`,
        'total',
      )

      const Person = reatomComponent(() => {
        const name = nameAtom()
        const age = ageAtom()
        const total = totalAtom()

        return (
          <div>
            <div data-testid="name">{name}</div>
            <div data-testid="age">{age}</div>
            <div data-testid="total">{total}</div>
          </div>
        )
      })

      render(
        <reatomContext.Provider value={top()}>
          <Person />
        </reatomContext.Provider>,
        document.getElementById('root')!,
      )

      await wrap(tick())

      expect(document.querySelector('[data-testid="name"]')?.textContent).toBe(
        'John',
      )
      expect(document.querySelector('[data-testid="age"]')?.textContent).toBe(
        '25',
      )
      expect(document.querySelector('[data-testid="total"]')?.textContent).toBe(
        'John, 25 years old',
      )

      nameAtom.set('Jane')
      ageAtom.set(30)

      await wrap(tick())

      expect(document.querySelector('[data-testid="name"]')?.textContent).toBe(
        'Jane',
      )
      expect(document.querySelector('[data-testid="age"]')?.textContent).toBe(
        '30',
      )
      expect(document.querySelector('[data-testid="total"]')?.textContent).toBe(
        'Jane, 30 years old',
      )
    }))

  test('component with props', () =>
    context.start(async () => {
      const messageAtom = atom('Hello', 'message')

      const Greeting = reatomComponent(({ name }: { name: string }) => {
        const message = messageAtom()
        return (
          <div data-testid="greeting">
            {message}, {name}!
          </div>
        )
      })

      render(
        <reatomContext.Provider value={top()}>
          <Greeting name="Alice" />
        </reatomContext.Provider>,
        document.getElementById('root')!,
      )

      await wrap(tick())

      expect(
        document.querySelector('[data-testid="greeting"]')?.textContent,
      ).toBe('Hello, Alice!')

      messageAtom.set('Goodbye')

      await wrap(tick())

      expect(
        document.querySelector('[data-testid="greeting"]')?.textContent,
      ).toBe('Goodbye, Alice!')
    }))

  test('parent component updates child with prop changes', () =>
    context.start(async () => {
      const messageAtom = atom('Initial message', 'message')

      const Greeting = reatomComponent(({ message }: { message: string }) => {
        return <div data-testid="greeting-child">{message}</div>
      })

      const Parent = reatomComponent(() => {
        const [parentMessage, setParentMessage] = useState(
          'Message from parent',
        )
        const message = messageAtom()

        return (
          <div>
            <Greeting message={parentMessage} />
            <div data-testid="parent-message">{message}</div>
            <button
              data-testid="update-parent-message"
              onClick={() => setParentMessage('Updated message from parent')}
            >
              Update Parent Message
            </button>
          </div>
        )
      })

      render(
        <reatomContext.Provider value={top()}>
          <Parent />
        </reatomContext.Provider>,
        document.getElementById('root')!,
      )

      await wrap(tick())

      expect(
        document.querySelector('[data-testid="greeting-child"]')?.textContent,
      ).toBe('Message from parent')
      expect(
        document.querySelector('[data-testid="parent-message"]')?.textContent,
      ).toBe('Initial message')

      const updateButton = document.querySelector(
        '[data-testid="update-parent-message"]',
      ) as HTMLButtonElement
      updateButton.click()

      await wrap(tick())

      expect(
        document.querySelector('[data-testid="greeting-child"]')?.textContent,
      ).toBe('Updated message from parent')
      expect(
        document.querySelector('[data-testid="parent-message"]')?.textContent,
      ).toBe('Initial message')
    }))
})

