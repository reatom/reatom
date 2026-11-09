import { action, atom, computed, context, effect, wrap } from '@reatom/core'
import { afterEach, expect, test } from 'vitest'

import { withGDPR } from './gdpr/index.ts'
import {
  INTERNAL_PREFIX,
  internalName,
  isInternalName,
  isInternalUnit,
} from './internalName.ts'
import { reatomTestTelemetry } from './test-helpers.ts'
import { withWebAnalytics } from './web-analytics/index.ts'

const cleanups: Array<() => void> = []

afterEach(() => {
  while (cleanups.length) cleanups.pop()!()
})

const start = (
  overrides: Partial<Parameters<typeof reatomTestTelemetry>[0]> = {},
) => {
  const otel = reatomTestTelemetry({
    name: `internal-${Math.random().toString(16).slice(2)}`,
    endpoint: null,
    serviceName: 'internal',
    batchInterval: 100_000,
    maxBatchSize: 100,
    maxQueueSize: 100,
    useBeacon: false,
    ...overrides,
  })
  cleanups.push(() => context.start(() => otel.dispose()))
  return otel
}

const settleHooks = () => Promise.resolve()

const stringAttr = (record: object, key: string): string | undefined => {
  const value =
    'attributes' in record
      ? (record.attributes as Record<string, unknown>)[key]
      : undefined
  return typeof value === 'string' ? value : undefined
}

const spanNamed = (records: readonly unknown[], name: string) =>
  records.find(
    (record) =>
      record &&
      typeof record === 'object' &&
      'type' in record &&
      record.type === 'span' &&
      'name' in record &&
      record.name === name,
  )

const recordedNames = (records: readonly unknown[]): string[] => {
  const names: string[] = []
  for (const record of records) {
    if (!record || typeof record !== 'object') continue
    if (
      'type' in record &&
      record.type === 'span' &&
      'name' in record &&
      typeof record.name === 'string'
    ) {
      names.push(record.name)
    }
    const reatomName = stringAttr(record, 'reatom.name')
    if (reatomName) names.push(reatomName)
  }
  return names
}

const internalRecordedNames = (records: readonly unknown[]): string[] =>
  recordedNames(records).filter(isInternalName)

test('internalName is the prefix source of truth', () => {
  expect(internalName('shop')).toBe('otel.shop')
  expect(internalName('shop', 'analytics', 'visitor')).toBe(
    'otel.shop.analytics.visitor',
  )
  expect(internalName('shop').startsWith(INTERNAL_PREFIX)).toBe(true)
  expect(isInternalName('otel.shop.queue')).toBe(true)
  expect(isInternalName('analytics.shop.visitor')).toBe(true)
  expect(isInternalName('shop.write')).toBe(false)
  expect(isInternalUnit(atom(0, internalName('shop', 'queue')))).toBe(true)
  expect(isInternalUnit(atom(0, 'shop.note'))).toBe(false)
})

test('internal units created by the helper never appear in records', async () => {
  const otel = start()
  const instance = otel.instanceName
  context.start(() => {
    const internalCount = atom(0, internalName(instance, 'probe', 'count'))
    const internalDoubled = computed(
      () => internalCount() * 2,
      internalName(instance, 'probe', 'doubled'),
    )
    internalDoubled.subscribe(() => {})
    const internalBump = action(
      () => {
        internalCount.set(1)
        return internalDoubled()
      },
      internalName(instance, 'probe', 'bump'),
    )
    const internalTick = effect(
      () => internalCount(),
      internalName(instance, 'probe', 'tick'),
    )
    internalTick()
    const note = atom('x', 'shop.note')
    const write = action(() => {
      internalBump()
      internalCount.set(2)
      note.set('y')
      return note()
    }, 'shop.write')
    expect(internalBump()).toBe(2)
    expect(write()).toBe('y')
  })
  await settleHooks()

  const records = otel.records()
  expect(recordedNames(records)).toContain('shop.write')
  expect(recordedNames(records)).toContain('shop.note')
  expect(internalRecordedNames(records)).toEqual([])
})

test('explicit withOTel on an internal unit is a no-op', async () => {
  const otel = start()
  const hidden = action(
    () => 'secret',
    internalName(otel.instanceName, 'hidden'),
  )
  hidden.extend(otel.withOTel({ attributes: { 'app.leaked': true } }))
  context.start(() => {
    expect(hidden()).toBe('secret')
  })
  await settleHooks()
  expect(internalRecordedNames(otel.records())).toEqual([])
  expect(spanNamed(otel.records(), hidden.name)).toBeUndefined()
})

test('internal activity does not change app parent or cause attributes', async () => {
  const quiet = start()
  const noisy = start()
  const run = (otel: ReturnType<typeof start>, withInternal: boolean) => {
    context.start(() => {
      const child = action(() => 'ok', 'shop.child')
      const parent = action(() => {
        if (withInternal) {
          const internal = action(
            () => 'skip',
            internalName(otel.instanceName, 'side'),
          )
          const box = atom(0, internalName(otel.instanceName, 'box'))
          internal()
          box.set(1)
        }
        return child()
      }, 'shop.parent')
      expect(parent()).toBe('ok')
    })
  }
  run(quiet, false)
  run(noisy, true)
  await settleHooks()

  const quietParent = spanNamed(quiet.records(), 'shop.parent') as {
    spanId: string
    attributes: Record<string, unknown>
  }
  const quietChild = spanNamed(quiet.records(), 'shop.child') as {
    parentSpanId?: string
    attributes: Record<string, unknown>
  }
  const noisyParent = spanNamed(noisy.records(), 'shop.parent') as {
    spanId: string
    attributes: Record<string, unknown>
  }
  const noisyChild = spanNamed(noisy.records(), 'shop.child') as {
    parentSpanId?: string
    attributes: Record<string, unknown>
  }
  expect(quietChild.parentSpanId).toBe(quietParent.spanId)
  expect(noisyChild.parentSpanId).toBe(noisyParent.spanId)
  expect(quietChild.attributes['reatom.cause.ids']).toEqual([
    quietParent.attributes['reatom.frame.id'],
  ])
  expect(noisyChild.attributes['reatom.cause.ids']).toEqual([
    noisyParent.attributes['reatom.frame.id'],
  ])
  expect(internalRecordedNames(noisy.records())).toEqual([])
})

test('web-analytics, gdpr and otlp atoms never appear in records', async () => {
  const otel = start()
  await context.start(async () => {
    const { gdpr, analytics } = otel.extend(
      withGDPR({ persist: false }),
      withWebAnalytics({ consent: true, persistVisitor: false }),
    )
    gdpr.fields.diagnostics.change(true)
    gdpr.fields.analytics.change(true)
    await wrap(gdpr.submit())
    gdpr.fields.marketing.change(true)
    analytics.pageView()
    otel.otlp.set((current) => ({ ...current }))
    otel.otlp.stats()
    analytics.visitor()
    analytics.session()
    const work = action(() => 'ok', 'shop.work')
    expect(work()).toBe('ok')
    expect(internalRecordedNames(otel.records())).toEqual([])
    expect(recordedNames(otel.records())).toContain('shop.work')
  })
})
