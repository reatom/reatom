import {
  notify,
  withTap,
  _read,
  atom,
  computed,
  createAtom,
  isConnected,
  context,
} from './'
import { expect, vi, test, subscribe } from 'test'

test('linking', () => {
  const name = 'linking'
  const a1 = atom(0, `${name}.a1`)
  const a2 = computed(() => a1(), `${name}.a2`)
  const fn = vi.fn()

  const testEffect = computed(() => fn(a2()), `${name}.testEffect`)

  const { store } = context().state

  expect(store.has(testEffect)).toBeFalsy()

  const un = testEffect.subscribe()
  expect(store.has(testEffect)).toBeTruthy()
  expect(fn).toBeCalledTimes(1)
  expect(fn).toBeCalledWith(0)
  const a1Frame = store.get(a1)!
  const a2Frame = store.get(a2)!
  const testEffectFrame = store.get(testEffect)!
  expect(a1Frame.pubs).toEqual([context()])
  expect(a1Frame.subs).toEqual([a2])
  expect(a2Frame.pubs).toEqual([context(), a1Frame])
  expect(a2Frame.subs).toEqual([testEffect])
  expect(testEffectFrame.pubs).toEqual([context(), a2Frame])

  un()

  expect(a1Frame).toBe(store.get(a1)!)
  expect(a2Frame).toBe(store.get(a2)!)
  expect(testEffectFrame).toBe(store.get(testEffect)!)

  expect(a1Frame.subs.length).toBe(0)
  expect(a2Frame.subs.length).toBe(0)
  expect(testEffectFrame.subs.length).toBe(0)
})

test('reading', () => {
  const name = 'reading'
  const a = atom(0, `${name}.a`)
  const bFn = vi.fn(() => a())
  const bMiddleware = vi.fn((state: any) => state)
  const b = computed(bFn, `${name}.b`).extend(withTap(bMiddleware))

  expect(b()).toBe(0)
  expect(b()).toBe(0)
  expect(b()).toBe(0)
  expect(bFn).toBeCalledTimes(1)
  expect(bMiddleware).toBeCalledTimes(3)

  b.subscribe()
  expect(b()).toBe(0)
  expect(b()).toBe(0)
  expect(b()).toBe(0)
  expect(bFn).toBeCalledTimes(1)
  expect(bMiddleware).toBeCalledTimes(4)
})

test('disconnect tail deps', () => {
  const name = 'disconnectTail'
  const aAtom = atom(0, `${name}.aAtom`)
  const track = vi.fn(() => aAtom())
  const bAtom = computed(track, `${name}.bAtom`)
  const isActiveAtom = atom(true, `${name}.isActiveAtom`)
  const bAtomControlled = computed((state?: number) => {
    return isActiveAtom() ? bAtom() : state!
  }, `${name}.bAtomControlled`)

  expect(isConnected(bAtom)).toBe(false)
  bAtomControlled.subscribe()
  expect(track).toBeCalledTimes(1)

  isActiveAtom(false)
  notify()
  expect(isConnected(bAtom)).toBe(false)
  aAtom(aAtom() + 1)
  notify()
  expect(track).toBeCalledTimes(1)
})

test('deps shift', () => {
  const name = 'depsShift'
  const dep0 = atom(0, `${name}.dep0`)
  const dep1 = atom(0, `${name}.dep1`)
  const dep2 = atom(0, `${name}.dep2`)
  const deps = [dep0, dep1, dep2]

  const a = computed(() => deps.forEach((dep) => dep()), `${name}.a`)

  a.subscribe()

  dep0(dep0() + 1)
  notify()
  expect(isConnected(dep0)).toBeTruthy()

  deps.shift()
  dep0(dep0() + 1)
  expect(isConnected(dep0)).toBeTruthy()
  notify()
  expect(isConnected(dep0)).toBeFalsy()
})

test('subscribe to cached atom', () => {
  const name = 'cachedAtom'
  const a1 = atom(0, `${name}.a1`)
  const a2 = computed(() => a1(), `${name}.a2`)

  // First get the value without subscribing
  a2()
  // Then subscribe
  a2.subscribe()

  // Check that a1 has exactly one subscriber
  const a1Frame = _read(a1)
  expect(a1Frame?.subs.length).toBe(1)
})

