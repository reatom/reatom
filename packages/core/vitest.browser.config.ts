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
})
