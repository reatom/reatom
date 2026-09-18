import type { Meta, StoryObj } from '@storybook/html'

import { mockFolderTree } from '../__fixtures__/mockData'
import { StoryWrapper } from '../shared/StoryWrapper'
import { createMyself, type Locator } from '../shared/test'
import { loadGalleryState } from '../shared/testSetup'
import { BreadcrumbNav } from './BreadcrumbNav'

const loc = {
  navigationAppears: (canvas) => canvas.findByRole('navigation'),
  galleryButtonAppears: (canvas) =>
    canvas.findByRole('button', { name: 'Gallery' }),
} satisfies Record<string, Locator>

const I = createMyself((I) => ({
  seeNavContains: async (text: string) => {
    await I.seeText(loc.navigationAppears, text)
  },
  clickBreadcrumb: async (name: string) => {
    await I.click((canvas) => canvas.findByRole('button', { name }))
  },
}))

const meta: Meta = {
  title: 'Components/BreadcrumbNav',
  render: () => {
    loadGalleryState({ tree: mockFolderTree })
    return (
      <StoryWrapper>
        <BreadcrumbNav />
      </StoryWrapper>
    )
  },
  loaders: [(ctx) => void I.init(ctx)],
}

export default meta

type Story = StoryObj

export const RootFolder: Story = {
  render: () => {
    loadGalleryState({
      tree: mockFolderTree,
      currentFolderNode: mockFolderTree,
    })
    return (
      <StoryWrapper>
        <BreadcrumbNav />
      </StoryWrapper>
    )
  },
  play: async () => {
    await I.seeNavContains('Gallery')
  },
}

export const NestedFolder: Story = {
  render: () => {
    loadGalleryState({
      tree: mockFolderTree,
      currentFolderNode: mockFolderTree.children[0]!,
    })
    return (
      <StoryWrapper>
        <BreadcrumbNav />
      </StoryWrapper>
    )
  },
  play: async () => {
    await I.seeNavContains('Gallery')
    await I.seeNavContains('subfolder')
  },
}

export const ClickBreadcrumb: Story = {
  render: () => {
    loadGalleryState({
      tree: mockFolderTree,
      currentFolderNode: mockFolderTree.children[0]!,
    })
    return (
      <StoryWrapper>
        <BreadcrumbNav />
      </StoryWrapper>
    )
  },
  play: async () => {
    await I.clickBreadcrumb('Gallery')
  },
}
