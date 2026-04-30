import { expect, test } from 'vitest'

import { buildResource } from './buildResource.ts'

test('creates resource with attributes', () => {
  expect(buildResource({ 'service.name': 'my-app' })).toEqual({
    attributes: [{ key: 'service.name', value: { stringValue: 'my-app' } }],
  })
})

test('creates resource with empty attributes', () => {
  expect(buildResource({})).toEqual({ attributes: [] })
})
