import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { StorybookConfig } from '@storybook/html-vite'

const dir = dirname(fileURLToPath(import.meta.url))

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-vitest', '@storybook/addon-a11y'],
  framework: '@storybook/html-vite',
  async viteFinal(config) {
    const { mergeConfig } = await import('vite')
    return mergeConfig(config, {
      define: process.env.VITEST
        ? { 'import.meta.env.TEST': JSON.stringify(true) }
        : {},
      esbuild: {
        jsxFactory: 'h',
        jsxFragment: 'hf',
        jsxInject: `import { h, hf } from "@reatom/jsx";`,
      },
    })
  },
}

export default config
