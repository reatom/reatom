import { createServer } from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
const runId = process.env.FARO_RUN_ID
const evidence = { runId, requests: [], cases: [] }
const save = () =>
  writeFile('/artifacts/evidence.json', JSON.stringify(evidence, null, 2))
const pause = (ms) => new Promise((r) => setTimeout(r, ms))
async function eventually(callback, label, timeout = 60000) {
  const deadline = Date.now() + timeout
  let error
  do {
    try {
      return await callback()
    } catch (e) {
      error = e
      await pause(500)
    }
  } while (Date.now() < deadline)
  throw Error(`${label}: ${error}`)
}
let retryInjected = false
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://runner:8080')
    if (url.pathname === '/api') {
      evidence.requests.push({
        kind: 'api',
        traceparent: req.headers.traceparent,
      })
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ traceparent: req.headers.traceparent ?? null }))
      return
    }
    if (url.pathname === '/offline') {
      const chunks = []
      for await (const chunk of req) chunks.push(chunk)
      evidence.requests.push({
        kind: 'offline',
        body: JSON.parse(Buffer.concat(chunks).toString()),
      })
      res.writeHead(503, { 'Retry-After': '0' })
      res.end('offline negative')
      return
    }
    if (url.pathname === '/collect' || url.pathname.startsWith('/v1/')) {
      const chunks = []
      for await (const chunk of req) chunks.push(chunk)
      const body = Buffer.concat(chunks)
      const item = {
        kind: 'export',
        path: url.pathname,
        headers: req.headers,
        body: JSON.parse(body.toString()),
      }
      evidence.requests.push(item)
      if (
        url.pathname === '/collect' &&
        req.headers['idempotency-key'] &&
        !retryInjected
      ) {
        retryInjected = true
        item.status = 503
        res.writeHead(503, { 'Retry-After': '0' })
        res.end('synthetic transient')
        return
      }
      const target =
        url.pathname === '/collect'
          ? 'http://alloy:12347/collect'
          : `http://alloy:4318${url.pathname}`
      const response = await fetch(target, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(req.headers['idempotency-key'] && {
            'idempotency-key': req.headers['idempotency-key'],
          }),
        },
        body,
      })
      item.status = response.status
      res.writeHead(response.status, Object.fromEntries(response.headers))
      res.end(Buffer.from(await response.arrayBuffer()))
      return
    }
    if (url.pathname.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript')
      res.end(await readFile(`/apps/${url.pathname.slice(1)}`))
      return
    }
    res.setHeader('Content-Type', 'text/html')
    if (url.searchParams.get('client') === 'none') {
      res.end('<!doctype html><title>No SDK negative</title>')
      return
    }
    res.end(
      `<!doctype html><title>synthetic RUM parity</title><button id="action">Action</button><script src="/${url.searchParams.get('client') ?? 'reatom'}.js"></script>`,
    )
  } catch (error) {
    res.statusCode = 500
    res.end(String(error))
  }
})
await new Promise((r) => server.listen(8080, '0.0.0.0', r))
let browser
try {
  await eventually(async () => {
    for (const url of [
      'http://alloy:12345/-/ready',
      'http://loki:3100/ready',
      'http://tempo:3200/ready',
    ])
      assert.equal((await fetch(url)).status, 200)
  }, 'backend readiness')
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  for (const client of [
    'native',
    'reatom',
    'otlp',
    'browser',
    'browser-otlp',
  ]) {
    const context = await browser.newContext()
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto(`http://127.0.0.1:8080/?client=${client}`)
    await page.waitForFunction(() => typeof window.runCase === 'function')
    const resultPromise = page.evaluate(
      async ({ runId, client }) =>
        window.runCase({
          runId,
          client,
          endpoint: location.origin + '/collect',
          otlpEndpoint: location.origin,
        }),
      { runId, client },
    )
    if (client !== 'native') {
      await page.waitForSelector('[data-faro-user-action-name]')
      await page.click('#action')
    }
    const result = await resultPromise
    evidence.latestResult = { client, result }
    await save()
    assert.ok(
      errors.every((error) =>
        error.includes(runId + '-' + client + '-automatic-'),
      ),
      JSON.stringify(errors),
    )
    assert.ok(
      result.markers?.length,
      `${client} fixture must expose unique markers`,
    )
    if (client !== 'native') {
      const names = result.localRecords
        .filter((r) => r.type === 'log')
        .map((r) => r.eventName)
      for (const name of [
        'exception',
        'browser.performance.resource',
        'browser.user_action',
        'securitypolicyviolation',
      ])
        assert.ok(names.includes(name), `Missing real browser signal ${name}`)
      assert.ok(
        result.localRecords.some(
          (r) =>
            r.eventName === 'measurement' &&
            r.attributes['measurement.type'] === 'web-vitals',
        ),
        'No real browser vital reported',
      )
      for (const marker of ['automatic-throw', 'automatic-rejection'])
        assert.ok(
          result.localRecords.some(
            (r) =>
              r.eventName === 'exception' &&
              r.attributes['exception.message'] ===
                runId + '-' + client + '-' + marker,
          ),
          `Automatic error missing ${marker}`,
        )
      assert.ok(
        !result.localRecords.some(
          (r) =>
            r.type === 'span' &&
            /\/(collect|v1\/)/.test(String(r.attributes['url.full'])),
        ),
        'Collector traffic recursively instrumented',
      )
      const csp = result.localRecords.find(
        (r) => r.eventName === 'securitypolicyviolation',
      )
      assert.ok(
        !JSON.stringify(csp).includes('SECRET') &&
          !JSON.stringify(csp).includes('private-policy'),
        'CSP default privacy leaked',
      )
      assert.ok(
        result.localRecords?.length,
        'Export cleared locally retained records',
      )
      const api = evidence.requests
        .filter((r) => r.kind === 'api' && r.traceparent)
        .at(-1)
      assert.ok(
        result.traceIds.includes(api.traceparent.split('-')[1]),
        'Network propagation not correlated with exported trace',
      )
    }
    const record = { client, result }
    evidence.cases.push(record)
    await save()
    const query =
      client === 'otlp' || client === 'browser-otlp'
        ? `{service_name=${JSON.stringify('rum-e2e-' + client)}} | test_run_id=${JSON.stringify(runId)}`
        : `{service_name=~".+"} |= ${JSON.stringify(runId)} | logfmt | app_name=${JSON.stringify('rum-e2e-' + client)}`
    record.loki = await eventually(async () => {
      const response = await fetch(
        'http://loki:3100/loki/api/v1/query_range?' +
          new URLSearchParams({ query, limit: '5000', since: '1h' }),
      )
      assert.equal(response.status, 200, await response.clone().text())
      const json = await response.json()
      const text = JSON.stringify(json)
      assert.ok(json.data.result.length, 'Loki returned no records')
      for (const stream of json.data.result)
        assert.equal(
          stream.stream[client.endsWith('otlp') ? 'service_name' : 'app_name'],
          'rum-e2e-' + client,
          'Loki returned another client records',
        )
      if (client !== 'otlp' && client !== 'browser-otlp') {
        assert.ok(
          text.includes('app_name=rum-e2e-' + client),
          'Default logfmt app metadata missing',
        )
        assert.ok(text.includes('synthetic-user'), 'User metadata missing')
        assert.ok(text.includes('catalog'), 'View metadata missing')
        assert.ok(text.includes('stacktrace='), 'Exception frames missing')
      }
      for (const marker of result.markers)
        assert.ok(text.includes(marker), `Missing Loki marker ${marker}`)
      return json
    }, `${client} Loki records`)
    assert.ok(
      result.traceIds?.length,
      `${client} must expose exported trace ID`,
    )
    record.traces = []
    for (const traceId of result.traceIds)
      record.traces.push(
        await eventually(async () => {
          const response = await fetch(
            `http://tempo:3200/api/traces/${traceId}`,
            { headers: { Accept: 'application/json' } },
          )
          assert.equal(response.status, 200)
          const json = await response.json()
          assert.ok(
            JSON.stringify(json).includes('resourceSpans') ||
              JSON.stringify(json).includes('batches'),
          )
          return { traceId, data: json }
        }, `${client} Tempo trace ${traceId}`),
      )
    if (client.startsWith('browser')) {
      const spans = record.traces.flatMap((trace) =>
        (trace.data.batches ?? trace.data.resourceSpans ?? []).flatMap(
          (resource) =>
            (resource.scopeSpans ?? []).flatMap((scope) => scope.spans ?? []),
        ),
      )
      const parent = spans.find((span) => span.name === 'synthetic.network')
      const child = spans.find((span) => span.name === 'synthetic.child')
      assert.ok(
        parent && child,
        'Manual parent/child missing from actual Tempo query',
      )
      assert.equal(
        child.parentSpanId,
        parent.spanId,
        'Tempo manual child parent mismatch',
      )
      assert.equal(
        child.traceId,
        parent.traceId,
        'Tempo manual child trace mismatch',
      )
      const localParent = result.localRecords.find(
        (span) => span.name === 'synthetic.network',
      )
      const localChild = result.localRecords.find(
        (span) => span.name === 'synthetic.child',
      )
      assert.equal(
        localChild.parentSpanId,
        localParent.spanId,
        'Local manual parent mismatch',
      )
    }
    await context.close()
    await save()
  }
  assert.ok(
    evidence.requests.some((r) => r.kind === 'api' && r.traceparent),
    'No real network traceparent observed',
  )
  const negativeContext = await browser.newContext()
  const negativePage = await negativeContext.newPage()
  const before = evidence.requests.filter((r) => r.kind === 'export').length
  await negativePage.goto('http://127.0.0.1:8080/?client=none')
  await negativePage.evaluate(() => fetch('/api'))
  assert.equal(
    evidence.requests.filter((r) => r.kind === 'export').length,
    before,
    'No SDK control exported telemetry',
  )
  await negativePage.goto('http://127.0.0.1:8080/?client=reatom')
  const offline = await negativePage.evaluate(
    ({ runId }) =>
      window.runCase({
        runId,
        client: 'offline',
        endpoint: location.origin + '/offline',
        otlpEndpoint: location.origin,
      }),
    { runId },
  )
  assert.ok(
    offline.localRecords.length > 0,
    'Offline control lost local records',
  )
  assert.equal(
    evidence.requests.filter((r) => r.kind === 'export').length,
    before,
    'Offline receiver unexpectedly exported successfully',
  )
  evidence.negative = {
    noSdk: true,
    offlineRetained: offline.localRecords.length,
  }
  await negativeContext.close()
  const failed = evidence.requests.find((r) => r.status === 503)
  assert.ok(failed, 'Transient receiver fault was not exercised')
  const retried = evidence.requests.find(
    (r) =>
      r.status >= 200 &&
      r.status < 300 &&
      r.headers?.['idempotency-key'] === failed.headers['idempotency-key'],
  )
  assert.ok(retried, 'Transient export was not retried successfully')
  assert.deepEqual(retried.body, failed.body, 'Retry changed captured envelope')
  evidence.browserPassed = true
  evidence.browserVersion = browser.version()
  await save()
  console.log(
    JSON.stringify({
      browserPassed: true,
      cases: evidence.cases.map((c) => c.client),
      exports: evidence.requests.filter((r) => r.kind === 'export').length,
    }),
  )
} finally {
  await save()
  await browser?.close()
  server.close()
}
