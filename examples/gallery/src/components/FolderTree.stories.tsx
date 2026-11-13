import type { Meta, StoryObj } from '@storybook/html'
import { expect } from 'storybook/test'

import { mockEmptyFolder, mockFolderTree } from '../__fixtures__/mockData'
import { Button } from '../design-system'
import { folderTree, folderTreeSidebarVisible } from '../model'
import { StoryWrapper } from '../shared/StoryWrapper'
import { createMyself, type Locator } from '../shared/test'
import { loadGalleryState } from '../shared/testSetup'
import { FolderTree } from './FolderTree'

const waitForUpdate = () => new Promise<void>((r) => setTimeout(r, 50))

const loc = {
  galleryFolderAppears: (canvas) => canvas.findByText('Gallery'),
  subfolderAppears: (canvas) => canvas.findByText('subfolder'),
  emptyFolderAppears: (canvas) => canvas.findByText('EmptyFolder'),
} satisfies Record<string, Locator>

const I = createMyself((I) => ({
  seeNestedFolders: async () => {
    await I.see(loc.galleryFolderAppears)
    await I.see(loc.subfolderAppears)
  },
  seeEmptyFolder: async () => {
    await I.see(loc.emptyFolderAppears)
  },
  expandFirstFolder: async () => {
    const el = I._canvasElement
    if (!el) throw new Error('Actor not initialized')
    const expandBtn = el.querySelector('button[data-expanded]')
    if (expandBtn) {
      ;(expandBtn as HTMLElement).click()
      await waitForUpdate()
    }
  },
}))

const meta: Meta = {
  title: 'Components/FolderTree',
  loaders: [(ctx) => void I.init(ctx)],
}

export default meta

type Story = StoryObj

const renderFolderTree = () => (
  <StoryWrapper>
    <div style="padding: 20px; width: 280px;">
      <FolderTree />
    </div>
  </StoryWrapper>
)

export const WithNestedFolders: Story = {
  render: () => {
    loadGalleryState({ tree: mockFolderTree })
    return renderFolderTree()
  },
  play: async () => {
    await I.seeNestedFolders()
  },
}

export const SingleFolder: Story = {
  render: () => {
    loadGalleryState({ tree: mockEmptyFolder })
    return renderFolderTree()
  },
  play: async () => {
    await I.seeEmptyFolder()
  },
}

export const ExpandCollapse: Story = {
  render: () => {
    loadGalleryState({ tree: mockFolderTree })
    return renderFolderTree()
  },
  play: async () => {
    await I.expandFirstFolder()
  },
}

export const TogglePositionFollowsSidebarWidth: Story = {
  render: () => {
    loadGalleryState({ tree: mockFolderTree })
    folderTreeSidebarVisible.setTrue()
    return renderFolderTree()
  },
  play: async () => {
    const openToggle = await I.see((canvas) =>
      canvas.findByRole('button', { name: 'Hide folder tree' }),
    )
    const sidebarWidth = Number.parseFloat(
      getComputedStyle(openToggle).getPropertyValue('--sidebar-width').trim() ||
        '240px',
    )
    const toggleInset = Number.parseFloat(
      getComputedStyle(openToggle)
        .getPropertyValue('--folder-toggle-inset')
        .trim() || '8px',
    )
    await expect(getComputedStyle(openToggle).left).toBe(
      `${sidebarWidth + toggleInset}px`,
    )

    openToggle.click()
    await waitForUpdate()

    const closedToggle = await I.see((canvas) =>
      canvas.findByRole('button', { name: 'Show folder tree' }),
    )
    await expect(getComputedStyle(closedToggle).left).toBe('8px')
  },
}

export const ProgressiveRootDiscovery: Story = {
  render: () => {
    loadGalleryState({
      tree: {
        ...mockFolderTree,
        loaded: false,
        images: [],
        children: [],
        imageCount: 0,
      },
    })
    return (
      <StoryWrapper>
        <Button
          label="Publish folder names"
          onClick={() =>
            folderTree.set({
              ...mockFolderTree,
              images: [],
              children: mockFolderTree.children.map((child) => ({
                ...child,
                images: [],
              })),
            })
          }
        />
        <FolderTree />
      </StoryWrapper>
    )
  },
  play: async () => {
    await I.see(loc.galleryFolderAppears)
    await I.click((canvas) =>
      canvas.findByRole('button', { name: 'Publish folder names' }),
    )
    await I.see((canvas) =>
      canvas.findByRole('treeitem', { name: /^subfolder,/ }),
    )
    await I.see((canvas) =>
      canvas.findByRole('button', { name: 'Collapse Gallery' }),
    )
  },
}
