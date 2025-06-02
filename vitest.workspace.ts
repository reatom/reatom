import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  './packages/core/vitest.browser.config.ts',
  './packages/core/vitest.config.ts',
  './packages/jsx/vitest.config.ts',
  './packages/lit/vitest.config.ts',
  './packages/preact/vitest.config.ts',
  './packages/react/vitest.config.ts',
  './packages/zod/vitest.config.ts',
])
