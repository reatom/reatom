#!/usr/bin/env -S node --experimental-strip-types

import fs from 'node:fs'
import path from 'node:path'

const SKILL_ROOTS = ['skills', '.cursor/skills', '.agents/skills'] as const

const IGNORED_FILE_NAMES = new Set(['.DS_Store'])

type SkillSyncIssue =
  | { kind: 'missing'; skill: string; relativePath: string; root: string }
  | { kind: 'content'; skill: string; relativePath: string }

function isSkillEntry(entry: fs.Dirent): boolean {
  return entry.isDirectory() && !entry.name.startsWith('.')
}

function isSkillFile(entry: fs.Dirent): boolean {
  return (
    !IGNORED_FILE_NAMES.has(entry.name) &&
    (entry.isFile() || entry.isSymbolicLink())
  )
}

function getSkillNames(): string[] {
  const skillNames = new Set<string>()

  for (const root of SKILL_ROOTS) {
    if (!fs.existsSync(root)) {
      continue
    }

    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (isSkillEntry(entry)) {
        skillNames.add(entry.name)
      }
    }
  }

  return Array.from(skillNames).sort()
}

function getRelativePaths(skill: string): string[] {
  const relativePaths = new Set<string>()

  for (const root of SKILL_ROOTS) {
    const skillDirectory = path.join(root, skill)
    if (!fs.existsSync(skillDirectory)) {
      continue
    }

    for (const entry of fs.readdirSync(skillDirectory, {
      withFileTypes: true,
    })) {
      if (isSkillFile(entry)) {
        relativePaths.add(entry.name)
      }
    }
  }

  return Array.from(relativePaths).sort()
}

function readSkillFile(root: string, skill: string, relativePath: string) {
  const filePath = path.join(root, skill, relativePath)
  if (!fs.existsSync(filePath)) {
    return null
  }

  return fs.readFileSync(filePath, 'utf8')
}

function collectIssues(): SkillSyncIssue[] {
  const issues: SkillSyncIssue[] = []

  for (const skill of getSkillNames()) {
    for (const relativePath of getRelativePaths(skill)) {
      const contents = SKILL_ROOTS.map((root) =>
        readSkillFile(root, skill, relativePath),
      )

      for (const [index, content] of contents.entries()) {
        if (content === null) {
          issues.push({
            kind: 'missing',
            skill,
            relativePath,
            root: SKILL_ROOTS[index],
          })
        }
      }

      const presentContents = contents.filter(
        (content): content is string => content !== null,
      )

      if (
        presentContents.length === SKILL_ROOTS.length &&
        !presentContents.every((content) => content === presentContents[0])
      ) {
        issues.push({ kind: 'content', skill, relativePath })
      }
    }
  }

  return issues
}

function formatIssue(issue: SkillSyncIssue): string {
  const filePath = `${issue.skill}/${issue.relativePath}`

  if (issue.kind === 'missing') {
    return `- missing in ${issue.root}/${filePath}`
  }

  return `- content mismatch for ${filePath}`
}

function main() {
  const issues = collectIssues()

  if (issues.length === 0) {
    return
  }

  console.error('Agent skills are out of sync across:')
  for (const root of SKILL_ROOTS) {
    console.error(`  - ${root}`)
  }
  console.error('')
  console.error('Issues:')
  for (const issue of issues) {
    console.error(formatIssue(issue))
  }
  console.error('')
  console.error(
    'Keep .cursor/skills and .agents/skills identical, then mirror into skills/.',
  )

  process.exit(1)
}

main()
