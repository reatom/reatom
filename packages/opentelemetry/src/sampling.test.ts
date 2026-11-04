import { action, atom, bind, context } from '@reatom/core'
import { expect, test } from 'vitest'

import { browserCaptureOf, setBrowserMetadata } from './browserCapture.ts'
import { createTraceSampler, resolveSampling } from './sampling.ts'
import { parseSpans, reatomTestTelemetry } from './test-helpers.ts'

const SAMPLED_PARENT = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01'
const SAMPLED_RANDOM_PARENT =
  '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-03'
const UNSAMPLED_PARENT =
  '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-00'
const INCOMING_TRACE_ID = '4bf92f3577b34da6a3ce929d0e0e4736'

type TraceContext = { traceId: string; spanId: string }

type V2Otel = ReturnType<typeof reatomTestTelemetry> & {
  traceVar: { set: (context: TraceContext) => void }
  traceparent: () => string | undefined
  parseTraceparent: (
    header: string | null | undefined,
  ) => TraceContext | undefined
}

type FactoryInput = Parameters<typeof reatomTestTelemetry>[0] & {
  name?: string
  sampling?: {
    ratio?: number
    by?: 'trace' | 'session'
    updates?: number
    errors?: 'always'
  }
}

const start = (extra: Partial<FactoryInput> = {}) => {
  const bodies: string[] = []
  const run = context.start(() => bind(<T>(callback: () => T) => callback()))
  const otel = reatomTestTelemetry({
    name: 't018-sampling',
    endpoint: 'https://collector.invalid',
    serviceName: 't018-sampling',
    filter: (target) => target.name.startsWith('samp.'),
    retry: { maxRetries: 0 },
    batchInterval: 100_000,
    fetch: async (_url, init) => {
      bodies.push(String(init?.body))
      return new Response(null)
    },
    ...extra,
  } as Parameters<typeof reatomTestTelemetry>[0]) as V2Otel
  const spans = () => bodies.flatMap(parseSpans)
  return { run, otel, spans, bodies }
}

const continueParent = (otel: V2Otel, header: string, child: () => unknown) => {
  const remote = otel.parseTraceparent(header)
  if (remote) otel.traceVar.set(remote)
  return child()
}

test('a sampled parent keeps children even when the head ratio is 0', async () => {
  const { run, otel, spans } = start({ sampling: { ratio: 0 } })
  let outgoing: string | undefined
  try {
    const child = run(() =>
      action(() => {
        outgoing = otel.traceparent()
        return 'child'
      }, 'samp.child'),
    )
    const parent = run(() =>
      action(() => continueParent(otel, SAMPLED_PARENT, child), 'samp.parent'),
    )
    expect(run(parent)).toBe('child')
    expect(outgoing).toMatch(/-01$/)
    expect(outgoing?.slice(3, 35)).toBe(INCOMING_TRACE_ID)
    await otel.flush()
    const names = spans()
      .map((span) => span.name)
      .sort()
    expect(names).toEqual(['samp.child', 'samp.parent'])
    expect(new Set(spans().map((span) => span.traceId))).toEqual(
      new Set([INCOMING_TRACE_ID]),
    )
  } finally {
    otel.dispose()
  }
})

test('an unsampled parent does not independently keep children even when the head ratio is 1', async () => {
  const { run, otel, spans } = start({ sampling: { ratio: 1 } })
  let outgoing: string | undefined
  try {
    const child = run(() =>
      action(() => {
        outgoing = otel.traceparent()
        return 'child'
      }, 'samp.child'),
    )
    const parent = run(() =>
      action(
        () => continueParent(otel, UNSAMPLED_PARENT, child),
        'samp.parent',
      ),
    )
    expect(run(parent)).toBe('child')
    expect(outgoing).toMatch(/-00$/)
    expect(outgoing?.slice(3, 35)).toBe(INCOMING_TRACE_ID)
    await otel.flush()
    expect(spans().map((span) => span.name)).toEqual([])
    expect(otel.otlp.stats().active).toBe(0)
  } finally {
    otel.dispose()
  }
})

test('a remote parent with flags 03 is sampled (flags & 0x01) and outgoing flags are 01', async () => {
  const { run, otel, spans } = start({ sampling: { ratio: 0 } })
  let outgoing: string | undefined
  try {
    const child = run(() =>
      action(() => {
        outgoing = otel.traceparent()
        return 'child'
      }, 'samp.child'),
    )
    const parent = run(() =>
      action(
        () => continueParent(otel, SAMPLED_RANDOM_PARENT, child),
        'samp.parent',
      ),
    )
    expect(run(parent)).toBe('child')
    expect(outgoing).toMatch(/-01$/)
    expect(outgoing).not.toMatch(/-03$/)
    expect(outgoing?.slice(3, 35)).toBe(INCOMING_TRACE_ID)
    await otel.flush()
    const names = spans()
      .map((span) => span.name)
      .sort()
    expect(names).toEqual(['samp.child', 'samp.parent'])
    expect(new Set(spans().map((span) => span.traceId))).toEqual(
      new Set([INCOMING_TRACE_ID]),
    )
    expect(otel.otlp.stats().active).toBe(0)
  } finally {
    otel.dispose()
  }
})

test('default sampler is parent-based: ratio 1 is not a bare TraceIdRatioBased that samples children of an unsampled parent', async () => {
  const { run, otel, spans } = start({
    sampling: { ratio: 1, by: 'trace' },
  })
  try {
    const child = run(() => action(() => 'child', 'samp.leaf'))
    const parent = run(() =>
      action(() => continueParent(otel, UNSAMPLED_PARENT, child), 'samp.root'),
    )
    expect(run(parent)).toBe('child')
    await otel.flush()
    expect(spans()).toEqual([])
    expect(otel.otlp.stats().active).toBe(0)
  } finally {
    otel.dispose()
  }
})

