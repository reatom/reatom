import { catalog, expect, reatomCatalog, subscribe, test } from 'test'

import { atom, computed, context, isConnected, notify } from '../core'
import { wrap } from '../methods'
import { sleep } from '../utils'
import { withComputed } from './withComputed'
import { suspense, withSuspense, withSuspenseInit } from './withSuspense'

test('suspense', async () => {
  const data = computed(async () => catalog.page(), 'suspense.data')
  const result = computed(() => {
    return suspense(data)
  }, 'suspense.result')

  const track = subscribe(
    computed(() => {
      try {
        return result()
      } catch {
        return undefined
      }
    }, 'suspense.effect'),
  )

  expect(isConnected(result)).toBe(true)
  expect(isConnected(data)).toBe(true)
  // @ts-expect-error
  expect(isConnected(data.suspended)).toBe(true)

  await wrap(sleep())

  expect(track).toBeCalledTimes(2)
  expect(track).toBeCalledWith(0)

  catalog.page.set(1)
  expect(() => result()).toThrow()

  await wrap(sleep())

  expect(result()).toBe(1)
})

test('suspense with async data', async () => {
  const { list, page } = reatomCatalog('suspenseAsyncData')
  const result = computed(() => suspense(list), 'suspenseAsyncData.result')

  const track = subscribe(
    computed(() => {
      try {
        return result()
      } catch {
        return undefined
      }
    }, 'suspenseAsyncData.effect'),
  )

  await wrap(sleep())

  expect(track).toBeCalledTimes(2)
  expect(track).toBeCalledWith([{ id: 0, title: 'Alpha' }])

  page.set(1)
  expect(() => result()).toThrow()

  await wrap(sleep())

  expect(result()).toEqual([{ id: 1, title: 'Beta' }])
})

test('suspense reject propagation', async () => {
  const name = 'suspenseReject'
  const param = atom(0, `${name}.param`)
  const data = computed(async () => {
    if (param() < 5) throw new Error('error')
    return param()
  }, `${name}.data`)

  let calls = 0
  const result = computed(() => {
    try {
      calls++
      return suspense(data)
    } catch (error) {
      return error
    }
  }, `${name}.result`)

  const track = subscribe(result)

  expect(calls).toBe(1)
  expect(track.mock.lastCall?.[0]).instanceof(Promise)
  await wrap(sleep())
  expect(calls).toBe(2)
  expect(track.mock.lastCall?.[0]).instanceof(Error)

  param.set(10)
  notify()
  expect(calls).toBe(3)
  expect(track.mock.lastCall?.[0]).instanceof(Promise)
  await wrap(sleep())
  expect(calls).toBe(4)
  expect(track).toBeCalledWith(10)
})

test('withSuspense', async () => {
  const name = 'withSuspense'
  const param = atom(0, `${name}.param`)
  const data = computed(async () => param(), `${name}.data`).extend(
    withSuspense(),
  )

  const track = subscribe(data.suspended)
  expect(track).toBeCalledTimes(1)
  await wrap(sleep())
  expect(track).toBeCalledTimes(2)
  expect(track).toBeCalledWith(0)

  param.set(1)
  await wrap(sleep())
  expect(track).toBeCalledTimes(3)
  expect(track).toBeCalledWith(1)
})

test('withSuspenseInit callback', async () => {
  const data = atom<number>(() => null as never).extend(
    withSuspenseInit(async () => {
      await sleep()
      return 1
    }),
  )

  expect(() => data()).toThrowError(Promise)
  await wrap(sleep())
  expect(data()).toBe(1)
})

test('withSuspenseInit unwrap', async () => {
  const data = atom(async () => {
    await sleep()
    return 1
  }).extend(withSuspenseInit())

  expect(() => data()).toThrowError(Promise)
  await wrap(sleep())
  expect(data()).toBe(1)
})

