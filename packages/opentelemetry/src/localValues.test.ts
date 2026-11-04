import {
  action,
  atom,
  computed,
  context,
  log as LOG,
  notify,
} from '@reatom/core'
import { afterEach, expect, test, vi } from 'vitest'

import { MAX_RECORD_BYTES } from './buildSpan.ts'
import type { LocalValues } from './localValues.ts'
import { installDomStubs, reatomTestTelemetry } from './test-helpers.ts'

const cleanups: Array<() => void> = []

afterEach(() => {
  while (cleanups.length) cleanups.pop()!()
})

const start = (
  extra: Partial<Parameters<typeof reatomTestTelemetry>[0]> = {},
) => {
  const name = `local-values-${Math.random().toString(16).slice(2)}`
  const otel = reatomTestTelemetry({
    name,
    endpoint: null,
    serviceName: 'local-values',
    batchInterval: 100_000,
    maxBatchSize: 100,
    maxQueueSize: 100,
    retry: { maxRetries: 0 },
    useBeacon: false,
    ...extra,
  })
  cleanups.push(() => context.start(() => otel.dispose()))
  return otel
}

type RawRecord = {
  name?: string
  eventName?: string
  attributes?: Record<string, unknown>
}

const isRecord = (value: unknown): value is RawRecord =>
  !!value && typeof value === 'object'

const stringAttr = (record: RawRecord, key: string) => record.attributes?.[key]

const spanNamed = (records: readonly unknown[], name: string) =>
  records.find((record) => isRecord(record) && record.name === name)

const logsNamed = (
  records: readonly unknown[],
  eventName: string,
  name?: string,
) =>
  records.filter(
    (record) =>
      isRecord(record) &&
      record.eventName === eventName &&
      (name === undefined || stringAttr(record, 'reatom.name') === name),
  )

const normalizeJson = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(normalizeJson)
  if (!value || typeof value !== 'object') return value
  const source = value as Record<string, unknown>
  if (typeof source.key === 'string') {
    if (
      source.key === 'service.instance.id' ||
      source.key === 'reatom.frame.id' ||
      source.key === 'reatom.cause.ids'
    ) {
      return { key: source.key, value: '#' }
    }
  }
  const next: Record<string, unknown> = {}
  for (const key of Object.keys(source)) {
    if (
      key === 'traceId' ||
      key === 'spanId' ||
      key === 'parentSpanId' ||
      key.endsWith('UnixNano') ||
      key === 'startTimeMs' ||
      key === 'endTimeMs' ||
      key === 'timeMs' ||
      key === 'service.instance.id' ||
      key === 'reatom.frame.id' ||
      key === 'reatom.cause.ids'
    ) {
      next[key] = '#'
      continue
    }
    next[key] = normalizeJson(source[key])
  }
  return next
}

const sameWork = () => {
  const input = { sku: 'sku-1', password: 'same-secret' }
  const act = action((value: typeof input) => ({ echo: value.sku }), 'lv.same')
  act(input)
  const box = atom(0, 'lv.same.box')
  action(() => box.set(3), 'lv.same.set')()
  LOG('lv-log', input)
  return input
}

test('localValues is off by default and localValuesOf misses every record', () => {
  const otel = start()
  expect(otel().localValues).toBe(false)
  const input = { n: 1 }
  context.start(() => {
    action((value: object) => value, 'lv.default')(input)
    LOG('lv-default-log', input)
  })
  const records = otel.records()
  expect(records.length).toBeGreaterThan(0)
  for (const record of records)
    expect(otel.localValuesOf(record)).toBeUndefined()
  expect(otel.localValuesOf(null)).toBeUndefined()
  expect(otel.localValuesOf(1)).toBeUndefined()
  expect(otel.localValuesOf('lv.default')).toBeUndefined()
})

test('fetch bodies and records JSON match with localValues on and off', async () => {
  const run = async (localValues: boolean) => {
    const calls: Array<{ url: string; body: string }> = []
    const otel = start({
      endpoint: 'https://collector.invalid',
      keepRecords: true,
      localValues,
      fetch: async (url, init) => {
        calls.push({ url: String(url), body: String(init?.body ?? '') })
        return new Response('{}', { status: 200 })
      },
    })
    const input = context.start(sameWork)
    await otel.flush()
    const span = spanNamed(otel.records(), 'lv.same')
    return {
      bodies: calls
        .map(
          (call) =>
            `${call.url}\n${JSON.stringify(normalizeJson(JSON.parse(call.body)))}`,
        )
        .sort(),
      records: JSON.stringify(normalizeJson(otel.records())),
      raw:
        calls.map((call) => call.body).join('\n') +
        JSON.stringify(otel.records()),
      local: span ? otel.localValuesOf(span) : undefined,
      input,
    }
  }
  const off = await run(false)
  const on = await run(true)
  expect(on.bodies).toEqual(off.bodies)
  expect(on.records).toEqual(off.records)
  expect(on.raw).not.toContain('same-secret')
  expect(off.raw).not.toContain('same-secret')
  expect(off.local).toBeUndefined()
  expect(on.local?.params?.[0]).toBe(on.input)
  expect(on.local?.payload).toEqual({ echo: 'sku-1' })
})

