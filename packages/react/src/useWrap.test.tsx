import {
  addGlobalExtension,
  atom,
  context,
  isAction,
  notify,
  top,
  withCallHook,
  withErrorHook,
  withSuspenseRetry,
  wrap,
} from '@reatom/core'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterAll, beforeAll, expect, test } from 'vitest'

import { reatomContext, useWrap } from './reatomComponent'

const previousActEnvironment = Reflect.get(
  globalThis,
  'IS_REACT_ACT_ENVIRONMENT',
)
beforeAll(() => Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }))
afterAll(() =>
  Object.assign(globalThis, {
    IS_REACT_ACT_ENVIRONMENT: previousActEnvironment,
  }),
)

const releaseReactPassiveUpdateRoot = async () => {
  const root = createRoot(document.createElement('div'))
  const Empty = () => {
    const [value, setValue] = React.useState(0)
    React.useEffect(() => setValue(1), [])
    return value
  }
  await act(async () => root.render(<Empty />))
  await act(async () => root.unmount())
}

const collectGarbage = async () => {
  await releaseReactPassiveUpdateRoot()
  expect(globalThis.gc).toBeTypeOf('function')
  for (let i = 0; i < 20; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0))
    globalThis.gc!()
  }
}

const createRetainedState = () => ({
  frame: context.start(() => top()),
  state: atom(0, 'useWrapRetentionState'),
})

const createDetachedView = async ({
  wrapped,
  invoked,
  write,
  invocation,
}: {
  wrapped: boolean
  invoked: boolean
  write: boolean
  invocation: 'click' | 'effect'
}) => {
  const { frame, state } = createRetainedState()
  const references: Array<WeakRef<object>> = []
  const View = ({ token, fire }: { token: object; fire: boolean }) => {
    const [, setLocal] = React.useState<object>(() => ({}))
    const callback = () => {
      setLocal(token)
      if (!write) return
      if (wrapped) state.set(1)
      else frame.run(() => state.set(1))
    }
    const onClick = wrapped ? useWrap(callback, 'useWrapRetention') : callback
    React.useEffect(() => {
      if (fire) onClick()
    }, [fire])
    return <button onClick={onClick}>invoke</button>
  }
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const render = async (fire: boolean) => {
    const token = {}
    references.push(new WeakRef(token))
    await act(async () =>
      root.render(
        <reatomContext.Provider value={frame}>
          <View token={token} fire={fire} />
        </reatomContext.Provider>,
      ),
    )
  }
  await render(false)
  await render(invoked && invocation === 'effect')
  if (invoked && invocation === 'click')
    await act(async () => container.querySelector('button')!.click())
  await act(async () => root.unmount())
  container.remove()
  frame.run(notify)
  return { frame, state, references }
}

const cases = [
  { name: 'plain React writes', wrapped: false, invoked: true, write: true },
  { name: 'useWrap not invoked', wrapped: true, invoked: false, write: true },
  {
    name: 'useWrap invoked without write',
    wrapped: true,
    invoked: true,
    write: false,
  },
  {
    name: 'useWrap invoked with long-lived write',
    wrapped: true,
    invoked: true,
    write: true,
  },
]

for (const invocation of ['click', 'effect'] as const)
  test.each(cases)(
    `releases both initial and latest callback capture (${invocation}): $name`,
    async (options) => {
      const { frame, state, references } = await createDetachedView({
        ...options,
        invocation,
      })
      await collectGarbage()
      expect(frame.run(state)).toBe(Number(options.invoked && options.write))
      expect(references).toHaveLength(2)
      expect
        .soft(references[0].deref(), 'initial callback capture')
        .toBeUndefined()
      expect
        .soft(references[1].deref(), 'latest callback capture')
        .toBeUndefined()
    },
  )

const createView = () => {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  return {
    container,
    async render(element: React.ReactNode) {
      await act(async () => root.render(element))
    },
    async unmount() {
      await act(async () => root.unmount())
      container.remove()
    },
  }
}

const callWithCollectibleValues = (callback: (argument: object) => object) => {
  const argument = {}
  const result = callback(argument)
  return { argument: new WeakRef(argument), result: new WeakRef(result) }
}

