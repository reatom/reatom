import { computed, reatomBoolean } from '@reatom/core'

import { currentFolder, folderTree } from '../model'
import type { FolderNode } from '../types'

const treeNodeCss = `
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.15s;
  color: #ddd;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  &:hover { background: rgba(255, 255, 255, 0.08); }
`

const expandBtnCss = `
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  padding: 0;
  width: 16px;
  height: 16px;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.2s;
`

const FolderTreeNode = ({
  node,
  depth,
}: {
  node: FolderNode
  depth: number
}) => {
  const expanded = reatomBoolean(depth < 2, `folderTree.${node.path}.expanded`)
  const hasChildren = node.children.length > 0

  const isSelected = computed(
    () => currentFolder()?.path === node.path,
    `folderTree.${node.path}.isSelected`,
  )

  const handleSelect = () => currentFolder.set(node)

  const handleToggleExpand = (e: MouseEvent) => {
    e.stopPropagation()
    expanded.toggle()
  }

  return (
    <div
      css={`
        padding-left: ${depth * 12}px;
      `}
    >
      <div
        on:click={handleSelect}
        data-selected={isSelected}
        css={`
          ${treeNodeCss}
          &[data-selected='true'] {
            background: rgba(233, 69, 96, 0.2);
            color: #e94560;
          }
        `}
      >
        {hasChildren ? (
          <button
            on:click={handleToggleExpand}
            data-expanded={expanded}
            css={`
              ${expandBtnCss}
              &[data-expanded='true'] {
                transform: rotate(90deg);
              }
            `}
          >
            ▶
          </button>
        ) : (
          <span css="width: 16px; flex-shrink: 0;" />
        )}
        <span css="flex-shrink: 0;">📁</span>
        <span
          css={`
            overflow: hidden;
            text-overflow: ellipsis;
            flex: 1;
            min-width: 0;
          `}
        >
          {node.name}
        </span>
        <span css="color: #777; font-size: 11px; flex-shrink: 0;">
          {node.imageCount}
        </span>
      </div>

      {hasChildren
        ? () =>
            expanded() ? (
              <div>
                {node.children.map((child) => (
                  <FolderTreeNode node={child} depth={depth + 1} />
                ))}
              </div>
            ) : null
        : null}
    </div>
  )
}

export const FolderTree = () => {
  const sidebarVisible = reatomBoolean(true, 'folderTree.sidebarVisible')

  const isAllSelected = computed(
    () => currentFolder() === null,
    'folderTree.isAllSelected',
  )

  const handleSelectAll = () => currentFolder.set(null)

  return (
    <div css="display: flex; height: 100%; position: relative;">
      <div
        data-open={sidebarVisible}
        css={`
          width: 240px;
          min-width: 240px;
          background: rgba(18, 18, 24, 0.95);
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          overflow-y: auto;
          overflow-x: hidden;
          padding: 8px;
          transition:
            margin-left 0.3s ease,
            opacity 0.3s ease;
          margin-left: -240px;
          opacity: 0;
          &[data-open='true'] {
            margin-left: 0;
            opacity: 1;
          }
        `}
      >
        <div
          on:click={handleSelectAll}
          data-selected={isAllSelected}
          css={`
            ${treeNodeCss}
            font-weight: 600;
            margin-bottom: 4px;
            &[data-selected='true'] {
              background: rgba(233, 69, 96, 0.2);
              color: #e94560;
            }
          `}
        >
          <span>📂</span>
          <span>All folders</span>
        </div>

        <div css="height: 1px; background: rgba(255,255,255,0.08); margin: 4px 0 8px;" />

        {() => {
          const tree = folderTree()
          if (!tree)
            return (
              <div css="color: #666; font-size: 13px; padding: 8px;">
                No folder opened
              </div>
            )
          return <FolderTreeNode node={tree} depth={0} />
        }}
      </div>

      <button
        on:click={sidebarVisible.toggle}
        css={`
          position: absolute;
          left: 0;
          top: 8px;
          z-index: 10;
          background: rgba(18, 18, 24, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-left: none;
          color: #aaa;
          padding: 8px 6px;
          border-radius: 0 6px 6px 0;
          cursor: pointer;
          font-size: 12px;
          transition:
            left 0.3s ease,
            background 0.2s;
          &:hover {
            background: rgba(30, 30, 42, 0.95);
            color: #eee;
          }
        `}
        style:left={() => (sidebarVisible() ? '240px' : '0px')}
      >
        {() => (sidebarVisible() ? '◀' : '▶')}
      </button>
    </div>
  )
}
