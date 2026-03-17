import type { Meta, StoryObj } from '@storybook/html'

import { renderXoHarness } from './boot'
import { xoAdminActor as I } from './testing'

const meta: Meta = {
  title: 'Integration/Reatom JSX XO',
  render: renderXoHarness,
  parameters: {
    layout: 'fullscreen',
  },
  loaders: [(ctx) => void I.init(ctx)],
}

export default meta

export const WinningDebuggingJourney: StoryObj = {
  name: 'Winning debugging journey',
  play: async () => {
    await I.waitForReady()
    await I.startFreshSession()
    await I.playWinningGame()
    await I.waitForWinningLogs()
    await I.pauseCapture()
    await I.seeWinningState()
    await I.assertCapturedActivity()
    await I.searchLogs('winner')
    await I.assertWinnerSearchResults()
    await I.openLatestLog('winner')
    await I.assertWinnerFrameDetail()
    await I.searchLogs('')
    await I.assertStateExplorer()
  },
}
