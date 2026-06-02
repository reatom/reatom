import type { Meta, StoryObj } from '@storybook/html'

import { mockEmptyFolder, mockFolderTree } from '../__fixtures__/mockData'
import { StoryWrapper } from '../shared/StoryWrapper'
import { createMyself, type Locator } from '../shared/test'
import { loadGalleryState } from '../shared/testSetup'
import { ImageGrid } from './ImageGrid'

const loc = {
  firstImageAppears: (canvas) =>
    canvas.findByRole('img', { name: 'photo1.jpg' }),
  noImagesTextAppears: (canvas) => canvas.findByText('No images found'),
} satisfies Record<string, Locator>

const I = createMyself((I) => ({
  seeImages: async () => {
    await I.see(loc.firstImageAppears)
  },
  seeNoImages: async () => {
    await I.see(loc.noImagesTextAppears)
  },
}))

const meta: Meta = {
  title: 'Components/ImageGrid',
  loaders: [(ctx) => void I.init(ctx)],
}

export default meta

type Story = StoryObj

const renderImageGrid = () => (
  <StoryWrapper>
    <div style="padding: 20px;">
      <ImageGrid />
    </div>
  </StoryWrapper>
)

export const WithImages: Story = {
  render: () => {
    loadGalleryState({ tree: mockFolderTree })
    return renderImageGrid()
  },
  play: async () => {
    await I.seeImages()
  },
}

export const EmptyState: Story = {
  render: () => {
    loadGalleryState({ tree: mockEmptyFolder })
    return renderImageGrid()
  },
  play: async () => {
    await I.seeNoImages()
  },
}

export const SelectionCheckbox: Story = {
  render: () => {
    loadGalleryState({ tree: mockFolderTree })
    return renderImageGrid()
  },
  play: async () => {
    await I.seeImages()
  },
}
