import { action, atom } from '@reatom/core'

export interface Todo {
  id: number
  text: string
  done: boolean
}

export function createTodoApp() {
  const todos = atom<Todo[]>([], 'todos')
  const addTodo = action((text: string) => {
    todos.set((s) => [...s, { id: s.length, text, done: false }])
  }, 'addTodo')
  const toggleTodo = action((id: number) => {
    todos.set((s) => s.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  }, 'toggleTodo')
  const removeTodo = action((id: number) => {
    todos.set((s) => s.filter((t) => t.id !== id))
  }, 'removeTodo')

  return {
    todos,
    addTodo,
    toggleTodo,
    removeTodo,
  }
}
