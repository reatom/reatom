import { expect, test } from 'test'

import { createAdvancedTodoApp, STORAGE_KEY } from '../fixtures/advancedTodoApp'
import {
  delay,
  getElement,
  getRect,
  openLogFrame,
  page,
  resizeViewport,
  runInAppContext,
  setup,
  waitForDOM,
} from './helpers'

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
    runInAppContext(() => {
      advancedTodoApp.addTodo('Prepare release candidate')
      advancedTodoApp.addTodo('Validate analytics dashboard')
    })
    await waitForDOM(
      shadowRoot,
      (root) => root.querySelectorAll('[data-frame-id]').length >= 4,
      5000,
    )

    goOffline()
    try {
      await runInAppContext(() => advancedTodoApp.toggleTodo(0))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      expect(message).toContain('Network unavailable')
    }
    await waitForDOM(
      shadowRoot,
      (root) => root.textContent?.includes('toggleTodo.onReject') ?? false,
      5000,
    )
    await openLogFrame(shadowRoot, 'toggleTodo.onReject', '')
    await delay(80)

    const host = document.getElementById(devtools.containerId)
    expect(host).not.toBeNull()
    const headerRect = getRect(shadowRoot, '[data-reatom-name="HeaderBar"]')
    const filterBarRect = getRect(shadowRoot, '[data-reatom-name="FilterBar"]')
    const inspectorRect = getRect(shadowRoot, '[data-reatom-name="InspectorPanel"]')

    expect(headerRect.height).toBeGreaterThan(200)
    expect(filterBarRect.width).toBeGreaterThan(480)
    expect(inspectorRect.width).toBeGreaterThan(280)
    expect(shadowRoot.textContent?.includes('Captured error')).toBe(true)
    expect(shadowRoot.textContent?.includes('Network unavailable')).toBe(true)
    expect(shadowRoot.textContent?.includes('Atom timeline')).toBe(true)
    expect(
      shadowRoot.textContent?.includes('Structured payload'),
    ).toBe(true)
    const frameMeta = getElement(shadowRoot, '[data-testid="frame-detail-meta"]')
    frameMeta.replaceChildren(
      Object.assign(document.createElement('div'), {
        textContent: '3/15/2026, 5:16 PM',
      }),
      Object.assign(document.createElement('div'), {
        textContent: 'Session stable-live-debug',
      }),
    )
    await expect(
      page.elementLocator(
        getElement(shadowRoot, '[data-reatom-name="InspectorPanel"]'),
      ),
    ).toMatchScreenshot('live-debugging-rollback-investigation')
  } finally {
    goOnline()
    teardown()
  }
})
