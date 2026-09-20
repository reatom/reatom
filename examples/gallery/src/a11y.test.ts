import { expect, test, vi } from 'vitest'

import { keyboardActivate } from './a11y'

const keydown = (
  key: string,
  target: object,
  currentTarget: object,
): KeyboardEvent =>
  ({
    key,
    target,
    currentTarget,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  }) as unknown as KeyboardEvent

test('keyboardActivate ignores Enter and Space from descendants', () => {
  const action = vi.fn()
  const parent = {}
  const child = {}
  const handlers = keyboardActivate(action)

  handlers['on:keydown'](keydown(' ', child, parent))
  handlers['on:keydown'](keydown('Enter', child, parent))

  expect(action).not.toHaveBeenCalled()
})

test('keyboardActivate runs only for the bound element', () => {
  const action = vi.fn()
  const element = {}
  const handlers = keyboardActivate(action)
  const event = keydown(' ', element, element)

  handlers['on:keydown'](event)

  expect(event.preventDefault).toHaveBeenCalledTimes(1)
  expect(event.stopPropagation).toHaveBeenCalledTimes(1)
  expect(action).toHaveBeenCalledTimes(1)
})
