import { expect, test, vi } from 'test'

import { action, atom, notify, ReatomError, top } from './core'
import { variable, wrap } from './methods'
import { reatomAbstractRender } from './reatomAbstractRender'

const collectGarbage = async () => {
  expect(globalThis.gc).toBeTypeOf('function')

  for (let i = 0; i < 10; i++) {
    globalThis.gc!()
    await new Promise(setImmediate)
  }
}

const capture = (value: { calls: number }) => () => {
  value.calls++
}

test('abandoned failed render releases its callback capture', async () => {
  const frame = top()
  const state = atom(0, 'state')
  const updateState = action(() => state.set(1), 'updateState')
  const reference = (() => {
    const value = { calls: 0 }
    const renderer = reatomAbstractRender({
      frame,
      render: () => {
        value.calls++
        updateState()
        throw new Error('render failed')
      },
      rerender: () => {},
      name: 'FailedRenderer',
      abortOnUnmount: false,
    })
    let caught = false
    try {
      renderer.render({})
    } catch {
      caught = true
    }
    expect(caught).toBe(true)
    notify()
    return new WeakRef(value)
  })()

  await collectGarbage()

  expect(frame.run(state)).toBe(1)
  expect(reference.deref()).toBeUndefined()
})

test('render rethrows the original exception and can retry', () => {
  const failure = new Error('render failed')
  const state = atom(0, 'state')
  const rerender = vi.fn()
  let fail = true
  const renderer = reatomAbstractRender({
    frame: top(),
    render: ({ label }: { label: string }) => {
      if (fail) throw failure
      return { label, count: state() }
    },
    rerender,
    name: 'RetriedRenderer',
    abortOnUnmount: false,
  })
  let caught = false
  try {
    renderer.render({ label: 'initial' })
  } catch (error) {
    caught = true
    expect(error).toBe(failure)
  }
  expect(caught).toBe(true)
  fail = false
  const result = renderer.render({ label: 'retry' }).result
  expect(result).toEqual({ label: 'retry', count: 0 })
  const unmount = renderer.mount()
  notify()
  rerender.mockClear()
  state.set(1)
  notify()

  expect(rerender).toHaveBeenCalledTimes(1)
  expect(rerender.mock.calls[0]![0].result).toBe(result)
  expect(renderer.render({ label: 'retry' }).result).toEqual({
    label: 'retry',
    count: 1,
  })
  unmount()
  notify()
})

test.each([null, undefined])('render normalizes a thrown %s', (failure) => {
  const renderer = reatomAbstractRender({
    frame: top(),
    render: () => {
      throw failure
    },
    rerender: () => {},
    name: 'NullishErrorRenderer',
    abortOnUnmount: false,
  })
  expect.assertions(2)
  try {
    renderer.render({})
  } catch (error) {
    expect(error).toBeInstanceOf(ReatomError)
    expect(error).toMatchObject({ message: 'Unknown error' })
  }
})

test.each([
  { lifecycle: 'unmounted', abortOnUnmount: false },
  { lifecycle: 'unmounted', abortOnUnmount: true },
  { lifecycle: 'abandoned', abortOnUnmount: false },
])(
  '$lifecycle renderer releases props, result and callbacks (abortOnUnmount=$abortOnUnmount)',
  async ({ lifecycle, abortOnUnmount }) => {
    const frame = top()
    const state = atom(0, 'state')
    const updateState = action(() => state.set(1), 'updateState')
    const references = (() => {
      const propsValue = {}
      const resultValue = {}
      const renderCapture = { calls: 0 }
      const rerenderCapture = { calls: 0 }
      const renderer = reatomAbstractRender({
        frame,
        render: (_props: { value: object }) => {
          renderCapture.calls++
          updateState()
          return resultValue
        },
        rerender: capture(rerenderCapture),
        name: 'CollectibleRenderer',
        abortOnUnmount,
      })

      renderer.render({ value: propsValue })
      notify()
      if (lifecycle === 'unmounted') {
        renderer.mount()()
        notify()
      }

      return {
        props: new WeakRef(propsValue),
        result: new WeakRef(resultValue),
        renderCapture: new WeakRef(renderCapture),
        rerenderCapture: new WeakRef(rerenderCapture),
      }
    })()

    await collectGarbage()

    expect(frame.run(state)).toBe(1)
    expect.soft(references.props.deref()).toBeUndefined()
    expect.soft(references.result.deref()).toBeUndefined()
    expect.soft(references.renderCapture.deref()).toBeUndefined()
    expect.soft(references.rerenderCapture.deref()).toBeUndefined()
  },
)

