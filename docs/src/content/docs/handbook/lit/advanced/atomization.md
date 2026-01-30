---
title: Atomization
description: Atomization - Reatom Lit integration
---

The atomization pattern is especially powerful in Lit components where you
might have lists of items with editable properties

### Benefits of atomization in Lit components:

**1. O(1) updates** - changing a todo's name only updates that specific atom

- No need to recreate entire array or object
- Other items in the list don't re-render

**2. Clean event handlers** - directly modify atom state without dispatchers

- No need to create actions for every property update
- Direct mutation is simple and intuitive

**3. Better debugging** - see exactly which atom changed in DevTools

- Each property has its own atom with a name
- Changes are tracked individually

**4. Reactive lists** - each item can react independently to its own state

- Perfect for lists with editable items
- Each item's changes don't affect others

**5. Use atomization for lists - granular reactivity without full re-renders**

The most powerful benefit of atomization is that when any individual item's
state changes, **only that specific item re-renders** - the entire list component
and all other items remain untouched.

For example, in a todo list with 100 items:

✅ **With atomization:**
  - Editing one todo's name → only that single TodoItem component updates
  - Toggling one todo's completed state → only that specific item re-renders
  - The parent list component does NOT re-render
  - The other 99 items do NOT re-render
  - Lit's scheduling system handles the update efficiently

❌ **Without atomization (traditional approach):**
  - Editing one todo → the entire array changes
  - Parent list component must re-render
  - All 100 items may re-render depending on implementation
  - Much higher performance cost for large lists

This granular reactivity is especially important for:
- Large lists (100+ items)
- Lists with frequently updated items (real-time data, counters, etc.)
- Complex list items with expensive rendering
- Mobile or low-powered devices where performance matters

```ts
import { atom, action, type Atom } from '@reatom/core'
import { ReatomLitElement, watch } from '@reatom/lit'
import { html } from 'lit'

// Each todo item has atomized properties for fine-grained reactivity
type Todo = {
  id: string
  name: Atom<string>
  completed: Atom<boolean>
}

// List of todos
const todos = atom<Todo[]>([], 'todos')

// Action to add a todo
const addTodo = action((name: string) => {
  const id = Date.now().toString()
  todos.set((list) => [
    ...list,
    {
      id,
      name: atom(name, `todo.${id}.name`),
      completed: atom(false, `todo.${id}.completed`),
    },
  ])
}, 'addTodo')

// Component to render a single todo
class TodoItem extends ReatomLitElement {
  declare todo: Todo

  private handleNameChange = (e: InputEvent) => {
    const input = e.target as HTMLInputElement
    this.todo.name.set(input.value)
  }

  private handleToggle = () => {
    this.todo.completed.set((v) => !v)
  }

  override render() {
    const isCompleted = this.todo.completed()
    const textDecoration = isCompleted ? 'line-through' : 'none'

    return html`
      <li style="text-decoration: ${textDecoration}">
        <input
          type="checkbox"
          .checked=${watch(this.todo.completed)}
          @change=${this.handleToggle}
        />
        <input
          type="text"
          .value=${watch(this.todo.name)}
          @input=${this.handleNameChange}
        />
      </li>
    `
  }
}

customElements.define('todo-item', TodoItem)

// Component to render the list
export class AtomizedTodoList extends ReatomLitElement {
  private nameInput = ''

  private handleSubmit = (e: Event) => {
    e.preventDefault()
    if (this.nameInput.trim()) {
      addTodo(this.nameInput)
      this.nameInput = ''
    }
  }

  override render() {
    const todosList = todos()

    return html`
      <div>
        <form @submit=${this.handleSubmit}>
          <input
            type="text"
            placeholder="New todo"
            .value=${this.nameInput}
            @input=${(e: InputEvent) => {
              this.nameInput = (e.target as HTMLInputElement).value
            }}
          />
          <button type="submit">Add</button>
        </form>
        <ul>
          ${todosList.map(
            (todo) => html`<todo-item .todo=${todo}></todo-item>`,
          )}
        </ul>
      </div>
    `
  }
}

customElements.define('atomized-todo-list', AtomizedTodoList)
```

---

← [Async Operations](/handbook/lit/advanced/async-operations) | [Benefits](/handbook/lit/advanced/benefits) →
