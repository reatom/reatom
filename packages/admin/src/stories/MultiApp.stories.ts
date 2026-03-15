import { sleep, wrap } from '@reatom/core'
import type { Meta, StoryObj } from '@storybook/html'
import { expect } from 'storybook/test'

import { createCounterApp } from '../fixtures/counterApp'
import { createTodoApp } from '../fixtures/todoApp'
import { createWeatherApp } from '../fixtures/weatherApp'
import {
  assertLogOrder,
  clickLogItem,
  currentDevtools,
  getLogItemsByName,
  parseFrameDetail,
  parseLogItem,
  SETTLE_MS,
  setup,
  waitForDOM,
} from './helpers'

let todoApp: ReturnType<typeof createTodoApp>
let counterApp: ReturnType<typeof createCounterApp>
let weatherApp: ReturnType<typeof createWeatherApp>

const meta: Meta = {
  title: 'Admin/Multi App',
}

export default meta

export const ThreeAppsDistinctlyCaptured: StoryObj = {
  render: () => {
    setup()
    todoApp = createTodoApp()
    counterApp = createCounterApp()
    weatherApp = createWeatherApp()
    weatherApp.weather.subscribe(() => {})
    return document.createElement('div')
  },
  play: async () => {
    const shadowRoot = document.getElementById(
      currentDevtools!.containerId,
    )!.shadowRoot!

    todoApp.addTodo('Ship')
    counterApp.increment()
    counterApp.increment()
    weatherApp.setCity('NYC')
    await wrap(
      waitForDOM(shadowRoot, (root) => {
        const items = root.querySelectorAll('[data-reatom-name="LogItem"]')
        const text = Array.from(items)
          .map((el) => el.textContent ?? '')
          .join('\n')
        return (
          text.includes('addTodo') &&
          text.includes('todos') &&
          text.includes('increment') &&
          text.includes('count') &&
          text.includes('weather.city')
        )
      }),
    )

    const logText = Array.from(
      shadowRoot.querySelectorAll('[data-reatom-name="LogItem"]'),
    )
      .map((el) => el.textContent ?? '')
      .join('\n')
    await expect(logText).toContain('addTodo')
    await expect(logText).toContain('todos')
    await expect(logText).toContain('increment')
    await expect(logText).toContain('count')
    await expect(logText).toContain('weather.city')
    assertLogOrder(shadowRoot, ['addTodo', 'increment', 'weather.city'])

    const todosWithShip = getLogItemsByName(shadowRoot, 'todos').find((el) =>
      parseLogItem(el).content.includes('Ship'),
    )
    await expect(todosWithShip).toBeDefined()
    clickLogItem(todosWithShip!)
    await wrap(sleep(SETTLE_MS))
    const parsed = parseFrameDetail(shadowRoot)
    await expect(parsed).not.toBeNull()
    await expect(parsed!.atomName).toContain('todos')
    await expect(parsed!.kind).toBe('atom')
    await expect(JSON.stringify(parsed!.json.state)).toContain('Ship')
    await expect(parsed!.json.params).toBeUndefined()
    await expect(parsed!.causeChainNames.length).toBeGreaterThanOrEqual(0)
  },
}
