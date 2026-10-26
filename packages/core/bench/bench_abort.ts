// Abort listener detach cost. `--module` loads the core sources of another
// checkout, so the same harness measures a base revision.
import { execFileSync } from 'node:child_process'
import { cpus } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'

const { values } = parseArgs({
  options: {
    module: {
      type: 'string',
      default: fileURLToPath(new URL('../src/index.ts', import.meta.url)),
    },
    iterations: { type: 'string', default: '15' },
    warmup: { type: 'string', default: '3' },
    operations: { type: 'string', default: '10000' },
  },
})
const positive = (value: string, name: string) => {
  const number = Number(value)
  if (!Number.isSafeInteger(number) || number < 1)
    throw new Error(`${name} must be a positive integer`)
  return number
}
const iterations = positive(values.iterations, 'iterations')
const warmup = positive(values.warmup, 'warmup')
const operations = positive(values.operations, 'operations')
const modulePath = resolve(values.module)
const { abortVar, action, withAbort, wrap } = (await import(
  pathToFileURL(modulePath).href
)) as typeof import('../src')

const run = action(async () => 1, 'bench.run').extend(withAbort())
const scenarios = {
  'subscribe/unsubscribe': () => {
    for (let i = 0; i < operations; i++) abortVar.subscribe().unsubscribe()
  },
  'await wrap(resolved promise)': async () => {
    for (let i = 0; i < operations; i++) await wrap(Promise.resolve(1))
  },
  'await withAbort action': async () => {
    for (let i = 0; i < operations; i++) await wrap(run())
  },
}
const results = Object.fromEntries(
  Object.keys(scenarios).map((name) => [name, new Array<number>()]),
)
for (let i = 0; i < warmup + iterations; i++) {
  for (const [name, scenario] of Object.entries(scenarios)) {
    const start = performance.now()
    await scenario()
    if (i >= warmup) results[name]!.push(performance.now() - start)
  }
}

const revision = execFileSync(
  'git',
  ['-C', dirname(modulePath), 'rev-parse', '--short', 'HEAD'],
  { encoding: 'utf8' },
).trim()
console.log(`${revision}, ${cpus()[0]?.model}, Node ${process.version}`)
console.log(
  `${operations} operations, ${iterations} samples after ${warmup} warmups`,
)
console.log('| Scenario | median ms | p25 ms | p75 ms |')
console.log('|---|---:|---:|---:|')
for (const [name, samples] of Object.entries(results)) {
  samples.sort((a, b) => a - b)
  const quantile = (q: number) => {
    const index = (samples.length - 1) * q
    const lower = Math.floor(index)
    const upper = Math.ceil(index)
    return (
      samples[lower]! + (samples[upper]! - samples[lower]!) * (index - lower)
    )
  }
  console.log(
    `| ${name} | ${[0.5, 0.25, 0.75].map((q) => quantile(q).toFixed(2)).join(' | ')} |`,
  )
}
// The core's background timers otherwise keep the process alive.
process.exit(0)
