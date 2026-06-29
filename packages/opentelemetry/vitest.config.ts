import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: '@reatom/opentelemetry',
    include: ['./src/**/*.test.ts'],
    isolate: false,
    fileParallelism: false,
  },
})
