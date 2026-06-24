import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: '@reatom/web-analytics',
    include: ['./src/**/*.test.ts'],
    isolate: false,
    fileParallelism: false,
  },
})
