import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    sequence: { groupOrder: 14 },
    testTimeout: 5000,
    include: ['./src/**/*.test.tsx'],
    browser: {
      enabled: true,
      provider: playwright({
        launchOptions: { args: ['--js-flags=--expose-gc'] },
      }),
      headless: true,
      screenshotFailures: false,
      instances: [
        {
          name: 'react-chromium',
          browser: 'chromium',
        },
      ],
    },
  },
})
