import { expect, test } from 'test'

import type { Atom, AtomLike } from '../core'
import { atom, notify } from '../core'
import { effect, take, wrap } from '../methods'
import { rAF } from '../web/rAF'
import { reatomVirtual } from './reatomVirtual'

const ROW = 20

const nextFrames = async (count = 2) => {
  for (let index = 0; index < count; index++) await wrap(take(rAF))
}

const mountList = (
  count: number,
  rowHeight: number | AtomLike<number, []> = ROW,
  following?: Atom<boolean>,
) => {
  const rows = atom(
    Array.from({ length: count }, (_, id) => ({ id })),
    'browserRows',
  )
  const virtual = reatomVirtual(
    rows,
    { itemSize: rowHeight, overscan: 2, stickToEnd: following },
    'browserVirtual',
  )

  const scroller = document.createElement('div')
  scroller.style.cssText = 'height: 100px; overflow-y: auto;'
  const before = document.createElement('div')
  const content = document.createElement('div')
  content.style.position = 'sticky'
  const after = document.createElement('div')
  scroller.append(before, content, after)
  document.body.append(scroller)

  const render = effect(() => {
    const { before: beforeSize, after: afterSize } = virtual.padding()
    const inset = `${virtual.stickyInset()}px`
    const height = typeof rowHeight === 'number' ? rowHeight : rowHeight()
    before.style.height = `${beforeSize}px`
    after.style.height = `${afterSize}px`
    content.style.top = inset
    content.style.bottom = inset
    content.replaceChildren(
      ...virtual.items().map(({ id }) => {
        const row = document.createElement('div')
        // Keep glyph overflow from changing the fixed-size virtual geometry.
        row.style.cssText = `height: ${height}px; line-height: ${height}px; overflow: hidden;`
        row.textContent = String(id)
        return row
      }),
    )
  }, 'browserRender')

  const unbind = virtual.bindScroller(scroller)

  const dispose = () => {
    unbind()
    render.unsubscribe()
    scroller.remove()
  }

  return { rows, virtual, scroller, content, dispose }
}

test('bindScroller feeds the viewport and the scroll position', async () => {
  const { virtual, scroller, dispose } = mountList(1000)
  expect(virtual.viewportSize()).toBe(100)
  expect(scroller.style.overflowAnchor).toBe('none')
  expect(scroller.scrollHeight).toBe(1000 * ROW)

  scroller.scrollTop = 4000
  await wrap(nextFrames())
  expect(virtual.scrollOffset()).toBe(4000)
  expect(virtual().offset).toBe(198)
  expect(virtual.items().length).toBe(9)

  dispose()
  expect(scroller.style.overflowAnchor).toBe('')
})

test('programmatic scrolls move the scroller', async () => {
  const { virtual, scroller, content, dispose } = mountList(1000)
  virtual.scrollToIndex(500)
  await wrap(nextFrames())
  expect(scroller.scrollTop).toBe(500 * ROW)
  const firstVisible = content.children[2]!
  expect(firstVisible.textContent).toBe('500')
  expect(
    firstVisible.getBoundingClientRect().top -
      scroller.getBoundingClientRect().top,
  ).toBe(0)
  dispose()
})

test('stickToEnd follows appends until the user scrolls up', async () => {
  const { rows, virtual, scroller, dispose } = mountList(100)
  virtual.stickToEnd.set(true)
  await wrap(nextFrames())
  expect(scroller.scrollTop).toBe(100 * ROW - 100)

  rows.set([...rows(), { id: 100 }, { id: 101 }])
  await wrap(nextFrames())
  expect(scroller.scrollTop).toBe(102 * ROW - 100)
  expect(virtual.stickToEnd()).toBe(true)

  scroller.scrollTop = 200
  await wrap(nextFrames())
  expect(virtual.stickToEnd()).toBe(false)
  expect(virtual.scrollOffset()).toBe(200)
  dispose()
})

test.each([26, 36])(
  '%ipx rows resume following after a native return to the bottom',
  async (height) => {
    const { rows, virtual, scroller, dispose } = mountList(
      100,
      height,
      atom(false),
    )
    try {
      virtual.stickToEnd.set(true)
      await wrap(nextFrames())
      scroller.scrollTop = 500
      await wrap(nextFrames())
      expect(virtual.stickToEnd()).toBe(false)
      expect(virtual.scrollOffset()).toBe(500)
      scroller.scrollTop = scroller.scrollHeight - scroller.clientHeight
      await wrap(nextFrames())
      expect(virtual.stickToEnd()).toBe(true)
      rows.set([...rows(), { id: 100 }])
      await wrap(nextFrames())
      expect(virtual.stickToEnd()).toBe(true)
      expect(scroller.scrollTop).toBe(101 * height - 100)
    } finally {
      dispose()
    }
  },
)