for (const nested of [false, true]) {
  test(`releases call arguments and results while the handle is live (nested=${nested})`, async () => {
    const { frame, state } = createRetainedState()
    let handler: (argument: object) => object
    const Component = () => {
      const inner = useWrap(() => state.set(1), 'inner')
      handler = useWrap((_argument: object) => {
        if (nested) inner()
        else state.set(1)
        return {}
      }, 'outer')
      return null
    }
    const view = createView()
    try {
      await view.render(
        <reatomContext.Provider value={frame}>
          <Component />
        </reatomContext.Provider>,
      )
      const references = callWithCollectibleValues(handler!)
      frame.run(notify)
      await collectGarbage()
      expect(handler!).toBeTypeOf('function')
      expect(frame.run(state)).toBe(1)
      expect.soft(references.argument.deref(), 'argument').toBeUndefined()
      expect.soft(references.result.deref(), 'result').toBeUndefined()
    } finally {
      await view.unmount()
    }
  })
}

test('keeps its identity and uses the latest callback for return and throw values', async () => {
  const { frame } = createRetainedState()
  let handler: (throwValue: boolean) => object
  const Component = ({ value }: { value: object }) => {
    handler = useWrap((throwValue: boolean) => {
      if (throwValue) throw value
      return value
    })
    return null
  }
  const view = createView()
  const first = {}
  const latest = {}
  try {
    await view.render(
      <reatomContext.Provider value={frame}>
        <Component value={first} />
      </reatomContext.Provider>,
    )
    const stable = handler!
    expect(stable(false)).toBe(first)
    await view.render(
      <reatomContext.Provider value={frame}>
        <Component value={latest} />
      </reatomContext.Provider>,
    )
    expect(handler!).toBe(stable)
    expect(stable(false)).toBe(latest)
    let caught: unknown
    try {
      stable(true)
    } catch (error) {
      caught = error
    }
    expect(caught).toBe(latest)
  } finally {
    await view.unmount()
  }
})

test('preserves async context after a wrapped await', async () => {
  const { frame, state } = createRetainedState()
  let handler: (value: number) => Promise<number>
  const Component = () => {
    handler = useWrap(async (value: number) => {
      await wrap(Promise.resolve())
      state.set(value)
      return state()
    })
    return null
  }
  const view = createView()
  try {
    await view.render(
      <reatomContext.Provider value={frame}>
        <Component />
      </reatomContext.Provider>,
    )
    await expect(handler!(5)).resolves.toBe(5)
    expect(frame.run(state)).toBe(5)
  } finally {
    await view.unmount()
  }
})

for (const lifecycle of ['StrictMode', 'Activity'] as const) {
  test(`preserves identity, latest callback and React state through ${lifecycle}`, async () => {
    const { frame } = createRetainedState()
    let handler: () => string
    const Component = ({ label }: { label: string }) => {
      const [count, setCount] = React.useState(0)
      handler = useWrap(() => {
        setCount((value) => value + 1)
        return label
      })
      return (
        <div>
          {label}:{count}
        </div>
      )
    }
    const view = createView()
    const render = (label: string, mode: 'visible' | 'hidden' = 'visible') => {
      const element = (
        <reatomContext.Provider value={frame}>
          <Component label={label} />
        </reatomContext.Provider>
      )
      return view.render(
        lifecycle === 'StrictMode' ? (
          <React.StrictMode>{element}</React.StrictMode>
        ) : (
          <React.Activity mode={mode}>{element}</React.Activity>
        ),
      )
    }
    try {
      await render('first')
      const stable = handler!
      await act(async () => {
        expect(stable()).toBe('first')
      })
      expect(view.container.textContent).toBe('first:1')
      await render('latest')
      expect(handler!).toBe(stable)
      if (lifecycle === 'Activity') {
        await render('latest', 'hidden')
        await collectGarbage()
        await render('latest')
      }
      expect(handler!).toBe(stable)
      await act(async () => {
        expect(stable()).toBe('latest')
      })
      expect(view.container.textContent).toBe('latest:2')
    } finally {
      await view.unmount()
    }
  })
}

test('flushes subscriptions in its provider context before returning', async () => {
  const { frame, state } = createRetainedState()
  const callerFrame = context.start(() => top())
  const seen: Array<number> = []
  const unsubscribe = frame.run(() =>
    state.subscribe((value) => seen.push(value)),
  )
  frame.run(notify)
  let handler: (value: number) => number
  const Component = () => {
    handler = useWrap((value: number) => state.set(value))
    return null
  }
  const view = createView()
  try {
    await view.render(
      <reatomContext.Provider value={frame}>
        <Component />
      </reatomContext.Provider>,
    )
    seen.length = 0
    expect(callerFrame.run(() => handler!(7))).toBe(7)
    expect(seen).toEqual([7])
    expect(frame.run(state)).toBe(7)
    expect(callerFrame.run(state)).toBe(0)
  } finally {
    frame.run(unsubscribe)
    await view.unmount()
  }
})

