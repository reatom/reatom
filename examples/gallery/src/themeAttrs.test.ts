import { expect, test } from 'vitest'

import { modeAttr, packAttr } from './themeAttrs'

test('packAttr.is is a same-element data selector', () => {
  expect(packAttr.is('bauhaus', 'min-height: 76px;')).toBe(
    `&[data-theme-pack='bauhaus']{min-height: 76px;}`,
  )
})

test('pack and mode nest on the same element', () => {
  expect(
    packAttr.is('retroOs', modeAttr.is('light', 'background: navy;')),
  ).toBe(
    `&[data-theme-pack='retroOs']{&[data-theme-mode='light']{background: navy;}}`,
  )
})
