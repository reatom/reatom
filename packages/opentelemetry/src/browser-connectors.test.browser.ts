import { expect, inject, test } from 'vitest'

import { withBrowserConsoleMonkeypatch } from './browser-console/index.ts'
import { withBrowserNetworkMonkeypatch } from './browser-network/index.ts'
import type { ReatomOpentelemetry } from './reatomOpentelemetry.ts'
import { reatomTestTelemetry } from './test-helpers.ts'
import { strictValueCapture } from './strict-capture/index.ts'

const applyNetwork = (
  otel: ReatomOpentelemetry,
  options?: Parameters<typeof withBrowserNetworkMonkeypatch>[0],
) => otel.extend(withBrowserNetworkMonkeypatch(options)).browserNetwork
const applyConsole = (
  otel: ReatomOpentelemetry,
  options?: Parameters<typeof withBrowserConsoleMonkeypatch>[0],
) => otel.extend(withBrowserConsoleMonkeypatch(options)).browserConsole

test('real fetch and XHR preserve responses and record sanitized CLIENT spans', async () => {
  const otel = reatomTestTelemetry({ name: 'native-network', endpoint: null })
  const native = fetch
  const connection = applyNetwork(otel)
  const response = await fetch(
    inject('otelCollectorUrl') + '/control/state?token=private',
  )
  expect(response.ok).toBe(true)
  await response.json()
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', inject('otelCollectorUrl') + '/control/state')
    xhr.onloadend = () => {
      expect(xhr.status).toBe(200)
      resolve()
    }
    xhr.onerror = reject
    xhr.send()
  })
  await expect
    .poll(
      () =>
        otel.records().filter((record: any) => record.kind === 'client').length,
    )
    .toBe(2)
  const spans = otel
    .records()
    .filter((record: any) => record.kind === 'client') as any[]
  expect(spans.length).toBe(2)
  expect(spans[0]!.attributes['url.full']).not.toContain('token')
  connection.setFalse()
  expect(fetch).toBe(native)
  otel.dispose()
})

test('console duplicate extension preflight delivers once, toggles, applies strict capture, and restores originals', () => {
  const native = console.warn
  const otel = reatomTestTelemetry({
    name: 'native-console',
    endpoint: null,
    valueCapture: strictValueCapture,
  })
  const control = applyConsole(otel)
  expect(() => applyConsole(otel)).toThrow()
  control.setFalse()
  expect(() => applyConsole(otel)).toThrow()
  control.setTrue()
  console.warn({ password: 'secret', message: 'person@example.com' })
  const logs = otel
    .records()
    .filter((record: any) => record.eventName === 'reatom.console') as any[]
  expect(logs.length).toBe(1)
  expect(logs[0].severityNumber).toBe(13)
  expect(JSON.stringify(logs)).not.toContain('secret')
  expect(JSON.stringify(logs)).not.toContain('person@example.com')
  otel.dispose()
  expect(console.warn).toBe(native)
})

test('fetch Request/init precedence, propagation, body and rejection remain native', async () => {
  const otel = reatomTestTelemetry({ name: 'network-headers', endpoint: null })
  const url = inject('otelCollectorUrl') + '/control/echo'
  const connector = applyNetwork(otel, {
    propagateTraceparent: [new URL(url).origin],
  })
  const request = new Request(url, {
    method: 'POST',
    headers: { 'x-test': 'request' },
    body: 'request-body',
  })
  const init = { headers: { 'x-test': 'init' }, body: 'init-body' }
  const result = await (await fetch(request, init)).json()
  expect(result.test).toBe('init')
  expect(result.body).toBe('init-body')
  const spans = otel
    .records()
    .filter((record: any) => record.kind === 'client') as any[]
  expect(result.traceparent.split('-')[2]).toBe(spans[0].spanId)
  expect(request.headers.get('traceparent')).toBeNull()
  expect(init.headers).toEqual({ 'x-test': 'init' })
  const existing = '00-11111111111111111111111111111111-2222222222222222-01'
  const echoed = await (
    await fetch(url, { headers: { traceparent: existing } })
  ).json()
  expect(echoed.traceparent).toBe(existing)
  const controller = new AbortController()
  controller.abort()
  await expect(fetch(url, { signal: controller.signal })).rejects.toMatchObject(
    { name: 'AbortError' },
  )
  connector.setFalse()
  otel.dispose()
})

test('multi-instance ownership, signal changes, late wrappers and suppression', async () => {
  const original = console.warn
  const one = reatomTestTelemetry({ name: 'console-owner-one', endpoint: null })
  const two = reatomTestTelemetry({
    name: 'console-owner-two',
    endpoint: null,
    captureValues: false,
  })
  const first = applyConsole(one)
  applyConsole(two)
  console.warn('first')
  expect(
    one.records().filter((r: any) => r.eventName === 'reatom.console').length,
  ).toBe(1)
  const secondLog = two
    .records()
    .find((r: any) => r.eventName === 'reatom.console') as any
  expect(secondLog.body).toBeUndefined()
  one.set((current) => ({ ...current, signals: { logs: false } }))
  console.warn('second')
  expect(
    one.records().filter((r: any) => r.eventName === 'reatom.console').length,
  ).toBe(1)
  first.setFalse()
  const previous = console.warn
  const thirdParty = (...args: unknown[]) =>
    Reflect.apply(previous, console, args)
  console.warn = thirdParty
  two.dispose()
  expect(console.warn).toBe(thirdParty)
  console.warn = original
  one.dispose()
})

