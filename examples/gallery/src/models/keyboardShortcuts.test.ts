import { clearStack, context } from '@reatom/core'
import { expect, test, vi } from 'vitest'

vi.hoisted(() => {
  if (typeof globalThis.HTMLElement === 'undefined') {
    Object.defineProperty(globalThis, 'HTMLElement', {
      configurable: true,
      value: class HTMLElement {},
    })
  }
})

import { keyboardActivate } from '../a11y'
import { handleKeyboardShortcut } from './keyboardShortcuts'
import { lightboxOpen } from './lightboxState'
import { slideshowPlaying } from './slideshow'

test.beforeEach(() => clearStack())

test('Space after a handled row activation does not start the slideshow', () =>
  context.start(() => {
    lightboxOpen.setFalse()
    slideshowPlaying.setFalse()

    const row = {}
    const event = {
      key: ' ',
      target: row,
      currentTarget: row,
      defaultPrevented: false,
      preventDefault() {
        this.defaultPrevented = true
      },
      stopPropagation: vi.fn(),
    }

    keyboardActivate(() => lightboxOpen.setTrue())['on:keydown'](
      event as unknown as KeyboardEvent,
    )
    handleKeyboardShortcut(event as unknown as KeyboardEvent)

    expect(event.stopPropagation).toHaveBeenCalledTimes(1)
    expect(lightboxOpen()).toBe(true)
    expect(slideshowPlaying()).toBe(false)
  }))

test('document Space shortcut honors defaultPrevented', () =>
  context.start(() => {
    lightboxOpen.setTrue()
    slideshowPlaying.setFalse()

    handleKeyboardShortcut({
      key: ' ',
      defaultPrevented: true,
      target: {},
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent)

    expect(slideshowPlaying()).toBe(false)
  }))
