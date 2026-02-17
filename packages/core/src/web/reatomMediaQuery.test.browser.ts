import { expect, test } from 'test'
import { cdp, page } from 'vitest/browser'

import { take, wrap } from '../methods'
import { sleep } from '../utils'
import { rAF } from './rAF'
import { reatomMediaQuery } from './reatomMediaQuery'

test('reatomMediaQuery reacts to media changes', async () => {
  await wrap(page.viewport(1920, 1080))

  const isDark = reatomMediaQuery('(prefers-color-scheme: dark)')
  const isMobile = reatomMediaQuery('(max-width: 767px)')

  // Subscribe to ensure reactivity
  const unDark = isDark.subscribe()
  const unMobile = isMobile.subscribe()

  expect(isDark()).toBe(false)
  expect(isMobile()).toBe(false)

  // Change viewport to mobile using Playwright API
  await wrap(page.viewport(375, 667))
  await wrap(take(rAF))
  await wrap(take(rAF))

  expect(reatomMediaQuery('(max-width: 767px)')()).toBe(true)
  expect(isMobile()).toBe(true)

  // Change color scheme to dark using CDP API
  await wrap(
    cdp().send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-color-scheme', value: 'dark' }],
    }),
  )
  await wrap(sleep(50))

  expect(isDark()).toBe(true)

  // Change back
  await wrap(page.viewport(1024, 768))
  await wrap(
    cdp().send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-color-scheme', value: 'light' }],
    }),
  )
  await wrap(sleep(50))

  expect(isDark()).toBe(false)
  expect(isMobile()).toBe(false)

  // Cleanup
  unDark()
  unMobile()
})
