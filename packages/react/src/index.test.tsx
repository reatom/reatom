import { clearStack, context, rAF, take, wrap } from '@reatom/core'
import ReactDOM from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { isSuspense, useFrame } from './'

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

// TODO
test('throws error if no frame is available', () =>
  context.start(async () => {
    // Mock console.error to suppress React error logs
    const originalConsoleError = console.error
    console.error = vi.fn()

    let thrownError: any = undefined
    let Component = () => {
      try {
        useFrame()
      } catch (error) {
        thrownError = error
      }
      return 42
    }

    const root = ReactDOM.createRoot(document.getElementById('root')!)
    root.render(<Component />)

    await wrap(tick())

    expect(thrownError).toBeInstanceOf(Error)
    expect(thrownError.message).toContain('the root is not set')

    // Restore console.error
    console.error = originalConsoleError
  }))
