import { registerStoryCleanup } from './helpers'

interface TodoItemLike {
  id: number
  text: string
  done: boolean
}

interface Subscribable<State> {
  subscribe: (listener: (state: State) => void) => (() => void) | void
}

interface TodoFixtureLike {
  todos: Subscribable<Array<TodoItemLike>>
  addTodo: (text: string) => void
  toggleTodo: (id: number) => void
  removeTodo: (id: number) => void
}

interface AdvancedTodoFixtureLike extends TodoFixtureLike {
  clearCompleted: () => void
}

interface CounterFixtureLike {
  count: Subscribable<number>
  increment: () => void
  decrement: () => void
}

interface WeatherFixtureLike {
  city: Subscribable<string>
  setCity: (city: string) => void
}

const sceneRootCss = [
  'min-height: 100vh',
  'padding: 2rem 38rem 18rem 2rem',
  'background: linear-gradient(180deg, #0f1220 0%, #151a2a 100%)',
  'color: #edf2ff',
  'font-family: Inter, system-ui, sans-serif',
  'display: grid',
  'gap: 1.25rem',
  'box-sizing: border-box',
].join(';')

const sceneCardCss = [
  'background: rgba(28, 35, 56, 0.95)',
  'border: 1px solid rgba(173, 188, 255, 0.16)',
  'border-radius: 20px',
  'padding: 1rem 1.1rem',
  'box-shadow: 0 24px 48px -32px rgba(0, 0, 0, 0.7)',
].join(';')

const sceneButtonCss = [
  'border: 1px solid rgba(173, 188, 255, 0.2)',
  'border-radius: 999px',
  'padding: 0.45rem 0.8rem',
  'background: rgba(96, 129, 255, 0.12)',
  'color: #edf2ff',
  'cursor: pointer',
  'font: inherit',
].join(';')

const sceneBadgeCss = [
  'display: inline-flex',
  'align-items: center',
  'gap: 0.35rem',
  'padding: 0.25rem 0.55rem',
  'border-radius: 999px',
  'font-size: 0.72rem',
  'background: rgba(139, 183, 255, 0.16)',
  'color: #9dc1ff',
  'border: 1px solid rgba(139, 183, 255, 0.28)',
].join(';')

function addCleanup(cleanup: (() => void) | void): void {
  if (typeof cleanup === 'function') {
    registerStoryCleanup(cleanup)
  }
}

function createButton(label: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = label
  button.style.cssText = sceneButtonCss
  button.addEventListener('click', onClick)
  return button
}

function createSceneShell(
  title: string,
  description: string,
  badgeLabel: string,
): {
  root: HTMLDivElement
  hero: HTMLDivElement
  content: HTMLDivElement
} {
  const root = document.createElement('div')
  root.dataset.testid = 'story-scene'
  root.style.cssText = sceneRootCss

  const hero = document.createElement('div')
  hero.style.cssText = sceneCardCss

  const badge = document.createElement('span')
  badge.textContent = badgeLabel
  badge.style.cssText = sceneBadgeCss

  const heading = document.createElement('h2')
  heading.textContent = title
  heading.style.cssText = 'margin: 0.9rem 0 0; font-size: 1.6rem;'

  const text = document.createElement('p')
  text.textContent = description
  text.style.cssText =
    'margin: 0.6rem 0 0; color: #aeb8d2; max-width: 46rem; line-height: 1.55;'

  hero.append(badge, heading, text)

  const content = document.createElement('div')
  content.style.cssText = 'display: grid; gap: 1rem;'

  root.append(hero, content)
  return { root, hero, content }
}

function createListCard(title: string, subtitle: string): {
  card: HTMLDivElement
  headerMeta: HTMLSpanElement
  list: HTMLUListElement
  controls: HTMLDivElement
} {
  const card = document.createElement('div')
  card.dataset.storyCard = title
  card.style.cssText = sceneCardCss

  const header = document.createElement('div')
  header.style.cssText =
    'display: flex; justify-content: space-between; gap: 1rem; align-items: center;'

  const heading = document.createElement('h3')
  heading.textContent = title
  heading.style.cssText = 'margin: 0; font-size: 1.05rem;'

  const headerMeta = document.createElement('span')
  headerMeta.textContent = subtitle
  headerMeta.style.cssText = 'color: #97a6c7; font-size: 0.78rem;'

  header.append(heading, headerMeta)

  const controls = document.createElement('div')
  controls.style.cssText =
    'display: flex; flex-wrap: wrap; gap: 0.65rem; margin-top: 0.95rem;'

  const list = document.createElement('ul')
  list.style.cssText =
    'list-style: none; margin: 1rem 0 0; padding: 0; display: grid; gap: 0.65rem;'

  card.append(header, controls, list)
  return { card, headerMeta, list, controls }
}

