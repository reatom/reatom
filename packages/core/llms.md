# Reatom for LLM Code Assistants

This guide outlines the core principles and patterns for working with Reatom, a state management library for JavaScript/TypeScript applications. It's designed to help LLM code assistants understand and generate high-quality Reatom code.

> **Important**: Reatom runs all atoms and actions in a separate context, but to start using it this knowledge isn't required as we have a default context (default root). For advanced usage involving server-side rendering or testing, see the [Context System](#context-system) section at the end of this document.

## Core Concepts

### Atoms

Atoms are the fundamental building blocks in Reatom, representing individual pieces of state.

```ts
// Creating an atom with an initial value
const counter = atom(0, 'counter') // Second parameter is the name (recommended for debugging)

// Reading the state
const value = counter() // Returns 0

// Updating the state
counter(5) // Sets value to 5
counter((prev) => prev + 1) // Updates using a function, returns 6
```

### Computed Values and Laziness

Computed atoms derive their value from other atoms, automatically tracking dependencies. Importantly, Reatom implements **lazy evaluation** - computed atoms only recalculate when their value is actually read.

```ts
// Creating a computed atom
const doubledCounter = computed(() => counter() * 2, 'doubledCounter')

// Reading the computed value
const value = doubledCounter() // Returns 12 (based on counter being 6)

// The computation only runs when atom is subscribed
// If doubledCounter() has no subscription, the computation never runs
```

### Subscription

Atoms and computed values can be subscribed to for reactive updates:

```ts
// Subscribe to changes (first call happens immediately)
const unsubscribe = counter.subscribe((value) => {
  console.log('Counter changed:', value)
})

// Later, to stop receiving updates:
unsubscribe()
```

### Actions

Actions encapsulate complex logic, side effects, and business rules. They should be used for operations that go beyond simple state updates.

```ts
// Creating an action for complex operations
const fetchAndUpdateCounter = action(async (userId) => {
  // Complex logic with side effects
  const response = await wrap(fetch(`/api/users/${userId}/count`))
  const data = await wrap(response.json())

  // Update multiple atoms
  counter(data.count)
  lastUpdated(new Date())

  return data
}, 'fetchAndUpdateCounter')

// Calling the action
fetchAndUpdateCounter('user123')
```

**Important**: Don't use actions for simple value propagation. This is a bad practice:

```ts
// ❌ BAD: Using action for simple state update
const setCounter = action((value) => {
  counter(value)
}, 'setCounter')

// ✅ GOOD: Use the atom directly
counter(5) // Direct update is simpler and more efficient
```

Actions are best used when you need to:

1. Orchestrate multiple state changes
2. Perform side effects (API calls, localStorage, etc.)
3. Implement complex business logic
4. Handle errors or implement retry logic

## Extension System

Reatom uses an extension system to enhance atoms and actions with additional functionality.

### Adding Methods to Atoms

Use the `.actions()` method to add related methods to an atom:

```ts
const counter = atom(0, 'counter').actions((target) => ({
  increment: (amount = 1) => target((prev) => prev + amount),
  decrement: (amount = 1) => target((prev) => prev - amount),
  reset: () => target(0),
}))

// Using the methods
counter.increment(5)
counter.decrement()
counter.reset()
```

### Applying Extensions

Use the `.extend()` method to apply extensions that enhance functionality:

```ts
// Apply an extension to add async handling
const fetchUser = action(async (id) => {
  // Fetch user data
  return await api.getUser(id)
}, 'fetchUser').extend(withAsync())

// Now you can check loading state
const isLoading = !fetchUser.ready()
const error = fetchUser.error()
```

## Atomization Pattern

Reatom encourages the "atomization" pattern - representing mutable properties as individual atoms:

```ts
// Instead of one large atom:
// const user = atom({ id: '1', name: 'Alice', email: 'alice@example.com' })

// Use atomization:
const userName = atom('Alice', 'userName')
const userEmail = atom('alice@example.com', 'userEmail')

// Structure can be composed:
const user = { id: '1', name: userName, email: userEmail }

// Direct updates are efficient:
userName('Bob') // Only updates the name atom
```

