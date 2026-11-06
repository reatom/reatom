import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

const dir = dirname(fileURLToPath(import.meta.url))
const storybookIncludeTags = process.env['STORYBOOK_INCLUDE_TAGS']
  ?.split(',')
  .map((tag) => tag.trim())
  .filter(Boolean)

function openRouterKeyFrom(path: string): string {
  if (!existsSync(path)) return ''
  const line = readFileSync(path, 'utf8')
    .split('\n')
    .find((entry) => entry.startsWith('OPENROUTER_API_KEY='))
  if (!line) return ''
  return line
    .slice('OPENROUTER_API_KEY='.length)
    .trim()
    .replace(/^['"]|['"]$/g, '')
}

function readOpenRouterKey(): string {
  const fromEnv = process.env['OPENROUTER_API_KEY']?.trim()
  if (fromEnv) return fromEnv
  const candidates = [
    resolve(dir, '../../.env'),
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '../.env'),
    resolve(process.cwd(), '../../.env'),
  ]
  for (const path of candidates) {
    const value = openRouterKeyFrom(path)
    if (value) return value
  }
  throw new Error(
    `OPENROUTER_API_KEY was not found in the environment or ${candidates.join(', ')}`,
  )
}

const reatomAliases = {
  '@reatom/admin': resolve(dir, './src/index.ts'),
  '@reatom/core': resolve(dir, '../core/src'),
  '@reatom/jsx': resolve(dir, '../jsx/src'),
  '@reatom/opentelemetry': resolve(dir, '../opentelemetry/src/index.ts'),
  test: resolve(dir, './src/test.ts'),
  'chat-app': resolve(dir, '../../examples/chat/src'),
}

export default defineConfig({
  plugins: [
    {
      name: 'watch-chat-example',
      configureServer(server) {
        server.watcher.add(resolve(dir, '../../examples/chat/src'))
      },
    },
  ],
  resolve: {
    alias: reatomAliases,
  },
  optimizeDeps: {
    entries: [
      resolve(dir, 'src/stories/chat/chat.stories.ts'),
      resolve(dir, 'src/stories/chat/live.stories.ts'),
      resolve(dir, 'src/stories/chat/boot.tsx'),
      resolve(dir, 'src/stories/chat/live-boot.tsx'),
    ],
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

  test: {
    sequence: { groupOrder: 12 },
    testTimeout: 180_000,
    projects: [
      {
        extends: true,
        test: {
          name: '@reatom/admin',
          include: ['./src/**/*.test.ts'],
          exclude: ['./src/**/*.test.browser.ts', './src/stories/**'],
          isolate: false,
          fileParallelism: false,
        },
      },
      {
        extends: true,
        plugins: [
          storybookTest({
            configDir: resolve(dir, '.storybook'),
            storybookScript: 'pnpm storybook --no-open',
            tags: storybookIncludeTags?.length
              ? { include: storybookIncludeTags }
              : { exclude: ['@live'] },
          }),
          {
            name: 'reatom-openrouter-key-command',
            configureVitest({ project }) {
              const browser = project.browser as {
                registerCommand?: (
                  name: string,
                  command: () => Promise<string>,
                ) => void
              }
              browser.registerCommand?.('readOpenRouterKey', async () =>
                readOpenRouterKey(),
              )
            },
          },
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: 'chromium' }],
            commands: {
              readOpenRouterKey: async () => readOpenRouterKey(),
            },
          },
          setupFiles: [resolve(dir, '.storybook/vitest.setup.ts')],
        },
      },
    ],
  },
})
