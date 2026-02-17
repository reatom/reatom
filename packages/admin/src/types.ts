export interface AdminAtom {
  id: string
  name: string
  isReactive: boolean
}

export interface AdminFrame {
  id: number
  timestamp: number
  sessionId: string
  atomId: string
  state: unknown
  error: unknown | null
  params: Array<unknown> | undefined
  payload: unknown | undefined
  pubIds: Array<number>
}

export interface AdminSession {
  id: string
  startedAt: number
  metadata: Record<string, unknown>
}

export type FilterTarget = 'name' | 'state' | 'params' | 'payload'

export interface FilterPredicate {
  id: string
  type: 'text' | 'timeRange' | 'error' | 'cause' | 'session' | 'regex'
  target?: FilterTarget
  value: unknown
}

export type CauseDirection = '>' | '<'

export interface CausePredicate extends FilterPredicate {
  type: 'cause'
  direction: CauseDirection
  referencePattern: string
}

export interface FilterTag {
  id: string
  name: string
  predicates: Array<FilterPredicate>
  builtIn: boolean
}

export type LogicalOperator = 'AND' | 'OR'

export interface FilterTagRef {
  tagId: string
  negated: boolean
}

export interface FilterGroup {
  operator: LogicalOperator
  children: Array<FilterTagRef | FilterGroup>
}

export type FilterMode = 'show' | 'hide' | 'highlight' | 'exclude'

export interface FilterConfig {
  id: string
  expression: FilterGroup
  mode: FilterMode
}

export interface CauseGraphNode {
  frameId: number
  atomId: string
  depth: number
}

export interface CauseGraphEdge {
  fromFrameId: number
  toFrameId: number
}

export interface CauseGraph {
  nodes: Array<CauseGraphNode>
  edges: Array<CauseGraphEdge>
  rootFrameId: number
}

export interface ExportedSession {
  session: AdminSession
  atoms: Record<string, AdminAtom>
  frames: Array<AdminFrame>
}
