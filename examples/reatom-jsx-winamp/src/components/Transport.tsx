import {
  currentSlot,
  cycleRepeat,
  durationSec,
  folderLabel,
  formatClock,
  isPlaying,
  nextTrack,
  nowPlayingContext,
  nowPlayingFileName,
  openFolder,
  positionSec,
  prevTrack,
  repeatMode,
  seekToRatio,
  shuffleEnabled,
  stopPlayback,
  trackCount,
  togglePlay,
  toggleShuffle,
} from '../model'

const lcdBars = [32, 50, 26, 58, 38, 66, 44, 54]

const chromeButton = `
  min-width: 0;
  height: 26px;
  padding: 0 6px;
  display: grid;
  place-items: center;
  border: 1px solid var(--skin-border-dark);
  background: linear-gradient(
    180deg,
    var(--skin-button-top) 0%,
    var(--skin-button-face) 55%,
    var(--skin-button-bottom) 100%
  );
  box-shadow:
    inset 1px 1px 0 #ffffff,
    inset -1px -1px 0 var(--skin-button-shadow-mid);
  color: var(--skin-button-text);
  cursor: pointer;

  &:hover:not(:disabled) {
    filter: brightness(1.03);
  }

  &:active:not(:disabled) {
    box-shadow:
      inset 1px 1px 0 var(--skin-button-shadow-mid),
      inset -1px -1px 0 #ffffff;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`

const iconButton = `
  ${chromeButton}
  padding: 0;
  min-width: 30px;
`

const primaryIconButton = `
  ${iconButton}
  min-width: 38px;
  color: #2a220c;
  background: linear-gradient(180deg, #ffe08a 0%, #dcb25a 100%);
  box-shadow:
    inset 1px 1px 0 #fff6cb,
    inset -1px -1px 0 #87672e;
`

const activeIconButton = `
  box-shadow:
    inset 1px 1px 0 #87672e,
    inset -1px -1px 0 #fff6cb;
`

const lcdPanel = `
  border: 1px solid #000000;
  background:
    linear-gradient(180deg, rgba(42, 94, 50, 0.22), transparent 28%),
    linear-gradient(180deg, var(--skin-display-bg), var(--skin-display-dark));
  box-shadow:
    inset 1px 1px 0 rgba(133, 190, 133, 0.22),
    inset -1px -1px 0 #010401;
  color: var(--skin-display-text);
  font-family: var(--pixel-font);
`

type TransportIconKind = 'previous' | 'play' | 'pause' | 'stop' | 'next'

const TransportIcon = ({
  kind,
  size = 'normal',
}: {
  kind: TransportIconKind
  size?: 'normal' | 'large'
}) => {
  const barWidth = size === 'large' ? 3 : 2
  const barHeight = size === 'large' ? 11 : 9
  const triangleHeight = size === 'large' ? 6 : 5
  const triangleWidth = size === 'large' ? 8 : 7

  if (kind === 'play') {
    return (
      <span
        css={`
          width: 0;
          height: 0;
          border-top: ${triangleHeight}px solid transparent;
          border-bottom: ${triangleHeight}px solid transparent;
          border-left: ${triangleWidth}px solid currentColor;
        `}
      />
    )
  }

  if (kind === 'pause') {
    return (
      <span
        css={`
          display: flex;
          gap: 3px;
        `}
      >
        <span
          css={`
            width: ${barWidth}px;
            height: ${barHeight}px;
            background: currentColor;
          `}
        />
        <span
          css={`
            width: ${barWidth}px;
            height: ${barHeight}px;
            background: currentColor;
          `}
        />
      </span>
    )
  }

  if (kind === 'stop') {
    return (
      <span
        css={`
          width: ${size === 'large' ? 10 : 8}px;
          height: ${size === 'large' ? 10 : 8}px;
          background: currentColor;
        `}
      />
    )
  }

  if (kind === 'previous') {
    return (
      <span
        css={`
          display: flex;
          align-items: center;
          gap: 3px;
        `}
      >
        <span
          css={`
            width: ${barWidth}px;
            height: ${barHeight}px;
            background: currentColor;
          `}
        />
        <span
          css={`
            width: 0;
            height: 0;
            border-top: ${triangleHeight}px solid transparent;
            border-bottom: ${triangleHeight}px solid transparent;
            border-right: ${triangleWidth}px solid currentColor;
          `}
        />
      </span>
    )
  }

  return (
    <span
      css={`
        display: flex;
        align-items: center;
        gap: 3px;
      `}
    >
      <span
        css={`
          width: 0;
          height: 0;
          border-top: ${triangleHeight}px solid transparent;
          border-bottom: ${triangleHeight}px solid transparent;
          border-left: ${triangleWidth}px solid currentColor;
        `}
      />
      <span
        css={`
          width: ${barWidth}px;
          height: ${barHeight}px;
          background: currentColor;
        `}
      />
    </span>
  )
}

