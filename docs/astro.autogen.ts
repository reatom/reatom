import { defineConfig } from './config/integrations/package-reference.ts'

export const adapters = await defineConfig([
  '../packages/lit/',
  '../packages/preact/',
  '../packages/react/',
  '../packages/vue/',
])

export const packages = await defineConfig([
  '../packages/core/'
])

export const allPackages = [
  ...adapters,
  ...packages,
]
