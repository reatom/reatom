import { atom, clearStack, context, wrap } from '@reatom/core'
import { expect, test, vi } from 'vitest'

import type { ImageModel } from './contracts'
import {
  LOUPE_IMAGE_BOX,
  LOUPE_MARGIN,
  LOUPE_SHOW_DELAY_MS,
  hideLoupe,
  bindLoupeDismiss,
  loupeImage,
  loupeOpen,
  loupePosition,
  resolveLoupeImageBox,
  resolveLoupePlacement,
  showLoupe,
} from './loupe'

test.beforeEach(() => clearStack())
test.afterEach(() => vi.unstubAllGlobals())

const LOUPE_WIDTH = 264
const LOUPE_HEIGHT = 336
const loupeSize = { width: LOUPE_WIDTH, height: LOUPE_HEIGHT }
const viewport = { width: 1200, height: 800 }

const fakeCard = {
  getBoundingClientRect: () => ({
    top: 100,
    left: 100,
    width: 48,
    height: 48,
  }),
} as unknown as HTMLElement

const fakeImage = (id: string) =>
  ({ id, width: atom(1600), height: atom(900) }) as unknown as ImageModel

test('fits the loupe image box to the photo aspect ratio', () => {
  expect(resolveLoupeImageBox(1600, 900, LOUPE_IMAGE_BOX)).toEqual({
    width: 240,
    height: 135,
  })
  expect(resolveLoupeImageBox(900, 1600, LOUPE_IMAGE_BOX)).toEqual({
    width: 135,
    height: 240,
  })
  expect(resolveLoupeImageBox(0, 0, LOUPE_IMAGE_BOX)).toEqual({
    width: 240,
    height: 240,
  })
})

test('places above the card when there is room', () => {
  const position = resolveLoupePlacement(
    { top: 500, left: 200, width: 48, height: 48 },
    loupeSize,
    viewport,
    LOUPE_MARGIN,
  )

  expect(position.placement).toBe('above')
  expect(position.top).toBe(500 - LOUPE_HEIGHT - LOUPE_MARGIN)
  expect(position.left).toBe(200 + 24 - LOUPE_WIDTH / 2)
})

test('falls below the card when there is no room above', () => {
  const position = resolveLoupePlacement(
    { top: 100, left: 100, width: 48, height: 48 },
    loupeSize,
    viewport,
    LOUPE_MARGIN,
  )

  expect(position.placement).toBe('below')
  expect(position.top).toBe(100 + 48 + LOUPE_MARGIN)
})

test('clamps horizontally and vertically to the viewport', () => {
  const position = resolveLoupePlacement(
    { top: 300, left: 1180, width: 40, height: 40 },
    loupeSize,
    { width: 1200, height: 400 },
    LOUPE_MARGIN,
  )

  expect(position.placement).toBe('below')
  expect(position.left).toBe(1200 - LOUPE_WIDTH - LOUPE_MARGIN)
  expect(position.top).toBe(400 - LOUPE_HEIGHT - LOUPE_MARGIN)
})

test('hover opens after the show delay', async () => {
  vi.useFakeTimers()
  try {
    await context.start(async () => {
      showLoupe(fakeImage('a'), fakeCard)
      expect(loupeOpen()).toBe(false)

      await wrap(vi.advanceTimersByTimeAsync(LOUPE_SHOW_DELAY_MS - 1))
      expect(loupeOpen()).toBe(false)

      await wrap(vi.advanceTimersByTimeAsync(1))
      expect(loupeOpen()).toBe(true)
      expect(loupeImage()?.image.id).toBe('a')
      expect(loupePosition()?.placement).toBe('below')
    })
  } finally {
    vi.useRealTimers()
  }
})

test('entering another card switches immediately while open', async () => {
  vi.useFakeTimers()
  try {
    await context.start(async () => {
      showLoupe(fakeImage('a'), fakeCard)
      await wrap(vi.advanceTimersByTimeAsync(LOUPE_SHOW_DELAY_MS))

      showLoupe(fakeImage('b'), fakeCard)
      expect(loupeImage()?.image.id).toBe('b')
    })
  } finally {
    vi.useRealTimers()
  }
})

test('leaving hides after the hide delay', async () => {
  vi.useFakeTimers()
  try {
    await context.start(async () => {
      showLoupe(fakeImage('a'), fakeCard, { immediate: true })
      expect(loupeOpen()).toBe(true)

      hideLoupe()
      await wrap(vi.advanceTimersByTimeAsync(99))
      expect(loupeOpen()).toBe(true)

      await wrap(vi.advanceTimersByTimeAsync(1))
      expect(loupeOpen()).toBe(false)

      await wrap(vi.advanceTimersByTimeAsync(120))
      expect(loupeImage()).toBeNull()
      expect(loupePosition()).toBeNull()
    })
  } finally {
    vi.useRealTimers()
  }
})

test('a pending hide is cancelled by entering another card', async () => {
  vi.useFakeTimers()
  try {
    await context.start(async () => {
      showLoupe(fakeImage('a'), fakeCard, { immediate: true })

      hideLoupe()
      showLoupe(fakeImage('b'), fakeCard)
      expect(loupeOpen()).toBe(true)
      expect(loupeImage()?.image.id).toBe('b')

      await wrap(vi.advanceTimersByTimeAsync(500))
      expect(loupeOpen()).toBe(true)
      expect(loupeImage()?.image.id).toBe('b')
    })
  } finally {
    vi.useRealTimers()
  }
})

test('leaving before the show delay cancels the pending show', async () => {
  vi.useFakeTimers()
  try {
    await context.start(async () => {
      const show = showLoupe(fakeImage('a'), fakeCard).catch(() => null)
      hideLoupe()
      await wrap(vi.advanceTimersByTimeAsync(500))
      await wrap(show)
      expect(loupeOpen()).toBe(false)
      expect(loupeImage()).toBeNull()
    })
  } finally {
    vi.useRealTimers()
  }
})

test('binding teardown cancels delayed show and clears the loupe', async () => {
  vi.stubGlobal('document', new EventTarget())
  vi.useFakeTimers()
  try {
    await context.start(async () => {
      const stop = bindLoupeDismiss()
      const show = showLoupe(fakeImage('a'), fakeCard).catch(() => null)
      stop()
      await wrap(vi.advanceTimersByTimeAsync(500))
      await wrap(show)
      expect(loupeOpen()).toBe(false)
      expect(loupeImage()).toBeNull()
      expect(loupePosition()).toBeNull()
    })
  } finally {
    vi.useRealTimers()
  }
})
