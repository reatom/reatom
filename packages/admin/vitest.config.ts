import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@reatom/core': resolve(__dirname, '../core/src'),
      test: resolve(__dirname, './src/test.ts'),
    },
  },

  test: {
    name: '@reatom/admin',
    include: ['./src/**/*.test.ts'],
    exclude: ['./src/**/*.test.browser.ts'],
    isolate: false,
    fileParallelism: false,
  },
})
