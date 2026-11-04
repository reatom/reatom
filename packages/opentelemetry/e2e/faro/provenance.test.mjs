import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  hashFile,
  verifyFiles,
  snapshotSuite,
  verifySuite,
} from './provenance.mjs'

test('post-run verifier rejects mutated inputs and bundles', () => {
  const dir = mkdtempSync(join(tmpdir(), 'faro-provenance-'))
  try {
    const file = join(dir, 'bundle.js')
    writeFileSync(file, 'original')
    const files = { [file]: hashFile(file) }
    verifyFiles(files, 'Prepared')
    writeFileSync(file, 'changed')
    assert.throws(() => verifyFiles(files, 'Prepared'), /changed/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
test('suite verifier covers configs and inventory while excluding generated artifacts', () => {
  const dir = mkdtempSync(join(tmpdir(), 'faro-suite-'))
  try {
    const artifacts = join(dir, 'artifacts')
    mkdirSync(artifacts)
    writeFileSync(join(dir, 'config.alloy'), 'original')
    const files = snapshotSuite(dir, artifacts)
    writeFileSync(join(artifacts, 'evidence.json'), 'generated')
    verifySuite(dir, artifacts, files)
    writeFileSync(join(dir, 'added.mjs'), 'new input')
    assert.throws(() => verifySuite(dir, artifacts, files), /inventory changed/)
    rmSync(join(dir, 'added.mjs'))
    writeFileSync(join(dir, 'config.alloy'), 'changed')
    assert.throws(() => verifySuite(dir, artifacts, files), /changed/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