test.each([false, true])(
  'retained renderer remains usable after garbage collection (mounted=%s)',
  async (mounted) => {
    const frame = top()
    const state = atom(0, 'state')
    const rerender = vi.fn()
    const { renderer, resultRef } = (() => {
      const propsValue = { label: 'initial' }
      const renderer = reatomAbstractRender({
        frame,
        render: ({ value }: { value: { label: string } }) => ({
          label: value.label,
          count: state(),
        }),
        rerender,
        name: 'RetainedRenderer',
        abortOnUnmount: false,
      })
      const result = renderer.render({ value: propsValue }).result
      return {
        renderer,
        resultRef: new WeakRef(result),
      }
    })()
    const unmount = mounted ? renderer.mount() : undefined
    notify()
    rerender.mockClear()

    await collectGarbage()

    expect(resultRef.deref()).toEqual({ label: 'initial', count: 0 })
    const unsubscribe = unmount ?? renderer.mount()
    frame.run(() => {
      state.set(1)
      notify()
    })
    expect(rerender).toHaveBeenCalledTimes(1)
    expect(rerender.mock.calls[0]![0].result).toBe(resultRef.deref())
    expect(renderer.render({ value: { label: 'updated' } }).result).toEqual({
      label: 'updated',
      count: 1,
    })
    unsubscribe()
    frame.run(notify)
  },
)

test.each([
  { delayed: false, abortOnUnmount: false },
  { delayed: false, abortOnUnmount: true },
  { delayed: true, abortOnUnmount: false },
  { delayed: true, abortOnUnmount: true },
])(
  'remount preserves result and reactivity (delayed=$delayed, abortOnUnmount=$abortOnUnmount)',
  ({ delayed, abortOnUnmount }) => {
    const state = atom(0, 'state')
    const rerender = vi.fn()
    const renderer = reatomAbstractRender({
      frame: top(),
      render: ({ label }: { label: string }) => ({ label, count: state() }),
      rerender,
      name: 'RemountedRenderer',
      abortOnUnmount,
    })
    const first = renderer.render({ label: 'initial' }).result
    const unmount = renderer.mount()
    notify()
    unmount()
    if (delayed) notify()
    const unmountAgain = renderer.mount()
    notify()
    rerender.mockClear()

    state.set(1)
    notify()

    expect(rerender).toHaveBeenCalledTimes(1)
    expect(rerender.mock.calls[0]![0].result).toBe(first)
    expect(renderer.render({ label: 'updated' }).result).toEqual({
      label: 'updated',
      count: 1,
    })
    unmountAgain()
    notify()
  },
)

test('fresh render after unmount uses new props and dependencies', () => {
  const state = atom(0, 'state')
  const rerender = vi.fn()
  const renderer = reatomAbstractRender({
    frame: top(),
    render: ({ label }: { label: string }) => ({ label, count: state() }),
    rerender,
    name: 'FreshRenderer',
    abortOnUnmount: false,
  })
  renderer.render({ label: 'initial' })
  const unmount = renderer.mount()
  notify()
  unmount()
  notify()
  state.set(1)
  notify()

  const fresh = renderer.render({ label: 'fresh' }).result
  expect(fresh).toEqual({ label: 'fresh', count: 1 })
  const unmountAgain = renderer.mount()
  notify()
  rerender.mockClear()
  state.set(2)
  notify()

  expect(rerender).toHaveBeenCalledTimes(1)
  expect(rerender.mock.calls[0]![0].result).toBe(fresh)
  expect(renderer.render({ label: 'fresh' }).result).toEqual({
    label: 'fresh',
    count: 2,
  })
  unmountAgain()
  notify()
})

test('render causal context survives an asynchronous action', async () => {
  const trace = variable<string>('trace')
  const state = atom(0, 'state')
  const update = action(async () => {
    state.set(1)
    await wrap(Promise.resolve())
    return trace.get()
  }, 'update')
  const renderer = reatomAbstractRender({
    frame: top(),
    render: ({ label }: { label: string }) => {
      trace.set(label)
      return update()
    },
    rerender: () => {},
    name: 'AsyncContext',
    abortOnUnmount: false,
  })
  const result = renderer.render({ label: 'render-trace' }).result
  const unmount = renderer.mount()
  notify()
  unmount()
  notify()

  expect(await wrap(result)).toBe('render-trace')
  expect(state()).toBe(1)
  expect(trace.get()).toBeUndefined()
})
