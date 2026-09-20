import { readdir, readFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, test } from 'vitest'

const componentsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../components',
)

const decorationSuffixes = ['Details.ts', 'Details.tsx', 'Theme.ts']
const decorationFiles = new Set(['ThemeViewerDetails.ts'])

const controlSelector =
  /(?:^|[^\w-])(\[data-ui|\[data-glass-toggle|\[aria-pressed|\[aria-checked|\[data-active|\[data-ui-selected|#gallery-folder-sidebar ~ \[data-ui)/
const chromeOnly = /:not\(\[data-ui\]\)/
const a11yFallback =
  /forced-colors|prefers-contrast|prefers-reduced-transparency|Canvas(?:Text)?/
const paintProperty =
  /^(?:color|background|background-color|background-image|border|border-color|border-top-color|box-shadow)\s*:/

type Rule = {
  selector: string
  declarations: string[]
}

const splitRules = (css: string): Rule[] => {
  const rules: Rule[] = []
  const stack: string[] = []
  let buffer = ''
  let selector = ''

  for (const char of css) {
    if (char === '{') {
      const nextSelector = buffer.trim()
      if (stack.length > 0) {
        selector = `${stack[stack.length - 1]} ${nextSelector}`.trim()
      } else {
        selector = nextSelector
      }
      stack.push(selector)
      buffer = ''
      continue
    }
    if (char === '}') {
      const current = stack.pop()
      const body = buffer.trim()
      if (current && body.length > 0 && !body.includes('{')) {
        rules.push({
          selector: current,
          declarations: body
            .split(';')
            .map((part) => part.trim())
            .filter(Boolean),
        })
      }
      buffer = ''
      continue
    }
    buffer += char
  }

  return rules
}

const collectDecorationFiles = async (dir: string): Promise<string[]> => {
  const entries = await readdir(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectDecorationFiles(path)))
      continue
    }
    if (
      decorationFiles.has(entry.name) ||
      decorationSuffixes.some((suffix) => entry.name.endsWith(suffix))
    ) {
      files.push(path)
    }
  }
  return files
}

test('theme decorations do not paint control interaction states', async () => {
  const files = await collectDecorationFiles(componentsDir)
  const violations: string[] = []

  for (const file of files) {
    const source = await readFile(file, 'utf8')
    const templates = [...source.matchAll(/`([\s\S]*?)`/g)].map(
      (match) => match[1],
    )
    for (const css of templates) {
      for (const rule of splitRules(css)) {
        if (!controlSelector.test(rule.selector)) continue
        if (chromeOnly.test(rule.selector)) continue
        if (a11yFallback.test(rule.selector)) continue
        if (/\sinput\b/.test(rule.selector)) continue
        const paints = rule.declarations.filter((declaration) =>
          paintProperty.test(declaration),
        )
        if (paints.length === 0) continue
        violations.push(
          `${relative(componentsDir, file)} :: ${rule.selector} { ${paints.join('; ')} }`,
        )
      }
    }
  }

  expect(violations).toEqual([])
})
