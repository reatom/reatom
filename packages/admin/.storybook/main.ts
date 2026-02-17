import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { StorybookConfig } from '@storybook/html-vite'

const dir = dirname(fileURLToPath(import.meta.url))

const config: StorybookConfig = {
  stories: ['../src/stories/**/*.stories.ts'],
  addons: ['@storybook/addon-vitest'],
  framework: '@storybook/html-vite',
  async viteFinal(config) {
    const { mergeConfig } = await import('vite')
    return mergeConfig(config, {
      resolve: {
        alias: {
          '@reatom/core': resolve(dir, '../../core/src'),
          '@reatom/jsx': resolve(dir, '../../jsx/src'),
          test: resolve(dir, '../src/test.ts'),
        },
      },
      esbuild: {
        jsxFactory: 'h',
        jsxFragment: 'hf',
        jsxInject: `import { h, hf } from "@reatom/jsx"`,
      },
    })
  },
}

export default config
