import { defineConfig } from './config/integrations/package-reference.ts'

export const references = await defineConfig([
  '../packages/core/',
  '../packages/jsx/',
])
