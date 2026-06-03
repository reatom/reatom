import { isFileSystemAccessSupported } from '../filesystem'
import { openFolder } from '../model'
import { GalleryMarkIcon } from './Icons'

export const EmptyState = () => {
  const fileSystemAccessSupported = isFileSystemAccessSupported()

  return (
    <div
      css={`
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        padding: 32px;
        color: var(--text-secondary);
        position: relative;

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
        css={`
          width: min(480px, 100%);
          padding: 34px;
          border: var(--border-width) var(--border-style) var(--card-border);
          border-radius: var(--radius-xl);
          background-color: var(--bg-secondary);
          background-image:
            var(--surface-bg-image),
            linear-gradient(135deg, var(--surface-glass), var(--card-bg));
          background-size: var(--surface-bg-size), auto;
          box-shadow:
            var(--glow),
            0 26px 80px var(--shadow);
          backdrop-filter: var(--toolbar-backdrop-filter);
          clip-path: var(--surface-clip-path);
          display: grid;
          justify-items: center;
          gap: 18px;
          position: relative;
          overflow: hidden;

          &::before {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: inherit;
            background: linear-gradient(
              135deg,
              rgba(255, 255, 255, 0.14),
              transparent 38%
            );
            pointer-events: none;
          }
        `}
      >
        <div
          css={`
            width: 86px;
            height: 86px;
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
            font-size: 38px;
            box-shadow:
              var(--glow),
              0 18px 42px var(--shadow);
            user-select: none;
          `}
        >
          <GalleryMarkIcon />
        </div>
        <h2
          css={`
            font-size: 28px;
            line-height: 1.1;
            font-weight: 800;
            letter-spacing: -0.04em;
            color: var(--text-primary);
            margin: 0;
            text-align: center;
          `}
        >
          Your images, polished fast
        </h2>
        <p
          css={`
            font-size: 15px;
            margin: 0;
            text-align: center;
            max-width: 390px;
            line-height: 1.65;
            color: var(--text-secondary);
          `}
        >
          Open a folder to browse, filter, favorite, and inspect local images in
          a focused Reatom-powered gallery.
        </p>
        {fileSystemAccessSupported ? null : (
          <div
            role="alert"
            css={`
              max-width: 390px;
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
          title={
            fileSystemAccessSupported
              ? 'Open a local image folder'
              : 'File System Access is unavailable in this browser'
          }
          css={`
            padding: 13px 24px;
            font-size: 15px;
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
            transition: all 0.2s ease;
            box-shadow: 0 14px 34px var(--shadow);

            &:hover {
              transform: translateY(-2px);
              box-shadow: 0 18px 42px var(--shadow-strong);
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
          `}
        >
          Open Folder
        </button>
      </div>
    </div>
  )
}
