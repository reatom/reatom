import { computed } from '@reatom/core'

import { currentFolder, folderTree } from '../model'
import type { FolderNode } from '../types'

const findPathToFolder = (
  root: FolderNode,
  target: FolderNode,
): FolderNode[] => {
  if (root.path === target.path) return [root]
  for (const child of root.children) {
    const pathToTarget = findPathToFolder(child, target)
    if (pathToTarget.length > 0) return [root, ...pathToTarget]
  }
  return []
}

export const BreadcrumbNav = () => {
  const breadcrumbSegments = computed(() => {
    const root = folderTree()
    const current = currentFolder()
    if (!root) return []
    if (!current) return [root]
    return findPathToFolder(root, current)
  }, 'breadcrumb.segments')

  return (
    <nav
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
        const segments = breadcrumbSegments()
        if (segments.length === 0)
          return <span css="color: var(--text-muted);">No folder</span>

        const elements: (Element | string)[] = []
        segments.forEach((folder, idx) => {
          const isLast = idx === segments.length - 1

          if (idx > 0) {
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
}
