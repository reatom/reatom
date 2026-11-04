import { expect, test } from 'vitest'
import { reatomTestTelemetry } from '../test-helpers.ts'
import { browserCaptureOf, installBrowserCapture } from '../browserCapture.ts'
import { withBrowserCsp } from './index.ts'

for (const mutation of ['disable', 'dispose'] as const) {
  for (const source of ['redact', 'snapshot'] as const) {
    test(`CSP ${source} callback ${mutation} drops the in-progress detail event`, () => {
      let stop = () => {}
      const otel = reatomTestTelemetry({
        name: `csp-reentrant-${source}-${mutation}`,
        endpoint: null,
        captureValues: {
          redact: (key, value) => {
            if (source === 'redact' && key === 'sample') stop()
            return value
          },
        },
      })
      if (source === 'snapshot') {
        const original = browserCaptureOf(otel)!
        installBrowserCapture(otel, {
          ...original,
          snapshot: () => {
            stop()
            return original.snapshot()
          },
        })
      }
      const combined = otel.extend(withBrowserCsp({ details: true }))
      stop = () => {
        if (mutation === 'disable') combined.browserCsp.setFalse()
        else combined.dispose()
      }
      try {
        document.dispatchEvent(
          new SecurityPolicyViolationEvent('securitypolicyviolation', {
            sample: 'sensitive sample',
            originalPolicy: 'private policy',
          }),
        )
        expect(
          combined
            .records()
            .filter(
              (record: any) => record.eventName === 'securitypolicyviolation',
            ),
        ).toHaveLength(0)
      } finally {
        combined.dispose()
      }
    })
  }
}
