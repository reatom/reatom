import type { Meta, StoryObj } from '@storybook/html'
import { expect } from 'storybook/test'

import { StoryWrapper } from '../shared/StoryWrapper'
import { createMyself, type Locator } from '../shared/test'
import { ThemeToggle } from './ThemeToggle'

const waitForUpdate = () => new Promise<void>((r) => setTimeout(r, 50))

const loc = {
  themeToggleButtonAppears: (canvas) =>
    canvas.findByRole('button', { name: 'Toggle theme' }),
} satisfies Record<string, Locator>

const I = createMyself((I) => ({
  seeThemeToggle: async () => {
    const btn = await I.see(loc.themeToggleButtonAppears)
    await expect(btn).toHaveAttribute('aria-label', 'Toggle theme')
  },
  toggleTheme: async () => {
    const el = I._canvasElement
    if (!el) throw new Error('Actor not initialized')
    const button = el.querySelector('button[aria-label="Toggle theme"]')
    if (!button) throw new Error('Theme toggle button not found')
    const initialSvg = (button as HTMLElement).innerHTML
    ;(button as HTMLElement).click()
    await waitForUpdate()
    const afterSvg = (button as HTMLElement).innerHTML
    await expect(afterSvg).not.toBe(initialSvg)
  },
}))

const meta: Meta = {
  title: 'Components/ThemeToggle',
  render: () => (
    <StoryWrapper>
      <ThemeToggle />
    </StoryWrapper>
  ),
  loaders: [(ctx) => void I.init(ctx)],
}

export default meta

type Story = StoryObj

export const Default: Story = {
  play: async () => {
    await I.seeThemeToggle()
  },
}

export const ToggleOnClick: Story = {
  play: async () => {
    await I.toggleTheme()
  },
}
