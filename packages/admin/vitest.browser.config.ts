import { playwright } from '@vitest/browser-playwright'
import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

import {
  startVideoRecording,
  stopVideoRecording,
} from './src/test.browser/video-commands'

const recordVideo = process.env.RECORD_VIDEO === '1'

export default defineConfig({
  define: {
    'import.meta.env.RECORD_VIDEO': JSON.stringify(recordVideo),
  },
  esbuild: {
    jsxFactory: 'h',
    jsxFragment: 'hf',
    jsxInject: `import { h, hf } from "@reatom/jsx"`,
  },
  resolve: {
    alias: {
      '@reatom/core': resolve(__dirname, '../core/src'),
      '@reatom/jsx': resolve(__dirname, '../jsx/src'),
      test: resolve(__dirname, './src/test.ts'),
    },
  },

  test: {
    name: '@reatom/admin-browser',
    include: ['./src/**/*.test.browser.ts'],
    isolate: true,
    fileParallelism: true,
    browser: {
      enabled: true,
      provider: playwright(),
      commands: {
        startVideoRecording,
        stopVideoRecording,
      },
      headless: true,
      screenshotFailures: false,
      instances: [
        {
          name: 'admin-chromium',
          browser: 'chromium',
        },
      ],
    },
  },
})
