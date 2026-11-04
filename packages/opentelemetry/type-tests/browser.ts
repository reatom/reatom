import { reatomOpentelemetry } from '../src/browser/index.ts'
import { withBrowserErrors } from '../src/browser-errors/index.ts'
import { withAttributes } from '../src/attributes/index.ts'
import { withFaro } from '../src/faro/client.ts'
import { withOTLP } from '../src/otlp/index.ts'

const browser = reatomOpentelemetry({ name: 'browser', serviceName: 'web' })
const span = browser.startSpan({ name: 'checkout' })
if (span) {
  span.context.traceId satisfies string
  span.traceparent satisfies string
  browser
    .startSpan({
      name: 'child',
      parent: span.context,
      snapshot: browser.snapshot(),
    })
    ?.finish()
  span.finish({ attributes: { success: true } })
  span.cancel()
}
browser.extend(withBrowserErrors()).browserErrors.setFalse()
browser.extend(withAttributes(() => ({ deployment: 'test' })))
browser
  .extend(withFaro({ endpoint: 'https://collector.test/collect' }))
  .otlp.stats()
reatomOpentelemetry({ name: 'otlp', serviceName: 'web' }).extend(
  withOTLP({ endpoint: 'https://collector.test' }),
)
// @ts-expect-error Automatic Reatom middleware belongs to the full root entry.
browser.withOTel()
reatomOpentelemetry({
  name: 'browser-route',
  serviceName: 'web',
  // @ts-expect-error The browser entry does not install Reatom route instrumentation.
  route: 'link',
})
// @ts-expect-error Manual span parents must supply both identifiers.
browser.startSpan({ name: 'child', parent: { traceId: 'abc' } })
