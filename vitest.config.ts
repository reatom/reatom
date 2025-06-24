import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      'packages/*',
      '!packages/eslint-plugin',
      '!packages/core-v1',
      '!packages/core-v2',
      '!packages/react-v1',
      '!packages/react-v2',
    ],
  },
})