#!/usr/bin/env -S node --experimental-strip-types

import { execSync } from 'node:child_process'
import fs from 'node:fs'

const SCOPE_MAP: Record<string, string> = {
  core: 'packages/core/src/core/*',
  async: 'packages/core/src/async/*',
  extensions: 'packages/core/src/extensions/*',
  form: 'packages/core/src/form/*',
  methods: 'packages/core/src/methods/*',
  persist: 'packages/core/src/persist/*',
  primitives: 'packages/core/src/primitives/*',
  routing: 'packages/core/src/routing/*',
  web: 'packages/core/src/web/*',
  jsx: 'packages/jsx/*',
  lit: 'packages/lit/*',
  preact: 'packages/preact/*',
  react: 'packages/react/*',
  'solid-js': 'packages/solid-js/*',
  vue: 'packages/vue/*',
  zod: 'packages/zod/*',
  'eslint-plugin': 'packages/eslint-plugin/*',
  docs: 'docs/*',
  tools: 'tools/*',
}

const EXAMPLES_DIRECTORY = 'examples'

const CONVENTIONAL_COMMIT_REGEX =
  /^(?<type>\w+)(?:\((?<scope>[^)]+)\))?(?<breaking>!)?\s*:\s*(?<description>.+)$/

function matchesPattern(filePath: string, pattern: string): boolean {
  const patternParts = pattern.split('/')
  const fileParts = filePath.split('/')

  let patternIdx = 0
  let fileIdx = 0

  while (patternIdx < patternParts.length && fileIdx < fileParts.length) {
    const patternPart = patternParts[patternIdx]

    if (patternPart === '*') {
      patternIdx++
      fileIdx++
      continue
    }

    if (patternPart === '**') {
      if (patternIdx === patternParts.length - 1) {
        return true
      }
      const nextPattern = patternParts[patternIdx + 1]
      while (fileIdx < fileParts.length && fileParts[fileIdx] !== nextPattern) {
        fileIdx++
      }
      patternIdx++
      continue
    }

    if (patternPart !== fileParts[fileIdx]) {
      return false
    }

    patternIdx++
    fileIdx++
  }

  if (patternParts[patternParts.length - 1] === '*') {
    return fileIdx <= fileParts.length
  }

  return patternIdx >= patternParts.length - 1
}

function getScopesFromFiles(files: string[]): string[] {
  const matchedScopes = new Set<string>()

  for (const file of files) {
    for (const [scope, pattern] of Object.entries(SCOPE_MAP)) {
      if (matchesPattern(file, pattern)) {
        matchedScopes.add(scope)
        break
      }
    }
  }

  return Array.from(matchedScopes).sort()
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

function getStagedFiles(): string[] {
  const output = execSync('git diff --cached --name-only', {
    encoding: 'utf-8',
  })
  return output
    .trim()
    .split('\n')
    .filter((line) => line.length > 0)
}

function parseCommitMessage(message: string): {
  type: string
  scope: string | null
  breaking: boolean
  description: string
} | null {
  const match = message.match(CONVENTIONAL_COMMIT_REGEX)
  if (!match?.groups) return null

  const { type, scope, breaking, description } = match.groups
  if (!type || !description) return null

  return {
    type,
    scope: scope || null,
    breaking: breaking === '!',
    description,
  }
}

function buildCommitMessage(
  type: string,
  scopes: string[],
  breaking: boolean,
  description: string,
): string {
  const scopePart = scopes.length > 0 ? `(${scopes.join(',')})` : ''
  const breakingPart = breaking ? '!' : ''
  return `${type}${scopePart}${breakingPart}: ${description}`
}

function main() {
  try {
    const commitMsgFile = process.argv[2]
    const commitSource = process.argv[3]

    if (!commitMsgFile) {
      return
    }

    if (
      commitSource === 'merge' ||
      commitSource === 'squash' ||
      commitSource === 'commit'
    ) {
      return
    }

    const originalMessage = fs.readFileSync(commitMsgFile, 'utf-8')
    const firstLine = originalMessage.split('\n')[0]
    if (!firstLine) {
      return
    }
    const trimmedFirstLine = firstLine.trim()
    const restOfMessage = originalMessage.split('\n').slice(1).join('\n')

    const parsed = parseCommitMessage(trimmedFirstLine)
    const stagedFiles = getStagedFiles()
    if (stagedFiles.length === 0) {
      return
    }

    const exampleScopes = getExampleScopesFromFiles(stagedFiles)
    if (exampleScopes.length > 0) {
      if (parsed?.scope) {
        return
      }

      const newFirstLine = parsed
        ? buildCommitMessage(
            parsed.type,
            exampleScopes,
            parsed.breaking,
            parsed.description,
          )
        : buildCommitMessage('docs', exampleScopes, false, trimmedFirstLine)
      const newMessage = restOfMessage
        ? `${newFirstLine}\n${restOfMessage}`
        : newFirstLine
      fs.writeFileSync(commitMsgFile, newMessage)
      console.log(
        `Commit message updated for example(s): ${exampleScopes.join(', ')}`,
      )
      return
    }

    if (!parsed || parsed.scope) {
      return
    }

    const detectedScopes = getScopesFromFiles(stagedFiles)
    if (detectedScopes.length === 0) {
      return
    }

    const newFirstLine = buildCommitMessage(
      parsed.type,
      detectedScopes,
      parsed.breaking,
      parsed.description,
    )
    const newMessage = restOfMessage
      ? `${newFirstLine}\n${restOfMessage}`
      : newFirstLine
    fs.writeFileSync(commitMsgFile, newMessage)
    console.log(
      `Commit message updated with scope(s): ${detectedScopes.join(', ')}`,
    )
  } catch (error) {
    console.error('prepare-commit-msg hook error (non-fatal):', error)
  }
}

main()
