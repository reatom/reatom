import { initializeFaro, getWebInstrumentations } from '@grafana/faro-web-sdk'
import { TracingInstrumentation } from '@grafana/faro-web-tracing'
window.runCase = async ({ runId, endpoint, client }) => {
  const faro = initializeFaro({
    url: endpoint,
    app: { name: `rum-e2e-${client}`, version: '1', environment: 'test' },
    sessionTracking: { enabled: true, persistent: false, samplingRate: 1 },
    instrumentations: [
      ...getWebInstrumentations(),
      new TracingInstrumentation({
        instrumentationOptions: { propagateTraceHeaderCorsUrls: [/.*/] },
      }),
    ],
    batching: { enabled: false },
  })
  faro.api.setUser({ id: 'synthetic-user' })
  faro.api.setView({ name: 'catalog' })
  const markers = [
    'custom-event',
    'custom-log',
    'custom-measurement',
    'custom-error',
  ].map((x) => `${runId}-${client}-${x}`)
  faro.api.pushEvent(markers[0], { 'test.run_id': runId })
  faro.api.pushLog([markers[1]], { context: { 'test.run_id': runId } })
  faro.api.pushMeasurement(
    { type: markers[2], values: { value: 42 } },
    { context: { 'test.run_id': runId } },
  )
  faro.api.pushError(new Error(markers[3]), {
    context: { 'test.run_id': runId },
  })
  const { trace } = faro.api.getOTEL()
  const span = trace.getTracer('synthetic').startSpan('synthetic.manual')
  const traceIds = [span.spanContext().traceId]
  span.end()
  await fetch('/api')
  await new Promise((r) => setTimeout(r, 6000))
  return { markers, traceIds }
}