const callAndReleaseError = (callback: () => void) => {
  try {
    callback()
  } catch (error) {
    if (error instanceof Error) return new WeakRef(error)
    throw error
  }
  throw new Error('Expected the callback to throw')
}

const createThrowingDetachedView = async () => {
  const { frame, state } = createRetainedState()
  const references: Array<WeakRef<object>> = []
  let handler: () => void
  const Component = ({ token }: { token: object }) => {
    const [, setLocal] = React.useState<object>(() => ({}))
    React.useLayoutEffect(() => {
      references.push(new WeakRef(token))
    }, [token])
    handler = useWrap(() => {
      state.set(1)
      setLocal(token)
      throw new Error('callback failed')
    })
    return null
  }
  const view = createView()
  await view.render(
    <reatomContext.Provider value={frame}>
      <Component token={{}} />
    </reatomContext.Provider>,
  )
  let errorReference: WeakRef<Error>
  await act(async () => {
    errorReference = callAndReleaseError(handler!)
  })
  await view.unmount()
  frame.run(notify)
  return { frame, state, references, errorReference: errorReference! }
}

test('releases a thrown error and its callback capture after unmount', async () => {
  const { frame, state, references, errorReference } =
    await createThrowingDetachedView()
  await collectGarbage()
  expect(frame.run(state)).toBe(1)
  expect(references).toHaveLength(1)
  expect.soft(references[0].deref(), 'callback capture').toBeUndefined()
  expect.soft(errorReference.deref(), 'thrown error').toBeUndefined()
})

test('preserves action call and error hooks with original arguments', async () => {
  const { frame } = createRetainedState()
  const calls: Array<{ payload: unknown; params: unknown[] }> = []
  const errors: Array<{ error: unknown; params: unknown[] }> = []
  let instrument = true
  addGlobalExtension((target) => {
    if (instrument && isAction(target)) {
      target.extend(
        withCallHook((payload, params) => calls.push({ payload, params })),
        withErrorHook((error, params) => errors.push({ error, params })),
      )
    }
    return target
  })
  const payload = {}
  const failure = new Error('observable failure')
  let handler: (argument: object, fail: boolean) => object
  const Component = () => {
    handler = useWrap((_argument: object, fail: boolean) => {
      if (fail) throw failure
      return payload
    })
    return null
  }
  const view = createView()
  try {
    await view.render(
      <reatomContext.Provider value={frame}>
        <Component />
      </reatomContext.Provider>,
    )
    instrument = false
    const argument = {}
    expect(handler!(argument, false)).toBe(payload)
    expect(calls).toEqual([{ payload, params: [argument, false] }])
    expect(errors).toEqual([])
    expect(() => handler!(argument, true)).toThrow(failure)
    expect(calls).toHaveLength(1)
    expect(errors).toEqual([{ error: failure, params: [argument, true] }])
  } finally {
    instrument = false
    await view.unmount()
  }
})

test('preserves suspended retries in global action middleware', async () => {
  const { frame, state } = createRetainedState()
  let instrument = true
  addGlobalExtension((target) => {
    if (instrument && isAction(target)) target.extend(withSuspenseRetry())
    return target
  })
  let resume: () => void
  const pending = new Promise<void>((resolve) => (resume = resolve))
  let ready = false
  let attempts = 0
  let handler: (value: number) => Promise<number>
  const Component = () => {
    handler = useWrap(async (value: number) => {
      attempts++
      if (!ready) throw pending
      state.set(value)
      return value
    })
    return null
  }
  const view = createView()
  try {
    await view.render(
      <reatomContext.Provider value={frame}>
        <Component />
      </reatomContext.Provider>,
    )
    instrument = false
    const result = handler!(42)
    await view.unmount()
    ready = true
    resume!()
    expect(await result).toBe(42)
    expect(attempts).toBe(2)
    expect(frame.run(state)).toBe(42)
  } finally {
    instrument = false
  }
})
