import { expect, test } from 'test'

import type { AdminFrame, CausePredicate, FilterPredicate } from '../types'
import {
  type AtomRegistry,
  evaluatePredicate,
  type FrameIndex,
  matchError,
  matchRegex,
  matchSession,
  matchText,
  matchTimeRange,
} from './predicates'

const atomRegistry: AtomRegistry = new Map([
  ['a1', { id: 'a1', name: 'counter', isReactive: true }],
  ['a2', { id: 'a2', name: 'fetchUser.onReject', isReactive: false }],
  ['a3', { id: 'a3', name: 'submitForm', isReactive: false }],
])

function makeFrame(overrides: Partial<AdminFrame> = {}): AdminFrame {
  return {
    id: 1,
    timestamp: 1000,
    sessionId: 's1',
    atomId: 'a1',
    state: 42,
    error: null,
    params: undefined,
    payload: undefined,
    pubIds: [],
    ...overrides,
  }
}

test('matchText with name target', () => {
  const frame = makeFrame()
  expect(matchText(frame, 'counter', 'name', atomRegistry)).toBe(true)
  expect(matchText(frame, 'count', 'name', atomRegistry)).toBe(true)
  expect(matchText(frame, 'foo', 'name', atomRegistry)).toBe(false)
})

test('matchText with state target', () => {
  const frame = makeFrame({ state: { userId: 123, name: 'Alice' } })
  expect(matchText(frame, '123', 'state', atomRegistry)).toBe(true)
  expect(matchText(frame, 'Alice', 'state', atomRegistry)).toBe(true)
  expect(matchText(frame, 'Bob', 'state', atomRegistry)).toBe(false)
})

test('matchText with params target', () => {
  const frame = makeFrame({ params: ['id1', 456] })
  expect(matchText(frame, 'id1', 'params', atomRegistry)).toBe(true)
  expect(matchText(frame, '456', 'params', atomRegistry)).toBe(true)
})

test('matchText with payload target', () => {
  const frame = makeFrame({ payload: { success: true } })
  expect(matchText(frame, 'success', 'payload', atomRegistry)).toBe(true)
})

test('matchText with all target searches everywhere', () => {
  const frame = makeFrame({
    state: 'secret',
    params: ['x'],
    payload: 'y',
  })
  expect(matchText(frame, 'counter', 'all', atomRegistry)).toBe(true)
  expect(matchText(frame, 'secret', 'all', atomRegistry)).toBe(true)
  expect(matchText(frame, 'x', 'all', atomRegistry)).toBe(true)
  expect(matchText(frame, 'y', 'all', atomRegistry)).toBe(true)
})

test('matchRegex with pattern', () => {
  const frame = makeFrame()
  expect(matchRegex(frame, /count/i, 'name', atomRegistry)).toBe(true)
  expect(matchRegex(frame, '^counter$', 'name', atomRegistry)).toBe(true)
  expect(matchRegex(frame, /^foo/, 'name', atomRegistry)).toBe(false)
})

test('matchTimeRange', () => {
  const frame = makeFrame({ timestamp: 1500 })
  expect(matchTimeRange(frame, 1000, 2000)).toBe(true)
  expect(matchTimeRange(frame, 1500, 1500)).toBe(true)
  expect(matchTimeRange(frame, 2000, 3000)).toBe(false)
  expect(matchTimeRange(frame, 0, 1000)).toBe(false)
})

test('matchError excludes null and abort', () => {
  expect(matchError(makeFrame({ error: null }))).toBe(false)
  expect(
    matchError(
      makeFrame({
        error: Object.assign(new Error('abort'), { name: 'AbortError' }),
      }),
    ),
  ).toBe(false)
})

test('matchError includes real errors', () => {
  const frame = makeFrame({ error: new Error('something broke') })
  expect(matchError(frame)).toBe(true)
})

test('matchError includes onReject frames with error', () => {
  const frame = makeFrame({
    atomId: 'a2',
    error: new Error('fetch failed'),
  })
  expect(matchError(frame)).toBe(true)
})

test('matchSession', () => {
  const frame = makeFrame({ sessionId: 's1' })
  expect(matchSession(frame, 's1')).toBe(true)
  expect(matchSession(frame, 's2')).toBe(false)
})

test('evaluatePredicate text', () => {
  const frame = makeFrame()
  const predicate: FilterPredicate = {
    id: 'p1',
    type: 'text',
    target: 'name',
    value: 'counter',
  }
  expect(evaluatePredicate(frame, predicate, atomRegistry, new Map())).toBe(
    true,
  )
})

test('evaluatePredicate cause direction > walks ancestors', () => {
  const frameIndex: FrameIndex = new Map()
  const frame1 = makeFrame({
    id: 1,
    atomId: 'a1',
    pubIds: [],
  })
  const frame2 = makeFrame({
    id: 2,
    atomId: 'a3',
    pubIds: [1],
  })
  frameIndex.set(1, frame1)
  frameIndex.set(2, frame2)

  const predicate: CausePredicate = {
    id: 'p1',
    type: 'cause',
    direction: '>',
    referencePattern: 'counter',
    value: undefined,
  }
  expect(evaluatePredicate(frame2, predicate, atomRegistry, frameIndex)).toBe(
    true,
  )
  expect(evaluatePredicate(frame1, predicate, atomRegistry, frameIndex)).toBe(
    false,
  )
})

test('evaluatePredicate cause direction < finds descendants', () => {
  const frameIndex: FrameIndex = new Map()
  const frame1 = makeFrame({
    id: 1,
    atomId: 'a1',
    pubIds: [],
  })
  const frame2 = makeFrame({
    id: 2,
    atomId: 'a3',
    pubIds: [1],
  })
  frameIndex.set(1, frame1)
  frameIndex.set(2, frame2)

  const predicate: CausePredicate = {
    id: 'p1',
    type: 'cause',
    direction: '<',
    referencePattern: 'submitForm',
    value: undefined,
  }
  const allFrames = [frame1, frame2]
  expect(
    evaluatePredicate(frame1, predicate, atomRegistry, frameIndex, allFrames),
  ).toBe(true)
})
