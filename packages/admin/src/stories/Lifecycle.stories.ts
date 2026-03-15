import { sleep, wrap } from '@reatom/core'
import type { Meta, StoryObj } from '@storybook/html'
import { expect } from 'storybook/test'

import { createAdminDevtools } from '../view'
import { currentDevtools, setCurrentDevtools, SETTLE_MS } from './helpers'
import { createInfoScene } from './sceneHelpers'

const meta: Meta = {
  title: 'Admin/Lifecycle',
}

export default meta

export const MountsWithShadowDOM: StoryObj = {
  render: () => {
    const devtools = createAdminDevtools()
    setCurrentDevtools(devtools)
    return createInfoScene(
      'Devtools lifecycle fixture',
      'This story checks mount, hide/show, and remount behavior while keeping a visible surface in the Storybook canvas.',
      [
        'Mount a fresh devtools shell',
        'Inspect the shadow root and style sheet',
        'Verify hide/show recovery',
      ],
    )
  },
  play: async () => {
    await wrap(sleep(SETTLE_MS))
    const devtoolsContainer = document.getElementById(
      currentDevtools!.containerId,
    )
    await expect(devtoolsContainer).not.toBeNull()
    await expect(devtoolsContainer!.shadowRoot).not.toBeNull()
    const appShell = devtoolsContainer!.shadowRoot!.querySelector(
      '[data-reatom-name="AppShell"]',
    )
    await expect(appShell).not.toBeNull()
    const handle = devtoolsContainer!.shadowRoot!.querySelector(
      '[aria-label="Reatom Admin devtools resize handle"]',
    )
    await expect(handle).not.toBeNull()
    if (!(handle instanceof HTMLElement)) {
      throw new Error('Resize handle is missing')
    }
    const handleStyle = window.getComputedStyle(handle)
    await expect(handleStyle.left).toBe('12px')
  },
}

export const ShowHideTogglesContainer: StoryObj = {
  render: () => {
    const devtools = createAdminDevtools()
    setCurrentDevtools(devtools)
    return createInfoScene(
      'Visibility toggle fixture',
      'Use this story to confirm the devtools container can disappear and return without losing its shell.',
      ['Show shell', 'Hide shell', 'Show shell again'],
    )
  },
  play: async () => {
    await wrap(sleep(SETTLE_MS))
    const { containerId, hide, show } = currentDevtools!
    await expect(document.getElementById(containerId)).not.toBeNull()

    hide()
    await wrap(sleep(SETTLE_MS))
    await expect(document.getElementById(containerId)).toBeNull()

    show()
    await wrap(sleep(SETTLE_MS))
    await expect(document.getElementById(containerId)).not.toBeNull()
  },
}

export const RemountKeepsShadowStyles: StoryObj = {
  render: () => {
    const firstDevtools = createAdminDevtools()
    firstDevtools.hide()
    firstDevtools.admin.dispose()

    const secondDevtools = createAdminDevtools()
    setCurrentDevtools(secondDevtools)
    return createInfoScene(
      'Remount fixture',
      'The remounted devtools should preserve its shadow-root styling after Storybook SPA navigation and shell recreation.',
      ['Create shell', 'Dispose shell', 'Remount shell', 'Verify stylesheet'],
    )
  },
  play: async () => {
    await wrap(sleep(SETTLE_MS))
    const container = document.getElementById(currentDevtools!.containerId)
    await expect(container).not.toBeNull()
    const sheet = container!.shadowRoot!.adoptedStyleSheets[0]
    await expect(sheet).toBeDefined()
    await expect(sheet!.cssRules.length).toBeGreaterThan(0)
    const appShell = container!.shadowRoot!.querySelector(
      '[data-reatom-name="AppShell"]',
    )
    await expect(appShell).not.toBeNull()
  },
}
