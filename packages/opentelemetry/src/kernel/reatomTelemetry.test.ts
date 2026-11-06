import { withActionSpans, withActionTracing } from '../actions/index.ts'
import { test, beforeEach } from 'vitest'
import assert from 'node:assert/strict'
import { bind, context, wrap } from '@reatom/core'
import { reatomTelemetry, type TelemetrySink } from './reatomTelemetry.ts'
import { reatomRecordSink } from '../records/index.ts'
import { captureAttributes } from '../capture/index.ts'
import type { CapturedRecord } from '../records.ts'
beforeEach(() => context.reset())
const setup = (maxActive = 1000) => {
  const records: CapturedRecord[] = []
  let released = 0,
    reserved = 0,
    disposed = 0
  const sink: TelemetrySink = {
    reserve() {
      reserved++
      return {
        commit: (r) => records.push(r),
        release: () => {
          released++
        },
      }
    },
    dispose() {
      disposed++
    },
  }
  const telemetry = reatomTelemetry({
    name: 'test',
    resource: { 'service.name': 'test' },
    sink,
    maxActive,
  })
  return {
    telemetry,
    records,
    counts: () => ({ released, reserved, disposed }),
  }
}
test('real span and log share context, immutable start snapshot, canonical records', () => {
  const { telemetry: t, records } = setup()
  const attr = { page: 'A' }
  const span = t.startSpan({ name: 'parent', attributes: attr })!
  attr.page = 'B'
  span.run(() => t.log('event', { ok: true }))
  span.finish()
  assert.equal(records[0].traceId, span.context.traceId)
  assert.equal(records[0].spanId, span.context.spanId)
  assert.equal(records[1].attributes.page, 'A')
  assert.equal(records[1].resourceAttributes['service.name'], 'test')
  assert.ok(Object.isFrozen(records[1]))
  assert.ok(Object.isFrozen(records[1].attributes))
  assert.equal(
    span.traceparent,
    `00-${span.context.traceId}-${span.context.spanId}-01`,
  )
})
test('nested spans inherit the actual parent', () => {
  const { telemetry: t, records } = setup()
  const parent = t.startSpan({ name: 'parent' })!
  const child = parent.run(() => t.startSpan({ name: 'child' })!)
  child.finish()
  parent.finish()
  assert.equal(records[0].traceId, parent.context.traceId)
  assert.equal(records[0].type, 'span')
  assert.equal((records[0] as any).parentSpanId, parent.context.spanId)
})
test('context survives wrapped await in explicit span.run scope', async () => {
  const { telemetry: t, records } = setup()
  const span = t.startSpan({ name: 'async' })!
  await span.run(async () => {
    await wrap(Promise.resolve())
    t.log('after-await')
  })
  assert.equal(records[0].traceId, span.context.traceId)
  assert.equal(records[0].spanId, span.context.spanId)
  span.finish()
})
test('finish and cancel settle exactly once and release capacity', () => {
  const { telemetry: t, records, counts } = setup(1)
  const span = t.startSpan({ name: 'first' })!
  assert.equal(t.startSpan({ name: 'denied' }), undefined)
  span.finish()
  span.finish()
  span.cancel()
  const next = t.startSpan({ name: 'next' })!
  next.cancel()
  next.finish()
  assert.equal(records.length, 1)
  assert.deepEqual(counts(), { released: 2, reserved: 2, disposed: 0 })
})
test('denied admission does not inspect attributes', () => {
  let reads = 0
  const t = reatomTelemetry({
    name: 'denied',
    resource: {},
    sink: { reserve: () => undefined },
  })
  assert.equal(
    t.startSpan({
      name: 'x',
      attributes: {
        get secret() {
          reads++
          return 'x'
        },
      },
    }),
    undefined,
  )
  assert.equal(reads, 0)
})
test('invalid and accessor attributes release reservation without invoking accessor', () => {
  const { telemetry: t, counts } = setup()
  let reads = 0
  assert.throws(
    () =>
      t.startSpan({
        name: 'x',
        attributes: {
          get x() {
            reads++
            return 'bad'
          },
        },
      }),
    /accessor/,
  )
  assert.throws(() => t.log('x', { x: Infinity }), /scalar/)
  assert.throws(() => t.log('x', { x: 'x'.repeat(8192) }), /limit/)
  assert.equal(reads, 0)
  assert.equal(counts().released, 3)
})
test('disabled model neither reserves nor emits', () => {
  const { telemetry: t, records, counts } = setup()
  t.set(false)
  t.log('x')
  assert.equal(t.startSpan({ name: 'x' }), undefined)
  assert.equal(records.length, 0)
  assert.equal(counts().reserved, 0)
})
test('sink exception cannot escape into application; lease still released', () => {
  let released = 0
  const t = reatomTelemetry({
    name: 'bad-sink',
    resource: {},
    sink: {
      reserve: () => ({
        commit() {
          throw Error('offline')
        },
        release() {
          released++
        },
      }),
    },
  })
  assert.doesNotThrow(() => t.log('x'))
  assert.doesNotThrow(() => t.startSpan({ name: 'x' })!.finish())
  assert.equal(released, 2)
})
test('dispose cancels all pending work and is idempotent', () => {
  const { telemetry: t, records, counts } = setup()
  const a = t.startSpan({ name: 'a' })!,
    b = t.startSpan({ name: 'b' })!
  t.dispose()
  t.dispose()
  a.finish()
  b.finish()
  t.log('after')
  assert.deepEqual(counts(), { released: 2, reserved: 2, disposed: 1 })
  assert.equal(records.length, 0)
})
test('bounded local sink evicts oldest; snapshot and clear are live', () => {
  const records = reatomRecordSink(2)
  const t = reatomTelemetry({ name: 'local', resource: {}, sink: records.sink })
  t.log('a')
  const first = records()
  t.log('b')
  t.log('c')
  assert.equal(first.length, 1)
  assert.deepEqual(
    records().map((r) => (r as any).eventName),
    ['b', 'c'],
  )
  records.clear()
  assert.equal(records().length, 0)
  t.log('d')
  t.dispose()
  assert.equal(records().length, 0)
})
test('optional value capture redacts, snapshots nested data, skips getters, handles cycles', () => {
  const { telemetry: t, records } = setup()
  let reads = 0
  const details = { count: 1, token: 'secret' }
  const cyclic: any = {}
  cyclic.self = cyclic
  const prepared = captureAttributes({
    details,
    cyclic,
    get accessor() {
      reads++
      return 'bad'
    },
  })
  details.count = 2
  const span = t.startSpan({ name: 'rich', attributes: prepared })!
  span.finish({ attributes: { done: true } })
  assert.equal(reads, 0)
  assert.deepEqual(
    { ...(records[0].attributes.details as any) },
    { count: 1, token: '[redacted]' },
  )
  assert.equal((records[0].attributes.cyclic as any).self, '[Circular]')
  assert.equal(records[0].attributes.accessor, '[Skipped]')
  assert.ok(Object.isFrozen(records[0].attributes.details))
})
test('separate scope instances keep resources, records and disposal independent', () => {
  const a = setup(),
    b = setup()
  a.telemetry.log('a')
  b.telemetry.log('b')
  a.telemetry.dispose()
  b.telemetry.log('c')
  assert.equal(a.records.length, 1)
  assert.equal(b.records.length, 2)
})
import { action } from '@reatom/core'
test('small action adapter uses the manual span path and captures explicit values', () => {
  const local = reatomRecordSink()
  const t = reatomTelemetry({ name: 'small', resource: {}, sink: local.sink })
  const add = action((a: number, b: number) => a + b, 'add').extend(
    withActionSpans(t, (key, value) => captureAttributes({ [key]: value })),
  )
  assert.equal(add(2, 3), 5)
  assert.equal(local().length, 1)
  assert.deepEqual(local()[0].attributes.params, [2, 3])
  assert.equal(local()[0].attributes.payload, 5)
  t.dispose()
})
test('small automatic adapter records nested async actions and preserves rejected error', async () => {
  const local = reatomRecordSink()
  const t = reatomTelemetry({
    name: 'small-async',
    resource: {},
    sink: local.sink,
  })
  t.extend(withActionTracing())
  try {
    const child = action(async () => {
      await wrap(Promise.resolve())
      return 9
    }, 'child')
    const parent = action(async () => {
      await wrap(Promise.resolve())
      return await wrap(child())
    }, 'parent')
    assert.equal(await parent(), 9)
    const all = local() as readonly any[]
    const p = all.find((r) => r.name === 'parent'),
      c = all.find((r) => r.name === 'child')
    assert.ok(p)
    assert.ok(c)
    assert.equal(c.parentSpanId, p.spanId)
    assert.equal(c.traceId, p.traceId)
    const error = Error('same error')
    const fail = action(async () => {
      throw error
    }, 'fail')
    await assert.rejects(fail(), (candidate) => candidate === error)
    assert.ok(
      local().some(
        (r) =>
          r.type === 'span' && r.name === 'fail' && r.status?.code === 'error',
      ),
    )
  } finally {
    t.dispose()
  }
})
test('small adapter preserves business result when the capture policy throws', () => {
  const { telemetry: t } = setup()
  const run = action(() => 7, 'capture-fails').extend(
    withActionSpans(t, () => {
      throw Error('policy error')
    }),
  )
  assert.equal(run(), 7)
  t.dispose()
})
test('small adapter checks admission before calling value capture', () => {
  let reads = 0
  const { telemetry: t } = setup()
  const run = action(() => 7, 'disabled-capture').extend(
    withActionSpans(t, () => {
      reads++
      return captureAttributes({})
    }),
  )
  t.set(false)
  assert.equal(run(), 7)
  assert.equal(reads, 0)
  t.dispose()
})

