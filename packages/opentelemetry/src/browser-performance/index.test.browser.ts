import { context } from '@reatom/core'
import { expect, inject, test, vi } from 'vitest'

import type { BrowserCapture } from '../browserCapture.ts'
import { browserCaptureOf, installBrowserCapture } from '../browserCapture.ts'
import type { ReatomOpentelemetry } from '../reatomOpentelemetry.ts'
import { reatomTestTelemetry } from '../test-helpers.ts'
import { withBrowserPerformance } from './index.ts'

const applyPerformance = (
  otel: ReatomOpentelemetry,
  options?: Parameters<typeof withBrowserPerformance>[0],
) => otel.extend(withBrowserPerformance(options)).browserPerformance

test('Chromium native observer delivers buffered navigation and actual resource timing, then disconnects', async () => {
  const otel = reatomTestTelemetry({
    name: 'browser-performance-observer-spy',
    endpoint: null,
    skipGlobalExtension: true,
  })
  const log = vi.fn()
  const snapshot = { context: {}, attributes: { 'page.id': 'native-page' } }
  installBrowserCapture(otel, {
    ...browserCaptureOf(otel)!,
    enabled: () => true,
    snapshot: () => snapshot,
    log,
    isTransportUrl: () => false,
  } as unknown as BrowserCapture)
  const collector = applyPerformance(otel)
  const path = `/@vite/client?timing-smoke=${Date.now()}`
  try {
    await fetch(path)
    await expect
      .poll(() =>
        log.mock.calls.some(
          ([record]) =>
            record.attributes['measurement.type'] === 'browser-resource' &&
            record.attributes['url.full'] === `${location.origin}/@vite/client`,
        ),
      )
      .toBe(true)
    expect(
      log.mock.calls.some(
        ([record]) =>
          record.attributes['measurement.type'] === 'browser-navigation',
      ),
    ).toBe(true)
    const resource = log.mock.calls.find(
      ([record]) =>
        record.attributes['url.full'] === `${location.origin}/@vite/client`,
    )![0]
    expect(
      resource.attributes['measurement.values'].duration,
    ).toBeGreaterThanOrEqual(0)
    expect(resource.snapshot).toBe(snapshot)
    collector.setFalse()
    const count = log.mock.calls.length
    await fetch(`/@vite/client?after-dispose=${Date.now()}`)
    // Drain the browser observer delivery task after the actual fetch.
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(log).toHaveBeenCalledTimes(count)
  } finally {
    collector.setFalse()
    otel.dispose()
  }
})

test('Chromium excludes async custom transport resources without the network connector while app resources remain captured', async () => {
  const customUrl = `${inject('otelCollectorUrl')}/collector/allow/performance-custom/v1/traces?receiver=private`
  const nativeEntries: string[] = []
  const observer = new PerformanceObserver((list) => {
    nativeEntries.push(...list.getEntries().map((entry) => entry.name))
  })
  observer.observe({ type: 'resource', buffered: true })
  const sent = vi.fn()
  const otel = reatomTestTelemetry({
    name: 'performance-custom-async-transport',
    endpoint: null,
    serviceName: 'performance-test',
    skipGlobalExtension: true,
    batchInterval: 100_000,
    transports: [
      async (batch) => {
        await Promise.resolve()
        const response = await fetch(customUrl, {
          method: 'POST',
          body: JSON.stringify(batch.payload),
        })
        expect(response.ok).toBe(true)
        await response.text()
        sent()
        return { accepted: batch.itemCount, rejected: 0 }
      },
    ],
  })
  const ignoreUrl = vi.fn((url: URL) => {
    if (url.href === customUrl) return true
    return !url.searchParams.has('performance-app')
  })
  const collector = applyPerformance(otel, {
    navigation: false,
    ignoreUrl,
  })
  const measurements = () =>
    otel
      .records()
      .filter(
        (record) =>
          typeof record === 'object' &&
          record !== null &&
          'eventName' in record &&
          record.eventName === 'measurement',
      )
  try {
    context.start(() => otel.log('custom-transport-seed'))
    await otel.flush()
    expect(sent.mock.calls.length).toBeGreaterThan(0)
    await expect.poll(() => nativeEntries).toContain(customUrl)
    await expect
      .poll(() => ignoreUrl.mock.calls.some(([url]) => url.href === customUrl))
      .toBe(true)
    expect(measurements()).toHaveLength(0)
    await fetch(`/@vite/client?performance-app=${Date.now()}`)
    await expect.poll(() => measurements().length).toBe(1)
    await otel.flush()
    const sendsAfterApp = sent.mock.calls.length
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(measurements()).toHaveLength(1)
    expect(sent).toHaveBeenCalledTimes(sendsAfterApp)
    expect(otel.otlp.stats().queued).toBe(0)
  } finally {
    collector.setFalse()
    observer.disconnect()
    otel.dispose()
  }
})

test('native event format shares navigation join IDs with resource entries and emits Faro metric sources', async () => {
  const otel = reatomTestTelemetry({
    name: 'performance-events',
    endpoint: null,
  }).extend(withBrowserPerformance({ format: 'events' }))
  try {
    await fetch(`/@vite/client?native-event=${Date.now()}`)
    const events = () =>
      otel
        .records()
        .filter((record: any) =>
          record.eventName?.startsWith('browser.performance.'),
        ) as any[]
    await expect
      .poll(() =>
        events().some(
          (record) =>
            record.eventName === 'browser.performance.resource' &&
            record.attributes['url.full'] === `${location.origin}/@vite/client`,
        ),
      )
      .toBe(true)
    const navigation = events().find(
      (record) => record.eventName === 'browser.performance.navigation',
    )!
    const resource = events().find(
      (record) =>
        record.eventName === 'browser.performance.resource' &&
        record.attributes['url.full'] === `${location.origin}/@vite/client`,
    )!
    expect(resource.attributes['performance.navigation_entry_id']).toBe(
      navigation.attributes['performance.navigation_entry_id'],
    )
    expect(typeof resource.attributes['performance.resource_entry_id']).toBe(
      'string',
    )
    expect(
      resource.attributes['performance.fetch_time'],
    ).toBeGreaterThanOrEqual(0)
    expect(
      navigation.attributes['performance.page_load_time'],
    ).toBeGreaterThanOrEqual(0)
    expect(resource.attributes['measurement.type']).toBeUndefined()
  } finally {
    otel.dispose()
  }
})
