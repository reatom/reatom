---
title: Todo Application
description: Todo Application - Reatom Lit integration
---

Complete todo application with add, toggle, and delete functionality.

This example demonstrates:

- [Atomization pattern](/handbook/lit/advanced#atomization) for todo items (O(1) updates)
- Computed atoms for filtering and stats
- Actions for state mutations
- Complete CRUD operations
- Reactive UI updates with `watch()` directive

```ts
import { atom, action, computed, type Atom } from '@reatom/core'
import { ReatomLitElement, watch } from '@reatom/lit'
import { html } from 'lit'
import { repeat } from 'lit/directives/repeat.js'

// Type definitions with explicit Atom types
type Todo = {
  id: string
  text: Atom<string>
  completed: Atom<boolean>
}

// State atoms
export const todos = atom<Todo[]>([], 'todos')
export const filter = atom<'all' | 'active' | 'completed'>('all', 'filter')

// Computed atoms
export const filteredTodos = computed(() => {
  const currentFilter = filter()
  const currentTodos = todos()

  switch (currentFilter) {
    case 'active':
      return currentTodos.filter((t) => !t.completed())
    case 'completed':
      return currentTodos.filter((t) => t.completed())
    default:
      return currentTodos
  }
}, 'filteredTodos')

export const stats = computed(() => {
  const list = todos()

  let active = 0
  let completed = 0
  for (const todo of list) {
    if (todo.completed()) completed++
    else active++
  }

  return {
    total: list.length,
    active,
    completed,
  }
}, 'stats')

export const statsTotal = computed(() => stats().total, 'stats.total')
export const statsActive = computed(() => stats().active, 'stats.active')
export const statsCompleted = computed(() => stats().completed, 'stats.completed')

const hideClearCompleted = computed(
  () => statsCompleted() === 0,
  'stats.hideClearCompleted',
)

// Actions
export const addTodo = action((text: string) => {
  const id = Date.now().toString()
  todos.set((list) => [
    ...list,
    {
      id,
      text: atom(text, `todo.${id}.text`),
      completed: atom(false, `todo.${id}.completed`),
    },
  ])
}, 'addTodo')

export const toggleTodo = action((id: string) => {
  const todo = todos().find((t) => t.id === id)
  if (todo) {
    todo.completed.set((v) => !v)
  }
}, 'toggleTodo')

export const deleteTodo = action((id: string) => {
  todos.set((list) => list.filter((t) => t.id !== id))
}, 'deleteTodo')

export const clearCompleted = action(() => {
  todos.set((list) => list.filter((t) => !t.completed()))
}, 'clearCompleted')

// Component
export class TodoApp extends ReatomLitElement {
  private inputText = ''

  private handleInput = (e: InputEvent) => {
    this.inputText = (e.target as HTMLInputElement).value
  }

  private handleListChange = (e: Event) => {
    const target = e.target
    if (!(target instanceof HTMLInputElement)) return
    if (target.type !== 'checkbox') return

    const id = target.dataset.id
    if (!id) return
    toggleTodo(id)
  }

  private handleListClick = (e: MouseEvent) => {
    const target = e.target as Element | null
    const button = target?.closest<HTMLButtonElement>('button[data-action="delete"]')
    if (!button) return

    const id = button.dataset.id
    if (!id) return
    deleteTodo(id)
  }

  private handleSubmit = (e: Event) => {
    e.preventDefault()
    const text = this.inputText.trim()
    if (text) {
      addTodo(text)
      this.inputText = ''
    }
  }

  override render() {
    const filteredTodosList = filteredTodos()

    return html`
      <div class="todo-app">
        <h1>Reatom + Lit Todo App</h1>

        <form @submit=${this.handleSubmit} class="todo-form">
          <input
            type="text"
            placeholder="What needs to be done?"
            .value=${this.inputText}
            @input=${this.handleInput}
          />
          <button type="submit">Add</button>
        </form>

        <ul
          class="todo-list"
          @change=${this.handleListChange}
          @click=${this.handleListClick}
        >
          ${repeat(
            filteredTodosList,
            (todo) => todo.id,
            (todo) => html`
              <li class="todo-item">
                <input
                  type="checkbox"
                  data-id=${todo.id}
                  .checked=${watch(todo.completed)}
                />
                <span
                  class="todo-text"
                  style="text-decoration: ${watch(todo.completed)
                    ? 'line-through'
                    : 'none'}"
                >
                  ${watch(todo.text)}
                </span>
                <button data-action="delete" data-id=${todo.id}>Delete</button>
              </li>
            `,
          )}
        </ul>

        <div class="todo-stats">
          <p>Items: ${watch(statsTotal)}</p>
          <p>Active: ${watch(statsActive)}</p>
          <p>Completed: ${watch(statsCompleted)}</p>
          <button @click=${clearCompleted} ?hidden=${watch(hideClearCompleted)}>
            Clear completed
          </button>
        </div>
      </div>
    `
  }
}

customElements.define('todo-app', TodoApp)
```

---

← [Paginated list](/handbook/lit/examples/paginated-list)
