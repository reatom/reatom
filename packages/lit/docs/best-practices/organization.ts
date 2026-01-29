/**
 * Recommendations for organizing your Reatom + Lit code
 *
 * @file Organizing Code and Modularity
 */

/**
 * ## Architecture: Business Logic vs UI
 *
 * **Core principle:** All business logic and domain data should be separated from UI
 * and managed through Reatom. Components should only consume this data for rendering.
 * Reactivity happens automatically.
 *
 * ### Business Logic in Atoms (Preferred)
 *
 * Domain state and business logic belong in separate model files:
 */

// ============ EXAMPLE 1: Domain model ============
// domain/todos/model.ts
import { atom, action, computed } from '@reatom/core'

type Todo = { id: string; text: string; completed: boolean }
type Filter = 'all' | 'active' | 'completed'

// Domain state
const todosAtom = atom<Todo[]>([], 'todos')
const filterAtom = atom<Filter>('all', 'filter')

// Business logic
const addTodo = action((text: string) => {
  const todo: Todo = { id: crypto.randomUUID(), text, completed: false }
  todosAtom.set((list) => [...list, todo])
}, 'addTodo')

const toggleTodo = action((id: string) => {
  todosAtom.set((list) =>
    list.map((todo) =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo,
    ),
  )
}, 'toggleTodo')

const filteredTodosAtom = computed(() => {
  const todos = todosAtom()
  const filter = filterAtom()

  return todos.filter((todo) => {
    if (filter === 'active') return !todo.completed
    if (filter === 'completed') return todo.completed
    return true
  })
}, 'filteredTodos')

/**
 * ### UI Components Consume Data
 *
 * Components only render the data - they don't contain business logic:
 */

// ============ EXAMPLE 2: UI component consuming domain atoms ============
// ui/todos-list.ts
import { ReatomLitElement } from '@reatom/lit'
import { html } from 'lit'

class TodosList extends ReatomLitElement {
  // Just connect to domain atoms - automatic reactivity!
  render() {
    const todos = filteredTodosAtom()
    return html`
      <ul>
        ${todos.map(
          (todo) => html`
            <li>
              <input
                type="checkbox"
                .checked=${todo.completed}
                @change=${() => toggleTodo(todo.id)}
              />
              <span>${todo.text}</span>
            </li>
          `,
        )}
      </ul>
    `
  }
}

/**
 * ### When to Use Atoms in Components
 *
 * Create atoms inside components only for **UI-specific state**:
 * - Modal open/closed state
 * - Form input focus state
 * - Temporary UI interactions
 * - Component-specific animations
 */

// ============ EXAMPLE 3: Component with UI-only state ============
// ui/modal.ts
class Modal extends ReatomLitElement {
  // UI-only state - belongs in component
  private isOpenAtom = atom(false, 'modal.isOpen')

  open() {
    this.isOpenAtom.set(true)
  }

  close() {
    this.isOpenAtom.set(false)
  }

  render() {
    if (!this.isOpenAtom()) return html``
    return html`
      <div class="modal">
        <slot></slot>
        <button @click=${this.close}>Close</button>
      </div>
    `
  }
}

/**
 * ### When to Use Lit Properties
 *
 * Use Lit properties (with static properties) when:
 * - Component will be used in **external systems** without Reatom
 * - Data comes from **non-atom sources** (API responses, events)
 * - You can't require Reatom as a dependency
 * - You need to support **HTML attributes** for declarative usage
 *
 * Example: A shareable component that works both with and without Reatom:
 */

// ============ EXAMPLE 4: Shareable component with Lit properties ============
// ui/button.ts
import { LitElement } from 'lit'

class SharedButton extends LitElement {
  static properties = {
    disabled: { type: Boolean },
    label: { type: String },
  }

  declare disabled: boolean
  declare label: string

  render() {
    return html`
      <button ?disabled=${this.disabled} @click=${this._handleClick}>
        ${this.label}
      </button>
    `
  }

  private _handleClick() {
    this.dispatchEvent(
      new CustomEvent('button-click', {
        detail: { label: this.label },
        bubbles: true,
        composed: true,
      }),
    )
  }
}

/**
 * ### Choosing Between Approaches
 *
 * **Use domain atoms (separate files) when:**
 * - Data represents business logic or domain entities
 * - State needs to be shared across components
 * - You want to test business logic independently
 * - State should persist beyond component lifecycle
 *
 * **Use component atoms (UI-only) when:**
 * - State is purely UI-related
 * - State doesn't need to be shared
 * - State is temporary or ephemeral
 *
 * **Use Lit properties when:**
 * - Component is part of a public library
 * - External consumers don't use Reatom
 * - You need HTML attribute support
 * - Data comes from non-Reatom sources
 *
 * ### Benefits of This Architecture
 *
 * **Clear separation of concerns:**
 * - Business logic is testable without UI
 * - UI components are focused only on rendering
 * - Domain knowledge lives in one place
 *
 * **Automatic reactivity:**
 * - No manual prop drilling
 * - No complex event handling
 * - Updates propagate automatically
 *
 * **Flexibility:**
 * - Components can be reused with different data sources
 * - Business logic can evolve independently
 * - Easy to integrate with different frameworks
 *
 * **Better testing:**
 * - Test business logic without DOM
 * - Test UI with mock atoms
 * - Clear test boundaries
 */

/**
 * ## Best Practices for Organization
 *
 * **Separate concerns**
 *
 * - Model files: atoms, actions, computed values
 * - Component files: UI implementation
 * - Type files: TypeScript interfaces and types
 *
 * **Feature-based structure**
 *
 * - Group related atoms and components by feature
 * - Features/todos/, features/auth/, features/settings/
 * - Easier to find and maintain related code
 *
 * **Export selectively**
 *
 * - Only export what other modules need
 * - Keep internal atoms and actions private
 * - Use explicit imports for better tree-shaking
 *
 * **Name your atoms**
 *
 * - Always provide a name when creating atoms
 * - Helps with debugging and DevTools
 * - Makes cause tracking clearer
 *
 * **Use TypeScript**
 *
 * - Leverage type safety for atoms and actions
 * - Define clear interfaces for your state
 * - Better IDE support and fewer errors
 */
