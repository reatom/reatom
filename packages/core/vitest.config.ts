import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      test: resolve(__dirname, './src/test.ts'),
    },
  },

  test: {
    sequence: { groupOrder: 10 },
    testTimeout: 5000,
    name: '@reatom/core',
    include: ['./src/**/*.test.ts', './src/**/*.test-d.ts'],
    isolate: false,
    fileParallelism: false,
    typecheck: {
      enabled: true,
      tsconfig: './tsconfig.json',
      include: ['./src/**/*.test-d.ts'],
      ignoreSourceErrors: true,
      allowJs: false,
    },
  },
})
