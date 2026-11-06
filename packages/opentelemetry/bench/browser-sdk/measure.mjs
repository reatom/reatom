import { build, version as esbuildVersion } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';
import { createHash } from 'node:crypto';

const faroImport = `import { initializeFaro, getWebInstrumentations, ErrorsInstrumentation, ConsoleInstrumentation, WebVitalsInstrumentation, SessionInstrumentation, ViewInstrumentation, NavigationInstrumentation, PerformanceInstrumentation, UserActionInstrumentation } from '@grafana/faro-web-sdk';`;
const otelRumImports = `
import { ErrorsInstrumentation } from '@opentelemetry/browser-instrumentation/experimental/errors';
import { ConsoleInstrumentation } from '@opentelemetry/browser-instrumentation/experimental/console';
import { NavigationInstrumentation } from '@opentelemetry/browser-instrumentation/experimental/navigation';
import { NavigationTimingInstrumentation } from '@opentelemetry/browser-instrumentation/experimental/navigation-timing';
import { ResourceTimingInstrumentation } from '@opentelemetry/browser-instrumentation/experimental/resource-timing';
import { UserActionInstrumentation } from '@opentelemetry/browser-instrumentation/experimental/user-action';
import { WebVitalsInstrumentation } from '@opentelemetry/browser-instrumentation/experimental/web-vitals';`;
const otelRumInstances = `new ErrorsInstrumentation(), new ConsoleInstrumentation({ logMethods: ['warn', 'error'] }), new NavigationInstrumentation(), new NavigationTimingInstrumentation(), new ResourceTimingInstrumentation(), new WebVitalsInstrumentation()`;
const faroRumInstances = `new ErrorsInstrumentation(), new ConsoleInstrumentation(), new WebVitalsInstrumentation(), new SessionInstrumentation(), new ViewInstrumentation(), new NavigationInstrumentation(), new PerformanceInstrumentation()`;
const faroRumOptions = `trackResources: true, consoleInstrumentation: { disabledLevels: ['log', 'debug', 'trace', 'info'] }, sessionTracking: { enabled: true, persistent: false, maxSessionPersistenceTime: 1800000 }, experimental: { trackNavigation: true }`;
const faroCoreImports = `import { initializeFaro as initializeCore, defaultBatchingConfig, defaultGlobalObjectKey, defaultInternalLoggerLevel, defaultLogArgsSerializer, defaultUnpatchedConsole } from '@grafana/faro-core'; import { ErrorsInstrumentation, FetchTransport, parseStacktrace } from '@grafana/faro-web-sdk';`;
const faroCoreConfig = `app: { name: 'bundle-bench', version: '1.0.0' }, batching: defaultBatchingConfig, dedupe: true, globalObjectKey: defaultGlobalObjectKey, instrumentations: [new ErrorsInstrumentation()], internalLoggerLevel: defaultInternalLoggerLevel, isolate: false, logArgsSerializer: defaultLogArgsSerializer, metas: [], parseStacktrace, paused: false, preventGlobalExposure: true, unpatchedConsole: defaultUnpatchedConsole, sessionTracking: { enabled: false }`;
const sessionImports = `import { createDefaultSessionIdGenerator, createSessionLogRecordProcessor, createSessionManager, createSessionSpanProcessor } from '@opentelemetry/browser-sdk/session';`;
const sessionSetup = `const sessions = createSessionManager({ sessionIdGenerator: createDefaultSessionIdGenerator(), sessionStore: (() => { let value = null; return { async save(session) { value = session; }, async get() { return value; } }; })(), maxDuration: 14400, inactivityTimeout: 1800 }); await sessions.start();`;
const cases = [
  {
    name: 'faro-manual-trace-otlp', tier: 'manual trace + export', transport: 'OTLP HTTP',
    note: 'Manual span, Faro tracing provider with automatic fetch/XHR disabled via an empty instrumentation array. Web SDK defaults remain statically reachable.',
    code: `${faroImport}\nimport { TracingInstrumentation } from '@grafana/faro-web-tracing';\nimport { OtlpHttpTransport } from '@grafana/faro-transport-otlp-http';\nimport { trace } from '@opentelemetry/api';\nglobalThis.__bundleBench = initializeFaro({ app: { name: 'bundle-bench', version: '1.0.0' }, metas: [], sessionTracking: { enabled: false }, instrumentations: [new TracingInstrumentation({ instrumentations: [] })], transports: [new OtlpHttpTransport({ logsURL: 'https://collector.example/v1/logs', tracesURL: 'https://collector.example/v1/traces' })] }); trace.getTracer('bundle-bench').startSpan('manual').end();`,
  },
  {
    name: 'otel-manual-trace-otlp', tier: 'manual trace + export', transport: 'OTLP HTTP',
    note: 'Standalone trace SDK and manual span; no automatic instrumentation, sessions or browser metadata.',
    code: `import { startTracesSdk } from '@opentelemetry/browser-sdk/traces';\nimport { trace } from '@opentelemetry/api';\nglobalThis.__bundleBench = startTracesSdk({ serviceName: 'bundle-bench', serviceVersion: '1.0.0', exportConfig: { url: 'https://collector.example/v1/traces' } }); trace.getTracer('bundle-bench').startSpan('manual').end();`,
  },
  {
    name: 'faro-errors-faro', tier: 'errors', transport: 'Faro',
    note: 'Web SDK initializeFaro, errors only, metas disabled. Factory retains default implementations that bundler cannot prove unreachable.',
    code: `${faroImport}\nglobalThis.__bundleBench = initializeFaro({ url: 'https://collector.example/collect', app: { name: 'bundle-bench', version: '1.0.0' }, metas: [], instrumentations: [new ErrorsInstrumentation()] });`,
  },
  {
    name: 'faro-errors-otlp', tier: 'errors', transport: 'OTLP HTTP',
    note: 'Same Web SDK errors config with experimental native OTLP transport.',
    code: `${faroImport}\nimport { OtlpHttpTransport } from '@grafana/faro-transport-otlp-http';\nglobalThis.__bundleBench = initializeFaro({ app: { name: 'bundle-bench', version: '1.0.0' }, metas: [], instrumentations: [new ErrorsInstrumentation()], transports: [new OtlpHttpTransport({ logsURL: 'https://collector.example/v1/logs', tracesURL: 'https://collector.example/v1/traces' })] });`,
  },
  {
    name: 'otel-errors-otlp', tier: 'errors', transport: 'OTLP HTTP',
    note: 'Published logs-only SDK and one error instrumentation; no sessions or browser detection.',
    code: `import { startLogsSdk } from '@opentelemetry/browser-sdk/logs';\nimport { ErrorsInstrumentation } from '@opentelemetry/browser-instrumentation/experimental/errors';\nglobalThis.__bundleBench = startLogsSdk({ serviceName: 'bundle-bench', serviceVersion: '1.0.0', exportConfig: { url: 'https://collector.example/v1/logs' }, instrumentations: [new ErrorsInstrumentation()] });`,
  },
  {
    name: 'faro-rum-faro', tier: 'RUM common coverage', transport: 'Faro',
    note: 'Errors, console warn/error, vitals, sessions, views/navigation, performance, pageviews; browser metadata disabled. Faro-specific behavior is not identical to OTel events.',
    code: `${faroImport}\nglobalThis.__bundleBench = initializeFaro({ url: 'https://collector.example/collect', app: { name: 'bundle-bench', version: '1.0.0' }, metas: [], ${faroRumOptions}, instrumentations: [${faroRumInstances}] });`,
  },
  {
    name: 'faro-rum-otlp', tier: 'RUM common coverage', transport: 'OTLP HTTP',
    note: 'Same common Faro RUM coverage with experimental OTLP transport.',
    code: `${faroImport}\nimport { OtlpHttpTransport } from '@grafana/faro-transport-otlp-http';\nglobalThis.__bundleBench = initializeFaro({ app: { name: 'bundle-bench', version: '1.0.0' }, metas: [], ${faroRumOptions}, instrumentations: [${faroRumInstances}], transports: [new OtlpHttpTransport({ logsURL: 'https://collector.example/v1/logs', tracesURL: 'https://collector.example/v1/traces' })] });`,
  },
  {
    name: 'otel-rum-otlp', tier: 'RUM common coverage', transport: 'OTLP HTTP',
    note: 'Logs-only SDK; errors, console warn/error, navigation/resource timing, vitals, RAM-only session lifecycle. No browser detector.',
    code: `import { startLogsSdk } from '@opentelemetry/browser-sdk/logs';\n${otelRumImports}\n${sessionImports}\nasync function boot() { ${sessionSetup} globalThis.__bundleBench = { sessions, sdk: startLogsSdk({ serviceName: 'bundle-bench', serviceVersion: '1.0.0', exportConfig: { url: 'https://collector.example/v1/logs' }, processors: [createSessionLogRecordProcessor(sessions)], instrumentations: [${otelRumInstances}] }) }; }\nboot();`,
  },
  {
    name: 'faro-rum-network-otlp', tier: 'RUM common coverage + network traces', transport: 'OTLP HTTP',
    note: 'Common Faro RUM plus default fetch/XHR tracing and experimental OTLP transport; no Zone.js requested.',
    code: `${faroImport}\nimport { TracingInstrumentation } from '@grafana/faro-web-tracing';\nimport { OtlpHttpTransport } from '@grafana/faro-transport-otlp-http';\nglobalThis.__bundleBench = initializeFaro({ app: { name: 'bundle-bench', version: '1.0.0' }, metas: [], ${faroRumOptions}, instrumentations: [${faroRumInstances}, new TracingInstrumentation({ instrumentationOptions: { propagateTraceHeaderCorsUrls: [new RegExp('^https://api[.]example(?:/|$)')] } })], transports: [new OtlpHttpTransport({ logsURL: 'https://collector.example/v1/logs', tracesURL: 'https://collector.example/v1/traces' })] });`,
  },
  {
    name: 'otel-rum-network-otlp', tier: 'RUM common coverage + network traces', transport: 'OTLP HTTP',
    note: 'Common OTel RUM plus fetch/XHR spans and session span/log processors; no Zone.js or browser detector.',
    code: `import { startBrowserSdk } from '@opentelemetry/browser-sdk';\n${otelRumImports}\n${sessionImports}\nimport { FetchInstrumentation } from '@opentelemetry/browser-instrumentation/experimental/fetch';\nimport { XhrInstrumentation } from '@opentelemetry/browser-instrumentation/experimental/xhr';\nasync function boot() { ${sessionSetup} globalThis.__bundleBench = { sessions, sdk: startBrowserSdk({ serviceName: 'bundle-bench', serviceVersion: '1.0.0', exportConfig: { url: 'https://collector.example' }, logs: { exportConfig: { url: 'https://collector.example/v1/logs' }, processors: [createSessionLogRecordProcessor(sessions)] }, traces: { exportConfig: { url: 'https://collector.example/v1/traces' }, processors: [createSessionSpanProcessor(sessions)] }, instrumentations: [${otelRumInstances}, new FetchInstrumentation(), new XhrInstrumentation()] }) }; }\nboot();`,
  },
  {
    name: 'faro-defaults-faro', tier: 'product default', transport: 'Faro',
    note: 'Default RUM including browser/OS metadata, frustration and CSP; no network tracing or replay. Not a feature-equivalent comparator to OTel common config.',
    code: `${faroImport}\nglobalThis.__bundleBench = initializeFaro({ url: 'https://collector.example/collect', app: { name: 'bundle-bench', version: '1.0.0' }, instrumentations: getWebInstrumentations() });`,
  },
  {
    name: 'faro-defaults-network-faro', tier: 'product default + network traces', transport: 'Faro',
    note: 'Default Faro RUM + default fetch/XHR tracing; browser/OS metadata retained; no replay. No directly equivalent OTel default.',
    code: `${faroImport}\nimport { TracingInstrumentation } from '@grafana/faro-web-tracing';\nglobalThis.__bundleBench = initializeFaro({ url: 'https://collector.example/collect', app: { name: 'bundle-bench', version: '1.0.0' }, instrumentations: [...getWebInstrumentations(), new TracingInstrumentation({ instrumentationOptions: { propagateTraceHeaderCorsUrls: [new RegExp('^https://api[.]example(?:/|$)')] } })] });`,
  },
  {
    name: 'faro-core-errors-faro', tier: 'advanced core wiring diagnostic', transport: 'Faro',
    note: 'Manual core Config avoids Web SDK default factory. Errors + FetchTransport only; no automatic sessions/meta/vitals. Static size diagnostic; not a compatibility-tested replacement for initializeFaro.',
    code: `${faroCoreImports}\nglobalThis.__bundleBench = initializeCore({ ${faroCoreConfig}, transports: [new FetchTransport({ url: 'https://collector.example/collect' })] });`,
  },
  {
    name: 'faro-core-errors-otlp', tier: 'advanced core wiring diagnostic', transport: 'OTLP HTTP',
    note: 'Same advanced core wiring with experimental OTLP transport; no automatic sessions/meta/vitals. Static size diagnostic, not runtime verified.',
    code: `${faroCoreImports}\nimport { OtlpHttpTransport } from '@grafana/faro-transport-otlp-http';\nglobalThis.__bundleBench = initializeCore({ ${faroCoreConfig}, transports: [new OtlpHttpTransport({ logsURL: 'https://collector.example/v1/logs', tracesURL: 'https://collector.example/v1/traces' })] });`,
  },
  {
    name: 'faro-errors-instrumentation-only', tier: 'component diagnostic', transport: 'none',
    note: 'Retained error instrumentation constructor only; not a functioning SDK, export or initialized RUM.',
    code: `import { ErrorsInstrumentation } from '@grafana/faro-web-sdk'; globalThis.__bundleBench = new ErrorsInstrumentation();`,
  },
  {
    name: 'otel-errors-instrumentation-only', tier: 'component diagnostic', transport: 'none',
    note: 'Retained error instrumentation constructor only; not a functioning SDK/export.',
    code: `import { ErrorsInstrumentation } from '@opentelemetry/browser-instrumentation/experimental/errors'; globalThis.__bundleBench = new ErrorsInstrumentation();`,
  },
];



