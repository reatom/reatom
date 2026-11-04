import {
  hashFile,
  verifyFiles,
  snapshotSuite,
  verifySuite,
} from './provenance.mjs'
import { execFileSync, spawnSync } from 'node:child_process'
import { randomUUID, createHash } from 'node:crypto'
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve, join } from 'node:path'
const suite = fileURLToPath(new URL('.', import.meta.url))
const artifacts = resolve(
  process.argv[2] ??
    join(suite, 'prepared', `run-${Date.now()}-${randomUUID().slice(0, 8)}`),
)
if (existsSync(artifacts)) throw Error(`Artifacts must be fresh: ${artifacts}`)
const apps = resolve(process.env.FARO_APPS ?? join(suite, 'prepared/apps'))
if (!existsSync(apps))
  throw Error(`Missing apps: ${apps}. Prepare bundles explicitly first.`)
const build = JSON.parse(readFileSync(join(apps, 'build.json')))
const preparedFiles = {
  ...build.inputs,
  ...Object.fromEntries(
    Object.entries(build.outputs).map(([file, hash]) => [
      join(apps, file),
      hash,
    ]),
  ),
  [join(apps, 'build.json')]: hashFile(join(apps, 'build.json')),
}
const suiteFiles = snapshotSuite(suite, artifacts)
const verifyProvenance = () => {
  verifyFiles(preparedFiles, 'Prepared input/output')
  verifySuite(suite, artifacts, suiteFiles)
}
verifyProvenance()
execFileSync('docker', ['info'], { stdio: 'ignore' })
const runner =
  process.env.FARO_RUNNER_IMAGE ??
  'reatom-otel-collector-runner:pw1.60.0-arm64-969a4fb433472a74'
const images = [
  'grafana/alloy@sha256:8ab871206bd2d8f89277f53abffee5f452a293980788d52f85fa183a87a505a4',
  'grafana/loki@sha256:1107dd5274e0ada47e42472b7a7e71f3b2a2fe878878108f3e2f9e51528f0193',
  'grafana/tempo@sha256:3076b8dcdfb32fd6bc5ccef85e7b7313e6199b9cb84366257fc17ecb696db5fd',
  runner,
]
for (const image of images)
  execFileSync('docker', ['image', 'inspect', image], { stdio: 'ignore' })
mkdirSync(artifacts, { recursive: true })
const id = `reatom-faro-${Date.now()}-${randomUUID().slice(0, 8)}`
const env = {
  ...process.env,
  FARO_RUNNER_IMAGE: runner,
  FARO_APPS: apps,
  FARO_ARTIFACTS: artifacts,
  FARO_RUN_ID: id,
}
const base = [
  'compose',
  '--env-file',
  '/dev/null',
  '-f',
  join(suite, 'compose.yaml'),
  '-p',
  id,
]
const command = (args) => {
  const result = spawnSync('docker', [...base, ...args], {
    env,
    encoding: 'utf8',
  })
  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)
  if (result.status !== 0)
    throw Error(`docker compose ${args.join(' ')} failed (${result.status})`)
}
writeFileSync(
  join(artifacts, 'manifest.json'),
  JSON.stringify(
    {
      id,
      images,
      apps,
      build,
      suiteFiles,
      configs: Object.fromEntries(
        [
          'compose.yaml',
          'config.alloy',
          'loki.yaml',
          'tempo.yaml',
          'runner.mjs',
        ].map((file) => [
          file,
          createHash('sha256')
            .update(readFileSync(join(suite, file)))
            .digest('hex'),
        ]),
      ),
      started: new Date().toISOString(),
    },
    null,
    2,
  ),
)
console.log(`Artifacts: ${artifacts}`)
let completed = false
try {
  command(['up', '-d', '--pull', 'never', 'alloy', 'loki', 'tempo'])
  command(['run', '--rm', '--no-deps', 'runner'])
  verifyProvenance()
  const evidence = JSON.parse(readFileSync(join(artifacts, 'evidence.json')))
  if (evidence.browserPassed !== true)
    throw Error('Browser runner did not complete successfully')
  evidence.provenanceVerified = true
  evidence.passed = true
  completed = true
  writeFileSync(
    join(artifacts, 'evidence.json'),
    JSON.stringify(evidence, null, 2),
  )
} finally {
  let provenanceFailure
  try {
    verifyProvenance()
  } catch (error) {
    provenanceFailure = error
    const file = join(artifacts, 'evidence.json')
    const evidence = existsSync(file) ? JSON.parse(readFileSync(file)) : {}
    evidence.passed = false
    evidence.provenanceVerified = false
    evidence.provenanceError = String(error)
    writeFileSync(file, JSON.stringify(evidence, null, 2))
  }
  const logs = spawnSync('docker', [...base, 'logs', '--no-color'], {
    env,
    encoding: 'utf8',
  })
  writeFileSync(join(artifacts, 'backend.log'), logs.stdout + logs.stderr)
  command(['down', '--volumes', '--remove-orphans'])
  if (provenanceFailure) throw provenanceFailure
  if (completed)
    console.log(
      JSON.stringify({ passed: true, provenanceVerified: true, artifacts }),
    )
}
