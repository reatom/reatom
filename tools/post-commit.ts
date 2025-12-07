#!/usr/bin/env -S node --experimental-strip-types

import { execSync } from 'node:child_process'

const SKIP_ENV_VAR = 'REATOM_SKIP_POST_COMMIT'

function getStagedFiles(): string[] {
  const output = execSync('git diff --cached --name-only', { encoding: 'utf-8' })
  return output
    .trim()
    .split('\n')
    .filter((line) => line.length > 0)
}

function hasRelevantStagedFiles(files: string[]): boolean {
  return files.some((file) => file.endsWith('package.json') || file.endsWith('CHANGELOG.md'))
}

function main() {
  try {
    if (process.env[SKIP_ENV_VAR]) {
      return
    }

    const stagedFiles = getStagedFiles()

    if (!hasRelevantStagedFiles(stagedFiles)) {
      return
    }

    console.log('Amending commit to include version bump and changelog...')

    execSync('git commit --amend --no-edit --no-verify', {
      encoding: 'utf-8',
      env: { ...process.env, [SKIP_ENV_VAR]: '1' },
      stdio: 'inherit',
    })

    console.log('Commit amended successfully.')
  } catch (error) {
    console.error('post-commit hook error (non-fatal):', error)
  }
}

main()