test('withSuspenseInit init params', async () => {
  const data = atom(0).extend(
    withSuspenseInit((init, ...params) =>
      params.length ? init : sleep().then(() => 1),
    ),
  )

  context.start(() => {
    expect(() => data()).toThrowError(Promise)
  })
  context.start(() => {
    // @ts-ignore TODO fix "not" types
    expect(() => data.set(1)).not.toThrow()
    expect(data()).toBe(1)
  })
})

const suspenseRetry = async (cb: () => unknown) => {
  while (true) {
    try {
      return cb()
    } catch (error) {
      if (error instanceof Promise) await wrap(error)
      else throw error
    }
  }
}

test('correct handling of conditional suspense computeds', async () => {
  const suspenseAtom = atom(async () => {
    await wrap(sleep())
    return true
  }).extend(withSuspenseInit())

  const otherSuspenseAtom = atom(async () => {
    await wrap(sleep())
    return false
  }).extend(withSuspenseInit())

  const suspenseProxyDep = atom(0)

  const suspenseProxy = computed(() => {
    suspenseProxyDep()
    return suspenseProxyDep() ? otherSuspenseAtom() : suspenseAtom()
  })

  const component = computed(() => {
    return suspenseProxy()
  })

  await wrap(expect(suspenseRetry(component)).resolves.toBe(true))
  suspenseProxyDep.set(1)
  await wrap(expect(suspenseRetry(component)).resolves.toBe(false))

  suspenseProxyDep.set(0)
  await wrap(sleep())
  expect(component()).toBe(true)

  suspenseProxyDep.set(1)
  await wrap(sleep())
  expect(component()).toBe(false)
})

test('correct handling of immediate sync throw of promise', async () => {
  const suspenseDepAtom = atom(async () => {
    await wrap(sleep())
    return true
  }).extend(withSuspenseInit())

  const otherSuspenseAtom = atom(() => {
    if (suspenseDepAtom()) return true
    return wrap(sleep()).then(() => false)
  }).extend(withSuspenseInit())

  await wrap(expect(suspenseRetry(otherSuspenseAtom)).resolves.toBe(true))
})

test('sync-thrown suspense atom healed via .set notifies passive subscribers', async () => {
  const client = computed(async () => {
    await wrap(sleep())
    return 'CLIENT'
  }).extend(withSuspense())

  const query = atom(() => {
    client.suspended()
    return 'initial'
  }).extend(withSuspenseInit())

  const consumer = computed(() => {
    try {
      return query()
    } catch (error) {
      if (error instanceof Promise) return 'PENDING'
      throw error
    }
  })

  const track = subscribe(consumer)
  expect(track).toHaveBeenCalledWith('PENDING')

  await wrap(sleep())
  query.set('DATA')
  notify()
  await wrap(sleep())

  expect(track).toHaveBeenCalledWith('DATA')
})

// An atom seeded from another suspending atom throws the DEPENDENCY's promise from
// its init: it has no promise of its own, and nothing calls `.set` on it. Once the
// dependency settles, everything reading it through a computed must heal.
const reatomSeededFromSuspendingDependency = (name: string) => {
  const source = atom(async () => {
    await wrap(sleep())
    return { replyId: 'm1' }
  }, `${name}.source`).extend(withSuspenseInit())

  const replyId = atom(() => source().replyId, `${name}.replyId`).extend(
    withSuspenseInit(),
  )

  const reply = computed(() => replyId(), `${name}.reply`)

  const consumer = computed(() => {
    try {
      return reply()
    } catch (error) {
      if (error instanceof Promise) return 'PENDING'
      throw error
    }
  }, `${name}.consumer`)

  return { source, replyId, reply, consumer }
}

test('withSuspenseInit seeded from a suspending dependency heals a subscribed computed', async () => {
  const { consumer } = reatomSeededFromSuspendingDependency(
    'suspenseInitDependencySubscriber',
  )

  const track = subscribe(consumer)
  expect(track).toHaveBeenLastCalledWith('PENDING')

  await wrap(sleep())
  await wrap(sleep())
  notify()

  expect(track).toHaveBeenLastCalledWith('m1')
})

