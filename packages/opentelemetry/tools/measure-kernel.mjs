import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { brotliCompressSync, gzipSync } from 'node:zlib'

// Compare an actual committed baseline with the current source, using one
// bundler/core version and identical settings. No checkout or install needed.
const ref = process.argv[2]
assert.ok(ref, 'Usage: node tools/measure-kernel.mjs BASELINE_SHA [OUTPUT_DIR]')
const pkg = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repo = resolve(pkg, '../..')
const require = createRequire(import.meta.url)
const viteRequire = createRequire(require.resolve('vitest/package.json'))
const esbuildRequire = createRequire(viteRequire.resolve('vite'))
const { build, version } = esbuildRequire('esbuild')
const baseline = execFileSync(
  'git',
  ['rev-parse', '--verify', `${ref}^{commit}`],
  { cwd: repo, encoding: 'utf8' },
).trim()
const temporary = await mkdtemp(join(tmpdir(), 'reatom-kernel-size-'))
const sha256 = (data) => createHash('sha256').update(data).digest('hex')
const results = []
try {
  const archive = join(temporary, 'baseline.tar')
  execFileSync(
    'git',
    ['archive', '--output', archive, baseline, 'packages/opentelemetry/src'],
    { cwd: repo },
  )
  execFileSync('tar', ['-xf', archive, '-C', temporary])
  const old = join(temporary, 'packages/opentelemetry/src')
  const current = join(pkg, 'src')
  const entries = {
    'baseline-root': `export { reatomOpentelemetry } from '${old}/index.ts'`,
    kernel: `export { reatomTelemetry, attributes } from '${current}/index.ts'`,
    'kernel+actions+capture+history+sinks': `
      export { reatomTelemetry, attributes } from '${current}/index.ts';
      export { withActionSpans, withActionTracing } from '${current}/index.ts';
      export { captureAttributes } from '${current}/index.ts';
      export { reatomRecordSink } from '${current}/index.ts';
      export { combineSinks } from '${current}/index.ts'`,
    'full-reactive': `export { reatomOpentelemetry } from '${current}/index.ts'`,
  }
  for (const core of ['external', 'bundled']) {
    for (const [entry, contents] of Object.entries(entries)) {
      const result = await build({
        absWorkingDir: repo,
        stdin: { contents, resolveDir: repo, loader: 'ts' },
        bundle: true,
        minify: true,
        platform: 'browser',
        format: 'esm',
        target: 'es2022',
        write: false,
        metafile: true,
        ...(core === 'external'
          ? { external: ['@reatom/core'] }
          : {
              alias: {
                '@reatom/core': join(repo, 'packages/core/src/index.ts'),
              },
            }),
      })
      const code = result.outputFiles[0].contents
      const inputs = {}
      for (const file of Object.keys(result.metafile.inputs).sort()) {
        if (file === '<stdin>') continue
        const path = resolve(repo, file)
        const name = path.startsWith(temporary + '/')
          ? `baseline/${relative(temporary, path)}`
          : relative(repo, path)
        inputs[name] = sha256(await readFile(path))
      }
      results.push({
        entry,
        core,
        minifiedBytes: code.length,
        gzipBytes: gzipSync(code).length,
        brotliBytes: brotliCompressSync(code).length,
        outputSha256: sha256(code),
        inputs,
      })
    }
    const before = results.find(
      (row) => row.core === core && row.entry === 'baseline-root',
    )
    for (const after of results.filter(
      (row) => row.core === core && row.entry.startsWith('kernel'),
    )) {
      for (const metric of ['minifiedBytes', 'gzipBytes', 'brotliBytes'])
        assert.ok(
          after[metric] <= before[metric] / 2,
          `${core}:${after.entry}:${metric} must shrink by at least half`,
        )
    }
  }
  const report = {
    baseline,
    node: process.version,
    esbuild: version,
    measuredAt: new Date().toISOString(),
    results,
  }
  console.table(results.map(({ inputs, outputSha256, ...sizes }) => sizes))
  if (process.argv[3]) {
    const output = resolve(process.argv[3])
    await mkdir(output, { recursive: true })
    await writeFile(
      join(output, 'kernel-sizes.json'),
      JSON.stringify(report, null, 2) + '\n',
    )
  }
} finally {
  await rm(temporary, { recursive: true, force: true })
}
