import { atom } from '@reatom/core'
import { afterEach, expect, test, vi } from 'test'

import { reatomOtlpAdmin } from '../../otlp'
import { shopOtlpLogs } from '../../otlp/fixtures/analyticsRecords'
import { ADMIN_FRAME } from '../../root'
import { adminSettings } from '../settings'
import { handleAdminShellKey } from './shellKeys'

class DomElement {
  closest(_selector: string): DomElement | null {
    return null
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

const shell = {
  querySelector: () => null,
} as unknown as HTMLElement

function key(
  keyName: string,
  target: EventTarget | null = null,
  defaultPrevented = false,
  metaKey = false,
): KeyboardEvent {
  return {
    key: keyName,
    altKey: false,
    metaKey,
    ctrlKey: false,
    defaultPrevented,
    target,
    preventDefault() {},
  } as KeyboardEvent
}

test('shortcuts still run when the event was already cancelled', () => {
  vi.stubGlobal('Element', DomElement)
  const admin = reatomOtlpAdmin({
    sourceId: 'keys',
    resource: { 'service.name': 'keys' },
  })
  const helpOpen = ADMIN_FRAME.run(() => atom(false, '_test.shell.help'))
  ADMIN_FRAME.run(() => {
    handleAdminShellKey(shell, key('?', null, true), admin, helpOpen)
  })
  expect(ADMIN_FRAME.run(() => helpOpen())).toBe(true)
})

test('shortcuts ignore editable targets and tab lists', () => {
  vi.stubGlobal('Element', DomElement)
  const admin = reatomOtlpAdmin({
    sourceId: 'keys-skip',
    resource: { 'service.name': 'keys-skip' },
  })
  const helpOpen = ADMIN_FRAME.run(() => atom(false, '_test.shell.help.skip'))
  const input = new DomElement()
  input.closest = (selector) => (selector.includes('input') ? input : null)
  const tab = new DomElement()
  tab.closest = (selector) => (selector === '[role="tablist"]' ? tab : null)

  ADMIN_FRAME.run(() => {
    handleAdminShellKey(
      shell,
      key('?', input as unknown as EventTarget),
      admin,
      helpOpen,
    )
    handleAdminShellKey(
      shell,
      key('?', tab as unknown as EventTarget),
      admin,
      helpOpen,
    )
  })
  expect(ADMIN_FRAME.run(() => helpOpen())).toBe(false)
})

test('i and c toggle display settings unless the field is editable', () => {
  vi.stubGlobal('Element', DomElement)
  const admin = reatomOtlpAdmin({
    sourceId: 'keys-display',
    resource: { 'service.name': 'keys-display' },
  })
  const helpOpen = ADMIN_FRAME.run(() =>
    atom(false, '_test.shell.help.display'),
  )
  const settings = adminSettings()
  ADMIN_FRAME.run(() => {
    settings.icons.setTrue()
    settings.colors.setTrue()
    handleAdminShellKey(shell, key('i'), admin, helpOpen)
    handleAdminShellKey(shell, key('c'), admin, helpOpen)
  })
  expect(ADMIN_FRAME.run(() => settings.icons())).toBe(false)
  expect(ADMIN_FRAME.run(() => settings.colors())).toBe(false)

  const input = new DomElement()
  input.closest = (selector) => (selector.includes('input') ? input : null)
  ADMIN_FRAME.run(() => {
    handleAdminShellKey(
      shell,
      key('i', input as unknown as EventTarget),
      admin,
      helpOpen,
    )
    handleAdminShellKey(shell, key('i', null, false, true), admin, helpOpen)
  })
  expect(ADMIN_FRAME.run(() => settings.icons())).toBe(false)
  ADMIN_FRAME.run(() => {
    settings.icons.setTrue()
    settings.colors.setTrue()
  })
})

test('paths unit keys move and expand the path gantt', () => {
  vi.stubGlobal('Element', DomElement)
  const admin = reatomOtlpAdmin({
    sourceId: 'keys-paths',
    resource: { 'service.name': 'keys-paths' },
  })
  const helpOpen = ADMIN_FRAME.run(() => atom(false, '_test.shell.help.paths'))
  ADMIN_FRAME.run(() => {
    admin.ingest(shopOtlpLogs())
    admin.showPaths()
    admin.analytics.paths.collapseAll()
    handleAdminShellKey(shell, key('j'), admin, helpOpen)
    const selected = admin.analytics.paths.selected()
    expect(selected?.label).toBe('All sessions')
    handleAdminShellKey(shell, key('ArrowRight'), admin, helpOpen)
    expect(
      selected !== null && admin.analytics.paths.isExpanded(selected),
    ).toBe(true)
    handleAdminShellKey(shell, key('Enter'), admin, helpOpen)
    expect(admin.cardOpen()).toBe(true)
    admin.cardOpen.setFalse()
    admin.analytics.paths.select(null)
    handleAdminShellKey(shell, key('Enter'), admin, helpOpen)
    expect(admin.analytics.paths.selected()?.label).toBe('All sessions')
    expect(admin.cardOpen()).toBe(true)
  })
})
