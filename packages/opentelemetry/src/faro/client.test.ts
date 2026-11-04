import { expect, test, vi } from 'vitest'
import { reatomOpentelemetry } from '../index.ts'
import { withFaro } from './client.ts'

test('Faro client composes delivery without browser collectors', async () => {
  const requests: RequestInit[] = []
  const fetch = vi.fn(async (_url: unknown, init?: RequestInit) => {
    requests.push(init!)
    return new Response(null, { status: 202 })
  })
  const otel = reatomOpentelemetry({
    name: 'faro.client.local',
    serviceName: 'shop',
    signals: { traces: false },
  }).extend(withFaro({ endpoint: 'https://faro.test/collect', fetch }))
  otel.log('test.event', { marker: 'faro-client' })
  await otel.flush()
  expect(fetch).toHaveBeenCalledTimes(1)
  expect(JSON.parse(requests[0]!.body as string).events[0].name).toBe(
    'test.event',
  )
  expect(otel.records().length).toBeGreaterThan(0)
  expect('analytics' in otel).toBe(false)
  expect(otel.otlp().endpoint).toBeNull()
  expect(otel.otlp.stats().exported).toBe(1)
  otel.dispose()
})

test('accepted invalid session responses notify the installed native session', async () => {
  const rotate = vi.fn()
  const invalid = vi.fn()
  const otel = reatomOpentelemetry({
    name: 'faro.client.session',
    serviceName: 'shop',
    signals: { traces: false },
  })
    .extend(() => ({
      analytics: { rotateSession: rotate },
    }))
    .extend(
      withFaro({
        endpoint: 'https://faro.test/collect',
        fetch: async () =>
          new Response(null, {
            status: 202,
            headers: { 'X-Faro-Session-Status': 'invalid' },
          }),
        onSessionInvalid: invalid,
      }),
    )
  otel.log('test.event', { 'session.id': 'captured-session' })
  await otel.flush()
  expect(rotate).toHaveBeenCalledWith('captured-session')
  expect(invalid).toHaveBeenCalledWith('captured-session')
  expect(otel.otlp.stats().exported).toBe(1)
  otel.dispose()
})
