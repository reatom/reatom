import type { Meta, StoryObj } from '@storybook/html'

import { context } from '@reatom/core'
import { expect, userEvent } from 'storybook/test'

import { mockEmptyFolder, mockFolderTree } from '../__fixtures__/mockData'
import { lightboxOpen } from '../model'
import { StoryWrapper } from '../shared/StoryWrapper'
import { createMyself, type Locator } from '../shared/test'
import { loadGalleryState } from '../shared/testSetup'
import { ImageGrid } from './ImageGrid'

const waitForFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve())
  })

const loc = {
  firstImageAppears: (canvas) =>
    canvas.findByRole('button', { name: 'Open photo1.jpg' }),
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

export const NestedControlKeyboard: Story = {
  render: () => {
    loadGalleryState({ tree: mockFolderTree })
    return renderImageGrid()
  },
  play: async () => {
    const card = await I.see(loc.firstImageAppears)
    const select = await I.see((canvas) =>
      canvas.findByRole('checkbox', { name: 'Select photo1.jpg' }),
    )
    select.focus()
    await waitForFrame()
    await userEvent.keyboard(' ')
    await waitForFrame()
    await expect(select).toHaveAttribute('aria-checked', 'true')
    await expect(card).toHaveAttribute('data-selected', 'true')
    const lightboxWasOpened = context.start(() => lightboxOpen())
    await expect(lightboxWasOpened).toBe(false)
  },
}

export const TerminalOverlayFocus: Story = {
  render: () => {
    loadGalleryState({ tree: mockFolderTree })
    return (
      <StoryWrapper pack="terminal" mode="dark">
        <div style="padding: 20px;">
          <ImageGrid />
        </div>
      </StoryWrapper>
    )
  },
  play: async () => {
    const card = await I.see(loc.firstImageAppears)
    const overlay = card.querySelector(':scope > div:nth-of-type(2)')
    if (!(overlay instanceof HTMLElement)) {
      throw new Error('Expected grid overlay')
    }
    await expect(getComputedStyle(overlay).opacity).toBe('0')
    card.focus()
    await waitForFrame()
    await expect(card.matches(':focus-within')).toBe(true)
    await expect(
      getComputedStyle(card).getPropertyValue('--overlay-opacity').trim(),
    ).toBe('1')
    await expect(getComputedStyle(overlay).opacity).toBe('1')
    const select = await I.see((canvas) =>
      canvas.findByRole('checkbox', { name: 'Select photo1.jpg' }),
    )
    select.focus()
    await waitForFrame()
    await expect(card.matches(':focus-within')).toBe(true)
    await expect(getComputedStyle(overlay).opacity).toBe('1')
  },
}
