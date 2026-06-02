import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig, mergeConfig } from 'vitest/config'

import viteConfig from './vite.config'

const dir = dirname(fileURLToPath(import.meta.url))

export default mergeConfig(
  viteConfig,
  defineConfig({
    define: {
      'import.meta.env.TEST': JSON.stringify(true),
    },
    test: {
      testTimeout: 5000,
      projects: [
        {
          test: {
            name: 'unit',
            include: ['./src/**/*.test.ts'],
            exclude: ['./src/**/*.stories.*', './.storybook/**'],
            environment: 'node',
          },
        },
        {
          extends: true,
          plugins: [
            storybookTest({
              configDir: join(dir, '.storybook'),
              storybookScript: 'npm run storybook -- --no-open',
            }),
          ],
          test: {
            name: 'storybook',
            include: ['./src/**/*.stories.@(ts|tsx)'],
            exclude: ['./src/**/*.test.ts'],
            browser: {
              enabled: true,
              provider: playwright(),
              headless: true,
              instances: [{ browser: 'chromium' }],
            },
            setupFiles: [join(dir, '.storybook/vitest.setup.ts')],
          },
        },
      ],
    },
  }),
)
