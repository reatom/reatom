export const userRoles = ['admin', 'manager', 'viewer'] as const
export type UserRole = (typeof userRoles)[number]

export const projectStatuses = ['planned', 'active', 'blocked', 'done'] as const
export type ProjectStatus = (typeof projectStatuses)[number]

export const statusFilters = ['all', ...projectStatuses] as const
export type StatusFilter = (typeof statusFilters)[number]

export const projectPriorities = ['low', 'medium', 'high'] as const
export type ProjectPriority = (typeof projectPriorities)[number]

export type User = {
  id: string
  name: string
  email: string
  role: UserRole
  title: string
  avatarColor: string
}

export type Session = {
  token: string
  user: User
}

export type Project = {
  id: string
  name: string
  description: string
  ownerId: string
  status: ProjectStatus
  priority: ProjectPriority
  budget: number
  progress: number
  dueDate: string
  tags: Array<string>
  updatedAt: string
}

export type Activity = {
  id: string
  type: 'auth' | 'navigation' | 'project' | 'settings'
  message: string
  userId?: string
  projectId?: string
  createdAt: string
}

export type DashboardSummary = {
  stats: {
    activeProjects: number
    blockedProjects: number
    completedProjects: number
    budgetInFlight: number
    averageProgress: number
  }
  projects: Array<Project>
  activity: Array<Activity>
  team: Array<User>
}

export type ProjectListQuery = {
  q: string
  status: StatusFilter
  page: number
}

export type ProjectListResult = {
  items: Array<Project>
  total: number
  page: number
  pages: number
}

export type ProjectCreateInput = {
  name: string
  description: string
  priority: ProjectPriority
  budget: number
  tags: Array<string>
}

export type RegisterInput = {
  name: string
  email: string
  role: UserRole
  password: string
}

export type SettingsInput = {
  name: string
  title: string
  colorScheme: 'light' | 'dark'
  density: 'comfortable' | 'compact'
  emailDigest: boolean
  sidebarCollapsed: boolean
}
