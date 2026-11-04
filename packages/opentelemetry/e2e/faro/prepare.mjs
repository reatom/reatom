import { createHash } from 'node:crypto'
import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { join, resolve } from 'node:path'
const here = fileURLToPath(new URL('.', import.meta.url))
const deps = join(here, 'prepared/deps')
await mkdir(deps, { recursive: true })
for (const file of ['package.json', 'package-lock.json'])
  await copyFile(join(here, 'reference', file), join(deps, file))
execFileSync(
  'npm',
  ['ci', '--prefix', deps, '--ignore-scripts', '--no-audit', '--no-fund'],
  {
    stdio: 'inherit',
    env: { ...process.env, PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1' },
  },
)
const { build } = await import(
  pathToFileURL(join(deps, 'node_modules/esbuild/lib/main.js'))
)
const output = join(here, 'prepared/apps')
await mkdir(output, { recursive: true })
const manifest = {
  inputs: {},
  outputs: {},
  versions: { faro: '2.13.0', esbuild: '0.25.12' },
}
for (const name of ['native', 'reatom', 'browser']) {
  const result = await build({
    entryPoints: [join(here, name + '.ts')],
    outfile: join(output, name + '.js'),
    bundle: true,
    metafile: true,
    format: 'iife',
    minify: true,
    sourcemap: true,
    nodePaths: [join(deps, 'node_modules')],
    alias: { '@reatom/core': resolve(here, '../../../core/src/index.ts') },
    define: { 'process.env.NODE_ENV': '"production"' },
  })
  for (const input of Object.keys(result.metafile.inputs)) {
    const file = resolve(input)
    manifest.inputs[file] = createHash('sha256')
      .update(await readFile(file))
      .digest('hex')
  }
}
await copyFile(join(output, 'reatom.js'), join(output, 'otlp.js'))
await copyFile(join(output, 'browser.js'), join(output, 'browser-otlp.js'))
for (const name of ['native', 'reatom', 'otlp', 'browser', 'browser-otlp'])
  manifest.outputs[name + '.js'] = createHash('sha256')
    .update(await readFile(join(output, name + '.js')))
    .digest('hex')
await writeFile(join(output, 'build.json'), JSON.stringify(manifest, null, 2))
console.log('Prepared production browser bundles', output)
