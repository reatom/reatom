import { reatomOpentelemetry } from '../../src/browser/index.ts'
import { installFixture } from './fixture.ts'
installFixture(reatomOpentelemetry, async (otel) => {
  const span = otel.startSpan({
    name: 'synthetic.network',
    kind: 'internal',
    attributes: { 'test.manual': true },
  })
  if (!span) throw Error('Manual span was not admitted')
  const child = otel.startSpan({
    name: 'synthetic.child',
    parent: span.context,
    kind: 'internal',
  })
  if (!child) throw Error('Child span was not admitted')
  await fetch('/api', { headers: { traceparent: child.traceparent } })
  child.finish()
  span.finish()
})
