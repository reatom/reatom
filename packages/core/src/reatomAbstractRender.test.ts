import { expect, test } from 'test'

import { action, atom, notify, top } from './core'
import { reatomAbstractRender } from './reatomAbstractRender'

const collectGarbage = async () => {
  for (let i = 0; i < 10; i++) {
    globalThis.gc!()
    await new Promise(setImmediate)
  }
}

test('unmount releases the rendered result and props', async () => {
  expect(globalThis.gc).toBeTypeOf('function')

  const frame = top()
  const state = atom(0, 'state')
  const updateState = action(() => state.set(1), 'updateState')
  const retainedReferences = (() => {
    const propsValue = {}
    const resultValue = {}
    const renderer = reatomAbstractRender({
      frame: top(),
      render: ({ result }) => {
        updateState()
        return result
      },
      rerender: () => {},
      name: 'TestComponent',
      abortOnUnmount: false,
    })

    renderer.render({ result: resultValue, value: propsValue })
    notify()

    const unmount = renderer.mount()
    unmount()
    notify()

    return {
      props: new WeakRef(propsValue),
      result: new WeakRef(resultValue),
    }
  })()

  await collectGarbage()

  expect(frame.run(state)).toBe(1)
  expect(retainedReferences.props.deref()).toBeUndefined()
  expect(retainedReferences.result.deref()).toBeUndefined()
})
