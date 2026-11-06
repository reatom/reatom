import { action, atom, wrap } from '@reatom/core'
import {
  reatomOpentelemetry,
  withGDPR,
  withOTLP,
  withWebAnalytics,
  withBrowserNetworkMonkeypatch,
  withBrowserConsoleMonkeypatch,
  withWebVitals,
  withBrowserPerformance,
} from '@reatom/opentelemetry'

export const otel = reatomOpentelemetry({
  name: 'shop.browser',
  serviceName: 'shop-web',
}).extend(
  // +1 kB: consent form and saved choices
  withGDPR({ categories: { analytics: false, diagnostics: false } }),
  // +7 kB: OTLP delivery, batching and retry
  withOTLP({ endpoint: 'https://shop.example/otel' }),
  // +5 kB: page views, sessions and engagement
  withWebAnalytics(),
  // +2 kB: fetch/XHR spans and distributed trace propagation
  withBrowserNetworkMonkeypatch({
    propagateTraceparent: ['https://api.shop.example'],
  }),
  // +1 kB: console warnings and errors
  withBrowserConsoleMonkeypatch({ levels: ['warn', 'error'] }),
  // +4 kB: CLS, FCP, INP, LCP and TTFB
  withWebVitals(),
  // +2 kB: navigation and resource timings
  withBrowserPerformance(),
)

// Models defined after setup are traced automatically.
export const cartTotal = atom(0, 'cart.total')
export const checkout = action(async () => {
  const response = await wrap(
    fetch('https://api.shop.example/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ total: cartTotal() }),
    }),
  )
  if (!response.ok) throw new Error(`Checkout failed: ${response.status}`)
  cartTotal.set(0)
}, 'checkout')