test('unsampled propagation, HTTP errors and XHR abort preserve native results', async () => {
  const url = inject('otelCollectorUrl') + '/control/echo'
  const otel = reatomTestTelemetry({
    name: 'network-unsampled',
    endpoint: null,
    sampling: { ratio: 0 },
  })
  applyNetwork(otel, { propagateTraceparent: [new URL(url).origin] })
  const echoed = await (await fetch(url)).json()
  expect(echoed.traceparent.endsWith('-00')).toBe(true)
  const missing = await fetch(inject('otelCollectorUrl') + '/control/missing')
  expect(missing.status).toBe(404)
  await new Promise<void>((resolve) => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', url)
    xhr.onabort = () => resolve()
    xhr.send()
    xhr.abort()
  })
  await expect
    .poll(() => otel.records().filter((r: any) => r.kind === 'client').length)
    .toBe(3)
  const errors = otel
    .records()
    .filter((r: any) => r.kind === 'client' && r.status?.code === 'error')
  expect(errors.length).toBe(2)
  otel.dispose()
})

test('exporter network is suppressed and connector disposal drops in-flight completion', async () => {
  const native = fetch
  let release!: (response: Response) => void
  globalThis.fetch = (() =>
    new Promise<Response>((resolve) => {
      release = resolve
    })) as typeof fetch
  const otel = reatomTestTelemetry({ name: 'network-inflight', endpoint: null })
  const connector = applyNetwork(otel)
  const activeBefore = otel.otlp.stats().active
  const pending = fetch('https://request.test/path')
  expect(otel.otlp.stats().active).toBe(activeBefore + 1)
  connector.setFalse()
  expect(otel.otlp.stats().active).toBe(activeBefore)
  release(new Response('{}'))
  await pending
  expect(otel.records().filter((r: any) => r.kind === 'client')).toEqual([])
  connector.setTrue()
  const reconnected = connector
  const recovered = fetch('https://request.test/recovered')
  expect(otel.otlp.stats().active).toBe(activeBefore + 1)
  release(new Response('{}'))
  await recovered
  expect(otel.otlp.stats().active).toBe(activeBefore)
  expect(otel.records().filter((r: any) => r.kind === 'client').length).toBe(1)
  reconnected.setFalse()
  globalThis.fetch = native
  otel.dispose()

  const exported = reatomTestTelemetry({
    name: 'network-exporter',
    endpoint: inject('otelCollectorUrl') + '/collector/allow/no-loop',
    batchInterval: 100000,
    retry: { maxRetries: 0 },
  })
  applyNetwork(exported)
  exported.log('manual.test')
  await exported.flush()
  expect(exported.records().filter((r: any) => r.kind === 'client')).toEqual([])
  exported.dispose()
})

test('configured automatic console redactor is applied without changing native arguments', () => {
  const otel = reatomTestTelemetry({
    name: 'console-custom-redact',
    endpoint: null,
    captureValues: {
      redact: (key, value) => (key === 'custom' ? '[custom-redacted]' : value),
    },
  })
  applyConsole(otel)
  const input = { custom: 'private-marker' }
  console.error(input)
  expect(input.custom).toBe('private-marker')
  const captured = otel
    .records()
    .find((r: any) => r.eventName === 'reatom.console')
  expect(JSON.stringify(captured)).not.toContain('private-marker')
  expect(JSON.stringify(captured)).toContain('[custom-redacted]')
  otel.dispose()
})

test('real analytics session and page metadata reach Faro while HTTP target remains distinct', async () => {
  const { withWebAnalytics } = await import('./web-analytics/index.ts')
  const { faroTransport } = await import('./faro/index.ts')
  const envelopes: any[] = []
  const otel = reatomTestTelemetry({
    name: 'browser-faro-meta',
    endpoint: null,
    batchInterval: 100000,
    transports: [
      faroTransport({
        endpoint: inject('otelCollectorUrl') + '/control/echo',
        fetch: async (_url, init) => {
          envelopes.push(JSON.parse(String(init?.body)))
          return new Response('', { status: 202 })
        },
      }),
    ],
  })
  const analytics = otel.extend(
    withWebAnalytics({
      consent: true,
      errors: false,
      autoPageViews: false,
    }),
  ).analytics
  analytics.pageView()
  const session = analytics.session().id
  expect(session).toBeTruthy()
  applyNetwork(otel)
  await fetch(inject('otelCollectorUrl') + '/control/state?secret=hidden')
  otel.log('manual.metadata')
  await otel.flush()
  const withNetwork = envelopes.find((envelope) =>
    envelope.traces?.resourceSpans.some((resource: any) =>
      resource.scopeSpans.some((scope: any) =>
        scope.spans.some((span: any) => span.kind === 3),
      ),
    ),
  )
  expect(withNetwork.meta.session.id).toBe(session)
  expect(withNetwork.meta.page.url).toBe(location.origin + location.pathname)
  expect(JSON.stringify(withNetwork.traces)).toContain(
    inject('otelCollectorUrl') + '/control/state',
  )
  expect(JSON.stringify(withNetwork.traces)).not.toContain('secret=hidden')
  expect(otel.records().filter((r: any) => r.kind === 'client').length).toBe(1)
  analytics.setFalse()
  otel.dispose()
})

test('HTTP client parent is the invoking action context', async () => {
  const { action } = await import('@reatom/core')
  const otel = reatomTestTelemetry({
    name: 'network-action-parent',
    endpoint: null,
  })
  applyNetwork(otel)
  const request = action(
    () => fetch(inject('otelCollectorUrl') + '/control/state'),
    'browser.request',
  ).extend(otel.withOTel())
  await request()
  const spans = otel.records() as any[]
  const parent = spans.find((span) => span.name === 'browser.request')
  const child = spans.find((span) => span.kind === 'client')
  expect(child.parentSpanId).toBe(parent.spanId)
  expect(child.traceId).toBe(parent.traceId)
  otel.dispose()
})

