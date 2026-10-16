import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { StorybookConfig } from '@storybook/html-vite'
import type { InlineConfig } from 'vite'

const dir = dirname(fileURLToPath(import.meta.url))

// `**/*.stories.ts` also matches Vitest failure folders under `__screenshots__`.
const notScreenshotDir = '!(__screenshots__)'
const maxNestedStoryDepth = 6

function storyGlob(directory: string, extensions: string): string {
  const storyFile = `*.stories.@(${extensions})`
  const patterns = [storyFile]
  for (let depth = 1; depth <= maxNestedStoryDepth; depth += 1) {
    const parents = Array.from({ length: depth }, () => notScreenshotDir).join(
      '/',
    )
    patterns.push(`${parents}/${storyFile}`)
  }
  return `${directory}/{${patterns.join(',')}}`
}

const config: StorybookConfig = {
  stories: [
    storyGlob('../src/stories/design-system', 'ts|tsx'),
    '../src/stories/shell/settings.stories.ts',
    '../src/stories/reatom-jsx-xo/gantt.stories.ts',
    storyGlob('../src/stories/chat', 'ts'),
    '../src/stories/otlp/analytics.stories.ts',
    '../src/stories/otlp/clickhouse-gantt.stories.ts',
    '../src/stories/otlp/mount-logs.stories.ts',
  ],
  staticDirs: ['../public'],
  addons: ['@storybook/addon-vitest', '@storybook/addon-a11y'],
  framework: '@storybook/html-vite',
  async viteFinal(config: InlineConfig) {
    const { mergeConfig } = await import('vite')
    return mergeConfig(config, {
      plugins: [
        {
          name: 'watch-chat-example',
          configureServer(server) {
            server.watcher.add(resolve(dir, '../../../examples/chat/src'))
          },
        },
      ],
      optimizeDeps: {
        entries: [
          resolve(dir, '../src/stories/chat/chat.stories.ts'),
          resolve(dir, '../src/stories/chat/live.stories.ts'),
          resolve(dir, '../src/stories/chat/boot.tsx'),
          resolve(dir, '../src/stories/chat/live-boot.tsx'),
        ],
      },
      resolve: {
        alias: {
          '@reatom/admin': resolve(dir, '../src/index.ts'),
          '@reatom/core': resolve(dir, '../../core/src'),
          '@reatom/jsx': resolve(dir, '../../jsx/src'),
          '@reatom/opentelemetry/gdpr': resolve(
            dir,
            '../../opentelemetry/src/gdpr/index.ts',
          ),
          '@reatom/opentelemetry/web-analytics': resolve(
            dir,
            '../../opentelemetry/src/web-analytics/index.ts',
          ),
          '@reatom/opentelemetry': resolve(
            dir,
            '../../opentelemetry/src/index.ts',
          ),
          test: resolve(dir, '../src/test.ts'),
          'chat-app': resolve(dir, '../../../examples/chat/src'),
        },
      },
      oxc: {
        jsx: {
          runtime: 'classic',
          pragma: 'h',
          pragmaFrag: 'hf',
          throwIfNamespace: false,
        },
        jsxInject: `import { h, hf } from "@reatom/jsx"`,
      },
    })
  },
}

export default config
