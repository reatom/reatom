import { expect, test } from 'test'

import { createAdvancedTodoApp, STORAGE_KEY } from '../fixtures/advancedTodoApp'
import { createCounterApp } from '../fixtures/counterApp'
import { createTodoApp } from '../fixtures/todoApp'
import { createWeatherApp } from '../fixtures/weatherApp'
import { createInfoScene } from '../stories/sceneHelpers'
import {
  createAdvancedTodoScene,
  createControlWorkbenchScene,
  createMultiAppScene,
  createTodoScene,
  createWeatherScene,
} from '../stories/sceneHelpers'
import {
  clickLogItem,
  findLogItem,
  getLogItems,
  getLogItemsByName,
  parseLogItem,
  typeInSearch,
} from '../stories/helpers'
import { ADMIN_FRAME } from '../root'
import {
  delay,
  getElement,
  navigate,
  openLogFrame,
  page,
  resizeViewport,
  setup,
  stabilizeDevtoolsText,
  waitForDOM,
  waitForLogName,
} from './helpers'

const FULL_HD_WIDTH = 1920
const FULL_HD_HEIGHT = 1080
const REVIEW_PANEL_WIDTH = '880px'
const REVIEW_PANEL_HEIGHT = '820px'

interface SceneTodoItem {
  text: string
  done: boolean
}

function mountScene(scene: HTMLDivElement): () => void {
  document.body.append(scene)
  return () => {
    scene.remove()
  }
}

function getStorySceneRoot(): HTMLDivElement {
  const sceneRoot = document.querySelector('[data-testid="story-scene"]')
  if (!(sceneRoot instanceof HTMLDivElement)) {
    throw new Error('Missing story scene root')
  }
  return sceneRoot
}

async function prepareFullHdReview(shadowRoot: ShadowRoot): Promise<void> {
  await resizeViewport(FULL_HD_WIDTH, FULL_HD_HEIGHT)

  document.documentElement.style.background = '#0f1220'
  document.documentElement.style.overflow = 'hidden'
  document.body.style.margin = '0'
  document.body.style.width = `${FULL_HD_WIDTH}px`
  document.body.style.height = `${FULL_HD_HEIGHT}px`
  document.body.style.overflow = 'hidden'
  document.body.style.background = '#0f1220'

  const storySceneRoot = getStorySceneRoot()
  storySceneRoot.style.width = `${FULL_HD_WIDTH}px`
  storySceneRoot.style.height = `${FULL_HD_HEIGHT}px`
  storySceneRoot.style.minHeight = `${FULL_HD_HEIGHT}px`
  storySceneRoot.style.overflow = 'hidden'
  storySceneRoot.style.padding = '2rem 58rem 2rem 2rem'

  stabilizeDevtoolsText(shadowRoot)
  await delay(120)
}

async function captureFullHdReview(
  shadowRoot: ShadowRoot,
  name: string,
): Promise<void> {
  stabilizeDevtoolsText(shadowRoot)
  await delay(40)
  stabilizeDevtoolsText(shadowRoot)
  await expect(page.elementLocator(document.body)).toMatchScreenshot(name)
}

function getStoryCard(title: string): HTMLDivElement {
  const card = document.querySelector(`[data-story-card="${title}"]`)
  if (!(card instanceof HTMLDivElement)) {
    throw new Error(`Missing story card ${title}`)
  }
  return card
}

function syncTodoScene(items: Array<SceneTodoItem>): void {
  const card = getStoryCard('Todo application')
  const header = card.firstElementChild
  if (!(header instanceof HTMLDivElement)) {
    throw new Error('Missing todo card header')
  }
  const headerMeta = header.querySelector('span')
  if (headerMeta instanceof HTMLSpanElement) {
    headerMeta.textContent = `${items.length} item${items.length === 1 ? '' : 's'}`
  }

  const list = card.querySelector('ul')
  if (!(list instanceof HTMLUListElement)) {
    throw new Error('Missing todo card list')
  }
  list.replaceChildren()

  for (const item of items) {
    const listItem = document.createElement('li')
    listItem.style.cssText = [
      'display: flex',
      'justify-content: space-between',
      'align-items: center',
      'gap: 1rem',
      'padding: 0.75rem 0.85rem',
      'border-radius: 14px',
      'background: rgba(10, 14, 25, 0.45)',
      'border: 1px solid rgba(173, 188, 255, 0.12)',
    ].join(';')

    const itemText = document.createElement('strong')
    itemText.textContent = item.text
    itemText.style.cssText = item.done
      ? 'text-decoration: line-through; color: #98a2bc;'
      : 'color: #edf2ff;'

    const state = document.createElement('span')
    state.textContent = item.done ? 'done' : 'open'
    state.style.cssText = item.done
      ? 'color: #8ce6b1; font-size: 0.8rem;'
      : 'color: #f7d774; font-size: 0.8rem;'

    listItem.append(itemText, state)
    list.append(listItem)
  }
}