test('parent disposal and same-name replacement tear down analytics listeners and identity writes', async () => {
  const { withWebAnalytics } = await import('./web-analytics/index.ts')
  const { browserCaptureOf } = await import('./browserCapture.ts')
  const original = reatomTestTelemetry({
    name: 'analytics-parent-lifetime',
    endpoint: null,
  })
  const old = original.extend(
    withWebAnalytics({
      consent: true,
      navigation: 'history',
    }),
  ).analytics
  expect(old.session().id).toBeTruthy()
  const before = JSON.stringify(Object.entries(localStorage))
  original.dispose()
  expect(browserCaptureOf(original)!.snapshot().attributes).toEqual({})
  old.pageView()
  window.dispatchEvent(new PopStateEvent('popstate'))
  window.dispatchEvent(new Event('pointerdown'))
  window.dispatchEvent(
    new ErrorEvent('error', {
      error: new Error('disposed analytics'),
      message: 'disposed analytics',
    }),
  )
  expect(original.records()).toEqual([])
  expect(JSON.stringify(Object.entries(localStorage))).toBe(before)
  old.setFalse()

  const replaced = reatomTestTelemetry({
    name: 'analytics-parent-replace',
    endpoint: null,
  })
  const analytics = replaced.extend(
    withWebAnalytics({
      consent: true,
      navigation: 'history',
    }),
  ).analytics
  const next = reatomTestTelemetry({
    name: 'analytics-parent-replace',
    endpoint: null,
  })
  expect(browserCaptureOf(replaced)!.snapshot().attributes).toEqual({})
  analytics.pageView()
  window.dispatchEvent(new PopStateEvent('popstate'))
  expect(replaced.records()).toEqual([])
  analytics.setFalse()
  next.dispose()
})

test('general async action preserves capture-time page but removes revoked analytics identity', async () => {
  const { action, atom, wrap } = await import('@reatom/core')
  const { withWebAnalytics } = await import('./web-analytics/index.ts')
  const consent = atom(true, 'browser.analytics-consent')
  const otel = reatomTestTelemetry({
    name: 'general-identity-revoke',
    endpoint: null,
  })
  const analytics = otel.extend(
    withWebAnalytics({
      consent,
      errors: false,
      autoPageViews: false,
    }),
  ).analytics
  analytics.pageView()
  const session = analytics.session().id
  expect(session).toBeTruthy()
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const operation = action(async () => {
    await wrap(gate)
    return 'finished'
  }, 'browser.general-pending').extend(otel.withOTel())
  const pending = operation()
  consent.set(false)
  release()
  await pending
  const span = otel
    .records()
    .find((record: any) => record.name === 'browser.general-pending') as any
  expect(span).toBeTruthy()
  expect(span.attributes['session.id']).toBeUndefined()
  expect(span.attributes['page.url']).toBe(location.origin + location.pathname)
  analytics.setFalse()
  otel.dispose()
})

test('cross-realm Request uses its real target and preserves header precedence', async () => {
  const frame = document.createElement('iframe')
  document.body.append(frame)
  const ForeignRequest = (frame.contentWindow as any).Request as typeof Request
  const native = fetch
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = []
  globalThis.fetch = (async (input, init) => {
    calls.push({ input, init })
    return new Response('{}')
  }) as typeof fetch
  const otel = reatomTestTelemetry({
    name: 'cross-realm-network',
    endpoint: null,
  })
  const connector = applyNetwork(otel, {
    propagateTraceparent: [location.origin],
  })
  try {
    const foreign = new ForeignRequest('https://unlisted.example.test/path', {
      headers: { 'x-test': 'foreign' },
    })
    expect(foreign instanceof Request).toBe(false)
    await fetch(foreign)
    expect((calls[0]!.input as Request).headers.has('traceparent')).toBe(false)
    expect(
      (otel.records().find((r: any) => r.kind === 'client') as any).attributes[
        'url.full'
      ],
    ).toBe('https://unlisted.example.test/path')
    const existing = '00-11111111111111111111111111111111-2222222222222222-01'
    const allowed = new ForeignRequest(location.origin + '/allowed', {
      headers: { traceparent: existing, 'x-test': 'foreign' },
    })
    await fetch(allowed)
    expect((calls[1]!.input as Request).headers.get('traceparent')).toBe(
      existing,
    )
    await fetch(allowed, { headers: { 'x-test': 'override' } })
    const headers = (calls[2]!.input as Request).headers
    expect(headers.get('x-test')).toBe('override')
    expect(headers.get('traceparent')).not.toBe(existing)
    expect(allowed.headers.get('traceparent')).toBe(existing)
  } finally {
    connector.setFalse()
    otel.dispose()
    globalThis.fetch = native
    frame.remove()
  }
})

test('reusing XHR from onload records two independent successful requests', async () => {
  const otel = reatomTestTelemetry({ name: 'xhr-reuse', endpoint: null })
  applyNetwork(otel)
  const statuses: number[] = []
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.onerror = reject
    xhr.onload = () => {
      statuses.push(xhr.status)
      if (statuses.length === 1) {
        xhr.open('GET', inject('otelCollectorUrl') + '/control/state?second=1')
        xhr.send()
        const existing = otel
          .records()
          .filter((r: any) => r.kind === 'client') as any[]
        expect(existing.length).toBe(1)
        expect(otel.otlp.stats().active).toBe(1)
      } else resolve()
    }
    xhr.open('GET', inject('otelCollectorUrl') + '/control/state')
    xhr.send()
  })
  expect(statuses).toEqual([200, 200])
  const spans = otel.records().filter((r: any) => r.kind === 'client') as any[]
  expect(spans.length).toBe(2)
  for (const span of spans) {
    expect(span.status?.code).not.toBe('error')
    expect(span.attributes['http.response.status_code']).toBe(200)
    expect(span.endTimeMs).toBeGreaterThanOrEqual(span.startTimeMs)
  }
  expect(otel.otlp.stats().active).toBe(0)
  otel.dispose()
})

