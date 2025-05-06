import { defineConfig } from './config/integrations/package-reference'

export const adapters = await defineConfig([
  '../packages/lit/',
  '../packages/preact/',
  '../packages/react/',
  '../packages/vue/',
])
