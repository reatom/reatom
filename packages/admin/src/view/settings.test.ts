import { atom, reatomBoolean } from '@reatom/core'
import { afterEach, expect, test } from 'test'

import { canPersistToLocalStorage } from '../filters/persistence'
import { ADMIN_FRAME, resetAdminFrame } from '../root'
import {
  adminSettings,
  registerLocalWorkOption,
  resetAdminSettings,
} from './settings'

const ICONS_KEY = '_Admin.settings.icons.v1'
const COLORS_KEY = '_Admin.settings.colors.v1'
const GRAPH_CONTINUATIONS_KEY = '_Admin.settings.graphContinuations.v1'
const SCHEME_KEY = '_Admin.settings.scheme.v1'
const ACCENT_KEY = '_Admin.settings.accent.v1'
const EQUAL_STATE_WARNINGS_KEY = '_Admin.settings.equalStateWarnings.v1'
const CORNER_KEY = '_Admin.settings.corner.v1'

afterEach(() => {
  resetAdminSettings()
  if (!canPersistToLocalStorage()) return
  localStorage.removeItem(ICONS_KEY)
  localStorage.removeItem(COLORS_KEY)
  localStorage.removeItem(EQUAL_STATE_WARNINGS_KEY)
  localStorage.removeItem(GRAPH_CONTINUATIONS_KEY)
  localStorage.removeItem(SCHEME_KEY)
  localStorage.removeItem(ACCENT_KEY)
  localStorage.removeItem(CORNER_KEY)
})

test('display settings default to on and toggle', () => {
  const settings = adminSettings()
  ADMIN_FRAME.run(() => {
    expect(settings.icons()).toBe(true)
    expect(settings.equalStateWarnings()).toBe(true)
    expect(settings.colors()).toBe(true)
    expect(settings.graphContinuations()).toBe(true)
    settings.icons.toggle()
    settings.equalStateWarnings.toggle()
    settings.colors.setFalse()
    settings.graphContinuations.toggle()
    expect(settings.icons()).toBe(false)
    expect(settings.equalStateWarnings()).toBe(false)
    expect(settings.colors()).toBe(false)
    expect(settings.graphContinuations()).toBe(false)
  })
})

test('display settings survive an admin frame reset', () => {
  if (!canPersistToLocalStorage()) return
  const settings = adminSettings()
  ADMIN_FRAME.run(() => {
    settings.icons.setFalse()
    settings.equalStateWarnings.setFalse()
    settings.colors.setFalse()
    settings.graphContinuations.setFalse()
  })
  expect(localStorage.getItem(ICONS_KEY)).toContain('false')
  expect(localStorage.getItem(EQUAL_STATE_WARNINGS_KEY)).toContain('false')
  expect(localStorage.getItem(COLORS_KEY)).toContain('false')
  expect(localStorage.getItem(GRAPH_CONTINUATIONS_KEY)).toContain('false')

  resetAdminFrame()

  expect(ADMIN_FRAME.run(() => adminSettings().icons())).toBe(false)
  expect(ADMIN_FRAME.run(() => adminSettings().equalStateWarnings())).toBe(
    false,
  )
  expect(ADMIN_FRAME.run(() => adminSettings().colors())).toBe(false)
  expect(ADMIN_FRAME.run(() => adminSettings().graphContinuations())).toBe(
    false,
  )
})

test('graph continuation preference is shared by shells and resets to visible', () => {
  const firstShell = adminSettings(),
    secondShell = adminSettings()
  expect(firstShell.graphContinuations).toBe(secondShell.graphContinuations)
  ADMIN_FRAME.run(() => {
    firstShell.graphContinuations.setFalse()
    expect(secondShell.graphContinuations()).toBe(false)
  })
  resetAdminSettings()
  ADMIN_FRAME.run(() => {
    expect(firstShell.graphContinuations()).toBe(true)
    expect(secondShell.graphContinuations()).toBe(true)
  })
})