test('withSuspenseInit seeded from a suspending dependency is readable through a connected computed after it settles', async () => {
  const { consumer, reply } = reatomSeededFromSuspendingDependency(
    'suspenseInitDependencyLateReader',
  )

  // Keeps `reply` connected, as a mounted component or an effect would.
  subscribe(consumer)

  await wrap(sleep())
  await wrap(sleep())
  notify()

  // A Suspense retry reads `reply` after the dependency settled. Rethrowing the
  // already-settled promise here makes the boundary retry forever.
  // @ts-ignore TODO fix "not" types
  expect(() => reply()).not.toThrow()
  expect(reply()).toBe('m1')
})

test('withSuspenseInit seeded from a suspending dependency recovers after a repeated read while pending', async () => {
  const { replyId } = reatomSeededFromSuspendingDependency(
    'suspenseInitDependencyRepeatedRead',
  )

  expect(() => replyId()).toThrowError(Promise)
  // The second read reuses the cached frame, so the init runs on a copy of it.
  expect(() => replyId()).toThrowError(Promise)

  await wrap(sleep())
  await wrap(sleep())

  expect(replyId()).toBe('m1')
})

test('withSuspenseInit seeded from a suspending dependency is readable through an unconnected computed after it settles', async () => {
  const { reply } = reatomSeededFromSuspendingDependency(
    'suspenseInitDependencyUnconnected',
  )

  // A component on its first render reads without a subscription.
  expect(() => reply()).toThrowError(Promise)

  await wrap(sleep())
  await wrap(sleep())

  // @ts-ignore TODO fix "not" types
  expect(() => reply()).not.toThrow()
  expect(reply()).toBe('m1')
})

test('withSuspenseInit seeded from two suspending dependencies hands each suspension to connected readers', async () => {
  const name = 'suspenseInitDependencySequential'
  let resolveSecond!: (value: string) => void
  const first = atom(async () => {
    await wrap(sleep())
    return 'first'
  }, `${name}.first`).extend(withSuspenseInit())
  const second = atom(
    () => new Promise<string>((resolve) => (resolveSecond = resolve)),
    `${name}.second`,
  ).extend(withSuspenseInit())
  const seeded = atom(() => `${first()}+${second()}`, `${name}.seeded`).extend(
    withSuspenseInit(),
  )
  const reply = computed(() => seeded(), `${name}.reply`)
  subscribe(
    computed(() => {
      try {
        return reply()
      } catch (error) {
        if (error instanceof Promise) return 'PENDING'
        throw error
      }
    }, `${name}.consumer`),
  )

  const suspension = (): unknown => {
    try {
      return reply()
    } catch (error) {
      return error
    }
  }

  const onFirst = suspension()
  expect(onFirst).toBeInstanceOf(Promise)

  await wrap(sleep())
  await wrap(sleep())
  notify()

  // `first` has settled and `second` is pending: suspend on `second`, not
  // on the settled promise of `first`
  const onSecond = suspension()
  expect(onSecond).toBeInstanceOf(Promise)
  // @ts-ignore TODO fix "not" types
  expect(onSecond).not.toBe(onFirst)

  resolveSecond('second')
  await wrap(sleep())
  notify()

  expect(reply()).toBe('first+second')
})

test('withSuspenseInit seeded from a suspending dependency takes a write while suspended', async () => {
  const { replyId, consumer } = reatomSeededFromSuspendingDependency(
    'suspenseInitDependencyWrite',
  )

  const track = subscribe(consumer)
  expect(track).toHaveBeenLastCalledWith('PENDING')

  // the write takes the place of the init, as a user typing before it loaded
  replyId.set('typed')
  notify()
  expect(track).toHaveBeenLastCalledWith('typed')

  // and the dependency settling later does not override it
  await wrap(sleep())
  await wrap(sleep())
  notify()
  expect(replyId()).toBe('typed')
  expect(track).toHaveBeenLastCalledWith('typed')
})