test('propagation preserves inherited and non-enumerable RequestInit dictionary fields and getter receivers', async () => {
  const otel = reatomTestTelemetry({
    name: 'dictionary-network',
    endpoint: null,
  })
  const url = inject('otelCollectorUrl') + '/control/echo'
  applyNetwork(otel, { propagateTraceparent: [new URL(url).origin] })
  const controller = new AbortController()
  const prototype = {
    method: 'POST',
    body: 'inherited-body',
    credentials: 'omit',
    signal: controller.signal,
  }
  const init = Object.create(prototype)
  Object.defineProperty(init, 'cache', { value: 'no-store' })
  let received: unknown
  Object.defineProperty(init, 'redirect', {
    get() {
      received = this
      return 'follow'
    },
  })
  const result = await (await fetch(url, init)).json()
  expect(result.method).toBe('POST')
  expect(result.body).toBe('inherited-body')
  expect(received).toBe(init)
  expect(Object.hasOwn(init, 'headers')).toBe(false)
  const hidden: RequestInit = {}
  Object.defineProperties(hidden, {
    method: { value: 'POST' },
    body: { value: 'hidden-body' },
    credentials: { value: 'omit' },
    signal: { value: controller.signal },
  })
  Object.freeze(hidden)
  const second = await (await fetch(url, hidden)).json()
  expect(second.method).toBe('POST')
  expect(second.body).toBe('hidden-body')
  controller.abort()
  await expect(fetch(url, hidden)).rejects.toMatchObject({ name: 'AbortError' })
  otel.dispose()
})

test('successful XHR reopen cancels the superseded request reservation without disposing connector', async () => {
  const otel = reatomTestTelemetry({ name: 'xhr-superseded', endpoint: null })
  applyNetwork(otel)
  const baseline = otel.otlp.stats().active
  const xhr = new XMLHttpRequest()
  const nativeEvents: string[] = []
  xhr.onabort = () => nativeEvents.push('abort')
  const finished = new Promise<void>((resolve, reject) => {
    xhr.onload = () => {
      nativeEvents.push('load')
      expect(xhr.status).toBe(200)
      resolve()
    }
    xhr.onerror = reject
  })
  xhr.open('GET', inject('otelCollectorUrl') + '/control/state')
  xhr.send()
  expect(otel.otlp.stats().active).toBe(baseline + 1)
  xhr.open('GET', inject('otelCollectorUrl') + '/control/state?replacement=1')
  expect(otel.otlp.stats().active).toBe(baseline)
  xhr.send()
  expect(otel.otlp.stats().active).toBe(baseline + 1)
  await finished
  expect(otel.otlp.stats().active).toBe(baseline)
  expect(nativeEvents.filter((event) => event === 'load')).toHaveLength(1)
  expect(otel.records().filter((r: any) => r.kind === 'client')).toHaveLength(1)
  otel.dispose()
})

test('propagation predicate sees full actual query while recorded URL remains sanitized', async () => {
  const otel = reatomTestTelemetry({
    name: 'network-query-policy',
    endpoint: null,
  })
  const seen: string[] = []
  applyNetwork(otel, {
    propagateTraceparent: (url) => {
      seen.push(url.href)
      return !url.searchParams.has('token')
    },
  })
  const target = inject('otelCollectorUrl') + '/control/echo-query-policy'
  const blocked = await (await fetch(target + '?token=private')).json()
  expect(blocked.traceparent).toBeUndefined()
  expect(seen[0]).toBe(target + '?token=private')
  const allowed = await (await fetch(target + '?safe=yes')).json()
  expect(allowed.traceparent).toBeTruthy()
  const spans = otel.records().filter((r: any) => r.kind === 'client') as any[]
  expect(spans).toHaveLength(2)
  expect(spans.map((span) => span.attributes['url.full'])).toEqual([
    target,
    target,
  ])
  expect(JSON.stringify(spans)).not.toContain('private')
  otel.dispose()
})

test('data fetch remains native and never records inline body or propagates', async () => {
  const otel = reatomTestTelemetry({
    name: 'network-data-scheme',
    endpoint: null,
  })
  let policyCalls = 0
  applyNetwork(otel, {
    propagateTraceparent: () => {
      policyCalls++
      return true
    },
  })
  const response = await fetch('data:text/plain,private-body-marker')
  expect(await response.text()).toBe('private-body-marker')
  expect(policyCalls).toBe(0)
  expect(otel.records().filter((r: any) => r.kind === 'client')).toEqual([])
  expect(JSON.stringify(otel.records())).not.toContain('private-body-marker')
  otel.dispose()
})

test('fetch reads method dictionary getter once with its original receiver', async () => {
  const native = fetch
  const target = inject('otelCollectorUrl') + '/control/echo-method-getter'
  let reads = 0
  const makeInit = (): RequestInit => {
    const init = { body: 'getter-body' }
    Object.defineProperty(init, 'method', {
      get() {
        expect(this).toBe(init)
        reads++
        return reads % 2 ? 'POST' : 'GET'
      },
    })
    return init
  }
  const baseline = await (await native(target, makeInit())).json()
  expect(reads).toBe(1)
  reads = 0
  const otel = reatomTestTelemetry({
    name: 'network-method-getter',
    endpoint: null,
  })
  applyNetwork(otel, {
    propagateTraceparent: [new URL(target).origin],
  })
  const captured = await (await fetch(target, makeInit())).json()
  expect(reads).toBe(1)
  expect(captured.method).toBe(baseline.method)
  expect(captured.body).toBe(baseline.body)
  const span = otel.records().find((r: any) => r.kind === 'client') as any
  expect(span.name).toBe('POST')
  expect(span.attributes['http.request.method']).toBe('POST')
  otel.dispose()
})

test('relative fetch and XHR propagation use document baseURI origin', async () => {
  const base = document.createElement('base')
  base.href = inject('otelCollectorUrl') + '/'
  document.head.prepend(base)
  const otel = reatomTestTelemetry({ name: 'network-base-uri', endpoint: null })
  applyNetwork(otel, { propagateTraceparent: [location.origin] })
  try {
    const response = await (await fetch('control/echo-base-relative')).json()
    expect(response.traceparent).toBeUndefined()
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('GET', 'control/echo-base-relative-xhr')
      xhr.onload = () => {
        expect(JSON.parse(xhr.responseText).traceparent).toBeUndefined()
        resolve()
      }
      xhr.onerror = reject
      xhr.send()
    })
    const spans = otel
      .records()
      .filter((r: any) => r.kind === 'client') as any[]
    expect(spans).toHaveLength(2)
    expect(spans.map((span) => span.attributes['url.full'])).toEqual([
      inject('otelCollectorUrl') + '/control/echo-base-relative',
      inject('otelCollectorUrl') + '/control/echo-base-relative-xhr',
    ])
  } finally {
    base.remove()
    otel.dispose()
  }
})