test('accent color builds a light or dark palette', () => {
  const settings = adminSettings()
  ADMIN_FRAME.run(() => {
    expect(settings.scheme()).toBe('dark')
    expect(settings.accent()).toBe('#bc98f9')
    expect(settings.resolvedScheme()).toBe('dark')
    expect(settings.palette()['--admin-canvas']).toBe('oklch(0.16 0.02 245)')
    expect(settings.palette()['--admin-accent']).toBe('oklch(0.75 0.14 300)')

    settings.accent.set('#c2410c')
    const darkAccent = settings.palette()['--admin-accent']
    expect(darkAccent).toContain('oklch(')
    expect(darkAccent).not.toContain('300')

    settings.scheme.set('light')
    expect(settings.resolvedScheme()).toBe('light')
    const lightCanvas = Number.parseFloat(
      settings.palette()['--admin-canvas'].slice('oklch('.length),
    )
    expect(lightCanvas).toBeGreaterThan(0.9)

    settings.scheme.set('system')
    const resolved = settings.resolvedScheme()
    expect(resolved === 'light' || resolved === 'dark').toBe(true)
    expect(settings.palette()['--admin-accent']).toContain('oklch(')
  })
})

test('accent color survives an admin frame reset', () => {
  if (!canPersistToLocalStorage()) return
  const settings = adminSettings()
  ADMIN_FRAME.run(() => {
    settings.scheme.set('light')
    settings.accent.set('#c2410c')
  })
  expect(localStorage.getItem(SCHEME_KEY)).toContain('light')
  expect(localStorage.getItem(ACCENT_KEY)).toContain('#c2410c')

  resetAdminFrame()

  expect(ADMIN_FRAME.run(() => adminSettings().scheme())).toBe('light')
  expect(ADMIN_FRAME.run(() => adminSettings().accent())).toBe('#c2410c')
  expect(
    ADMIN_FRAME.run(() => adminSettings().palette()['--admin-canvas']),
  ).not.toBe('oklch(0.16 0.02 245)')
})

test('panel corner defaults to bottom right and persists', () => {
  const settings = adminSettings()
  ADMIN_FRAME.run(() => {
    expect(settings.corner()).toBe('bottom-right')
    settings.corner.set('top-left')
  })
  if (!canPersistToLocalStorage()) return
  expect(localStorage.getItem(CORNER_KEY)).toContain('top-left')

  resetAdminFrame()

  expect(ADMIN_FRAME.run(() => adminSettings().corner())).toBe('top-left')
})

test('local work options register, replace, and unregister', () => {
  const first = ADMIN_FRAME.run(() =>
    reatomBoolean(false, '_Admin.settings.test.localWork'),
  )
  const replacement = atom(true, '_Admin.settings.test.localWorkReplacement')
  const unregister = ADMIN_FRAME.run(() =>
    registerLocalWorkOption({
      id: 'capture',
      label: 'Capture local spans',
      description: 'Keep spans from this tab',
      checked: first,
    }),
  )
  ADMIN_FRAME.run(() => {
    expect(adminSettings().localWorkOptions()).toEqual([
      expect.objectContaining({ id: 'capture', checked: first }),
    ])
  })

  const unregisterReplacement = ADMIN_FRAME.run(() =>
    registerLocalWorkOption({
      id: 'capture',
      label: 'Capture local spans',
      checked: replacement,
    }),
  )
  ADMIN_FRAME.run(() => {
    const options = adminSettings().localWorkOptions()
    expect(options).toHaveLength(1)
    expect(options[0]?.checked).toBe(replacement)
  })

  unregister()
  ADMIN_FRAME.run(() => {
    expect(adminSettings().localWorkOptions()).toHaveLength(1)
  })
  unregisterReplacement()
  ADMIN_FRAME.run(() => {
    expect(adminSettings().localWorkOptions()).toEqual([])
  })
})
