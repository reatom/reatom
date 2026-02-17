---
title: Organization
description: Organization - Reatom Lit integration
---

Recommendations for organizing your Reatom + Lit code

```ts
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
```

### Choosing Between Approaches

When deciding between domain atoms, component atoms, and Lit properties,
see the dedicated guide:
[When to Use Reatom vs Lit Properties](/handbook/lit/advanced/when-to-use)
for detailed comparison tables and decision matrices.

```ts
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
```

---

← [Memory Management](/handbook/lit/best-practices/memory) | [Performance](/handbook/lit/best-practices/performance) →
