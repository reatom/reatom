/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    sequence: { groupOrder: 15 },
    testTimeout: 5000,
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
