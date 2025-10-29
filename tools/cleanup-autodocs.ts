import {
  readdir,
  readFile,
  rename,
  rmdir,
  unlink,
  writeFile,
} from 'node:fs/promises'
import { join } from 'node:path'

const AUTODOCS_DIR = join(process.cwd(), 'autodocs')

async function removeUnderscoreEntries(filePath: string) {
  const content = await readFile(filePath, 'utf-8')
  const lines = content.split('\n')

  const filteredLines: string[] = []
  let skipUntilNextSection = false
  let removedCount = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!

    if (line.match(/^### _\w+/)) {
      skipUntilNextSection = true
      removedCount++
      continue
    }

    if (line.match(/^### [^_]/)) {
      skipUntilNextSection = false
    }

    if (line.match(/^## /)) {
      skipUntilNextSection = false
    }

    if (!skipUntilNextSection) {
      filteredLines.push(line)
    }
  }

  if (removedCount > 0) {
    await writeFile(filePath, filteredLines.join('\n'), 'utf-8')
    return removedCount
  }

  return 0
}

async function cleanupAutodocs() {
  console.log('🧹 Cleaning up autodocs structure...\n')

  const entries = await readdir(AUTODOCS_DIR, { withFileTypes: true })

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const packageDir = join(AUTODOCS_DIR, entry.name)
    const readmePath = join(packageDir, 'README.md')
    const targetPath = join(AUTODOCS_DIR, `${entry.name}.md`)

    try {
      await rename(readmePath, targetPath)
      console.log(`✓ Moved ${entry.name}/README.md → ${entry.name}.md`)

      try {
        const remaining = await readdir(packageDir)
        if (remaining.length === 0) {
          await rmdir(packageDir)
          console.log(`  ✓ Removed empty ${entry.name}/ directory`)
        } else {
          console.log(
            `  ℹ Kept ${entry.name}/ directory (${remaining.length} files)`,
          )
        }
      } catch {
        console.log(`  ℹ ${entry.name}/ directory already removed`)
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.warn(
          `  ✗ Could not move ${entry.name}/README.md:`,
          (error as Error).message,
        )
      }
    }
  }

  console.log('')

  const rootReadme = join(AUTODOCS_DIR, 'README.md')
  try {
    await unlink(rootReadme)
    console.log(`✓ Removed root README.md`)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn(
        `✗ Could not remove root README.md:`,
        (error as Error).message,
      )
    }
  }

  console.log('\n🔍 Filtering out underscore-prefixed entries...\n')

  const allFiles: string[] = []

  const collectFiles = async (dir: string) => {
    const items = await readdir(dir, { withFileTypes: true })
    for (const item of items) {
      const fullPath = join(dir, item.name)
      if (item.isDirectory()) {
        await collectFiles(fullPath)
      } else if (item.name.endsWith('.md')) {
        allFiles.push(fullPath)
      }
    }
  }

  await collectFiles(AUTODOCS_DIR)

  let totalRemovedUnderscores = 0
  for (const file of allFiles) {
    const removed = await removeUnderscoreEntries(file)
    if (removed > 0) {
      const relativePath = file.replace(AUTODOCS_DIR + '/', '')
      console.log(
        `✓ Removed ${removed} underscore entries from ${relativePath}`,
      )
      totalRemovedUnderscores += removed
    }
  }

  if (totalRemovedUnderscores > 0) {
    console.log(
      `\n✓ Total: ${totalRemovedUnderscores} underscore-prefixed entries removed`,
    )
  } else {
    console.log('  No underscore-prefixed entries found')
  }

  console.log('\n✅ Autodocs cleanup complete!')
}

cleanupAutodocs().catch(console.error)
