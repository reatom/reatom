import type { BooleanAtom, Computed } from '@reatom/core'
import { computed, reatomBoolean } from '@reatom/core'

import type { FolderNode } from '../types'
import { currentFolder, folderTree } from './folder'

export const folderTreeSidebarVisible = reatomBoolean(
  true,
  'folderTree.sidebarVisible',
)

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

export const folderBreadcrumbSegments = computed(() => {
  const root = folderTree()
  const current = currentFolder()
  if (!root) return []
  if (!current) return [root]
  return findPathToFolder(root, current)
}, 'navigation.breadcrumbSegments')

export const folderTreeIsAllSelected = computed(
  () => currentFolder() === null,
  'folderTree.isAllSelected',
)

type FolderTreeNodeUi = {
  expanded: BooleanAtom
  isSelected: Computed<boolean>
}

const folderTreeNodeUiByPath = new Map<string, FolderTreeNodeUi>()

export const reatomFolderTreeNodeUi = (
  folderPath: string,
  initialExpanded = false,
): FolderTreeNodeUi => {
  const cached = folderTreeNodeUiByPath.get(folderPath)
  if (cached) return cached

  const nodeUi: FolderTreeNodeUi = {
    expanded: reatomBoolean(
      initialExpanded,
      `folderTree.${folderPath}.expanded`,
    ),
    isSelected: computed(
      () => currentFolder()?.path === folderPath,
      `folderTree.${folderPath}.isSelected`,
    ),
  }
  folderTreeNodeUiByPath.set(folderPath, nodeUi)
  return nodeUi
}

export const resetFolderTreeUi = () => {
  folderTreeNodeUiByPath.clear()
}
