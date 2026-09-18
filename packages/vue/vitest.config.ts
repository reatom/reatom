import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    sequence: { groupOrder: 20 },
    testTimeout: 5000,
    name: '@reatom/vue',
    include: ['./src/**/*.test.ts'],
  },
})
