import { sleep, wrap } from '@reatom/core'
import type { Meta, StoryObj } from '@storybook/html'
import { expect } from 'storybook/test'

import { createAdminDevtools } from '../view'
import { currentDevtools, setCurrentDevtools, SETTLE_MS } from './helpers'

const meta: Meta = {
  title: 'Admin/Lifecycle',
}

export default meta

export const MountsWithShadowDOM: StoryObj = {
  render: () => {
    const devtools = createAdminDevtools()
    setCurrentDevtools(devtools)
    return document.createElement('div')
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
    return document.createElement('div')
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
    return document.createElement('div')
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
