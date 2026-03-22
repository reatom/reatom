import { openFolder } from '../model'

export const TitleBar = () => {
  return (
    <div
      css={`
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
        padding: 3px 5px 4px;
        background: linear-gradient(180deg, #3a5a8a 0%, var(--winamp-title) 45%, #1a2840 100%);
        border: 1px solid #000;
        border-bottom: none;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);
        color: #e0e8ff;
        font-weight: bold;
        letter-spacing: 0.02em;
        text-shadow: 1px 1px 0 #000;
      `}
    >
      <span
        css={`
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        `}
      >
        Reatom Folder Player
      </span>
      <div css={`display: flex; gap: 2px; align-items: center;`}>
        <span
          css={`
            width: 12px;
            height: 11px;
            border: 1px solid #000;
            background: linear-gradient(180deg, #6a9ad4, #3a6090);
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35);
          `}
        />
        <span
          css={`
            width: 12px;
            height: 11px;
            border: 1px solid #000;
            background: linear-gradient(180deg, #6a9ad4, #3a6090);
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35);
          `}
        />
        <span
          css={`
            width: 12px;
            height: 11px;
            border: 1px solid #000;
            background: linear-gradient(180deg, #d94a4a, #802020);
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25);
          `}
        />
      </div>
      <button
        type="button"
        prop:disabled={() => !openFolder.ready()}
        on:click={() => openFolder()}
        css={`
          font: inherit;
          padding: 2px 8px;
          cursor: pointer;
          color: #102040;
          background: linear-gradient(180deg, #f0f4ff, #a8b8d8);
          border: 1px solid #000;
          box-shadow:
            inset 0 1px 0 #fff,
            1px 1px 0 #4a6088;
        `}
      >
        OPEN
      </button>
    </div>
  )
}
