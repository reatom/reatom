import { expect, test } from 'vitest'
import { reatomTestTelemetry } from '../test-helpers.ts'
import { withBrowserConsoleMonkeypatch } from './index.ts'

for (const mutation of ['disable', 'dispose'] as const) {
  test(`console detail redact callback ${mutation} drops the in-progress exception`, () => {
    let stop = () => {}
    const native = console.error
    const otel = reatomTestTelemetry({
      name: `console-detail-${mutation}`,
      endpoint: null,
      captureValues: {
        redact: (key, value) => {
          if (key === 'message') stop()
          return value
        },
      },
    }).extend(withBrowserConsoleMonkeypatch({ errorsAsExceptions: true }))
    stop = () => {
      if (mutation === 'disable') otel.browserConsole.setFalse()
      else otel.dispose()
    }
    try {
      console.error(new Error('private console error'))
      expect(
        otel
          .records()
          .filter((record: any) => record.eventName === 'exception'),
      ).toHaveLength(0)
      expect(console.error).toBe(native)
    } finally {
      otel.dispose()
    }
  })
}
