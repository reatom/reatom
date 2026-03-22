import { action, atom } from '@reatom/core'

import { isPlaying } from '../model'
import {
  closePlayerPage,
  fullscreenActive,
  pictureInPictureActive,
  pictureInPictureSupported,
  togglePlayerFullscreen,
  togglePlayerPictureInPicture,
} from '../windowControls'

const windowButtonBase = `
  width: 34px;
  height: 30px;
  padding: 0;
  display: grid;
  place-items: center;
  border: 1px solid #000;
  border-radius: 8px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.34),
    inset 0 -1px 0 rgba(0, 0, 0, 0.34);
  transition:
    transform 120ms ease,
    filter 120ms ease,
    opacity 120ms ease;
  cursor: pointer;

  &:hover:not(:disabled) {
    filter: brightness(1.05);
  }

  &:active:not(:disabled) {
    transform: translateY(1px);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.42;
  }
`

const readmeUrl =
  'https://github.com/reatom/reatom/blob/v1001/examples/reatom-jsx-winamp/README.md'

const sourcesUrl =
  'https://github.com/reatom/reatom/tree/v1001/examples/reatom-jsx-winamp'

const titleBarMenuOpen = atom(false, 'titleBarMenuOpen')

const toggleTitleBarMenu = action(() => {
  titleBarMenuOpen.set(!titleBarMenuOpen())
}, 'toggleTitleBarMenu')

const closeTitleBarMenu = action(() => {
  titleBarMenuOpen.set(false)
}, 'closeTitleBarMenu')

type WindowControlKind = 'pictureInPicture' | 'fullscreen' | 'close'

const WindowControlIcon = ({ kind }: { kind: WindowControlKind }) => {
  if (kind === 'pictureInPicture') {
    return (
      <span
        css={`
          position: relative;
          display: block;
          width: 16px;
          height: 12px;
        `}
      >
        <span
          css={`
            position: absolute;
            inset: 0;
            border: 2px solid currentColor;
            border-radius: 2px;
          `}
        />
        <span
          css={`
            position: absolute;
            right: -1px;
            bottom: -1px;
            width: 6px;
            height: 4px;
            border: 2px solid currentColor;
            border-radius: 2px;
            background: rgba(255, 255, 255, 0.12);
          `}
        />
      </span>
    )
  }

  if (kind === 'fullscreen') {
    return (
      <span
        css={`
          position: relative;
          display: block;
          width: 14px;
          height: 14px;
        `}
      >
        <span
          css={`
            position: absolute;
            inset: 0;
            border: 2px solid currentColor;
            border-radius: 2px;
          `}
        />
      </span>
    )
  }

  return (
    <span
      css={`
        position: relative;
        display: block;
        width: 14px;
        height: 14px;
      `}
    >
      <span
        css={`
          position: absolute;
          left: 0;
          right: 0;
          top: 6px;
          height: 2px;
          border-radius: 999px;
          background: currentColor;
          transform: rotate(45deg);
        `}
      />
      <span
        css={`
          position: absolute;
          left: 0;
          right: 0;
          top: 6px;
          height: 2px;
          border-radius: 999px;
          background: currentColor;
          transform: rotate(-45deg);
        `}
      />
    </span>
  )
}

