import { withWebAnalytics } from '../web-analytics/index.ts'
import { expect, test, beforeEach, afterEach } from 'vitest'
import { reatomTestTelemetry } from '../test-helpers.ts'
import { withBrowserErrors } from './index.ts'
import { withBrowserConsoleMonkeypatch } from '../browser-console/index.ts'
import { withBrowserMetadata } from '../browser-metadata/index.ts'
import { browserMetadataOf } from '../browserCapture.ts'

const prevent = (event: ErrorEvent) => event.preventDefault()
beforeEach(() => window.addEventListener('error', prevent))
afterEach(() => window.removeEventListener('error', prevent))

test('native exception snapshots dedupe, rate-limit, toggle and dispose independently of analytics', () => {
  const otel = reatomTestTelemetry({
    name: 'native-errors',
    endpoint: null,
  }).extend(withBrowserErrors({ maxPerMinute: 2 }))
  const send = (error: Error) =>
    window.dispatchEvent(
      new ErrorEvent('error', {
        error,
        message: error.message,
        cancelable: true,
      }),
    )
  const first = new Error('first')
  send(first)
  send(first)
  send(new Error('second'))
  send(new Error('third'))
  const exceptions = () =>
    otel
      .records()
      .filter((record: any) => record.eventName === 'exception') as any[]
  expect(exceptions()).toHaveLength(2)
  expect(exceptions()[0].attributes['exception.fatal']).toBe(true)
  otel.browserErrors.setFalse()
  send(new Error('disabled'))
  expect(exceptions()).toHaveLength(2)
  otel.browserErrors.setTrue()
  send(new Error('enabled'))
  expect(exceptions()).toHaveLength(3)
  otel.dispose()
  send(new Error('disposed'))
  expect(exceptions()).toHaveLength(0)
})

test('console errors-as-exceptions preserve native call and dedupe the same window error', () => {
  const native = console.error
  const otel = reatomTestTelemetry({
    name: 'console-exceptions',
    endpoint: null,
  }).extend(
    withBrowserErrors(),
    withBrowserConsoleMonkeypatch({ errorsAsExceptions: true }),
  )
  const error = new Error('console error')
  console.error(error)
  // Vitest logs synthetic ErrorEvents through console.error itself.
  otel.browserConsole.setFalse()
  window.dispatchEvent(
    new ErrorEvent('error', {
      error,
      message: error.message,
      cancelable: true,
    }),
  )
  expect(
    otel.records().filter((record: any) => record.eventName === 'exception'),
  ).toHaveLength(1)
  otel.dispose()
  expect(console.error).toBe(native)
})

test('metadata adds explicit safe document context and removes provider on toggle', () => {
  const otel = reatomTestTelemetry({
    name: 'browser-meta',
    endpoint: null,
  }).extend(
    withBrowserMetadata({
      pageUrl: true,
      bundleId: 'bundle',
      gitHash: 'commit',
      installationId: 'install',
    }),
  )
  const meta = browserMetadataOf(otel)
  expect(meta['service.bundle.id']).toBe('bundle')
  expect(meta['service.git.hash']).toBe('commit')
  expect(meta['service.installation.id']).toBe('install')
  expect(meta['browser.viewport.width']).toBe(window.innerWidth)
  expect(String(meta['page.url']).includes('?')).toBe(false)
  otel.browserMetadata.setFalse()
  expect(browserMetadataOf(otel)).toEqual({})
  otel.dispose()
})

for (const order of ['analytics-first', 'standalone-first'] as const) {
  test(`standalone errors retain details with ${order} and legacy resumes after toggle`, () => {
    const otel = reatomTestTelemetry({
      name: `error-owner-${order}`,
      endpoint: null,
    })
    const analytics = withWebAnalytics({
      consent: true,
      captureErrorDetails: false,
      autoPageViews: false,
    })
    const standalone = withBrowserErrors({ details: true })
    const combined =
      order === 'analytics-first'
        ? otel.extend(analytics).extend(standalone)
        : otel.extend(standalone).extend(analytics)
    const send = (error: Error) =>
      window.dispatchEvent(
        new ErrorEvent('error', {
          error,
          message: error.message,
          cancelable: true,
        }),
      )
    const exceptions = () =>
      combined
        .records()
        .filter((record: any) => record.eventName === 'exception') as any[]
    try {
      const detail = new Error(`standalone detail ${order}`)
      send(detail)
      expect(exceptions()).toHaveLength(1)
      expect(String(exceptions()[0].attributes['exception.message'])).toContain(
        'standalone detail',
      )
      expect(
        String(exceptions()[0].attributes['exception.stacktrace']),
      ).toContain('index.test.browser.ts')
      combined.browserErrors.setFalse()
      send(new Error(`legacy fallback ${order}`))
      expect(exceptions()).toHaveLength(2)
      expect(exceptions()[1].attributes['exception.message']).toBeUndefined()
      expect(exceptions()[1].attributes['exception.stacktrace']).toBeUndefined()
      combined.browserErrors.setTrue()
      send(new Error(`restored detail ${order}`))
      expect(exceptions()).toHaveLength(3)
      expect(String(exceptions()[2].attributes['exception.message'])).toContain(
        'restored detail',
      )
    } finally {
      combined.dispose()
    }
  })
}

test('native stack capture never invokes an application stack accessor', () => {
  const otel = reatomTestTelemetry({
    name: 'hostile-error-stack',
    endpoint: null,
  }).extend(withBrowserErrors({ details: true }))
  let reads = 0
  const error = new Error('accessor safety')
  Object.defineProperty(error, 'stack', {
    get() {
      reads++
      throw new Error('must not execute')
    },
  })
  try {
    window.dispatchEvent(
      new ErrorEvent('error', {
        error,
        message: error.message,
        cancelable: true,
      }),
    )
    expect(reads).toBe(0)
    const record = otel
      .records()
      .find((record: any) => record.eventName === 'exception') as any
    expect(record.attributes['exception.stacktrace']).toBeUndefined()
    expect(record.attributes['exception.message']).toBe('accessor safety')
  } finally {
    otel.dispose()
  }
})

for (const mutation of ['disable', 'dispose'] as const) {
  test(`exception fingerprint callback ${mutation} drops the in-progress error`, () => {
    let stop = () => {}
    const otel = reatomTestTelemetry({
      name: `error-fingerprint-${mutation}`,
      endpoint: null,
    }).extend(
      withBrowserErrors({
        fingerprint: () => {
          stop()
          return 'sensitive fingerprint'
        },
      }),
    )
    stop = () => {
      if (mutation === 'disable') otel.browserErrors.setFalse()
      else otel.dispose()
    }
    try {
      const error = new Error('private error')
      window.dispatchEvent(
        new ErrorEvent('error', {
          error,
          message: error.message,
          cancelable: true,
        }),
      )
      expect(
        otel
          .records()
          .filter((record: any) => record.eventName === 'exception'),
      ).toHaveLength(0)
    } finally {
      otel.dispose()
    }
  })
}
