import { expect, test } from 'test'

import { createCounterApp } from '../fixtures/counterApp'
import { createTodoApp } from '../fixtures/todoApp'
import {
  delay,
  getElement,
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
    const wideSearchInput = shadowRoot.querySelector(
      '[data-testid="filter-search-input"]',
    )
    if (!(wideSearchInput instanceof HTMLInputElement)) {
      throw new Error('Missing filter search input')
    }
    expect(wideSearchInput.getBoundingClientRect().width).toBeGreaterThan(240)
    await expect(
      page.elementLocator(
        getElement(shadowRoot, '[data-reatom-name="FilterBar"]'),
      ),
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
    const narrowSearchInput = shadowRoot.querySelector(
      '[data-testid="filter-search-input"]',
    )
    if (!(narrowSearchInput instanceof HTMLInputElement)) {
      throw new Error('Missing filter search input')
    }

    expect(headerRect.width).toBeLessThanOrEqual(window.innerWidth)
    expect(narrowSearchInput.getBoundingClientRect().width).toBeGreaterThan(180)
    expect(filterBarElement.scrollWidth).toBeLessThanOrEqual(
      filterBarElement.clientWidth + 8,
    )
    expect(filterBarElement.textContent?.includes('result(s)')).toBe(true)
    await expect(
      page.elementLocator(filterBarElement),
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
