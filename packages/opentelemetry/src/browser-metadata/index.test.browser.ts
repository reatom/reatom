import { expect, test } from 'vitest'
import { reatomTestTelemetry } from '../test-helpers.ts'
import { faroTransport } from '../faro/index.ts'
import { withBrowserMetadata } from './index.ts'

test('native browser brands survive metadata provider and Faro wire projection', async () => {
  const bodies: any[] = []
  const otel = reatomTestTelemetry({
    name: 'native-brand-wire',
    endpoint: null,
    transports: [
      faroTransport({
        endpoint: 'https://faro.invalid/brands',
        fetch: async (_url, init) => {
          bodies.push(JSON.parse(String(init?.body)))
          return new Response('', { status: 202 })
        },
      }),
    ],
  }).extend(withBrowserMetadata())
  try {
    otel.log('metadata-brands')
    await otel.flush()
    const expected = (
      navigator as Navigator & {
        userAgentData: { brands: Array<{ brand: string; version: string }> }
      }
    ).userAgentData.brands
      .slice(0, 10)
      .map(({ brand, version }) => ({
        brand: brand.slice(0, 64),
        version: version.slice(0, 32),
      }))
    expect(expected.length).toBeGreaterThan(0)
    expect(bodies[0].meta.browser.brands).toEqual(expected)
  } finally {
    otel.dispose()
  }
})
