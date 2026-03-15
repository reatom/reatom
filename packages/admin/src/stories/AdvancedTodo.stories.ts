import { sleep, wrap } from '@reatom/core'
import type { Meta, StoryObj } from '@storybook/html'
import { expect } from 'storybook/test'

import { createAdvancedTodoApp, STORAGE_KEY } from '../fixtures/advancedTodoApp'
import {
  assertLogOrder,
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
  typeInSearch,
  waitForDOM,
  waitForLogItem,
} from './helpers'

let advancedTodoApp: ReturnType<typeof createAdvancedTodoApp>

function getDetailText(detail: { json: Record<string, unknown> } | null): string {
  if (!detail) return ''
  const raw = detail.json.raw
  return typeof raw === 'string' ? raw : JSON.stringify(detail.json)
}

function goOffline(): void {
  Object.defineProperty(navigator, 'onLine', {
    value: false,
    configurable: true,
  })
}

function goOnline(): void {
  Object.defineProperty(navigator, 'onLine', {
    value: true,
    configurable: true,
  })
}

const meta: Meta = {
  title: 'Admin/Advanced Todo',
}

export default meta

export const FullFlowWithPersistenceAndRollback: StoryObj = {
  render: () => {
    localStorage.removeItem(STORAGE_KEY)
    setup()
    advancedTodoApp = createAdvancedTodoApp()
    return document.createElement('div')
  },
  play: async () => {
    const shadowRoot = document.getElementById(
      currentDevtools!.containerId,
    )!.shadowRoot!
    const { addTodo, toggleTodo, removeTodo, clearCompleted } = advancedTodoApp

    addTodo('Buy groceries')
    await wrap(
      waitForDOM(shadowRoot, (root) => {
        const addTodoItem = findLogItem(root, 'addTodo', 'Buy groceries')
        const todosItems = getLogItemsByName(root, 'todos')
        return addTodoItem !== null && todosItems.length >= 1
      }),
    )
    const addTodoBuyGroceries = findLogItem(
      shadowRoot,
      'addTodo',
      'Buy groceries',
    )
    await expect(addTodoBuyGroceries).not.toBeNull()
    const todosWithBuyGroceries = getLogItemsByName(shadowRoot, 'todos').filter(
      (el) => parseLogItem(el).content.includes('Buy groceries'),
    )
    await expect(todosWithBuyGroceries.length).toBeGreaterThanOrEqual(1)

    addTodo('Walk the dog')
    await wrap(
      waitForDOM(
        shadowRoot,
        (root) => findLogItem(root, 'addTodo', 'Walk the dog') !== null,
      ),
    )
    const addTodoWalkDog = findLogItem(shadowRoot, 'addTodo', 'Walk the dog')
    const addTodoBuyGroceriesForOrder = findLogItem(
      shadowRoot,
      'addTodo',
      'Buy groceries',
    )
    const allItemsAfterTwo = getLogItems(shadowRoot)
    const buyGroceriesIdx = addTodoBuyGroceriesForOrder
      ? allItemsAfterTwo.indexOf(addTodoBuyGroceriesForOrder)
      : -1
    const walkDogIdx = addTodoWalkDog
      ? allItemsAfterTwo.indexOf(addTodoWalkDog)
      : -1
    await expect(buyGroceriesIdx).toBeGreaterThanOrEqual(0)
    await expect(walkDogIdx).toBeGreaterThan(buyGroceriesIdx)

    addTodo('Read a book')
    await wrap(
      waitForDOM(
        shadowRoot,
        (root) => findLogItem(root, 'addTodo', 'Read a book') !== null,
      ),
    )
    const addTodoItems = getLogItemsByName(shadowRoot, 'addTodo')
    await expect(addTodoItems.length).toBeGreaterThanOrEqual(3)

    const logItemCount = getLogItems(shadowRoot).length
    await expect(logItemCount).toBeGreaterThanOrEqual(3)
    const badgeCount = getNavBadgeCount(shadowRoot)
    await expect(badgeCount).toBeGreaterThanOrEqual(3)

    const addTodoBuyGroceriesForClick = findLogItem(
      shadowRoot,
      'addTodo',
      'Buy groceries',
    )
    await expect(addTodoBuyGroceriesForClick).not.toBeNull()
    clickLogItem(addTodoBuyGroceriesForClick!)
    await wrap(sleep(SETTLE_MS))
    const frameDetailAfterAddTodo = getFrameDetail(shadowRoot)
    await expect(frameDetailAfterAddTodo).not.toBeNull()
    const parsedAddTodo = parseFrameDetail(shadowRoot)
    await expect(parsedAddTodo).not.toBeNull()
    await expect(parsedAddTodo!.atomName).toContain('addTodo')
    await expect(getDetailText(parsedAddTodo)).toContain('Buy groceries')

    const todosLogItems = getLogItemsByName(shadowRoot, 'todos')
    await expect(todosLogItems.length).toBeGreaterThanOrEqual(1)
    clickLogItem(todosLogItems[todosLogItems.length - 1]!)
    await wrap(sleep(SETTLE_MS))
    const parsedTodosDetail = parseFrameDetail(shadowRoot)
    await expect(parsedTodosDetail).not.toBeNull()
    await expect(parsedTodosDetail!.atomName).toContain('todos')
    await expect(
      parsedTodosDetail!.causeChainNames.length,
    ).toBeGreaterThanOrEqual(0)

    toggleTodo(0)
    await wrap(
      waitForLogItem(shadowRoot, 'toggleTodo.onFulfill', undefined, 5000),
    )
    const todosAfterFirstToggle = getLogItemsByName(shadowRoot, 'todos')
    await expect(todosAfterFirstToggle.length).toBeGreaterThanOrEqual(1)
    const latestTodosAfterFirstToggle =
      todosAfterFirstToggle[todosAfterFirstToggle.length - 1]!
    await expect(parseLogItem(latestTodosAfterFirstToggle).content).toContain(
      '"done":true',
    )

    const toggleTodoFirst = findLogItem(shadowRoot, 'toggleTodo', '[0]')
    await expect(toggleTodoFirst).not.toBeNull()
    clickLogItem(toggleTodoFirst!)
    await wrap(sleep(SETTLE_MS))
    const parsedToggleDetail = parseFrameDetail(shadowRoot)
    await expect(parsedToggleDetail).not.toBeNull()
    await expect(
      parsedToggleDetail!.causeChainNames.length,
    ).toBeGreaterThanOrEqual(0)

    const onFulfillCountBeforeSecond = getLogItemsByName(
      shadowRoot,
      'toggleTodo.onFulfill',
    ).length
    toggleTodo(1)
    await wrap(
      waitForDOM(
        shadowRoot,
        (root) =>
          getLogItemsByName(root, 'toggleTodo.onFulfill').length >
          onFulfillCountBeforeSecond,
        5000,
      ),
    )
    const todosAfterSecondToggle = getLogItemsByName(shadowRoot, 'todos')
    await expect(todosAfterSecondToggle.length).toBeGreaterThanOrEqual(1)
    clickLogItem(todosAfterSecondToggle[todosAfterSecondToggle.length - 1]!)
    await wrap(sleep(SETTLE_MS))
    const secondToggleDetail = parseFrameDetail(shadowRoot)
    await expect(secondToggleDetail).not.toBeNull()
    const secondToggleState = getDetailText(secondToggleDetail)
    const doneCount = (secondToggleState.match(/"done":true/g) ?? []).length
    await expect(doneCount).toBeGreaterThanOrEqual(2)
    await expect(secondToggleState).toContain('Read a book')
    await expect(secondToggleState).toContain('"done":false')

    goOffline()

    toggleTodo(2)
    await wrap(waitForLogItem(shadowRoot, 'toggleTodo.onReject', '', 5000))
    const onRejectItems = getLogItemsByName(shadowRoot, 'toggleTodo.onReject')
    await expect(onRejectItems.length).toBeGreaterThanOrEqual(1)
    const onRejectItem = onRejectItems[0]!

    clickLogItem(onRejectItem)
    await wrap(sleep(SETTLE_MS))
    const parsedRejectDetail = parseFrameDetail(shadowRoot)
    await expect(parsedRejectDetail).not.toBeNull()
    await expect(
      parsedRejectDetail!.hasError ||
        getDetailText(parsedRejectDetail).includes('Network unavailable'),
    ).toBe(true)

    goOnline()

    const onFulfillCountBeforeRecovery = getLogItemsByName(
      shadowRoot,
      'toggleTodo.onFulfill',
    ).length
    toggleTodo(2)
    await wrap(
      waitForDOM(
        shadowRoot,
        (root) =>
          getLogItemsByName(root, 'toggleTodo.onFulfill').length >
          onFulfillCountBeforeRecovery,
        5000,
      ),
    )
    const todosAfterRecovery = getLogItemsByName(shadowRoot, 'todos')
    await expect(todosAfterRecovery.length).toBeGreaterThanOrEqual(1)
    clickLogItem(todosAfterRecovery[todosAfterRecovery.length - 1]!)
    await wrap(sleep(SETTLE_MS))
    const recoveryDetail = parseFrameDetail(shadowRoot)
    await expect(recoveryDetail).not.toBeNull()
    const recoveryState = getDetailText(recoveryDetail)
    const doneCountAfterRecovery = (recoveryState.match(/"done":true/g) ?? [])
      .length
    await expect(doneCountAfterRecovery).toBe(3)

    removeTodo(0)
    await wrap(
      waitForDOM(
        shadowRoot,
        (root) => findLogItem(root, 'removeTodo', '[0]') !== null,
      ),
    )
    const removeItem = findLogItem(shadowRoot, 'removeTodo', '[0]')
    await expect(removeItem).not.toBeNull()
    const todosAfterRemove = getLogItemsByName(shadowRoot, 'todos')
    await expect(todosAfterRemove.length).toBeGreaterThanOrEqual(1)
    clickLogItem(todosAfterRemove[todosAfterRemove.length - 1]!)
    await wrap(sleep(SETTLE_MS))
    const removeDetail = parseFrameDetail(shadowRoot)
    await expect(removeDetail).not.toBeNull()
    await expect(getDetailText(removeDetail)).not.toContain('Buy groceries')

    addTodo('Write tests')
    await wrap(
      waitForDOM(
        shadowRoot,
        (root) => findLogItem(root, 'addTodo', 'Write tests') !== null,
      ),
    )
    const addTodoWriteTests = findLogItem(shadowRoot, 'addTodo', 'Write tests')
    await expect(addTodoWriteTests).not.toBeNull()

    clearCompleted()
    await wrap(
      waitForDOM(
        shadowRoot,
        (root) => getLogItemsByName(root, 'clearCompleted').length >= 1,
      ),
    )
    const clearCompletedItems = getLogItemsByName(shadowRoot, 'clearCompleted')
    await expect(clearCompletedItems.length).toBeGreaterThanOrEqual(1)
    const todosAfterClear = getLogItemsByName(shadowRoot, 'todos')
    await expect(todosAfterClear.length).toBeGreaterThanOrEqual(1)
    clickLogItem(todosAfterClear[todosAfterClear.length - 1]!)
    await wrap(sleep(SETTLE_MS))
    const clearDetail = parseFrameDetail(shadowRoot)
    await expect(clearDetail).not.toBeNull()
    const clearState = getDetailText(clearDetail)
    await expect(clearState).toContain('Write tests')
    await expect(clearState).not.toContain('Walk the dog')

    const totalBeforeSearch = getLogItems(shadowRoot).length
    typeInSearch(shadowRoot, 'toggleTodo')
    await wrap(sleep(SETTLE_MS))
    const filteredItems = getLogItems(shadowRoot)
    await expect(filteredItems.length).toBeLessThan(totalBeforeSearch)
    const filteredNames = filteredItems.map((el) => parseLogItem(el).name)
    const allContainToggleTodo = filteredNames.every((n) =>
      n.includes('toggleTodo'),
    )
    await expect(allContainToggleTodo).toBe(true)

    typeInSearch(shadowRoot, '')
    await wrap(sleep(SETTLE_MS))
    const restoredCount = getLogItems(shadowRoot).length
    await expect(restoredCount).toBe(totalBeforeSearch)

    assertLogOrder(shadowRoot, [
      'addTodo',
      'addTodo',
      'addTodo',
      'toggleTodo',
      'toggleTodo.onFulfill',
      'toggleTodo',
      'toggleTodo.onFulfill',
      'toggleTodo',
      'toggleTodo.onReject',
      'toggleTodo',
      'toggleTodo.onFulfill',
      'removeTodo',
      'addTodo',
      'clearCompleted',
    ])

    const storedRaw = localStorage.getItem(STORAGE_KEY)
    await expect(storedRaw).not.toBeNull()
    const persistRecord = JSON.parse(storedRaw!) as { data: unknown }
    await expect(persistRecord.data).toBeDefined()
    const storedTodos = persistRecord.data as Array<{ text: string }>
    await expect(storedTodos.length).toBe(1)
    await expect(storedTodos[0]!.text).toBe('Write tests')

    goOnline()
  },
}
