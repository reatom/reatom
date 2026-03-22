import { isPlaying, openFolder } from '../model'

const windowButtonBase = `
  width: 18px;
  height: 17px;
  display: grid;
  place-items: center;
  border: 1px solid #000;
  border-radius: 4px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.34),
    inset 0 -1px 0 rgba(0, 0, 0, 0.34);
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
`

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
        `}
      >
        <div
          css={`
            width: 18px;
            height: 18px;
            padding: 2px;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1px;
            border: 1px solid rgba(0, 0, 0, 0.8);
            border-radius: 4px;
            background: linear-gradient(180deg, rgba(8, 18, 34, 0.85), rgba(9, 14, 25, 0.95));
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.12),
              0 0 0 1px rgba(255, 255, 255, 0.05);
          `}
        >
          <span css={`background: #57ff6b; opacity: 0.95;`} />
          <span css={`background: #57ff6b; opacity: 0.55;`} />
          <span css={`background: #57ff6b; opacity: 0.8;`} />
          <span css={`background: #57ff6b; opacity: 0.42;`} />
          <span css={`background: #57ff6b; opacity: 0.92;`} />
          <span css={`background: #57ff6b; opacity: 0.62;`} />
          <span css={`background: #57ff6b; opacity: 0.78;`} />
          <span css={`background: #57ff6b; opacity: 0.48;`} />
          <span css={`background: #57ff6b; opacity: 0.88;`} />
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
        <span
          css={`
            ${windowButtonBase}
            color: #10264b;
            background: linear-gradient(180deg, #8eb3ea, #4c6f9f);
          `}
        >
          _
        </span>
        <span
          css={`
            ${windowButtonBase}
            color: #10264b;
            background: linear-gradient(180deg, #8eb3ea, #4c6f9f);
          `}
        >
          □
        </span>
        <span
          css={`
            ${windowButtonBase}
            color: #fff3f3;
            background: linear-gradient(180deg, #dd6e6e, #8f2020);
          `}
        >
          ×
        </span>
      </div>
      <button
        type="button"
        prop:disabled={() => !openFolder.ready()}
        on:click={() => openFolder()}
        css={`
          padding: 4px 13px;
          cursor: pointer;
          color: #10233f;
          font-weight: 700;
          letter-spacing: 0.06em;
          background: linear-gradient(180deg, #f7fbff, #bccbe4 58%, #96a8c4 100%);
          border: 1px solid #000;
          border-radius: 6px;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.86),
            inset 0 -1px 0 rgba(45, 62, 90, 0.38),
            0 1px 0 rgba(255, 255, 255, 0.08);
          transition:
            transform 120ms ease,
            filter 120ms ease,
            opacity 120ms ease;

          &:hover:not(:disabled) {
            filter: brightness(1.03);
          }

          &:active:not(:disabled) {
            transform: translateY(1px);
          }

          &:disabled {
            cursor: not-allowed;
            opacity: 0.58;
          }
        `}
      >
        OPEN
      </button>
    </div>
  )
}