## Async Operations

Reatom provides tools for handling asynchronous operations:

```ts
// Using withAsync extension
const fetchData = action(async (id) => {
  const response = await wrap(fetch(`/api/data/${id}`))
  return await wrap(response.json())
}, 'fetchData').extend(withAsync())

// Using withAsyncData to store the result
const userData = computed(async () => {
  const id = userId()
  const response = await wrap(fetch(`/api/users/${id}`))
  return await wrap(response.json())
}, 'userData').extend(withAsyncData(null))

// Access data and loading state
const data = userData.data()
const isLoading = !userData.ready()
const error = userData.error()
```

## Context Preservation

Use `wrap()` to preserve reactive context across async boundaries:

```ts
const fetchAndProcess = action(async () => {
  // Without wrap, context would be lost after await
  const data = await wrap(fetch('/api/data').then((r) => r.json()))

  // We can still access and update atoms here
  results(data)
})
```

> **Note**: The reactive context preservation with `wrap()` isn't required by default for basic usage, but it's absolutely essential when writing code that will run in different contexts (like server-side rendering or testing). A positive side effect of using `wrap()` is that the logger can track the causes of async and reactive operations, making debugging much easier.

## Framework Integration

Reatom integrates with popular UI frameworks:

### React

```tsx
// Using reatomComponent for direct atom access
const UserProfile = reatomComponent(() => {
  return (
    <div>
      <h1>{userName()}</h1>
      <p>{userEmail()}</p>
    </div>
  )
})
```

## Best Practices

1. **Name your atoms and actions** for better debugging (second parameter)
2. **Use atomization** for complex state structures
3. **Prefer computed atoms** over deriving data in components
4. **Use extensions** for cross-cutting concerns
5. **Preserve context** with `wrap()` in async operations
6. **Group related state and actions** in domain-specific modules

## Common Patterns

### Form Handling with Atomization

Following the atomization pattern for forms provides better performance and flexibility:

```ts
import { atom, computed, action, parseAtoms, wrap } from '@reatom/core'

// ✅ GOOD: Atomized form fields
const username = atom('', 'username')
const email = atom('', 'email')
const password = atom('', 'password')

// Validation for individual fields
const isUsernameValid = computed(() => username().length > 0, 'isUsernameValid')
const isEmailValid = computed(() => email().includes('@'), 'isEmailValid')
const isPasswordValid = computed(
  () => password().length >= 8,
  'isPasswordValid',
)

// Overall form validation
const isFormValid = computed(
  () => isUsernameValid() && isEmailValid() && isPasswordValid(),
  'isFormValid',
)

// Form submission action
const submitForm = action(async () => {
  if (!isFormValid()) return

  // Use parseAtoms to extract values from atoms
  const formData = parseAtoms({
    username,
    email,
    password,
  })

  await wrap(api.register(formData))

  // Reset form after submission
  username('')
  email('')
  password('')
}, 'submitForm')
```

This approach allows for:

- Granular updates (only affected fields re-render)
- Field-level validation
- Easier integration with UI components

### Real-world Todo App Example

Here's a more realistic example of a todo application using Reatom:

