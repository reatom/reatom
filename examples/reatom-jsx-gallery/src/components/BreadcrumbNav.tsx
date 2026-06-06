import { currentFolder, folderBreadcrumbSegments } from '../model'

export const BreadcrumbNav = () => (
  <nav
    aria-label="Folder path"
    css={`
      display: flex;
      align-items: center;
      gap: 2px;
      font-size: 13px;
      padding: 6px 12px;
      overflow-x: auto;
      white-space: nowrap;
      min-height: 32px;
    `}
  >
    {() => {
      const segments = folderBreadcrumbSegments()
      if (segments.length === 0)
        return <span css="color: var(--text-muted);">No folder</span>

      const elements: (Element | string)[] = []
      segments.forEach((folder, index) => {
        const isLast = index === segments.length - 1

        if (index > 0) {
          elements.push(
            <span css="color: var(--text-muted); margin: 0 4px; user-select: none;">
              /
            </span>,
          )
        }

        elements.push(
          isLast ? (
            <span css="color: var(--accent); font-weight: 650;">
              {folder.name}
            </span>
          ) : (
            <button
              type="button"
              on:click={() => currentFolder.set(folder)}
              css={`
                background: none;
                border: none;
                color: var(--text-secondary);
                cursor: pointer;
                padding: 2px 4px;
                border-radius: var(--radius-xs);
                font-size: 13px;
                text-transform: var(--control-transform);
                transition:
                  color 0.15s,
                  background 0.15s;
                &:hover {
                  color: var(--text-primary);
                  background: var(--hover-bg);
                }
              `}
            >
              {folder.name}
            </button>
          ),
        )
      })

      return elements
    }}
  </nav>
)
