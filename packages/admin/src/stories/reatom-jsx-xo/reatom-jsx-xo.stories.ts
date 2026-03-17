import preview from '../../../.storybook/preview-factory'

import { renderXoHarness } from './boot'
import { xoAdminActor as I } from './testing'

const meta = preview.meta({
  title: 'Integration/Reatom JSX XO',
  component: renderXoHarness,
  parameters: {
    layout: 'fullscreen',
  },
  loaders: [(ctx) => void I.init(ctx)],
})

export default meta

export const WinningDebuggingJourney = meta.story({
  name: 'Winning debugging journey',
  play: () => I.waitForReady(),
})

WinningDebuggingJourney.test(
  'plays the game and investigates the captured logs',
  async () => {
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
)
