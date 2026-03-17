import { sleep, wrap } from '@reatom/core'
import type { Meta, StoryObj } from '@storybook/html'
import { expect } from 'storybook/test'

import { createCounterApp } from '../fixtures/counterApp'
import { createTodoApp } from '../fixtures/todoApp'
import { ADMIN_FRAME, currentDevtools, setup } from './helpers'
import { createControlWorkbenchScene } from './sceneHelpers'

let todoApp: ReturnType<typeof createTodoApp>
let counterApp: ReturnType<typeof createCounterApp>

const meta: Meta = {
  title: 'Admin/Filter Workbench',
}

export default meta

export const BuildReusableHighlightAndShowRules: StoryObj = {
  render: () => {
    const { admin } = setup()
    todoApp = createTodoApp()
    counterApp = createCounterApp()

    todoApp.addTodo('Investigate checkout flow')
    counterApp.increment()

    ADMIN_FRAME.run(() => {
      admin.filters.tags.createTag('todo updates', [
        { id: 'todo-name', type: 'text', target: 'name', value: 'todo' },
      ])
      admin.filters.tags.createTag('action traffic', [
        { id: 'action-kind', type: 'kind', value: 'action' },
      ])
      admin.filters.expression.setExpression({
        operator: 'OR',
        children: admin.filters.tags
          .tags()
          .slice(-2)
          .map((tag) => ({ tagId: tag.id, negated: false })),
      })
      admin.filters.engine.addDraftConfig('Show business activity', 'show')
      admin.filters.engine.addDraftConfig('Highlight flow pivots', 'highlight')
    })
    return createControlWorkbenchScene(
      todoApp,
      counterApp,
      'Filter workbench fixture',
      'The visible todo and counter state helps you compare what the app is doing with the saved filter rules you build inside the admin panel.',
    )
  },
  play: async () => {
    const shadowRoot = document.getElementById(
      currentDevtools!.containerId,
    )!.shadowRoot!

    const filtersButton = Array.from(
      shadowRoot.querySelectorAll('button'),
    ).find((button) => button.textContent?.includes('Filters'))
    filtersButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await wrap(sleep(120))

    await expect(shadowRoot.textContent).toContain('Filter studio')
    await expect(shadowRoot.textContent).toContain('Show business activity')
    await expect(shadowRoot.textContent).toContain('Highlight flow pivots')
    await expect(shadowRoot.textContent).toContain('todo updates')
    await expect(shadowRoot.textContent).toContain('action traffic')
  },
}
