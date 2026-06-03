import { isFileSystemAccessSupported } from '../filesystem'
import { openFolder } from '../model'
import { GalleryMarkIcon } from './Icons'

export const EmptyState = () => {
  const fileSystemAccessSupported = isFileSystemAccessSupported()
  const emptyStateDescriptionIds = fileSystemAccessSupported
    ? 'empty-gallery-description'
    : 'empty-gallery-description empty-gallery-browser-support'

  return (
    <div
      css={`
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        padding: clamp(20px, 5vw, 48px);
        color: var(--text-secondary);
        position: relative;
        isolation: isolate;

        &::before,
        &::after {
          content: '';
          position: absolute;
          width: 280px;
          height: 280px;
          border-radius: var(--radius-round);
          filter: blur(18px);
          opacity: 0.8;
          pointer-events: none;
        }

        &::before {
          right: 14%;
          top: 14%;
          background: radial-gradient(
            circle,
            var(--hero-glow-1),
            transparent 68%
          );
        }

        &::after {
          left: 14%;
          bottom: 12%;
          background: radial-gradient(
            circle,
            var(--hero-glow-2),
            transparent 68%
          );
        }
      `}
    >
      <div
        role="region"
        attr:aria-labelledby="empty-gallery-title"
        attr:aria-describedby={emptyStateDescriptionIds}
        css={`
          width: min(560px, 100%);
          padding: clamp(28px, 6vw, 48px);
          border: max(var(--border-width), 1px) var(--border-style)
            var(--border-strong);
          border-radius: var(--radius-xl);
          background-color: var(--surface-strong);
          background-image:
            var(--surface-bg-image),
            linear-gradient(135deg, var(--surface-strong), var(--bg-elevated));
          background-size: var(--surface-bg-size), auto;
          box-shadow:
            var(--glow),
            0 28px 90px var(--shadow-strong);
          backdrop-filter: var(--panel-backdrop-filter);
          clip-path: var(--surface-clip-path);
          display: grid;
          justify-items: center;
          gap: 20px;
          position: relative;
          overflow: hidden;

          &::before {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: inherit;
            background: linear-gradient(
              135deg,
              rgba(255, 255, 255, 0.1),
              transparent 44%
            );
            pointer-events: none;
          }

          > * {
            position: relative;
            z-index: 1;
          }
        `}
      >
        <div
          attr:aria-hidden="true"
          css={`
            width: 88px;
            height: 88px;
            border-radius: var(--radius-lg);
            background:
              radial-gradient(
                circle at 28% 20%,
                var(--hero-glow-1),
                transparent 45%
              ),
              linear-gradient(135deg, var(--accent), var(--accent-hover));
            color: var(--accent-contrast);
            display: grid;
            place-items: center;
            font-size: 40px;
            box-shadow:
              var(--glow),
              0 18px 42px var(--shadow);
            user-select: none;
          `}
        >
          <GalleryMarkIcon />
        </div>
        <h2
          id="empty-gallery-title"
          css={`
            font-size: clamp(30px, 6vw, 42px);
            line-height: 1.1;
            font-weight: 800;
            letter-spacing: -0.045em;
            color: var(--text-primary);
            margin: 0;
            text-align: center;
            text-wrap: balance;
          `}
        >
          Your images, polished fast
        </h2>
        <p
          id="empty-gallery-description"
          css={`
            font-size: clamp(16px, 2.4vw, 18px);
            margin: 0;
            text-align: center;
            max-width: 440px;
            line-height: 1.6;
            color: var(--text-secondary);
            text-wrap: pretty;
          `}
        >
          Open a folder to browse, filter, favorite, and inspect local images in
          a focused Reatom-powered gallery.
        </p>
        {fileSystemAccessSupported ? null : (
          <div
            id="empty-gallery-browser-support"
            role="alert"
            css={`
              max-width: 440px;
              padding: 12px 14px;
              border: var(--border-width) var(--control-border-style)
                var(--accent);
              border-radius: var(--radius-md);
              background: var(--accent-soft);
              color: var(--text-primary);
              font-size: 13px;
              line-height: 1.5;
              text-align: center;
            `}
          >
            File System Access is unavailable in this browser. Open the gallery
            in Chrome, Edge, or another Chromium-based browser to choose local
            folders.
          </div>
        )}
        <button
          type="button"
          on:click={() => openFolder()}
          prop:disabled={!fileSystemAccessSupported}
          attr:aria-describedby={emptyStateDescriptionIds}
          title={
            fileSystemAccessSupported
              ? 'Open a local image folder'
              : 'File System Access is unavailable in this browser'
          }
          css={`
            min-width: 152px;
            min-height: 48px;
            padding: 13px 26px;
            font-size: 16px;
            font-weight: 750;
            color: var(--accent-contrast);
            background: linear-gradient(
              135deg,
              var(--accent),
              var(--accent-hover)
            );
            border: var(--border-width) var(--control-border-style)
              var(--accent);
            border-radius: var(--radius-round);
            cursor: pointer;
            transition:
              transform 0.2s ease,
              box-shadow 0.2s ease,
              filter 0.2s ease;
            box-shadow: 0 14px 34px var(--shadow);

            &:hover {
              transform: translateY(-2px);
              box-shadow: 0 18px 42px var(--shadow-strong);
            }
            &:focus-visible {
              outline: 3px solid var(--focus-ring);
              outline-offset: 4px;
              box-shadow:
                0 0 0 1px var(--bg-elevated),
                0 0 0 6px var(--focus-ring),
                0 18px 42px var(--shadow-strong);
            }
            &:active {
              transform: translateY(0);
            }
            &:disabled {
              cursor: not-allowed;
              opacity: 0.64;
              filter: grayscale(0.18);
            }
            &:disabled:hover {
              transform: none;
              box-shadow: 0 14px 34px var(--shadow);
            }
            @media (prefers-reduced-motion: reduce) {
              transition: none;
              &:hover,
              &:active {
                transform: none;
              }
            }
          `}
        >
          Open Folder
        </button>
      </div>
    </div>
  )
}
