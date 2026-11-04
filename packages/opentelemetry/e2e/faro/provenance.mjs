import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

export const hashFile = (file) =>
  createHash('sha256').update(readFileSync(file)).digest('hex')
export const verifyFiles = (files, label) => {
  for (const [file, expected] of Object.entries(files))
    if (hashFile(file) !== expected) throw Error(`${label} changed: ${file}`)
}
export const snapshotSuite = (suite, artifacts) => {
  const files = {}
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = join(directory, entry.name)
      if (file === resolve(suite, 'prepared') || file === artifacts) continue
      if (entry.isDirectory()) walk(file)
      else files[file] = hashFile(file)
    }
  }
  walk(suite)
  return files
}
export const verifySuite = (suite, artifacts, expected) => {
  const actual = snapshotSuite(suite, artifacts)
  if (
    JSON.stringify(Object.keys(actual).sort()) !==
    JSON.stringify(Object.keys(expected).sort())
  )
    throw Error('Harness suite file inventory changed')
  verifyFiles(expected, 'Harness suite')
}