test('withSuspenseInit suspended on a foreign promise re-runs once it settles', async () => {
  const name = 'suspenseInitForeignSettled'
  let loaded = false
  let resolve!: () => void
  const loading = new Promise<void>((res) => (resolve = res))
  const a = atom(0, `${name}.a`)
  const seeded = atom((): string => {
    a()
    if (!loaded) throw loading
    return 'loaded'
  }, `${name}.seeded`).extend(withSuspenseInit())
  // keeps it connected, as a mounted component would
  subscribe(seeded)
  expect(() => seeded()).toThrowError(Promise)

  loaded = true
  resolve()
  await wrap(sleep())

  // a Suspense retry reads it once the promise settled: nothing it read changed
  expect(seeded()).toBe('loaded')
})

test('withSuspenseInit seeded from a suspending dependency stops following it once initialized', async () => {
  const { source, replyId, consumer } = reatomSeededFromSuspendingDependency(
    'suspenseInitDependencyInitialized',
  )
  const track = subscribe(consumer)

  await wrap(sleep())
  await wrap(sleep())
  notify()
  expect(track).toHaveBeenLastCalledWith('m1')

  // an atom init is read once: a later change of what it read is not followed
  expect(isConnected(source)).toBe(false)
  source.set({ replyId: 'm2' })
  notify()
  expect(replyId()).toBe('m1')
  expect(track).toHaveBeenLastCalledWith('m1')
})

for (const subscribed of [false, true]) {
  test(`withSuspenseInit seeded init that writes what it read and then fails keeps its error, ${subscribed ? 'subscribed' : 'unconnected'}`, () => {
    const name = `suspenseInitOwnWriteFails${subscribed}`
    const never = new Promise<string>(() => {})
    const gate = atom<'open' | 'failed'>('open', `${name}.gate`)
    const seen = atom<'open' | 'failed'>('open', `${name}.seen`)
    let inits = 0
    const seeded = atom((): string => {
      // a cap turns a loop into a failed assertion instead of a frozen worker
      if (++inits > 100) return 'spin'
      // records what it saw, then fails on it
      if (seen() !== gate()) seen.set(gate())
      if (gate() === 'failed') throw new Error('failed')
      throw never
    }, `${name}.seeded`).extend(withSuspenseInit())
    const consumer = computed(() => {
      try {
        return seeded()
      } catch (error) {
        return error instanceof Promise
          ? 'PENDING'
          : `ERROR:${(error as Error).message}`
      }
    }, `${name}.consumer`)
    const track = subscribed ? subscribe(consumer) : null

    expect(() => seeded()).toThrowError(Promise)
    gate.set('failed')
    notify()

    // a failed init has completed: it is not re-run on its own write
    expect(() => seeded()).toThrowError('failed')
    expect(inits).toBe(2)
    if (track) expect(track).toHaveBeenLastCalledWith('ERROR:failed')

    // and no longer follows what it read
    gate.set('open')
    notify()
    expect(() => seeded()).toThrowError('failed')
    expect(inits).toBe(2)

    // it takes writes, as any failed init does
    seeded.set('typed')
    notify()
    expect(seeded()).toBe('typed')
    if (track) expect(track).toHaveBeenLastCalledWith('typed')
  })
}

test('withSuspenseInit init lets go of what only its suspended runs read once it completes', () => {
  const name = 'suspenseInitCompletesNarrower'
  const loading = new Promise<never>(() => {})
  const ready = atom(false, `${name}.ready`)
  const a = atom(0, `${name}.a`)
  const pub = computed(() => a(), `${name}.pub`)
  const seeded = atom((): string => {
    if (!ready()) {
      pub()
      throw loading
    }
    return 'loaded'
  }, `${name}.seeded`).extend(withSuspenseInit())
  const track = subscribe(
    computed(() => {
      try {
        return seeded()
      } catch (error) {
        if (error instanceof Promise) return 'PENDING'
        throw error
      }
    }, `${name}.consumer`),
  )
  expect(isConnected(a)).toBe(true)

  ready.set(true)
  notify()
  expect(track).toHaveBeenLastCalledWith('loaded')
  for (const target of [pub, a, ready]) {
    expect(isConnected(target)).toBe(false)
  }
})

