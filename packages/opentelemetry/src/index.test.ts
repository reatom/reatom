import { expect, test } from 'vitest'

import * as pkg from './index.ts'

test('exposes the high-level factory and its types', () => {
  expect(typeof pkg.reatomOpentelemetry).toBe('function')
})

test('exposes the three frame-scoped vars', () => {
  expect(pkg.traceIdVar).toBeDefined()
  expect(pkg.spanIdVar).toBeDefined()
  expect(pkg.resourceAttributesVar).toBeDefined()
})