export const TitleBar = () => {
  return (
    <div
      css={`
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 6px 8px 7px 6px;
        background: linear-gradient(
          180deg,
          var(--winamp-title-start) 0%,
          #355686 28%,
          var(--winamp-title) 58%,
          var(--winamp-title-end) 100%
        );
        border: 1px solid var(--winamp-frame);
        border-bottom: none;
        border-top-left-radius: var(--winamp-radius);
        border-top-right-radius: var(--winamp-radius);
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.24),
          inset 0 -1px 0 rgba(0, 0, 0, 0.35);
        color: #e0e8ff;
        font-weight: bold;
        letter-spacing: 0.04em;
        text-shadow: 1px 1px 0 #000;
      `}
    >
      <div
        css={`
          flex: 1;
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 8px;
          position: relative;
        `}
      >
        <button
          type="button"
          aria-haspopup="menu"
          prop:aria-expanded={() => titleBarMenuOpen()}
          aria-label="Open menu"
          on:click={() => toggleTitleBarMenu()}
          css={`
            flex: 1;
            min-width: 0;
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 0;
            padding: 0;
            border: none;
            background: transparent;
            color: inherit;
            font: inherit;
            font-weight: bold;
            letter-spacing: 0.04em;
            text-shadow: 1px 1px 0 #000;
            text-align: left;
            cursor: pointer;
            border-radius: 4px;

            &:focus-visible {
              outline: 2px solid rgba(255, 255, 255, 0.65);
              outline-offset: 2px;
            }
          `}
        >
          <div
            css={`
              flex-shrink: 0;
              width: 18px;
              height: 18px;
              padding: 2px;
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 1px;
              border: 1px solid rgba(0, 0, 0, 0.8);
              border-radius: 4px;
              background: linear-gradient(
                180deg,
                rgba(8, 18, 34, 0.85),
                rgba(9, 14, 25, 0.95)
              );
              box-shadow:
                inset 0 1px 0 rgba(255, 255, 255, 0.12),
                0 0 0 1px rgba(255, 255, 255, 0.05);
            `}
          >
            <span
              css={`
                background: #57ff6b;
                opacity: 0.95;
              `}
            />
            <span
              css={`
                background: #57ff6b;
                opacity: 0.55;
              `}
            />
            <span
              css={`
                background: #57ff6b;
                opacity: 0.8;
              `}
            />
            <span
              css={`
                background: #57ff6b;
                opacity: 0.42;
              `}
            />
            <span
              css={`
                background: #57ff6b;
                opacity: 0.92;
              `}
            />
            <span
              css={`
                background: #57ff6b;
                opacity: 0.62;
              `}
            />
            <span
              css={`
                background: #57ff6b;
                opacity: 0.78;
              `}
            />
            <span
              css={`
                background: #57ff6b;
                opacity: 0.48;
              `}
            />
            <span
              css={`
                background: #57ff6b;
                opacity: 0.88;
              `}
            />
          </div>
          <span
            css={`
              flex: 1;
              min-width: 0;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            `}
          >
            Reatom Folder Player
          </span>
        </button>
        {() =>
          titleBarMenuOpen() ? (
            <>
              <div
                role="presentation"
                aria-hidden="true"
                on:click={() => closeTitleBarMenu()}
                css={`
                  position: fixed;
                  inset: 0;
                  z-index: 200;
                `}
              />
              <div
                role="menu"
                aria-label="Player menu"
                css={`
                  position: absolute;
                  left: 0;
                  top: 100%;
                  margin-top: 4px;
                  z-index: 201;
                  min-width: 152px;
                  padding: 3px 0;
                  background: linear-gradient(180deg, #d9d9d9, #c6c6c6);
                  border: 1px solid #0a0a0a;
                  border-radius: 0;
                  box-shadow:
                    inset 1px 1px 0 #fff,
                    inset -1px -1px 0 #6a6a6a,
                    2px 2px 6px rgba(0, 0, 0, 0.45);
                  color: #000;
                  font-size: 11px;
                  font-weight: 600;
                  letter-spacing: 0.02em;
                  text-shadow: none;
                `}
              >
                <a
                  role="menuitem"
                  href={readmeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  on:click={() => closeTitleBarMenu()}
                  css={`
                    display: block;
                    padding: 5px 18px 5px 22px;
                    color: inherit;
                    text-decoration: none;

                    &:hover {
                      background: #0a246a;
                      color: #fff;
                    }
                  `}
                >
                  About
                </a>
                <a
                  role="menuitem"
                  href={sourcesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  on:click={() => closeTitleBarMenu()}
                  css={`
                    display: block;
                    padding: 5px 18px 5px 22px;
                    color: inherit;
                    text-decoration: none;

                    &:hover {
                      background: #0a246a;
                      color: #fff;
                    }
                  `}
                >
                  Sources
                </a>
              </div>
            </>
          ) : null
        }
        <span
          css={() => `
            padding: 2px 6px;
            border: 1px solid rgba(0, 0, 0, 0.6);
            border-radius: 999px;
            color: ${isPlaying() ? '#ffe9a6' : 'rgba(224, 232, 255, 0.74)'};
            background: ${
              isPlaying()
                ? 'linear-gradient(180deg, rgba(90, 66, 18, 0.94), rgba(47, 31, 6, 0.94))'
                : 'linear-gradient(180deg, rgba(26, 35, 57, 0.9), rgba(17, 23, 37, 0.95))'
            };
            font-size: 9px;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            animation: winamp-led-pulse 900ms ease-in-out infinite;
            animation-play-state: ${isPlaying() ? 'running' : 'paused'};
          `}
        >
          {() => (isPlaying() ? 'Live' : 'Deck')}
        </span>
      </div>
      <div
        css={`
          display: flex;
          gap: 3px;
          align-items: center;
        `}
      >
        <button
          type="button"
          title="Picture in picture"
          aria-label="Picture in picture"
          prop:disabled={() => !pictureInPictureSupported()}
          on:click={() => void togglePlayerPictureInPicture()}
          css={`
            ${windowButtonBase}
            color: ${pictureInPictureActive() ? '#102f14' : '#10264b'};
            background: ${pictureInPictureActive()
              ? 'linear-gradient(180deg, #9ef0a6, #4f9f59)'
              : 'linear-gradient(180deg, #8eb3ea, #4c6f9f)'};
          `}
        >
          <WindowControlIcon kind="pictureInPicture" />
        </button>
        <button
          type="button"
          title="Toggle fullscreen"
          aria-label="Toggle fullscreen"
          on:click={() => void togglePlayerFullscreen()}
          css={`
            ${windowButtonBase}
            color: ${fullscreenActive() ? '#2f1c06' : '#10264b'};
            background: ${fullscreenActive()
              ? 'linear-gradient(180deg, #f5cb77, #b57931)'
              : 'linear-gradient(180deg, #8eb3ea, #4c6f9f)'};
          `}
        >
          <WindowControlIcon kind="fullscreen" />
        </button>
        <button
          type="button"
          title="Close page"
          aria-label="Close page"
          on:click={() => closePlayerPage()}
          css={`
            ${windowButtonBase}
            color: #fff3f3;
            background: linear-gradient(180deg, #dd6e6e, #8f2020);
          `}
        >
          <WindowControlIcon kind="close" />
        </button>
      </div>
    </div>
  )
}
