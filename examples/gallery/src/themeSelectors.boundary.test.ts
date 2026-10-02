import { readdir, readFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, test } from 'vitest'

const srcDir = join(dirname(fileURLToPath(import.meta.url)))

const decorationSuffixes = ['Details.ts', 'Details.tsx', 'Theme.ts']
const decorationFiles = new Set(['ThemeViewerDetails.ts'])

const ancestorPierce = /[\]\)]\s*&/
const galleryIdSelector = /#gallery-[\w-]+/g

const collectSourceFiles = async (dir: string): Promise<string[]> => {
  const entries = await readdir(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(path)))
      continue
    }
    if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      files.push(path)
    }
  }
  return files
}

const cssTemplates = (source: string) =>
  [...source.matchAll(/`([\s\S]*?)`/g)].map((match) => match[1])

test('component css does not pierce to an ancestor data attribute', async () => {
  const files = await collectSourceFiles(srcDir)
  const violations: string[] = []

  for (const file of files) {
    if (file.endsWith('.test.ts') || file.endsWith('.test.tsx')) continue
    const source = await readFile(file, 'utf8')
    for (const css of cssTemplates(source)) {
      if (!ancestorPierce.test(css)) continue
      violations.push(`${relative(srcDir, file)} :: ${css.trim().slice(0, 80)}`)
    }
  }

  expect(violations).toEqual([])
})

test('theme decorations keep #gallery- style hooks under the ratchet', async () => {
  const files = await collectSourceFiles(join(srcDir, 'components'))
  const decorations = files.filter((file) => {
    const name = file.split('/').pop() ?? ''
    return (
      decorationFiles.has(name) ||
      decorationSuffixes.some((suffix) => name.endsWith(suffix))
    )
  })

  let count = 0
  for (const file of decorations) {
    const source = await readFile(file, 'utf8')
    count += source.match(galleryIdSelector)?.length ?? 0
  }

  expect(count).toBeLessThanOrEqual(346)
})