function repeatLabel() {
  const mode = repeatMode()
  if (mode === 'one') {
    return 'REP1'
  }
  if (mode === 'all') {
    return 'REP*'
  }
  return 'REP'
}

export const Transport = () => {
  return (
    <section
      css={`
        display: grid;
        gap: 6px;
        padding: 6px;
        border: 1px solid var(--skin-border-dark);
        background: linear-gradient(
          180deg,
          rgba(95, 100, 148, 0.98) 0%,
          var(--skin-panel) 26%,
          var(--skin-panel-dark) 100%
        );
        box-shadow:
          inset 1px 1px 0 var(--skin-border-light),
          inset -1px -1px 0 var(--skin-panel-inset-dark);
      `}
    >
      <div
        css={`
          display: grid;
          grid-template-columns: 84px minmax(0, 1fr);
          gap: 6px;
          align-items: stretch;
        `}
      >
        <div
          css={`
            ${lcdPanel}
            padding: 4px 5px;
            display: grid;
            gap: 4px;
            min-height: 60px;
          `}
        >
          <div
            css={`
              display: flex;
              justify-content: space-between;
              gap: 6px;
              color: var(--skin-display-dim);
              font-size: 7px;
              letter-spacing: 0.08em;
              text-transform: uppercase;
            `}
          >
            <span>{() => (isPlaying() ? 'play' : trackCount() > 0 ? 'stop' : 'idle')}</span>
            <span>{() => (shuffleEnabled() ? 'rnd' : 'line')}</span>
          </div>
          <div
            css={`
              display: flex;
              align-items: center;
              justify-content: center;
              min-width: 0;
              overflow: hidden;
              white-space: nowrap;
              font-size: 21px;
              line-height: 1;
              letter-spacing: 0.03em;
            `}
          >
            {() => formatClock(positionSec())}
          </div>
          <div
            css={`
              display: flex;
              align-items: flex-end;
              gap: 2px;
              height: 12px;
            `}
          >
            {lcdBars.map((baseHeight, index) => (
              <span
                css={() => `
                  flex: 1;
                  min-width: 3px;
                  height: ${baseHeight}%;
                  background: linear-gradient(
                    180deg,
                    var(--skin-display-warn) 0%,
                    var(--skin-display-text) 100%
                  );
                  opacity: ${isPlaying() ? 0.92 : 0.28};
                  transform-origin: bottom;
                  transform: scaleY(${isPlaying() ? 0.48 + index * 0.03 : 0.18});
                  animation: winamp-meter ${520 + index * 40}ms steps(4, end) infinite alternate;
                  animation-play-state: ${isPlaying() ? 'running' : 'paused'};
                `}
              />
            ))}
          </div>
        </div>
        <div
          css={`
            display: grid;
            gap: 4px;
            min-width: 0;
          `}
        >
          <div
            css={`
              ${lcdPanel}
              padding: 4px 6px;
              display: grid;
              gap: 4px;
              min-height: 40px;
            `}
          >
            <div
              css={`
                display: flex;
                justify-content: space-between;
                gap: 6px;
                color: var(--skin-display-dim);
                font-size: 7px;
                letter-spacing: 0.08em;
                text-transform: uppercase;
              `}
            >
              <span>
                {() => {
                  const totalTracks = trackCount()
                  const activeTrack = currentSlot()
                  if (activeTrack < 0 || totalTracks === 0) {
                    return 'trk --/--'
                  }
                  return `trk ${String(activeTrack + 1).padStart(2, '0')}/${String(totalTracks).padStart(2, '0')}`
                }}
              </span>
              <span>{() => formatClock(durationSec())}</span>
            </div>
            <div
              css={`
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                color: var(--skin-display-warn);
                font-size: 10px;
              `}
            >
              {nowPlayingFileName}
            </div>
            <div
              css={`
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                color: var(--skin-display-dim);
                font-size: 7px;
                letter-spacing: 0.06em;
                text-transform: uppercase;
              `}
              title={nowPlayingContext()}
            >
              {() => {
                const folderName = folderLabel()
                if (folderName) {
                  return `folder ${folderName}`
                }
                return nowPlayingContext()
              }}
            </div>
          </div>
          <div
            css={`
              ${lcdPanel}
              padding: 3px 6px;
              display: flex;
              justify-content: space-between;
              gap: 6px;
              color: var(--skin-display-dim);
              font-size: 7px;
              letter-spacing: 0.08em;
              text-transform: uppercase;
            `}
          >
            <span>{() => (isPlaying() ? 'state play' : trackCount() > 0 ? 'state stop' : 'state idle')}</span>
            <span>{() => (shuffleEnabled() ? 'shuf on' : 'shuf off')}</span>
            <span>{() => repeatLabel().toLowerCase()}</span>
          </div>
        </div>
      </div>

      <div
        css={`
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 4px;
        `}
      >
        <button
          type="button"
          css={iconButton}
          on:click={() => prevTrack()}
          title="Previous track"
          aria-label="Previous track"
          prop:disabled={() => trackCount() === 0}
        >
          <TransportIcon kind="previous" />
        </button>
        <button
          type="button"
          css={() => (isPlaying() ? primaryIconButton + activeIconButton : primaryIconButton)}
          on:click={() => togglePlay()}
          title={isPlaying() ? 'Pause' : 'Play'}
          aria-label={isPlaying() ? 'Pause' : 'Play'}
          prop:disabled={() => trackCount() === 0}
        >
          {() => (
            <TransportIcon kind={isPlaying() ? 'pause' : 'play'} size="large" />
          )}
        </button>
        <button
          type="button"
          css={iconButton}
          on:click={() => stopPlayback()}
          title="Stop"
          aria-label="Stop"
          prop:disabled={() => trackCount() === 0}
        >
          <TransportIcon kind="stop" />
        </button>
        <button
          type="button"
          css={iconButton}
          on:click={() => nextTrack()}
          title="Next track"
          aria-label="Next track"
          prop:disabled={() => trackCount() === 0}
        >
          <TransportIcon kind="next" />
        </button>
      </div>

      <div
        css={`
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 4px;
          align-items: center;
        `}
      >
        <span
          aria-hidden="true"
          css={`
            ${lcdPanel}
            min-width: 44px;
            padding: 3px 4px;
            text-align: center;
            font-size: 9px;
          `}
        >
          {() => formatClock(positionSec())}
        </span>
        <input
          type="range"
          min={0}
          max={1000}
          aria-label="Playback position"
          prop:aria-valuetext={() => {
            const duration = durationSec()
            const position = positionSec()
            return `${formatClock(position)} / ${formatClock(duration)}`
          }}
          prop:value={() => {
            const duration = durationSec()
            const position = positionSec()
            if (!Number.isFinite(duration) || duration <= 0) {
              return 0
            }
            return Math.round((position / duration) * 1000)
          }}
          on:input={(event) => {
            const ratio = Number(event.currentTarget.value) / 1000
            seekToRatio(ratio)
          }}
          css={`
            width: 100%;
            height: 18px;
            appearance: none;
            background: transparent;
            cursor: pointer;

            &::-webkit-slider-runnable-track {
              height: 6px;
              border: 1px solid #09110b;
              background: linear-gradient(180deg, #517f59 0%, #1b2f1f 100%);
            }

            &::-webkit-slider-thumb {
              appearance: none;
              width: 11px;
              height: 14px;
              margin-top: -5px;
              border: 1px solid var(--skin-border-dark);
              background: linear-gradient(
                180deg,
                var(--skin-button-top) 0%,
                var(--skin-button-face) 55%,
                var(--skin-button-bottom) 100%
              );
              box-shadow:
                inset 1px 1px 0 #ffffff,
                inset -1px -1px 0 var(--skin-button-shadow-mid);
            }

            &::-moz-range-track {
              height: 6px;
              border: 1px solid #09110b;
              background: linear-gradient(180deg, #517f59 0%, #1b2f1f 100%);
            }

            &::-moz-range-thumb {
              width: 11px;
              height: 14px;
              border: 1px solid var(--skin-border-dark);
              background: linear-gradient(
                180deg,
                var(--skin-button-top) 0%,
                var(--skin-button-face) 55%,
                var(--skin-button-bottom) 100%
              );
              box-shadow:
                inset 1px 1px 0 #ffffff,
                inset -1px -1px 0 var(--skin-button-shadow-mid);
            }
          `}
        />
        <span
          aria-hidden="true"
          css={`
            ${lcdPanel}
            min-width: 44px;
            padding: 3px 4px;
            text-align: center;
            font-size: 9px;
          `}
        >
          {() => formatClock(durationSec())}
        </span>
      </div>

      <div
        css={`
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 4px;
        `}
      >
        <button
          type="button"
          css={chromeButton}
          on:click={() => toggleShuffle()}
          title="Shuffle"
          aria-label="Shuffle"
          prop:aria-pressed={() => shuffleEnabled()}
          prop:disabled={() => trackCount() < 2}
        >
          SHUF
        </button>
        <button
          type="button"
          css={chromeButton}
          on:click={() => cycleRepeat()}
          title="Repeat"
          aria-label="Repeat"
          prop:aria-pressed={() => repeatMode() !== 'none'}
          prop:disabled={() => trackCount() === 0}
        >
          {() => repeatLabel()}
        </button>
        <button
          type="button"
          css={chromeButton}
          prop:disabled={() => !openFolder.ready()}
          on:click={() => openFolder()}
          title="Open folder"
          aria-label="Open music folder"
        >
          LOAD
        </button>
      </div>
    </section>
  )
}
