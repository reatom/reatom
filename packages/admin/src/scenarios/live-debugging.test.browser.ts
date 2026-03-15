import { sleep, wrap } from '@reatom/core'
import { expect, test } from 'test'

import { createAdvancedTodoApp, STORAGE_KEY } from '../fixtures/advancedTodoApp'
import { getRect, openLogFrame, resizeViewport, setup, waitForDOM } from './helpers'

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

test('investigates an async rollback failure without breaking the activity workspace layout', async () => {
  await resizeViewport(1440, 1100)
  localStorage.removeItem(STORAGE_KEY)

  const { shadowRoot, devtools, teardown } = setup()
  const advancedTodoApp = createAdvancedTodoApp()

  try {
    advancedTodoApp.addTodo('Prepare release candidate')
    advancedTodoApp.addTodo('Validate analytics dashboard')
    await waitForDOM(
      shadowRoot,
      (root) => root.querySelectorAll('[data-frame-id]').length >= 4,
      5000,
    )

    goOffline()
    advancedTodoApp.toggleTodo(0)
    await waitForDOM(
      shadowRoot,
      (root) => root.textContent?.includes('toggleTodo.onReject') ?? false,
      5000,
    )
    await openLogFrame(shadowRoot, 'toggleTodo.onReject', '')
    await wrap(sleep(80))

    const host = document.getElementById(devtools.containerId)
    expect(host).not.toBeNull()
    const headerRect = getRect(shadowRoot, '[data-reatom-name="HeaderBar"]')
    const filterBarRect = getRect(shadowRoot, '[data-reatom-name="FilterBar"]')
    const inspectorRect = getRect(shadowRoot, '[data-reatom-name="InspectorPanel"]')

    expect(headerRect.height).toBeGreaterThan(200)
    expect(filterBarRect.width).toBeGreaterThan(600)
    expect(inspectorRect.width).toBeGreaterThan(280)
    expect(shadowRoot.textContent?.includes('Captured error')).toBe(true)
    expect(shadowRoot.textContent?.includes('Network unavailable')).toBe(true)
  } finally {
    goOnline()
    teardown()
  }
})
