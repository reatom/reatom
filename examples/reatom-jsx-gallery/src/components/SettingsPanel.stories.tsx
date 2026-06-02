import type { Meta, StoryObj } from '@storybook/html'

import { mockFolderTree } from '../__fixtures__/mockData'
import { StoryWrapper } from '../shared/StoryWrapper'
import { createMyself, type Locator } from '../shared/test'
import { loadGalleryState } from '../shared/testSetup'
import { SettingsPanel, settingsPanelOpen } from './SettingsPanel'

const loc = {
  settingsHeadingAppears: (canvas) =>
    canvas.findByRole('heading', { name: 'Settings' }),
} satisfies Record<string, Locator>

const I = createMyself((I) => ({
  seeSettingsPanelOpen: async () => {
    await I.see(loc.settingsHeadingAppears)
  },
}))

const meta: Meta = {
  title: 'Components/SettingsPanel',
  loaders: [(ctx) => void I.init(ctx)],
}

export default meta

type Story = StoryObj

export const OpenWithDefaults: Story = {
  render: () => {
    loadGalleryState({ tree: mockFolderTree })
    settingsPanelOpen.set(true)
    return (
      <StoryWrapper>
        <SettingsPanel />
      </StoryWrapper>
    )
  },
  play: async () => {
    await I.seeSettingsPanelOpen()
  },
}
