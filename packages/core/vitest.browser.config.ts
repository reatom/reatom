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
    name: '@reatom/core-browser',
    include: ['./src/**/*.test.browser.ts'],
    // inspectBrk: true,
    // fileParallelism: false,
    browser: {
      enabled: true,
      provider: 'playwright',
      headless: true,
      screenshotFailures: false,
      instances: [
        {
          name: 'core-chromium',
          browser: 'chromium',
        },
      ],
    },
  },
})