test('automatic action control gates targets already instrumented', () => {
  const local = reatomRecordSink()
  const t = reatomTelemetry({
    name: 'control',
    resource: {},
    sink: local.sink,
  }).extend(withActionTracing())
  try {
    const work = action(() => 1, 'controlled-work')
    work()
    t.actions.set(false)
    work()
    t.actions.set(true)
    work()
    assert.equal(local().length, 2)
  } finally {
    t.dispose()
  }
})

test('explicit action configuration replaces automatic capture without adding a second span', () => {
  const local = reatomRecordSink()
  const t = reatomTelemetry({
    name: 'explicit',
    resource: {},
    sink: local.sink,
  }).extend(withActionTracing())
  try {
    const work = action((n: number) => n + 1, 'configured').extend(
      withActionSpans(t, (key, value) => captureAttributes({ [key]: value })),
    )
    assert.equal(work(2), 3)
    assert.equal(local().length, 1)
    assert.deepEqual(local()[0].attributes.params, [2])
    assert.equal(local()[0].attributes.payload, 3)
  } finally {
    t.dispose()
  }
})

test('late action completion does not inspect values after disposal', async () => {
  let settle!: (value: unknown) => void
  let inspections = 0
  const { telemetry } = setup()
  const work = action(
    () =>
      new Promise((resolve) => {
        settle = resolve
      }),
    'pending',
  ).extend(
    withActionSpans(telemetry, (key, value) => {
      inspections++
      return captureAttributes({ [key]: value })
    }),
  )
  const pending = work()
  telemetry.dispose()
  settle({ secret: 'not inspected' })
  await pending
  assert.equal(inspections, 1)
})

