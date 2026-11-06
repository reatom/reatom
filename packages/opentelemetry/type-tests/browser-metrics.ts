import type { BooleanAtom } from '@reatom/core'
import {
  withBrowserNetworkMonkeypatch,
  withBrowserConsoleMonkeypatch,
  type ReatomOpentelemetry,
  withBrowserPerformance,
  withWebVitals,
} from '../src/index.ts'
import * as network from '../src/index.ts'
import * as consoleCapture from '../src/index.ts'
import * as performanceCapture from '../src/index.ts'
import * as vitals from '../src/index.ts'

declare function expectNever<Check extends never>(_check?: Check): void

export const verifyMetrics = (otel: ReatomOpentelemetry) => {
  // @ts-expect-error Capture controls exist only after their extension.
  otel.browserNetwork
  // @ts-expect-error Console capture is not installed by constructing an SDK.
  otel.browserConsole
  // @ts-expect-error Web Vitals is an optional entry.
  otel.webVitals
  // @ts-expect-error Performance capture is an optional entry.
  otel.browserPerformance
  const extended = otel.extend(
    withBrowserNetworkMonkeypatch({
      propagateTraceparent: ['https://api.example.test'],
    }),
    withBrowserConsoleMonkeypatch({ levels: ['warn', 'error'] }),
    withWebVitals(),
    withBrowserPerformance({
      navigation: true,
      resources: false,
      ignoreUrl: (url) => url.pathname === '/custom-collector',
    }),
  )
  const networkControl: BooleanAtom = extended.browserNetwork
  const consoleControl: BooleanAtom = extended.browserConsole
  const vitalsControl: BooleanAtom = extended.webVitals
  const performanceControl: BooleanAtom = extended.browserPerformance
  networkControl.setFalse()
  consoleControl.setTrue()
  vitalsControl.toggle()
  performanceControl.set(false)
  // @ts-expect-error Propagation requires an explicit origin list or URL predicate.
  withBrowserNetworkMonkeypatch({ propagateTraceparent: true })
  // @ts-expect-error Console capture only supports named console levels.
  withBrowserConsoleMonkeypatch({ levels: ['trace'] })
  // @ts-expect-error URL exclusion requires a synchronous URL predicate.
  withBrowserNetworkMonkeypatch({ ignoreUrl: ['https://collector.test'] })
  // @ts-expect-error URL predicates cannot return promises.
  withBrowserNetworkMonkeypatch({ ignoreUrl: async () => true })
  // @ts-expect-error Web Vitals has no configuration registry.
  withWebVitals({ enabled: true })
  // @ts-expect-error resources must be a boolean.
  withBrowserPerformance({ resources: 'all' })
  // @ts-expect-error URL exclusion must be a URL predicate.
  withBrowserPerformance({ ignoreUrl: ['https://collector.test'] })
  // @ts-expect-error Replay is outside the timing extension.
  withBrowserPerformance({ replay: true })
  expectNever(
    null as unknown as Extract<keyof typeof network, 'connectBrowserNetwork'>,
  )
  expectNever(
    null as unknown as Extract<
      keyof typeof consoleCapture,
      'connectBrowserConsole'
    >,
  )
  expectNever(
    null as unknown as Extract<
      keyof typeof performanceCapture,
      'connectBrowserPerformance'
    >,
  )
  expectNever(
    null as unknown as Extract<keyof typeof vitals, 'connectWebVitals'>,
  )
}
