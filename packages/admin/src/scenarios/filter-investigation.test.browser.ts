import { sleep, wrap } from '@reatom/core'
import { expect, test } from 'test'

import { createCounterApp } from '../fixtures/counterApp'
import { createTodoApp } from '../fixtures/todoApp'
import { createWeatherApp } from '../fixtures/weatherApp'
import { ADMIN_FRAME } from '../root'
import {
  getDevtoolsSelector,
  getRect,
  navigate,
  page,
  resizeViewport,
  setup,
  waitForDOM,
} from './helpers'

test('curates a reusable filter workbench for a noisy multi-app debugging session', async () => {
  await resizeViewport(1440, 1100)

  const { shadowRoot, admin, devtools, teardown } = setup()
  const todoApp = createTodoApp()
  const counterApp = createCounterApp()
  const weatherApp = createWeatherApp()
  weatherApp.weather.subscribe(() => {})

  try {
    todoApp.addTodo('Prepare stakeholder demo')
    counterApp.increment()
    weatherApp.setCity('Tallinn')
    await wrap(sleep(120))

    ADMIN_FRAME.run(() => {
      const weatherTag = admin.filters.tags.createTag('weather reads', [
        { id: 'weather-name', type: 'text', target: 'name', value: 'weather' },
      ])
      const actionTag = admin.filters.tags.getTag('_Admin.builtin.action')

      if (actionTag) {
        admin.filters.expression.setExpression({
          operator: 'OR',
          children: [
            { tagId: weatherTag.id, negated: false },
            {
              operator: 'AND',
              children: [{ tagId: actionTag.id, negated: false }],
            },
          ],
        })
      }

      admin.filters.engine.addDraftConfig('Highlight cross-app work', 'highlight')
      admin.filters.engine.addDraftConfig('Show action traffic', 'show')
    })

    await navigate(shadowRoot, 'Filters')
    await waitForDOM(
      shadowRoot,
      (root) => root.querySelector('[data-reatom-name="FilterEditor"]') !== null,
      5000,
    )

    const editorRect = getRect(shadowRoot, '[data-reatom-name="FilterEditor"]')
    const predicateBuilderRect = getRect(
      shadowRoot,
      '[data-reatom-name="PredicateBuilder"]',
    )
    const expressionRect = getRect(
      shadowRoot,
      '[data-reatom-name="ExpressionGroupEditor"]',
    )

    expect(editorRect.width).toBeGreaterThan(900)
    expect(predicateBuilderRect.width).toBeGreaterThan(280)
    expect(expressionRect.width).toBeGreaterThan(280)
    expect(shadowRoot.textContent?.includes('Highlight cross-app work')).toBe(
      true,
    )
    expect(shadowRoot.textContent?.includes('Show action traffic')).toBe(true)
    await expect(
      page.locator(getDevtoolsSelector(devtools.containerId)),
    ).toMatchScreenshot('filter-workbench-curation')
  } finally {
    teardown()
  }
})
