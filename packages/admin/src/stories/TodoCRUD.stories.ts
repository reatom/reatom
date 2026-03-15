import { sleep, wrap } from '@reatom/core'
import type { Meta, StoryObj } from '@storybook/html'
import { expect } from 'storybook/test'

import { createTodoApp } from '../fixtures/todoApp'
import {
  clickLogItem,
  currentDevtools,
  findLogItem,
  getFrameDetail,
  getLogItems,
  getLogItemsByName,
  getNavBadgeCount,
  parseFrameDetail,
  parseLogItem,
  SETTLE_MS,
  setup,
  waitForDOM,
} from './helpers'

let todoApp: ReturnType<typeof createTodoApp>

function getDetailText(detail: { json: Record<string, unknown> } | null): string {
  if (!detail) return ''
  const raw = detail.json.raw
  return typeof raw === 'string' ? raw : JSON.stringify(detail.json)
}

const meta: Meta = {
  title: 'Admin/Todo CRUD',
}

export default meta

export const BuildAndInspectTodoList: StoryObj = {
  render: () => {
    setup()
    todoApp = createTodoApp()
    return document.createElement('div')
  },
  play: async () => {
    const shadowRoot = document.getElementById(
      currentDevtools!.containerId,
    )!.shadowRoot!

    todoApp.addTodo('Buy milk')
    await wrap(
      waitForDOM(shadowRoot, (root) => {
        const addTodoItem = findLogItem(root, 'addTodo', 'Buy milk')
        const todosItems = getLogItemsByName(root, 'todos')
        return addTodoItem !== null && todosItems.length >= 1
      }),
    )
    const addTodoBuyMilk = findLogItem(shadowRoot, 'addTodo', 'Buy milk')
    await expect(addTodoBuyMilk).not.toBeNull()
    const todosWithBuyMilk = getLogItemsByName(shadowRoot, 'todos').filter(
      (el) => parseLogItem(el).content.includes('Buy milk'),
    )
    await expect(todosWithBuyMilk.length).toBeGreaterThanOrEqual(1)
    const logItemCount = getLogItems(shadowRoot).length
    await expect(logItemCount).toBeGreaterThanOrEqual(2)
    const badgeCount = getNavBadgeCount(shadowRoot)
    await expect(badgeCount).toBeGreaterThanOrEqual(2)

    todoApp.addTodo('Walk dog')
    await wrap(
      waitForDOM(
        shadowRoot,
        (root) => findLogItem(root, 'addTodo', 'Walk dog') !== null,
      ),
    )
    const addTodoWalkDog = findLogItem(shadowRoot, 'addTodo', 'Walk dog')
    await expect(addTodoWalkDog).not.toBeNull()
    const addTodoBuyMilkForOrder = findLogItem(
      shadowRoot,
      'addTodo',
      'Buy milk',
    )
    const allItems = getLogItems(shadowRoot)
    const buyMilkIndex = addTodoBuyMilkForOrder
      ? allItems.indexOf(addTodoBuyMilkForOrder)
      : -1
    const walkDogIndex = addTodoWalkDog ? allItems.indexOf(addTodoWalkDog) : -1
    await expect(buyMilkIndex).toBeGreaterThanOrEqual(0)
    await expect(walkDogIndex).toBeGreaterThan(buyMilkIndex)
    const todosItemsAfterSecondAdd = getLogItemsByName(shadowRoot, 'todos')
    await expect(todosItemsAfterSecondAdd.length).toBeGreaterThanOrEqual(2)

    todoApp.toggleTodo(0)
    await wrap(
      waitForDOM(
        shadowRoot,
        (root) => findLogItem(root, 'toggleTodo', '[0]') !== null,
      ),
    )
    const toggleItem = findLogItem(shadowRoot, 'toggleTodo', '[0]')
    await expect(toggleItem).not.toBeNull()
    const todosItemsAfterToggle = getLogItemsByName(shadowRoot, 'todos')
    const latestTodos = todosItemsAfterToggle[todosItemsAfterToggle.length - 1]
    await expect(parseLogItem(latestTodos!).content).toContain('"done":true')

    todoApp.removeTodo(0)
    await wrap(
      waitForDOM(
        shadowRoot,
        (root) => findLogItem(root, 'removeTodo', '[0]') !== null,
      ),
    )
    const removeItem = findLogItem(shadowRoot, 'removeTodo', '[0]')
    await expect(removeItem).not.toBeNull()
    const todosItemsAfterRemove = getLogItemsByName(shadowRoot, 'todos')
    const lastTodos = todosItemsAfterRemove[todosItemsAfterRemove.length - 1]
    await expect(parseLogItem(lastTodos!).content).toContain('Walk dog')
    await expect(parseLogItem(lastTodos!).content).not.toContain('Buy milk')

    const addTodoBuyMilkItem = findLogItem(shadowRoot, 'addTodo', 'Buy milk')
    await expect(addTodoBuyMilkItem).not.toBeNull()
    clickLogItem(addTodoBuyMilkItem!)
    await wrap(sleep(SETTLE_MS))
    const frameDetailAfterClick = getFrameDetail(shadowRoot)
    await expect(frameDetailAfterClick).not.toBeNull()
    const parsed = parseFrameDetail(shadowRoot)
    await expect(parsed).not.toBeNull()
    await expect(parsed!.atomName).toContain('addTodo')
    await expect(getDetailText(parsed)).toContain('Buy milk')

    const todosLogItems = getLogItemsByName(shadowRoot, 'todos')
    await expect(todosLogItems.length).toBeGreaterThanOrEqual(1)
    clickLogItem(todosLogItems[todosLogItems.length - 1]!)
    await wrap(sleep(SETTLE_MS))
    const parsedTodosDetail = parseFrameDetail(shadowRoot)
    await expect(parsedTodosDetail).not.toBeNull()
    await expect(parsedTodosDetail!.atomName).toContain('todos')
  },
}