test('records JSON matches with localValues on and off when endpoint is null', () => {
  const run = (localValues: boolean) => {
    const fetchMock = vi.fn()
    const otel = start({ localValues, fetch: fetchMock })
    const input = context.start(sameWork)
    const span = spanNamed(otel.records(), 'lv.same')
    return {
      records: JSON.stringify(normalizeJson(otel.records())),
      raw: JSON.stringify(otel.records()),
      fetchMock,
      local: span ? otel.localValuesOf(span) : undefined,
      input,
    }
  }
  const off = run(false)
  const on = run(true)
  expect(on.records).toEqual(off.records)
  expect(on.raw).not.toContain('same-secret')
  expect(off.fetchMock).not.toHaveBeenCalled()
  expect(on.fetchMock).not.toHaveBeenCalled()
  expect(off.local).toBeUndefined()
  expect(on.local?.params?.[0]).toBe(on.input)
})

test('localValuesOf returns the original references', () => {
  const otel = start({ localValues: true })
  class Credential {
    constructor(readonly password: string) {}
  }
  const credential = new Credential('class-sentinel')
  const map = new Map([['k', 'map-sentinel']])
  let deep: Record<string, unknown> = { leaf: 'deep-leaf-sentinel' }
  for (let i = 0; i < 10; i++) deep = { next: deep }
  const huge = 'B'.repeat(1_000_000)
  const secret = { password: 'password-sentinel' }
  const circular: { self?: unknown } = {}
  circular.self = circular
  const error = new Error('boom-sentinel')
  error.stack = `stack-sentinel-${'S'.repeat(10_000)}`
  const next = { live: 'atom-state-sentinel' }
  let logged!: readonly unknown[]

  context.start(() => {
    action(() => credential, 'lv.class')()
    action(() => map, 'lv.map')()
    action(() => deep, 'lv.deep')()
    action(() => huge, 'lv.huge')()
    action(() => secret, 'lv.secret')()
    action(() => circular, 'lv.circular')()
    const fail = action((value: object) => {
      void value
      throw error
    }, 'lv.fail')
    expect(() => fail(secret)).toThrow(error)
    const box = atom({ live: 'atom-old' }, 'lv.box')
    action(() => {
      box.set(next)
    }, 'lv.box.set')()
    logged = LOG('lv-live', secret)
    notify()
  })

  const records = otel.records()
  const raw = JSON.stringify(records)
  expect(raw).not.toContain('class-sentinel')
  expect(raw).not.toContain('map-sentinel')
  expect(raw).toContain('[Map]')
  expect(raw).not.toContain('deep-leaf-sentinel')
  expect(raw).not.toContain(huge)
  expect(raw).not.toContain('password-sentinel')
  expect(raw).not.toContain(error.stack)
  for (const record of records) expect(record).not.toHaveProperty('local')

  const payloadOf = (name: string) => {
    const span = spanNamed(records, name)
    expect(span).toBeDefined()
    return otel.localValuesOf(span)
  }
  expect(payloadOf('lv.class')).toEqual({ params: [], payload: credential })
  expect(payloadOf('lv.class')?.payload).toBe(credential)
  expect(payloadOf('lv.map')?.payload).toBe(map)
  expect(payloadOf('lv.deep')?.payload).toBe(deep)
  expect(payloadOf('lv.huge')?.payload).toBe(huge)
  expect(payloadOf('lv.secret')?.payload).toBe(secret)
  expect(payloadOf('lv.circular')?.payload).toBe(circular)

  const failed = payloadOf('lv.fail')
  expect(failed?.params?.[0]).toBe(secret)
  expect(failed?.error).toBe(error)
  expect((failed?.error as Error).stack).toBe(error.stack)
  const exception = logsNamed(records, 'exception')
  expect(exception).toHaveLength(1)
  expect(otel.localValuesOf(exception[0])?.error).toBe(error)
  expect(otel.localValuesOf(exception[0])).toEqual({ error })

  const update = logsNamed(records, 'reatom.atom.update', 'lv.box')
  expect(update).toHaveLength(1)
  const updateLocal = otel.localValuesOf(update[0])
  expect(updateLocal?.state).toBe(next)
  expect(updateLocal?.params?.[0]).toBe(next)

  const reatomLog = logsNamed(records, 'reatom.log')
  expect(reatomLog.length).toBeGreaterThan(0)
  const logLocal = otel.localValuesOf(reatomLog.at(-1))
  expect(logLocal?.payload).toBe(logged)
  expect(logLocal).toEqual({ payload: logged })
})

