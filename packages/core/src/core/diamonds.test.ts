import { expect, subscribe, test } from 'test'

import type { GenericExt } from './'
import { _read, atom, computed, isConnected, notify, withTap } from './'

test('diamonds', () => {
  const name = 'diamonds'

  let atomCalls = 0
  const withTouch = withTap(() => atomCalls++) as GenericExt

  let computedCalls = 0

  const a1 = atom(0, `${name}.a1`).extend(withTouch)
  const a2 = computed(() => {
    computedCalls++
    return a1() + a1() - a1()
  }, `${name}.a2`).extend(withTouch)
  const a3 = computed(() => {
    computedCalls++
    return a1()
  }, `${name}.a3`).extend(withTouch)
  const a4 = computed(() => {
    computedCalls++
    return a2() + a3()
  }, `${name}.a4`).extend(withTouch)
  const a5 = computed(() => {
    computedCalls++
    return a2() + a3()
  }, `${name}.a5`).extend(withTouch)
  const a6 = computed(() => {
    computedCalls++
    return a4() + a5()
  }, `${name}.a6`).extend(withTouch)

  const track = subscribe(a6)

  for (const a of [a1, a2, a3, a4, a5, a6]) {
    expect(isConnected(a), `"${a.name}" should not be stale`).toBe(true)
  }

  expect(atomCalls).toBe(8)
  expect(computedCalls).toBe(5)
  expect(track).toBeCalledTimes(1)
  expect(track).toBeCalledWith(0)
  expect(_read(a1)!.subs).toEqual([a2, a2, a2, a3])
  expect(_read(a2)!.subs).toEqual([a4, a5])
  expect(_read(a3)!.subs).toEqual([a4, a5])

  atomCalls = 0
  computedCalls = 0
  a1.set(1)
  notify()
  expect(atomCalls).toBe(6)
  expect(computedCalls).toBe(5)
  expect(track).toBeCalledTimes(2)
  expect(track).toBeCalledWith(4)

  track.unsubscribe()
  for (const a of [a1, a2, a3, a4, a5, a6]) {
    expect(isConnected(a), `"${a.name}" should not be stale`).toBe(false)
  }
})
