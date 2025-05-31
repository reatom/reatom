/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'
import preact from '@preact/preset-vite'

export default defineConfig({
  plugins: [preact()],
  test: {
    include: ['./src/**/*.test.tsx'],
    browser: {
      enabled: true,
      provider: 'playwright',
      headless: true,
      screenshotFailures: false,
      instances: [
        {
          name: 'preact-chromium',
          browser: 'chromium',
        },
      ],
    },
  },
})
