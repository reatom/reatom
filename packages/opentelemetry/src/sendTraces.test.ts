import { expect, test, vi } from 'vitest'

import { sendTraces } from './sendTraces.ts'

const PAYLOAD = { resourceSpans: [] }

const okFetch = () =>
  vi.fn<typeof globalThis.fetch>(
    async () => new Response(null, { status: 200 }),
  )

test('POSTs payload as JSON to /v1/traces', async () => {
  const fetch = okFetch()
  await sendTraces({
    endpoint: 'https://collector.example.com',
    payload: PAYLOAD,
    fetch,
  })
  expect(fetch).toHaveBeenCalledWith(
    'https://collector.example.com/v1/traces',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(PAYLOAD),
    }),
  )
})

test('sets Content-Type: application/json', async () => {
  const fetch = okFetch()
  await sendTraces({
    endpoint: 'https://collector.example.com',
    payload: PAYLOAD,
    fetch,
  })
  const init = fetch.mock.calls[0]![1]! as RequestInit
  expect((init.headers as Record<string, string>)['Content-Type']).toBe(
    'application/json',
  )
})

test('merges custom headers', async () => {
  const fetch = okFetch()
  await sendTraces({
    endpoint: 'https://collector.example.com',
    payload: PAYLOAD,
    headers: { Authorization: 'Bearer abc', 'X-Foo': 'bar' },
    fetch,
  })
  const init = fetch.mock.calls[0]![1]! as RequestInit
  expect(init.headers).toMatchObject({
    'Content-Type': 'application/json',
    Authorization: 'Bearer abc',
    'X-Foo': 'bar',
  })
})

test('trims trailing slash from endpoint', async () => {
  const fetch = okFetch()
  await sendTraces({
    endpoint: 'https://collector.example.com/',
    payload: PAYLOAD,
    fetch,
  })
  expect(fetch.mock.calls[0]![0]).toBe(
    'https://collector.example.com/v1/traces',
  )
})

test('returns the response', async () => {
  const response = new Response(null, { status: 202 })
  const fetch = vi.fn(async () => response)
  const result = await sendTraces({
    endpoint: 'https://collector.example.com',
    payload: PAYLOAD,
    fetch,
  })
  expect(result).toBe(response)
})

test('forwards keepalive: true to fetch when set', async () => {
  const fetch = okFetch()
  await sendTraces({
    endpoint: 'https://collector.example.com',
    payload: PAYLOAD,
    fetch,
    keepalive: true,
  })
  expect(fetch.mock.calls[0]![1]!.keepalive).toBe(true)
})

test('omits keepalive (undefined) when not set', async () => {
  const fetch = okFetch()
  await sendTraces({
    endpoint: 'https://collector.example.com',
    payload: PAYLOAD,
    fetch,
  })
  expect(fetch.mock.calls[0]![1]!.keepalive).toBeUndefined()
})

// fetch can surface both `Content-Type` and `content-type` as a comma-joined
// header value depending on runtime — mangling the OTLP wire. The
// case-insensitive drop keeps the protocol intact.
test('user-supplied content-type (any case) does not shadow application/json', async () => {
  const fetch = okFetch()
  await sendTraces({
    endpoint: 'https://collector.example.com',
    payload: PAYLOAD,
    headers: { 'content-type': 'application/x-protobuf', 'X-Foo': 'bar' },
    fetch,
  })
  const headers = (fetch.mock.calls[0]![1]! as RequestInit)
    .headers as Record<string, string>
  expect(headers['Content-Type']).toBe('application/json')
  expect(headers['content-type']).toBeUndefined()
  expect(headers['X-Foo']).toBe('bar')
})

test('forwards signal to fetch', async () => {
  const controller = new AbortController()
  const fetch = okFetch()
  await sendTraces({
    endpoint: 'https://collector.example.com',
    payload: PAYLOAD,
    fetch,
    signal: controller.signal,
  })
  expect(fetch.mock.calls[0]![1]!.signal).toBe(controller.signal)
})