test('URL-like inputs are coerced once and policy matches the actual fetch and XHR destination', async () => {
  const otel = reatomTestTelemetry({
    name: 'network-url-coercion',
    endpoint: null,
  })
  const origin = inject('otelCollectorUrl')
  const allowed = origin + '/control/echo-coercion-allowed'
  const denied = origin + '/control/echo-coercion-denied'
  applyNetwork(otel, {
    propagateTraceparent: (url) => url.pathname.endsWith('allowed'),
  })
  let fetchReads = 0
  const fetchInput = {
    toString() {
      return ++fetchReads === 1 ? denied : allowed
    },
  }
  const fetched = await (await fetch(fetchInput as any)).json()
  expect(fetchReads).toBe(1)
  expect(fetched.traceparent).toBeUndefined()
  let xhrReads = 0
  const xhrInput = {
    toString() {
      return ++xhrReads === 1 ? denied : allowed
    },
  }
  let methodReads = 0
  let headerNameReads = 0
  let headerValueReads = 0
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(
      {
        toString() {
          methodReads++
          return 'GET'
        },
      } as any,
      xhrInput as any,
    )
    xhr.setRequestHeader(1 as any, 'numeric-header')
    xhr.setRequestHeader(
      {
        toString() {
          headerNameReads++
          return 'x-test'
        },
      } as any,
      {
        toString() {
          headerValueReads++
          return 'one-conversion'
        },
      } as any,
    )
    xhr.onload = () => {
      const result = JSON.parse(xhr.responseText)
      expect(result.traceparent).toBeUndefined()
      expect(result.test).toBe('one-conversion')
      resolve()
    }
    xhr.onerror = reject
    xhr.send()
  })
  expect([xhrReads, methodReads, headerNameReads, headerValueReads]).toEqual([
    1, 1, 1, 1,
  ])
  const spans = otel.records().filter((r: any) => r.kind === 'client') as any[]
  expect(spans.map((span) => span.attributes['url.full'])).toEqual([
    denied,
    denied,
  ])
  otel.dispose()
})

test('fetch missing arguments and coercion errors retain native rejected-promise semantics', async () => {
  const otel = reatomTestTelemetry({
    name: 'network-coercion-errors',
    endpoint: null,
  })
  applyNetwork(otel)
  const missing = (fetch as any)()
  expect(missing).toBeInstanceOf(Promise)
  await expect(missing).rejects.toBeInstanceOf(TypeError)
  const error = new Error('coercion failure')
  let result: Promise<Response> | undefined
  expect(() => {
    result = fetch({
      toString() {
        throw error
      },
    } as any)
  }).not.toThrow()
  await expect(result).rejects.toBe(error)
  await expect(fetch(Symbol('url') as any)).rejects.toBeInstanceOf(TypeError)
  const xhr = new XMLHttpRequest()
  expect(() => (xhr.open as any)('GET')).toThrow(TypeError)
  xhr.open('GET', inject('otelCollectorUrl') + '/control/state')
  expect(() => (xhr.setRequestHeader as any)('x-test')).toThrow(TypeError)
  otel.dispose()
})

test('null headers retain native rejection and absent dictionaries ignore Object.prototype fields', async () => {
  const native = fetch
  const url = inject('otelCollectorUrl') + '/control/echo-null-init'
  const otel = reatomTestTelemetry({
    name: 'network-null-init',
    endpoint: null,
  })
  applyNetwork(otel, { propagateTraceparent: [new URL(url).origin] })
  await expect(
    fetch(new Request(url), { headers: null } as any),
  ).rejects.toBeInstanceOf(TypeError)
  const descriptor = Object.getOwnPropertyDescriptor(Object.prototype, 'method')
  try {
    Object.defineProperty(Object.prototype, 'method', {
      configurable: true,
      value: 'POST',
    })
    const baseline = await (await native(url)).json()
    const absent = await (await fetch(url)).json()
    const empty = await (await fetch(url, null as any)).json()
    expect([baseline.method, absent.method, empty.method]).toEqual([
      'GET',
      'GET',
      'GET',
    ])
  } finally {
    if (descriptor)
      Object.defineProperty(Object.prototype, 'method', descriptor)
    else Reflect.deleteProperty(Object.prototype, 'method')
    otel.dispose()
  }
})

test('XHR OPENED reentrancy uses the new request state and locks the open-time base URL', async () => {
  const origin = inject('otelCollectorUrl')
  const otel = reatomTestTelemetry({
    name: 'xhr-opened-transaction',
    endpoint: null,
  })
  applyNetwork(otel, {
    propagateTraceparent: (url) =>
      url.pathname.endsWith('/allowed') && !url.pathname.includes('denied'),
  })
  const xhr = new XMLHttpRequest()
  const sendOnce = (url: string) =>
    new Promise<void>((resolve, reject) => {
      xhr.onload = () => resolve()
      xhr.onerror = reject
      xhr.open('GET', url)
      xhr.send()
    })
  await sendOnce(origin + '/control/echo-opened/allowed')
  let echoed: any
  await new Promise<void>((resolve, reject) => {
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 1) xhr.send()
    }
    xhr.onload = () => {
      echoed = JSON.parse(xhr.responseText)
      resolve()
    }
    xhr.onerror = reject
    xhr.open('GET', origin + '/control/echo-opened/denied')
  })
  expect(echoed.traceparent).toBeUndefined()
  xhr.onreadystatechange = null
  const base = document.createElement('base')
  base.href = origin + '/control/echo-opened/denied/'
  document.head.prepend(base)
  try {
    const finished = new Promise<void>((resolve, reject) => {
      xhr.onload = () => {
        expect(JSON.parse(xhr.responseText).traceparent).toBeUndefined()
        resolve()
      }
      xhr.onerror = reject
    })
    xhr.open('GET', 'allowed')
    base.href = origin + '/control/echo-opened/'
    xhr.send()
    await finished
    expect(otel.otlp.stats().active).toBe(0)
    const spans = otel
      .records()
      .filter((r: any) => r.kind === 'client') as any[]
    expect(spans.map((span) => span.attributes['url.full'])).toEqual([
      origin + '/control/echo-opened/allowed',
      origin + '/control/echo-opened/denied',
      origin + '/control/echo-opened/denied/allowed',
    ])
  } finally {
    base.remove()
    otel.dispose()
  }
})

