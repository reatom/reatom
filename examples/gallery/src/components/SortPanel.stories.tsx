import type { Meta, StoryObj } from '@storybook/html'
import { expect } from 'storybook/test'

import { mockFolderTree } from '../__fixtures__/mockData'
import { StoryWrapper } from '../shared/StoryWrapper'
import {
  createMyself,
  type DefiniteLocator,
  type Locator,
} from '../shared/test'
import { loadGalleryState } from '../shared/testSetup'
import { SortPanel } from './SortPanel'

const waitForUpdate = () => new Promise<void>((r) => setTimeout(r, 50))

const loc = {
  nameSortButtonAppears: (canvas) =>
    canvas.findByRole('button', { name: 'Name' }),
  orderButtonAppears: (canvas) =>
    canvas.findByRole('button', { name: /Sort (ascending|descending)/ }),
  sizeSortButtonAppears: (canvas) =>
    canvas.findByRole('button', { name: 'Size' }),
} satisfies Record<string, Locator>

const I = createMyself((I) => ({
  seeSortControls: async () => {
    await I.see(loc.nameSortButtonAppears)
    await I.see(loc.orderButtonAppears)
  },
  clickSortBySize: async () => {
    await I.click(loc.sizeSortButtonAppears as DefiniteLocator)
    await waitForUpdate()
  },
  seeSortedBySize: async () => {
    const sizeBtn = await I.resolveLocator(
      loc.sizeSortButtonAppears as DefiniteLocator,
    )
    await expect(sizeBtn).toHaveAttribute('aria-pressed', 'true')
  },
  toggleSortOrder: async () => {
    const orderBtn = await I.resolveLocator(
      loc.orderButtonAppears as DefiniteLocator,
    )
    const initialName = orderBtn.getAttribute('title')
    await I.click(loc.orderButtonAppears as DefiniteLocator)
    await waitForUpdate()
    const orderBtnAfter = await I.resolveLocator(
      loc.orderButtonAppears as DefiniteLocator,
    )
    await expect(orderBtnAfter.getAttribute('title')).not.toBe(initialName)
  },
}))

const meta: Meta = {
  title: 'Components/SortPanel',
  render: () => {
    loadGalleryState({ tree: mockFolderTree })
    return (
      <StoryWrapper>
        <SortPanel />
      </StoryWrapper>
    )
  },
  loaders: [(ctx) => void I.init(ctx)],
}

export default meta

type Story = StoryObj

export const Default: Story = {
  play: async () => {
    await I.seeSortControls()
  },
}

export const ClickSortField: Story = {
  play: async () => {
    await I.clickSortBySize()
    await I.seeSortedBySize()
  },
}

export const ToggleOrder: Story = {
  play: async () => {
    await I.toggleSortOrder()
  },
}
