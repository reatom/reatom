import { expect, test } from 'vitest'

import { getThemeDefinition } from '../../themeDefinitions'
import { CONTROL_ROLES, CONTROL_SURFACES } from '../themeTypes'
import {
  resolveRegisteredControlTheme,
  resolveViewerControlCssVars,
  THEME_PACK_IDS,
} from './registry'

test('every registered pack resolves complete control states for both modes', () => {
  for (const pack of THEME_PACK_IDS) {
    for (const mode of ['light', 'dark'] as const) {
      const theme = resolveRegisteredControlTheme(pack, mode)
      for (const surface of CONTROL_SURFACES) {
        for (const role of CONTROL_ROLES) {
          const palette = theme[surface][role]
          expect(palette.rest.background).not.toBe(palette.hover.background)
          expect(palette.selected.background).not.toBe(
            palette.selectedHover.background,
          )
          expect(palette.focus.color.length).toBeGreaterThan(0)
          expect(palette.focus.width.length).toBeGreaterThan(0)
        }
      }
      expect(theme.overlay.rest.background).not.toBe(
        theme.overlay.hover.background,
      )
      expect(theme.overlay.selected.background).not.toBe(
        theme.overlay.selectedHover.background,
      )
    }
  }
})

test('every pack defines a viewer pair in both modes', () => {
  for (const pack of THEME_PACK_IDS) {
    for (const mode of ['light', 'dark'] as const) {
      const vars = getThemeDefinition(pack)[mode]
      expect(vars['--viewer-fg']).toBeTruthy()
      expect(vars['--viewer-bg']).toBeTruthy()
      expect(vars['--viewer-bg-hover']).toBeTruthy()
      expect(vars['--viewer-border']).toBeTruthy()
      expect(vars['--viewer-fg']).not.toBe(vars['--viewer-bg'])
    }
  }
})

test('blueprint light viewer ink sits on a wash, not navy fill', () => {
  const vars = getThemeDefinition('blueprint').light
  expect(vars['--viewer-fg']).toBe('var(--text-primary)')
  expect(vars['--viewer-bg']).toBe('#234f9b0c')
  expect(vars['--viewer-bg-hover']).toBe('#234f9b20')
  const theme = resolveRegisteredControlTheme('blueprint', 'light')
  expect(theme.viewer.action.rest.foreground).toBe('var(--viewer-fg)')
  expect(theme.viewer.action.rest.background).toBe('var(--viewer-bg)')
})

test('glass choice type is 11px, not the 16px body inherit', () => {
  const theme = resolveRegisteredControlTheme('glass', 'light')
  expect(theme.app.choice.typography.fontSize).toBe('11px')
  expect(theme.viewer.choice.typography.fontSize).toBe('11px')
})

test('retro light app action is a square bevel, not the default glow pill', () => {
  const theme = resolveRegisteredControlTheme('retroOs', 'light')
  expect(theme.app.action.geometry.radius).toBe('0px')
  expect(theme.app.action.geometry.borderStyle).toBe('solid')
  expect(theme.app.action.rest.shadow).toBe('var(--retro-raised)')
  expect(theme.app.action.rest.background).toBe(
    'var(--retro-face, var(--input-bg))',
  )
})

test('paper viewer choice is not a capsule; icon chrome stays round', () => {
  const theme = resolveRegisteredControlTheme('paper', 'light')
  expect(theme.viewer.choice.geometry.radius).not.toBe('50%')
  expect(theme.viewer.choice.geometry.radius).not.toBe('999px')
  expect(theme.viewer.action.geometry.radius).toBe('50%')
})

test('viewer host vars are only the viewer surface', () => {
  const vars = resolveViewerControlCssVars('blueprint', 'light')
  for (const key of Object.keys(vars)) {
    expect(key.startsWith('--ui-viewer-')).toBe(true)
  }
})
