import { context } from '@reatom/core'
import { expect, test } from 'vitest'

import { generateSpanId } from './generateSpanId.ts'
import { spanIdVar } from './spanIdVar.ts'

test('returns undefined when nothing has been set in the current frame', () => {
  context.start(() => {
    expect(spanIdVar.get()).toBeUndefined()
  })
})

test('stores and reads back a SpanId via set/get', () => {
  context.start(() => {
    const id = generateSpanId()
    spanIdVar.set(id)
    expect(spanIdVar.get()).toBe(id)
  })
})

test('value is scoped to the spawn frame and does not leak outwards', () => {
  context.start(() => {
    spanIdVar.spawn(() => {
      spanIdVar.set(generateSpanId())
      expect(spanIdVar.get()).toBeDefined()
    })
    expect(spanIdVar.get()).toBeUndefined()
  })
})