test('sampled-out traces do not export atom-update logs', async () => {
  const { run, otel, bodies } = start({
    sampling: { ratio: 0 },
    keepRecords: true,
  })
  try {
    const write = run(() => {
      const flag = atom(false, 'samp.flag')
      return action(() => {
        flag.set(true)
        return true
      }, 'samp.write')
    })
    expect(run(write)).toBe(true)
    await otel.flush()
    expect(bodies.join('')).not.toContain('reatom.atom.update')
    expect(bodies.join('')).not.toContain('samp.flag')
    expect(JSON.stringify(otel.records())).toContain('samp.flag')
  } finally {
    otel.dispose()
  }
})

test("errors: 'always' (default) keeps the erroring action tree of an unsampled parent", async () => {
  const failure = new Error('samp-error')
  const { run, otel, spans } = start({ sampling: { ratio: 0 } })
  try {
    const boom = run(() =>
      action(() => {
        throw failure
      }, 'samp.boom'),
    )
    const parent = run(() =>
      action(() => continueParent(otel, UNSAMPLED_PARENT, boom), 'samp.parent'),
    )
    let caught: unknown
    try {
      run(parent)
    } catch (error) {
      caught = error
    }
    expect(caught).toBe(failure)
    await otel.flush()
    const names = spans()
      .map((span) => span.name)
      .sort()
    expect(names).toEqual(['samp.boom', 'samp.parent'])
    expect(new Set(spans().map((span) => span.traceId))).toEqual(
      new Set([INCOMING_TRACE_ID]),
    )
  } finally {
    otel.dispose()
  }
})

test('TraceSampler.decisions stays capped at 1024 and evicts the oldest id', () => {
  const sampler = createTraceSampler(
    () => resolveSampling({ ratio: 1 }),
    () => 'b'.repeat(32),
  )
  const pinned = 'f'.repeat(32)
  sampler.remote(pinned, false)
  let max = 0
  for (let index = 0; index < 1024; index++) {
    sampler.root(index.toString(16).padStart(32, '0'))
    max = Math.max(max, sampler.decisionCount())
  }
  expect(max).toBe(1024)
  expect(sampler.decisionCount()).toBe(1024)
  expect(sampler.of(pinned)).toEqual({ sampled: true, remote: false })
  expect(sampler.decisionCount()).toBe(1024)
})

test('session sampling gates public logs and browser diagnostics while keeping local records', async () => {
  const { otel, bodies } = start({
    sampling: { by: 'session', ratio: 0 },
    keepRecords: true,
  })
  try {
    setBrowserMetadata(otel, () => ({ 'session.id': 'captured-session' }))
    const browser = browserCaptureOf(otel)!
    const pending = browser.span({ name: 'sampled.browser', startTimeMs: 1 })!
    otel.log('sampled.public')
    browser.log({ eventName: 'sampled.diagnostic', timeMs: 1 })
    pending.finish({ endTimeMs: 2, error: true })
    await otel.flush()
    expect(bodies.join('')).not.toContain('sampled.')
    expect(JSON.stringify(otel.records())).toContain('sampled.public')
    expect(JSON.stringify(otel.records())).toContain('sampled.diagnostic')
    expect(JSON.stringify(otel.records())).toContain('sampled.browser')
  } finally {
    otel.dispose()
  }
})

test('session decisions rotate even when the explicit trace id stays the same', () => {
  let session = 'one'
  const sampler = createTraceSampler(
    () => resolveSampling({ by: 'session', ratio: 0.5 }),
    () => session,
    (id) => id === 'two',
  )
  expect(sampler.of('same-trace').sampled).toBe(false)
  session = 'two'
  expect(sampler.of('same-trace').sampled).toBe(true)
  expect(sampler.of('same-trace', 'one').sampled).toBe(false)
  sampler.remote('remote-trace', false)
  expect(sampler.of('remote-trace', 'two')).toEqual({
    sampled: false,
    remote: true,
  })
})

for (const sampled of [false, true]) {
  test(`async rejection retains capture-time session admission (${sampled}) after rotation and sampling change`, async () => {
    const { otel, bodies, run } = start({
      sampling: { by: 'session', ratio: sampled ? 1 : 0 },
      warnContextLoss: false,
      keepRecords: true,
    })
    let session = 'old-session'
    setBrowserMetadata(otel, () => ({ 'session.id': session }))
    let reject!: (reason: unknown) => void
    const pending = new Promise<void>((_resolve, rejectPromise) => {
      reject = rejectPromise
    })
    const failure = new Error('session rejection')
    const command = run(() => action(() => pending, 'samp.session-reject'))
    try {
      const observed = run(() => command())
      const rejection = observed.catch((error) => error)
      session = 'new-session'
      otel.set((options) => ({
        ...options,
        sampling: { by: 'trace', ratio: sampled ? 0 : 1 },
      }))
      reject(failure)
      expect(await rejection).toBe(failure)
      await otel.flush()
      expect(JSON.stringify(otel.records())).toContain('old-session')
      const wire = bodies.join('')
      expect(wire.includes('old-session')).toBe(sampled)
      expect(wire.includes('exception')).toBe(sampled)
    } finally {
      reject(failure)
      otel.dispose()
    }
  })
}
