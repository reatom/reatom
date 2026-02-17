import {
  clearStack,
  context,
  rAF,
  reatomField,
  take,
  top,
  wrap,
} from '@reatom/core'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import { reatomContext } from './'
import { bindField } from './bindField'

clearStack()

const tick = async () => {
  await wrap(take(rAF))
  await wrap(take(rAF))
}

let rootElement: HTMLDivElement
let dispose: () => void

beforeEach(() => {
  const body = document.querySelector('body')!
  rootElement = document.createElement('div')
  rootElement.id = 'root'
  body.append(rootElement)
})

afterEach(() => {
  dispose?.()
  rootElement?.remove()
})

describe('bindField', () => {
  test('binds text input value and onChange', () =>
    context.start(async () => {
      const nameField = reatomField('', { name: 'nameField' })

      const App = () => {
        return <input data-testid="input" {...bindField(nameField).props} />
      }

      dispose = render(
        () => (
          <reatomContext.Provider value={top()}>
            <App />
          </reatomContext.Provider>
        ),
        rootElement,
      )

      await wrap(tick())

      const inputElement = document.querySelector(
        '[data-testid="input"]',
      ) as HTMLInputElement
      expect(inputElement.value).toBe('')

      inputElement.value = 'John'
      inputElement.dispatchEvent(new Event('change', { bubbles: true }))
      await wrap(tick())

      expect(nameField.value()).toBe('John')

      nameField.change('abc')
      await wrap(tick())

      expect(inputElement.value).toBe('abc')
    }))

  test('binds checkbox checked and onChange', () =>
    context.start(async () => {
      const agreedField = reatomField(false, { name: 'agreedField' })

      const App = () => {
        return (
          <input
            data-testid="checkbox"
            type="checkbox"
            {...bindField(agreedField).props}
          />
        )
      }

      dispose = render(
        () => (
          <reatomContext.Provider value={top()}>
            <App />
          </reatomContext.Provider>
        ),
        rootElement,
      )

      await wrap(tick())

      const checkboxElement = document.querySelector(
        '[data-testid="checkbox"]',
      ) as HTMLInputElement
      expect(checkboxElement.checked).toBe(false)

      checkboxElement.checked = true
      checkboxElement.dispatchEvent(new Event('change', { bubbles: true }))
      await wrap(tick())

      expect(agreedField.value()).toBe(true)
    }))

  test('tracks focus state', () =>
    context.start(async () => {
      const field = reatomField('', { name: 'focusField' })

      const App = () => {
        return <input data-testid="input" {...bindField(field).props} />
      }

      dispose = render(
        () => (
          <reatomContext.Provider value={top()}>
            <App />
          </reatomContext.Provider>
        ),
        rootElement,
      )

      await wrap(tick())

      const inputElement = document.querySelector(
        '[data-testid="input"]',
      ) as HTMLInputElement

      expect(field.focus().active).toBe(false)

      inputElement.dispatchEvent(new FocusEvent('focus', { bubbles: true }))
      await wrap(tick())
      expect(field.focus().active).toBe(true)

      inputElement.dispatchEvent(new FocusEvent('blur', { bubbles: true }))
      await wrap(tick())
      expect(field.focus().active).toBe(false)
    }))

  test('exposes validation error', () =>
    context.start(async () => {
      const field = reatomField('ab', {
        name: 'validatedField',
        validateOnChange: true,
        validate: ({ state }) => (state.length < 3 ? 'Too short' : undefined),
      })

      field.validation.trigger()

      const App = () => {
        const fieldBind = bindField(field)
        return (
          <div>
            <input data-testid="input" {...fieldBind.props} />
            <span data-testid="error">
              {fieldBind.validation().error ?? ''}
            </span>
          </div>
        )
      }

      dispose = render(
        () => (
          <reatomContext.Provider value={top()}>
            <App />
          </reatomContext.Provider>
        ),
        rootElement,
      )

      await wrap(tick())

      expect(document.querySelector('[data-testid="error"]')?.textContent).toBe(
        'Too short',
      )

      field.change('abc')
      await wrap(tick())

      expect(document.querySelector('[data-testid="error"]')?.textContent).toBe(
        '',
      )
    }))
})