test('instance captureValues false and a diagnostics refusal still keep local values', async () => {
  const calls: string[] = []
  const otel = start({
    endpoint: 'https://collector.invalid',
    keepRecords: true,
    localValues: true,
    captureValues: false,
    fetch: async (_url, init) => {
      calls.push(String(init?.body ?? ''))
      return new Response('{}', { status: 200 })
    },
  })
  const secret = { password: 'instance-off-sentinel' }
  context.start(() => {
    action(() => secret, 'lv.capture-off')()
  })
  await otel.flush()
  const span = spanNamed(otel.records(), 'lv.capture-off')
  expect(otel.localValuesOf(span)?.payload).toBe(secret)
  expect(calls.join('\n')).not.toContain('instance-off-sentinel')
  expect(JSON.stringify(otel.records())).not.toContain('instance-off-sentinel')

  const consented = { note: 'consent-sentinel' }
  context.start(() => {
    otel.set((current) => ({
      ...current,
      consent: { diagnostics: false },
    }))
    action(() => consented, 'lv.consent')()
  })
  await otel.flush()
  const consentSpan = spanNamed(otel.records(), 'lv.consent')
  expect(otel.localValuesOf(consentSpan)?.payload).toBe(consented)
  expect(calls.join('\n')).not.toContain('consent-sentinel')
  expect(JSON.stringify(spanNamed(otel.records(), 'lv.consent'))).not.toContain(
    'consent-sentinel',
  )
})

test('per-target captureValues false is skipped for true and kept for all', () => {
  const otel = start({ localValues: true })
  const hidden = { password: 'per-target-sentinel' }
  const shown = { password: 'per-target-all-sentinel' }
  context.start(() => {
    const target = action((value: object) => value, 'lv.hidden').extend(
      otel.withOTel({ captureValues: false }),
    )
    target(hidden)
    expect(
      otel.localValuesOf(spanNamed(otel.records(), 'lv.hidden')),
    ).toBeUndefined()
    otel.set((current) => ({ ...current, localValues: 'all' }))
    target(shown)
  })
  const spans = otel
    .records()
    .filter((record) => isRecord(record) && record.name === 'lv.hidden')
  expect(spans).toHaveLength(2)
  expect(otel.localValuesOf(spans[0])).toBeUndefined()
  expect(otel.localValuesOf(spans[1])?.payload).toBe(shown)
  expect(otel.localValuesOf(spans[1])?.params?.[0]).toBe(shown)
  expect(JSON.stringify(otel.records())).not.toContain(
    'per-target-all-sentinel',
  )
})

test('filter, enabled false, and private names still produce nothing', () => {
  const otel = start({
    localValues: 'all',
    filter: (target) =>
      target.name.startsWith('lv.keep') || target.name.startsWith('_lv'),
  })
  const secret = { password: 'excluded-sentinel' }
  context.start(() => {
    action(() => secret, 'lv.drop')()
    action(() => secret, 'lv.keep')()
    action(() => secret, 'lv.keep.off').extend(
      otel.withOTel({ enabled: false }),
    )()
    action(() => secret, '_lv.private')()
  })
  const names = otel
    .records()
    .filter(isRecord)
    .map((record) => record.name)
    .filter((name) => name?.startsWith('lv.') || name?.startsWith('_lv.'))
  expect(names).toEqual(['lv.keep'])
  expect(
    otel.localValuesOf(spanNamed(otel.records(), 'lv.keep'))?.payload,
  ).toBe(secret)
})

test('an oversized span is stored with values only when localValues is on', () => {
  const version = 'v'.repeat(MAX_RECORD_BYTES + 1)
  const run = (localValues: boolean) => {
    const otel = start({ endpoint: null, localValues, version })
    const payload = { marker: 'oversized-span-sentinel' }
    context.start(() => {
      action(() => payload, 'lv.oversized')()
    })
    return {
      otel,
      payload,
      span: spanNamed(otel.records(), 'lv.oversized'),
      oversized: otel.otlp.stats().droppedByReason.oversized,
    }
  }
  const off = run(false)
  const on = run(true)
  expect(off.span).toBeUndefined()
  expect(off.oversized).toBeGreaterThan(0)
  expect(on.span).toBeDefined()
  expect(on.oversized).toBe(off.oversized)
  expect(on.otel.localValuesOf(on.span)?.payload).toBe(on.payload)
  expect(on.otel.otlp.stats().exported).toBe(0)
})

