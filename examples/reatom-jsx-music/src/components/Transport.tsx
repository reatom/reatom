import {
  cycleRepeat,
  durationSec,
  formatClock,
  isPlaying,
  nextTrack,
  openFolder,
  positionSec,
  prevTrack,
  repeatMode,
  seekToRatio,
  shuffleEnabled,
  stopPlayback,
  togglePlay,
  toggleShuffle,
} from '../model'

const baseBtn = `
  min-width: 40px;
  height: 34px;
  padding: 0 10px;
  display: grid;
  place-items: center;
  cursor: pointer;
  color: #141922;
  font-weight: 700;
  line-height: 1;
  background: linear-gradient(180deg, #f3f6fb 0%, #bcc4cf 56%, #8d949f 100%);
  border: 1px solid #000;
  border-radius: 6px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.74),
    inset 0 -1px 0 rgba(35, 39, 48, 0.45),
    0 1px 0 rgba(255, 255, 255, 0.08);
  transition:
    transform 120ms ease,
    filter 120ms ease,
    opacity 120ms ease;

  &:hover:not(:disabled) {
    filter: brightness(1.04);
  }

  &:active:not(:disabled) {
    transform: translateY(1px);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
`

const transportBtn = `
  ${baseBtn}
  font-size: 15px;
`

const primaryTransportBtn = `
  ${transportBtn}
  min-width: 50px;
  height: 38px;
  font-size: 18px;
  color: #1d1404;
  background: linear-gradient(180deg, #ffe09d 0%, #efad49 54%, #ad671d 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.45),
    inset 0 -1px 0 rgba(88, 51, 8, 0.42),
    0 0 18px rgba(243, 163, 63, 0.18);
`

const btnPressed = `
  color: #2a1604;
  background: linear-gradient(180deg, #ffd089 0%, #e6a042 54%, #a86525 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.34),
    inset 0 -1px 0 rgba(81, 45, 8, 0.45),
    0 0 16px rgba(243, 163, 63, 0.16);
`

export const Transport = () => {
  return (
    <div
      css={`
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 10px;
        background: linear-gradient(
          180deg,
          rgba(44, 48, 57, 0.98) 0%,
          rgba(23, 25, 30, 0.98) 100%
        );
        border-left: 1px solid var(--winamp-frame);
        border-right: 1px solid var(--winamp-frame);
        border-top: 1px solid rgba(255, 255, 255, 0.07);
        border-bottom: 1px solid rgba(0, 0, 0, 0.6);
      `}
    >
      <div
        css={`
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 10px;
          font-family: ui-monospace, 'Courier New', monospace;
          font-size: 12px;
          color: var(--winamp-led);
          text-shadow: 0 0 8px rgba(87, 255, 107, 0.4);
        `}
      >
        <span
          css={`
            min-width: 48px;
            padding: 5px 7px;
            border: 1px solid #071109;
            border-radius: 6px;
            background:
              linear-gradient(180deg, rgba(13, 38, 18, 0.98), rgba(7, 18, 10, 0.98)),
              repeating-linear-gradient(
                180deg,
                rgba(255, 255, 255, 0.03) 0 1px,
                transparent 1px 4px
              );
            box-shadow: inset 0 0 0 1px rgba(135, 255, 145, 0.08);
          `}
        >
          {() => formatClock(positionSec())}
        </span>
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
            height: 18px;
            appearance: none;
            background: transparent;
            cursor: pointer;

            &::-webkit-slider-runnable-track {
              height: 6px;
              border: 1px solid #06070a;
              border-radius: 999px;
              background: linear-gradient(180deg, #777f8c, #2d3037);
              box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.45);
            }

            &::-webkit-slider-thumb {
              appearance: none;
              width: 22px;
              height: 22px;
              margin-top: -9px;
              border: 1px solid #201206;
              border-radius: 999px;
              background: linear-gradient(180deg, #ffc770, #ea9833 58%, #a9611a 100%);
              box-shadow:
                inset 0 1px 0 rgba(255, 255, 255, 0.36),
                0 0 12px rgba(243, 163, 63, 0.28);
            }

            &::-moz-range-track {
              height: 6px;
              border: 1px solid #06070a;
              border-radius: 999px;
              background: linear-gradient(180deg, #777f8c, #2d3037);
              box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.45);
            }

            &::-moz-range-thumb {
              width: 22px;
              height: 22px;
              border: 1px solid #201206;
              border-radius: 999px;
              background: linear-gradient(180deg, #ffc770, #ea9833 58%, #a9611a 100%);
              box-shadow:
                inset 0 1px 0 rgba(255, 255, 255, 0.36),
                0 0 12px rgba(243, 163, 63, 0.28);
            }
          `}
        />
        <span
          css={`
            min-width: 48px;
            padding: 5px 7px;
            text-align: right;
            border: 1px solid #071109;
            border-radius: 6px;
            background:
              linear-gradient(180deg, rgba(13, 38, 18, 0.98), rgba(7, 18, 10, 0.98)),
              repeating-linear-gradient(
                180deg,
                rgba(255, 255, 255, 0.03) 0 1px,
                transparent 1px 4px
              );
            box-shadow: inset 0 0 0 1px rgba(135, 255, 145, 0.08);
          `}
        >
          {() => formatClock(durationSec())}
        </span>
      </div>

      <div
        css={`
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        `}
      >
        <div
          css={`
            display: flex;
            align-items: center;
            gap: 6px;
          `}
        >
          <button type="button" css={transportBtn} on:click={() => prevTrack()}>
            |◀
          </button>
          <button type="button" css={() => (isPlaying() ? primaryTransportBtn + btnPressed : primaryTransportBtn)} on:click={() => togglePlay()}>
            {() => (isPlaying() ? '⏸' : '▶')}
          </button>
          <button type="button" css={transportBtn} on:click={() => stopPlayback()}>
            ■
          </button>
          <button type="button" css={transportBtn} on:click={() => nextTrack()}>
            ▶|
          </button>
        </div>
        <div
          css={`
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 6px;
            justify-content: center;
          `}
        >
          <button
            type="button"
            css={() => (shuffleEnabled() ? baseBtn + btnPressed : baseBtn)}
            on:click={() => toggleShuffle()}
            title="Shuffle"
          >
            SHUF
          </button>
          <button
            type="button"
            css={() => (repeatMode() === 'none' ? baseBtn : baseBtn + btnPressed)}
            on:click={() => cycleRepeat()}
            title="Repeat"
          >
            {() => {
              const mode = repeatMode()
              if (mode === 'one') {
                return 'REP1'
              }
              if (mode === 'all') {
                return 'REP*'
              }
              return 'REP'
            }}
          </button>
        </div>
        <button
          type="button"
          css={baseBtn}
          prop:disabled={() => !openFolder.ready()}
          on:click={() => openFolder()}
          title="Open folder"
        >
          LOAD
        </button>
      </div>
    </div>
  )
}
