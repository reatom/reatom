import type { Meta, StoryObj } from '@storybook/html'

import { mockFolderTree, mockImages } from '../__fixtures__/mockData'
import {
  lightboxImage,
  lightboxOpen,
  selectImage,
  visibleIndexMap,
} from '../model'
import { StoryWrapper } from '../shared/StoryWrapper'
import {
  createMyself,
  type DefiniteLocator,
  type Locator,
} from '../shared/test'
import { loadEmptyState, loadGalleryState } from '../shared/testSetup'
import { ImageInfoPanel } from './ImageInfoPanel'

const waitForUpdate = () => new Promise<void>((r) => setTimeout(r, 50))

const loc = {
  toggleButtonAppears: (canvas) =>
    canvas.findByRole('button', { name: /details/i }),
  toggleButtonDoesNotAppear: (canvas) =>
    canvas.queryByRole('button', { name: /details/i }),
  imageNameAppears:
    (name: string): Locator =>
    (canvas) =>
      canvas.findByText(name),
} satisfies Record<string, Locator | ((name: string) => Locator)>

const I = createMyself((I) => ({
  openInfoPanel: async () => {
    await I.click(loc.toggleButtonAppears as DefiniteLocator)
    await waitForUpdate()
  },
  seeImageName: async (name: string) => {
    await I.see(loc.imageNameAppears(name))
  },
  seeToggleButton: async () => {
    await I.see(loc.toggleButtonAppears as Locator)
  },
  dontSeeToggleButton: async () => {
    await I.dontSee(loc.toggleButtonDoesNotAppear)
  },
}))

const meta: Meta = {
  title: 'Components/ImageInfoPanel',
  loaders: [(ctx) => void I.init(ctx)],
}

export default meta

type Story = StoryObj

export const WithSelectedImage: Story = {
  render: () => {
    loadGalleryState({ tree: mockFolderTree })
    const model = [...visibleIndexMap().keys()][0]
    if (model) selectImage(model)
    return (
      <StoryWrapper>
        <ImageInfoPanel />
      </StoryWrapper>
    )
  },
  play: async () => {
    await I.openInfoPanel()
    await I.seeImageName(mockImages[0].name)
  },
}

export const NoImageSelected: Story = {
  render: () => {
    loadGalleryState({ tree: mockFolderTree })
    return (
      <StoryWrapper>
        <ImageInfoPanel />
      </StoryWrapper>
    )
  },
  play: async () => {
    await I.dontSeeToggleButton()
  },
}

export const WithLightboxImage: Story = {
  render: () => {
    loadGalleryState({ tree: mockFolderTree })
    const model = [...visibleIndexMap().keys()][0]
    if (model) {
      lightboxImage.set(() => model)
      lightboxOpen.setTrue()
    }
    return (
      <StoryWrapper>
        <ImageInfoPanel />
      </StoryWrapper>
    )
  },
  play: async () => {
    await I.openInfoPanel()
    await I.seeImageName(mockImages[0].name)
  },
}

export const EmptyGallery: Story = {
  render: () => {
    loadEmptyState()
    return (
      <StoryWrapper>
        <ImageInfoPanel />
      </StoryWrapper>
    )
  },
  play: async () => {
    await I.dontSeeToggleButton()
  },
}
