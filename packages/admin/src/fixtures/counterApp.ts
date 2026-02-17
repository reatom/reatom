import { action, atom } from '@reatom/core'

export function createCounterApp() {
  const count = atom(0, 'count')
  const increment = action(() => count.set((s) => s + 1), 'increment')
  const decrement = action(() => count.set((s) => s - 1), 'decrement')

  return {
    count,
    increment,
    decrement,
  }
}
