import { expect, test } from 'test'

import { createTodoApp } from '../fixtures/todoApp'
import { ADMIN_FRAME } from '../root'
import {
  delay,
  getElement,
  getRect,
  navigate,
  page,
  resizeViewport,
  runInAppContext,
  setup,
  waitForDOM,
} from './helpers'

test('switches into replay analysis and keeps graph exploration usable', async () => {
  await resizeViewport(1360, 1000)

  const { shadowRoot, admin, devtools, teardown } = setup()
  const todoApp = createTodoApp()

  try {
    runInAppContext(() => {
      todoApp.addTodo('Capture replay state')
      todoApp.addTodo('Inspect causal path')
    })
    runInAppContext(() => {
      todoApp.toggleTodo(0)
    })
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
    await delay(100)

    const replayTodosItems = ADMIN_FRAME.run(() =>
      admin.store
        .frames()
        .filter(
          (frame) => admin.store.getAtoms().get(frame.atomId)?.name === 'todos',
        ),
    )
    expect(replayTodosItems.length).toBeGreaterThan(0)
    ADMIN_FRAME.run(() => {
      const replayFrame = replayTodosItems[replayTodosItems.length - 1]
      if (!replayFrame) return
      admin.store.selectFrame(replayFrame.id)
      admin.causeGraph.selectedRootId.set(replayFrame.id)
    })
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

    const source = ADMIN_FRAME.run(() => admin.view.summary().source)
    expect(source).toBe('replay')
    expect(graphRect.width).toBeGreaterThan(450)
    expect(controlsRect.height).toBeGreaterThan(50)
    expect(shadowRoot.textContent?.includes('Shortest path')).toBe(false)
    expect(shadowRoot.textContent?.includes('Replay analysis')).toBe(true)
    await expect(
      page.elementLocator(
        getElement(shadowRoot, '[data-reatom-name="CauseGraphControls"]'),
      ),
    ).toMatchScreenshot('replay-analysis-graph-workspace')
  } finally {
    teardown()
  }
})
