import { test, expect, describe, vi, beforeEach, afterEach } from 'vitest'
import ReactDOM from 'react-dom/client'
import {
  clearStack,
  context,
  top,
  wrap,
  rAF,
  take,
} from '@reatom/core'
import {
  reatomComponent,
  reatomContext,
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
