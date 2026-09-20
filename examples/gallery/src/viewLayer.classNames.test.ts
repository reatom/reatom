import { readdir, readFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, test } from 'vitest'

const srcDir = dirname(fileURLToPath(import.meta.url))

const classProp = /\bclass(?:Name)?\s*=/
const classSelector =
  /(?<![-\w])\.(?:gallery-|grid-image-|glass-card|glass-overlay|glass-background|lightbox-|bauhaus-|empty-gallery|filter-type|theme-mode-dot|slideshow-|blueprint-footer|obsidian-footer)/

const skip = /\.(?:test|stories)\.[cm]?tsx?$/

const collect = async (dir: string): Promise<string[]> => {
  const entries = await readdir(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collect(path)))
      continue
    }
    if (/\.[cm]?tsx?$/.test(entry.name)) files.push(path)
  }
  return files
}

test('gallery view sources do not use handwritten class names', async () => {
  const files = await collect(srcDir)
  const violations: string[] = []

  for (const file of files) {
    const source = await readFile(file, 'utf8')
    const rel = relative(srcDir, file)
    if (classProp.test(source)) {
      violations.push(`${rel} :: class prop`)
    }
    if (!skip.test(file) && classSelector.test(source)) {
      violations.push(`${rel} :: class selector`)
    }
  }

  expect(violations).toEqual([])
})
