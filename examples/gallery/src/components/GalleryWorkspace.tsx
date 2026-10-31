import './GalleryWorkspace.css'

import { formatImageCount } from '../imageFormat'
import {
  bindBackgroundPreviewLoader,
  galleryContentMode,
  openFolder,
  themePack,
  visibleIndexMap,
} from '../model'
import { BreadcrumbNav } from './BreadcrumbNav'
import { EmptyState } from './EmptyState'
import { FolderTree } from './FolderTree'
import { ImageGrid } from './ImageGrid'
import { packChromeEndInset, shellEndInset } from './panelLayout'
import { filterPanelOpen, settingsPanelOpen } from './panelState'
import { SortPanel } from './SortPanel'

export const GalleryWorkspace = () => (
  <div
    id="gallery-workspace"
    style:margin-right={() =>
      shellEndInset(
        settingsPanelOpen(),
        filterPanelOpen(),
        packChromeEndInset(themePack()),
      )
    }
    css={`
      flex: 1;
      overflow: hidden;
      display: flex;
      transition: margin-right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `}
  >
    {() => {
      if (galleryContentMode() !== 'gallery') return null

      return (
        <div
          style={{ display: 'none' }}
          ref={() => bindBackgroundPreviewLoader()}
        />
      )
    }}
    {() => (galleryContentMode() !== 'empty' ? <FolderTree /> : null)}

    <div css="flex: 1; min-width: 0; display: flex; flex-direction: column; overflow: hidden;">
      {() => {
        const mode = galleryContentMode()
        if (mode === 'empty') return null

        return (
          <div
            id="gallery-pathbar"
            css={`
              padding: 4px var(--header-inline-pad, 18px);
              padding-right: calc(
                var(--header-inline-pad, 18px) + var(--shadow-clearance, 0px)
              );
              display: flex;
              align-items: center;
              gap: 12px;
              border-bottom: var(--border-width) var(--border-style)
                var(--card-border);
              background-color: var(--surface-glass);
              background-image: var(--surface-bg-image);
              background-size: var(--surface-bg-size);
              backdrop-filter: var(--toolbar-backdrop-filter);
              flex-shrink: 0;
            `}
          >
            <div
              css={`
                display: flex;
                align-items: center;
                gap: 10px;
                min-width: 0;
                transition: margin-left 0.3s ease;
                margin-left: max(
                  0px,
                  calc(
                    var(--folder-toggle-size, 32px) +
                      var(--folder-toggle-inset, 8px) +
                      12px - var(--header-inline-pad, 18px)
                  )
                );
              `}
            >
              <BreadcrumbNav />
              <span
                id="gallery-folder-count"
                css={`
                  display: inline-flex;
                  align-items: center;
                  gap: 6px;
                  font-size: 12px;
                  color: var(--text-muted);
                  white-space: nowrap;
                  font-variant-numeric: tabular-nums;
                  flex-shrink: 0;
                `}
              >
                {() => formatImageCount(visibleIndexMap().size) || '0 images'}
                {() =>
                  openFolder.pending() > 0 ? (
                    <span
                      role="status"
                      aria-label="Scanning folder"
                      title="Scanning folder"
                      css={`
                        width: 12px;
                        height: 12px;
                        flex-shrink: 0;
                        border: 2px solid currentColor;
                        border-right-color: transparent;
                        border-radius: 50%;
                        animation: gallery-folder-scan 0.8s linear infinite;
                        @media (prefers-reduced-motion: reduce) {
                          animation: none;
                        }
                      `}
                    />
                  ) : null
                }
              </span>
            </div>
            <div css="flex: 1;" />
            <SortPanel />
          </div>
        )
      }}

      <main
        id="gallery-main"
        tabindex={-1}
        css={`
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          min-width: 0;
          outline: none;
          padding: 20px 24px;
          background-color: var(--bg-primary);
          background-image:
            radial-gradient(
              circle at top right,
              var(--hero-glow-2),
              transparent 34%
            ),
            var(--app-bg-image);
          background-size: auto, var(--bg-size);
        `}
      >
        {() => {
          const mode = galleryContentMode()
          if (mode === 'empty') return <EmptyState />
          return <ImageGrid />
        }}
      </main>
    </div>
  </div>
)
