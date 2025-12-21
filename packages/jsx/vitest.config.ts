import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: '@reatom/jsx',
    include: ['./src/**/*.test.tsx'],
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      screenshotFailures: false,
      instances: [
        {
          name: 'jsx-chromium',
          browser: 'chromium',
        },
      ],
    },
  },
})
