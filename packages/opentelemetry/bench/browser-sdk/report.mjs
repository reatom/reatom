import { readFile, writeFile } from 'node:fs/promises';
const report = JSON.parse(await readFile('results.json', 'utf8'));
const baseline = report.results.find(row => row.name === 'reatom-app-baseline').gzipBytes;
let text = '# Browser consumer bundle snapshot\n\n';
text += `${report.results.length} ES2022 production bundles, all dependencies included, two identical builds each. Sizes in bytes. Source snapshot and exact lock hashes are in results.json.\n\n`;
for (const app of [false, true]) {
  text += app ? `Existing Reatom app B gzip: ${baseline}. Marginal gzip below = gzip(whole B+SDK) − gzip(B).\n\n` : 'Standalone gzip, including current @reatom/core source and every dependency:\n\n';
  text += '|Profile|Reatom browser|Reatom automatic|Faro|OTel|\n|---|---:|---:|---:|---:|\n';
  for (const profile of ['manual-local','manual-otlp','errors-otlp','rum-otlp','rum-network-otlp','errors-faro','rum-faro','rum-network-faro']) {
    const values = ['reatom-browser','reatom','faro','otel'].map(sdk => {
      const row = report.results.find(row => row.name === `${sdk}-${profile}${app ? '-app' : ''}`);
      return row ? row.gzipBytes - (app ? baseline : 0) : 'unsupported';
    });
    text += `|${profile}|${values.join('|')}|\n`;
  }
  text += '\n';
}
text += 'Root Reatom profiles retain native Reatom capture and local records. Static browser profiles use the same capture engine with manual startSpan/log and exclude automatic action/route/LOG hooks; forbidden-source graph assertions are recorded for every browser bundle. This is additional causal/value functionality and cost. Results do not support a universal smallest-SDK claim. Matched profiles are coverage comparisons, not proof of semantic equivalence. Full defaults/actions/frustration/CSP/metadata profiles are informative only.\n\nLargest raw-code contributors to static browser RUM OTLP (compressed module sizes are not additive):\n\n';
for (const module of report.results.find(row => row.name === 'reatom-browser-rum-otlp').largestModules) text += `- ${module.path}: ${module.bytesInOutput} bytes\n`;
text += '\nPackage Brotli gates externalize core and use feature-specific expanded caps; they are distinct from these all-bundled consumer measurements and do not establish universal vendor wins. See README.md for methodology, results.json for hashes and settings, and smoke.log for selected Chromium initialization/disposal checks. Browser event parity, throughput, memory use and delivery are not measured.\n';
await writeFile('REPORT.md', text);
