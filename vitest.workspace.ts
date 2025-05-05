import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  './packages/jsx/vitest.config.ts',
  './packages/react/vitest.config.ts',
  './packages/core/vitest.config.ts',
  './packages/core/vitest.browser.config.ts',
])