test('withSuspenseInit init with withComputed takes a write while suspended and lets go of what its computed reads', async () => {
  const name = 'suspenseInitComputedWrite'
  let resolve!: (value: number) => void
  const source = atom(
    () => new Promise<number>((res) => (resolve = res)),
    `${name}.source`,
  ).extend(withSuspenseInit())
  const b = atom(0, `${name}.b`)
  const states: unknown[] = []
  const seeded = atom(() => source(), `${name}.seeded`).extend(
    withSuspenseInit(),
    withComputed((state: number) => {
      states.push(state)
      b()
      return state
    }),
  )
  const track = subscribe(
    computed(() => {
      try {
        return seeded()
      } catch (error) {
        if (error instanceof Promise) return 'PENDING'
        throw error
      }
    }, `${name}.consumer`),
  )
  expect(track).toHaveBeenLastCalledWith('PENDING')

  seeded.set(5)
  notify()
  expect(track).toHaveBeenLastCalledWith(5)
  // the computed runs over the written state, never over a missing one
  expect(states).not.toContain(undefined)

  resolve(1)
  await wrap(sleep())
  notify()
  track.unsubscribe()
  notify()
  for (const target of [seeded, source, b]) {
    expect(isConnected(target)).toBe(false)
  }
})

for (const rejoin of [false, true]) {
  test(`withSuspenseInit init with withComputed lets go of what its computed reads once loaded${rejoin ? ', read again after its readers left' : ''}`, async () => {
    const name = `suspenseInitComputed.${rejoin}`
    let resolve!: () => void
    const loading = new Promise<void>((res) => (resolve = res))
    let loaded = false
    loading.then(() => (loaded = true))
    const a = atom(0, `${name}.a`)
    const b = atom(false, `${name}.b`)
    const c = atom(0, `${name}.c`)
    const seeded = atom((): number => {
      a()
      if (!loaded) throw loading
      return 0
    }, `${name}.seeded`).extend(
      withSuspenseInit(),
      withComputed((state) => (b() ? c() : state)),
    )
    const consumer = computed(() => {
      try {
        return seeded()
      } catch (error) {
        if (error instanceof Promise) return 'PENDING'
        throw error
      }
    }, `${name}.consumer`)
    let track = subscribe(consumer)
    expect(track).toHaveBeenLastCalledWith('PENDING')

    resolve()
    await wrap(sleep())
    // a Suspense retry reads it once the promise settled
    expect(seeded()).toBe(0)
    notify()
    expect(track).toHaveBeenLastCalledWith(0)
    if (rejoin) {
      track.unsubscribe()
      notify()
      track = subscribe(consumer)
    }
    b.set(true)
    c.set(1)
    notify()
    expect(track).toHaveBeenLastCalledWith(1)

    track.unsubscribe()
    notify()
    for (const target of [seeded, a, b, c]) {
      expect(isConnected(target)).toBe(false)
    }
  })
}

test('a function init without withSuspenseInit fails on a thrown promise and takes writes', () => {
  const name = 'plainInitSuspends'
  const server = atom(
    () => new Promise<string>(() => {}),
    `${name}.server`,
  ).extend(withSuspenseInit())
  const draft = atom(() => server(), `${name}.draft`)

  expect(() => draft()).toThrowError(Promise)
  // it does not follow what its init read
  subscribe(
    computed(() => {
      try {
        return draft()
      } catch {
        return 'FAILED'
      }
    }, `${name}.consumer`),
  )
  expect(isConnected(server)).toBe(false)
  // the user types while the server value is still loading
  // @ts-ignore TODO fix "not" types
  expect(() => draft.set('typed')).not.toThrow()
  expect(draft()).toBe('typed')
})
