import { utf8Length } from './utf8Length.ts'
import { action, atom, context, wrap } from '@reatom/core'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { reatomOpentelemetry } from './reatom/index.ts'
import { withAttributes } from './attributes/index.ts'

beforeEach(() => context.reset())
afterEach(() => vi.restoreAllMocks())

test('local capture keeps owned structured values and honest statistics without timers', async () => {
  const timer = vi.spyOn(globalThis, 'setTimeout')
  const otel = reatomOpentelemetry({
    name: 'canonical',
    serviceName: 'app',
    roots: ['action'],
    localValues: true,
  })
  try {
    const input = { nested: { value: 1 } }
    const run = action((value: typeof input) => value, 'canonical.run')
    expect(run(input)).toBe(input)
    input.nested.value = 2
    const record = otel
      .records()
      .find(
        (record) => record.type === 'span' && record.name === 'canonical.run',
      )
    expect(record?.type).toBe('span')
    if (record?.type !== 'span') throw new Error('Missing action span')
    expect(record.attributes['reatom.params']).toEqual([
      { nested: { value: 1 } },
    ])
    expect(record.attributes['reatom.payload']).toEqual({
      nested: { value: 1 },
    })
    expect(record.startTimeMs).toEqual(expect.any(Number))
    expect(Object.isFrozen(record)).toBe(true)
    expect(Object.isFrozen(record.attributes)).toBe(true)
    expect(otel.localValuesOf(record)?.params?.[0]).toBe(input)
    expect(otel.stats()).toMatchObject({
      active: 0,
      captured: 1,
      retained: 1,
      dropped: 0,
    })
    expect(otel.stats()).not.toHaveProperty('exported')
    await otel.flush()
    expect(timer.mock.calls.every(([, delay]) => delay === 0)).toBe(true)
  } finally {
    otel.dispose()
  }
})

test('explicit captured identity preserves email and action start identity after await', async () => {
  const identity = atom('before', 'identity')
  const otel = reatomOpentelemetry({
    name: 'identity',
    serviceName: 'app',
    roots: ['action'],
  }).extend(
    withAttributes(() => ({
      'user.id': identity(),
      'user.email': 'person@example.com',
    })),
  )
  try {
    let release!: () => void
    const pending = new Promise<void>((resolve) => {
      release = resolve
    })
    const run = action(async () => {
      await wrap(pending)
      return { ok: true }
    }, 'identity.run')
    const result = run()
    identity.set('after')
    release()
    await result
    const record = otel
      .records()
      .find(
        (record) => record.type === 'span' && record.name === 'identity.run',
      )
    expect(record?.attributes['user.id']).toBe('before')
    expect(record?.attributes['user.email']).toBe('person@example.com')
  } finally {
    otel.dispose()
  }
})

test('a one-record local window stays bounded across repeated captures', () => {
  const otel = reatomOpentelemetry({
    name: 'bounded',
    serviceName: 'app',
    roots: ['action'],
    recordLimit: 1,
  })
  try {
    const run = action((value: number) => value, 'bounded.run')
    for (let value = 0; value < 8; value++) run(value)
    expect(otel.records()).toHaveLength(1)
    expect(otel.records()[0]?.attributes['reatom.payload']).toBe(7)
    expect(otel.stats()).toMatchObject({ captured: 8, retained: 1, active: 0 })
  } finally {
    otel.dispose()
  }
})

test('readonly observable subscribers receive the latest isolated captures without a pull', async () => {
  const otel = reatomOpentelemetry({
    name: 'observable',
    serviceName: 'app',
    roots: ['action'],
  })
  const updates: Array<readonly import('./records.ts').CapturedRecord[]> = []
  const stop = otel.records.subscribe((records) => updates.push(records))
  try {
    const run = action(() => 'ok', 'observable.run')
    context.start(run)
    context.start(run)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(updates.at(-1)).toHaveLength(2)
    const count = updates.length
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(updates).toHaveLength(count)
    expect((otel.records as unknown as { set?: unknown }).set).toBeUndefined()
    const snapshot = otel.records()
    expect(otel.records()).toBe(snapshot)
  } finally {
    stop()
    otel.dispose()
  }
})