test('an oversized log is stored with values only when localValues is on', () => {
  const run = (localValues: boolean) => {
    const otel = start({ localValues })
    const next = { live: 'wide-state-sentinel' }
    context.start(() => {
      const box = atom({ live: 'wide-old' }, 'lv.wide').extend(
        otel.withOTel({ attributes: { blob: 'W'.repeat(20_000) } }),
      )
      action(() => {
        box.set(next)
      }, 'lv.wide.touch')()
      notify()
    })
    return {
      otel,
      next,
      update: logsNamed(otel.records(), 'reatom.atom.update', 'lv.wide'),
    }
  }
  const off = run(false)
  const on = run(true)
  expect(off.update).toEqual([])
  expect(on.update).toHaveLength(1)
  expect(on.otel.localValuesOf(on.update[0])?.state).toBe(on.next)
})

test('a full export queue still stores the refused span locally when localValues is on', async () => {
  const run = async (localValues: boolean) => {
    const fetchMock = vi.fn<typeof globalThis.fetch>(
      () => new Promise<Response>(() => {}),
    )
    const otel = start({
      endpoint: 'https://collector.invalid',
      keepRecords: true,
      localValues,
      maxQueueSize: 1,
      maxBatchSize: 1,
      fetch: fetchMock,
    })
    const first = { n: 'cap-first' }
    const second = { n: 'cap-second' }
    context.start(() => {
      action((value: object) => value, 'lv.cap.first')(first)
      action((value: object) => value, 'lv.cap.second')(second)
    })
    await Promise.resolve()
    return {
      otel,
      second,
      fetchMock,
      firstSpan: spanNamed(otel.records(), 'lv.cap.first'),
      secondSpan: spanNamed(otel.records(), 'lv.cap.second'),
      capacity: otel.otlp.stats().droppedByReason.capacity,
    }
  }
  const off = await run(false)
  const on = await run(true)
  expect(off.capacity).toBeGreaterThan(0)
  expect(on.capacity).toBe(off.capacity)
  expect(off.secondSpan).toBeUndefined()
  expect(off.firstSpan).toBeDefined()
  expect(on.secondSpan).toBeDefined()
  expect(on.otel.localValuesOf(on.secondSpan)?.payload).toBe(on.second)
  expect(on.fetchMock).toHaveBeenCalledTimes(1)
  expect(String(on.fetchMock.mock.calls[0]?.[1]?.body)).toContain(
    'lv.cap.first',
  )
  expect(String(on.fetchMock.mock.calls[0]?.[1]?.body)).not.toContain(
    'lv.cap.second',
  )
  expect(on.otel.otlp.stats().exported).toBe(0)
})

test('a full export queue does not store spans without live values locally', async () => {
  const otel = start({
    endpoint: 'https://collector.invalid',
    keepRecords: true,
    localValues: true,
    maxQueueSize: 4,
    maxBatchSize: 1,
    warnContextLoss: false,
    fetch: vi.fn<typeof globalThis.fetch>(
      () => new Promise<Response>(() => {}),
    ),
  })
  context.start(() => {
    for (let index = 0; index < 4; index++) action(() => 1, 'lv.cap.fill')()
    otel.log('lv.cap.public.first')
    otel.log('lv.cap.public.second')
  })
  await Promise.resolve()
  const sessionSpans = otel
    .records()
    .filter((record) => isRecord(record) && record.name === 'app.session')
  expect(sessionSpans).toHaveLength(0)
})

test('options.set toggles localValues at runtime', () => {
  const otel = start()
  const first = { n: 1 }
  const second = { n: 2 }
  const third = { n: 3 }
  context.start(() => {
    const target = action((value: object) => value, 'lv.toggle')
    target(first)
    expect(
      otel.localValuesOf(spanNamed(otel.records(), 'lv.toggle')),
    ).toBeUndefined()
    otel.set((current) => ({ ...current, localValues: true }))
    target(second)
    otel.set((current) => ({ ...current, localValues: false }))
    target(third)
  })
  const spans = otel
    .records()
    .filter((record) => isRecord(record) && record.name === 'lv.toggle')
  expect(spans).toHaveLength(3)
  expect(otel.localValuesOf(spans[0])).toBeUndefined()
  expect(otel.localValuesOf(spans[1])?.payload).toBe(second)
  expect(otel.localValuesOf(spans[2])).toBeUndefined()
})