function renderTodoList(
  target: HTMLUListElement,
  todos: Array<TodoItemLike>,
): void {
  target.replaceChildren()

  for (const todo of todos) {
    const item = document.createElement('li')
    item.style.cssText = [
      'display: flex',
      'justify-content: space-between',
      'align-items: center',
      'gap: 1rem',
      'padding: 0.75rem 0.85rem',
      'border-radius: 14px',
      'background: rgba(10, 14, 25, 0.45)',
      'border: 1px solid rgba(173, 188, 255, 0.12)',
    ].join(';')

    const text = document.createElement('strong')
    text.textContent = todo.text
    text.style.cssText = todo.done
      ? 'text-decoration: line-through; color: #98a2bc;'
      : 'color: #edf2ff;'

    const state = document.createElement('span')
    state.textContent = todo.done ? 'done' : 'open'
    state.style.cssText =
      todo.done
        ? 'color: #8ce6b1; font-size: 0.8rem;'
        : 'color: #f7d774; font-size: 0.8rem;'

    item.append(text, state)
    target.append(item)
  }

  if (todos.length === 0) {
    const empty = document.createElement('li')
    empty.textContent = 'No items yet'
    empty.style.cssText = 'color: #7d8dac; padding: 0.4rem 0.1rem;'
    target.append(empty)
  }
}

export function createInfoScene(
  title: string,
  description: string,
  notes: Array<string>,
): HTMLDivElement {
  const { root, content } = createSceneShell(title, description, 'Story setup')
  const card = document.createElement('div')
  card.style.cssText = sceneCardCss

  const list = document.createElement('ul')
  list.style.cssText =
    'margin: 0; padding-left: 1.1rem; display: grid; gap: 0.55rem; color: #c9d4ef;'
  for (const note of notes) {
    const item = document.createElement('li')
    item.textContent = note
    list.append(item)
  }

  card.append(list)
  content.append(card)
  return root
}

export function createTodoScene(
  fixture: TodoFixtureLike,
  title: string,
  description: string,
): HTMLDivElement {
  const { root, content } = createSceneShell(title, description, 'Fixture app')
  const { card, headerMeta, list, controls } = createListCard(
    'Todo application',
    'waiting for updates',
  )

  controls.append(
    createButton('Add sample', () => fixture.addTodo(`Task ${Date.now()}`)),
    createButton('Toggle first', () => fixture.toggleTodo(0)),
    createButton('Remove first', () => fixture.removeTodo(0)),
  )

  addCleanup(
    fixture.todos.subscribe((todos) => {
      headerMeta.textContent = `${todos.length} item${todos.length === 1 ? '' : 's'}`
      renderTodoList(list, todos)
    }),
  )

  content.append(card)
  return root
}

export function createAdvancedTodoScene(
  fixture: AdvancedTodoFixtureLike,
): HTMLDivElement {
  const root = createTodoScene(
    fixture,
    'Advanced todo fixture',
    'This surface mirrors the optimistic todo workflow used by the devtools: add items, toggle them, and clear completed work while the admin panel records every step.',
  )

  const card = root.querySelector('[data-story-card="Todo application"]')
  if (card instanceof HTMLDivElement) {
    const controls = card.querySelector('div + div')
    if (controls instanceof HTMLDivElement) {
      controls.append(
        createButton('Clear completed', () => fixture.clearCompleted()),
      )
    }
  }

  return root
}

