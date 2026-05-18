import { action, atom, context, sleep, wrap } from '@reatom/core'
import { expect, test, vi } from 'vitest'

import type { SpanInput } from './buildSpan.ts'
import { spanIdVar } from './spanIdVar.ts'
import { HEX_SPAN_ID, HEX_TRACE_ID } from './test-helpers.ts'
import { traceIdVar } from './traceIdVar.ts'
import { createWithOTel } from './withOTel.ts'

const collectSpans = () => {
  const spans: SpanInput[] = []
  const queueSpan = vi.fn((span: SpanInput) => {
    spans.push(span)
  })
  return { spans, queueSpan }
}

test('sync action records a span with name, params, payload, and unset status', () => {
  const { spans, queueSpan } = collectSpans()
  const withOTel = createWithOTel({ queueSpan })

  const greet = action((name: string) => `hi ${name}`, 'greet').extend(withOTel())

  context.start(() => {
    expect(greet('alice')).toBe('hi alice')
  })

  expect(spans).toHaveLength(1)
  expect(spans[0]).toMatchObject({
    name: 'greet',
    attributes: {
      params: '["alice"]',
      payload: 'hi alice',
    },
  })
  // OTel API spec: STATUS_CODE_OK SHOULD only be set by the application,
  // never by instrumentation. Auto-instrumentation leaves status unset.
  expect(spans[0]!.status).toBeUndefined()
  expect(spans[0]!.traceId).toMatch(HEX_TRACE_ID)
  expect(spans[0]!.spanId).toMatch(HEX_SPAN_ID)
  expect(spans[0]!.parentSpanId).toBeUndefined()
  expect(spans[0]!.endTimeMs).toBeGreaterThanOrEqual(spans[0]!.startTimeMs)
})

test('respects kind option override', () => {
  const { spans, queueSpan } = collectSpans()
  const withOTel = createWithOTel({ queueSpan })

  const fetchUser = action(() => 1, 'fetchUser').extend(withOTel({ kind: 'client' }))

  context.start(() => {
    fetchUser()
  })

  expect(spans[0]!.kind).toBe('client')
})

test('nested actions share traceId; inner span has parentSpanId pointing at the outer', () => {
  const { spans, queueSpan } = collectSpans()
  const withOTel = createWithOTel({ queueSpan })

  const inner = action(() => 'inner-result', 'inner').extend(withOTel())
  const outer = action(() => inner(), 'outer').extend(withOTel())

  context.start(() => {
    outer()
  })

  expect(spans).toHaveLength(2)
  // Inner span closes before outer's queueSpan runs, so it lands first.
  const [innerSpan, outerSpan] = spans
  expect(innerSpan!.traceId).toBe(outerSpan!.traceId)
  expect(innerSpan!.parentSpanId).toBe(outerSpan!.spanId)
  expect(outerSpan!.parentSpanId).toBeUndefined()
})

test('async action records span when the promise resolves with unset status', async () => {
  const { spans, queueSpan } = collectSpans()
  const withOTel = createWithOTel({ queueSpan })

  const fetchData = action(async () => {
    await wrap(sleep(0))
    return 'done'
  }, 'fetchData').extend(withOTel())

  await context.start(() => fetchData())

  expect(spans).toHaveLength(1)
  expect(spans[0]).toMatchObject({
    name: 'fetchData',
    attributes: { payload: 'done' },
  })
  expect(spans[0]!.status).toBeUndefined()
})

test('async action records span with error status when the promise rejects', async () => {
  const { spans, queueSpan } = collectSpans()
  const withOTel = createWithOTel({ queueSpan })

  const broken = action(async () => {
    throw new Error('boom')
  }, 'broken').extend(withOTel())

  await context.start(async () => {
    await expect(broken()).rejects.toThrow('boom')
  })

  expect(spans).toHaveLength(1)
  expect(spans[0]!.name).toBe('broken')
  expect(spans[0]!.status?.code).toBe('error')
  expect(spans[0]!.status?.message).toContain('boom')
})

test('synchronous throw in an action records error span and rethrows', () => {
  const { spans, queueSpan } = collectSpans()
  const withOTel = createWithOTel({ queueSpan })

  const broken = action((): number => {
    throw new Error('bad')
  }, 'broken').extend(withOTel())

  context.start(() => {
    expect(() => broken()).toThrow('bad')
  })

  expect(spans).toHaveLength(1)
  expect(spans[0]!.status).toEqual({
    code: 'error',
    message: expect.stringContaining('bad'),
  })
})

