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
