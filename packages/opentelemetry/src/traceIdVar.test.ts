import { context } from '@reatom/core'
import { expect, test } from 'vitest'

import { generateTraceId } from './generateTraceId.ts'
import { traceIdVar } from './traceIdVar.ts'

test('returns undefined when nothing has been set in the current frame', () => {
  context.start(() => {
    expect(traceIdVar.get()).toBeUndefined()
  })
})

test('stores and reads back a TraceId via set/get', () => {
  context.start(() => {
    const id = generateTraceId()
    traceIdVar.set(id)
    expect(traceIdVar.get()).toBe(id)
  })
})

test('value is scoped to the spawn frame and does not leak outwards', () => {
  context.start(() => {
    traceIdVar.spawn(() => {
      traceIdVar.set(generateTraceId())
      expect(traceIdVar.get()).toBeDefined()
    })
    expect(traceIdVar.get()).toBeUndefined()
  })
})
