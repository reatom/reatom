import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { brotliCompressSync, gzipSync } from 'node:zlib'

const pkg = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const viteRequire = createRequire(require.resolve('vitest/package.json'))
const esbuildRequire = createRequire(viteRequire.resolve('vite'))
const { build, version } = esbuildRequire('esbuild')
const file = resolve(pkg, 'examples/browser.ts')
let source = await readFile(file, 'utf8')
const match = source.match(/^([\s\S]+?)\.extend\(\n([\s\S]+?)\n\)\n/)
assert.ok(match, 'The example must expose its extension chain')
const extensions = match[2].split(/\s*\/\/ \+\d+ kB[^\n]*\n/).filter(Boolean)
const results = []
for (let count = 0; count <= extensions.length; count++) {
  const contents =
    match[1] +
    (count ? `.extend(\n${extensions.slice(0, count).join('')}\n)` : '')
  const result = await build({
    stdin: { contents, resolveDir: pkg, loader: 'ts' },
    bundle: true,
    minify: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    external: ['@reatom/core'],
    write: false,
  })
  const code = result.outputFiles[0].contents
  const brotliBytes = brotliCompressSync(code).length
  const addedBytes = brotliBytes - (results.at(-1)?.brotliBytes ?? 0)
  results.push({
    feature: count
      ? extensions[count - 1].match(/with\w+/)[0]
      : 'reatomOpentelemetry',
    minifiedBytes: code.length,
    gzipBytes: gzipSync(code).length,
    brotliBytes,
    addedBytes,
    roundedKB: Math.ceil(addedBytes / 1000),
  })
}
const comments = results.slice(1).map((row) => row.roundedKB)
if (process.argv.includes('--write')) {
  let index = 0
  source = source.replace(/\/\/ \+\d+ kB/g, () => `// +${comments[index++]} kB`)
  await writeFile(file, source)
} else {
  assert.deepEqual(
    [...source.matchAll(/\/\/ \+(\d+) kB/g)].map((match) => Number(match[1])),
    comments,
    'Refresh example size comments with --write',
  )
  const readme = await readFile(resolve(pkg, 'README.md'), 'utf8')
  assert.ok(
    readme.includes(source.trim()),
    'The README must include the measured example',
  )
}
console.log(
  `esbuild ${version}; ES2022; minified ESM; Brotli; core external; decimal kB`,
)
console.table(results)
const output = process.argv.find((arg) => arg.endsWith('.json'))
if (output)
  await writeFile(
    resolve(output),
    JSON.stringify({ esbuild: version, results }, null, 2) + '\n',
  )
