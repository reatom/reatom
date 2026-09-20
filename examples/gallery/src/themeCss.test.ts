import { expect, test } from 'vitest'

import { themeCss } from './themeCss'

test('themeCss scopes rules to an ancestor pack', () => {
  const rules = themeCss('bauhaus', 'min-height: 76px;')
  expect(rules).toContain(":where([data-theme-pack='bauhaus']) &")
  expect(rules).toContain('min-height: 76px;')
})

test('themeCss can also require a mode', () => {
  const rules = themeCss('retroOs', 'background: navy;', 'light')
  expect(rules).toContain(
    ":where([data-theme-pack='retroOs'][data-theme-mode='light']) &",
  )
  expect(rules).toContain('background: navy;')
})