```ts
import { atom, computed, action, parseAtoms, wrap } from '@reatom/core'

// Define the Todo type
interface Todo {
  id: string
  text: string
  completed: boolean
}

// State atoms
const todos = atom<Todo[]>([], 'todos')
const newTodoText = atom('', 'newTodoText')
const filter = atom<'all' | 'active' | 'completed'>('all', 'filter')
const isLoading = atom(false, 'isLoading')

// Computed values
const filteredTodos = computed(() => {
  const currentFilter = filter()
  const allTodos = todos()

  switch (currentFilter) {
    case 'active':
      return allTodos.filter(todo => !todo.completed)
    case 'completed':
      return allTodos.filter(todo => todo.completed)
    default:
      return allTodos
  }
}, 'filteredTodos')

const activeTodoCount = computed(() =>
  todos().filter(todo => !todo.completed).length,
  'activeTodoCount'
)

const hasCompletedTodos = computed(() =>
  todos().some(todo => todo.completed),
  'hasCompletedTodos'
)

// Actions
const addTodo = action(() => {
  const text = newTodoText().trim()
  if (!text) return

  todos(current => [
    ...current,
    { id: Date.now().toString(), text, completed: false }
  ])

  // Clear input field
  newTodoText('')
}, 'addTodo')

const toggleTodo = action((id: string) => {
  todos(current => current.map(todo =>
    todo.id === id ? { ...todo, completed: !todo.completed } : todo
  ))
}, 'toggleTodo')

const removeTodo = action((id: string) => {
  todos(current => current.filter(todo => todo.id !== id))
}, 'removeTodo')

const clearCompleted = action(() => {
  todos(current => current.filter(todo => !todo.completed))
}, 'clearCompleted')

const setFilter = action((newFilter: 'all' | 'active' | 'completed') => {
  filter(newFilter)
}, 'setFilter')

// Async actions
const fetchTodos = action(async () => {
  isLoading(true)

  try {
    const response = await wrap(fetch('/api/todos'))
    const data = await wrap(response.json())
    todos(data)
  } catch (error) {
    console.error('Failed to fetch todos:', error)
  } finally {
    isLoading(false)
  }
}, 'fetchTodos').extend(withAsync())

// React component example
const TodoApp = reatomComponent(() => {
  return (
    <div>
      <header>
        <h1>Todos</h1>
        <input
          value={newTodoText()}
          onChange={e => newTodoText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTodo()}
          placeholder="What needs to be done?"
        />
      </header>

      {isLoading() ? (
        <p>Loading...</p>
      ) : (
        <ul>
          {filteredTodos().map(todo => (
            <li key={todo.id}>
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => toggleTodo(todo.id)}
              />
              <span style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>
                {todo.text}
              </span>
              <button onClick={() => removeTodo(todo.id)}>×</button>
            </li>
          ))}
        </ul>
      )}

      <footer>
        <span>{activeTodoCount()} items left</span>

        <div>
          <button onClick={() => setFilter('all')}>All</button>
          <button onClick={() => setFilter('active')}>Active</button>
          <button onClick={() => setFilter('completed')}>Completed</button>
        </div>

        {hasCompletedTodos() && (
          <button onClick={clearCompleted}>Clear completed</button>
        )}
      </footer>
    </div>
  )
})
```

### Data Fetching with Auto-Cancellation

```ts
import { atom, computed, withAsyncData, wrap } from '@reatom/core'

const userId = atom('user-1', 'userId')

const userProfile = computed(async () => {
  const id = userId()
  const response = await wrap(fetch(`/api/users/${id}`))
  if (!response.ok) throw new Error(`Failed to fetch user ${id}`)
  return await wrap(response.json())
}, 'userProfile').extend(withAsyncData(null))

// When userId changes, previous fetch is automatically cancelled
userId('user-2')
```

The auto-cancellation feature is a powerful aspect of Reatom's async handling which is added by `withAsync` which is included in `withAsyncData`:

1. **How it works**: When a dependency (like `userId`) changes, Reatom automatically aborts any pending async operations from previous computations before they complete.

2. **Why it's important**: This prevents race conditions and stale data. Without auto-cancellation, if you quickly change `userId` multiple times, you might get responses in an unpredictable order, potentially showing outdated data.

3. **Benefits**:
   - Prevents memory leaks
   - Ensures UI always shows data from the most recent request
   - Reduces unnecessary network traffic
   - Eliminates the need for manual cleanup code

### Authentication Flow Example

Here's a realistic authentication flow using Reatom:

