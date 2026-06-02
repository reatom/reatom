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
          return <span css="color: #666;">No folder</span>

        const elements: (Element | string)[] = []
        segments.forEach((folder, idx) => {
          const isLast = idx === segments.length - 1

          if (idx > 0) {
            elements.push(
              <span css="color: #555; margin: 0 4px; user-select: none;">
                /
              </span>,
            )
          }

          elements.push(
            isLast ? (
              <span css="color: #e94560; font-weight: 500;">{folder.name}</span>
            ) : (
              <button
                on:click={() => currentFolder.set(folder)}
                css={`
                  background: none;
                  border: none;
                  color: #aaa;
                  cursor: pointer;
                  padding: 2px 4px;
                  border-radius: 4px;
                  font-size: 13px;
                  transition:
                    color 0.15s,
                    background 0.15s;
                  &:hover {
                    color: #eee;
                    background: rgba(255, 255, 255, 0.08);
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