// Manual profiles retain actual log + ended span calls, not unused exports.
const otelManualImports = `import { startBrowserSdk } from '@opentelemetry/browser-sdk'; import { trace } from '@opentelemetry/api'; import { logs } from '@opentelemetry/api-logs';`;
const manualOtelCalls = `logs.getLogger('bundle-bench').emit({ body: 'manual' }); trace.getTracer('bundle-bench').startSpan('manual').end();`;
cases.push({ name: 'otel-manual-otlp', tier: 'manual log + span', transport: 'OTLP HTTP', note: 'Explicit logs and traces, no automatic instruments.', code: otelManualImports + `globalThis.__bundleBench = startBrowserSdk({ serviceName: 'bundle-bench', logs: { exportConfig: { url: 'https://collector.example/v1/logs' } }, traces: { exportConfig: { url: 'https://collector.example/v1/traces' } } });` + manualOtelCalls });
cases.push({ name: 'otel-manual-local', tier: 'manual log + span', transport: 'local', note: 'Custom in-memory log/span processors; no exporters, no instrumentations.', code: otelManualImports + `const records = []; const processor = { onEmit(record) { records.push(record); }, onStart() {}, onEnd(span) { records.push(span); }, async forceFlush() {}, async shutdown() {} }; globalThis.__bundleBench = { records, sdk: startBrowserSdk({ serviceName: 'bundle-bench', logs: { processors: [processor] }, traces: { processors: [processor] } }) };` + manualOtelCalls });
for (const transport of ['local', 'faro', 'otlp']) {
 const setup = transport === 'local' ? `class LocalTransport extends BaseTransport { name = 'local'; version = '1'; send(items) { records.push(items); } } const records = []; const transports = [new LocalTransport()];` : transport === 'otlp' ? `const transports = [new OtlpHttpTransport({ logsURL: 'https://collector.example/v1/logs', tracesURL: 'https://collector.example/v1/traces' })];` : '';
 cases.push({ name: 'faro-manual-' + transport, tier: 'manual log + span', transport, note: 'Faro native manual log + tracing bridge, auto instrumentation disabled. Local transport stores batches in memory.', code: faroImport + `import { BaseTransport } from '@grafana/faro-web-sdk'; import { TracingInstrumentation } from '@grafana/faro-web-tracing'; import { OtlpHttpTransport } from '@grafana/faro-transport-otlp-http'; import { trace } from '@opentelemetry/api';` + setup + `const sdk = initializeFaro({ app: { name: 'bundle-bench' }, metas: [], sessionTracking: { enabled: false }, instrumentations: [new TracingInstrumentation({ instrumentations: [] })], ${transport === 'faro' ? "url: 'https://collector.example/collect'" : 'transports'} }); sdk.api.pushLog(['manual']); trace.getTracer('bundle-bench').startSpan('manual').end(); globalThis.__bundleBench = sdk;` });
}
const sdk = new URL('../../src/', import.meta.url).pathname;
const reatom = () => sdk + 'index.ts';
const app = `import { atom, action, computed } from '@reatom/core'; const count = atom(0, 'counter'); const increment = action(() => count.set(count() + 1), 'increment'); const doubled = computed(() => count() * 2, 'doubled'); globalThis.__app = { count, increment, doubled };`;
const modules = {
 errors: ['browser-errors','withBrowserErrors','{}'],
 analytics: ['web-analytics','withWebAnalytics',"{ consent: true, persistSession: false, persistVisitor: false, errors: false }"],
 console: ['browser-console','withBrowserConsoleMonkeypatch',"{ levels: ['warn', 'error'] }"],
 vitals: ['web-vitals','withWebVitals','{}'],
 actions: ['browser-actions','withBrowserActions','{}'],
 csp: ['browser-csp','withBrowserCsp','{}'],
 metadata: ['browser-metadata','withBrowserMetadata','{}'],
 performance: ['browser-performance','withBrowserPerformance',"{ format: 'events' }"],
 network: ['browser-network','withBrowserNetworkMonkeypatch',"{ propagateTraceparent: ['https://api.example'] }"],
};
for (const transport of ['local','otlp','faro']) {
 for (const profile of ['manual','errors','rum','rum-network','full-informative']) {
  if (transport === 'local' && profile !== 'manual') continue;
  const selected = profile === 'manual' ? [] : profile === 'errors' ? ['errors'] : ['errors','analytics','console','vitals','performance', ...(profile === 'rum-network' ? ['network'] : profile === 'full-informative' ? ['actions','csp','metadata'] : [])];
  let imports = `import { action as benchAction } from '@reatom/core'; import { reatomOpentelemetry } from ${JSON.stringify(reatom('.'))};`;
  const extensions = [];
  if (transport !== 'local') {
   const method = transport === 'otlp' ? 'withOTLP' : 'withFaro';
   imports += `import { ${method} } from ${JSON.stringify(reatom())};`;
   extensions.push(`${method}({ ${transport === 'otlp' ? "endpoint: 'https://collector.example'" : "endpoint: 'https://collector.example/collect'"} })`);
  }
  for (const key of selected) {
   const [entry, method, options] = modules[key];
   imports += `import { ${method} } from ${JSON.stringify(reatom(entry))};`;
   extensions.push(`${method}(${options})`);
  }
  const code = imports + `const sdk = reatomOpentelemetry({ name: 'bundle-bench', serviceName: 'bundle-bench' })${extensions.length ? `.extend(${extensions.join(',')})` : ''}; sdk.log('manual', { synthetic: true }); benchAction(() => {}, 'manual').extend(sdk.withOTel())(); globalThis.__bundleBench = sdk;`;
  const base = { name: `reatom-${profile}-${transport}`, tier: profile, transport, note: 'Current source; all dependencies including @reatom/core bundled. Native captureReatom/local records defaults retained.', code };
  cases.push(base);
  cases.push({ ...base, name: base.name + '-app', code: app + code, note: base.note + ' Whole existing Reatom app plus SDK compressed together.' });
 }
}
// The browser factory shares records/exporters but tree-shakes automatic Reatom instrumentation.
// Keep root profiles above unchanged: they intentionally retain extra native behavior.
for (const root of [...cases].filter(item => item.name.startsWith('reatom-'))) {
  const code = root.code
    .replace("import { action as benchAction } from '@reatom/core'; ", '')
    .replace('import { reatomOpentelemetry }', 'import { reatomBrowserTelemetry as reatomOpentelemetry }')
    .replace("benchAction(() => {}, 'manual').extend(sdk.withOTel())();", "sdk.startSpan({ name: 'manual' }).finish();");
  cases.push({ ...root, name: root.name.replace('reatom-', 'reatom-browser-'), code,
    note: 'Current root-imported browser factory, manual log/startSpan, shared canonical records/sampling/export. All dependencies including core bundled. Automatic Reatom action/route/LOG instrumentation excluded.' });
}
const faroNetwork = cases.find(c => c.name === 'faro-rum-network-otlp');
cases.push({ ...faroNetwork, name: 'faro-rum-network-faro', transport: 'Faro', code: faroNetwork.code.replace("app: { name:", "url: 'https://collector.example/collect', app: { name:").replace(/, transports: \[new OtlpHttpTransport\(.*?\)\]/, '') });
for (const item of [...cases]) if (!item.name.startsWith('reatom-')) cases.push({ ...item, name: item.name + '-app', code: app + item.code, note: item.note + ' Whole baseline Reatom app + SDK.' });
cases.push({ name: 'reatom-app-baseline', tier: 'baseline', transport: 'none', note: 'Same existing Reatom consumer code used for all B+SDK bundles.', code: app });