```ts
import { atom, computed, action, withAsyncData, wrap } from '@reatom/core'

// State atoms
const user = atom(null, 'user')
const authToken = atom(localStorage.getItem('authToken') || null, 'authToken')
const loginForm = {
  email: atom('', 'loginForm.email'),
  password: atom('', 'loginForm.password'),
  rememberMe: atom(false, 'loginForm.rememberMe')
}

// Computed states
const isAuthenticated = computed(() => !!authToken(), 'isAuthenticated')
const isEmailValid = computed(() => {
  const email = loginForm.email()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}, 'isEmailValid')

const isFormValid = computed(() => {
  return isEmailValid() && loginForm.password().length >= 6
}, 'isFormValid')

// Actions
const login = action(async () => {
  if (!isFormValid()) return { success: false, error: 'Invalid form data' }

  const credentials = {
    email: loginForm.email(),
    password: loginForm.password()
  }

  const response = await wrap(fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  }))

  if (!response.ok) {
    const error = await wrap(response.text())
    return { success: false, error }
  }

  const data = await wrap(response.json())

  // Store token
  authToken(data.token)

  // Save to localStorage if remember me is checked
  if (loginForm.rememberMe()) {
    localStorage.setItem('authToken', data.token)
  }

  // Reset form
  loginForm.email('')
  loginForm.password('')

  return { success: true }
}, 'login').extend(withAsync())

const logout = action(() => {
  // Clear auth data
  authToken(null)
  user(null)
  localStorage.removeItem('authToken')
}, 'logout')

// Fetch user profile when authenticated
const userProfile = computed(async () => {
  const token = authToken()
  if (!token) return null

  const response = await wrap(fetch('/api/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  }))

  if (!response.ok) {
    if (response.status === 401) {
      // Token expired or invalid
      logout()
      return null
    }
    throw new Error('Failed to fetch user profile')
  }

  return await wrap(response.json())
}, 'userProfile').extend(withAsyncData(null))

// Subscribe to user profile changes
userProfile.data.subscribe(userData => {
  if (userData) {
    user(userData)
  }
})

// React component example
const LoginForm = reatomComponent(() => {
  const handleSubmit = (e) => {
    e.preventDefault()
    login()
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Email</label>
        <input
          type="email"
          value={loginForm.email()}
          onChange={e => loginForm.email(e.target.value)}
        />
        {!isEmailValid() && loginForm.email() && (
          <p>Please enter a valid email</p>
        )}
      </div>

      <div>
        <label>Password</label>
        <input
          type="password"
          value={loginForm.password()}
          onChange={e => loginForm.password(e.target.value)}
        />
      </div>

      <div>
        <label>
          <input
            type="checkbox"
            checked={loginForm.rememberMe()}
            onChange={e => loginForm.rememberMe(e.target.checked)}
          />
          Remember me
        </label>
      </div>

      <button type="submit" disabled={!isFormValid() || !login.ready()}>
        {!login.ready() ? 'Logging in...' : 'Login'}
      </button>

      {login.error() && (
        <p>Error: {login.error().message}</p>
      )}
    </form>
  )
})

const UserDashboard = reatomComponent(() => {
  const userData = userProfile.data()

  if (!userData) {
    return <p>Loading user data...</p>
  }

  return (
    <div>
      <h1>Welcome, {userData.name}</h1>
      <button onClick={logout}>Logout</button>
      {/* Dashboard content */}
    </div>
  )
})

const App = reatomComponent(() => {
  return isAuthenticated() ? <UserDashboard /> : <LoginForm />
})
```

### Debugging

```ts
// Enable detailed logging
import { connectLogger } from '@reatom/core'
connectLogger()

// Now all atom updates and action calls will be logged to console
```

## Creating Custom Extensions

You can create your own extensions to add reusable functionality to atoms and actions. **Important**: Always use the built-in `withAssign` and `withMiddleware` helpers rather than writing extensions manually.

### Creating an Assigner Extension

Assigner extensions add properties or methods to atoms:

