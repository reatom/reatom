import { test, expect, describe, vi, beforeEach, afterEach } from 'vitest'
import ReactDOM from 'react-dom/client'
import React from 'react'
import {
  atom,
  clearStack,
  context,
  top,
  computed,
  wrap,
  rAF,
  take,
  effect,
  sleep,
  action,
} from '@reatom/core'
import {
  reatomComponent,
  reatomContext,
  reatomFactoryComponent,
  isSuspense,
  useFrame,
} from './index'

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

describe('reatomComponent', () => {
  test('renders component and updates with atom changes', () =>
    context.start(async () => {
      const countAtom = atom(0, 'count')
      const Counter = reatomComponent(() => {
        const count = countAtom()
        return <div data-testid="counter">Count: {count}</div>
      })

      const root = ReactDOM.createRoot(document.getElementById('root')!)
      root.render(
        <reatomContext.Provider value={top()}>
          <Counter />
        </reatomContext.Provider>,
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

      const root = ReactDOM.createRoot(document.getElementById('root')!)

      root.render(
        <reatomContext.Provider value={top()}>
          <Person />
        </reatomContext.Provider>,
      )

      // Wait for initial render
      await wrap(tick())

      // Check initial render
      expect(document.querySelector('[data-testid="name"]')?.textContent).toBe(
        'John',
      )
      expect(document.querySelector('[data-testid="age"]')?.textContent).toBe(
        '25',
      )
      expect(document.querySelector('[data-testid="total"]')?.textContent).toBe(
        'John, 25 years old',
      )

      // Update atoms
      nameAtom.set('Jane')
      ageAtom.set(30)

      // Wait for rerender
      await wrap(tick())

      // Check updated render
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

      const root = ReactDOM.createRoot(document.getElementById('root')!)

      root.render(
        <reatomContext.Provider value={top()}>
          <Greeting name="Alice" />
        </reatomContext.Provider>,
      )

      // Wait for initial render
      await wrap(tick())

      // Check initial render
      expect(
        document.querySelector('[data-testid="greeting"]')?.textContent,
      ).toBe('Hello, Alice!')

      // Update atom
      messageAtom.set('Goodbye')

      // Wait for rerender
      await wrap(tick())

      // Check updated render
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
        const [parentMessage, setParentMessage] = React.useState(
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

      const root = ReactDOM.createRoot(document.getElementById('root')!)

      root.render(
        <reatomContext.Provider value={top()}>
          <Parent />
        </reatomContext.Provider>,
      )

      // Wait for initial render
      await wrap(tick())

      // Check initial render
      expect(
        document.querySelector('[data-testid="greeting-child"]')?.textContent,
      ).toBe('Message from parent')
      expect(
        document.querySelector('[data-testid="parent-message"]')?.textContent,
      ).toBe('Initial message')

      // Update parent component state
      const updateButton = document.querySelector(
        '[data-testid="update-parent-message"]',
      ) as HTMLButtonElement
      updateButton.click()

      // Wait for rerender
      await wrap(tick())

      // Check updated render
      expect(
        document.querySelector('[data-testid="greeting-child"]')?.textContent,
      ).toBe('Updated message from parent')
      expect(
        document.querySelector('[data-testid="parent-message"]')?.textContent,
      ).toBe('Initial message') // Ensure atom value in parent is unchanged
    }))
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

describe('isSuspense', () => {
  test('identifies promises as suspense', () => {
    const promise = Promise.resolve()
    expect(isSuspense(promise)).toBe(true)
  })

  test('identifies suspense exceptions as suspense', () => {
    const error = new Error('Suspense Exception: test')
    expect(isSuspense(error)).toBe(true)
  })

  test('does not identify normal errors as suspense', () => {
    const error = new Error('Normal error')
    expect(isSuspense(error)).toBe(false)
  })

  test('does not identify other values as suspense', () => {
    expect(isSuspense(null)).toBe(false)
    expect(isSuspense(undefined)).toBe(false)
    expect(isSuspense(42)).toBe(false)
    expect(isSuspense('string')).toBe(false)
    expect(isSuspense({})).toBe(false)
  })
})

// Custom component to test useFrame
const FrameConsumer = reatomComponent(() => {
  const frame = useFrame()
  return <div data-testid="frame">{frame ? 'Frame found' : 'No frame'}</div>
})

describe('useFrame', () => {
  test('gets frame from context if provided', () =>
    context.start(async () => {
      const frame = top()
      const root = ReactDOM.createRoot(document.getElementById('root')!)

      root.render(
        <reatomContext.Provider value={frame}>
          <FrameConsumer />
        </reatomContext.Provider>,
      )

      // Wait for render
      await wrap(tick())

      expect(document.querySelector('[data-testid="frame"]')?.textContent).toBe(
        'Frame found',
      )
    }))

  // TODO
  test.skip('throws error if no frame is available', () => {
    // Mock console.error to suppress React error logs
    const originalConsoleError = console.error
    console.error = vi.fn()

    const root = ReactDOM.createRoot(document.getElementById('root')!)

    let thrownError: any = undefined
    try {
      root.render(<FrameConsumer />)
    } catch (error) {
      thrownError = error
    }

    expect(thrownError).toBeInstanceOf(Error)
    expect(thrownError.message).toContain('the root is not set')

    // Restore console.error
    console.error = originalConsoleError
  })
})
