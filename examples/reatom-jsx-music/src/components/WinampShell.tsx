import {
  currentSlot,
  folderLabel,
  isPlaying,
  nowPlayingTitle,
  playOrder,
  repeatMode,
  shuffleEnabled,
} from '../model'
import { AudioHost } from './AudioHost'
import { Playlist } from './Playlist'
import { TitleBar } from './TitleBar'
import { Transport } from './Transport'
import { Visualizer } from './Visualizer'
import { VolumeSlider } from './VolumeSlider'

export const WinampShell = () => {
  return (
    <>
      <AudioHost />
      <main
        css={`
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: clamp(24px, 4vw, 48px) 16px;
        `}
      >
        <div
          css={`
            width: 100%;
            max-width: 528px;
            display: flex;
            flex-direction: column;
            border-radius: var(--winamp-radius);
            overflow: hidden;
            background:
              linear-gradient(180deg, rgba(73, 79, 91, 0.98) 0%, rgba(25, 28, 35, 0.98) 16%, rgba(14, 16, 21, 1) 100%);
            box-shadow:
              0 22px 60px rgba(0, 0, 0, 0.58),
              0 8px 18px rgba(0, 0, 0, 0.38),
              inset 0 0 0 1px var(--winamp-frame-inner),
              inset 0 1px 0 rgba(255, 255, 255, 0.1);
            border: 1px solid var(--winamp-frame);
            backdrop-filter: blur(10px);
          `}
        >
          <TitleBar />

          <div
            css={`
              display: grid;
              grid-template-columns: minmax(0, 1fr) 104px;
              gap: 10px;
              padding: 12px 10px;
              background: linear-gradient(
                180deg,
                rgba(47, 52, 62, 0.98) 0%,
                rgba(24, 27, 33, 0.98) 100%
              );
              border-left: 1px solid var(--winamp-frame);
              border-right: 1px solid var(--winamp-frame);
              border-top: 1px solid rgba(255, 255, 255, 0.07);
              border-bottom: 1px solid rgba(0, 0, 0, 0.55);
            `}
          >
            <div
              css={`
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 8px;
                min-width: 0;
              `}
            >
              <div
                css={`
                  padding: 0 2px;
                  font-size: 10px;
                  color: var(--winamp-muted);
                  text-transform: uppercase;
                  letter-spacing: 0.12em;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  white-space: nowrap;
                `}
              >
                {() => {
                  const name = folderLabel()
                  return name
                    ? `Folder: ${name}`
                    : 'No folder loaded — press OPEN'
                }}
              </div>
              <div
                css={`
                  position: relative;
                  display: grid;
                  gap: 8px;
                  padding: 12px 13px 13px;
                  min-height: 110px;
                  overflow: hidden;
                  border: 1px solid #071109;
                  border-radius: 10px;
                  background:
                    radial-gradient(circle at top right, rgba(87, 255, 107, 0.1), transparent 26%),
                    linear-gradient(180deg, rgba(14, 44, 19, 0.98), rgba(6, 20, 10, 0.98)),
                    repeating-linear-gradient(
                      180deg,
                      rgba(255, 255, 255, 0.03) 0 1px,
                      transparent 1px 4px
                    );
                  box-shadow:
                    inset 0 0 0 1px rgba(135, 255, 145, 0.08),
                    inset 0 0 28px rgba(44, 255, 93, 0.1),
                    0 0 0 1px rgba(255, 255, 255, 0.03);
                `}
              >
                <div
                  css={`
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(
                      110deg,
                      transparent 0%,
                      rgba(255, 255, 255, 0.08) 46%,
                      transparent 54%
                    );
                    animation: winamp-sheen 3.4s linear infinite;
                    opacity: 0.3;
                    pointer-events: none;
                  `}
                />
                <span
                  css={`
                    position: relative;
                    font-size: 10px;
                    color: rgba(191, 255, 198, 0.72);
                    text-transform: uppercase;
                    letter-spacing: 0.14em;
                  `}
                >
                  Now playing
                </span>
                <div
                  css={`
                    position: relative;
                    font-family: ui-monospace, 'Courier New', monospace;
                    font-size: 14px;
                    color: var(--winamp-text);
                    line-height: 1.35;
                    word-break: break-word;
                    text-shadow: 0 0 14px rgba(87, 255, 107, 0.24);
                  `}
                >
                  {nowPlayingTitle}
                </div>
                <div
                  css={`
                    position: relative;
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 6px;
                  `}
                >
                  {() => {
                    const totalTracks = playOrder().length
                    const activeTrack = currentSlot()
                    const trackLabel =
                      activeTrack >= 0 && totalTracks > 0
                        ? `${String(activeTrack + 1).padStart(2, '0')}/${String(totalTracks).padStart(2, '0')}`
                        : '--/--'
                    const playbackLabel = isPlaying()
                      ? 'Play'
                      : activeTrack >= 0
                        ? 'Pause'
                        : 'Stop'
                    const repeatLabel = (() => {
                      const mode = repeatMode()
                      if (mode === 'all') {
                        return 'All'
                      }
                      if (mode === 'one') {
                        return 'One'
                      }
                      return 'Off'
                    })()
                    const items = [
                      ['Track', trackLabel],
                      ['State', playbackLabel],
                      ['Shuffle', shuffleEnabled() ? 'On' : 'Off'],
                      ['Repeat', repeatLabel],
                    ] as const

                    return items.map(([label, value]) => (
                      <div
                        css={`
                          min-width: 0;
                          padding: 6px 7px;
                          border: 1px solid rgba(7, 17, 9, 0.9);
                          border-radius: 7px;
                          background: rgba(0, 0, 0, 0.18);
                          box-shadow: inset 0 0 0 1px rgba(135, 255, 145, 0.05);
                        `}
                      >
                        <div
                          css={`
                            color: rgba(191, 255, 198, 0.6);
                            font-size: 9px;
                            text-transform: uppercase;
                            letter-spacing: 0.1em;
                          `}
                        >
                          {label}
                        </div>
                        <div
                          css={`
                            margin-top: 3px;
                            color: var(--winamp-text);
                            font-family: ui-monospace, 'Courier New', monospace;
                            font-size: 11px;
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                          `}
                        >
                          {value}
                        </div>
                      </div>
                    ))
                  }}
                </div>
              </div>
            </div>
            <div
              css={`
                display: flex;
                flex-direction: column;
                gap: 8px;
              `}
            >
              <Visualizer />
              <VolumeSlider />
            </div>
          </div>

          <Transport />
          <Playlist />
        </div>
      </main>
    </>
  )
}
