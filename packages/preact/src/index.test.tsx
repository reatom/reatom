import { clearStack, context, rAF, take, top, wrap } from '@reatom/core'
import { render } from 'preact'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { isSuspense, reatomComponent, reatomContext, useFrame } from './'

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

const FrameConsumer = reatomComponent(() => {
  const frame = useFrame()
  return <div data-testid="frame">{frame ? 'Frame found' : 'No frame'}</div>
})

describe('useFrame', () => {
  test('gets frame from context if provided', () =>
    context.start(async () => {
      const frame = top()

      render(
        <reatomContext.Provider value={frame}>
          <FrameConsumer />
        </reatomContext.Provider>,
        document.getElementById('root')!,
      )

      await wrap(tick())

      expect(document.querySelector('[data-testid="frame"]')?.textContent).toBe(
        'Frame found',
      )
    }))

  test('throws error if no frame is available', () => {
    const originalConsoleError = console.error
    console.error = vi.fn()

    let thrownError: any = undefined
    try {
      render(<FrameConsumer />, document.getElementById('root')!)
    } catch (error) {
      thrownError = error
    }

    expect(thrownError).toBeInstanceOf(Error)
    expect(thrownError.message).toContain('the root is not set')

    console.error = originalConsoleError
  })
})