test('nested XHR opens keep newest state and failed opens preserve pending ownership', async () => {
  const origin = inject('otelCollectorUrl')
  const otel = reatomTestTelemetry({ name: 'xhr-nested-open', endpoint: null })
  applyNetwork(otel, {
    propagateTraceparent: (url) => url.pathname.endsWith('/allowed'),
  })
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    let nested = false
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 1 && !nested) {
        nested = true
        xhr.open('GET', origin + '/control/echo-nested/denied')
        xhr.send()
      }
    }
    xhr.onload = () => {
      expect(JSON.parse(xhr.responseText).traceparent).toBeUndefined()
      resolve()
    }
    xhr.onerror = reject
    xhr.open('GET', origin + '/control/echo-nested/allowed')
  })
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.onload = () => {
      expect(xhr.status).toBe(200)
      resolve()
    }
    xhr.onerror = reject
    xhr.open('GET', origin + '/control/echo-failed-open/allowed')
    xhr.send()
    expect(() =>
      xhr.open('TRACE', origin + '/control/echo-failed-open/denied'),
    ).toThrow()
    expect(otel.otlp.stats().active).toBe(1)
  })
  expect(otel.otlp.stats().active).toBe(0)
  const spans = otel.records().filter((r: any) => r.kind === 'client') as any[]
  expect(spans.map((span) => span.attributes['url.full'])).toEqual([
    origin + '/control/echo-nested/denied',
    origin + '/control/echo-failed-open/allowed',
  ])
  otel.dispose()
})

test('custom primary and secondary transports suppress synchronous network capture', async () => {
  let deliveries = 0
  const origin = inject('otelCollectorUrl')
  const destination = async (batch: any) => {
    deliveries++
    await fetch(origin + '/control/echo-custom-transport', {
      method: 'POST',
      body: JSON.stringify(batch.payload),
    })
    return { accepted: batch.itemCount, rejected: 0 }
  }
  const otel = reatomTestTelemetry({
    name: 'custom-transports-no-loop',
    endpoint: null,
    batchInterval: 100000,
    transports: [destination, destination],
  })
  applyNetwork(otel)
  otel.log('one.manual.event')
  await otel.flush()
  expect(deliveries).toBeGreaterThan(0)
  expect(deliveries).toBeLessThanOrEqual(4)
  expect(otel.records().filter((r: any) => r.kind === 'client')).toEqual([])
  expect(otel.otlp.stats().queued).toBe(0)
  otel.dispose()
})

test('async custom transport uses explicit URL exclusion without suppressing unrelated requests', async () => {
  const origin = inject('otelCollectorUrl')
  const target = origin + '/control/echo-async-transport'
  const seen: string[] = []
  const otel = reatomTestTelemetry({
    name: 'async-custom-transport-no-loop',
    endpoint: null,
    batchInterval: 100000,
    transports: [
      async (batch) => {
        await Promise.resolve()
        await fetch(target + '?token=transport')
        return { accepted: batch.itemCount, rejected: 0 }
      },
    ],
  })
  applyNetwork(otel, {
    ignoreUrl: (url) => {
      seen.push(url.href)
      return url.pathname === '/control/echo-async-transport'
    },
  })
  otel.log('manual.async.transport')
  await otel.flush()
  expect(otel.records().filter((r: any) => r.kind === 'client')).toEqual([])
  expect(seen).toContain(target + '?token=transport')
  await fetch(origin + '/control/state')
  expect(otel.records().filter((r: any) => r.kind === 'client')).toHaveLength(1)
  await otel.flush()
  expect(otel.otlp.stats().queued).toBe(0)
  otel.dispose()
})

test('failed repeated XHR send preserves cancellation ownership through reopen', async () => {
  const otel = reatomTestTelemetry({
    name: 'xhr-repeat-send-owner',
    endpoint: null,
  })
  applyNetwork(otel)
  const xhr = new XMLHttpRequest()
  const target = inject('otelCollectorUrl') + '/control/echo-repeat-send'
  xhr.open('GET', target)
  xhr.send()
  expect(() => xhr.send()).toThrow()
  expect(otel.otlp.stats().active).toBe(1)
  xhr.open('GET', target + '?replacement=1')
  expect(otel.otlp.stats().active).toBe(0)
  const done = new Promise<void>((resolve, reject) => {
    xhr.onload = () => {
      expect(xhr.status).toBe(200)
      resolve()
    }
    xhr.onerror = reject
  })
  xhr.send()
  await done
  expect(otel.otlp.stats().active).toBe(0)
  otel.dispose()
})

