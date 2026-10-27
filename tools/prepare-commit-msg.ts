#!/usr/bin/env -S node --experimental-strip-types

import { execSync } from 'node:child_process'
import fs from 'node:fs'

const SCOPE_MAP: Record<string, string> = {
  core: 'packages/core/src/core/',
  async: 'packages/core/src/async/',
  extensions: 'packages/core/src/extensions/',
  form: 'packages/core/src/form/',
  methods: 'packages/core/src/methods/',
  persist: 'packages/core/src/persist/',
  primitives: 'packages/core/src/primitives/',
  routing: 'packages/core/src/routing/',
  web: 'packages/core/src/web/',
  docs: 'docs/',
  tools: 'tools/',
}

const EXAMPLES_DIRECTORY = 'examples'

const CONVENTIONAL_COMMIT_REGEX =
  /^(?<type>\w+)(?:\((?<scope>[^)]+)\))?(?<breaking>!)?\s*:\s*(?<description>.+)$/

function getScopesFromFiles(files: string[]): string[] {
  return [
    ...new Set(
      files.flatMap((file) => {
        const specific = Object.entries(SCOPE_MAP).find(([, prefix]) =>
          file.startsWith(prefix),
        )?.[0]
        const scope = specific ?? /^packages\/([^/]+)\//.exec(file)?.[1]
        return scope ? [scope] : []
      }),
    ),
  ].sort()
}

function getExampleScopesFromFiles(files: string[]): string[] {
  if (files.some((file) => !file.startsWith(`${EXAMPLES_DIRECTORY}/`))) {
    return []
  }

  const scopes = new Set<string>()

  for (const file of files) {
    const fileParts = file.split('/')
    const exampleName = fileParts.length > 2 ? fileParts[1] : EXAMPLES_DIRECTORY
    if (exampleName) {
      scopes.add(exampleName)
    }
  }

  return Array.from(scopes).sort()
}

function main() {
  const [, , commitMsgFile, commitSource] = process.argv
  if (!commitMsgFile || ['merge', 'squash', 'commit'].includes(commitSource))
    return

  const original = fs.readFileSync(commitMsgFile, 'utf8')
  const firstLine = original.split('\n')[0].trim()
  if (!firstLine) return

  const parsed = CONVENTIONAL_COMMIT_REGEX.exec(firstLine)?.groups
  // The final hook also sees Git-generated merge/revert messages.
  if (commitSource === 'validate' && !parsed) return
  const files = execSync('git diff --cached --name-only -z', {
    encoding: 'utf8',
  })
    .split('\0')
    .filter(Boolean)
  if (!files.length) return

  const exampleScopes = getExampleScopesFromFiles(files)
  let header: string
  if (exampleScopes.length) {
    header = `docs(${exampleScopes.join(',')}): ${parsed?.description ?? firstLine}`
  } else if (files.every((file) => file.startsWith(SCOPE_MAP.docs))) {
    if (parsed) return
    header = `docs: ${firstLine}`
  } else {
    if (!parsed || parsed.scope) return
    const scopes = getScopesFromFiles(files)
    if (!scopes.length) return
    header = `${parsed.type}(${scopes.join(',')})${parsed.breaking ?? ''}: ${parsed.description}`
  }

  const updated = original.replace(/^[^\n]*/, header)
  if (updated !== original) {
    fs.writeFileSync(commitMsgFile, updated)
    console.log(`Commit message updated: ${header}`)
  }
}

try {
  main()
} catch (error) {
  console.error('Commit message hook failed:', error)
  process.exitCode = 1
}
