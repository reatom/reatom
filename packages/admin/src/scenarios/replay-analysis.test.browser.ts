import { sleep, wrap } from '@reatom/core'
import { expect, test } from 'test'

import { createTodoApp } from '../fixtures/todoApp'
import { ADMIN_FRAME } from '../root'
import { getRect, navigate, openLogFrame, resizeViewport, setup, waitForDOM } from './helpers'

test('switches into replay analysis and keeps graph exploration usable', async () => {
  await resizeViewport(1360, 1000)

  const { shadowRoot, admin, teardown } = setup()
  const todoApp = createTodoApp()

  try {
    todoApp.addTodo('Capture replay state')
    todoApp.addTodo('Inspect causal path')
    todoApp.toggleTodo(0)
    await waitForDOM(
      shadowRoot,
      (root) => root.querySelectorAll('[data-frame-id]').length >= 5,
      5000,
    )

    const exported = ADMIN_FRAME.run(() => admin.store.exportSession())
    ADMIN_FRAME.run(() => {
      admin.reporter.clear()
      admin.store.clear()
      admin.store.importSession(exported)
    })
    await wrap(sleep(100))

    await openLogFrame(shadowRoot, 'todos', 'Capture replay state')
    await navigate(shadowRoot, 'Graph')
    await waitForDOM(
      shadowRoot,
      (root) => root.querySelector('[data-reatom-name="GraphNodes"]') !== null,
      5000,
    )

    const graphRect = getRect(shadowRoot, '[data-reatom-name="GraphNodes"]')
    const controlsRect = getRect(
      shadowRoot,
      '[data-reatom-name="CauseGraphControls"]',
    )

    expect(admin.view.summary().source).toBe('replay')
    expect(graphRect.width).toBeGreaterThan(500)
    expect(controlsRect.height).toBeGreaterThan(50)
    expect(shadowRoot.textContent?.includes('Shortest path')).toBe(false)
    expect(shadowRoot.textContent?.includes('Replay analysis')).toBe(true)
  } finally {
    teardown()
  }
})