test.each([16_384 - 128, 16_384, 2 * 1024 * 1024])(
  'local explicit attribute key bytes are bounded before retention (%i)',
  (keyLength) => {
    const otel = reatomOpentelemetry({
      name: 'key-budget',
      serviceName: 'app',
      recordLimit: 1,
    })
    const key = 'k'.repeat(keyLength)
    try {
      otel.log('key.event', { [key]: 1 })
      const log = otel.records().find((record) => record.type === 'log')
      if (keyLength < 16_384) {
        expect(log?.attributes[key]).toBe(1)
        expect(otel.stats().dropped).toBe(0)
      } else {
        expect(log).toBeUndefined()
        expect(otel.stats().droppedByReason.oversized).toBe(1)
      }
      expect(otel.records()).toHaveLength(1)
    } finally {
      otel.dispose()
    }
  },
)

test.each([
  '',
  'ASCII',
  '\u007f',
  '\u0080',
  '\u07ff',
  '\u0800',
  '汉字',
  '🙂',
  'x\ud800y',
  '\udc00',
  '\ud800\udc00',
  '\ud800\ud800',
  '\udc00\ud800',
])('bounded UTF8 length matches TextEncoder for %j', (value) => {
  const expected = new TextEncoder().encode(value).length
  expect(utf8Length(value)).toBe(expected)
  for (const limit of [0, 1, 2, 3, 5, 16_384]) {
    const length = utf8Length(value, limit)
    if (expected <= limit) expect(length).toBe(expected)
    else {
      expect(length).toBeGreaterThan(limit)
      expect(length).toBeLessThanOrEqual(limit + 4)
    }
  }
})

test.each(['é'.repeat(8192), '🙂'.repeat(4096), '\ud800'.repeat(5462)])(
  'multibyte attribute keys honor the local byte budget',
  (key) => {
    const otel = reatomOpentelemetry({
      name: 'utf8-budget',
      serviceName: 'app',
      recordLimit: 1,
    })
    try {
      otel.log('key.event', { [key]: 1 })
      expect(otel.records().some((record) => record.type === 'log')).toBe(false)
      expect(otel.stats().droppedByReason.oversized).toBe(1)
    } finally {
      otel.dispose()
    }
  },
)

test('explicit byte attributes use owned native copies without application slice or length readers', () => {
  const bytes = new Uint8Array([1, 2, 3])
  const slice = vi.fn(() => bytes)
  const length = vi.fn(() => 0)
  Object.defineProperty(bytes, 'slice', { value: slice })
  Object.defineProperty(bytes, 'byteLength', { get: length })
  const otel = reatomOpentelemetry({
    name: 'native-bytes',
    serviceName: 'app',
    roots: ['action'],
  })
  try {
    action(() => 0, 'native-bytes.run').extend(
      otel.withOTel({ attributes: { bytes } }),
    )()
    const copied = otel.records()[0]?.attributes.bytes
    expect(copied).toEqual(new Uint8Array([1, 2, 3]))
    expect(copied).not.toBe(bytes)
    bytes[0] = 9
    expect(copied).toEqual(new Uint8Array([1, 2, 3]))
    expect(slice).not.toHaveBeenCalled()
    expect(length).not.toHaveBeenCalled()
  } finally {
    otel.dispose()
  }
})

test('construction resource nested values cannot be rewritten through the exposed snapshot', () => {
  const otel = reatomOpentelemetry({
    name: 'resource-owned',
    serviceName: 'app',
    resourceAttributes: { nested: { region: 'before' } },
  })
  try {
    expect(Object.isFrozen(otel.resource.nested)).toBe(true)
    expect(() => {
      ;(otel.resource.nested as { region: string }).region = 'after'
    }).toThrow()
    otel.log('resource.event')
    expect(otel.records().at(-1)?.resourceAttributes.nested).toEqual({
      region: 'before',
    })
  } finally {
    otel.dispose()
  }
})