// OTel semantic conventions for exceptions: an error span SHOULD carry a
// span event named "exception" with exception.type / .message / .stacktrace
// and exception.escaped=true when the exception leaves the span scope.
// Without this, dashboards lose stack traces — `status.message` is just a
// flat serialize(error), no frame data.
// https://opentelemetry.io/docs/specs/semconv/exceptions/exception-spans/
test('async action rejection emits an `exception` event per OTel semconv', async () => {
  const { spans, queueSpan } = collectSpans()
  const withOTel = createWithOTel({ queueSpan })

  const broken = action(async () => {
    throw new TypeError('boom')
  }, 'broken').extend(withOTel())

  await context.start(async () => {
    await expect(broken()).rejects.toThrow('boom')
  })

  expect(spans).toHaveLength(1)
  expect(spans[0]!.events).toHaveLength(1)
  const event = spans[0]!.events![0]!
  expect(event.name).toBe('exception')
  expect(event.attributes!['exception.type']).toBe('TypeError')
  expect(event.attributes!['exception.message']).toBe('boom')
  expect(event.attributes!['exception.stacktrace']).toEqual(
    expect.stringContaining('boom'),
  )
  expect(event.attributes!['exception.escaped']).toBe(true)
  expect(event.timeMs).toBeGreaterThanOrEqual(spans[0]!.startTimeMs)
  expect(event.timeMs).toBeLessThanOrEqual(spans[0]!.endTimeMs)
})

test('sync action throw emits an `exception` event', () => {
  const { spans, queueSpan } = collectSpans()
  const withOTel = createWithOTel({ queueSpan })

  const broken = action((): number => {
    throw new RangeError('out')
  }, 'broken').extend(withOTel())

  context.start(() => {
    expect(() => broken()).toThrow('out')
  })

  const event = spans[0]!.events![0]!
  expect(event.name).toBe('exception')
  expect(event.attributes!['exception.type']).toBe('RangeError')
  expect(event.attributes!['exception.message']).toBe('out')
})

test('AbortError is control flow — no `exception` event emitted', async () => {
  const { spans, queueSpan } = collectSpans()
  const withOTel = createWithOTel({ queueSpan })

  const aborted = action(async () => {
    throw new DOMException('Aborted', 'AbortError')
  }, 'aborted').extend(withOTel())

  await context.start(async () => {
    await expect(aborted()).rejects.toThrow()
  })

  expect(spans).toHaveLength(1)
  expect(spans[0]!.status).toBeUndefined()
  expect(spans[0]!.events ?? []).toEqual([])
})

test('non-Error throw still records exception event with sane defaults', async () => {
  const { spans, queueSpan } = collectSpans()
  const withOTel = createWithOTel({ queueSpan })

  const broken = action(async () => {
    throw 'string-throw'
  }, 'broken').extend(withOTel())

  await context.start(async () => {
    await expect(broken()).rejects.toBe('string-throw')
  })

  const event = spans[0]!.events![0]!
  expect(event.name).toBe('exception')
  expect(event.attributes!['exception.type']).toBe('Error')
  expect(event.attributes!['exception.message']).toBe('string-throw')
  // No stacktrace available for non-Error throws — skip attribute, don't lie.
  expect(event.attributes!).not.toHaveProperty('exception.stacktrace')
})

test('atom records a span with prev/next state on setter call', () => {
  const { spans, queueSpan } = collectSpans()
  const withOTel = createWithOTel({ queueSpan })

  const counter = atom(0, 'counter').extend(withOTel())

  context.start(() => {
    counter.set(1)
  })

  expect(spans.length).toBeGreaterThanOrEqual(1)
  const transition = spans.find(
    (s) =>
      s.attributes?.prevState === '0' && s.attributes?.nextState === '1',
  )
  expect(transition).toBeDefined()
  expect(transition!.name).toBe('counter')
})

test('inside an entry-point spawn, the var is seeded once and reused across siblings', () => {
  const { spans, queueSpan } = collectSpans()
  const withOTel = createWithOTel({ queueSpan })

  const a = action(() => 'a', 'a').extend(withOTel())
  const b = action(() => 'b', 'b').extend(withOTel())

  context.start(() => {
    traceIdVar.spawn(() => {
      spanIdVar.spawn(() => {
        a()
      })
    })
    traceIdVar.spawn(() => {
      spanIdVar.spawn(() => {
        b()
      })
    })
  })

  expect(spans).toHaveLength(2)
  expect(spans[0]!.traceId).not.toBe(spans[1]!.traceId)
})

test('bare sibling actions in the same context.start get distinct traces', () => {
  const { spans, queueSpan } = collectSpans()
  const withOTel = createWithOTel({ queueSpan })

  const a = action(() => 'a', 'a').extend(withOTel())
  const b = action(() => 'b', 'b').extend(withOTel())

  context.start(() => {
    a()
    b()
  })

  expect(spans).toHaveLength(2)
  expect(spans[0]!.traceId).not.toBe(spans[1]!.traceId)
  expect(spans[0]!.parentSpanId).toBeUndefined()
  expect(spans[1]!.parentSpanId).toBeUndefined()
})

