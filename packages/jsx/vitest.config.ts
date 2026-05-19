import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  oxc: {
    jsx: {
      runtime: 'classic',
      pragma: 'h',
      pragmaFrag: 'hf',
      throwIfNamespace: false,
      development: false,
    },
  },
  test: {
    sequence: { groupOrder: 13 },
    testTimeout: 5000,
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
