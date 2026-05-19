import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    sequence: { groupOrder: 16 },
    testTimeout: 5000,
    include: ['./src/**/*.test.ts'],
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      screenshotFailures: false,
      instances: [
        {
          name: 'lit-chromium',
          browser: 'chromium',
        },
      ],
    },
  },
})
