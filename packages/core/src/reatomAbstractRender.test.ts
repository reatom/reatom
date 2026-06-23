import { expect, test, vi } from 'test'

import { atom, context, notify } from './core'
import { reatomAbstractRender } from './reatomAbstractRender'

test('mount subscription catches up when deps change before subscribe', () => {
  context.start(() => {
    const value = atom('pending', 'value')
    const rerender = vi.fn()

    const { render, mount } = reatomAbstractRender({
      frame: context(),
      render: () => value(),
      rerender,
      name: 'TestView',
      abortOnUnmount: false,
    })

    expect(render({}).result).toBe('pending')

    value.set('ok')

    const unmount = mount()

    expect(rerender).toHaveBeenCalledTimes(1)
    expect(render({}).result).toBe('ok')

    unmount()
  })
})

test('mount subscription rerenders on later dep changes', () => {
  context.start(() => {
    const value = atom(0, 'value')
    const rerender = vi.fn()

    const { render, mount } = reatomAbstractRender({
      frame: context(),
      render: () => value(),
      rerender,
      name: 'TestView',
      abortOnUnmount: false,
    })

    expect(render({}).result).toBe(0)

    const unmount = mount()
    rerender.mockClear()

    value.set(1)
    notify()

    expect(rerender).toHaveBeenCalledTimes(1)

    unmount()
  })
})