test('abort, suspense, and pending keep only the specified keys', async () => {
  const dom = installDomStubs()
  cleanups.push(dom.restore)
  const otel = start({
    endpoint: 'https://collector.invalid',
    keepRecords: true,
    localValues: true,
    fetch: async () => new Response('{}', { status: 200 }),
  })
  const abortInput = { id: 'abort-input' }
  const abortError = Object.assign(new Error('abort-sentinel'), {
    name: 'AbortError',
  })
  const suspension = Promise.withResolvers<void>().promise
  const suspenseInput = { id: 'suspense-input' }
  const pendingInput = { id: 'pending-input' }
  const gate = Promise.withResolvers<number>()
  context.start(() => {
    const aborting = action((value: object) => {
      void value
      throw abortError
    }, 'lv.abort')
    expect(() => aborting(abortInput)).toThrow(abortError)
    const suspending = action((value: object) => {
      void value
      throw suspension
    }, 'lv.suspense')
    let thrown: unknown
    try {
      suspending(suspenseInput)
    } catch (error) {
      thrown = error
    }
    expect(thrown).toBe(suspension)
    action((value: object) => {
      void value
      return gate.promise
    }, 'lv.pending')(pendingInput)
  })
  dom.windowListeners.get('pagehide')?.()
  gate.resolve(1)
  await gate.promise

  const abortLocal = otel.localValuesOf(spanNamed(otel.records(), 'lv.abort'))
  expect(abortLocal?.error).toBe(abortError)
  expect(abortLocal?.params?.[0]).toBe(abortInput)
  expect(abortLocal).not.toHaveProperty('payload')

  const suspenseLocal: LocalValues | undefined = otel.localValuesOf(
    spanNamed(otel.records(), 'lv.suspense'),
  )
  expect(suspenseLocal).toEqual({ params: [suspenseInput] })

  const pendingLocal = otel.localValuesOf(
    spanNamed(otel.records(), 'lv.pending'),
  )
  expect(pendingLocal).toEqual({ params: [pendingInput] })
})

test('a computed diamond span keeps the state reference', () => {
  const otel = start({ localValues: true })
  const seen: object[] = []
  context.start(() => {
    const left = atom({ label: 'diamond-old' }, 'lv.left')
    const right = atom(1, 'lv.right')
    const total = computed(() => ({ from: left(), n: right() }), 'lv.total')
    total.subscribe((state) => {
      seen.push(state)
    })
    const setLeft = action(
      () => left.set({ label: 'diamond-left' }),
      'lv.setLeft',
    )
    const setRight = action(() => right.set(2), 'lv.setRight')
    otel.traceVar.set(otel.createTrace({ name: 'lv.trace.left' }))
    setLeft()
    otel.traceVar.set(otel.createTrace({ name: 'lv.trace.right' }))
    setRight()
    notify()
  })
  const diamond = spanNamed(otel.records(), 'lv.total')
  expect(diamond).toBeDefined()
  expect(seen.length).toBeGreaterThan(0)
  expect(otel.localValuesOf(diamond)?.state).toBe(seen.at(-1))
  expect(otel.localValuesOf(diamond)).toEqual({ state: seen.at(-1) })
  const manual = spanNamed(otel.records(), 'lv.trace.left')
  expect(manual).toBeDefined()
  expect(otel.localValuesOf(manual)).toBeUndefined()
})

test('public otel.log records have no local values', () => {
  const otel = start({ localValues: 'all' })
  context.start(() => {
    otel.log('lv.public', { note: 'public-sentinel' })
  })
  const record = logsNamed(otel.records(), 'lv.public')
  expect(record).toHaveLength(1)
  expect(otel.localValuesOf(record[0])).toBeUndefined()
})

test('LOG payloads are kept when capture and logs consent are off', () => {
  const otel = start({
    localValues: true,
    captureValues: false,
  })
  const payload = { token: 'log-consent-sentinel' }
  let logged!: readonly unknown[]
  context.start(() => {
    otel.set((current) => ({
      ...current,
      signals: { logs: false },
    }))
    logged = LOG(payload)
    notify()
  })
  const record = logsNamed(otel.records(), 'reatom.log').at(-1)
  expect(record).toBeDefined()
  expect(otel.localValuesOf(record)?.payload).toBe(logged)
  expect(JSON.stringify(record)).not.toContain('log-consent-sentinel')
})