test('derived action promises preserve custom own properties and rejection identity', async () => {
  const { telemetry } = setup()
  const error = new Error('exact')
  const result = Object.assign(Promise.reject(error), {
    requestId: 'request-1',
  })
  const work = action(() => result, 'rejecting').extend(
    withActionSpans(telemetry),
  )
  const followed = work()
  assert.equal(followed.requestId, 'request-1')
  await assert.rejects(followed, (received) => received === error)
  telemetry.dispose()
})

test('automatic installation and invocation stay in the owning root', () => {
  const run = context.start(() => bind(<T>(fn: () => T) => fn()))
  const { telemetry, records } = run(() => setup())
  run(() => telemetry.extend(withActionTracing()))
  try {
    const local = run(() => action(() => 1, 'local'))
    const other = action(() => 2, 'other-root')
    run(local)
    local()
    run(other)
    assert.equal(records.length, 1)
    assert.equal(records[0].type === 'span' && records[0].name, 'local')
  } finally {
    run(telemetry.dispose)
  }
})

test('async completion checks the initiating root before inspecting a result', async () => {
  const run = context.start(() => bind(<T>(fn: () => T) => fn()))
  const { telemetry, records } = run(() => setup())
  let resolve!: (value: unknown) => void
  let inspections = 0
  const work = run(() =>
    action(
      () =>
        new Promise((yes) => {
          resolve = yes
        }),
      'scoped',
    ).extend(
      withActionSpans(telemetry, (key, value) => {
        inspections++
        return captureAttributes({ [key]: value })
      }),
    ),
  )
  const pending = run(work)
  run(() => telemetry.set(false))
  resolve({ confidential: 'discarded' })
  await pending
  assert.equal(inspections, 1)
  assert.equal(records.length, 0)
  run(telemetry.dispose)
})

test('a promise that attaches then throws cannot cause late capture or a private unhandled rejection', async () => {
  const { telemetry, records, counts } = setup()
  let reject!: (error: unknown) => void
  const original = new Promise<never>((_resolve, no) => {
    reject = no
  })
  Object.defineProperty(original, 'then', {
    value(...args: unknown[]) {
      Reflect.apply(Promise.prototype.then, original, args)
      throw new Error('hostile then')
    },
  })
  let inspections = 0
  const work = action(() => original, 'hostile').extend(
    withActionSpans(telemetry, (key, value) => {
      inspections++
      return captureAttributes({ [key]: value })
    }),
  )
  assert.equal(work(), original)
  const error = new Error('business failure')
  const observed = Promise.prototype.then.call(
    original,
    undefined,
    (received: unknown) => received,
  )
  reject(error)
  assert.equal(await observed, error)
  assert.equal(inspections, 1)
  assert.equal(records.length, 0)
  assert.equal(counts().released, 1)
  telemetry.dispose()
})