function syncCounterScene(value: number): void {
  const card = getStoryCard('Counter')
  const valueElement = card.children[1]
  if (!(valueElement instanceof HTMLDivElement)) {
    throw new Error('Missing counter value element')
  }
  valueElement.textContent = String(value)
}

function syncWeatherScene(city: string): void {
  const card = getStoryCard('Weather selector')
  const cityValue = card.children[1]
  if (!(cityValue instanceof HTMLDivElement)) {
    throw new Error('Missing weather city element')
  }
  cityValue.textContent = city
}

function setupReview() {
  return setup({
    initialWidth: REVIEW_PANEL_WIDTH,
    initialHeight: REVIEW_PANEL_HEIGHT,
  })
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

test('captures the lifecycle shell story in full hd', async () => {
  const scene = createInfoScene(
    'Lifecycle review fixture',
    'The information card on the left provides visual context while the admin shell is reviewed at a larger desktop size.',
    [
      'Mounted shell',
      'Shadow-root chrome visible',
      'Larger desktop review layout',
    ],
  )
  const removeScene = mountScene(scene)
  const { shadowRoot, teardown } = setupReview()

  try {
    await prepareFullHdReview(shadowRoot)
    expect(
      shadowRoot.querySelector('[data-reatom-name="AppShell"]'),
    ).not.toBeNull()
    expect(
      shadowRoot.querySelector('[data-reatom-name="DevtoolsPanel"]'),
    ).not.toBeNull()
    await captureFullHdReview(shadowRoot, 'story-review-lifecycle-full-hd')
  } finally {
    removeScene()
    teardown()
  }
})

test('captures todo crud story states in full hd', async () => {
  const { shadowRoot, teardown } = setupReview()
  const todoApp = createTodoApp()
  const scene = createTodoScene(
    todoApp,
    'Todo CRUD review fixture',
    'The left-side fixture is intentionally visible so the todo list and the devtools activity feed can be reviewed together.',
  )
  const removeScene = mountScene(scene)

  try {
    for (const label of [
      'Buy milk',
      'Walk dog',
      'Read book',
      'Send invoices',
      'Archive notes',
      'Fix filters',
      'Prepare release',
      'Share notes',
    ]) {
      todoApp.addTodo(label)
    }
    todoApp.toggleTodo(0)
    todoApp.toggleTodo(3)
    todoApp.removeTodo(1)

    await waitForDOM(shadowRoot, (root) => getLogItems(root).length >= 18, 5000)
    const latestTodos = getLogItemsByName(shadowRoot, 'todos').at(-1)
    if (!latestTodos) {
      throw new Error('Missing todos frame for full-hd review')
    }
    clickLogItem(latestTodos)
    syncTodoScene([
      { text: 'Buy milk', done: true },
      { text: 'Read book', done: false },
      { text: 'Send invoices', done: true },
      { text: 'Archive notes', done: false },
      { text: 'Fix filters', done: false },
      { text: 'Prepare release', done: false },
      { text: 'Share notes', done: false },
    ])

    await prepareFullHdReview(shadowRoot)
    await captureFullHdReview(
      shadowRoot,
      'story-review-todo-crud-overview-full-hd',
    )

    const actionsQuickFilter = Array.from(
      shadowRoot.querySelectorAll('button'),
    ).find((button) => button.textContent?.trim() === 'Actions')
    if (!(actionsQuickFilter instanceof HTMLButtonElement)) {
      throw new Error('Missing quick filter button for actions')
    }
    actionsQuickFilter.click()
    await delay(80)

    typeInSearch(shadowRoot, 'toggleTodo')
    await delay(80)
    const activityFeedPanel = getElement(
      shadowRoot,
      '[data-reatom-name="ActivityFeedPanel"]',
    )
    activityFeedPanel.scrollTop = activityFeedPanel.scrollHeight
    await delay(80)
    const toggleTodoItem = findLogItem(shadowRoot, 'toggleTodo', '[3]')
    if (toggleTodoItem) {
      clickLogItem(toggleTodoItem)
    }

    await captureFullHdReview(
      shadowRoot,
      'story-review-todo-crud-filtered-full-hd',
    )
  } finally {
    removeScene()
    teardown()
  }
})

test('captures async weather story in full hd', async () => {
  const { shadowRoot, teardown } = setupReview()
  const weatherApp = createWeatherApp()
  weatherApp.weather.subscribe(() => {})
  const scene = createWeatherScene(
    weatherApp,
    'Async weather review fixture',
    'The weather story highlights how async updates appear in the activity feed and detail inspector.',
  )
  const removeScene = mountScene(scene)

  try {
    weatherApp.setCity('Paris')
    await waitForDOM(
      shadowRoot,
      (root) =>
        (root.textContent?.includes('Paris') ?? false) ||
        (getStorySceneRoot().textContent?.includes('Paris') ?? false),
      5000,
    )
    const weatherDataItem = getLogItemsByName(shadowRoot, 'weather.data').find(
      (item) => parseLogItem(item).content.includes('Paris'),
    )
    if (weatherDataItem) {
      clickLogItem(weatherDataItem)
    }

    await prepareFullHdReview(shadowRoot)
    syncWeatherScene('Paris')
    await captureFullHdReview(shadowRoot, 'story-review-async-weather-full-hd')
  } finally {
    removeScene()
    teardown()
  }
})

test('captures multi app story in full hd', async () => {
  const { shadowRoot, teardown } = setupReview()
  const todoApp = createTodoApp()
  const counterApp = createCounterApp()
  const weatherApp = createWeatherApp()
  weatherApp.weather.subscribe(() => {})
  const scene = createMultiAppScene(todoApp, counterApp, weatherApp)
  const removeScene = mountScene(scene)

  try {
    todoApp.addTodo('Ship multi-app review')
    counterApp.increment()
    counterApp.increment()
    weatherApp.setCity('Berlin')
    await waitForDOM(
      shadowRoot,
      (root) =>
        (root.textContent?.includes('Berlin') ?? false) ||
        (getStorySceneRoot().textContent?.includes('Berlin') ?? false),
      5000,
    )

    const todosItem = getLogItemsByName(shadowRoot, 'todos').find((item) =>
      parseLogItem(item).content.includes('Ship multi-app review'),
    )
    if (todosItem) {
      clickLogItem(todosItem)
    }
    syncTodoScene([{ text: 'Ship multi-app review', done: false }])
    syncCounterScene(2)

    await prepareFullHdReview(shadowRoot)
    syncWeatherScene('Berlin')
    await captureFullHdReview(shadowRoot, 'story-review-multi-app-full-hd')
  } finally {
    removeScene()
    teardown()
  }
})

test('captures filter workbench story in full hd', async () => {
  const { shadowRoot, admin, teardown } = setupReview()
  const todoApp = createTodoApp()
  const counterApp = createCounterApp()
  const scene = createControlWorkbenchScene(
    todoApp,
    counterApp,
    'Filter workbench review fixture',
    'This review state keeps the fixture surface visible while the filter studio is open at desktop scale.',
  )
  const removeScene = mountScene(scene)

  try {
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

    await waitForDOM(
      shadowRoot,
      (root) =>
        Array.from(root.querySelectorAll('button')).some((button) =>
          button.textContent?.includes('Filters'),
        ),
      5000,
    )
    await navigate(shadowRoot, 'Filters')
    await waitForDOM(
      shadowRoot,
      (root) =>
        root.querySelector('[data-reatom-name="FilterWorkbench"]') !== null,
      5000,
    )
    syncTodoScene([{ text: 'Investigate checkout flow', done: false }])
    syncCounterScene(1)

    await prepareFullHdReview(shadowRoot)
    await captureFullHdReview(
      shadowRoot,
      'story-review-filter-workbench-full-hd',
    )
  } finally {
    removeScene()
    teardown()
  }
})

test('captures responsive shell story in full hd', async () => {
  const { shadowRoot, teardown } = setupReview()
  const todoApp = createTodoApp()
  const counterApp = createCounterApp()
  const scene = createControlWorkbenchScene(
    todoApp,
    counterApp,
    'Responsive shell review fixture',
    'The full-hd review keeps the scene visible so the devtools shell can be judged in context instead of as a cropped bar.',
  )
  const removeScene = mountScene(scene)

  try {
    todoApp.addTodo('Responsive review task')
    counterApp.increment()
    counterApp.increment()
    await waitForDOM(
      shadowRoot,
      (root) => root.querySelector('[data-reatom-name="FilterBar"]') !== null,
      5000,
    )
    syncTodoScene([{ text: 'Responsive review task', done: false }])
    syncCounterScene(2)

    await prepareFullHdReview(shadowRoot)
    await captureFullHdReview(
      shadowRoot,
      'story-review-responsive-shell-full-hd',
    )
  } finally {
    removeScene()
    teardown()
  }
})

test('captures advanced todo story in full hd', async () => {
  localStorage.removeItem(STORAGE_KEY)
  const { shadowRoot, teardown } = setupReview()
  const advancedTodoApp = createAdvancedTodoApp()
  const scene = createAdvancedTodoScene(advancedTodoApp)
  const removeScene = mountScene(scene)

  try {
    advancedTodoApp.addTodo('Buy groceries')
    advancedTodoApp.addTodo('Walk the dog')
    advancedTodoApp.addTodo('Read a book')

    goOffline()
    try {
      await advancedTodoApp.toggleTodo(1)
    } catch {}
    await waitForDOM(
      shadowRoot,
      (root) => root.textContent?.includes('toggleTodo.onReject') ?? false,
      5000,
    )
    await openLogFrame(shadowRoot, 'toggleTodo.onReject', '')
    goOnline()
    syncTodoScene([
      { text: 'Buy groceries', done: false },
      { text: 'Walk the dog', done: false },
      { text: 'Read a book', done: false },
    ])

    await prepareFullHdReview(shadowRoot)
    await captureFullHdReview(shadowRoot, 'story-review-advanced-todo-full-hd')
  } finally {
    goOnline()
    removeScene()
    teardown()
  }
})

test('captures replay analysis story in full hd', async () => {
  const { shadowRoot, admin, teardown } = setupReview()
  const todoApp = createTodoApp()
  const scene = createTodoScene(
    todoApp,
    'Replay analysis review fixture',
    'The review keeps the source fixture visible while the session is exported, imported, and explored in replay mode.',
  )
  const removeScene = mountScene(scene)

  try {
    todoApp.addTodo('Capture replay state')
    todoApp.addTodo('Review replay graph')
    todoApp.toggleTodo(0)
    await waitForDOM(
      shadowRoot,
      (root) => root.textContent?.includes('Capture replay state') ?? false,
      5000,
    )

    const exported = ADMIN_FRAME.run(() => admin.store.exportSession())
    ADMIN_FRAME.run(() => {
      admin.reporter.clear()
      admin.store.clear()
      admin.store.importSession(exported)
    })
    await delay(100)

    const replayTodosFrame = ADMIN_FRAME.run(() =>
      admin.store
        .frames()
        .filter(
          (frame) => admin.store.getAtoms().get(frame.atomId)?.name === 'todos',
        )
        .at(-1),
    )
    if (!replayTodosFrame) {
      throw new Error('Missing replay todos frame')
    }
    ADMIN_FRAME.run(() => {
      admin.store.selectFrame(replayTodosFrame.id)
      admin.causeGraph.selectedRootId.set(replayTodosFrame.id)
    })
    await delay(80)
    await navigate(shadowRoot, 'Graph')
    await waitForDOM(
      shadowRoot,
      (root) => root.querySelector('[data-reatom-name="GraphNodes"]') !== null,
      5000,
    )
    syncTodoScene([
      { text: 'Capture replay state', done: true },
      { text: 'Review replay graph', done: false },
    ])

    await prepareFullHdReview(shadowRoot)
    await captureFullHdReview(
      shadowRoot,
      'story-review-replay-analysis-full-hd',
    )
  } finally {
    removeScene()
    teardown()
  }
})

test('captures devtools controls story in full hd', async () => {
  const { shadowRoot, admin, teardown } = setupReview()
  const todoApp = createTodoApp()
  const counterApp = createCounterApp()
  const scene = createControlWorkbenchScene(
    todoApp,
    counterApp,
    'Devtools controls review fixture',
    'This review state focuses on whether pause, search, and quick filters are understandable at a glance.',
  )
  const removeScene = mountScene(scene)

  try {
    todoApp.addTodo('alpha')
    todoApp.addTodo('beta')
    todoApp.addTodo('gamma')
    counterApp.increment()
    counterApp.increment()
    await waitForDOM(
      shadowRoot,
      (root) => root.textContent?.includes('gamma') ?? false,
      5000,
    )

    ADMIN_FRAME.run(() => admin.reporter.paused.setTrue())
    typeInSearch(shadowRoot, 'increment')
    await delay(80)
    const incrementLog = await waitForLogName(shadowRoot, 'increment')
    clickLogItem(incrementLog)
    syncTodoScene([
      { text: 'alpha', done: false },
      { text: 'beta', done: false },
      { text: 'gamma', done: false },
    ])
    syncCounterScene(2)

    await prepareFullHdReview(shadowRoot)
    await captureFullHdReview(
      shadowRoot,
      'story-review-devtools-controls-full-hd',
    )
  } finally {
    removeScene()
    teardown()
  }
})