```ts
import { Atom, action, withAssign } from '@reatom/core'

// Extension that adds a reset method to atoms
const withReset = <T>(initialValue: T) => {
  // Always use withAssign for property extensions
  return withAssign((target: Atom<T>) => ({
    // Return an object with properties to be assigned to the target
    reset: action(() => target(initialValue), `${target.name}.reset`),
  }))
}

// Usage
const counter = atom(0, 'counter').extend(withReset(0))
counter(5)
counter.reset() // Resets to 0
```

### Creating a Middleware Extension

Middleware extensions can intercept and modify atom/action behavior:

```ts
import { AtomLike, withMiddleware } from '@reatom/core'

// Extension that logs all updates to an atom
interface LoggerOptions {
  prefix?: string
}

const withLogger = (options: LoggerOptions = {}) => {
  const { prefix = 'LOG' } = options

  // Always use withMiddleware for behavior extensions
  return withMiddleware((target: AtomLike) => {
    // Return a middleware function
    return (next, ...params) => {
      console.log(`${prefix} [${target.name}] Before:`, params)
      const result = next(...params)
      console.log(`${prefix} [${target.name}] After:`, result)
      return result
    }
  })
}

// Usage
const counter = atom(0, 'counter').extend(withLogger({ prefix: 'DEBUG' }))
counter(5) // Logs before and after the update
```

### Extension Composition

Extensions can be composed together:

```ts
// Create a counter with multiple extensions
const counter = atom(0, 'counter').extend(
  withReset(0),
  withLogger(),
  withChangeHook((state, prevState) => {
    console.log(`Changed from ${prevState} to ${state}`)
  }),
)
```

Remember that Reatom's API is designed to be intuitive and composable. The core principles are:

1. State is stored in atoms
2. Computed values derive from atoms and are lazy
3. Actions encapsulate complex logic and side effects
4. Extensions enhance functionality through composition
5. Atomization improves performance and maintainability
6. Subscriptions enable reactive updates

## Context System

Reatom has a powerful context system that allows atoms and actions to run in isolated environments. This is a critical feature for:

1. **Server-Side Rendering (SSR)**: Each request needs its own isolated state
2. **Testing**: Tests need to run with clean, isolated state
3. **Multiple instances**: Running multiple independent instances of your app

### How the Context System Works

At the core of Reatom's context system is the `STACK` - a global array that tracks the current execution context:

```ts
// The current execution context stack
export let STACK: Array<Frame> = []

// Get the current frame at the top of the stack
export let top = (): Frame => {
  if (STACK.length === 0) {
    throw new ReatomError('missing async stack')
  }
  return STACK[STACK.length - 1]!
}
```

Each "frame" in the stack represents a point in the execution where an atom was accessed or modified. This allows Reatom to:

1. Track dependencies between atoms
2. Ensure reactive updates work correctly
3. Isolate different execution contexts

### Using Different Contexts

To run code in a separate context, use the `root.start()` method:

```ts
// Run a function in a new isolated context
const result = root.start(() => {
  // All atom operations here happen in an isolated context
  counter(5)
  return counter()
})
```

This is particularly useful for:

```ts
// In testing
test('counter increments', () =>
  root.start(() => {
    // Each test runs in its own isolated context
    counter(0)
    counter.increment()
    expect(counter()).toBe(1)
  }))

// In SSR
app.get('/', (req, res) => {
  const html = root.start(() => {
    // Each request gets its own isolated state
    return renderApp()
  })
  res.send(html)
})
```

### Preserving Context Across Async Boundaries

The `wrap()` function is essential for preserving context across async boundaries:

```ts
const fetchData = action(async () => {
  // Without wrap, the context would be lost after the await
  const response = await wrap(fetch('/api/data'))
  const data = await wrap(response.json())

  // Because we used wrap(), we can still access atoms here
  // and they'll be in the same context
  dataAtom(data)
})
```

Without `wrap()`, the async operation would lose the Reatom context, and any atom operations after the await would happen in a different context or fail entirely.