test('programmatic navigation to the tail does not enable following', async () => {
  const { rows, virtual, scroller, dispose } = mountList(100, 26, atom(false))
  try {
    virtual.scrollToIndex(99)
    await wrap(nextFrames())
    expect(scroller.scrollTop).toBe(2500)
    expect(virtual.stickToEnd()).toBe(false)
    rows.set([...rows(), { id: 100 }])
    await wrap(nextFrames())
    expect(scroller.scrollTop).toBe(2500)
    expect(virtual.stickToEnd()).toBe(false)
  } finally {
    dispose()
  }
})

test('default lists do not start following after native bottom scrolling', async () => {
  const { rows, virtual, scroller, dispose } = mountList(100, 26)
  try {
    scroller.scrollTop = 2500
    await wrap(nextFrames())
    expect(virtual.scrollOffset()).toBe(2500)
    expect(virtual.stickToEnd()).toBe(false)
    rows.set([...rows(), { id: 100 }])
    await wrap(nextFrames())
    expect(scroller.scrollTop).toBe(2500)
    expect(virtual.stickToEnd()).toBe(false)
  } finally {
    dispose()
  }
})

test('an append before acknowledgement of our scroll preserves stickToEnd', async () => {
  const { rows, virtual, scroller, dispose } = mountList(100)
  let appended = false
  const appendBeforeAcknowledgement = wrap(() => {
    appended = true
    expect(scroller.scrollTop).toBe(1900)
    rows.set([...rows(), { id: 100 }])
    // Deliver the new geometry before bindScroller sees the native scroll
    // event from its preceding animation-frame write to scrollTop.
    notify()
    expect(scroller.scrollHeight).toBe(2020)
  })
  scroller.addEventListener('scroll', appendBeforeAcknowledgement, {
    capture: true,
    once: true,
  })

  try {
    virtual.stickToEnd.set(true)
    await wrap(nextFrames(4))
    expect(appended).toBe(true)
    expect(virtual.stickToEnd()).toBe(true)
    expect(virtual.scrollOffset()).toBe(1920)
    expect(scroller.scrollTop).toBe(1920)
  } finally {
    scroller.removeEventListener('scroll', appendBeforeAcknowledgement, true)
    dispose()
  }
})

test('a reactive uniform size realigns the rendered tail and follows later appends', async () => {
  const rowHeight = atom(26, 'browserRowHeight')
  const { rows, virtual, scroller, content, dispose } = mountList(
    100,
    rowHeight,
  )
  try {
    virtual.stickToEnd.set(true)
    await wrap(nextFrames())
    expect(scroller.scrollHeight).toBe(2600)
    expect(scroller.scrollTop).toBe(2500)
    rowHeight.set(36)
    await wrap(nextFrames())
    expect(virtual.totalSize()).toBe(3600)
    expect(scroller.scrollHeight).toBe(3600)
    expect(scroller.scrollTop).toBe(3500)
    expect((content.firstElementChild as HTMLElement).style.height).toBe('36px')
    expect(virtual.stickToEnd()).toBe(true)
    rows.set([...rows(), { id: 100 }])
    await wrap(nextFrames())
    expect(scroller.scrollHeight).toBe(3636)
    expect(scroller.scrollTop).toBe(3536)
    expect(virtual.stickToEnd()).toBe(true)
  } finally {
    dispose()
  }
})

test.each([26, 36])(
  '%ipx rows cover the viewport during native jumps in both directions',
  async (height) => {
    const { virtual, scroller, content, dispose } = mountList(1000, height)
    try {
      await wrap(nextFrames())
      for (const position of [
        1000 * height - 100,
        10000,
        0,
        500 * height + 7,
      ]) {
        const previousOffset = virtual.scrollOffset()
        const previousFirstRow = content.firstElementChild
        scroller.scrollTop = position

        // The browser moves immediately, before scroll events update the
        // virtual window. Existing rows must still cover both viewport edges.
        expect(virtual.scrollOffset()).toBe(previousOffset)
        expect(content.firstElementChild).toBe(previousFirstRow)
        const contentRect = content.getBoundingClientRect()
        const scrollerRect = scroller.getBoundingClientRect()
        expect(contentRect.top).toBeLessThanOrEqual(scrollerRect.top)
        expect(contentRect.bottom).toBeGreaterThanOrEqual(scrollerRect.bottom)

        await wrap(nextFrames())
        expect(virtual.scrollOffset()).toBe(position)
        const firstVisibleIndex = Math.floor(position / height)
        expect(
          content.children[firstVisibleIndex - virtual().offset]!.textContent,
        ).toBe(String(firstVisibleIndex))
        expect(content.children.length).toBeLessThan(20)
      }
    } finally {
      dispose()
    }
  },
)
