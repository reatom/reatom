import { folderLabel, nowPlayingTitle } from '../model'
import { AudioHost } from './AudioHost'
import { Playlist } from './Playlist'
import { TitleBar } from './TitleBar'
import { Transport } from './Transport'
import { VolumeSlider } from './VolumeSlider'

export const WinampShell = () => {
  return (
    <>
      <AudioHost />
      <main
        css={`
          min-height: 100dvh;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 16px 12px;
          background: radial-gradient(ellipse at top, #2a2a2a 0%, #0a0a0a 70%);
        `}
      >
        <div
          css={`
            width: 100%;
            max-width: 420px;
            display: flex;
            flex-direction: column;
            box-shadow:
              4px 4px 0 #000,
              inset 0 0 0 1px var(--winamp-bevel-light);
            border: 2px solid #000;
          `}
        >
          <TitleBar />

          <div
            css={`
              display: flex;
              background: var(--winamp-bg);
              border: 1px solid #000;
              border-top: 1px solid #404040;
            `}
          >
            <div
              css={`
                flex: 1;
                padding: 8px 10px;
                display: flex;
                flex-direction: column;
                gap: 6px;
                min-width: 0;
              `}
            >
              <div
                css={`
                  font-size: 10px;
                  color: #888;
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
                  font-family: ui-monospace, 'Courier New', monospace;
                  font-size: 11px;
                  color: var(--winamp-text);
                  background: #0c1a0c;
                  border: 2px inset #1a3320;
                  padding: 6px 8px;
                  min-height: 36px;
                  overflow: hidden;
                `}
              >
                <div
                  css={`
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    text-shadow: 0 0 6px rgba(56, 242, 56, 0.25);
                  `}
                >
                  {nowPlayingTitle}
                </div>
              </div>
            </div>
            <VolumeSlider />
          </div>

          <Transport />
          <Playlist />
        </div>
      </main>
    </>
  )
}
