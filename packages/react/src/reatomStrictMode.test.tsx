import {
  atom,
  clearStack,
  context,
  rAF,
  sleep,
  take,
  top,
  wrap,
} from '@reatom/core'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import { reatomComponent, reatomContext, reatomFactoryComponent } from './'

clearStack()

const tick = async () => {
  await wrap(take(rAF))
  await wrap(take(rAF))
}

const getRootElement = () => {
  const rootElement = document.getElementById('root')
  if (!rootElement) {
    throw new Error('root element is not found')
  }
  return rootElement
}

const getInputElement = (testId: string) => {
  const element = document.querySelector(`[data-testid="${testId}"]`)
  if (!(element instanceof HTMLInputElement)) {
    throw new Error(`input "${testId}" is not found`)
  }
  return element
}

const inputText = async (inputElement: HTMLInputElement, value: string) => {
  const valueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )?.set
  if (!valueSetter) {
    throw new Error('input value setter is not found')
  }

  await sleep()
  valueSetter.call(inputElement, value)
  inputElement.dispatchEvent(new Event('input', { bubbles: true }))
}

beforeEach(() => {
  const body = document.querySelector('body')
  if (!body) {
    throw new Error('body element is not found')
  }

  const root = document.createElement('div')
  root.id = 'root'
  body.append(root)
})

afterEach(() => {
  document.getElementById('root')?.remove()
})

describe('StrictMode input sync', () => {
  test('reatomComponent keeps input and atom in sync', () =>
    context.start(async () => {
      const textAtom = atom('hello', 'textAtom')

      const TextInput = reatomComponent(() => {
        return (
          <input
            data-testid="reatom-component-input"
            value={textAtom()}
            onChange={wrap((event: React.ChangeEvent<HTMLInputElement>) =>
              textAtom.set(event.currentTarget.value),
            )}
          />
        )
      }, 'TextInput')

      const reactRoot = ReactDOM.createRoot(getRootElement())
      reactRoot.render(
        <React.StrictMode>
          <reatomContext.Provider value={top()}>
            <TextInput />
          </reatomContext.Provider>
        </React.StrictMode>,
      )

      await wrap(tick())
      expect(getInputElement('reatom-component-input').value).toBe('hello')
      expect(textAtom()).toBe('hello')

      await wrap(
        inputText(getInputElement('reatom-component-input'), 'strict mode'),
      )
      await wrap(tick())

      expect(textAtom()).toBe('strict mode')
      expect(getInputElement('reatom-component-input').value).toBe('strict mode')

      textAtom.set('external update')
      await wrap(tick())
      expect(getInputElement('reatom-component-input').value).toBe(
        'external update',
      )

      reactRoot.unmount()
    }))

  test('reatomFactoryComponent keeps input and atom in sync', () =>
    context.start(async () => {
      const textAtom = atom('factory', 'factoryTextAtom')

      const TextInput = reatomFactoryComponent(() => {
        return () => (
          <input
            data-testid="reatom-factory-input"
            value={textAtom()}
            onChange={wrap((event: React.ChangeEvent<HTMLInputElement>) =>
              textAtom.set(event.currentTarget.value),
            )}
          />
        )
      }, 'FactoryTextInput')

      const reactRoot = ReactDOM.createRoot(getRootElement())
      reactRoot.render(
        <React.StrictMode>
          <reatomContext.Provider value={top()}>
            <TextInput />
          </reatomContext.Provider>
        </React.StrictMode>,
      )

      await wrap(tick())
      expect(getInputElement('reatom-factory-input').value).toBe('factory')
      expect(textAtom()).toBe('factory')

      await wrap(inputText(getInputElement('reatom-factory-input'), 'reatom'))
      await wrap(tick())

      expect(textAtom()).toBe('reatom')
      expect(getInputElement('reatom-factory-input').value).toBe('reatom')

      textAtom.set('factory external update')
      await wrap(tick())
      expect(getInputElement('reatom-factory-input').value).toBe(
        'factory external update',
      )

      reactRoot.unmount()
    }))
})
