import type { Meta, StoryObj } from '@storybook/html'

import { mockFolderTree } from '../__fixtures__/mockData'
import { openLightbox, visibleIndexMap } from '../model'
import { StoryWrapper } from '../shared/StoryWrapper'
import { createMyself, type Locator } from '../shared/test'
import { loadGalleryState } from '../shared/testSetup'
import { Lightbox } from './Lightbox'

const loc = {
  lightboxCounterAppears: (canvas) => canvas.findByText(/1 \/ \d+/),
  closeButtonAppears: (canvas) => canvas.findByTitle('Close'),
} satisfies Record<string, Locator>

const I = createMyself((I) => ({
  seeLightboxOpen: async () => {
    await I.see(loc.lightboxCounterAppears)
    await I.see(loc.closeButtonAppears)
  },
}))

const meta: Meta = {
  title: 'Components/Lightbox',
  loaders: [(ctx) => void I.init(ctx)],
}

export default meta

type Story = StoryObj

export const OpenWithImages: Story = {
  render: () => {
    loadGalleryState({ tree: mockFolderTree })
    const first = [...visibleIndexMap().keys()][0]
    if (first) openLightbox(first)
    return (
      <StoryWrapper>
        <Lightbox />
      </StoryWrapper>
    )
  },
  play: async () => {
    await I.seeLightboxOpen()
  },
}
