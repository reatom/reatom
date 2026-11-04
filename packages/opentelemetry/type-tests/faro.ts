import { reatomOpentelemetry, type ReatomOpentelemetry } from '../src/index.ts'
import { withFaro } from '../src/faro/client.ts'
import type { Transport } from '../src/otlp/index.ts'
import { faroTransport, logMeasurement } from '../src/faro/index.ts'

declare const otel: ReatomOpentelemetry
const transport: Transport = faroTransport({
  endpoint: 'https://faro.test/collect',
})
void transport
logMeasurement(otel, { type: 'checkout', values: { duration_ms: 12 } })
const client = reatomOpentelemetry({
  name: 'faro-client',
  serviceName: 'web',
}).extend(withFaro({ endpoint: 'https://faro.test/collect', maxBatchSize: 20 }))
client.otlp.stats().exported satisfies number
// @ts-expect-error A receiver endpoint is required.
withFaro({ maxBatchSize: 20 })
// @ts-expect-error Measurement values must be numeric.
logMeasurement(otel, { type: 'checkout', values: { duration_ms: '12' } })
// @ts-expect-error Explicit measurement type is required.
logMeasurement(otel, { values: { duration_ms: 12 } })
faroTransport({
  endpoint: 'https://faro.test/collect',
  attempts: 3,
  onSessionInvalid: (capturedSessionId) => {
    const id: string = capturedSessionId
    void id
  },
})
faroTransport({
  endpoint: 'https://faro.test/collect',
  // @ts-expect-error Session hook receives captured string identity.
  onSessionInvalid: (session: number) => {
    void session
  },
})
