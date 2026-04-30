import { expect, test } from 'vitest'

import { buildInstrumentationScope } from './buildInstrumentationScope.ts'

test('creates scope with name and version', () => {
  expect(buildInstrumentationScope('1.0.0')).toEqual({
    name: '@reatom/opentelemetry',
    version: '1.0.0',
  })
})