test('native Request conversion resolves URL after late method and signal getters mutate document base', async () => {
  const origin = inject('otelCollectorUrl')
  const base = document.createElement('base')
  document.head.prepend(base)
  const otel = reatomTestTelemetry({
    name: 'native-request-late-base',
    endpoint: null,
  })
  applyNetwork(otel, {
    propagateTraceparent: (url) => url.pathname.includes('echo-allowed'),
  })
  try {
    for (const field of ['method', 'signal'] as const) {
      base.href = origin + '/control/echo-allowed/'
      let reads = 0
      const init = Object.defineProperty({}, field, {
        get() {
          reads++
          base.href = origin + '/control/echo-denied/'
          return field === 'method' ? 'GET' : new AbortController().signal
        },
      })
      const response = await (await fetch('target-' + field, init)).json()
      expect(response.traceparent).toBeUndefined()
      expect(reads).toBe(1)
    }
    const spans = otel
      .records()
      .filter((r: any) => r.kind === 'client') as any[]
    expect(spans.map((span) => span.attributes['url.full'])).toEqual([
      origin + '/control/echo-denied/target-method',
      origin + '/control/echo-denied/target-signal',
    ])
  } finally {
    base.remove()
    otel.dispose()
  }
})

test('native Request delegation preserves request body use, abort reason identity and invalid receiver', async () => {
  const native = fetch
  const otel = reatomTestTelemetry({
    name: 'native-request-semantics',
    endpoint: null,
  })
  applyNetwork(otel)
  const target = inject('otelCollectorUrl') + '/control/echo-request-body'
  const request = new Request(target, {
    method: 'POST',
    body: 'native-request-body',
  })
  const result = await (await fetch(request)).json()
  expect(result.body).toBe('native-request-body')
  expect(request.bodyUsed).toBe(true)
  await expect(fetch(request)).rejects.toBeInstanceOf(TypeError)
  const reason = { reason: 'same-identity' }
  const controller = new AbortController()
  controller.abort(reason)
  await expect(fetch(target, { signal: controller.signal })).rejects.toBe(
    reason,
  )
  let nativeError: unknown
  let capturedError: unknown
  try {
    await Reflect.apply(native, {}, [target])
  } catch (error) {
    nativeError = error
  }
  try {
    await Reflect.apply(fetch, {}, [target])
  } catch (error) {
    capturedError = error
  }
  expect(capturedError instanceof TypeError).toBe(
    nativeError instanceof TypeError,
  )
  otel.dispose()
})

test('XHR completes username and password conversions before freezing URL and propagation policy', async () => {
  const origin = inject('otelCollectorUrl')
  const base = document.createElement('base')
  document.head.prepend(base)
  const otel = reatomTestTelemetry({
    name: 'xhr-all-argument-conversions',
    endpoint: null,
  })
  applyNetwork(otel, {
    propagateTraceparent: (url) => {
      base.href = origin + '/control/echo-policy-mutated/'
      return url.pathname.includes('echo-allowed')
    },
  })
  try {
    base.href = origin + '/control/echo-allowed/'
    const calls: string[] = []
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.onload = () => {
        expect(JSON.parse(xhr.responseText).traceparent).toBeUndefined()
        resolve()
      }
      xhr.onerror = reject
      xhr.open(
        'GET',
        'target',
        true,
        {
          toString() {
            calls.push('username')
            base.href = origin + '/control/echo-user/'
            return 'user'
          },
        } as any,
        {
          toString() {
            calls.push('password')
            base.href = origin + '/control/echo-denied/'
            return 'password'
          },
        } as any,
      )
      xhr.send()
    })
    expect(calls).toEqual(['username', 'password'])
    const span = otel.records().find((r: any) => r.kind === 'client') as any
    expect(span.attributes['url.full']).toBe(
      origin + '/control/echo-denied/target',
    )
    const error = new Error('username-conversion')
    const xhr = new XMLHttpRequest()
    expect(() =>
      xhr.open(
        'GET',
        'target',
        true,
        {
          toString() {
            throw error
          },
        } as any,
        {
          toString() {
            throw new Error('password should not run')
          },
        } as any,
      ),
    ).toThrow(error)
  } finally {
    base.remove()
    otel.dispose()
  }
})

test('native Request streaming duplex and locked body behavior match native fetch', async () => {
  const native = fetch
  const target = inject('otelCollectorUrl') + '/control/echo-stream-duplex'
  const make = () =>
    new Request(target, {
      method: 'POST',
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('stream-body'))
          controller.close()
        },
      }),
      duplex: 'half',
    } as any)
  const baselineRequest = make()
  const baseline = await native(baselineRequest).then(
    async (response) => ({
      status: response.status,
      body: (await response.json()).body,
    }),
    (error) => ({ error: error.name }),
  )
  const otel = reatomTestTelemetry({
    name: 'native-stream-duplex',
    endpoint: null,
  })
  applyNetwork(otel)
  const request = make()
  const result = await fetch(request).then(
    async (response) => ({
      status: response.status,
      body: (await response.json()).body,
    }),
    (error) => ({ error: error.name }),
  )
  expect(result).toEqual(baseline)
  expect(request.bodyUsed).toBe(baselineRequest.bodyUsed)
  expect(request.body?.locked).toBe(baselineRequest.body?.locked)
  const locked = make()
  const reader = locked.body!.getReader()
  await expect(fetch(locked)).rejects.toBeInstanceOf(TypeError)
  reader.releaseLock()
  otel.dispose()
})

test('XHR omitted async remains asynchronous while explicit undefined preserves native synchronous mode', async () => {
  const target = inject('otelCollectorUrl') + '/control/echo-xhr-async-presence'
  const otel = reatomTestTelemetry({
    name: 'xhr-async-presence',
    endpoint: null,
  })
  applyNetwork(otel)
  let asynchronousLoaded = false
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.onload = () => {
      asynchronousLoaded = true
      resolve()
    }
    xhr.onerror = reject
    xhr.open('GET', target)
    xhr.send()
    expect(asynchronousLoaded).toBe(false)
  })
  let synchronousLoaded = false
  const xhr = new XMLHttpRequest()
  xhr.onload = () => {
    synchronousLoaded = true
  }
  xhr.open('GET', target, undefined as any)
  xhr.send()
  expect(synchronousLoaded).toBe(true)
  expect(xhr.status).toBe(200)
  expect(otel.otlp.stats().active).toBe(0)
  otel.dispose()
})

