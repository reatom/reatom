/**
 * @doc-expand
 * Todo Application
 *
 * Complete todo application with add, toggle, and delete functionality.
 *
 * This example demonstrates:
 *
 * - [Atomization pattern](/handbook/lit/advanced#atomization) for todo items (O(1) updates)
 * - Computed atoms for filtering and stats
 * - Actions for state mutations
 * - Complete CRUD operations
 * - Reactive UI updates with `watch()` directive
 */


import { atom, action, computed, type Atom } from '@reatom/core'
import { ReatomLitElement, watch } from '@reatom/lit'
import { html } from 'lit'

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
  return {
    total: list.length,
    active: list.filter((t) => !t.completed()).length,
    completed: list.filter((t) => t.completed()).length,
  }
}, 'stats')

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

  private handleSubmit = (e: Event) => {
    e.preventDefault()
    const text = this.inputText.trim()
    if (text) {
      addTodo(text)
      this.inputText = ''
    }
  }

  override render() {
    const currentStats = stats()
    const filteredTodosList = filteredTodos()

    return html`
      <div class="todo-app">
        <h1>Reatom + Lit Todo App</h1>

        <form @submit=${this.handleSubmit} class="todo-form">
          <input
            type="text"
            placeholder="What needs to be done?"
            .value=${this.inputText}
            @input=${(e: InputEvent) => {
              this.inputText = (e.target as HTMLInputElement).value
            }}
          />
          <button type="submit">Add</button>
        </form>

        <ul class="todo-list">
          ${filteredTodosList.map(
            (todo) => html`
              <li class="todo-item">
                <input
                  type="checkbox"
                  .checked=${watch(todo.completed)}
                  @change=${() => toggleTodo(todo.id)}
                />
                <span
                  class="todo-text"
                  style="text-decoration: ${watch(todo.completed)
                    ? 'line-through'
                    : 'none'}"
                >
                  ${watch(todo.text)}
                </span>
                <button @click=${() => deleteTodo(todo.id)}>Delete</button>
              </li>
            `,
          )}
        </ul>

        <div class="todo-stats">
          <p>Items: ${currentStats.total}</p>
          <p>Active: ${currentStats.active}</p>
          <p>Completed: ${currentStats.completed}</p>
          ${currentStats.completed > 0
            ? html`<button @click=${clearCompleted}>Clear completed</button>`
            : ''}
        </div>
      </div>
    `
  }
}

customElements.define('todo-app', TodoApp)
