import { sleep, wrap } from '@reatom/core'
import type { Meta, StoryObj } from '@storybook/html'
import { expect } from 'storybook/test'

import { createTodoApp } from '../fixtures/todoApp'
import {
  ADMIN_FRAME,
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

const meta: Meta = {
  title: 'Admin/Replay Analysis',
}

export default meta

export const ExportImportAndContinueInvestigation: StoryObj = {
  render: () => {
    setup()
    todoApp = createTodoApp()
    return document.createElement('div')
  },
  play: async () => {
    const shadowRoot = document.getElementById(
      currentDevtools!.containerId,
    )!.shadowRoot!
    const admin = currentDevtools!.admin

    todoApp.addTodo('Capture replay state')
    todoApp.addTodo('Review replay graph')
    todoApp.toggleTodo(0)

    await waitForDOM(
      shadowRoot,
      (root) => getLogItemsByName(root, 'todos').length >= 2,
      5000,
    )

    const exported = ADMIN_FRAME.run(() => admin.store.exportSession())
    const exportedFrameCount = exported.frames.length
    await expect(exportedFrameCount).toBeGreaterThan(0)

    ADMIN_FRAME.run(() => {
      admin.reporter.clear()
      admin.store.clear()
      admin.store.importSession(exported)
    })
    await wrap(sleep(SETTLE_MS * 2))

    await expect(ADMIN_FRAME.run(() => admin.store.source())).toBe('replay')
    await expect(shadowRoot.textContent).toContain('Replay analysis')

    const replayTodosItems = getLogItemsByName(shadowRoot, 'todos')
    await expect(replayTodosItems.length).toBeGreaterThanOrEqual(1)
    const replayTodosItem = replayTodosItems.find((item) =>
      parseLogItem(item).content.includes('Capture replay state'),
    )
    await expect(replayTodosItem).toBeDefined()

    clickLogItem(replayTodosItem!)
    await wrap(sleep(SETTLE_MS))

    const parsedDetail = parseFrameDetail(shadowRoot)
    await expect(parsedDetail).not.toBeNull()
    await expect(parsedDetail!.atomName).toContain('todos')
    await expect(JSON.stringify(parsedDetail!.json)).toContain(
      'Capture replay state',
    )

    const graphButton = Array.from(shadowRoot.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Open in cause graph'),
    )
    await expect(graphButton).toBeDefined()
    graphButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await wrap(sleep(SETTLE_MS))

    await expect(shadowRoot.textContent).toContain('Causal graph')
    await expect(shadowRoot.textContent).toContain('Graph nodes')
  },
}
