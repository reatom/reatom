import { withBrowserErrors } from '../../src/browser-errors/index.ts'
import { withBrowserPerformance } from '../../src/browser-performance/index.ts'
import { withWebVitals } from '../../src/web-vitals/index.ts'
import { withBrowserActions } from '../../src/browser-actions/index.ts'
import { withBrowserCsp } from '../../src/browser-csp/index.ts'
import { withOTLP } from '../../src/otlp/index.ts'
import { faroTransport, logMeasurement } from '../../src/faro/index.ts'
import { withBrowserNetworkMonkeypatch } from '../../src/browser-network/index.ts'
import { withBrowserMetadata } from '../../src/browser-metadata/index.ts'
import { withWebAnalytics } from '../../src/web-analytics/index.ts'
export const installFixture = (createTelemetry, runNetwork) => {
  window.runCase = async ({ runId, endpoint, otlpEndpoint, client }) => {
    const otel = createTelemetry({
      name: 'rum-e2e',
      serviceName: `rum-e2e-${client}`,
      resourceAttributes: { 'deployment.environment.name': 'test' },
    }).extend(
      withBrowserMetadata({
        attributes: {
          'user.id': 'synthetic-user',
          'test.run_id': runId,
          'test.client': client,
        },
      }),
      withWebAnalytics({
        consent: true,
        errors: false,
        persistSession: false,
        persistVisitor: false,
        sessionTimeout: 15 * 60 * 1000,
        sessionMaxLifetime: 4 * 60 * 60 * 1000,
      }),
      withBrowserErrors(),
      withBrowserPerformance({ format: 'events' }),
      withWebVitals(),
      withBrowserActions(),
      withBrowserCsp(),
      withBrowserNetworkMonkeypatch({
        propagateTraceparent: [location.origin],
      }),
      withOTLP({
        endpoint:
          client === 'otlp' || client === 'browser-otlp' ? otlpEndpoint : null,
        transports:
          client === 'otlp' || client === 'browser-otlp'
            ? []
            : [
                faroTransport({
                  endpoint,
                  attempts: client === 'offline' ? 1 : 3,
                }),
              ],
        batchInterval: 100000,
      }),
    )
    otel.analytics.setView('catalog')
    const markers = [
      'custom-event',
      'custom-log',
      'custom-measurement',
      'custom-error',
    ].map((x) => `${runId}-${client}-${x}`)
    otel.log(markers[0], { 'test.run_id': runId })
    otel.log('reatom.log', {
      'reatom.log.label': markers[1],
      'test.run_id': runId,
    })
    logMeasurement(otel, {
      type: markers[2],
      values: { value: 42 },
      context: { 'test.run_id': runId, 'test.client': client },
    })
    otel.log('exception', {
      'exception.message': markers[3],
      'exception.type': 'Error',
      'exception.stacktrace': `Error: ${markers[3]}\n    at synthetic (http://runner:8080/reatom.js:1:1)`,
      'test.run_id': runId,
    })
    await runNetwork(otel)
    otel.analytics.setView('checkout')
    if (client !== 'offline') {
      markers.push(
        runId + '-' + client + '-automatic-throw',
        runId + '-' + client + '-automatic-rejection',
        'browser.performance.resource',
        'browser.user_action',
        'securitypolicyviolation',
        'web-vitals',
      )
      setTimeout(() => {
        throw new Error(`${runId}-${client}-automatic-throw`)
      }, 0)
      setTimeout(() => {
        Promise.reject(new Error(`${runId}-${client}-automatic-rejection`))
      }, 0)
      await fetch('/api?synthetic_resource=1')
      const button = document.querySelector('#action')
      button.setAttribute('data-faro-user-action-name', 'synthetic-checkout')
      await new Promise((resolve) =>
        button.addEventListener(
          'click',
          () => {
            document.body.append(document.createElement('aside'))
            resolve()
          },
          { once: true },
        ),
      )
      document.dispatchEvent(
        new SecurityPolicyViolationEvent('securitypolicyviolation', {
          blockedURI: location.origin + '/blocked?private=SECRET',
          documentURI: location.href,
          effectiveDirective: 'img-src',
          violatedDirective: 'img-src',
          disposition: 'enforce',
          originalPolicy: 'private-policy',
          sample: 'private-sample',
        }),
      )
      await new Promise((r) => setTimeout(r, 1200))
    }
    await otel.flush()
    const localRecords = JSON.parse(JSON.stringify(otel.records()))
    const traceIds = [
      ...new Set(
        localRecords
          .filter(
            (r) =>
              r.type === 'span' &&
              ['synthetic.network', 'synthetic.child', 'GET'].includes(r.name),
          )
          .map((r) => r.traceId)
          .filter(Boolean),
      ),
    ]
    // Captured span shape is stable public data; retain all records as evidence.
    if (!traceIds.length)
      for (const r of localRecords)
        if (r.traceId && r.name) traceIds.push(r.traceId)
    return { markers, traceIds: [...new Set(traceIds)], localRecords }
  }
}
