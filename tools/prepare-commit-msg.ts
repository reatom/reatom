#!/usr/bin/env -S node --experimental-strip-types

import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

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

const SCOPE_TO_PACKAGE_PATH: Record<string, string> = {
  core: 'packages/core',
  async: 'packages/core',
  extensions: 'packages/core',
  form: 'packages/core',
  methods: 'packages/core',
  persist: 'packages/core',
  primitives: 'packages/core',
  routing: 'packages/core',
  web: 'packages/core',
  jsx: 'packages/jsx',
  lit: 'packages/lit',
  preact: 'packages/preact',
  react: 'packages/react',
  'solid-js': 'packages/solid-js',
  vue: 'packages/vue',
  zod: 'packages/zod',
  'eslint-plugin': 'packages/eslint-plugin',
}

const CONVENTIONAL_COMMIT_REGEX =
  /^(?<type>\w+)(?:\((?<scope>[^)]+)\))?(?<breaking>!)?\s*:\s*(?<description>.+)$/

type BumpType = 'major' | 'minor' | 'patch'

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

function getStagedFiles(): string[] {
  const output = execSync('git diff --cached --name-only', { encoding: 'utf-8' })
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

function determineBumpType(type: string, breaking: boolean): BumpType {
  if (breaking) return 'major'
  if (type === 'feat') return 'minor'
  return 'patch'
}

function bumpVersion(version: string, bumpType: BumpType): string {
  const parts = version.split('.')
  const major = parseInt(parts[0] || '0', 10)
  const minor = parseInt(parts[1] || '0', 10)
  const patch = parseInt(parts[2] || '0', 10)

  switch (bumpType) {
    case 'major':
      return `${major + 1}.0.0`
    case 'minor':
      return `${major}.${minor + 1}.0`
    case 'patch':
      return `${major}.${minor}.${patch + 1}`
  }
}

function getPackagePathsFromScopes(scopes: string[]): string[] {
  const packagePaths = new Set<string>()
  for (const scope of scopes) {
    const packagePath = SCOPE_TO_PACKAGE_PATH[scope]
    if (packagePath) {
      packagePaths.add(packagePath)
    }
  }
  return Array.from(packagePaths)
}

function updatePackageVersion(packagePath: string, bumpType: BumpType): string | null {
  const packageJsonPath = path.join(packagePath, 'package.json')

  if (!fs.existsSync(packageJsonPath)) {
    return null
  }

  const fileContent = fs.readFileSync(packageJsonPath, 'utf-8')
  const packageJson = JSON.parse(fileContent)

  if (!packageJson.version) {
    return null
  }

  const oldVersion = packageJson.version
  const newVersion = bumpVersion(oldVersion, bumpType)
  packageJson.version = newVersion

  const newContent = JSON.stringify(packageJson, null, 2) + '\n'
  fs.writeFileSync(packageJsonPath, newContent)

  return newVersion
}

function updateChangelog(
  packagePath: string,
  version: string,
  type: string,
  scopes: string[],
  description: string,
  breaking: boolean,
): void {
  const changelogPath = path.join(packagePath, 'CHANGELOG.md')

  const date = new Date().toISOString().split('T')[0]
  const scopeStr = scopes.length > 0 ? `**${scopes.join(', ')}**: ` : ''
  const breakingPrefix = breaking ? '**BREAKING** ' : ''
  const entryLine = `- ${breakingPrefix}${scopeStr}${description}`

  const existingContent = fs.existsSync(changelogPath)
    ? fs.readFileSync(changelogPath, 'utf-8')
    : ''

  const versionHeader = `## ${version} (${date})`
  const typeHeader = `### ${capitalizeFirst(type)}`

  let newContent: string

  if (existingContent.includes(versionHeader)) {
    const versionHeaderIndex = existingContent.indexOf(versionHeader)
    const afterVersionHeader = existingContent.slice(versionHeaderIndex + versionHeader.length)

    if (afterVersionHeader.includes(typeHeader)) {
      const typeHeaderIndex = existingContent.indexOf(typeHeader, versionHeaderIndex)
      const afterTypeHeader = typeHeaderIndex + typeHeader.length
      const nextSectionMatch = existingContent.slice(afterTypeHeader).match(/\n###?\s/)
      const insertPosition = nextSectionMatch
        ? afterTypeHeader + (nextSectionMatch.index ?? 0)
        : afterTypeHeader + existingContent.slice(afterTypeHeader).indexOf('\n\n')

      const actualInsertPosition =
        insertPosition > afterTypeHeader ? insertPosition : existingContent.length

      const beforeInsert = existingContent.slice(0, actualInsertPosition)
      const afterInsert = existingContent.slice(actualInsertPosition)
      newContent = `${beforeInsert}\n${entryLine}${afterInsert}`
    } else {
      const nextVersionMatch = afterVersionHeader.match(/\n## /)
      const insertPosition = nextVersionMatch
        ? versionHeaderIndex + versionHeader.length + (nextVersionMatch.index ?? 0)
        : versionHeaderIndex + versionHeader.length

      const beforeInsert = existingContent.slice(0, insertPosition)
      const afterInsert = existingContent.slice(insertPosition)
      const newSection = `\n\n${typeHeader}\n\n${entryLine}`
      newContent = `${beforeInsert}${newSection}${afterInsert}`
    }
  } else {
    const newEntry = `${versionHeader}\n\n${typeHeader}\n\n${entryLine}\n\n`
    newContent = existingContent ? `${newEntry}${existingContent}` : newEntry
  }

  fs.writeFileSync(changelogPath, newContent)
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function stageFiles(files: string[]): void {
  if (files.length === 0) return
  execSync(`git add ${files.map((f) => `"${f}"`).join(' ')}`, { encoding: 'utf-8' })
}

function main() {
  try {
    const commitMsgFile = process.argv[2]
    const commitSource = process.argv[3]

    if (!commitMsgFile) {
      return
    }

    if (commitSource === 'merge' || commitSource === 'squash' || commitSource === 'commit') {
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
    if (!parsed) {
      return
    }

    const stagedFiles = getStagedFiles()
    if (stagedFiles.length === 0) {
      return
    }

    const detectedScopes = parsed.scope ? parsed.scope.split(',') : getScopesFromFiles(stagedFiles)
    if (detectedScopes.length === 0) {
      return
    }

    const shouldBumpVersion = parsed.type === 'fix' || parsed.type === 'feat' || parsed.breaking

    if (!shouldBumpVersion) {
      if (!parsed.scope) {
        const newFirstLine = buildCommitMessage(
          parsed.type,
          detectedScopes,
          parsed.breaking,
          parsed.description,
        )
        const newMessage = restOfMessage ? `${newFirstLine}\n${restOfMessage}` : newFirstLine
        fs.writeFileSync(commitMsgFile, newMessage)
        console.log(`Commit message updated with scope(s): ${detectedScopes.join(', ')}`)
      }
      return
    }

    const bumpType = determineBumpType(parsed.type, parsed.breaking)
    const packagePaths = getPackagePathsFromScopes(detectedScopes)

    const filesToStage: string[] = []

    for (const packagePath of packagePaths) {
      const packageScopesInThisPackage = detectedScopes.filter(
        (scope) => SCOPE_TO_PACKAGE_PATH[scope] === packagePath,
      )

      const newVersion = updatePackageVersion(packagePath, bumpType)
      if (newVersion) {
        updateChangelog(
          packagePath,
          newVersion,
          parsed.type,
          packageScopesInThisPackage,
          parsed.description,
          parsed.breaking,
        )

        filesToStage.push(path.join(packagePath, 'package.json'))
        filesToStage.push(path.join(packagePath, 'CHANGELOG.md'))

        console.log(`${packagePath}: ${bumpType} bump → v${newVersion}`)
      }
    }

    stageFiles(filesToStage)

    if (!parsed.scope) {
      const newFirstLine = buildCommitMessage(
        parsed.type,
        detectedScopes,
        parsed.breaking,
        parsed.description,
      )
      const newMessage = restOfMessage ? `${newFirstLine}\n${restOfMessage}` : newFirstLine
      fs.writeFileSync(commitMsgFile, newMessage)
      console.log(`Commit message updated with scope(s): ${detectedScopes.join(', ')}`)
    }
  } catch (error) {
    console.error('prepare-commit-msg hook error (non-fatal):', error)
  }
}

main()
