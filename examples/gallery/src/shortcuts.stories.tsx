import type { Meta, StoryObj } from '@storybook/html'
import { context } from '@reatom/core'
import { expect, userEvent } from 'storybook/test'

import { mockFolderTree } from './__fixtures__/mockData'
import { App } from './App'
import { currentImages, openLightbox, slideshowPlaying } from './model'
import { createMyself, type Locator } from './shared/test'
import {
  loadGalleryState,
  loadGalleryStateWithImageModels,
} from './shared/testSetup'

const waitForUpdate = () => new Promise<void>((r) => setTimeout(r, 50))

const loc = {
  lightboxAppears: (canvas) =>
    canvas.findByRole('button', { name: 'Close preview' }),
  maybeLightbox: (canvas) =>
    canvas.queryByRole('button', { name: 'Close preview' }),
  closeButtonAppears: (canvas) =>
    canvas.findByRole('button', { name: 'Close preview' }),
  imageCountAppears: (canvas) => canvas.findByText(/\d+ images/),
} satisfies Record<string, Locator>

const I = createMyself((I) => ({
  seeLightboxOpen: async () => {
    await I.see(loc.lightboxAppears)
  },
  seeLightboxClosed: async () => {
    await I.dontSee(loc.maybeLightbox)
  },
  closeLightbox: async () => {
    await I.click(loc.closeButtonAppears)
    await waitForUpdate()
  },
  seeImageCount: async () => {
    await I.see(loc.imageCountAppears)
  },
}))

const meta: Meta = {
  title: 'Integration/KeyboardShortcuts',
  parameters: { layout: 'fullscreen' },
  loaders: [(ctx) => void I.init(ctx)],
}

export default meta

type Story = StoryObj

export const CloseLightbox: Story = {
  render: () => {
    loadGalleryStateWithImageModels({ tree: mockFolderTree })
    const first = currentImages()[0]
    if (first) openLightbox(first)
    return <App />
  },
  play: async () => {
    await I.seeLightboxOpen()
    await I.closeLightbox()
    await I.seeLightboxClosed()
  },
}

export const FullAppWithShortcuts: Story = {
  render: () => {
    loadGalleryState({ tree: mockFolderTree })
    return <App />
  },
  play: async () => {
    await I.seeImageCount()
  },
}

export const TableRowSpaceDoesNotStartSlideshow: Story = {
  render: () => {
    loadGalleryState({ tree: mockFolderTree })
    return <App />
  },
  play: async () => {
    await I.seeImageCount()
    const tableView = await I.see((canvas) =>
      canvas.findByRole('button', { name: 'table view' }),
    )
    tableView.click()
    await waitForUpdate()
    const row = await I.see((canvas) =>
      canvas.findByRole('row', { name: /photo1\.jpg/i }),
    )
    row.focus()
    await userEvent.keyboard(' ')
    await I.seeLightboxOpen()
    const playing = context.start(() => slideshowPlaying())
    await expect(playing).toBe(false)
  },
}