test('repeated calls to the same action get distinct root traces', () => {
  const { spans, queueSpan } = collectSpans()
  const withOTel = createWithOTel({ queueSpan })

  const a = action(() => 'a', 'a').extend(withOTel())

  context.start(() => {
    a()
    a()
  })

  expect(spans).toHaveLength(2)
  expect(spans[0]!.traceId).not.toBe(spans[1]!.traceId)
  expect(spans[0]!.parentSpanId).toBeUndefined()
  expect(spans[1]!.parentSpanId).toBeUndefined()
})

test('repeated calls to the same async action get distinct root traces', async () => {
  const { spans, queueSpan } = collectSpans()
  const withOTel = createWithOTel({ queueSpan })

  const a = action(async () => {
    await wrap(sleep(0))
    return 'a'
  }, 'a').extend(withOTel())

  await context.start(async () => {
    await a()
    await a()
  })

  expect(spans).toHaveLength(2)
  expect(spans[0]!.traceId).not.toBe(spans[1]!.traceId)
  expect(spans[0]!.parentSpanId).toBeUndefined()
  expect(spans[1]!.parentSpanId).toBeUndefined()
})

test('two concurrent async invocations of the same action get distinct root traces', async () => {
  const { spans, queueSpan } = collectSpans()
  const withOTel = createWithOTel({ queueSpan })

  const a = action(async () => {
    await wrap(sleep(0))
    return 'a'
  }, 'a').extend(withOTel())

  await context.start(async () => {
    await Promise.all([a(), a()])
  })

  expect(spans).toHaveLength(2)
  expect(spans[0]!.traceId).not.toBe(spans[1]!.traceId)
  expect(spans[0]!.parentSpanId).toBeUndefined()
  expect(spans[1]!.parentSpanId).toBeUndefined()
})

test('repeated set on the same atom gets distinct root traces', () => {
  const { spans, queueSpan } = collectSpans()
  const withOTel = createWithOTel({ queueSpan })

  const counter = atom(0, 'counter').extend(withOTel())

  context.start(() => {
    counter.set(1)
    counter.set(2)
  })

  const transitions = spans.filter((s) => s.name === 'counter')
  expect(transitions.length).toBeGreaterThanOrEqual(2)
  const traces = new Set(transitions.map((s) => s.traceId))
  expect(traces.size).toBe(transitions.length)
  for (const s of transitions) expect(s.parentSpanId).toBeUndefined()
})

test('an async action followed by a sync sibling does not adopt the async one as parent', async () => {
  const { spans, queueSpan } = collectSpans()
  const withOTel = createWithOTel({ queueSpan })

  const asyncA = action(async () => 'a', 'asyncA').extend(withOTel())
  const syncB = action(() => 'b', 'syncB').extend(withOTel())

  await context.start(async () => {
    const pending = asyncA()
    syncB()
    await pending
  })

  const a = spans.find((s) => s.name === 'asyncA')!
  const b = spans.find((s) => s.name === 'syncB')!
  expect(a.traceId).not.toBe(b.traceId)
  expect(b.parentSpanId).toBeUndefined()
})

// Codifies that `wrap()` preserves the reactive frame across `await`, so a
// child action invoked AFTER the await still sees the parent's traceIdVar
// and inherits the trace. A future change to @reatom/core's frame
// propagation that breaks this would silently fragment async traces.
test('child action invoked after `await wrap(...)` inherits the parent trace', async () => {
  const { spans, queueSpan } = collectSpans()
  const withOTel = createWithOTel({ queueSpan })

  const child = action(() => 'c', 'child').extend(withOTel())
  const parent = action(async () => {
    await wrap(sleep(0))
    child()
    return 'p'
  }, 'parent').extend(withOTel())

  await context.start(() => parent())

  expect(spans).toHaveLength(2)
  const parentSpan = spans.find((s) => s.name === 'parent')!
  const childSpan = spans.find((s) => s.name === 'child')!
  expect(childSpan.traceId).toBe(parentSpan.traceId)
  expect(childSpan.parentSpanId).toBe(parentSpan.spanId)
})

// OTel mandate: a tracer must never escalate. If queueSpan or serialize
// faults inside a `.then` callback, the rejection must be swallowed —
// otherwise instrumentation can crash the host under
// `--unhandled-rejections=strict` or pollute monitoring.
test('thrown queueSpan inside an async action does not become an unhandled rejection', async () => {
  let unhandled = 0
  const onUnhandled = () => {
    unhandled++
  }
  process.on('unhandledRejection', onUnhandled)
  try {
    const queueSpan = vi.fn(() => {
      throw new Error('hostile sink')
    })
    const withOTel = createWithOTel({ queueSpan })

    const fetchData = action(async () => 'done', 'fetchData').extend(withOTel())

    await context.start(() => fetchData())
    // Let `.then` callback's microtask run.
    await new Promise<void>((r) => setTimeout(r, 0))

    expect(queueSpan).toHaveBeenCalled()
    expect(unhandled).toBe(0)
  } finally {
    process.off('unhandledRejection', onUnhandled)
  }
})
