import { action, atom, context, notify, top } from '@reatom/core'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterAll, beforeAll, expect, test } from 'vitest'

import { reatomComponent, reatomContext } from './reatomComponent'

const previousActEnvironment = Reflect.get(
  globalThis,
  'IS_REACT_ACT_ENVIRONMENT',
)

beforeAll(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
})

afterAll(() => {
  Object.assign(globalThis, {
    IS_REACT_ACT_ENVIRONMENT: previousActEnvironment,
  })
})

const collectGarbage = async () => {
  expect(globalThis.gc).toBeTypeOf('function')
  for (let i = 0; i < 20; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0))
    globalThis.gc!()
  }
}

const cases = [
  { name: 'plain React', reactive: false, write: false },
  { name: 'Reatom without a write', reactive: true, write: false },
  { name: 'Reatom with a render-time write', reactive: true, write: true },
]

const createRetainedState = () => {
  const frame = context.start(() => top())
  const state = atom(0, 'retentionState')
  const updateState = action(() => state.set(1), 'retentionUpdate')
  return { frame, state, updateState }
}

const createUnmountedComponent = async ({
  reactive,
  write,
  strict,
}: {
  reactive: boolean
  write: boolean
  strict: boolean
}) => {
  const { frame, state, updateState } = createRetainedState()
  const references: Array<{
    props: WeakRef<object>
    state: WeakRef<object>
    dom: WeakRef<HTMLDivElement>
  }> = []
  const Plain = ({ value }: { value: object }) => {
    const [local] = React.useState(() => ({}))
    const dom = React.useRef<HTMLDivElement>(null)
    React.useLayoutEffect(() => {
      references.push({
        props: new WeakRef(value),
        state: new WeakRef(local),
        dom: new WeakRef(dom.current!),
      })
    }, [])
    if (write) updateState()
    return <div ref={dom}>retention test</div>
  }
  const Component = reactive ? reatomComponent(Plain) : Plain
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const app = (
    <reatomContext.Provider value={frame}>
      <Component value={{}} />
    </reatomContext.Provider>
  )
  await act(async () => {
    root.render(strict ? <React.StrictMode>{app}</React.StrictMode> : app)
  })
  await act(async () => root.unmount())
  container.remove()
  frame.run(notify)
  return { references, frame, state }
}

for (const strict of [false, true]) {
  test.each(cases)(
    `unmount releases props, state and DOM: $name (StrictMode=${strict})`,
    async ({ reactive, write }) => {
      const { references, frame, state } = await createUnmountedComponent({
        reactive,
        write,
        strict,
      })
      await collectGarbage()
      expect(frame.run(state)).toBe(Number(write))
      expect(references.length).toBeGreaterThan(0)
      for (const reference of references) {
        expect.soft(reference.props.deref(), 'props').toBeUndefined()
        expect.soft(reference.state.deref(), 'React state').toBeUndefined()
        expect.soft(reference.dom.deref(), 'DOM').toBeUndefined()
      }
    },
  )
}

const createAbandonedComponent = async ({
  reactive,
  write,
}: {
  reactive: boolean
  write: boolean
}) => {
  const { frame, state, updateState } = createRetainedState()
  const references: Array<{ props: WeakRef<object>; state: WeakRef<object> }> =
    []
  const pending = new Promise<never>(() => {})
  const Plain = ({ value }: { value: object }) => {
    const [local] = React.useState(() => ({}))
    references.push({ props: new WeakRef(value), state: new WeakRef(local) })
    if (write) updateState()
    throw pending
  }
  const Component = reactive ? reatomComponent(Plain) : Plain
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(
      <reatomContext.Provider value={frame}>
        <React.Suspense fallback={<div>pending</div>}>
          <Component value={{}} />
        </React.Suspense>
      </reatomContext.Provider>,
    )
  })
  expect(container.textContent).toBe('pending')
  await act(async () => root.unmount())
  container.remove()
  frame.run(notify)
  return { references, frame, state }
}

test.each(cases)(
  'abandoned Suspense releases props and state: $name',
  async ({ reactive, write }) => {
    const { references, frame, state } = await createAbandonedComponent({
      reactive,
      write,
    })
    await collectGarbage()
    expect(frame.run(state)).toBe(Number(write))
    expect(references.length).toBeGreaterThan(0)
    for (const reference of references) {
      expect.soft(reference.props.deref(), 'props').toBeUndefined()
      expect.soft(reference.state.deref(), 'React state').toBeUndefined()
    }
  },
)

test('Activity preserves state and reactivity after hiding and collecting garbage', async () => {
  const frame = context.start(() => top())
  const count = atom(0, 'activityCount')
  const Component = reatomComponent(() => {
    const [local, setLocal] = React.useState(0)
    return (
      <button onClick={() => setLocal(local + 1)}>
        {local}:{count()}
      </button>
    )
  })
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const render = async (mode: 'visible' | 'hidden') => {
    await act(async () => {
      root.render(
        <reatomContext.Provider value={frame}>
          <React.Activity mode={mode}>
            <Component />
          </React.Activity>
        </reatomContext.Provider>,
      )
    })
  }
  try {
    await render('visible')
    await act(async () => container.querySelector('button')!.click())
    expect(container.textContent).toBe('1:0')
    await render('hidden')
    await collectGarbage()
    await act(async () => frame.run(() => count.set(1)))
    await render('visible')
    expect(container.textContent).toBe('1:1')
    await act(async () => frame.run(() => count.set(2)))
    expect(container.textContent).toBe('1:2')
  } finally {
    await act(async () => root.unmount())
    container.remove()
  }
})
