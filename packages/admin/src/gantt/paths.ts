import {
  compareAnalyticsPathNodes,
  type AnalyticsPathNode,
} from '../otlp/analytics'
import type { GanttOptions } from './reatomGantt'

/**
 * Timing for a path tree. Bars run from the median offset to that offset plus
 * the median time on the step. Expansion and selection use `node.id`, because
 * the tree is rebuilt when the segment changes.
 */
export const analyticsPathTiming: GanttOptions<AnalyticsPathNode, string> = {
  start: (node) => node.offsetMs.median,
  end: (node) => node.offsetMs.median + node.durationMs.median,
  id: (node) => node.id,
  parentId: (node) => node.parentId,
  key: (node) => node.id,
  order: compareAnalyticsPathNodes,
}
