/// <reference types="vitest/config" />
import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      test: resolve(__dirname, './src/test.ts'),
    },
  },

  test: {
    include: ['./src/**/*.test.ts', './src/**/*.test-d.ts'],
    typecheck: {
      enabled: true,
      tsconfig: './tsconfig.json',
      include: ['./src/**/*.test-d.ts'],
      ignoreSourceErrors: true,
      allowJs: false,
    },
  },
})