test('local active admission stays bounded with privileged live values enabled', async () => {
  const otel = reatomOpentelemetry({
    name: 'local-admission',
    serviceName: 'app',
    roots: ['action'],
    maxActive: 1,
    localValues: true,
  })
  let release!: () => void
  const pending = new Promise<void>((resolve) => {
    release = resolve
  })
  try {
    const run = action(async (index: number) => {
      await wrap(pending)
      return index
    }, 'local-admission.run')
    const results = Array.from({ length: 5 }, (_, index) => run(index))
    expect(otel.stats()).toMatchObject({
      active: 1,
      captured: 0,
      retained: 0,
      droppedByReason: { capacity: 4 },
    })
    release()
    expect(await Promise.all(results)).toEqual([0, 1, 2, 3, 4])
    expect(otel.stats()).toMatchObject({
      active: 0,
      captured: 1,
      retained: 1,
      droppedByReason: { capacity: 4 },
    })
    expect(otel.records()).toHaveLength(1)
    expect(otel.localValuesOf(otel.records()[0])?.payload).toBe(0)
  } finally {
    release()
    otel.dispose()
  }
})

test('pending common byte attributes retain operation-start ownership despite overridden application readers', async () => {
  const bytes = new Uint8Array([1, 2, 3])
  const slice = vi.fn(() => bytes)
  const byteLength = vi.fn(() => 0)
  Object.defineProperty(bytes, 'slice', { value: slice })
  Object.defineProperty(bytes, 'byteLength', { get: byteLength })
  const otel = reatomOpentelemetry({
    name: 'temporal-bytes',
    serviceName: 'app',
    roots: ['action'],
  }).extend(withAttributes(() => ({ 'app.bytes': bytes })))
  let release!: () => void
  const pending = new Promise<void>((resolve) => {
    release = resolve
  })
  try {
    const run = action(async () => {
      await wrap(pending)
      return 'ok'
    }, 'temporal-bytes.run')
    const result = run()
    bytes[0] = 9
    release()
    await result
    expect(otel.records()[0]?.attributes['app.bytes']).toEqual(
      new Uint8Array([1, 2, 3]),
    )
    expect(slice).not.toHaveBeenCalled()
    expect(byteLength).not.toHaveBeenCalled()
  } finally {
    release()
    otel.dispose()
  }
})

test('sparse arrays cannot bypass the local capture entry budget', () => {
  const otel = reatomOpentelemetry({
    name: 'sparse-budget',
    serviceName: 'app',
    recordLimit: 1,
  })
  try {
    otel.log('sparse.event', { sparse: new Array(100_000) })
    expect(otel.records().some((record) => record.type === 'log')).toBe(false)
    expect(otel.stats().droppedByReason.oversized).toBe(1)
  } finally {
    otel.dispose()
  }
})

test('explicit attribute arrays do not execute application accessors or map methods', () => {
  const getter = vi.fn(() => 1)
  const accessor = [1]
  Object.defineProperty(accessor, '0', { get: getter })
  const ordinary = [1, 2]
  const map = vi.fn(() => ordinary)
  Object.defineProperty(ordinary, 'map', { value: map })
  const otel = reatomOpentelemetry({
    name: 'array-ownership',
    serviceName: 'app',
  })
  try {
    otel.log('array.rejected', { accessor })
    expect(getter).not.toHaveBeenCalled()
    expect(otel.stats().droppedByReason.observation).toBe(1)
    otel.log('array.owned', { ordinary })
    const record = otel
      .records()
      .find(
        (record) => record.type === 'log' && record.eventName === 'array.owned',
      )
    expect(record?.attributes.ordinary).toEqual([1, 2])
    expect(record?.attributes.ordinary).not.toBe(ordinary)
    expect(map).not.toHaveBeenCalled()
  } finally {
    otel.dispose()
  }
})
