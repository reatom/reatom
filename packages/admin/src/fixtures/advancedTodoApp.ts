import {
  action,
  atom,
  sleep,
  withAsync,
  withLocalStorage,
  withRollback,
  withTransaction,
  wrap,
} from '@reatom/core'

export interface Todo {
  id: number
  text: string
  done: boolean
}

export const STORAGE_KEY = 'adv-todos-test'

export function createAdvancedTodoApp() {
  const todos = atom<Todo[]>([], 'todos')
    .extend(withRollback())
    .extend(withLocalStorage(STORAGE_KEY))

  const addTodo = action((text: string) => {
    todos.set((s) => [...s, { id: s.length, text, done: false }])
  }, 'addTodo')

  const toggleTodo = action(async (id: number) => {
    todos.set((s) => s.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
    await wrap(sleep(30))
    if (!navigator.onLine) throw new Error('Network unavailable')
  }, 'toggleTodo')
    .extend(withAsync())
    .extend(withTransaction())

  const removeTodo = action((id: number) => {
    todos.set((s) => s.filter((t) => t.id !== id))
  }, 'removeTodo')

  const clearCompleted = action(() => {
    todos.set((s) => s.filter((t) => !t.done))
  }, 'clearCompleted')

  return {
    todos,
    addTodo,
    toggleTodo,
    removeTodo,
    clearCompleted,
  }
}
