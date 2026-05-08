import { playwright } from '@vitest/browser-playwright'
import solid from 'vite-plugin-solid'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [solid()],
  test: {
    testTimeout: 5000,
    name: '@reatom/solid-js-browser',
    include: ['./src/**/*.test.tsx'],
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      screenshotFailures: false,
      instances: [
        {
          name: 'solid-chromium',
          browser: 'chromium',
        },
      ],
    },
  },
})
