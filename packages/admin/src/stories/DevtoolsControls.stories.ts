import { sleep, wrap } from '@reatom/core'
import type { Meta, StoryObj } from '@storybook/html'
import { expect } from 'storybook/test'

import { createCounterApp } from '../fixtures/counterApp'
import { createTodoApp } from '../fixtures/todoApp'
import {
  ADMIN_FRAME,
  currentDevtools,
  getLogItems,
  parseLogItem,
  SETTLE_MS,
  setup,
  typeInSearch,
  waitForDOM,
} from './helpers'
import { createControlWorkbenchScene } from './sceneHelpers'

let todoApp: ReturnType<typeof createTodoApp>
let counterApp: ReturnType<typeof createCounterApp>

const meta: Meta = {
  title: 'Admin/Devtools Controls',
}

export default meta

export const PauseResumeAndSearch: StoryObj = {
  render: () => {
    setup()
    todoApp = createTodoApp()
    counterApp = createCounterApp()
    return createControlWorkbenchScene(
      todoApp,
      counterApp,
      'Devtools controls fixture',
      'Interact with a compact todo and counter surface while testing pause, resume, and search behavior in the admin panel.',
    )
  },
  play: async () => {
    const shadowRoot = document.getElementById(
      currentDevtools!.containerId,
    )!.shadowRoot!
    const admin = currentDevtools!.admin

    todoApp.addTodo('alpha')
    todoApp.addTodo('beta')
    counterApp.increment()
    counterApp.increment()
    await wrap(waitForDOM(shadowRoot, (root) => getLogItems(root).length >= 4))
    const totalBefore = getLogItems(shadowRoot).length
    await expect(totalBefore).toBeGreaterThanOrEqual(4)

    ADMIN_FRAME.run(() => admin.reporter.paused.setTrue())

    todoApp.addTodo('during-pause')
    await wrap(sleep(SETTLE_MS))
    const countWhilePaused = getLogItems(shadowRoot).length
    await expect(countWhilePaused).toBe(totalBefore)
    const logTextWhilePaused = getLogItems(shadowRoot)
      .map((el) => parseLogItem(el).content)
      .join('\n')
    await expect(logTextWhilePaused).not.toContain('during-pause')

    ADMIN_FRAME.run(() => admin.reporter.paused.setFalse())

    todoApp.addTodo('after-resume')
    await wrap(
      waitForDOM(shadowRoot, (root) => {
        const items = getLogItems(root)
        return items.some((el) =>
          parseLogItem(el).content.includes('after-resume'),
        )
      }),
    )
    const countAfterResume = getLogItems(shadowRoot).length
    await expect(countAfterResume).toBeGreaterThan(countWhilePaused)
    const logTextAfterResume = getLogItems(shadowRoot)
      .map((el) => parseLogItem(el).content)
      .join('\n')
    await expect(logTextAfterResume).toContain('after-resume')
    await expect(logTextAfterResume).not.toContain('during-pause')

    const totalBeforeSearch = getLogItems(shadowRoot).length
    typeInSearch(shadowRoot, 'increment')
    await wrap(sleep(SETTLE_MS))
    const filteredItems = getLogItems(shadowRoot)
    await expect(filteredItems.length).toBeLessThan(totalBeforeSearch)
    await expect(filteredItems.length).toBeGreaterThanOrEqual(1)
    const filteredNames = filteredItems.map((el) => parseLogItem(el).name)
    const hasIncrementOrCount = filteredNames.some(
      (n) => n.includes('increment') || n.includes('count'),
    )
    await expect(hasIncrementOrCount).toBe(true)
    const hasAddTodo = filteredNames.some((n) => n.includes('addTodo'))
    await expect(hasAddTodo).toBe(false)

    typeInSearch(shadowRoot, '')
    await wrap(sleep(SETTLE_MS))
    const restoredCount = getLogItems(shadowRoot).length
    await expect(restoredCount).toBe(totalBeforeSearch)
  },
}
