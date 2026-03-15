import { atom, computed } from '@reatom/core'

import { ADMIN_FRAME } from '../root'
import type {
  AdminAtom,
  AdminFrame,
  CauseGraph,
  CauseGraphEdge,
  CauseGraphNode,
} from '../types'

export type AtomRegistry = Map<string, AdminAtom>
export type FrameIndex = Map<number, AdminFrame>

export function buildAncestorGraph(
  frameId: number,
  frameIndex: FrameIndex,
  depthLimit?: number,
): CauseGraph {
  const rootFrame = frameIndex.get(frameId)
  if (!rootFrame) {
    return { nodes: [], edges: [], rootFrameId: frameId }
  }

  const nodes: CauseGraphNode[] = []
  const edges: CauseGraphEdge[] = []
  const visited = new Set<number>()
  const queue: { frameId: number; depth: number }[] = [{ frameId, depth: 0 }]

  nodes.push({
    frameId,
    atomId: rootFrame.atomId,
    depth: 0,
  })

  while (queue.length > 0) {
    const { frameId: currentId, depth } = queue.shift()!
    if (visited.has(currentId)) continue
    visited.add(currentId)

    if (depthLimit !== undefined && depth > depthLimit) continue

    const currentFrame = frameIndex.get(currentId)
    if (!currentFrame) continue

    for (const pubId of currentFrame.pubIds) {
      if (visited.has(pubId)) continue
      const pubFrame = frameIndex.get(pubId)
      if (!pubFrame) continue

      edges.push({ fromFrameId: pubId, toFrameId: currentId })
      nodes.push({
        frameId: pubId,
        atomId: pubFrame.atomId,
        depth: depth + 1,
      })
      queue.push({ frameId: pubId, depth: depth + 1 })
    }
  }

  return {
    nodes: [...new Map(nodes.map((n) => [n.frameId, n])).values()],
    edges,
    rootFrameId: frameId,
  }
}

export function buildDescendantGraph(
  frameId: number,
  frames: AdminFrame[],
  frameIndex: FrameIndex,
  depthLimit?: number,
): CauseGraph {
  const nodes: CauseGraphNode[] = []
  const edges: CauseGraphEdge[] = []
  const visited = new Set<number>()
  const queue: { frameId: number; depth: number }[] = [{ frameId, depth: 0 }]

  const rootFrame = frameIndex.get(frameId)
  if (rootFrame) {
    nodes.push({
      frameId,
      atomId: rootFrame.atomId,
      depth: 0,
    })
  }

  const reverseIndex = new Map<number, AdminFrame[]>()
  for (const f of frames) {
    for (const pubId of f.pubIds) {
      const list = reverseIndex.get(pubId) ?? []
      list.push(f)
      reverseIndex.set(pubId, list)
    }
  }

  while (queue.length > 0) {
    const { frameId: currentId, depth } = queue.shift()!
    if (visited.has(currentId)) continue
    visited.add(currentId)

    if (depthLimit !== undefined && depth > depthLimit) continue

    const children = reverseIndex.get(currentId) ?? []
    for (const child of children) {
      if (visited.has(child.id)) continue
      edges.push({ fromFrameId: currentId, toFrameId: child.id })
      nodes.push({
        frameId: child.id,
        atomId: child.atomId,
        depth: depth + 1,
      })
      queue.push({ frameId: child.id, depth: depth + 1 })
    }
  }

  return {
    nodes: [...new Map(nodes.map((n) => [n.frameId, n])).values()],
    edges,
    rootFrameId: frameId,
  }
}

export function buildFullGraph(
  frameId: number,
  frames: AdminFrame[],
  frameIndex: FrameIndex,
  depthLimit?: number,
): CauseGraph {
  const ancestor = buildAncestorGraph(frameId, frameIndex, depthLimit)
  const descendant = buildDescendantGraph(frameId, frames, frameIndex, depthLimit)

  const nodeMap = new Map<number, CauseGraphNode>()
  for (const n of [...ancestor.nodes, ...descendant.nodes]) {
    nodeMap.set(n.frameId, n)
  }
  const allEdges = [...ancestor.edges, ...descendant.edges]

  return {
    nodes: Array.from(nodeMap.values()),
    edges: allEdges,
    rootFrameId: frameId,
  }
}

export function findPath(
  fromFrameId: number,
  toFrameId: number,
  frameIndex: FrameIndex,
): number[] | null {
  if (fromFrameId === toFrameId) return [fromFrameId]

  const visited = new Set<number>()
  const queue: { frameId: number; path: number[] }[] = [
    { frameId: fromFrameId, path: [fromFrameId] },
  ]

  while (queue.length > 0) {
    const { frameId: currentId, path } = queue.shift()!
    if (visited.has(currentId)) continue
    visited.add(currentId)

    const currentFrame = frameIndex.get(currentId)
    if (!currentFrame) continue

    for (const pubId of currentFrame.pubIds) {
      if (pubId === toFrameId) return [...path, pubId]
      if (!visited.has(pubId)) {
        queue.push({ frameId: pubId, path: [...path, pubId] })
      }
    }
  }

  return null
}

export interface CauseGraphDeps {
  visibleFrames: () => AdminFrame[]
  atoms: () => Map<string, AdminAtom>
}

const PREFIX = '_Admin.causeGraph'

export function createCauseGraph(deps: CauseGraphDeps) {
  const selectedRootId = atom<number | null>(null, `${PREFIX}.selectedRootId`)
  const direction = atom<'ancestors' | 'descendants' | 'full'>(
    'ancestors',
    `${PREFIX}.direction`,
  )
  const depthLimit = atom<number | undefined>(undefined, `${PREFIX}.depthLimit`)
  const pathFrom = atom<number | null>(null, `${PREFIX}.pathFrom`)

  const graph = computed((): CauseGraph | null => {
    const rootId = selectedRootId()
    if (rootId === null) return null
    const frames = deps.visibleFrames()
    const frameIndex = new Map(frames.map((f) => [f.id, f]))

    if (direction() === 'ancestors') {
      return buildAncestorGraph(rootId, frameIndex, depthLimit())
    }
    if (direction() === 'descendants') {
      return buildDescendantGraph(rootId, frames, frameIndex, depthLimit())
    }
    return buildFullGraph(rootId, frames, frameIndex, depthLimit())
  }, `${PREFIX}.graph`)

  const path = computed((): number[] | null => {
    const rootId = selectedRootId()
    const targetId = pathFrom()
    if (rootId === null || targetId === null) return null
    const frames = deps.visibleFrames()
    const frameIndex = new Map(frames.map((f) => [f.id, f]))
    return findPath(rootId, targetId, frameIndex)
  }, `${PREFIX}.path`)

  return {
    selectedRootId,
    direction,
    depthLimit,
    pathFrom,
    graph,
    path,
  }
}

export function createCauseGraphManager(deps: CauseGraphDeps) {
  return ADMIN_FRAME.run(() => createCauseGraph(deps))
}