export function createCounterScene(
  fixture: CounterFixtureLike,
  title: string,
  description: string,
): HTMLDivElement {
  const { root, content } = createSceneShell(title, description, 'Fixture app')
  const card = document.createElement('div')
  card.dataset.storyCard = 'Counter'
  card.style.cssText = sceneCardCss

  const heading = document.createElement('h3')
  heading.textContent = 'Counter'
  heading.style.cssText = 'margin: 0; font-size: 1.05rem;'

  const value = document.createElement('div')
  value.style.cssText =
    'margin-top: 1rem; font-size: 2.4rem; font-weight: 700; color: #9dc1ff;'

  const controls = document.createElement('div')
  controls.style.cssText =
    'display: flex; flex-wrap: wrap; gap: 0.65rem; margin-top: 1rem;'
  controls.append(
    createButton('Increment', () => fixture.increment()),
    createButton('Decrement', () => fixture.decrement()),
  )

  addCleanup(
    fixture.count.subscribe((count) => {
      value.textContent = String(count)
    }),
  )

  card.append(heading, value, controls)
  content.append(card)
  return root
}

export function createWeatherScene(
  fixture: WeatherFixtureLike,
  title: string,
  description: string,
): HTMLDivElement {
  const { root, content } = createSceneShell(title, description, 'Fixture app')
  const card = document.createElement('div')
  card.dataset.storyCard = 'Weather selector'
  card.style.cssText = sceneCardCss

  const heading = document.createElement('h3')
  heading.textContent = 'Weather selector'
  heading.style.cssText = 'margin: 0; font-size: 1.05rem;'

  const cityValue = document.createElement('div')
  cityValue.style.cssText =
    'margin-top: 1rem; font-size: 1.4rem; font-weight: 700; color: #edf2ff;'

  const hint = document.createElement('p')
  hint.textContent =
    'Change the city to trigger async weather fetches and watch the admin trace update in real time.'
  hint.style.cssText = 'margin: 0.65rem 0 0; color: #9db0d7; line-height: 1.5;'

  const controls = document.createElement('div')
  controls.style.cssText =
    'display: flex; flex-wrap: wrap; gap: 0.65rem; margin-top: 1rem;'
  for (const city of ['Paris', 'Tokyo', 'Berlin', 'Sydney']) {
    controls.append(createButton(city, () => fixture.setCity(city)))
  }

  addCleanup(
    fixture.city.subscribe((city) => {
      cityValue.textContent = city
    }),
  )

  card.append(heading, cityValue, hint, controls)
  content.append(card)
  return root
}

export function createMultiAppScene(
  todoFixture: TodoFixtureLike,
  counterFixture: CounterFixtureLike,
  weatherFixture: WeatherFixtureLike,
): HTMLDivElement {
  const { root, content } = createSceneShell(
    'Multi-app fixture dashboard',
    'Three independent fixture apps are visible here so that devtools traces can be compared against actual app state while you inspect shared activity.',
    'Fixture app',
  )

  const grid = document.createElement('div')
  grid.style.cssText =
    'display: grid; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); gap: 1rem;'

  const todoScene = createTodoScene(
    todoFixture,
    'Todo fixture',
    'Business workflow state',
  )
  const counterScene = createCounterScene(
    counterFixture,
    'Counter fixture',
    'Fast numeric updates',
  )
  const weatherScene = createWeatherScene(
    weatherFixture,
    'Weather fixture',
    'Async request workflow',
  )

  const todoCard = todoScene.querySelector('[data-story-card="Todo application"]')
  const counterCard = counterScene.querySelector('[data-story-card="Counter"]')
  const weatherCard = weatherScene.querySelector('[data-story-card="Weather selector"]')

  if (todoCard instanceof HTMLDivElement) grid.append(todoCard)
  if (counterCard instanceof HTMLDivElement) grid.append(counterCard)
  if (weatherCard instanceof HTMLDivElement) grid.append(weatherCard)

  content.append(grid)
  return root
}

export function createControlWorkbenchScene(
  todoFixture: TodoFixtureLike,
  counterFixture: CounterFixtureLike,
  title: string,
  description: string,
): HTMLDivElement {
  const { root, content } = createSceneShell(title, description, 'Fixture app')
  const grid = document.createElement('div')
  grid.style.cssText =
    'display: grid; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); gap: 1rem;'

  const todoScene = createTodoScene(
    todoFixture,
    'Todo fixture',
    'User-facing state',
  )
  const counterScene = createCounterScene(
    counterFixture,
    'Counter fixture',
    'High-frequency mutations',
  )

  const todoCard = todoScene.querySelector('[data-story-card="Todo application"]')
  const counterCard = counterScene.querySelector('[data-story-card="Counter"]')

  if (todoCard instanceof HTMLDivElement) grid.append(todoCard)
  if (counterCard instanceof HTMLDivElement) grid.append(counterCard)

  content.append(grid)
  return root
}