test('network policy callbacks can synchronously disable or toggle without leaks or propagation', async () => {
  const origin = inject('otelCollectorUrl')
  const otel = reatomTestTelemetry({
    name: 'network-callback-disable',
    endpoint: null,
  })
  const baseline = otel.otlp.stats().active
  let mode: 'ignore' | 'propagate' | 'toggle' | 'normal' = 'ignore'
  let control: ReturnType<typeof applyNetwork>
  let ignoreCalls = 0
  control = applyNetwork(otel, {
    ignoreUrl: () => {
      ignoreCalls++
      if (mode === 'ignore') control.setFalse()
      if (mode === 'toggle') {
        mode = 'normal'
        control.setFalse()
        control.setTrue()
      }
      return false
    },
    propagateTraceparent: () => {
      if (mode === 'propagate') control.setFalse()
      return true
    },
  })
  try {
    expect((await fetch(origin + '/control/echo-ignore-dispose')).ok).toBe(true)
    expect(ignoreCalls).toBe(1)
    expect(otel.otlp.stats().active).toBe(baseline)
    expect(otel.records().filter((r: any) => r.kind === 'client')).toHaveLength(
      0,
    )
    mode = 'propagate'
    control.setTrue()
    const response = await (
      await fetch(origin + '/control/echo-propagate-dispose')
    ).json()
    expect(response.traceparent).toBeUndefined()
    expect(otel.otlp.stats().active).toBe(baseline)
    expect(otel.records().filter((r: any) => r.kind === 'client')).toHaveLength(
      0,
    )
    mode = 'toggle'
    control.setTrue()
    await fetch(origin + '/control/echo-callback-replacement')
    expect(otel.otlp.stats().active).toBe(baseline)
    expect(otel.records().filter((r: any) => r.kind === 'client')).toHaveLength(
      0,
    )
    await fetch(origin + '/control/echo-callback-replacement-next')
    expect(otel.records().filter((r: any) => r.kind === 'client')).toHaveLength(
      1,
    )
    control.setFalse()
  } finally {
    otel.dispose()
  }
})

test('console redactors can synchronously disable or toggle without recording stale subscribers', () => {
  const native = console.warn
  let nativeCalls = 0
  console.warn = function (...args: unknown[]) {
    nativeCalls++
    return Reflect.apply(native, this, args)
  }
  let control: ReturnType<typeof applyConsole>
  let mode: 'disable' | 'toggle' | 'normal' = 'disable'
  const otel = reatomTestTelemetry({
    name: 'console-redactor-lifetime',
    endpoint: null,
    captureValues: {
      redact: (key, value) => {
        if (key === 'arguments' && mode === 'disable') control.setFalse()
        if (key === 'arguments' && mode === 'toggle') {
          mode = 'normal'
          control.setFalse()
          control.setTrue()
        }
        return value
      },
    },
  })
  try {
    control = applyConsole(otel)
    console.warn('self-disable')
    expect(nativeCalls).toBe(1)
    expect(
      otel.records().filter((r: any) => r.eventName === 'reatom.console'),
    ).toHaveLength(0)
    mode = 'toggle'
    control.setTrue()
    console.warn('toggle-during-capture')
    expect(nativeCalls).toBe(2)
    expect(
      otel.records().filter((r: any) => r.eventName === 'reatom.console'),
    ).toHaveLength(0)
    console.warn('new-subscriber-on-next-call')
    expect(nativeCalls).toBe(3)
    expect(
      otel.records().filter((r: any) => r.eventName === 'reatom.console'),
    ).toHaveLength(1)
    control.setFalse()
  } finally {
    otel.dispose()
    console.warn = native
  }
})

test('throwing analytics consent readers cannot leak pending network or general action reservations', async () => {
  const { action, wrap } = await import('@reatom/core')
  const { withWebAnalytics } = await import('./web-analytics/index.ts')
  let broken = false
  const consent = () => {
    if (broken) throw new Error('consent reader failed')
    return true
  }
  const otel = reatomTestTelemetry({
    name: 'throwing-metadata-reader',
    endpoint: null,
    maxQueueSize: 4,
  })
  const analytics = otel.extend(
    withWebAnalytics({
      consent,
      autoPageViews: false,
      errors: false,
    }),
  ).analytics
  analytics.pageView()
  const session = analytics.session().id
  expect(session).toBeTruthy()
  const connector = applyNetwork(otel)
  const baseline = otel.otlp.stats().active
  const pending = fetch(
    inject('otelCollectorUrl') + '/control/echo-throwing-consent',
  )
  expect(otel.otlp.stats().active).toBe(baseline + 1)
  broken = true
  const response = await pending
  expect(response.status).toBe(200)
  expect(otel.otlp.stats().active).toBe(baseline)
  const client = otel.records().find((r: any) => r.kind === 'client') as any
  expect(client.attributes['session.id']).toBeUndefined()
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const operation = action(async () => {
    await wrap(gate)
    return 'native-result'
  }, 'browser.throwing-reader-action').extend(otel.withOTel())
  const actionPending = operation()
  expect(otel.otlp.stats().active).toBe(baseline + 1)
  release()
  expect(await actionPending).toBe('native-result')
  expect(otel.otlp.stats().active).toBe(baseline)
  const actionSpan = otel
    .records()
    .find((r: any) => r.name === 'browser.throwing-reader-action') as any
  expect(actionSpan.attributes['session.id']).toBeUndefined()
  connector.setFalse()
  expect(otel.otlp.stats().active).toBe(baseline)
  broken = false
  connector.setTrue()
  const recovered = connector
  expect(
    (
      await fetch(
        inject('otelCollectorUrl') + '/control/echo-consent-recovered',
      )
    ).status,
  ).toBe(200)
  expect(otel.otlp.stats().active).toBe(baseline)
  recovered.setFalse()
  analytics.setFalse()
  otel.dispose()
})
