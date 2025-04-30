/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      test: resolve(__dirname, './src/test.ts'),
    },
  },

  test: {
    workspace: [
      {
        extends: true,
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
      },

      {
        extends: true,
        test: {
          include: ['./src/**/*.test.browser.ts'],
          browser: {
            enabled: true,
            provider: 'playwright',
            headless: true,
            screenshotFailures: false,
            instances: [
              {
                name: 'chromium',
                browser: 'chromium',
              },
            ],
          },
        },
      },
    ],
  },
})
