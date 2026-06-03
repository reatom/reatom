import { openFolder, parsingProgress } from '../model'
import { GalleryMarkIcon } from './Icons'

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
      <div
        css={`
          width: 64px;
          height: 64px;
          border-radius: var(--radius-lg);
          background: linear-gradient(
            135deg,
            var(--accent),
            var(--accent-hover)
          );
          color: var(--accent-contrast);
          display: grid;
          place-items: center;
          font-size: 28px;
          box-shadow:
            var(--glow),
            0 16px 40px var(--shadow);
          user-select: none;
        `}
      >
        <GalleryMarkIcon />
      </div>

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
            border-radius: var(--radius-round);
            overflow: hidden;
            border: var(--border-width) var(--control-border-style)
              var(--card-border);
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
              border-radius: var(--radius-round);
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
          border: var(--border-width) var(--control-border-style)
            var(--input-border);
          border-radius: var(--radius-round);
          cursor: pointer;
          transition: all 0.15s ease;
          text-transform: var(--control-transform);

          &:hover {
            color: var(--accent);
            border-color: var(--accent);
            background: var(--accent-soft);
          }
        `}
      >
        Cancel
      </button>
    </div>
  )
}
