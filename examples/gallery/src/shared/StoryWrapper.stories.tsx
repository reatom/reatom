import { context } from '@reatom/core'
import type { Meta, StoryObj } from '@storybook/html'
import { expect } from 'storybook/test'

import { Button } from '../design-system'
import { themeMode, themePack } from '../model'
import { createMyself } from './test'
import { StoryWrapper } from './StoryWrapper'

const I = createMyself()

let preferenceSnapshot = {
  pack: 'paper' as ReturnType<typeof themePack>,
  mode: 'system' as ReturnType<typeof themeMode>,
}

const meta: Meta = {
  title: 'Shared/StoryWrapper',
  loaders: [
    (ctx) => {
      I.init(ctx)
      preferenceSnapshot = context.start(() => ({
        pack: themePack(),
        mode: themeMode(),
      }))
    },
  ],
}

export default meta

type Story = StoryObj

export const ExplicitThemeDoesNotMutatePreferences: Story = {
  render: () => (
    <StoryWrapper pack="bauhaus" mode="light">
      <Button label="bauhaus specimen" onClick={() => {}} />
    </StoryWrapper>
  ),
  play: async () => {
    const after = context.start(() => ({
      pack: themePack(),
      mode: themeMode(),
    }))
    await expect(after).toEqual(preferenceSnapshot)
    const specimen = await I.see((canvas) =>
      canvas.findByRole('button', { name: 'bauhaus specimen' }),
    )
    const root = specimen.closest('[data-theme-pack]')
    await expect(root).toHaveAttribute('data-theme-pack', 'bauhaus')
    await expect(root).toHaveAttribute('data-theme-mode', 'light')
  },
}
