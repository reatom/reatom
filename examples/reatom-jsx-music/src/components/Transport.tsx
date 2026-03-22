import {
  cycleRepeat,
  formatClock,
  isPlaying,
  nextTrack,
  openFolder,
  positionSec,
  durationSec,
  prevTrack,
  repeatMode,
  seekToRatio,
  shuffleEnabled,
  stopPlayback,
  togglePlay,
  toggleShuffle,
} from '../model'

const baseBtn = `
  font: inherit;
  min-width: 28px;
  height: 22px;
  padding: 0 6px;
  cursor: pointer;
  color: #111;
  background: linear-gradient(180deg, #e8e8e8, #9a9a9a);
  border: 1px solid #000;
  box-shadow:
    inset 0 1px 0 #fff,
    inset 0 -1px 0 #555;
`

const btnPressed = `
  background: linear-gradient(180deg, #9a9a9a, #d0d0d0);
  box-shadow: inset 0 1px 2px #333;
`

export const Transport = () => {
  return (
    <div
      css={`
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 6px 8px;
        background: var(--winamp-panel);
        border: 1px solid #000;
        border-top: 1px solid var(--winamp-bevel-light);
      `}
    >
      <div
        css={`
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: ui-monospace, 'Courier New', monospace;
          font-size: 12px;
          color: var(--winamp-led);
          text-shadow: 0 0 4px rgba(56, 242, 56, 0.5);
        `}
      >
        <span css={`min-width: 38px;`}>{() => formatClock(positionSec())}</span>
        <input
          type="range"
          min={0}
          max={1000}
          prop:value={() => {
            const duration = durationSec()
            const position = positionSec()
            if (!Number.isFinite(duration) || duration <= 0) {
              return 0
            }
            return Math.round((position / duration) * 1000)
          }}
          on:input={(event) => {
            const input = event.currentTarget
            const ratio = Number(input.value) / 1000
            seekToRatio(ratio)
          }}
          css={`
            flex: 1;
            height: 10px;
            accent-color: var(--winamp-accent);
            cursor: pointer;
          `}
        />
        <span css={`min-width: 38px; text-align: right;`}>
          {() => formatClock(durationSec())}
        </span>
      </div>

      <div css={`display: flex; flex-wrap: wrap; align-items: center; gap: 4px;`}>
        <button type="button" css={baseBtn} on:click={() => prevTrack()}>
          |◀
        </button>
        <button type="button" css={baseBtn} on:click={() => togglePlay()}>
          {() => (isPlaying() ? '⏸' : '▶')}
        </button>
        <button type="button" css={baseBtn} on:click={() => stopPlayback()}>
          ■
        </button>
        <button type="button" css={baseBtn} on:click={() => nextTrack()}>
          ▶|
        </button>
        <button
          type="button"
          css={() => (shuffleEnabled() ? baseBtn + btnPressed : baseBtn)}
          on:click={() => toggleShuffle()}
          title="Shuffle"
        >
          S
        </button>
        <button
          type="button"
          css={baseBtn}
          on:click={() => cycleRepeat()}
          title="Repeat"
        >
          {() => {
            const mode = repeatMode()
            if (mode === 'one') {
              return 'R1'
            }
            if (mode === 'all') {
              return 'R*'
            }
            return 'R'
          }}
        </button>
        <button
          type="button"
          css={baseBtn}
          prop:disabled={() => !openFolder.ready()}
          on:click={() => openFolder()}
          title="Open folder"
        >
          ⏏
        </button>
      </div>
    </div>
  )
}
