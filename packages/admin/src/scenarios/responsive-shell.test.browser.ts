import { expect, test } from 'test'

import { createCounterApp } from '../fixtures/counterApp'
import { createTodoApp } from '../fixtures/todoApp'
import {
  delay,
  getDevtoolsSelector,
  getRect,
  page,
  resizeViewport,
  runInAppContext,
  setup,
  waitForDOM,
} from './helpers'

test('keeps the shell readable across viewport changes and visibility toggles', async () => {
  await resizeViewport(1280, 920)

  const { shadowRoot, devtools, teardown } = setup()
  const todoApp = createTodoApp()
  const counterApp = createCounterApp()

  try {
    runInAppContext(() => {
      todoApp.addTodo('Responsive layout smoke test')
      counterApp.increment()
    })
    await waitForDOM(
      shadowRoot,
      (root) => root.querySelectorAll('[data-frame-id]').length >= 3,
      5000,
    )

    const host = document.getElementById(devtools.containerId)
    expect(host).not.toBeNull()
    if (!host) {
      throw new Error('Devtools host is missing')
    }
    const wideRect = host.getBoundingClientRect()
    expect(wideRect.width).toBeGreaterThan(480)
    await expect(
      page.locator(getDevtoolsSelector(devtools.containerId)),
    ).toMatchScreenshot('responsive-shell-wide')

    await resizeViewport(960, 720)
    await delay(80)

    const headerRect = getRect(shadowRoot, '[data-reatom-name="HeaderBar"]')
    const filterBarElement = shadowRoot.querySelector(
      '[data-reatom-name="FilterBar"]',
    )
    if (!(filterBarElement instanceof HTMLElement)) {
      throw new Error('Missing filter bar')
    }

    expect(headerRect.width).toBeLessThanOrEqual(window.innerWidth)
    expect(filterBarElement.scrollWidth).toBeLessThanOrEqual(
      filterBarElement.clientWidth + 16,
    )
    await expect(
      page.locator(getDevtoolsSelector(devtools.containerId)),
    ).toMatchScreenshot('responsive-shell-narrow')

    devtools.hide()
    await delay(60)
    expect(document.getElementById(devtools.containerId)).toBeNull()

    devtools.show()
    await delay(60)
    expect(document.getElementById(devtools.containerId)).not.toBeNull()
  } finally {
    teardown()
  }
})
