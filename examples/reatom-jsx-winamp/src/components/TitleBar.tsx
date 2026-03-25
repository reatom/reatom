import { action, atom } from '@reatom/core'

import { isPlaying, playerTheme } from '../model'
import { PLAYER_THEME_IDS, PLAYER_THEME_LABELS, type PlayerThemeId } from '../themes'
import {
  closePlayerPage,
  fullscreenActive,
  pictureInPictureActive,
  pictureInPictureSupported,
  togglePlayerFullscreen,
  togglePlayerPictureInPicture,
} from '../windowControls'

const chromeButtonBase = `
  width: 18px;
  height: 16px;
  padding: 0;
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
    opacity: 0.45;
  }
`

const readmeUrl =
  'https://github.com/reatom/reatom/blob/v1001/examples/reatom-jsx-winamp/README.md'

const sourcesUrl =
  'https://github.com/reatom/reatom/tree/v1001/examples/reatom-jsx-winamp'

const titleBarMenuOpen = atom(false, 'titleBarMenuOpen')

const titleBarPlayerMenuId = 'winamp-title-player-menu'

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
          width: 10px;
          height: 8px;
        `}
      >
        <span
          css={`
            position: absolute;
            inset: 0;
            border: 1px solid currentColor;
          `}
        />
        <span
          css={`
            position: absolute;
            right: -1px;
            bottom: -1px;
            width: 4px;
            height: 3px;
            border: 1px solid currentColor;
            background: #f6f7fa;
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
          width: 9px;
          height: 9px;
        `}
      >
        <span
          css={`
            position: absolute;
            inset: 0;
            border: 1px solid currentColor;
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
        width: 8px;
        height: 8px;
      `}
    >
      <span
        css={`
          position: absolute;
          left: 0;
          right: 0;
          top: 3px;
          height: 1px;
          background: currentColor;
          transform: rotate(45deg);
        `}
      />
      <span
        css={`
          position: absolute;
          left: 0;
          right: 0;
          top: 3px;
          height: 1px;
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
        position: relative;
        z-index: 5;
        overflow: visible;
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: center;
        gap: 4px;
        padding: 3px;
        border: 1px solid var(--skin-border-dark);
        background: linear-gradient(
          180deg,
          var(--skin-title-highlight) 0%,
          var(--skin-chassis-top) 18%,
          var(--skin-chassis) 60%,
          var(--skin-title-deep) 100%
        );
        box-shadow:
          inset 1px 1px 0 var(--skin-border-light),
          inset -1px -1px 0 var(--skin-title-inset-dark);
        color: #f4f6ff;
      `}
    >
      <button
        type="button"
        aria-haspopup="menu"
        prop:aria-expanded={() => titleBarMenuOpen()}
        aria-controls={titleBarPlayerMenuId}
        aria-label="Open menu"
        on:click={() => toggleTitleBarMenu()}
        css={`
          width: 20px;
          height: 18px;
          padding: 0;
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
          cursor: pointer;
        `}
      >
        <span
          css={`
            display: flex;
            align-items: center;
            gap: 1px;
          `}
        >
          {[1, 2, 3].map((row) => (
            <span
              css={`
                display: grid;
                gap: 1px;
              `}
            >
              {[1, 2].map((column) => (
                <span
                  css={`
                    width: 2px;
                    height: 2px;
                    background: ${
                      row === column ? 'var(--skin-display-text)' : 'var(--skin-button-text)'
                    };
                  `}
                />
              ))}
            </span>
          ))}
        </span>
      </button>
      <div
        css={`
          min-width: 0;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 0 6px;
          border: 1px solid rgba(0, 0, 0, 0.55);
          background: linear-gradient(
            180deg,
            rgba(44, 49, 91, 0.95) 0%,
            rgba(28, 31, 64, 0.95) 100%
          );
          box-shadow:
            inset 1px 1px 0 rgba(255, 255, 255, 0.22),
            inset -1px -1px 0 rgba(0, 0, 0, 0.28);
          font-family: var(--pixel-font);
          font-size: 10px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        `}
      >
        <span
          css={`
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          `}
        >
          Winamp
        </span>
        <span
          css={() => `
            color: ${isPlaying() ? 'var(--skin-display-warn)' : '#c6cce2'};
          `}
        >
          {() => (isPlaying() ? 'Play' : 'Stop')}
        </span>
      </div>
      <div
        css={`
          display: flex;
          gap: 2px;
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
            ${chromeButtonBase}
            color: ${pictureInPictureActive() ? 'var(--skin-display-text)' : 'var(--skin-button-text)'};
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
            ${chromeButtonBase}
            color: ${fullscreenActive() ? 'var(--skin-accent)' : 'var(--skin-button-text)'};
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
            ${chromeButtonBase}
            color: var(--skin-danger);
          `}
        >
          <WindowControlIcon kind="close" />
        </button>
      </div>
      <div
        role="presentation"
        aria-hidden="true"
        on:click={() => closeTitleBarMenu()}
        css={() => `
          display: ${titleBarMenuOpen() ? 'block' : 'none'};
          pointer-events: ${titleBarMenuOpen() ? 'auto' : 'none'};
          position: fixed;
          inset: 0;
          z-index: 200;
        `}
      />
      <div
        id={titleBarPlayerMenuId}
        aria-label="Player menu"
        css={() => `
          display: ${titleBarMenuOpen() ? 'block' : 'none'};
          pointer-events: ${titleBarMenuOpen() ? 'auto' : 'none'};
          position: absolute;
          left: 0;
          top: calc(100% + 2px);
          z-index: 201;
          min-width: 146px;
          padding: 2px;
          border: 1px solid var(--skin-border-dark);
          background: #c4c8d6;
          box-shadow:
            inset 1px 1px 0 #ffffff,
            inset -1px -1px 0 #6d748e,
            2px 2px 0 rgba(0, 0, 0, 0.45);
          color: #15192f;
          font-family: Tahoma, 'Segoe UI', sans-serif;
          font-size: 11px;
        `}
      >
        <div
          css={`
            padding: 4px 8px 6px;
            color: #4b5472;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.06em;
            text-transform: uppercase;
          `}
        >
          Menu
        </div>
        <div
          css={`
            padding: 4px 8px 2px;
            color: #4b5472;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.06em;
            text-transform: uppercase;
          `}
        >
          Theme
        </div>
        {PLAYER_THEME_IDS.map((id: PlayerThemeId) => (
          <button
            type="button"
            on:click={() => {
              playerTheme.set(id)
              closeTitleBarMenu()
            }}
            css={() => `
              width: 100%;
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 8px;
              padding: 5px 10px;
              border: none;
              background: transparent;
              color: inherit;
              cursor: pointer;
              text-align: left;
              font: inherit;

              &:hover {
                background: #213f9a;
                color: #ffffff;
              }
            `}
          >
            {PLAYER_THEME_LABELS[id]}
            <span
              css={`
                min-width: 1em;
                text-align: right;
                font-size: 10px;
              `}
            >
              {() => (playerTheme() === id ? '✓' : '')}
            </span>
          </button>
        ))}
        <div
          css={`
            margin: 4px 6px;
            border-top: 1px solid #9aa0b0;
          `}
        />
        <a
          href={readmeUrl}
          target="_blank"
          rel="noopener noreferrer"
          on:click={() => closeTitleBarMenu()}
          css={`
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            padding: 5px 10px;
            color: inherit;
            text-decoration: none;

            &:hover {
              background: #213f9a;
              color: #ffffff;
            }
          `}
        >
          Readme
          <span
            css={`
              color: inherit;
              opacity: 0.7;
              font-size: 10px;
            `}
          >
            Doc
          </span>
        </a>
        <a
          href={sourcesUrl}
          target="_blank"
          rel="noopener noreferrer"
          on:click={() => closeTitleBarMenu()}
          css={`
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            padding: 5px 10px;
            color: inherit;
            text-decoration: none;

            &:hover {
              background: #213f9a;
              color: #ffffff;
            }
          `}
        >
          Sources
          <span
            css={`
              color: inherit;
              opacity: 0.7;
              font-size: 10px;
            `}
          >
            Git
          </span>
        </a>
      </div>
    </div>
  )
}
