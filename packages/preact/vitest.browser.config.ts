import preact from '@preact/preset-vite'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [preact()],
  test: {
    testTimeout: 5000,
    name: '@reatom/preact-browser',
    include: ['./src/**/*.test.tsx'],
    browser: {
      enabled: true,
      provider: playwright(),
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
