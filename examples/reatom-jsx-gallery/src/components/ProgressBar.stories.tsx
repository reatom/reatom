import type { Meta, StoryObj } from '@storybook/html'

import { StoryWrapper } from '../shared/StoryWrapper'
import { createMyself, type Locator } from '../shared/test'
import { loadParsingState } from '../shared/testSetup'
import { ProgressBar } from './ProgressBar'

const loc = {
  scanningHeadingAppears: (canvas) =>
    canvas.findByRole('heading', { name: 'Scanning folder...' }),
  percentageAppears:
    (value: number): Locator =>
    (canvas) =>
      canvas.findByText(`${value}%`),
  cancelButtonAppears: (canvas) =>
    canvas.findByRole('button', { name: 'Cancel' }),
} satisfies Record<string, Locator | ((value: number) => Locator)>

const I = createMyself((I) => ({
  seeProgress: async (pct: number) => {
    await I.see(loc.percentageAppears(pct))
  },
  seeCancelButton: async () => {
    await I.see(loc.cancelButtonAppears)
  },
  seeMidProgress: async () => {
    await I.see(loc.scanningHeadingAppears)
    await I.see(loc.percentageAppears(50))
    await I.seeCancelButton()
  },
}))

const meta: Meta = {
  title: 'Components/ProgressBar',
  loaders: [(ctx) => void I.init(ctx)],
}

export default meta

type Story = StoryObj

const renderProgressBar = () => (
  <StoryWrapper>
    <ProgressBar />
  </StoryWrapper>
)

export const MidProgress: Story = {
  render: () => {
    loadParsingState({ total: 100, current: 50 })
    return renderProgressBar()
  },
  play: async () => {
    await I.seeMidProgress()
  },
}

export const NearComplete: Story = {
  render: () => {
    loadParsingState({ total: 100, current: 95 })
    return renderProgressBar()
  },
  play: async () => {
    await I.seeProgress(95)
  },
}

export const JustStarted: Story = {
  render: () => {
    loadParsingState({ total: 100, current: 1 })
    return renderProgressBar()
  },
  play: async () => {
    await I.seeProgress(1)
  },
}
