import { chromium } from '../../node_modules/playwright/index.mjs';
import { readFile } from 'node:fs/promises';
const browser = await chromium.launch({ headless: true });
try {
  for (const name of ['reatom-browser-manual-local', 'reatom-browser-errors-otlp', 'reatom-browser-rum-otlp', 'reatom-browser-rum-network-faro', 'reatom-browser-full-informative-faro', 'faro-manual-local', 'otel-manual-local', 'otel-manual-otlp', 'reatom-full-informative-faro', 'reatom-manual-local', 'reatom-errors-otlp', 'reatom-rum-otlp', 'reatom-rum-network-faro', 'otel-errors-otlp', 'otel-rum-network-otlp', 'faro-rum-network-faro']) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>synthetic benchmark</title>' }));
    await page.goto('https://app.example/');
    await page.addScriptTag({ type: 'module', content: await readFile(`dist/${name}.js`, 'utf8') });
    await page.waitForFunction(() => !!globalThis.__bundleBench);
    await page.evaluate(async () => {
      const instance = globalThis.__bundleBench;
      if (instance.dispose) instance.dispose();
      if (instance.sdk?.shutdown) await instance.sdk.shutdown();
      if (instance.sessions?.shutdown) await instance.sessions.shutdown();
      if (instance.shutdown) await instance.shutdown();
    });
    await page.waitForTimeout(30);
    if (errors.length) throw new Error(`${name}: ${errors.join('; ')}`);
    console.log(`${name}: initialization and disposal smoke passed`);
    await page.close();
  }
} finally { await browser.close(); }
