import { sleep, wrap } from '@reatom/core'
import type { Meta, StoryObj } from '@storybook/html'
import { expect } from 'storybook/test'

import { createCounterApp } from '../fixtures/counterApp'
import { createTodoApp } from '../fixtures/todoApp'
import { currentDevtools, setup } from './helpers'
import { createControlWorkbenchScene } from './sceneHelpers'

let todoApp: ReturnType<typeof createTodoApp>
let counterApp: ReturnType<typeof createCounterApp>

const meta: Meta = {
  title: 'Admin/Responsive Shell',
}

export default meta

export const KeepsWorkspaceReadableWhenViewportTightens: StoryObj = {
  render: () => {
    setup()
    todoApp = createTodoApp()
    counterApp = createCounterApp()

    todoApp.addTodo('Responsive story validation')
    counterApp.increment()
    counterApp.increment()

    return createControlWorkbenchScene(
      todoApp,
      counterApp,
      'Responsive shell fixture',
      'A small visible application stays on the canvas so the devtools overlay can be judged in context while the viewport tightens.',
    )
  },
  play: async () => {
    const devtools = currentDevtools
    if (!devtools) {
      throw new Error('Current devtools instance is missing')
    }

    const container = document.getElementById(devtools.containerId)
    if (!container?.shadowRoot) {
      throw new Error('Responsive shell container is missing')
    }
    const shadowRoot = container.shadowRoot

    await wrap(sleep(120))

    const header = shadowRoot.querySelector(
      '[data-reatom-name="HeaderBar"]',
    )
    const filterBar = shadowRoot.querySelector(
      '[data-reatom-name="FilterBar"]',
    )

    await expect(header).not.toBeNull()
    await expect(filterBar).not.toBeNull()
    if (!(filterBar instanceof HTMLElement)) {
      throw new Error('Filter bar is not an HTMLElement')
    }

    const originalWidth = window.innerWidth
    const originalHeight = window.innerHeight

    window.dispatchEvent(new Event('resize'))
    await wrap(sleep(80))

    await expect(filterBar.clientWidth).toBeGreaterThan(0)
    await expect(filterBar.scrollWidth).toBeLessThanOrEqual(
      filterBar.clientWidth + 16,
    )

    devtools.hide()
    await wrap(sleep(80))
    await expect(document.getElementById(devtools.containerId)).toBeNull()

    devtools.show()
    await wrap(sleep(80))

    const restoredContainer = document.getElementById(devtools.containerId)
    await expect(restoredContainer).not.toBeNull()
    await expect(window.innerWidth).toBe(originalWidth)
    await expect(window.innerHeight).toBe(originalHeight)
  },
}
