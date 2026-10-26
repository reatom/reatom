import { action, bind, context, wrap } from '@reatom/core'
import { expect, test, vi } from 'vitest'

import { type ReatomOpentelemetryInput } from './reatomOpentelemetry.ts'
import {
  type ParsedSpan,
  parseSpans,
  reatomTestTelemetry,
  withWarnSpy,
} from './test-helpers.ts'

type SetupOptions = Partial<ReatomOpentelemetryInput> & {
  warnContextLoss?: boolean
}

const setup = (options: SetupOptions = {}) => {
  const spans: ParsedSpan[] = []
  const otel = reatomTestTelemetry({
    name: 'traceVar',
    endpoint: 'https://collector.invalid',
    serviceName: 'trace-var',
    // Explicit undefined preserves the library default instead of the fixture default.
    warnContextLoss: undefined,
    retry: { maxRetries: 0 },
    fetch: async (_url, init) => {
      spans.push(...parseSpans(String(init?.body)))
      return new Response(null)
    },
    ...(options as Partial<ReatomOpentelemetryInput>),
  })
  const run = context.start(() => bind(<T>(callback: () => T) => callback()))
  return { otel, spans, run }
}

const span = (spans: readonly ParsedSpan[], name: string) => {
  const matches = spans.filter((candidate) => candidate.name === name)
  expect(matches).toHaveLength(1)
  return matches[0]!
}

const contextLossMessages = (
  warn: { mock: { calls: ReadonlyArray<ReadonlyArray<unknown>> } },
  targetName: string,
) =>
  warn.mock.calls
    .map((args) => args.map(String).join(' '))
    .filter(
      (message) =>
        message.includes(targetName) &&
        /warnContextLoss|context loss|missing wrap/i.test(message),
    )

test('await wrap(Promise.resolve()) keeps the child action on the parent trace', async () => {
  const { otel, spans, run } = setup()
  try {
    const child = action(() => 'child', 'wrapped.child')
    const parent = action(async () => {
      await wrap(Promise.resolve())
      return child()
    }, 'wrapped.parent')

    expect(await run(parent)).toBe('child')
    await otel.flush()

    const parentSpan = span(spans, 'wrapped.parent')
    const childSpan = span(spans, 'wrapped.child')
    expect(childSpan.traceId).toBe(parentSpan.traceId)
    expect(childSpan.parentSpanId).toBe(parentSpan.spanId)
  } finally {
    otel.dispose()
  }
})

test.each([
  { mode: 'dev', env: undefined, warnContextLoss: undefined, warnings: 1 },
  { mode: 'prod', env: 'production', warnContextLoss: undefined, warnings: 0 },
  {
    mode: 'prod flag on',
    env: 'production',
    warnContextLoss: true,
    warnings: 1,
  },
  { mode: 'flag off', env: undefined, warnContextLoss: false, warnings: 0 },
] as const)(
  'unwrapped callback between two actions ($mode)',
  async ({ env, warnContextLoss, warnings }) => {
    if (env !== undefined) vi.stubEnv('NODE_ENV', env)
    try {
      await withWarnSpy(async (warn) => {
        const { otel, spans, run } = setup(
          warnContextLoss === undefined ? {} : { warnContextLoss },
        )
        const resumed = Promise.withResolvers<void>()
        try {
          const child = action(() => 'child', 'unwrapped.child')
          const parent = action(() => {
            Promise.resolve().then(() => {
              run(child)
              resumed.resolve()
            })
          }, 'unwrapped.parent')

          run(parent)
          await resumed.promise
          await otel.flush()

          const parentSpan = span(spans, 'unwrapped.parent')
          const childSpan = span(spans, 'unwrapped.child')
          expect(childSpan.traceId).not.toBe(parentSpan.traceId)
          expect(childSpan.parentSpanId).not.toBe(parentSpan.spanId)

          const named = contextLossMessages(warn, 'unwrapped.child')
          expect(named).toHaveLength(warnings)
        } finally {
          otel.dispose()
        }
      })
    } finally {
      vi.unstubAllEnvs()
    }
  },
)

test('export fixtures skip unrelated context-loss diagnostics by default', async () => {
  await withWarnSpy(async (warn) => {
    const otel = reatomTestTelemetry({
      name: 'quiet-fixture',
      endpoint: null,
    })
    try {
      context.start(() => {
        action(() => 'first', 'quiet.first')()
        action(() => 'second', 'quiet.second')()
      })
      await otel.flush()
      expect(warn).not.toHaveBeenCalled()
    } finally {
      otel.dispose()
    }
  })
})
