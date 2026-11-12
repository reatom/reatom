import { expect, test } from 'test'
import { cdp } from 'vitest/browser'

import { wrap } from '../methods'
import { sleep } from '../utils'
import { themeAtom } from './themeAtom'

test('themeAtom follows browser color scheme changes in system mode', async () => {
  const emulate = (value: 'light' | 'dark') =>
    cdp().send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-color-scheme', value }],
    })

  await wrap(emulate('light'))
  const root = document.documentElement
  const previousColorScheme = root.style.colorScheme
  let unsubscribe = themeAtom.resolved.subscribe()
  try {
    await wrap(sleep(50))
    expect(themeAtom.resolved()).toBe('light')
    expect(root.style.colorScheme).toBe('light dark')

    await wrap(emulate('dark'))
    await wrap(sleep(50))
    expect(themeAtom.resolved()).toBe('dark')
    expect(themeAtom()).toBe('system')

    themeAtom.setLight()
    await wrap(sleep())
    expect(themeAtom.resolved()).toBe('light')
    expect(root.style.colorScheme).toBe('light')
    themeAtom.setSystem()
    expect(themeAtom.resolved()).toBe('dark')

    await wrap(emulate('light'))
    await wrap(sleep(50))
    expect(themeAtom.resolved()).toBe('light')
    expect(themeAtom()).toBe('system')

    themeAtom.setDark()
    await wrap(sleep())
    expect(themeAtom.resolved()).toBe('dark')
    expect(root.style.colorScheme).toBe('dark')
    themeAtom.reset()
    await wrap(sleep())
    expect(themeAtom()).toBe('system')
    expect(root.style.colorScheme).toBe('light dark')

    unsubscribe()
    await wrap(sleep())
    await wrap(emulate('dark'))
    await wrap(sleep(50))
    unsubscribe = themeAtom.resolved.subscribe()
    await wrap(sleep())
    expect(themeAtom.resolved()).toBe('dark')
  } finally {
    unsubscribe()
    await wrap(emulate('light'))
    root.style.colorScheme = previousColorScheme
  }
})
