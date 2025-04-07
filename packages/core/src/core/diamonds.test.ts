import { expect, subscribe, test, vi } from 'test'
import { _read, Atom, atom, AtomLike, computed, isConnected, root } from './atom'
import { notify } from '../methods'
import { Middleware } from './mix'

test('diamonds', () => {
  const name = 'diamonds'
  let computedCalls = 0
  const middleware = vi.fn<ReturnType<Middleware<AtomLike<number>>>>(
    (next, ...a) => next(...a),
  )
  const a1 = atom(0, `${name}.a1`).mix(() => middleware) as Atom<number>
  const a2 = computed(() => {
    computedCalls++
    return a1() + a1() - a1()
  }, `${name}.a2`).mix(() => middleware)
  const a3 = computed(() => {
    computedCalls++
    return a1()
  }, `${name}.a3`).mix(() => middleware)
  const a4 = computed(() => {
    computedCalls++
    return a2() + a3()
  }, `${name}.a4`).mix(() => middleware)
  const a5 = computed(() => {
    computedCalls++
    return a2() + a3()
  }, `${name}.a5`).mix(() => middleware)
  const a6 = computed(() => {
    computedCalls++
    return a4() + a5()
  }, `${name}.a6`).mix(() => middleware)

  const track = subscribe(a6)

  for (const a of [a1, a2, a3, a4, a5, a6]) {
    expect(isConnected(a), `"${a.name}" should not be stale`).toBe(true)
  }

  expect(computedCalls).toBe(5)
  expect(middleware).toBeCalledTimes(8)
  expect(track).toBeCalledTimes(1)
  expect(_read(a1)!.subs).toEqual([a2, a2, a2, a3])
  expect(_read(a2)!.subs).toEqual([a4, a5])
  expect(_read(a3)!.subs).toEqual([a4, a5])

  computedCalls = 0
  middleware.mockClear()
  a1(1)
  notify()
  expect(computedCalls).toBe(5)
  expect(middleware).toBeCalledTimes(6)
  expect(track).toBeCalledTimes(2)

  track.unsubscribe()
  for (const a of [a1, a2, a3, a4, a5, a6]) {
    expect(isConnected(a), `"${a.name}" should not be stale`).toBe(false)
  }
})
