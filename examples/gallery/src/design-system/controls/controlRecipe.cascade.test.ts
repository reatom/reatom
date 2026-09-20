import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, test } from 'vitest'

import { composeControlCss, controlRecipeCss } from './controlStyles'

const here = dirname(fileURLToPath(import.meta.url))

test('recipe type sits on [data-ui], so ThemeRoot button inherit cannot win', () => {
  const css = controlRecipeCss()
  const typeHook = css.match(
    /\[data-ui="button"\],\s*\[data-ui="switch"\] \{([^}]+)\}/,
  )
  expect(typeHook?.[1]).toMatch(/font-size:\s*var\(--_font-size\)/)
  const whereBlock = css.match(
    /:where\(\[data-ui="button"\], \[data-ui="switch"\]\) \{([^}]+)\}/,
  )
  expect(whereBlock?.[1] ?? '').not.toMatch(/font-size/)
})

test('ThemeRoot only inherits type onto raw buttons', async () => {
  const source = await readFile(join(here, '../ThemeRoot.tsx'), 'utf8')
  expect(source).toContain(':where(button:not([data-ui]))')
})

test('size overrides compose after role defaults and before consumer css', () => {
  expect(controlRecipeCss()).not.toMatch(
    /:where\(\[data-ui="button"\]\[data-ui-size/,
  )
  const composed = composeControlCss(
    'app',
    'action',
    'lg',
    'width: 99px; height: 99px;',
  )
  expect(composed).toMatch(/--_min-height:\s*var\(--ui-app-action-min-height\)/)
  expect(composed.indexOf('--_min-height: 48px')).toBeGreaterThan(
    composed.indexOf('--_min-height: var(--ui-app-action-min-height)'),
  )
  expect(composed.indexOf('width: 99px')).toBeGreaterThan(
    composed.indexOf('--_min-height: 48px'),
  )
})
