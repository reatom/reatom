import { openFolder, parsingProgress } from '../model'

export const ProgressBar = () => {
  const percentage = () => {
    const { total, current } = parsingProgress()
    if (total === 0) return 0
    return Math.round((current / total) * 100)
  }

  return (
    <div
      css={`
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        gap: 24px;
        max-width: 480px;
        margin: 0 auto;
        padding: 40px 20px;
      `}
    >
      <div css="font-size: 48px; user-select: none;">📂</div>

      <h3
        css={`
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        `}
      >
        {() => 'Scanning folder...'}
      </h3>

      <div css="width: 100%;">
        <div
          css={`
            width: 100%;
            height: 8px;
            background: var(--input-bg);
            border-radius: 4px;
            overflow: hidden;
          `}
        >
          <div
            style:width={() => `${percentage()}%`}
            css={`
              height: 100%;
              background: linear-gradient(
                90deg,
                var(--accent),
                var(--accent-hover)
              );
              border-radius: 4px;
              transition: width 0.3s ease;
            `}
          />
        </div>

        <div
          css={`
            display: flex;
            justify-content: space-between;
            margin-top: 10px;
            font-size: 13px;
            color: var(--text-secondary);
          `}
        >
          <span>
            {() => {
              const { current } = parsingProgress()
              return `Found ${current} images...`
            }}
          </span>
          <span
            css={`
              font-weight: 600;
              color: var(--accent);
            `}
          >
            {() => `${percentage()}%`}
          </span>
        </div>
      </div>

      <button
        on:click={() => openFolder.abort()}
        css={`
          padding: 10px 24px;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-secondary);
          background: var(--input-bg);
          border: 1px solid var(--input-border);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;

          &:hover {
            color: var(--accent);
            border-color: var(--accent);
            background: rgba(233, 69, 96, 0.1);
          }
        `}
      >
        Cancel
      </button>
    </div>
  )
}