test('update propagation for atom with listener', () => {
  const name = 'updatePropagation'
  const a1 = atom(0, `${name}.a1`)
  const a2 = computed(() => a1(), `${name}.a2`)
  const a3 = computed(() => a2(), `${name}.a3`)

  const cb2 = subscribe(a2)
  const cb3 = subscribe(a3)

  expect(cb2).toBeCalledTimes(1)
  expect(cb3).toBeCalledTimes(1)

  a1(1)
  notify()

  expect(cb2).toBeCalledTimes(2)
  expect(cb2).toBeCalledWith(1)
  expect(cb3).toBeCalledTimes(2)
  expect(cb3).toBeCalledWith(1)

  cb3.unsubscribe()
  expect(_read(a2)!.subs.length).toBe(1)
  expect(_read(a3)!.subs.length).toBe(0)
  a1(2)
  notify()
  expect(cb2).toBeCalledTimes(3)
  expect(cb2).toBeCalledWith(2)

  a3.subscribe(cb3)
  expect(_read(a2)!.subs.length).toBe(2)

  computed(() => a3()).subscribe()
  expect(_read(a2)!.subs.length).toBe(2)
})

test('conditional deps duplication', () => {
  const name = 'conditionalDeps'
  const condition = atom(true, `${name}.condition`)
  const dep1 = atom(1, `${name}.dep1`)
  const dep2 = atom(2, `${name}.dep2`)

  const conditional = computed(() => {
    if (condition()) {
      return dep1()
    } else {
      return dep2()
    }
  }, `${name}.conditional`)

  const fn = subscribe(computed(() => conditional(), `${name}.testEffect`))

  expect(fn).toBeCalledTimes(1)
  expect(fn).toBeCalledWith(1)

  expect(isConnected(dep1)).toBe(true)
  expect(isConnected(dep2)).toBe(false)

  condition(false)
  notify()
  expect(fn).toBeCalledTimes(2)
  expect(fn).toBeCalledWith(2)

  expect(isConnected(dep1)).toBe(false)
  expect(isConnected(dep2)).toBe(true)

  dep1(10)
  notify()
  expect(fn).toBeCalledTimes(2)

  dep2(20)
  notify()
  expect(fn).toBeCalledTimes(3)
  expect(fn).toBeCalledWith(20)

  condition(true)
  notify()
  expect(fn).toBeCalledTimes(4)
  expect(fn).toBeCalledWith(10)

  expect(isConnected(dep1)).toBe(true)
  expect(isConnected(dep2)).toBe(false)

  fn.unsubscribe()
  expect(isConnected(dep1)).toBe(false)
  expect(isConnected(dep2)).toBe(false)
})

test('computed without dependencies', () => {
  const name = 'noDeps'

  const a = createAtom(
    {
      initState: 0,
      computed: (state) => state + 1,
    },
    `${name}.a`,
  )

  expect(a()).toBe(1)
  expect(a()).toBe(1)
  expect(a(10)).toBe(11)

  a.subscribe()
  expect(a()).toBe(11)
  expect(a()).toBe(11)
  expect(a(100)).toBe(101)
})

test('error tracking', () => {
  const name = 'errorTracking'
  const a = atom(0, `${name}.a`)
  const b = computed(() => {
    const aState = a()
    if (aState < 5) throw new Error('error')
    success = true
    return a()
  }, `${name}.b`)
  computed(() => {
    try {
      b()
    } catch {
      // nothing
    }
  }, `${name}.effect`).subscribe()
  let success = false

  expect(isConnected(b)).toBe(true)
  expect(() => b()).toThrow()

  a(1)
  notify()
  expect(() => b()).toThrow()

  a(10)
  notify()
  expect(success).toBe(true)
  expect(b()).toBe(10)
})

test('middleware connection', () => {
  const name = 'middlewareConnection'
  const before = atom(null, `${name}.before`)
  const after = atom(null, `${name}.after`)
  const target = atom(null, `${name}.target`).extend(
    (middleware) =>
      ((...a: Parameters<typeof middleware>) => {
        before()
        const state = middleware(...a)
        after()
        return state
      }) as typeof middleware,
  )

  target.subscribe()
  expect(isConnected(target)).toBe(true)
  expect(isConnected(before)).toBe(false)
  expect(isConnected(after)).toBe(false)
})

test('computed should not accept params', () => {
  const name = 'computedNoParams'
  const dep = atom(0, `${name}.a`)
  const bComputed = vi.fn(() => dep())
  const lowLevelComputed = createAtom({ computed: bComputed }, `${name}.b`)
  const normalComputed = computed(() => dep(), `${name}.c`)

  expect(lowLevelComputed()).toBe(0)
  expect(lowLevelComputed()).toBe(0)
  expect(normalComputed()).toBe(0)
  expect(bComputed).toBeCalledTimes(1)

  dep((s) => s + 1)
  expect(lowLevelComputed()).toBe(1)
  expect(normalComputed()).toBe(1)
  expect(bComputed).toBeCalledTimes(2)

  expect(lowLevelComputed(2)).toBe(2)
  expect(lowLevelComputed()).toBe(2)
  // @ts-expect-error
  expect(normalComputed(2)).toBe(1)
  expect(normalComputed()).toBe(1)
  expect(bComputed).toBeCalledTimes(2)
})