await mkdir('entries', { recursive: true });
await mkdir('dist', { recursive: true });
await mkdir('metafiles', { recursive: true });
const assertBrowserGraph = (name, metafile) => {
  const forbidden = ['withOTel.ts', 'causes.ts', 'roots/route.ts', 'instanceLogHooks.ts', 'reatomOpentelemetry.ts'];
  const paths = Object.values(metafile.outputs).flatMap(output => Object.entries(output.inputs).filter(([, input]) => input.bytesInOutput > 0).map(([path]) => path.replaceAll('\\', '/')));
  const found = paths.filter(path => forbidden.some(module => path.endsWith('/src/' + module)));
  if (found.length) throw new Error(`Browser profile ${name} includes automatic Reatom instrumentation: ${found.join(', ')}`);
  return { passed: true, forbiddenSourceModules: forbidden, includesAutomaticLogHooks: false };
};
const results = [];
const sourceHashes = {};
for (const c of cases.filter(c => !c.name.includes('core-errors') && !c.name.includes('instrumentation-only'))) {
  if (c.name.startsWith('otel-')) c.code = c.code.replace(/new (\w+Instrumentation)\(\)/g, 'new $1({ enabled: false })').replace("{ logMethods:", "{ enabled: false, logMethods:").replace("new FetchInstrumentation({ enabled: false })", "new FetchInstrumentation({ enabled: false, propagateTraceHeaderCorsUrls: [new RegExp('^https://api[.]example(?:/|$)')] })").replace("new XhrInstrumentation({ enabled: false })", "new XhrInstrumentation({ enabled: false, propagateTraceHeaderCorsUrls: [new RegExp('^https://api[.]example(?:/|$)')] })");
  await writeFile(`entries/${c.name}.js`, c.code + '\n');
  const output = `dist/${c.name}.js`;
  const options = {
    entryPoints: [`entries/${c.name}.js`], outfile: output,
    alias: { '@reatom/core': new URL('../../../core/src/index.ts', import.meta.url).pathname, 'web-vitals/attribution': new URL('node_modules/web-vitals/dist/web-vitals.attribution.js', import.meta.url).pathname, 'web-vitals': new URL('node_modules/web-vitals/dist/web-vitals.js', import.meta.url).pathname, 'idb-keyval': new URL('node_modules/idb-keyval/dist/index.js', import.meta.url).pathname },
    bundle: true, minify: true, treeShaking: true,
    platform: 'browser', format: 'esm', target: 'es2022',
    mainFields: ['browser', 'module', 'main'],
    define: { 'process.env.NODE_ENV': '"production"' },
    sourcemap: false, legalComments: 'none', charset: 'utf8', metafile: true,
  };
  const res = await build(options);
  const sourceGraphAssertion = c.name.startsWith('reatom-browser-') ? assertBrowserGraph(c.name, res.metafile) : undefined;
  const first = await readFile(output);
  await build(options);
  if (!first.equals(await readFile(output))) throw new Error('Non-reproducible build: ' + c.name);
  const data = await readFile(output);
  for (const path of Object.keys(res.metafile.inputs)) {
    const hash = createHash('sha256').update(await readFile(path)).digest('hex');
    if (sourceHashes[path] && sourceHashes[path] !== hash) throw new Error('Source changed during measurement: ' + path);
    sourceHashes[path] = hash;
  }
  if (Object.values(res.metafile.outputs).some(output => output.imports.some(item => item.external))) throw new Error('External dependency in ' + c.name);
  const packageBytes = new Map();
  for (const input of Object.values(res.metafile.outputs)) {
    for (const [path, contribution] of Object.entries(input.inputs)) {
      const match = path.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/);
      const pkg = match?.[1] ?? '<entry>';
      packageBytes.set(pkg, (packageBytes.get(pkg) ?? 0) + contribution.bytesInOutput);
    }
  }
  const dependencies = [...packageBytes].sort((a,b) => b[1]-a[1]).map(([name,bytesInOutput]) => ({ name, bytesInOutput }));
  const row = {
    name: c.name, tier: c.tier, transport: c.transport, note: c.note,
    rawBytes: data.byteLength,
    gzipBytes: gzipSync(data, { level: 9 }).byteLength,
    brotliBytes: brotliCompressSync(data, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).byteLength,
    sha256: createHash('sha256').update(data).digest('hex'),
    dependencies,
    largestModules: Object.entries(res.metafile.outputs[output]?.inputs ?? {}).map(([path, v]) => ({ path, bytesInOutput: v.bytesInOutput })).sort((a,b) => b.bytesInOutput-a.bytesInOutput).slice(0, 15),
    duplicateBuildIdentical: true,
    ...(sourceGraphAssertion ? { sourceGraphAssertion } : {}),
  };
  results.push(row);
  await writeFile(`metafiles/${c.name}.json`, JSON.stringify(res.metafile, null, 2));
}
for (const [path, hash] of Object.entries(sourceHashes)) if (createHash('sha256').update(await readFile(path)).digest('hex') !== hash) throw new Error('Source changed before report completed: ' + path);
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const lock = await readFile('package-lock.json');
const report = {
  sourceHashes, measuredAt: new Date().toISOString(), node: process.version, esbuild: esbuildVersion,
  settings: { platform: 'browser', format: 'esm', target: 'es2022', mainFields: ['browser', 'module', 'main'], conditions: 'esbuild defaults, including automatic module condition', minify: true, treeShaking: true, sourceMap: false, gzipLevel: 9, brotliQuality: 11, includeAllDependencies: true, runtimeExecutionTested: 'separate smoke.mjs covers selected initializers/disposal only; no telemetry delivery/coverage assertion' },
  directDependencies: pkg.dependencies,
  lockSha256: createHash('sha256').update(lock).digest('hex'),
  limitations: [
    'Static consumer bundles from published npm versions; not browser runtime/performance benchmarks.',
    'Coverage-matched RUM is not byte-for-byte semantic equivalence: defaults, session policy, URL handling, delivery/retry and metadata differ.',
    'No React adapters, Zone.js or replay packages included.',
    'Faro default factories may retain default modules even when explicit instrumentation/meta options are supplied.',
    'Current GitHub main of OTel Browser has unreleased API/lifecycle changes; measurements use npm SDK 0.6.0 and instrumentation 0.9.0.',
    'Package bytesInOutput are esbuild raw-code contribution estimates; compressed package contributions are not additive.',
  ], results,
};
await writeFile('results.json', JSON.stringify(report, null, 2) + '\n');
await writeFile('results.csv', 'name,tier,transport,raw_bytes,gzip_bytes,brotli_bytes\n' + results.map(r => [r.name, r.tier, r.transport, r.rawBytes, r.gzipBytes, r.brotliBytes].join(',')).join('\n') + '\n');
console.table(results.map(({ name, rawBytes, gzipBytes, brotliBytes }) => ({ name, rawBytes, gzipBytes, brotliBytes })));
